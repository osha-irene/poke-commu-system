import { useCallback, useEffect, useRef, useState } from 'react';
import { Battle, Dex, Teams } from '@pkmn/sim';
import showdownIntegration from '../utils/ShowdownIntegration';
import fieldEffectsManager from '../utils/FieldEffectsManager';
import statusManager from '../utils/StatusManager';
import customBattleData from '../../data/customBattleData.json';
import { toCalcAbilityName } from '../../utils/abilityUtils';
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
  atk: '\uacf5\uaca9',
  def: '\ubc29\uc5b4',
  spa: '\ud2b9\uc218\uacf5\uaca9',
  spd: '\ud2b9\uc218\ubc29\uc5b4',
  spe: '\uc2a4\ud53c\ub4dc',
  accuracy: '\uba85\uc911\ub960',
  evasion: '\ud68c\ud53c\uc728',
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
  ability: toCalcAbilityName(pokemon.abilityEn || pokemon.ability) || 'No Ability',
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

const battleSlotKey = (value = '') => {
  const match = String(value).match(/^(p[12][a-z]?):\s*/);
  return match ? match[1] : '';
};

const customSpeciesLabels = Object.entries(customBattleData.aliases?.speciesLabels || {}).reduce((labels, [key, value]) => {
  labels[normalizeBattleKey(key)] = value;
  return labels;
}, {});

const translateBattlePokemonName = (value) => {
  const normalized = normalizeBattleKey(value);
  return customSpeciesLabels[normalized] || value || '\ud3ec\ucf13\ubaac';
};
const formatSpeciesDetails = (details = '') => String(details).split(',')[0].trim();

const formatMegaSpeciesName = (details = '') => {
  const species = formatSpeciesDetails(details);
  const customLabel = customSpeciesLabels[normalizeBattleKey(species)];
  if (customLabel) return customLabel;

  const megaMatch = species.match(/^(.+)-Mega(?:-[XY])?$/i);
  if (!megaMatch) return translateBattlePokemonName(species);
  const suffix = /-Mega-X$/i.test(species) ? ' X' : /-Mega-Y$/i.test(species) ? ' Y' : '';
  return `\uba54\uac00${translateBattlePokemonName(megaMatch[1])}${suffix}`;
};
const formatBattleSpeciesName = (species = '') =>
  /-Mega(?:-[XY])?$/i.test(formatSpeciesDetails(species))
    ? formatMegaSpeciesName(species)
    : translateBattlePokemonName(formatSpeciesDetails(species));

const applyDisplayNamesToLine = (line, displayNames) => {
  let nextLine = line;
  for (const [slot, name] of displayNames.entries()) {
    nextLine = nextLine.replace(new RegExp(`${slot}: [^|]+`, 'g'), `${slot}: ${name}`);
  }
  return nextLine;
};

const initialDisplayNames = (battle) => {
  const displayNames = new Map();
  [
    ['p1a', battle.p1.active[0]],
    ['p2a', battle.p2.active[0]],
  ].forEach(([slot, pokemon]) => {
    const speciesName = pokemon?.species?.name || '';
    if (/-Mega(?:-[XY])?$/i.test(speciesName)) {
      displayNames.set(slot, formatMegaSpeciesName(speciesName));
    }
  });
  return displayNames;
};

const protocolToLog = (line) => {
  if (!line || !line.startsWith('|')) return null;
  const parts = line.split('|');
  const command = parts[1];

  switch (command) {
    case '-mega':
      return { message: `${extractName(parts[2])}\uc758 \uba54\uac00\uc2a4\ud1a4\uc774 \ube5b\ub0ac\ub2e4!`, type: 'mega' };
    case 'detailschange': {
      const changedTo = formatSpeciesDetails(parts[3]);
      if (/-Mega(?:-[XY])?$/i.test(changedTo)) {
        const megaName = formatMegaSpeciesName(parts[3]);
        return { message: `${extractName(parts[2])}\uc740(\ub294) ${megaName}\ub85c \uba54\uac00\uc9c4\ud654\ud588\ub2e4!`, type: 'mega' };
      }
      return { message: `${extractName(parts[2])}\uc740(\ub294) ${translateBattlePokemonName(changedTo)}\ub85c \ubaa8\uc2b5\uc744 \ubc14\uafc4\ub2e4!`, type: 'switch' };
    }
    case 'move':
      return { message: `${extractName(parts[2])}\uc758 ${translateMoveName(parts[3])}!`, type: 'move' };
    case '-damage':
      return { message: `${extractName(parts[2])} HP ${parts[3]}`, type: 'damage' };
    case '-heal':
      return { message: `${extractName(parts[2])}\uc758 HP\uac00 \ud68c\ubcf5\ub418\uc5c8\ub2e4. HP ${parts[3]}`, type: 'healing' };
    case '-boost':
      return { message: `${extractName(parts[2])}\uc758 ${statLabel[parts[3]] || parts[3]}\uc774(\uac00) ${parts[4]}\ub7ad\ud06c \uc62c\ub790\ub2e4!`, type: 'boost' };
    case '-unboost':
      return { message: `${extractName(parts[2])}\uc758 ${statLabel[parts[3]] || parts[3]}\uc774(\uac00) ${parts[4]}\ub7ad\ud06c \ub5a8\uc5b4\uc84c\ub2e4!`, type: 'boost' };
    case '-weather':
      if (parts[3] === '[upkeep]') return null;
      return { message: `${translateWeatherName(parts[2])} \ub0a0\uc528\uac00 \uc2dc\uc791\ub410\ub2e4!`, type: 'weather' };
    case '-fieldstart':
      return { message: `${translateTerrainName(parts[2])} \ud6a8\uacfc\uac00 \uc2dc\uc791\ub410\ub2e4!`, type: 'field' };
    case '-fieldend':
      return { message: `${translateTerrainName(parts[2])} \ud6a8\uacfc\uac00 \uc0ac\ub77c\uc84c\ub2e4.`, type: 'field' };
    case '-status':
      return { message: `${extractName(parts[2])}\uc740(\ub294) ${translateStatusName(parts[3])} \uc0c1\ud0dc\uac00 \ub418\uc5c8\ub2e4!`, type: 'status' };
    case '-start':
      return { message: `${extractName(parts[2])}\uc5d0\uac8c ${translateEffectName(parts[3])} \ud6a8\uacfc\uac00 \ub098\ud0c0\ub0ac\ub2e4!`, type: 'status' };
    case '-end':
      return { message: `${extractName(parts[2])}\uc758 ${translateEffectName(parts[3])} \ud6a8\uacfc\uac00 \uc0ac\ub77c\uc84c\ub2e4.`, type: 'status' };
    case '-miss':
      return { message: `${extractName(parts[2])}\uc758 \uacf5\uaca9\uc740 \ube57\ub098\uac14\ub2e4!`, type: 'miss' };
    case '-fail':
      return { message: `${extractName(parts[2])}\uc5d0\uac8c\ub294 \ud6a8\uacfc\uac00 \uc5c6\uc5c8\ub2e4...`, type: 'fail' };
    case '-immune':
      return { message: `${extractName(parts[2])}\uc5d0\uac8c\ub294 \ud1b5\ud558\uc9c0 \uc54a\uc558\ub2e4!`, type: 'fail' };
    case '-supereffective':
      return { message: '\ud6a8\uacfc\uac00 \uad49\uc7a5\ud588\ub2e4!', type: 'damage' };
    case '-resisted':
      return { message: '\ud6a8\uacfc\uac00 \ubcc4\ub85c\uc778 \uac83 \uac19\ub2e4...', type: 'damage' };
    case '-crit':
      return { message: '\uae09\uc18c\uc5d0 \ub9de\uc558\ub2e4!', type: 'critical' };
    case '-ability':
      return { message: `${extractName(parts[2])}\uc758 \ud2b9\uc131 ${translateAbilityName(parts[3])}!`, type: 'ability' };
    case '-activate':
      return { message: `${extractName(parts[2])}\uc758 ${translateEffectName(parts[3])} \ubc1c\ub3d9!`, type: 'ability' };
    case '-item':
      return { message: `${extractName(parts[2])}\uc758 ${translateItemName(parts[3])} \ubc1c\ub3d9!`, type: 'item' };
    case '-enditem':
      return { message: `${extractName(parts[2])}\uc758 ${translateItemName(parts[3])}\uc744(\ub97c) \uc0ac\uc6a9\ud588\ub2e4.`, type: 'item' };
    case 'switch':
      return { message: `${extractName(parts[2])} \ub4f1\uc7a5!`, type: 'switch' };
    case 'faint':
      return { message: `${extractName(parts[2])}\uc740(\ub294) \uc4f0\ub7ec\uc84c\ub2e4!`, type: 'faint' };
    case 'turn':
      return { message: `${parts[2]}\ud134`, type: 'system' };
    case 'win':
      return { message: `${parts[2]} \uc2b9\ub9ac!`, type: 'winner' };
    default:
      return null;
  }
};
const collectLogs = (battle, fromIndex = 0) => {
  const seenInBatch = new Set();
  const displayNames = initialDisplayNames(battle);

  return battle.log
    .slice(fromIndex)
    .map((line) => {
      const message = protocolToLog(applyDisplayNamesToLine(line, displayNames));

      if (line?.startsWith('|detailschange|') || line?.startsWith('|-formechange|')) {
        const parts = line.split('|');
        const slot = battleSlotKey(parts[2]);
        const nextName = formatBattleSpeciesName(parts[3]);
        if (slot && nextName) displayNames.set(slot, nextName);
      }

      return message;
    })
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

const getMegaSpeciesName = value => {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'object') return Object.values(value).find(item => typeof item === 'string') || null;
  return null;
};

const getBuiltInMegaSpeciesName = (pokemon, activeRequest = null) => {
  const requestMegaSpecies = getMegaSpeciesName(activeRequest?.canMegaEvo);
  const pokemonMegaSpecies = [
    pokemon?.canMegaEvo,
    pokemon?.canMegaEvoX,
    pokemon?.canMegaEvoY,
  ].map(getMegaSpeciesName).find(Boolean);

  return requestMegaSpecies || pokemonMegaSpecies;
};

const hasUsableMegaSpecies = (battle, value) => {
  const speciesName = getMegaSpeciesName(value);
  if (!speciesName) return false;
  const species = battle.dex.species.get(speciesName);
  return Boolean(species?.exists && species.types?.length);
};

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
  const requestedMegaSpecies = getBuiltInMegaSpeciesName(pokemon, activeRequest);
  const builtInMegaSpecies = hasUsableMegaSpecies(battle, requestedMegaSpecies) ? getMegaSpeciesName(requestedMegaSpecies) : null;
  const customMegaCandidate = builtInMegaSpecies ? null : getCustomMegaEvolution(pokemon);
  const customMega = customMegaCandidate && hasUsableMegaSpecies(battle, customMegaCandidate.name)
    ? customMegaCandidate
    : null;
  const speciesName = pokemon.species?.name || pokemon.species;
  const speciesLabel = /-Mega(?:-[XY])?$/i.test(speciesName)
    ? formatMegaSpeciesName(speciesName)
    : formatBattleSpeciesName(speciesName);
  const displayName = pokemon.name || speciesLabel;

  return {
    slot: pokemon.position + 1,
    name: displayName,
    species: speciesName,
    nickname: displayName === speciesLabel ? '' : displayName,
    speciesName: speciesLabel,
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
        message: `${side.name}\uc740(\ub294) ${autoChoice.moveName}\uc744(\ub97c) \uacc4\uc18d \uc0ac\uc6a9\ud569\ub2c8\ub2e4.`,
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
        { message: '\ubc30\ud2c0 \uc2dc\uc791!', type: 'system' },
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
    try {
      battle.choose(side, `move ${moveIndex + 1}${options.mega ? ' mega' : ''}`);
    } catch (error) {
      console.error('배틀 기술 선택 실패:', error);
      setBattleState(prev => ({
        ...prev,
        log: [
          ...prev.log,
          {
            message: options.mega
              ? '메가진화 처리에 실패했습니다. 이 포켓몬의 메가 폼 데이터가 올바른지 확인해주세요.'
              : '기술 선택 처리 중 오류가 발생했습니다.',
            type: 'fail',
          },
        ],
      }));
      return;
    }
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
