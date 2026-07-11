// functions/contestBot.js
// 콘테스트 자동 진행 봇 - 마스토돈 공개 스레드 하나로 개설→참가→1차 심사→2차 심사(6라운드)→결과까지 진행.
// 판정 로직은 functions/contest/ContestEngine.js(= src/contest/ContestEngine.js를 CommonJS로 포팅한 것)를 그대로 사용한다.
const TURN_TIMEOUT_MS = 15 * 60 * 1000;
const CONTEST_PATH = 'gameData/activeContest';

const {
  CONTEST_TYPES,
  CONDITION_KEY_BY_CONTEST_TYPE,
} = require('./contest/contestRules');
const {
  createContestState,
  runFirstJudging,
  getCurrentActor,
  advanceTurn,
  forceSkipTurn,
  getStandings,
  isContestDone,
  canUseMove,
} = require('./contest/ContestEngine');

let movesDataCache = null;
const loadMovesData = () => {
  const candidates = ['./data/moves.json', '../src/data/moves.json'];
  for (const path of candidates) {
    try { return require(path); } catch (_) { /* try next */ }
  }
  return { moves: [] };
};
const getMovesData = () => {
  if (!movesDataCache) movesDataCache = loadMovesData();
  return movesDataCache;
};

const JOIN_PATTERN = /\[?\s*참가\s*[:：]/i;

const getContestCommand = (content) => {
  const text = String(content || '').trim();
  if (/\[?\s*콘테스트\s*(?:시작|개설)\s*\]?/i.test(text)) return 'start';
  if (JOIN_PATTERN.test(text)) return 'join';
  if (/\[?\s*콘테스트\s*마감\s*\]?/i.test(text)) return 'close';
  if (/\[?\s*콘테스트\s*(?:취소|중단)\s*\]?/i.test(text)) return 'cancel';
  if (/\[?\s*콘테스트\s*(?:도움말|help)\s*\]?/i.test(text)) return 'help';
  return 'declareMove'; // 그 외 멘션은 전부 기술 선언 시도로 취급 (isBotMentioned로 이미 걸러진 상태)
};

const getBaseName = (pokemon) => (pokemon?.nickname || pokemon?.name || pokemon?.nameEn || '포켓몬');

// 참가 신청 시 이름으로 포켓몬을 찾을 때 닉네임/종족명 어느 쪽으로 불러도 매칭되도록.
const getPokemonSearchNames = (pokemon) => [pokemon?.nickname, pokemon?.name, pokemon?.nameEn].filter(Boolean);

const getMemberDisplayName = (member, id) => member?.name || member?.nickname || id;

const formatHelp = () => [
  '[콘테스트] 명령어',
  '[콘테스트 시작 <타입>] - 콘테스트 개설 (귀여움/근사함/강인함/슬기로움/아름다움)',
  '[참가: 포켓몬이름] - 파트너 또는 엔트리(파티) 포켓몬 이름으로 참가 신청 (박스 포켓몬은 불가)',
  '[콘테스트 마감] - 개설자가 접수를 마감하고 시작',
  '(자기 차례에) 기술 이름 - 그 턴에 사용할 기술 선언',
  '[콘테스트 취소] - 개설자가 진행 중인 콘테스트를 취소',
].join('\n');

const createContestBot = ({ db, findMemberByAccount, normalizeAccount }) => {
  const getContest = async () => {
    const snap = await db.ref(CONTEST_PATH).once('value');
    return snap.val();
  };
  const saveContest = (data) => db.ref(CONTEST_PATH).set(data);
  const updateContest = (patch) => db.ref(CONTEST_PATH).update(patch);
  const clearContest = () => db.ref(CONTEST_PATH).remove();

  const startContest = async ({ content, author, authorAccount }) => {
    const existing = await getContest();
    if (existing && existing.status !== 'completed') {
      return '이미 진행 중인 콘테스트가 있어요. 끝난 뒤 다시 개설해 주세요.';
    }

    const contestType = CONTEST_TYPES.find((t) => content.includes(t));
    if (!contestType) {
      return `[콘테스트 시작 <타입>] 형식으로 타입을 알려주세요. (${CONTEST_TYPES.join('/')})`;
    }

    const session = {
      status: 'registering',
      contestType,
      hostId: author.id,
      hostName: getMemberDisplayName(author.member, author.id),
      hostAccount: normalizeAccount(authorAccount),
      participants: {},
      engine: null,
      rootStatusId: null,
      lastStatusId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await saveContest(session);
    return [
      `🎀 ${contestType} 콘테스트를 개설했어요!`,
      '참가하려면 이 스레드에 [참가: 포켓몬이름]으로 답글을 달아주세요. (파트너 또는 엔트리 포켓몬만 가능)',
      '준비가 끝나면 개설자가 [콘테스트 마감]으로 시작합니다.',
    ].join('\n');
  };

  const cancelContest = async ({ author }) => {
    const contest = await getContest();
    if (!contest || contest.status === 'completed') return '진행 중인 콘테스트가 없어요.';
    if (author.id !== contest.hostId) return '개설자만 취소할 수 있어요.';
    await clearContest();
    return '콘테스트를 취소했어요.';
  };

  // 참가 가능한 포켓몬: 파트너 + 엔트리(caughtPokemon 앞 6마리). 박스 포켓몬(7번째 이후)은 제외.
  const getEligiblePokemon = (member) => {
    const entry = Array.isArray(member?.caughtPokemon) ? member.caughtPokemon.slice(0, 6).filter(Boolean) : [];
    const partner = member?.partnerPokemon ? [member.partnerPokemon] : [];
    const byKey = new Map();
    [...partner, ...entry].forEach((p) => {
      const key = p.uniqueId || p.id || p.pokemonId || `${p.number}_${p.name}`;
      if (key && !byKey.has(key)) byKey.set(key, p);
    });
    return Array.from(byKey.values());
  };

  const isBoxOnlyPokemon = (member, query) => {
    const box = Array.isArray(member?.caughtPokemon) ? member.caughtPokemon.slice(6).filter(Boolean) : [];
    return box.some((p) => getPokemonSearchNames(p).some((name) => name.includes(query)));
  };

  const joinContest = async ({ author, content }) => {
    const contest = await getContest();
    if (!contest || contest.status !== 'registering') {
      return '지금은 콘테스트 참가 신청을 받고 있지 않아요.';
    }
    if (contest.participants?.[author.id]) {
      return '이미 참가 신청하셨어요.';
    }

    const member = author.member;
    const query = String(content || '')
      .replace(JOIN_PATTERN, '')
      .replace(/^\]|\]$/g, '')
      .trim();
    if (!query) {
      return '[참가: 포켓몬이름] 형식으로 참가할 포켓몬(파트너 또는 엔트리)을 알려주세요.';
    }

    const eligible = getEligiblePokemon(member);
    const pokemon = eligible.find((p) => getPokemonSearchNames(p).some((name) => name === query)) ||
      eligible.find((p) => getPokemonSearchNames(p).some((name) => name.includes(query)));
    if (!pokemon && isBoxOnlyPokemon(member, query)) {
      return '박스에 있는 포켓몬은 콘테스트에 참가할 수 없어요. 파트너 또는 엔트리(파티) 포켓몬만 가능해요.';
    }
    if (!pokemon) return '참가에 사용할 포켓몬(파트너 또는 엔트리 포켓몬)을 찾을 수 없어요.';

    const movesData = getMovesData();
    const conditionKey = CONDITION_KEY_BY_CONTEST_TYPE[contest.contestType];
    const conditionValue = Number(pokemon.condition?.[conditionKey] || 0);
    const moves = (Array.isArray(pokemon.moves) ? pokemon.moves : [])
      .map((m) => movesData.moves.find((mv) => mv.id === (m.moveId ?? m.id)))
      .filter((m) => m && m.contestType)
      .slice(0, 4);

    if (!moves.length) {
      return `${getBaseName(pokemon)}은(는) 콘테스트에 쓸 수 있는 기술을 배우고 있지 않아요.`;
    }

    await updateContest({
      [`participants/${author.id}`]: {
        id: author.id,
        name: getMemberDisplayName(member, author.id),
        account: normalizeAccount(author.account || member?.mastodonAccount || member?.mastodonId || ''),
        pokemonName: getBaseName(pokemon),
        conditionValue,
        moves,
      },
      updatedAt: new Date().toISOString(),
    });

    return `✅ ${getBaseName(pokemon)}(으)로 참가했어요! (사용 가능 기술 ${moves.length}개)`;
  };

  const formatTurnPrompt = (contest) => {
    const actor = getCurrentActor(contest.engine);
    if (!actor) return null;
    const participant = contest.participants[actor.id];
    const mention = participant?.account ? `@${participant.account} ` : '';
    const moveList = actor.moves.map((m) => m.name).join(', ');
    return [
      `${mention}${actor.name}님 차례입니다! (${contest.engine.round}/6 라운드)`,
      `사용 가능한 기술: ${moveList}`,
      `${TURN_TIMEOUT_MS / 60000}분 안에 기술 이름으로 답글을 달아주세요.`,
    ].join('\n');
  };

  const summarizeLogSince = (engine, fromIndex) => {
    const nameOf = (id) => engine.participants.find((p) => p.id === id)?.name || id;
    const lines = [];
    for (let i = fromIndex; i < engine.log.length; i += 1) {
      const entry = engine.log[i];
      switch (entry.type) {
        case 'firstJudging':
          lines.push(`🎲 ${nameOf(entry.participantId)}: 1차 심사 2d6 → ${entry.roll}`);
          break;
        case 'nervous':
          lines.push(`😳 ${nameOf(entry.participantId)} 긴장해서 행동하지 못했습니다.`);
          break;
        case 'skip':
          lines.push(entry.reason === 'timeout'
            ? `⏰ ${nameOf(entry.participantId)}님이 시간 내에 응답하지 않아 이번 턴을 넘어갑니다.`
            : `⏭ ${nameOf(entry.participantId)} 이번 턴은 행동할 수 없습니다.`);
          break;
        case 'appeal':
          lines.push(`✨ ${nameOf(entry.participantId)}: ${entry.moveName} 사용 → 어필 ${entry.gainedAppeal >= 0 ? '+' : ''}${entry.gainedAppeal}${entry.isPenalty ? ' (패널티 타입 절반)' : ''}`);
          break;
        case 'jam':
          lines.push(`💥 ${nameOf(entry.targetId)} 방해 -${entry.amount}`);
          break;
        case 'liveAppeal':
          lines.push(`🌟 ${nameOf(entry.participantId)} 라이브 어필 발동! +5`);
          break;
        case 'combo':
          lines.push(`🔗 ${nameOf(entry.participantId)} 콤보 성공! +${entry.bonus}`);
          break;
        default:
          break;
      }
    }
    return lines;
  };

  const formatStandings = (engine) => getStandings(engine)
    .map((p) => `${p.rank}위 ${p.name} - 어필 ${p.totalAppeal}`)
    .join('\n');

  const closeRegistration = async ({ author }) => {
    const contest = await getContest();
    if (!contest || contest.status !== 'registering') return '지금은 마감할 콘테스트가 없어요.';
    if (author.id !== contest.hostId) return '개설자만 마감할 수 있어요.';

    const entries = Object.values(contest.participants || {});
    if (entries.length < 2) {
      return `참가자가 2명 이상이어야 시작할 수 있어요. (현재 ${entries.length}명)`;
    }

    let engine = createContestState(contest.contestType, entries);
    engine = runFirstJudging(engine);

    await updateContest({
      status: 'active',
      engine,
      turnDeadlineAt: new Date(Date.now() + TURN_TIMEOUT_MS).toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const contestAfter = { ...contest, status: 'active', engine };
    return [
      '접수를 마감하고 1차 심사를 진행했어요.',
      ...summarizeLogSince(engine, 0),
      '',
      '=== 2차 심사 시작 ===',
      formatTurnPrompt(contestAfter),
    ].filter(Boolean).join('\n');
  };

  const declareMove = async ({ author, content }) => {
    const contest = await getContest();
    if (!contest || contest.status !== 'active') return null; // 진행 중인 콘테스트 없음 - 조용히 무시

    const actor = getCurrentActor(contest.engine);
    if (!actor) return null;
    if (actor.id !== author.id) {
      return `지금은 ${actor.name}님 차례예요. 잠시만 기다려주세요.`;
    }

    const text = String(content || '').trim();
    const movesData = getMovesData();
    const matched = actor.moves.find((m) => text === m.name) ||
      actor.moves.find((m) => text.includes(m.name));
    if (!matched) {
      return `가지고 있는 기술 중에서 골라주세요: ${actor.moves.map((m) => m.name).join(', ')}`;
    }
    if (!canUseMove(contest.engine, actor.id, matched.id, movesData.moves)) {
      return `${matched.name}은(는) 전 턴에 사용해서 이번 턴에는 다시 쓸 수 없어요.`;
    }

    const beforeLogLength = contest.engine.log.length;
    let nextEngine;
    try {
      nextEngine = advanceTurn(contest.engine, { moveId: matched.id });
    } catch (e) {
      return `처리 중 문제가 발생했어요: ${e.message}`;
    }

    const done = isContestDone(nextEngine);
    const patch = {
      engine: nextEngine,
      updatedAt: new Date().toISOString(),
    };
    if (done) patch.status = 'completed';
    else patch.turnDeadlineAt = new Date(Date.now() + TURN_TIMEOUT_MS).toISOString();
    await updateContest(patch);

    const contestAfter = { ...contest, engine: nextEngine };
    const lines = summarizeLogSince(nextEngine, beforeLogLength);
    if (done) {
      lines.push('', '🏆 콘테스트 종료!', formatStandings(nextEngine));
      const winner = getStandings(nextEngine)[0];
      if (winner) lines.push(`🎀 우승: ${winner.name} 🎀`);
    } else {
      lines.push('', formatTurnPrompt(contestAfter));
    }
    return lines.filter(Boolean).join('\n');
  };

  // 스케줄 함수에서 1분마다 호출 - 15분 넘게 응답 없는 턴을 자동으로 넘긴다.
  const closeTimedOutTurn = async (now = Date.now()) => {
    const contest = await getContest();
    if (!contest || contest.status !== 'active') return null;
    const deadline = Date.parse(contest.turnDeadlineAt || '');
    if (!Number.isFinite(deadline) || now < deadline) return null;

    const beforeLogLength = contest.engine.log.length;
    const nextEngine = forceSkipTurn(contest.engine, 'timeout');
    const done = isContestDone(nextEngine);
    const patch = { engine: nextEngine, updatedAt: new Date(now).toISOString() };
    if (done) patch.status = 'completed';
    else patch.turnDeadlineAt = new Date(now + TURN_TIMEOUT_MS).toISOString();
    await updateContest(patch);

    const contestAfter = { ...contest, engine: nextEngine };
    const lines = summarizeLogSince(nextEngine, beforeLogLength);
    if (done) {
      lines.push('', '🏆 콘테스트 종료!', formatStandings(nextEngine));
      const winner = getStandings(nextEngine)[0];
      if (winner) lines.push(`🎀 우승: ${winner.name} 🎀`);
    } else {
      lines.push('', formatTurnPrompt(contestAfter));
    }
    return { message: lines.filter(Boolean).join('\n'), lastStatusId: contest.lastStatusId || null };
  };

  const handle = async ({ content, command, author, authorAccount }) => {
    if (command === 'help') return formatHelp();
    if (command === 'start') return startContest({ content, author, authorAccount });
    if (command === 'cancel') return cancelContest({ author });
    if (command === 'join') return joinContest({ author, content });
    if (command === 'close') return closeRegistration({ author });
    if (command === 'declareMove') return declareMove({ author, content });
    return formatHelp();
  };

  return {
    getCommand: getContestCommand,
    handle,
    getContest,
    closeTimedOutTurn,
  };
};

module.exports = {
  createContestBot,
  getContestCommand,
};
