import { useCallback, useEffect, useRef, useState } from 'react';
import { Battle, Dex, Teams } from '@pkmn/sim';
import showdownIntegration from '../utils/ShowdownIntegration';
import fieldEffectsManager from '../utils/FieldEffectsManager';
import statusManager from '../utils/StatusManager';
import customBattleData from '../../data/customBattleData.json';
import {
  normalizeBattleKey,
  translateAbilityName,
  translateCategoryName,
  translateEffectName,
  translateItemName,
  translateMoveName,
  translateStatusName,
  translateTerrainName,
  translateTypeName,
  translateVolatileName,
  translateWeatherName,
  toShowdownItemName,
} from '../utils/battleTranslations';

const FORMAT_ID = 'gen9customgame';

const registerCustomBattleData = () => {
  (customBattleData.customMegaEvolutions || []).forEach((mega) => {
    const speciesId = normalizeBattleKey(mega.name);
    const itemId = normalizeBattleKey(mega.item);
    if (!speciesId || !itemId) return;

    Dex.data.Species[speciesId] = {
      num: 350,
      name: mega.name,
      baseSpecies: mega.baseSpecies,
      forme: mega.forme || 'Mega',
      types: mega.types || ['Normal'],
      abilities: { 0: mega.ability || 'No Ability' },
      baseStats: mega.baseStats,
      heightm: mega.heightm,
      weightkg: mega.weightkg,
      color: mega.color,
      eggGroups: mega.eggGroups || ['Water 1', 'Dragon'],
      requiredItem: mega.item,
      battleOnly: mega.baseSpecies,
      isNonstandard: 'Custom',
    };

    Dex.data.Items[itemId] = {
      name: mega.item,
      spritenum: 0,
      megaStone: mega.name,
      megaEvolves: mega.baseSpecies,
      itemUser: [mega.baseSpecies],
      onTakeItem: false,
      isNonstandard: 'Custom',
    };
  });
};

registerCustomBattleData();

const emptyBattleState = (player1Team = [], player2Team = []) => ({
  turn: 0,
  phase: 'team_selection',
  winner: null,
  requestState: null,
  player1: {
    team: player1Team,
    active: [],
    bench: [],
    sideConditions: [],
    fainted: [],
    requestType: 'none',
    canSwitch: false,
    forceSwitch: [],
  },
  player2: {
    team: player2Team,
    active: [],
    bench: [],
    sideConditions: [],
    fainted: [],
    requestType: 'none',
    canSwitch: false,
    forceSwitch: [],
  },
  field: fieldEffectsManager.createInitialField(),
  waitingForP1: false,
  waitingForP2: false,
  log: [],
});

const statLabel = {
  atk: '공격',
  def: '방어',
  spa: '특수공격',
  spd: '특수방어',
  spe: '스피드',
  accuracy: '명중률',
  evasion: '회피율',
};

const lockVolatiles = new Set(['lockedmove', 'rollout', 'iceball', 'uproar']);

const isLockedMoveRequest = (pokemon, activeRequest) => {
  const moves = activeRequest?.moves || [];
  if (moves.length !== 1) return false;

  const move = moves[0];
  const volatileKeys = Object.keys(pokemon?.volatiles || {});
  const hasLockVolatile = volatileKeys.some(key => lockVolatiles.has(key) || key === move.id);
  const requestLooksLocked = move.pp == null && move.target == null && move.disabled == null;

  return Boolean(activeRequest?.maybeLocked || hasLockVolatile || requestLooksLocked);
};

const toShowdownMoveId = (move) => {
  const moveName = typeof move === 'string' ? move : (move?.id || move?.nameEn || move?.name || move?.moveId);
  const moveData = showdownIntegration.getMove(moveName);
  return moveData?.id || normalizeBattleKey(moveData?.nameEn || moveName) || 'tackle';
};

const toPackedSet = (pokemon) => ({
  name: pokemon.nickname || pokemon.nameKo || pokemon.name || pokemon.species || 'Pokemon',
  species: pokemon.species || pokemon.nameEn || pokemon.name || 'Ditto',
  item: toShowdownItemName(pokemon.item || pokemon.heldItem || ''),
  ability: pokemon.abilityEn || pokemon.ability || 'No Ability',
  moves: (pokemon.moves || []).map(toShowdownMoveId).filter(Boolean).slice(0, 4),
  nature: pokemon.nature || 'Hardy',
  evs: pokemon.evs || {
    hp: pokemon.effort?.hp ?? 0,
    atk: pokemon.effort?.attack ?? pokemon.effort?.atk ?? 0,
    def: pokemon.effort?.defense ?? pokemon.effort?.def ?? 0,
    spa: pokemon.effort?.specialAttack ?? pokemon.effort?.spa ?? 0,
    spd: pokemon.effort?.specialDefense ?? pokemon.effort?.spd ?? 0,
    spe: pokemon.effort?.speed ?? pokemon.effort?.spe ?? 0,
  },
  ivs: {
    hp: pokemon.ivs?.hp ?? 31,
    atk: pokemon.ivs?.attack ?? pokemon.ivs?.atk ?? 31,
    def: pokemon.ivs?.defense ?? pokemon.ivs?.def ?? 31,
    spa: pokemon.ivs?.specialAttack ?? pokemon.ivs?.spa ?? 31,
    spd: pokemon.ivs?.specialDefense ?? pokemon.ivs?.spd ?? 31,
    spe: pokemon.ivs?.speed ?? pokemon.ivs?.spe ?? 31,
  },
  gender: pokemon.gender === 'male' ? 'M' : pokemon.gender === 'female' ? 'F' : '',
  shiny: Boolean(pokemon.isShiny),
  level: Number(pokemon.level || 50),
});

const packTeam = (team) => Teams.pack(team.map(toPackedSet));

const teamPreviewOrder = (selectedIndices, teamLength) => {
  const selected = selectedIndices.filter(index => index >= 0 && index < teamLength);
  const remaining = Array.from({ length: teamLength }, (_, index) => index)
    .filter(index => !selected.includes(index));
  return [...selected, ...remaining].map(index => index + 1).join(',');
};

const extractName = (value = '') => value.replace(/^p[12][a-z]?:\s*/, '') || value;

const protocolToLog = (line) => {
  if (!line || !line.startsWith('|')) return null;
  const parts = line.split('|');
  const command = parts[1];

  switch (command) {
    case 'move':
      return { message: `${extractName(parts[2])}의 ${translateMoveName(parts[3])}!`, type: 'move' };
    case '-damage':
      return { message: `${extractName(parts[2])} HP ${parts[3]}`, type: 'damage' };
    case '-heal':
      return { message: `${extractName(parts[2])} HP 회복 ${parts[3]}`, type: 'healing' };
    case '-boost':
      return { message: `${extractName(parts[2])}의 ${statLabel[parts[3]] || parts[3]}이(가) ${parts[4]}랭크 올랐다!`, type: 'boost' };
    case '-unboost':
      return { message: `${extractName(parts[2])}의 ${statLabel[parts[3]] || parts[3]}이(가) ${parts[4]}랭크 내려갔다!`, type: 'boost' };
    case '-weather':
      return {
        message: parts[3] === '[upkeep]'
          ? `${translateWeatherName(parts[2])} 날씨가 계속된다.`
          : `${translateWeatherName(parts[2])} 날씨가 시작됐다!`,
        type: 'weather',
      };
    case '-fieldstart':
      return { message: `${translateTerrainName(parts[2])} 효과가 시작됐다!`, type: 'field' };
    case '-fieldend':
      return { message: `${translateTerrainName(parts[2])} 효과가 끝났다.`, type: 'field' };
    case '-status':
      return { message: `${extractName(parts[2])}은(는) ${translateStatusName(parts[3])} 상태가 됐다!`, type: 'status' };
    case '-start':
      return { message: `${extractName(parts[2])}에게 ${translateEffectName(parts[3])} 효과가 시작됐다!`, type: 'status' };
    case '-end':
      return { message: `${extractName(parts[2])}의 ${translateEffectName(parts[3])} 효과가 끝났다.`, type: 'status' };
    case '-miss':
      return { message: `${extractName(parts[2])}의 공격은 빗나갔다!`, type: 'miss' };
    case '-fail':
      return { message: `${extractName(parts[2])}에게는 효과가 없었다.`, type: 'fail' };
    case '-immune':
      return { message: `${extractName(parts[2])}에게는 효과가 없다!`, type: 'fail' };
    case '-supereffective':
      return { message: '효과가 굉장했다!', type: 'damage' };
    case '-resisted':
      return { message: '효과가 별로인 것 같다...', type: 'damage' };
    case '-crit':
      return { message: '급소에 맞았다!', type: 'critical' };
    case '-ability':
      return { message: `${extractName(parts[2])}의 특성 ${translateAbilityName(parts[3])}!`, type: 'ability' };
    case '-activate':
      return { message: `${extractName(parts[2])}의 ${translateEffectName(parts[3])} 발동!`, type: 'ability' };
    case '-item':
      return { message: `${extractName(parts[2])}의 ${translateItemName(parts[3])} 발동!`, type: 'item' };
    case '-enditem':
      return { message: `${extractName(parts[2])}의 ${translateItemName(parts[3])}을(를) 사용했다.`, type: 'item' };
    case '-mega':
      return { message: `${extractName(parts[2])}은(는) 메가진화했다!`, type: 'mega' };
    case 'switch':
      return { message: `${extractName(parts[2])} 등장!`, type: 'switch' };
    case 'faint':
      return { message: `${extractName(parts[2])}은(는) 쓰러졌다!`, type: 'faint' };
    case 'turn':
      return { message: `${parts[2]}턴`, type: 'system' };
    case 'win':
      return { message: `${parts[2]} 승리!`, type: 'winner' };
    default:
      return null;
  }
};

const collectLogs = (battle, fromIndex = 0) => {
  const seenInBatch = new Set();

  return battle.log
    .slice(fromIndex)
    .map(protocolToLog)
    .filter(Boolean)
    .filter((entry) => {
      const key = `${entry.type}:${entry.message}`;
      if (seenInBatch.has(key)) return false;
      seenInBatch.add(key);
      return true;
    });
};

const getSideRequest = (battle, side) => {
  if (!battle || !side || battle.ended) return null;
  if (side.activeRequest) return side.activeRequest;
  if (!battle.requestState) return null;
  return battle.getRequests(battle.requestState)?.[side.n] || null;
};

const getRequestType = (request) => {
  if (!request) return 'none';
  if (request.wait) return 'wait';
  if (request.forceSwitch) return 'switch';
  if (request.active) return 'move';
  return 'none';
};

const hasSubmittedChoice = side => (side?.choice?.actions?.length || 0) > 0;

const isSideWaiting = (request, side) => Boolean(request && !request.wait && !hasSubmittedChoice(side));

const getMoveData = (battle, moveSlot, requestMove = null) => {
  const id = requestMove?.id || moveSlot?.id || moveSlot?.move || requestMove?.move;
  const moveData = battle.dex.moves.get(id);
  const disabledSource = requestMove?.disabledSource || moveSlot?.disabledSource || '';

  return {
    name: translateMoveName(id || requestMove?.move),
    nameEn: moveData?.name || moveSlot?.move || requestMove?.move,
    id,
    type: translateTypeName(moveData?.type || 'Normal'),
    typeEn: moveData?.type || 'Normal',
    category: translateCategoryName(moveData?.category || 'Status'),
    categoryEn: moveData?.category || 'Status',
    basePower: moveData?.basePower || 0,
    accuracy: moveData?.accuracy === true ? 100 : (moveData?.accuracy ?? true),
    pp: moveSlot?.maxpp ?? null,
    currentPP: moveSlot?.pp ?? null,
    disabled: Boolean(requestMove?.disabled ?? moveSlot?.disabled),
    disabledSource: disabledSource ? translateEffectName(disabledSource) : '',
  };
};

const convertMoves = (battle, pokemon, activeRequest = null) => {
  const moveSlots = pokemon.moveSlots || [];
  if (!activeRequest?.moves) {
    return moveSlots.map(moveSlot => getMoveData(battle, moveSlot));
  }

  return activeRequest.moves.map((requestMove) => {
    const moveSlot = moveSlots.find(slot => slot.id === requestMove.id || slot.move === requestMove.move);
    return getMoveData(battle, moveSlot, requestMove);
  });
};

const customMegaEvolutions = customBattleData.customMegaEvolutions || [];

const getCustomMegaEvolution = (pokemon) => {
  if (!pokemon?.item) return null;

  const itemKey = normalizeBattleKey(toShowdownItemName(pokemon.item) || pokemon.item);
  const speciesKeys = [
    pokemon.species?.baseSpecies,
    pokemon.species?.name,
    pokemon.species,
    pokemon.baseSpecies,
    pokemon.speciesid,
  ].map(normalizeBattleKey).filter(Boolean);

  return customMegaEvolutions.find((mega) => {
    const megaSpeciesKey = normalizeBattleKey(mega.name);
    if (speciesKeys.includes(megaSpeciesKey)) return false;

    const itemKeys = [mega.item, mega.itemKo].map(normalizeBattleKey);
    const baseSpeciesKeys = [mega.baseSpecies, mega.baseSpeciesKo].map(normalizeBattleKey);
    return itemKeys.includes(itemKey) && baseSpeciesKeys.some(key => speciesKeys.includes(key));
  }) || null;
};

const convertPokemon = (battle, pokemon, activeRequest = null, forceSwitch = false) => {
  if (!pokemon) return null;
  const ability = battle.dex.abilities.get(pokemon.ability || pokemon.baseAbility);
  const abilityName = ability?.name || pokemon.ability || pokemon.baseAbility;
  const builtInMegaSpecies = activeRequest?.canMegaEvo || pokemon.canMegaEvo || pokemon.canMegaEvoX || pokemon.canMegaEvoY || null;
  const customMega = builtInMegaSpecies ? null : getCustomMegaEvolution(pokemon);

  return {
    slot: pokemon.position + 1,
    name: pokemon.name,
    species: pokemon.species?.name || pokemon.species,
    nickname: pokemon.name,
    level: pokemon.level,
    types: (pokemon.getTypes ? pokemon.getTypes() : pokemon.types || []).map(translateTypeName),
    ability: translateAbilityName(abilityName),
    abilityEn: abilityName,
    item: pokemon.item ? translateItemName(pokemon.item) : null,
    itemEn: pokemon.item || null,
    hasItem: Boolean(pokemon.item),
    canMegaEvolve: Boolean(builtInMegaSpecies || customMega),
    megaSpecies: builtInMegaSpecies || customMega?.displayName || customMega?.name || null,
    status: pokemon.status ? translateStatusName(pokemon.status) : null,
    volatileStatus: Object.keys(pokemon.volatiles || {}).map(translateVolatileName),
    boosts: { ...pokemon.boosts },
    currentHP: pokemon.hp,
    maxHP: pokemon.maxhp,
    hp: pokemon.hp,
    maxHPPercent: pokemon.maxhp ? Math.round((pokemon.hp / pokemon.maxhp) * 100) : 0,
    stats: { hp: pokemon.maxhp },
    moves: convertMoves(battle, pokemon, activeRequest),
    request: {
      trapped: Boolean(activeRequest?.trapped),
      maybeTrapped: Boolean(activeRequest?.maybeTrapped),
      maybeLocked: isLockedMoveRequest(pokemon, activeRequest),
      forcedSwitch: Boolean(forceSwitch),
    },
    fainted: pokemon.fainted,
  };
};

const convertSide = (battle, side, request) => {
  const requestType = hasSubmittedChoice(side) ? 'wait' : getRequestType(request);
  const activeRequests = request?.active || [];
  const forceSwitch = request?.forceSwitch || [];
  const bench = side.pokemon
    .filter(pokemon => !pokemon.isActive && !pokemon.fainted)
    .map(pokemon => convertPokemon(battle, pokemon));
  const active = side.active
    .map((pokemon, index) => convertPokemon(battle, pokemon, activeRequests[index], forceSwitch[index]))
    .filter(Boolean);
  const trapped = active.some(pokemon => pokemon.request?.trapped);

  return {
    active,
    bench,
    fainted: side.pokemon
      .filter(pokemon => pokemon.fainted)
      .map(pokemon => convertPokemon(battle, pokemon)),
    sideConditions: Object.keys(side.sideConditions || {}).map(translateVolatileName),
    requestType,
    forceSwitch,
    canSwitch: bench.length > 0 && requestType !== 'wait' && (requestType === 'switch' || !trapped),
  };
};

const convertField = (battle) => {
  const pseudoWeather = Object.keys(battle.field.pseudoWeather || {});

  return {
    weather: battle.field.weather ? translateWeatherName(battle.field.weather) : null,
    weatherEn: battle.field.weather || null,
    terrain: battle.field.terrain ? translateTerrainName(battle.field.terrain) : null,
    terrainEn: battle.field.terrain || null,
    rooms: pseudoWeather.map(translateEffectName),
    roomsEn: pseudoWeather,
    weatherTurns: 0,
    terrainTurns: 0,
    p1SideConditions: Object.keys(battle.p1.sideConditions || {}).map(translateVolatileName),
    p2SideConditions: Object.keys(battle.p2.sideConditions || {}).map(translateVolatileName),
  };
};

const getAutoChoice = (battle, side) => {
  const request = getSideRequest(battle, side);
  const activeRequest = request?.active?.[0];
  if (!activeRequest || request.wait || request.forceSwitch || hasSubmittedChoice(side)) return null;
  const pokemon = side.active?.[0];

  const enabledMoves = (activeRequest.moves || [])
    .map((move, index) => ({ move, index }))
    .filter(({ move }) => !move.disabled);

  if (!isLockedMoveRequest(pokemon, activeRequest) || enabledMoves.length !== 1) return null;

  const selected = enabledMoves[0];
  return {
    choice: `move ${selected.index + 1}`,
    moveName: translateMoveName(selected.move.id || selected.move.move),
  };
};

const applyAutomaticChoices = (battle) => {
  const messages = [];
  let progressed = true;
  let guard = 0;

  while (progressed && guard < 8 && !battle.ended) {
    progressed = false;
    guard += 1;

    const sides = [
      ['p1', battle.p1],
      ['p2', battle.p2],
    ];

    for (const [sideId, side] of sides) {
      const autoChoice = getAutoChoice(battle, side);
      if (!autoChoice || battle.ended) continue;
      battle.choose(sideId, autoChoice.choice);
      messages.push({
        message: `${side.name}은(는) ${autoChoice.moveName}를 계속 사용합니다.`,
        type: 'system',
      });
      progressed = true;
    }
  }

  return messages;
};

const stateFromBattle = (battle, baseState, logFrom = 0, extraLogs = []) => {
  const p1Request = getSideRequest(battle, battle.p1);
  const p2Request = getSideRequest(battle, battle.p2);
  const player1 = convertSide(battle, battle.p1, p1Request);
  const player2 = convertSide(battle, battle.p2, p2Request);
  const newLogs = [...extraLogs, ...collectLogs(battle, logFrom)];

  return {
    ...baseState,
    turn: battle.turn,
    phase: battle.ended ? 'finished' : 'battle',
    winner: battle.winner || null,
    requestState: battle.requestState || null,
    player1: {
      ...baseState.player1,
      ...player1,
    },
    player2: {
      ...baseState.player2,
      ...player2,
    },
    field: convertField(battle),
    waitingForP1: isSideWaiting(p1Request, battle.p1),
    waitingForP2: isSideWaiting(p2Request, battle.p2),
    log: [...baseState.log, ...newLogs].filter((entry, index, logs) => (
      index === 0 || entry.message !== logs[index - 1].message || entry.type !== logs[index - 1].type
    )),
  };
};

export function useAdvancedBattle(initialOptions = {}) {
  const {
    player1Team = [],
    player2Team = [],
  } = initialOptions;

  const battleRef = useRef(null);
  const [battleState, setBattleState] = useState(() => emptyBattleState(player1Team, player2Team));

  useEffect(() => {
    setBattleState(emptyBattleState(player1Team, player2Team));
    battleRef.current = null;
  }, [player1Team, player2Team]);

  const startBattle = useCallback((p1ActiveIndices, p2ActiveIndices) => {
    const battle = new Battle({ formatid: FORMAT_ID });
    battle.setPlayer('p1', { name: 'Player 1', team: packTeam(player1Team) });
    battle.setPlayer('p2', { name: 'Player 2', team: packTeam(player2Team) });

    battle.choose('p1', `team ${teamPreviewOrder(p1ActiveIndices, player1Team.length)}`);
    battle.choose('p2', `team ${teamPreviewOrder(p2ActiveIndices, player2Team.length)}`);

    battleRef.current = battle;

    const initialState = {
      ...emptyBattleState(player1Team, player2Team),
      log: [
        { message: '배틀 시작!', type: 'system' },
      ],
    };

    const autoLogs = applyAutomaticChoices(battle);
    setBattleState(stateFromBattle(battle, initialState, 0, autoLogs));
  }, [player1Team, player2Team]);

  const selectMove = useCallback((player, activeIndex, moveIndex, options = {}) => {
    const battle = battleRef.current;
    if (!battle || battle.ended) return;

    const side = player === 'player1' ? 'p1' : 'p2';
    const logFrom = battle.log.length;
    battle.choose(side, `move ${moveIndex + 1}${options.mega ? ' mega' : ''}`);
    const autoLogs = applyAutomaticChoices(battle);

    setBattleState(prev => stateFromBattle(battle, {
      ...prev,
      waitingForP1: side === 'p1' ? false : prev.waitingForP1,
      waitingForP2: side === 'p2' ? false : prev.waitingForP2,
    }, logFrom, autoLogs));
  }, []);

  const selectSwitch = useCallback((player, activeIndex, slotOrBenchIndex) => {
    const battle = battleRef.current;
    if (!battle || battle.ended) return;

    const side = player === 'player1' ? battle.p1 : battle.p2;
    const switchable = side.pokemon.filter(pokemon => !pokemon.isActive && !pokemon.fainted);
    const target = side.pokemon.find(pokemon => pokemon.position + 1 === slotOrBenchIndex) || switchable[slotOrBenchIndex];
    if (!target) return;

    const sideId = player === 'player1' ? 'p1' : 'p2';
    const teamSlot = side.pokemon.indexOf(target) + 1;
    const logFrom = battle.log.length;
    battle.choose(sideId, `switch ${teamSlot}`);
    const autoLogs = applyAutomaticChoices(battle);

    setBattleState(prev => stateFromBattle(battle, {
      ...prev,
      waitingForP1: sideId === 'p1' ? false : prev.waitingForP1,
      waitingForP2: sideId === 'p2' ? false : prev.waitingForP2,
    }, logFrom, autoLogs));
  }, []);

  const resetBattle = useCallback(() => {
    battleRef.current = null;
    setBattleState(emptyBattleState(player1Team, player2Team));
  }, [player1Team, player2Team]);

  const previewDamage = useCallback((attacker, defender, moveName) => (
    showdownIntegration.calculateDamage(attacker, defender, moveName, battleState.field)
  ), [battleState.field]);

  const compareMoveDamage = useCallback((attacker, defender, moveNames) => (
    showdownIntegration.compareMoveDamage(attacker, defender, moveNames, battleState.field)
  ), [battleState.field]);

  return {
    battleState,
    startBattle,
    selectMove,
    selectSwitch,
    resetBattle,
    previewDamage,
    compareMoveDamage,
    showdownIntegration,
    fieldEffectsManager,
    statusManager,
  };
}

export default useAdvancedBattle;
