const { Battle, Teams } = require('@pkmn/sim');

const FORMAT_ID = 'gen9customgame';

const normalizeId = (value) => String(value || '')
  .toLowerCase()
  .replace(/[\s_\-'.:]/g, '')
  .replace(/[^\p{L}\p{N}]/gu, '');

const stripCommandText = (content) => String(content || '')
  .replace(/@\S+/g, '')
  .trim();

const moveChoiceFromText = (content) => {
  const text = stripCommandText(content);
  const explicit = text.match(/(?:^|\s)([12])\s*:\s*\[?\s*(?:기술\s*)?([1-4])\s*\]?/i);
  if (explicit) return Number(explicit[2]) - 1;

  const bracket = text.match(/\[?\s*기술\s*([1-4])\s*\]?/i);
  if (bracket) return Number(bracket[1]) - 1;

  return null;
};

const wantsMega = (content) => /\[?\s*메가\s*진화\s*\]?|\[?\s*메가진화\s*\]?/i.test(content);

const getBattleCommand = (content) => {
  if (/\[?\s*배틀\s*신청\s*\]?/i.test(content)) return 'challenge';
  if (/\[?\s*배틀\s*수락\s*\]?/i.test(content)) return 'accept';
  if (/\[?\s*배틀\s*거절\s*\]?/i.test(content)) return 'decline';
  if (/\[?\s*기권\s*\]?/i.test(content)) return 'forfeit';
  if (/\[?\s*배틀\s*(도움말|help)\s*\]?/i.test(content)) return 'help';
  if (moveChoiceFromText(content) !== null) return 'move';
  return null;
};

const pokemonKey = (pokemon) =>
  pokemon?.uniqueId || pokemon?.id || pokemon?.pokemonId || `${pokemon?.number}_${pokemon?.name}`;

const findPokemonTemplate = (pokemonData, pokemon) => {
  const candidates = [
    pokemon?.number,
    pokemon?.originalNumber,
    pokemon?.displayNumber,
    pokemon?.pokemonId,
    pokemon?.id,
    pokemon?.nameEn,
    pokemon?.species,
    pokemon?.name,
  ].map(normalizeId).filter(Boolean);

  return pokemonData.find((item) => {
    const keys = [
      item.number,
      item.originalNumber,
      item.displayNumber,
      item.id,
      item.nameEn,
      item.name,
    ].map(normalizeId);
    return keys.some((key) => candidates.includes(key));
  });
};

const getMoveId = (move) => {
  if (!move) return null;
  if (typeof move === 'string') return normalizeId(move);
  return normalizeId(move.id || move.moveId || move.nameEn || move.name);
};

const toPackedSet = (pokemonData, pokemon) => {
  const template = findPokemonTemplate(pokemonData, pokemon);
  const moves = (pokemon.moves || [])
    .map(getMoveId)
    .filter(Boolean)
    .slice(0, 4);

  return {
    name: pokemon.nickname || pokemon.name || template?.nameEn || 'Pokemon',
    species: pokemon.nameEn || template?.nameEn || pokemon.species || pokemon.name || 'Ditto',
    item: pokemon.heldItemEn || pokemon.itemEn || pokemon.heldItem || pokemon.item || '',
    ability: pokemon.abilityEn || template?.abilitiesEn?.[0] || pokemon.ability || 'No Ability',
    moves: moves.length ? moves : ['tackle'],
    nature: pokemon.nature || 'Hardy',
    evs: pokemon.evs || {},
    ivs: pokemon.ivs || {},
    gender: pokemon.gender === 'male' ? 'M' : pokemon.gender === 'female' ? 'F' : '',
    shiny: Boolean(pokemon.isShiny),
    level: Number(pokemon.level || 50),
  };
};

const packTeam = (pokemonData, pokemonList) =>
  Teams.pack(pokemonList.slice(0, 6).map((pokemon) => toPackedSet(pokemonData, pokemon)));

const extractName = (value = '') => String(value).replace(/^p[12][a-z]?:\s*/, '') || value;

const protocolToMessage = (line) => {
  if (!line || !line.startsWith('|')) return null;
  const parts = line.split('|');
  const command = parts[1];

  switch (command) {
    case 'move':
      return `${extractName(parts[2])}의 ${parts[3]}!`;
    case '-damage':
      return `${extractName(parts[2])} HP ${parts[3]}`;
    case '-heal':
      return `${extractName(parts[2])} HP 회복 ${parts[3]}`;
    case '-boost':
      return `${extractName(parts[2])}의 ${parts[3]} +${parts[4]}`;
    case '-unboost':
      return `${extractName(parts[2])}의 ${parts[3]} -${parts[4]}`;
    case '-status':
      return `${extractName(parts[2])}은(는) ${parts[3]} 상태가 됐습니다.`;
    case '-weather':
      return parts[3] === '[upkeep]' ? null : `${parts[2]} 날씨가 시작됐습니다.`;
    case '-mega':
      return `${extractName(parts[2])}은(는) 메가진화했습니다.`;
    case '-miss':
      return `${extractName(parts[2])}의 공격이 빗나갔습니다.`;
    case '-fail':
      return `${extractName(parts[2])}에게는 효과가 없었습니다.`;
    case '-immune':
      return `${extractName(parts[2])}에게는 효과가 없습니다.`;
    case '-supereffective':
      return '효과가 굉장했습니다!';
    case '-resisted':
      return '효과가 별로인 것 같습니다...';
    case '-crit':
      return '급소에 맞았습니다!';
    case 'switch':
      return `${extractName(parts[2])} 등장!`;
    case 'faint':
      return `${extractName(parts[2])}은(는) 쓰러졌습니다.`;
    case 'turn':
      return `턴 ${parts[2]}`;
    case 'win':
      return `${parts[2]} 승리!`;
    default:
      return null;
  }
};

const collectTurnMessages = (battle, fromIndex) => {
  const seen = new Set();
  return battle.log
    .slice(fromIndex)
    .map(protocolToMessage)
    .filter(Boolean)
    .filter((message) => {
      if (seen.has(message)) return false;
      seen.add(message);
      return true;
    });
};

const activeSummary = (battle) => {
  const p1 = battle.p1.active[0];
  const p2 = battle.p2.active[0];
  if (!p1 || !p2) return '';
  return [
    '',
    `1: ${p1.name} HP ${p1.hp}/${p1.maxhp}`,
    `2: ${p2.name} HP ${p2.hp}/${p2.maxhp}`,
  ].join('\n');
};

const createBattle = (session) => {
  const battle = new Battle({ formatid: FORMAT_ID });
  battle.setPlayer('p1', { name: session.player1Name || '1P', team: session.player1Team });
  battle.setPlayer('p2', { name: session.player2Name || '2P', team: session.player2Team });
  battle.choose('p1', 'team 1');
  battle.choose('p2', 'team 1');

  for (const turn of session.turns || []) {
    battle.choose('p1', turn.p1);
    battle.choose('p2', turn.p2);
  }

  return battle;
};

const formatHelp = () => [
  '배틀 명령어',
  `[배틀 신청] @상대`,
  `[배틀 수락]`,
  `1:[기술1] 또는 [기술 1]`,
  `2:[기술4] 또는 [기술 4]`,
  `[메가진화] [기술 1]`,
  `[기권]`,
].join('\n');

const createBattleBot = ({
  db,
  pokemonData,
  getMembers,
  findMemberByAccount,
  getAuthorAccount,
  getParticipantPokemon,
  extractMentionAccounts,
  normalizeAccount,
  localUsername,
  botAccount,
}) => {
  const findTaggedOpponent = (members, status, authorAccount) => {
    const author = normalizeAccount(authorAccount);
    const accounts = extractMentionAccounts(status)
      .map(normalizeAccount)
      .filter(account => localUsername(account) !== botAccount && account !== author);

    for (const account of accounts) {
      const match = findMemberByAccount(members, account);
      if (match) return match;
    }
    return null;
  };

  const findPendingChallenge = async (memberId) => {
    const snapshot = await db.ref('gameData/battleSessions').once('value');
    const sessions = snapshot.val() || {};
    const pending = Object.entries(sessions)
      .filter(([, session]) => session.status === 'pending' && session.player2Id === memberId)
      .sort((a, b) => String(b[1].createdAt || '').localeCompare(String(a[1].createdAt || '')));
    if (!pending.length) return null;
    return { sessionKey: pending[0][0], session: pending[0][1] };
  };

  const findActiveBattle = async (memberId) => {
    const snapshot = await db.ref('gameData/battleSessions').once('value');
    const sessions = snapshot.val() || {};
    const active = Object.entries(sessions)
      .filter(([, session]) =>
        session.status === 'active' &&
        (session.player1Id === memberId || session.player2Id === memberId)
      )
      .sort((a, b) => String(b[1].updatedAt || b[1].createdAt || '').localeCompare(String(a[1].updatedAt || a[1].createdAt || '')));
    if (!active.length) return null;
    return { sessionKey: active[0][0], session: active[0][1] };
  };

  const createChallenge = async ({ status, members, author, authorAccount }) => {
    const opponent = findTaggedOpponent(members, status, authorAccount);
    if (!opponent) return '[배틀 신청] 뒤에 상대 계정을 함께 태그해 주세요.';
    if (opponent.id === author.id) return '자기 자신에게는 배틀을 신청할 수 없어요.';

    const player1Pokemon = getParticipantPokemon(author.member);
    const player2Pokemon = getParticipantPokemon(opponent.member);
    if (!player1Pokemon.length) return '신청자의 배틀 참가 포켓몬을 찾을 수 없어요.';
    if (!player2Pokemon.length) return '상대의 배틀 참가 포켓몬을 찾을 수 없어요.';

    const session = {
      id: `battle_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      status: 'pending',
      player1Id: author.id,
      player1Name: author.member.name || author.member.nickname || author.id,
      player1Account: normalizeAccount(authorAccount),
      player1Team: packTeam(pokemonData, player1Pokemon),
      player2Id: opponent.id,
      player2Name: opponent.member.name || opponent.member.nickname || opponent.id,
      player2Account: normalizeAccount(opponent.member.mastodonAccount || opponent.member.mastodonId || ''),
      player2Team: packTeam(pokemonData, player2Pokemon),
      pendingChoices: {},
      turns: [],
      mastodonStatusId: status.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const ref = db.ref('gameData/battleSessions').push();
    await ref.set(session);
    return [
      `${session.player2Name}님에게 배틀을 신청했어요.`,
      '상대가 [배틀 수락]을 보내면 시작합니다.',
    ].join('\n');
  };

  const acceptChallenge = async ({ author }) => {
    const pending = await findPendingChallenge(author.id);
    if (!pending) return '수락할 배틀 신청이 없어요.';

    const battle = createBattle(pending.session);
    await db.ref(`gameData/battleSessions/${pending.sessionKey}`).update({
      status: 'active',
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return [
      '배틀 시작!',
      `${pending.session.player1Name} vs ${pending.session.player2Name}`,
      activeSummary(battle),
      '각자 1:[기술1] / 2:[기술4] 형식으로 기술을 선택해 주세요.',
    ].filter(Boolean).join('\n');
  };

  const declineChallenge = async ({ author }) => {
    const pending = await findPendingChallenge(author.id);
    if (!pending) return '거절할 배틀 신청이 없어요.';
    await db.ref(`gameData/battleSessions/${pending.sessionKey}`).update({
      status: 'declined',
      updatedAt: new Date().toISOString(),
    });
    return '배틀 신청을 거절했어요.';
  };

  const forfeit = async ({ author }) => {
    const active = await findActiveBattle(author.id);
    if (!active) return '진행 중인 배틀이 없어요.';
    const winner = active.session.player1Id === author.id ? active.session.player2Name : active.session.player1Name;
    await db.ref(`gameData/battleSessions/${active.sessionKey}`).update({
      status: 'forfeited',
      winner,
      updatedAt: new Date().toISOString(),
    });
    return `${winner} 승리! 상대가 기권했습니다.`;
  };

  const chooseMove = async ({ author, content }) => {
    const active = await findActiveBattle(author.id);
    if (!active) return '진행 중인 배틀이 없어요. [배틀 신청]으로 먼저 시작해 주세요.';

    const { sessionKey, session } = active;
    const side = session.player1Id === author.id ? 'p1' : 'p2';
    const moveIndex = moveChoiceFromText(content);
    if (moveIndex === null) return '기술 번호를 찾지 못했어요. 예: 1:[기술1] 또는 [기술 1]';

    const pendingChoices = {
      ...(session.pendingChoices || {}),
      [side]: `move ${moveIndex + 1}${wantsMega(content) ? ' mega' : ''}`,
    };

    if (!pendingChoices.p1 || !pendingChoices.p2) {
      await db.ref(`gameData/battleSessions/${sessionKey}`).update({
        pendingChoices,
        updatedAt: new Date().toISOString(),
      });
      const waitingFor = side === 'p1' ? session.player2Name : session.player1Name;
      return `${side === 'p1' ? '1' : '2'}P 선택 완료. ${waitingFor}님의 선택을 기다립니다.`;
    }

    const battle = createBattle(session);
    const logFrom = battle.log.length;
    battle.choose('p1', pendingChoices.p1);
    battle.choose('p2', pendingChoices.p2);

    const messages = collectTurnMessages(battle, logFrom);
    const nextTurns = [
      ...(session.turns || []),
      { p1: pendingChoices.p1, p2: pendingChoices.p2, createdAt: new Date().toISOString() },
    ];

    const updates = {
      turns: nextTurns,
      pendingChoices: {},
      updatedAt: new Date().toISOString(),
    };

    if (battle.ended) {
      updates.status = 'completed';
      updates.winner = battle.winner || '';
      updates.completedAt = new Date().toISOString();
    }

    await db.ref(`gameData/battleSessions/${sessionKey}`).update(updates);

    return [
      `결과`,
      ...messages,
      activeSummary(battle),
      battle.ended ? '배틀 종료!' : '다음 기술을 선택해 주세요.',
    ].filter(Boolean).join('\n');
  };

  const handle = async ({ status, content, command, members, author, authorAccount }) => {
    if (command === 'help') return formatHelp();
    if (command === 'challenge') return createChallenge({ status, members, author, authorAccount });
    if (command === 'accept') return acceptChallenge({ author });
    if (command === 'decline') return declineChallenge({ author });
    if (command === 'forfeit') return forfeit({ author });
    if (command === 'move') return chooseMove({ author, content });
    return formatHelp();
  };

  return {
    getCommand: getBattleCommand,
    handle,
  };
};

module.exports = {
  createBattleBot,
};

