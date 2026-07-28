// functions/contestBot.js
// 1:1 콘테스트 봇 - battleBot.js의 [배틀 신청]→[배틀 수락]→엔트리 선택→턴 진행 방식을
// 그대로 모사한 1:1 전용 콘테스트봇이다. 홈페이지 콘테스트(다인원 웹 시뮬레이터,
// src/components/views/admin/ContestAdminPanel.jsx)와는 완전히 별개다.
// 2026-07-28: 기존의 "공개 스레드 하나에서 다인원 자유등록"(gameData/activeContest) 방식을
// battleBot과 동일한 회원별 세션(gameData/contestSessions) 방식으로 완전히 교체했다.
// 2차 심사는 최대 4라운드까지만 진행한다(ContestEngine의 maxRounds 옵션 사용).
const { normalizeCaughtPokemon } = require('./shared');
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

const MAX_ROUNDS = 4;
const TURN_TIMEOUT_MS = 15 * 60 * 1000;
const PENDING_EXPIRATION_MS = 24 * 60 * 60 * 1000;

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

const normalizeId = (value) => String(value || '')
  .toLowerCase()
  .replace(/[\s_\-'.:]/g, '')
  .replace(/[^\p{L}\p{N}]/gu, '');

let contestMoveNameMapCache = null;
const getContestMoveNameMap = () => {
  if (!contestMoveNameMapCache) {
    contestMoveNameMapCache = new Map();
    (getMovesData().moves || []).filter((m) => m.contestType).forEach((m) => {
      [m.id, m.nameEn, m.name].forEach((key) => {
        const normalized = normalizeId(key);
        if (normalized) contestMoveNameMapCache.set(normalized, m);
      });
    });
  }
  return contestMoveNameMapCache;
};

// ── 텍스트 명령 파싱 (battleBot.js의 stripCommandText/extractBracketText와 동일한 방식) ──
const stripCommandText = (content) => String(content || '')
  .replace(/@\S+/g, '')
  .trim();

const extractBracketText = (content) => {
  const text = stripCommandText(content);
  const matches = [...text.matchAll(/\[([^\]]+)\]/g)].map((m) => m[1].trim()).filter(Boolean);
  return matches.length ? matches[matches.length - 1] : text.trim();
};

const getBaseName = (pokemon) => (pokemon?.nickname || pokemon?.name || pokemon?.nameEn || '포켓몬');
const getMemberDisplayName = (member, id) => member?.name || member?.nickname || id;

const entryChoiceFromText = (content) => {
  const text = extractBracketText(content);
  const match = text.match(/^(?:포켓몬|엔트리|선택)\s*([1-6])$/i) || text.match(/^([1-6])번?$/);
  if (match) return { type: 'index', value: Number(match[1]) };
  // 대괄호로 감싼 이름만 "이름으로 선택"으로 인정한다 (battleBot.js와 동일한 이유 -
  // 대괄호가 없으면 잡담까지 엔트리 선택으로 오인식될 수 있다).
  const hasBracket = /\[[^\]]+\]/.test(stripCommandText(content));
  if (hasBracket && text && !/^(콘테스트|기권)/i.test(text)) return { type: 'name', value: text };
  return null;
};

const resolveEntryChoice = (token, entries) => {
  if (!token) return null;
  if (token.type === 'index') return token.value;
  const q = normalizeId(token.value);
  const idx = entries.findIndex((e) => e.nickname && normalizeId(e.nickname) === q);
  if (idx >= 0) return idx + 1;
  const idx2 = entries.findIndex((e) => normalizeId(e.species || '') === q || normalizeId(e.name || '') === q);
  return idx2 >= 0 ? idx2 + 1 : null;
};

const moveChoiceFromText = (content) => {
  const text = stripCommandText(content);
  const moveNumber = text.match(/\[?\s*기술\s*([1-4])\s*\]?/i);
  if (moveNumber) return { kind: 'index', value: Number(moveNumber[1]) - 1 };
  const bracket = extractBracketText(text);
  if (!bracket) return null;
  const bareNumber = bracket.match(/^([1-4])번?$/);
  if (bareNumber) return { kind: 'index', value: Number(bareNumber[1]) - 1 };
  const cleaned = bracket.replace(/^기술\s*/i, '').trim();
  if (!cleaned) return null;
  return { kind: 'name', value: cleaned };
};

const isExplicitMoveText = (content) => {
  // 기술 번호 또는 '기술' 접두어가 있는 경우만 명시적 기술 선택으로 인정 (bare number는 제외 -
  // bare number는 엔트리 선택([엔트리 1] 대신 [1])과 겹치므로 selectPokemon 쪽에서 처리한다).
  const stripped = stripCommandText(content);
  if (/\[\s*기술\s*[1-4]\s*\]/i.test(stripped)) return true;
  const bracket = extractBracketText(stripped);
  if (!bracket) return false;
  return /^기술\s+\S/i.test(bracket);
};

const isKnownContestMoveText = (content) => {
  const bracket = extractBracketText(content).replace(/^기술\s*/i, '').trim();
  if (!bracket) return false;
  return getContestMoveNameMap().has(normalizeId(bracket));
};

const isContestMoveLikeText = (content) => {
  const text = extractBracketText(content);
  if (!text) return false;
  if (/^(콘테스트\s*(신청|수락|거절|기권|도움말|help)|기권)/i.test(text)) return false;
  if (/^(포켓몬|엔트리|선택)\s*[1-6]$/i.test(text)) return false;
  return isExplicitMoveText(content) || isKnownContestMoveText(content);
};

const getContestCommand = (content) => {
  if (/\[\s*콘테스트\s*신청\s*\]/i.test(content)) return 'challenge';
  if (/\[\s*콘테스트\s*수락\s*\]/i.test(content)) return 'accept';
  if (/\[\s*콘테스트\s*거절\s*\]/i.test(content)) return 'decline';
  if (/\[\s*콘테스트\s*기권\s*\]|\[\s*기권\s*\]/i.test(content)) return 'forfeit';
  if (/\[\s*콘테스트\s*(?:도움말|help)\s*\]/i.test(content)) return 'help';
  if (isContestMoveLikeText(content)) return 'move';
  if (entryChoiceFromText(content) !== null) return 'selectPokemon';
  return null;
};

// ── 멘션/표시 헬퍼 ────────────────────────────────────────────────
const accountMention = (account) => {
  const cleaned = String(account || '').trim().replace(/^@/, '');
  return cleaned ? `@${cleaned}` : '';
};

const contestMentions = (session) => Array.from(new Set([
  accountMention(session?.player1Account),
  accountMention(session?.player2Account),
].filter(Boolean))).join(' ');

const withContestMentions = (session, message) => {
  const mentions = contestMentions(session);
  return mentions ? `${mentions}\n${message}` : message;
};

// ── 참가 가능 포켓몬 / 엔트리 데이터 ─────────────────────────────────
// 참가 가능: 파트너 + 엔트리(caughtPokemon 앞 6마리). 박스 포켓몬(7번째 이후)은 제외.
const getEligiblePokemon = (member) => {
  const entry = normalizeCaughtPokemon(member?.caughtPokemon).slice(0, 6).filter(Boolean);
  const partner = member?.partnerPokemon ? [member.partnerPokemon] : [];
  const byKey = new Map();
  [...partner, ...entry].forEach((p) => {
    const key = p.uniqueId || p.id || p.pokemonId || `${p.number}_${p.name}`;
    if (key && !byKey.has(key)) byKey.set(key, p);
  });
  return Array.from(byKey.values());
};

const buildContestEntry = (pokemon, contestType) => {
  const movesData = getMovesData();
  const conditionKey = CONDITION_KEY_BY_CONTEST_TYPE[contestType];
  const conditionValue = Number(pokemon.condition?.[conditionKey] || 0);
  const moves = (Array.isArray(pokemon.moves) ? pokemon.moves : [])
    .map((m) => movesData.moves.find((mv) => mv.id === (m.moveId ?? m.id)))
    .filter((m) => m && m.contestType)
    .slice(0, 4);
  if (!moves.length) return null;
  return {
    key: pokemon.uniqueId || pokemon.id || pokemon.pokemonId || `${pokemon.number}_${pokemon.name}`,
    name: getBaseName(pokemon),
    nickname: (pokemon.nickname || '').trim() || null,
    species: pokemon.name || pokemon.species || '',
    conditionValue,
    moves,
  };
};

const buildEligibleEntries = (member, contestType) => getEligiblePokemon(member)
  .map((p) => buildContestEntry(p, contestType))
  .filter(Boolean);

// ── 포맷팅 헬퍼 (순수 함수, db 불필요) ────────────────────────────────
const formatHelp = () => [
  '[콘테스트] 명령어 (1:1 전용, 최대 4라운드)',
  '[콘테스트 신청] @상대 <타입> - 콘테스트 신청 (귀여움/근사함/강인함/슬기로움/아름다움)',
  '[콘테스트 수락] / [콘테스트 거절]',
  '[엔트리 1] 또는 [포켓몬 1] - 참가시킬 포켓몬 선택 (파트너 또는 엔트리(파티) 포켓몬만 가능)',
  '[기술 1] 또는 기술 이름 - 그 턴에 사용할 기술 선언',
  '[콘테스트 기권]',
].join('\n');

const formatEntryList = (label, entries = []) => [
  `${label} 참가 가능 포켓몬`,
  ...entries.map((entry, index) => `${index + 1}. ${entry.name}`),
].join('\n');

const formatTurnPrompt = (session) => {
  const actor = getCurrentActor(session.engine);
  if (!actor) return null;
  const moveList = actor.moves.map((m, index) => `${index + 1}. ${m.name}`).join(', ');
  return [
    `${actor.name}님 차례입니다! (${session.engine.round}/${MAX_ROUNDS} 라운드)`,
    `사용 가능한 기술: ${moveList}`,
    `[기술 1] 또는 기술 이름으로 답글을 달아주세요. (${TURN_TIMEOUT_MS / 60000}분 안에)`,
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

const formatResultTail = (engine) => {
  const lines = ['', '🎀 콘테스트 종료!', formatStandings(engine)];
  const [winner, runnerUp] = getStandings(engine);
  if (winner && runnerUp && winner.totalAppeal === runnerUp.totalAppeal) lines.push('무승부!');
  else if (winner) lines.push(`🎀 우승: ${winner.name} 🎀`);
  return lines;
};

const createContestBot = ({
  db,
  findMemberByAccount,
  extractMentionAccounts,
  normalizeAccount,
  localUsername,
  botAccount,
}) => {
  // battleBot.js의 findTaggedOpponent와 동일한 로직 - 봇 자신을 태그한 멘션은 상대 후보에서 제외.
  const findTaggedOpponent = (members, status, authorAccount) => {
    const author = normalizeAccount(authorAccount);
    const botUsername = localUsername(botAccount);
    const rawAccounts = extractMentionAccounts(status);
    const botMentionIds = new Set(
      (status?.mentions || [])
        .filter((m) => localUsername(m?.acct || m?.username || '') === botUsername)
        .map((m) => String(m?.id || ''))
        .filter(Boolean)
    );
    const accounts = rawAccounts
      .map(normalizeAccount)
      .filter((account) =>
        localUsername(account) !== botUsername &&
        account !== author &&
        !botMentionIds.has(localUsername(account))
      );

    for (const account of accounts) {
      const match = findMemberByAccount(members, account);
      if (match) return { ...match, account };
    }
    console.warn('contestBot: tagged opponent not found', {
      statusId: status?.id || null,
      authorAccount,
      rawAccounts,
      normalizedAccounts: accounts,
      memberCount: Object.keys(members || {}).length,
    });
    return null;
  };

  // battleBot.js의 findMemberSessionPointer와 동일한 이유 - gameData/contestSessions
  // 전체(삭제 없이 계속 쌓이는 컬렉션)를 매번 통째로 읽는 대신, 회원별 포인터 색인
  // (gameData/memberContestSessions/{memberId})에서 조건에 맞는 세션 키를 찾고
  // 실제로 필요한 세션 하나만 개별 조회한다.
  const findMemberSessionPointer = async (memberId, matches) => {
    const snapshot = await db.ref(`gameData/memberContestSessions/${memberId}`).once('value');
    const pointers = snapshot.val() || {};
    const candidates = Object.entries(pointers)
      .filter(([, pointer]) => matches(pointer))
      .sort((a, b) => String(b[1].updatedAt || b[1].createdAt || '').localeCompare(String(a[1].updatedAt || a[1].createdAt || '')));
    if (!candidates.length) return null;

    const [sessionKey] = candidates[0];
    const sessionSnap = await db.ref(`gameData/contestSessions/${sessionKey}`).once('value');
    const session = sessionSnap.val();
    return session ? { sessionKey, session } : null;
  };

  const findPendingChallenge = (memberId) => findMemberSessionPointer(
    memberId,
    (pointer) => pointer.status === 'pending' && pointer.role === 'player2'
  );
  const findSelectingContest = (memberId) => findMemberSessionPointer(
    memberId,
    (pointer) => pointer.status === 'selecting'
  );
  const findActiveContest = (memberId) => findMemberSessionPointer(
    memberId,
    (pointer) => pointer.status === 'active'
  );
  const findFinishedContest = (memberId) => findMemberSessionPointer(
    memberId,
    (pointer) => pointer.status === 'completed' || pointer.status === 'forfeited'
  );

  const createChallenge = async ({ status, members, author, authorAccount, content }) => {
    const opponent = findTaggedOpponent(members, status, authorAccount);
    if (!opponent) return '[콘테스트 신청] 뒤에 상대 계정을 함께 태그해 주세요.';
    if (opponent.id === author.id) return '자기 자신에게는 콘테스트를 신청할 수 없어요.';

    const contestType = CONTEST_TYPES.find((t) => content.includes(t));
    if (!contestType) {
      return `[콘테스트 신청] @상대 <타입> 형식으로 타입을 알려주세요. (${CONTEST_TYPES.join('/')})`;
    }

    const player1Entries = buildEligibleEntries(author.member, contestType);
    const player2Entries = buildEligibleEntries(opponent.member, contestType);
    if (!player1Entries.length) return `콘테스트에 쓸 수 있는 기술을 가진 포켓몬이 없어요. (파트너 또는 엔트리 포켓몬, ${contestType} 관련 기술 필요)`;
    if (!player2Entries.length) return `${getMemberDisplayName(opponent.member, opponent.id)}님은 콘테스트에 쓸 수 있는 기술을 가진 포켓몬이 없어요.`;

    const session = {
      id: `contest_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      status: 'pending',
      contestType,
      player1Id: author.id,
      player1Name: getMemberDisplayName(author.member, author.id),
      player1Account: normalizeAccount(authorAccount),
      player1Entries,
      player2Id: opponent.id,
      player2Name: getMemberDisplayName(opponent.member, opponent.id),
      player2Account: normalizeAccount(opponent.account || opponent.member?.mastodonAccount || opponent.member?.mastodonId || ''),
      player2Entries,
      pendingTeamChoices: {},
      engine: null,
      lastBotStatusId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const ref = db.ref('gameData/contestSessions').push();
    await ref.set(session);
    return withContestMentions(session, [
      `${session.player2Name}님에게 ${contestType} 콘테스트를 신청했어요.`,
      '상대가 [콘테스트 수락]을 보내면 참가시킬 포켓몬을 선택합니다.',
    ].join('\n'));
  };

  const acceptChallenge = async ({ author }) => {
    const pending = await findPendingChallenge(author.id);
    if (!pending) return '수락할 콘테스트 신청이 없어요.';

    await db.ref(`gameData/contestSessions/${pending.sessionKey}`).update({
      status: 'selecting',
      pendingTeamChoices: {},
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return withContestMentions(pending.session, [
      '콘테스트를 수락했습니다. 참가시킬 포켓몬을 선택해 주세요.',
      formatEntryList(pending.session.player1Name, pending.session.player1Entries),
      formatEntryList(pending.session.player2Name, pending.session.player2Entries),
      '[엔트리 1] 또는 [포켓몬 1] 형식으로 선택할 수 있습니다.',
    ].join('\n'));
  };

  const declineChallenge = async ({ author }) => {
    const pending = await findPendingChallenge(author.id);
    if (!pending) return '거절할 콘테스트 신청이 없어요.';
    await db.ref(`gameData/contestSessions/${pending.sessionKey}`).update({
      status: 'declined',
      updatedAt: new Date().toISOString(),
    });
    return withContestMentions(pending.session, '콘테스트 신청을 거절했어요.');
  };

  const forfeit = async ({ author }) => {
    const active = await findActiveContest(author.id) || await findSelectingContest(author.id);
    if (!active) return '진행 중인 콘테스트가 없어요.';
    const winner = active.session.player1Id === author.id ? active.session.player2Name : active.session.player1Name;
    await db.ref(`gameData/contestSessions/${active.sessionKey}`).update({
      status: 'forfeited',
      winner,
      updatedAt: new Date().toISOString(),
    });
    return withContestMentions(active.session, `${winner} 승리! 상대가 기권했습니다.`);
  };

  const declareMove = async ({ author, content }) => {
    const active = await findActiveContest(author.id);
    if (!active) {
      const finished = await findFinishedContest(author.id);
      if (finished) {
        let resultText = '';
        if (finished.session.status === 'forfeited') {
          resultText = finished.session.winner ? ` ${finished.session.winner} 승리!` : '';
        } else if (finished.session.engine) {
          const [winner, runnerUp] = getStandings(finished.session.engine);
          if (winner && runnerUp && winner.totalAppeal === runnerUp.totalAppeal) resultText = ' 무승부!';
          else if (winner) resultText = ` ${winner.name} 승리!`;
        }
        return withContestMentions(finished.session, `콘테스트가 이미 종료되었습니다.${resultText}`);
      }
      return '진행 중인 콘테스트가 없어요. [콘테스트 신청]으로 먼저 시작해 주세요.';
    }

    const { session } = active;
    const actor = getCurrentActor(session.engine);
    if (!actor) return null;
    if (actor.id !== author.id) return `지금은 ${actor.name}님 차례예요. 잠시만 기다려주세요.`;

    const token = moveChoiceFromText(content);
    let matched = null;
    if (token?.kind === 'index') matched = actor.moves[token.value] || null;
    else if (token?.kind === 'name') {
      const q = normalizeId(token.value);
      matched = actor.moves.find((m) => normalizeId(m.name) === q) ||
        actor.moves.find((m) => normalizeId(m.name).includes(q));
    }
    if (!matched) {
      return `가지고 있는 기술 중에서 골라주세요: ${actor.moves.map((m, index) => `${index + 1}. ${m.name}`).join(', ')}`;
    }
    if (!canUseMove(session.engine, actor.id, matched.id)) {
      return `${matched.name}은(는) 전 턴에 사용해서 이번 턴에는 다시 쓸 수 없어요.`;
    }

    // 콘테스트는 한 번에 한 명씩만 행동하므로 배틀처럼 "양쪽 동시 선택"을 병합할 필요는 없지만,
    // 같은 사람이 응답을 두 번 연달아 보내는 경우(웹훅 재전송 등)에도 턴이 두 번 진행되지
    // 않도록 트랜잭션 안에서 "지금 이 사람 차례가 맞는지"까지 함께 확인하고 반영한다.
    const sessionRef = db.ref(`gameData/contestSessions/${active.sessionKey}`);
    let turnResult = null;
    const txResult = await sessionRef.transaction((current) => {
      if (!current || current.status !== 'active') return current;
      const currentActor = getCurrentActor(current.engine);
      if (!currentActor || currentActor.id !== author.id) return current;
      if (!canUseMove(current.engine, currentActor.id, matched.id)) return current;

      // "지정한 포켓몬" 계열 효과는 원래 GM/진행자가 대상을 고르지만, 1:1 콘테스트는
      // 상대가 유일한 대상이므로 항상 자동으로 상대를 targetId/targetIds로 넘긴다.
      const opponentId = current.player1Id === currentActor.id ? current.player2Id : current.player1Id;

      const beforeLog = current.engine.log.length;
      let nextEngine;
      try {
        nextEngine = advanceTurn(current.engine, { moveId: matched.id, targetId: opponentId, targetIds: [opponentId] });
      } catch (e) {
        turnResult = { error: e.message };
        return current;
      }
      const done = isContestDone(nextEngine);
      turnResult = { nextEngine, beforeLog, done };
      return {
        ...current,
        engine: nextEngine,
        status: done ? 'completed' : 'active',
        turnDeadlineAt: done ? current.turnDeadlineAt : new Date(Date.now() + TURN_TIMEOUT_MS).toISOString(),
        completedAt: done ? new Date().toISOString() : (current.completedAt || null),
        updatedAt: new Date().toISOString(),
      };
    });

    if (turnResult?.error) return `처리 중 문제가 발생했어요: ${turnResult.error}`;
    if (!txResult.committed || !turnResult) {
      return '지금은 그 기술을 선택할 수 없는 상태예요. 잠시 후 다시 시도해 주세요.';
    }

    const committedSession = txResult.snapshot.val();
    const lines = summarizeLogSince(turnResult.nextEngine, turnResult.beforeLog);
    if (turnResult.done) lines.push(...formatResultTail(turnResult.nextEngine));
    else lines.push('', formatTurnPrompt(committedSession));

    return withContestMentions(committedSession, lines.filter(Boolean).join('\n'));
  };

  const selectPokemon = async ({ author, content }) => {
    const selecting = await findSelectingContest(author.id);
    // 엔트리 선택 단계가 아니면 기술 선언으로 재시도 (배틀봇과 동일한 이유 -
    // 엔트리 닉네임이 실제 기술명과 같으면 getContestCommand가 기술 선택으로 오인식할 수 있다).
    if (!selecting) return declareMove({ author, content });

    const { sessionKey, session } = selecting;
    const side = session.player1Id === author.id ? 'p1' : 'p2';
    const entries = side === 'p1' ? session.player1Entries : session.player2Entries;
    const token = entryChoiceFromText(content);
    const selectedSlot = resolveEntryChoice(token, entries);

    if (!selectedSlot || selectedSlot < 1 || selectedSlot > entries.length) {
      return `선택할 수 있는 번호나 이름을 찾지 못했어요. [엔트리 1] 또는 [피카츄]처럼 입력해 주세요.\n${formatEntryList(side === 'p1' ? session.player1Name : session.player2Name, entries)}`;
    }

    // battleBot.js의 selectPokemon과 동일한 이유 - 두 참가자가 거의 동시에 엔트리를 고르면
    // .update()는 한쪽 선택을 지울 수 있다. transaction으로 원자적으로 병합한다.
    const sessionRef = db.ref(`gameData/contestSessions/${sessionKey}`);
    const txResult = await sessionRef.transaction((current) => {
      if (!current || current.status !== 'selecting') return current;
      return {
        ...current,
        pendingTeamChoices: { ...(current.pendingTeamChoices || {}), [side]: selectedSlot },
        updatedAt: new Date().toISOString(),
      };
    });

    if (!txResult.committed || txResult.snapshot.val()?.status !== 'selecting') {
      return '지금은 참가 포켓몬을 선택할 수 없는 상태예요.';
    }

    const pendingTeamChoices = txResult.snapshot.val().pendingTeamChoices || {};
    if (!pendingTeamChoices.p1 || !pendingTeamChoices.p2) return null;

    const p1Entry = session.player1Entries[pendingTeamChoices.p1 - 1];
    const p2Entry = session.player2Entries[pendingTeamChoices.p2 - 1];

    let engine = createContestState(session.contestType, [
      { id: session.player1Id, name: session.player1Name, pokemonName: p1Entry.name, conditionValue: p1Entry.conditionValue, moves: p1Entry.moves },
      { id: session.player2Id, name: session.player2Name, pokemonName: p2Entry.name, conditionValue: p2Entry.conditionValue, moves: p2Entry.moves },
    ], { maxRounds: MAX_ROUNDS });
    engine = runFirstJudging(engine);

    const updates = {
      status: 'active',
      player1Lead: pendingTeamChoices.p1,
      player2Lead: pendingTeamChoices.p2,
      pendingTeamChoices: {},
      engine,
      turnDeadlineAt: new Date(Date.now() + TURN_TIMEOUT_MS).toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await db.ref(`gameData/contestSessions/${sessionKey}`).update(updates);

    const updatedSession = { ...session, ...updates };
    return withContestMentions(updatedSession, [
      '콘테스트 시작!',
      `${session.player1Name}: ${p1Entry.name}`,
      `${session.player2Name}: ${p2Entry.name}`,
      ...summarizeLogSince(engine, 0),
      '',
      formatTurnPrompt(updatedSession),
    ].filter(Boolean).join('\n'));
  };

  // gameData/openContestSessions는 status가 pending/active인 세션만 담기는(끝나면 자동
  // 제거되는) 색인이라, checkContestMentions(매분 스케줄러)가 전체 이력이 아니라
  // "지금 열려있는 세션"만 스캔하면 된다 (battleBot.js와 동일한 이유, 2026-07-23 성능 이슈 참고).
  const closeTimedOutTurns = async (now = Date.now()) => {
    const snapshot = await db.ref('gameData/openContestSessions').once('value');
    const openSessions = snapshot.val() || {};
    const closed = [];

    for (const [sessionKey, meta] of Object.entries(openSessions)) {
      if (meta.status !== 'active') continue;
      const deadline = Date.parse(meta.turnDeadlineAt || '');
      if (!Number.isFinite(deadline) || now < deadline) continue;

      const ref = db.ref(`gameData/contestSessions/${sessionKey}`);
      let turnResult = null;
      const txResult = await ref.transaction((current) => {
        if (!current || current.status !== 'active') return current;
        const currentDeadline = Date.parse(current.turnDeadlineAt || '');
        if (!Number.isFinite(currentDeadline) || now < currentDeadline) return;

        const beforeLog = current.engine.log.length;
        const nextEngine = forceSkipTurn(current.engine, 'timeout');
        const done = isContestDone(nextEngine);
        turnResult = { nextEngine, beforeLog, done };
        return {
          ...current,
          engine: nextEngine,
          status: done ? 'completed' : 'active',
          turnDeadlineAt: done ? current.turnDeadlineAt : new Date(now + TURN_TIMEOUT_MS).toISOString(),
          completedAt: done ? new Date(now).toISOString() : (current.completedAt || null),
          updatedAt: new Date(now).toISOString(),
        };
      });

      if (txResult.committed && turnResult) {
        const committedSession = txResult.snapshot.val();
        const lines = summarizeLogSince(turnResult.nextEngine, turnResult.beforeLog);
        if (turnResult.done) lines.push(...formatResultTail(turnResult.nextEngine));
        else lines.push('', formatTurnPrompt(committedSession));

        closed.push({
          sessionKey,
          message: withContestMentions(committedSession, lines.filter(Boolean).join('\n')),
          lastBotStatusId: committedSession.lastBotStatusId || null,
        });
      }
    }

    return closed;
  };

  // 24시간 넘게 수락되지 않은 콘테스트 신청은 알림 없이 조용히 만료 처리한다 (battleBot.js와 동일).
  const expireStalePendingChallenges = async (now = Date.now()) => {
    const snapshot = await db.ref('gameData/openContestSessions').once('value');
    const openSessions = snapshot.val() || {};
    let expiredCount = 0;

    for (const [sessionKey, meta] of Object.entries(openSessions)) {
      if (meta.status !== 'pending') continue;
      const createdAt = Date.parse(meta.createdAt || '');
      if (!Number.isFinite(createdAt) || now - createdAt < PENDING_EXPIRATION_MS) continue;

      const ref = db.ref(`gameData/contestSessions/${sessionKey}`);
      const result = await ref.transaction((current) => {
        if (!current || current.status !== 'pending') return current;
        const currentCreatedAt = Date.parse(current.createdAt || '');
        if (!Number.isFinite(currentCreatedAt) || now - currentCreatedAt < PENDING_EXPIRATION_MS) return;
        return { ...current, status: 'expired', expiredAt: new Date(now).toISOString(), updatedAt: new Date(now).toISOString() };
      });

      if (result.committed) expiredCount += 1;
    }

    return { count: expiredCount };
  };

  const handle = async ({ status, content, command, members, author, authorAccount }) => {
    if (command === 'help') return formatHelp();
    if (command === 'challenge') return createChallenge({ status, members, author, authorAccount, content });
    if (command === 'accept') return acceptChallenge({ author });
    if (command === 'decline') return declineChallenge({ author });
    if (command === 'forfeit') return forfeit({ author });
    if (command === 'selectPokemon') return selectPokemon({ author, content });
    if (command === 'move') {
      const selecting = await findSelectingContest(author.id);
      if (selecting) return selectPokemon({ author, content });
      return declareMove({ author, content });
    }
    return formatHelp();
  };

  const findSessionByMember = async (memberId) => {
    const active = await findActiveContest(memberId);
    if (active) return active;
    const selecting = await findSelectingContest(memberId);
    if (selecting) return selecting;
    const pending = await findPendingChallenge(memberId);
    return pending || null;
  };

  return {
    getCommand: getContestCommand,
    handle,
    findSessionByMember,
    closeTimedOutTurns,
    expireStalePendingChallenges,
  };
};

module.exports = {
  createContestBot,
  getContestCommand,
};
