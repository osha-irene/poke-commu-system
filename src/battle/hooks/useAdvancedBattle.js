import { useCallback, useEffect, useRef, useState } from 'react';
import { Battle, Dex, Teams } from '@pkmn/sim';
import showdownIntegration from '../utils/ShowdownIntegration';
import fieldEffectsManager from '../utils/FieldEffectsManager';
import statusManager from '../utils/StatusManager';
import customBattleData from '../../data/customBattleData.json';
import { toCalcAbilityName } from '../../utils/abilityUtils';
import { getOwnedPokemonDisplayParts } from '../../utils/ownedPokemonDisplay';
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
  pendingChoices: {
    player1: null,
    player2: null,
  },
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

const buildNickMap = (battle, teams = []) => {
  // teamLookup 키: toPackedSet.name 과 동일한 우선순위 (nickname || nameKo || name || species)
  const teamLookup = new Map();
  for (const team of teams) {
    if (!Array.isArray(team)) continue;
    for (const p of team) {
      if (!p) continue;
      const psName = p.nickname || p.nameKo || p.name || p.species || '';
      if (psName) teamLookup.set(psName, p);
    }
  }

  const map = new Map();
  for (const side of [battle.p1, battle.p2]) {
    for (const poke of side.pokemon) {
      if (!poke) continue;
      const psName = poke.name || '';
      const teamPoke = teamLookup.get(psName);

      let enriched;
      if (teamPoke) {
        // getOwnedPokemonDisplayParts 로 닉네임 여부 정확히 판별
        const parts = getOwnedPokemonDisplayParts(teamPoke);
        enriched = parts.hasNickname
          ? `${parts.primary}(${parts.species})`
          : parts.primary;
      } else {
        // 팀 데이터 없으면 종족명 번역 fallback
        const speciesName = poke.species?.name || '';
        enriched = /-Mega(?:-[XY])?$/i.test(speciesName)
          ? formatMegaSpeciesName(speciesName)
          : formatBattleSpeciesName(speciesName);
      }

      if (psName) map.set(psName, enriched);
    }
  }
  return map;
};

const initialDisplayNames = (battle, nickMap) => {
  const displayNames = new Map();
  [
    ['p1a', battle.p1.active[0]],
    ['p2a', battle.p2.active[0]],
  ].forEach(([slot, pokemon]) => {
    if (!pokemon) return;
    const speciesName = pokemon?.species?.name || '';
    if (/-Mega(?:-[XY])?$/i.test(speciesName)) {
      displayNames.set(slot, formatMegaSpeciesName(speciesName));
    } else {
      const enriched = nickMap.get(pokemon.name) || formatBattleSpeciesName(speciesName);
      displayNames.set(slot, enriched);
    }
  });
  return displayNames;
};

// 끝 글자가 받침 없음/ㄹ받침이면 '로', 그 외 '으로'
const roSuffix = (str) => {
  if (!str) return '로';
  const code = str[str.length - 1].charCodeAt(0);
  if (code < 0xAC00 || code > 0xD7A3) return '로';
  const jongseong = (code - 0xAC00) % 28;
  return (jongseong === 0 || jongseong === 8) ? '로' : '으로';
};

// 끝 글자에 받침 있으면 '이', 없으면 '가'
const iSuffix = (str) => {
  if (!str) return '이';
  const code = str[str.length - 1].charCodeAt(0);
  if (code < 0xAC00 || code > 0xD7A3) return '이';
  return (code - 0xAC00) % 28 === 0 ? '가' : '이';
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
        return { message: `${extractName(parts[2])}\uc740(\ub294) ${megaName}${roSuffix(megaName)} \uba54\uac00\uc9c4\ud654\ud588\ub2e4!`, type: 'mega' };
      }
      const formeName = formatBattleSpeciesName(changedTo);
      return { message: `${extractName(parts[2])}\uc740(\ub294) ${formeName}${roSuffix(formeName)} \ubaa8\uc2b5\uc744 \ubc14\uafe8\ub2e4!`, type: 'switch' };
    }
    case 'cant': {
      const cantMsgs = {
        flinch: '\ud480\uc774 \uc8fd\uc5b4 \uc6c0\uc9c1\uc774\uc9c0 \ubabb\ud588\ub2e4!',
        par: '\ubab8\uc774 \uad73\uc5b4 \uc6c0\uc9c1\uc774\uc9c0 \ubabb\ud588\ub2e4!',
        slp: '\uc7a0\ub4e4\uc5b4 \uc788\ub2e4!',
        frz: '\uaf41\uaf41 \uc5bc\uc5b4 \uc788\ub2e4!',
        recharge: '\ud53c\ub85c\ud574\uc11c \uc26c\uc5c8\ub2e4!',
        disable: '\uae30\uc220\uc774 \ubd09\uc778\ub418\uc5b4 \uc0ac\uc6a9\ud560 \uc218 \uc5c6\ub2e4!',
        taunt: '\ub3c4\ubc1c \uc0c1\ud0dc\ub77c \ubcc0\ud654\uae30\uc220\uc744 \uc4f8 \uc218 \uc5c6\ub2e4!',
        encore: '\uc575\ucf5c \uc0c1\ud0dc\uc5d0\uc11c \ub2e4\ub978 \uae30\uc220\uc744 \uc4f8 \uc218 \uc5c6\ub2e4!',
        torment: '\ud2b8\uc9d1\uc744 \uc7a1\ud600 \uac19\uc740 \uae30\uc220\uc744 \ub2e4\uc2dc \uc4f8 \uc218 \uc5c6\ub2e4!',
        imprison: '\ubc29\ud638\ub97c \ubc1b\uc544 \uae30\uc220\uc744 \uc4f8 \uc218 \uc5c6\ub2e4!',
      };
      const reason = cantMsgs[(parts[3] || '').toLowerCase()] || '\uc6c0\uc9c1\uc774\uc9c0 \ubabb\ud588\ub2e4!';
      return { message: `${extractName(parts[2])}\uc740(\ub294) ${reason}`, type: 'status' };
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
      if (parts[2] === 'none') return { message: '\ub0a0\uc528\uac00 \uc6d0\ub798\ub300\ub85c \ub3cc\uc544\uc654\ub2e4!', type: 'weather' };
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
    case 'faint': {
      const faintName = extractName(parts[2]);
      return { message: `${faintName}${iSuffix(faintName)} \uc4f0\ub7ec\uc84c\ub2e4!`, type: 'faint' };
    }
    case 'turn':
      return { message: `\u2014 ${parts[2]}\ud134 \u2014`, type: 'turn' };
    case 'win':
      return { message: `${parts[2]} \uc2b9\ub9ac!`, type: 'winner' };
    default:
      return null;
  }
};
const collectLogs = (battle, fromIndex = 0, teams = []) => {
  const seenInBatch = new Set();
  const nickMap = buildNickMap(battle, teams);
  const displayNames = initialDisplayNames(battle, nickMap);

  return battle.log
    .slice(fromIndex)
    .flatMap((line) => {
      const rawParts = line?.split('|') || [];
      const slot = battleSlotKey(rawParts[2] || '');

      // 교체 시 displayNames 갱신 (처리 전에 먼저 갱신)
      if (line?.startsWith('|switch|') || line?.startsWith('|drag|') || line?.startsWith('|replace|')) {
        const nameInProtocol = extractName(rawParts[2] || '');
        const enriched = nickMap.get(nameInProtocol) || nameInProtocol;
        if (slot) displayNames.set(slot, enriched);
      }

      let message;

      if (line?.startsWith('|-formechange|')) {
        // displayNames 치환 전 원본 이름으로 처리해야 올바른 포켓몬명 사용 가능
        const pokeName = nickMap.get(extractName(rawParts[2] || '')) || extractName(rawParts[2] || '');
        const targetSpecies = formatSpeciesDetails(rawParts[3]);
        // rawParts[5] 등에 [from] ability: Zero to Hero 형태로 들어옴
        const fromAbility = rawParts.slice(4).join('|');
        const isZeroToHero = /zero.?to.?hero/i.test(fromAbility);

        // 매 턴 자동으로 폼이 바뀌는 종류: 로그는 표시하되 displayNames는 기본 이름 유지
        // (HP 로그가 "배고픈 모양 HP 117/133" 처럼 표시되지 않게)
        const AUTO_CYCLE_FORMES = new Set(['morpeko', 'morpekohangry']);
        const isAutoCycleForme = AUTO_CYCLE_FORMES.has(normalizeBattleKey(targetSpecies));
        const basePokeName = nickMap.get(extractName(rawParts[2] || '')) || extractName(rawParts[2] || '');

        if (/^Mimikyu-Busted/i.test(targetSpecies)) {
          // 따라큐 껍데기 특성 해제
          message = { message: `${pokeName}의 정체가 드러났다!`, type: 'ability' };
        } else if (isZeroToHero) {
          // Zero to Hero: 발동 시점에 바로 두 줄 출력
          const targetLabel = customSpeciesLabels[normalizeBattleKey(targetSpecies)];
          const abilityMsg = { message: `${pokeName}의 마이티체인지 발동!`, type: 'ability' };
          const formeMsg = targetLabel
            ? { message: `${pokeName}은(는) ${targetLabel}${roSuffix(targetLabel)} 모습을 바꿨다!`, type: 'switch' }
            : null;
          // displayNames 갱신 후 바로 return
          if (slot) displayNames.set(slot, targetLabel || basePokeName);
          return [abilityMsg, formeMsg].filter(Boolean).map(m => ({ ...m, _slot: slot }));
        } else {
          const targetLabel = customSpeciesLabels[normalizeBattleKey(targetSpecies)];
          if (targetLabel) {
            // 배틀폼으로 변신
            message = { message: `${pokeName}은(는) ${targetLabel}${roSuffix(targetLabel)} 모습을 바꿨다!`, type: 'switch' };
          } else {
            // 원래 폼으로 복귀 — 이전 폼 이름 사용
            const prevFormeName = displayNames.get(slot) || '';
            message = prevFormeName
              ? { message: `${pokeName}의 ${prevFormeName}${iSuffix(prevFormeName)} 풀렸다!`, type: 'switch' }
              : null;
          }
        }

        // displayNames 갱신
        // 매 턴 자동 폼체인지는 기본 이름 유지, 그 외엔 폼 레이블로 변경
        if (slot) {
          if (isAutoCycleForme) {
            displayNames.set(slot, basePokeName);
          } else {
            const targetLabel = customSpeciesLabels[normalizeBattleKey(targetSpecies)];
            displayNames.set(slot, targetLabel || basePokeName);
          }
        }
      } else {
        message = protocolToLog(applyDisplayNamesToLine(line, displayNames));

        // detailschange 후 슬롯 이름 갱신
        if (line?.startsWith('|detailschange|')) {
          const newSpecies = formatBattleSpeciesName(rawParts[3]);
          if (slot && newSpecies) displayNames.set(slot, newSpecies);
        }
      }

      if (!message) return [];
      return [{ ...message, _slot: slot }];
    })
    .filter(Boolean)
    .filter((entry) => {
      // 슬롯을 포함한 키로 중복 판별 — 다른 포켓몬이 같은 기술을 써도 슬롯이 다르면 표시됨
      const key = `${entry.type}:${entry._slot}:${entry.message}`;
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

const emptyPendingChoices = () => ({
  player1: null,
  player2: null,
});

const playerToSideId = player => (player === 'player1' ? 'p1' : 'p2');

const sideIdToPlayer = sideId => (sideId === 'p1' ? 'player1' : 'player2');

const getRequiredChoicePlayers = (battle) => {
  if (!battle || battle.ended) return [];

  return [
    ['p1', battle.p1],
    ['p2', battle.p2],
  ]
    .filter(([, side]) => isSideWaiting(getSideRequest(battle, side), side))
    .map(([sideId]) => sideIdToPlayer(sideId));
};

const samePendingChoice = (choiceA, choiceB) => (
  Boolean(choiceA && choiceB)
  && choiceA.choice === choiceB.choice
  && choiceA.type === choiceB.type
);

// 노말 타입을 다른 타입으로 변환하는 특성 (데미지 보정 포함)
const TYPE_OVERRIDE_ABILITIES = {
  pixilate: 'Fairy',       // 페어리스킨
  galvanize: 'Electric',   // 일렉트릭스킨
  aerilate: 'Flying',      // 에어로스킨
  refrigerate: 'Ice',      // 프리즈스킨
};

// 폼에 따라 기술 타입이 달라지는 경우 (moveId → { normalizedSpecies → type })
const FORME_MOVE_TYPE_OVERRIDES = {
  'aurawheel': {
    'morpekohangry': 'Dark',    // 배고픈 모양 → 악
    'morpeko': 'Electric',      // 배부른 모양 → 전기 (기본값이지만 명시)
  },
};

const getEffectiveMoveType = (baseType, abilityName, moveId = '', speciesName = '') => {
  // 폼 기반 타입 우선 처리
  const moveKey = moveId.toLowerCase().replace(/[^a-z]/g, '');
  const speciesKey = speciesName.toLowerCase().replace(/[^a-z]/g, '');
  const formeOverride = FORME_MOVE_TYPE_OVERRIDES[moveKey];
  if (formeOverride) {
    const overrideType = formeOverride[speciesKey];
    if (overrideType) return overrideType;
  }
  if (baseType !== 'Normal' || !abilityName) return baseType;
  const key = abilityName.toLowerCase().replace(/[^a-z]/g, '');
  return TYPE_OVERRIDE_ABILITIES[key] || baseType;
};

const getMoveData = (battle, moveSlot, requestMove = null, abilityName = '', speciesName = '') => {
  const id = requestMove?.id || moveSlot?.id || moveSlot?.move || requestMove?.move;
  const moveData = battle.dex.moves.get(id);
  const disabledSource = requestMove?.disabledSource || moveSlot?.disabledSource || '';
  const baseType = moveData?.type || 'Normal';
  const effectiveType = getEffectiveMoveType(baseType, abilityName, id || '', speciesName);
  const typeChanged = effectiveType !== baseType;

  return {
    name: translateMoveName(id || requestMove?.move),
    nameEn: moveData?.name || moveSlot?.move || requestMove?.move,
    id,
    type: translateTypeName(effectiveType),
    typeEn: effectiveType,
    baseType: translateTypeName(baseType),
    baseTypeEn: baseType,
    typeChanged,
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
  const abilityName = pokemon.ability || pokemon.baseAbility || '';
  const speciesName = pokemon.species?.name || '';
  const moveSlots = pokemon.moveSlots || [];
  if (!activeRequest?.moves) {
    return moveSlots.map(moveSlot => getMoveData(battle, moveSlot, null, abilityName, speciesName));
  }

  return activeRequest.moves.map((requestMove) => {
    const moveSlot = moveSlots.find(slot => slot.id === requestMove.id || slot.move === requestMove.move);
    return getMoveData(battle, moveSlot, requestMove, abilityName, speciesName);
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
    statusEn: pokemon.status || null,
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

const stateFromBattle = (battle, baseState, logFrom = 0, extraLogs = [], teams = []) => {
  const p1Request = getSideRequest(battle, battle.p1);
  const p2Request = getSideRequest(battle, battle.p2);
  const player1 = convertSide(battle, battle.p1, p1Request);
  const player2 = convertSide(battle, battle.p2, p2Request);
  let _logSeq = Date.now();
  const newLogs = [...extraLogs, ...collectLogs(battle, logFrom, teams)].map(e => ({ ...e, _uid: _logSeq++ }));

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
    log: [...baseState.log, ...newLogs].filter((entry, index, logs) =>
      index === 0 || entry._uid !== logs[index - 1]._uid
    ),
  };
};

export function useAdvancedBattle(initialOptions = {}) {
  const {
    player1Team = [],
    player2Team = [],
  } = initialOptions;

  const battleRef = useRef(null);
  const pendingChoicesRef = useRef(emptyPendingChoices());
  const logFromRef = useRef(0);
  const teamsRef = useRef([player1Team, player2Team]);
  teamsRef.current = [player1Team, player2Team];
  const [battleState, setBattleState] = useState(() => emptyBattleState(player1Team, player2Team));

  useEffect(() => {
    pendingChoicesRef.current = emptyPendingChoices();
    logFromRef.current = 0;
    setBattleState(emptyBattleState(player1Team, player2Team));
    battleRef.current = null;
  }, [player1Team, player2Team]);

  const setPendingChoices = useCallback((nextPending) => {
    pendingChoicesRef.current = nextPending;
    setBattleState(prev => ({
      ...prev,
      pendingChoices: nextPending,
    }));
  }, []);

  const submitChoices = useCallback((pending, logFrom) => {
    const battle = battleRef.current;
    if (!battle || battle.ended) return;

    const requiredPlayers = getRequiredChoicePlayers(battle);
    try {
      requiredPlayers.forEach((player) => {
        const p = pending[player];
        if (!p) return;
        if (p.type === 'item-pass') {
          // 아이템 턴 소모: commanding volatile 임시 주입으로 pass 허용
          const side = player === 'player1' ? battle.p1 : battle.p2;
          const pokemon = side.active?.[0];
          if (pokemon && !pokemon.fainted) {
            const had = 'commanding' in pokemon.volatiles;
            pokemon.volatiles['commanding'] = {};
            battle.choose(playerToSideId(player), 'pass');
            if (!had) delete pokemon.volatiles['commanding'];
          }
        } else {
          battle.choose(playerToSideId(player), p.choice);
        }
      });
    } catch (error) {
      console.error('배틀 선택 제출 실패:', error);
      const clearedPending = emptyPendingChoices();
      pendingChoicesRef.current = clearedPending;
      logFromRef.current = 0;
      setBattleState(prev => ({
        ...prev,
        pendingChoices: clearedPending,
        log: [...prev.log, { message: '선택 처리 중 오류가 발생했습니다.', type: 'fail' }],
      }));
      return;
    }

    const clearedPending = emptyPendingChoices();
    pendingChoicesRef.current = clearedPending;
    logFromRef.current = 0;
    const autoLogs = applyAutomaticChoices(battle);
    setBattleState(prev => stateFromBattle(battle, { ...prev, pendingChoices: clearedPending }, logFrom, autoLogs, teamsRef.current));
  }, []);

  const commitPendingChoicesIfReady = useCallback((nextPending, logFrom) => {
    const battle = battleRef.current;
    if (!battle || battle.ended) {
      setPendingChoices(nextPending);
      return;
    }

    const requiredPlayers = getRequiredChoicePlayers(battle);
    const readyToCommit = requiredPlayers.length > 0
      && requiredPlayers.every(player => nextPending[player]);

    if (!readyToCommit) {
      setPendingChoices(nextPending);
      return;
    }

    // 양쪽 모두 선택 필요한 턴이면 확인 대기, 한쪽만 선택하면 즉시 진행
    if (requiredPlayers.length >= 2) {
      logFromRef.current = logFrom;
      setPendingChoices(nextPending);
      return;
    }

    submitChoices(nextPending, logFrom);
  }, [setPendingChoices, submitChoices]);

  const confirmAndSubmit = useCallback(() => {
    const pending = pendingChoicesRef.current;
    const logFrom = logFromRef.current;
    const battle = battleRef.current;
    if (!battle || battle.ended) return;

    const requiredPlayers = getRequiredChoicePlayers(battle);
    if (!requiredPlayers.every(player => pending[player])) return;

    submitChoices(pending, logFrom);
  }, [submitChoices]);

  const startBattle = useCallback((p1ActiveIndices, p2ActiveIndices) => {
    const battle = new Battle({ formatid: FORMAT_ID });
    battle.setPlayer('p1', { name: 'Player 1', team: packTeam(player1Team) });
    battle.setPlayer('p2', { name: 'Player 2', team: packTeam(player2Team) });

    battle.choose('p1', `team ${teamPreviewOrder(p1ActiveIndices, player1Team.length)}`);
    battle.choose('p2', `team ${teamPreviewOrder(p2ActiveIndices, player2Team.length)}`);

    battleRef.current = battle;
    pendingChoicesRef.current = emptyPendingChoices();

    const initialState = {
      ...emptyBattleState(player1Team, player2Team),
      pendingChoices: emptyPendingChoices(),
      log: [
        { message: '\ubc30\ud2c0 \uc2dc\uc791!', type: 'system' },
      ],
    };

    const autoLogs = applyAutomaticChoices(battle);
    setBattleState(stateFromBattle(battle, initialState, 0, autoLogs, teamsRef.current));
  }, [player1Team, player2Team]);

  const selectMove = useCallback((player, activeIndex, moveIndex, options = {}) => {
    const battle = battleRef.current;
    if (!battle || battle.ended) return;

    const choice = {
      type: 'move',
      activeIndex,
      moveIndex,
      choice: `move ${moveIndex + 1}${options.mega ? ' mega' : ''}`,
      mega: Boolean(options.mega),
    };
    const currentPending = pendingChoicesRef.current;
    const nextPending = samePendingChoice(currentPending[player], choice)
      ? { ...currentPending, [player]: null }
      : { ...currentPending, [player]: choice };
    const logFrom = battle.log.length;
    commitPendingChoicesIfReady(nextPending, logFrom);
  }, [commitPendingChoicesIfReady]);

  const selectSwitch = useCallback((player, activeIndex, slotOrBenchIndex) => {
    const battle = battleRef.current;
    if (!battle || battle.ended) return;

    const side = player === 'player1' ? battle.p1 : battle.p2;
    const switchable = side.pokemon.filter(pokemon => !pokemon.isActive && !pokemon.fainted);
    const target = side.pokemon.find(pokemon => pokemon.position + 1 === slotOrBenchIndex) || switchable[slotOrBenchIndex];
    if (!target) return;

    const teamSlot = side.pokemon.indexOf(target) + 1;
    const choice = {
      type: 'switch',
      activeIndex,
      slot: slotOrBenchIndex,
      choice: `switch ${teamSlot}`,
    };
    const currentPending = pendingChoicesRef.current;
    const nextPending = samePendingChoice(currentPending[player], choice)
      ? { ...currentPending, [player]: null }
      : { ...currentPending, [player]: choice };
    const logFrom = battle.log.length;
    commitPendingChoicesIfReady(nextPending, logFrom);
  }, [commitPendingChoicesIfReady]);

  // 아이템 사용 시 턴 소모 — 포켓몬이 아무 행동도 하지 않고 턴을 넘깁니다.
  // submitChoices에서 commanding volatile 해킹으로 pkmn/sim의 pass 허용.
  const selectPass = useCallback((player) => {
    const battle = battleRef.current;
    if (!battle || battle.ended) return;
    const choice = { type: 'item-pass', choice: 'pass' };
    const currentPending = pendingChoicesRef.current;
    const nextPending = { ...currentPending, [player]: choice };
    const logFrom = battle.log.length;
    commitPendingChoicesIfReady(nextPending, logFrom);
  }, [commitPendingChoicesIfReady]);

  const clearPendingChoices = useCallback(() => {
    logFromRef.current = 0;
    setPendingChoices(emptyPendingChoices());
  }, [setPendingChoices]);

  const resetBattle = useCallback(() => {
    battleRef.current = null;
    pendingChoicesRef.current = emptyPendingChoices();
    logFromRef.current = 0;
    setBattleState(emptyBattleState(player1Team, player2Team));
  }, [player1Team, player2Team]);

  const previewDamage = useCallback((attacker, defender, moveName) => (
    showdownIntegration.calculateDamage(attacker, defender, moveName, battleState.field)
  ), [battleState.field]);

  const compareMoveDamage = useCallback((attacker, defender, moveNames) => (
    showdownIntegration.compareMoveDamage(attacker, defender, moveNames, battleState.field)
  ), [battleState.field]);

  // ── 배틀 중 아이템 사용 ──
  // 성공 시 롤백용 스냅샷 반환, 실패 시 null 반환
  const applyBattleItem = useCallback((player, item, effect, targetSlot = null) => {
    const battle = battleRef.current;
    if (!battle || battle.ended) return null;

    const side = player === 'player1' ? battle.p1 : battle.p2;

    let pokemon;
    if (effect.type === 'revive') {
      if (targetSlot === null) return null;
      pokemon = side.pokemon.find(p => p.position === targetSlot);
      if (!pokemon || !pokemon.fainted) return null;
    } else {
      if (targetSlot !== null) {
        pokemon = side.pokemon.find(p => p.position === targetSlot);
      } else {
        pokemon = side.active?.[0];
      }
      if (!pokemon || pokemon.fainted) return null;
    }

    // 롤백용 스냅샷 저장
    const snapshot = {
      player,
      targetSlot: pokemon.position,
      prevHP: pokemon.hp,
      prevStatus: pokemon.status,
      prevBoosts: { ...pokemon.boosts },
      prevFainted: pokemon.fainted,
    };

    const playerLabel = player === 'player1' ? 'Player 1' : 'Player 2';
    const itemName = item.name || item.nameEn || '아이템';
    let effectMsg = '';

    if (effect.type === 'revive') {
      const hp = effect.fullHP ? pokemon.maxhp : Math.floor(pokemon.maxhp / 2);
      pokemon.hp = hp;
      pokemon.fainted = false;
      const speciesName = pokemon.species?.name || pokemon.name || '포켓몬';
      effectMsg = `${speciesName} 부활 (HP ${hp}/${pokemon.maxhp})`;
    } else if (effect.type === 'heal') {
      const amount = effect.amount == null ? (pokemon.maxhp - pokemon.hp) : effect.amount;
      const actual = Math.min(amount, pokemon.maxhp - pokemon.hp);
      if (actual <= 0) return null;
      pokemon.hp = pokemon.hp + actual;
      effectMsg = `HP ${actual} 회복 (${pokemon.hp}/${pokemon.maxhp})`;
    } else if (effect.type === 'healpercent') {
      const amount = Math.floor(pokemon.maxhp * effect.percent);
      const actual = Math.min(amount, pokemon.maxhp - pokemon.hp);
      if (actual <= 0) return null;
      pokemon.hp = pokemon.hp + actual;
      effectMsg = `HP ${actual} 회복 (${pokemon.hp}/${pokemon.maxhp})`;
    } else if (effect.type === 'fullheal') {
      pokemon.hp = pokemon.maxhp;
      pokemon.status = '';
      effectMsg = 'HP 완전 회복 & 상태이상 치료';
    } else if (effect.type === 'curestatus') {
      if (!pokemon.status) return null;
      if (effect.status && pokemon.status !== effect.status) return null;
      pokemon.status = '';
      effectMsg = '상태이상 치료';
    } else if (effect.type === 'boost') {
      const cur = pokemon.boosts[effect.stat] || 0;
      if (cur >= 6) return null;
      pokemon.boosts[effect.stat] = Math.min(6, cur + effect.stages);
      const statLabels = { atk: '공격', def: '방어', spa: '특수공격', spd: '특수방어', spe: '스피드', accuracy: '명중률' };
      effectMsg = `${statLabels[effect.stat] || effect.stat} 상승`;
    } else {
      return null;
    }

    const itemLog = {
      message: `${playerLabel}이(가) ${itemName}을(를) 사용했다! (${effectMsg})`,
      type: 'item',
    };

    setBattleState(prev =>
      stateFromBattle(battle, prev, battle.log.length, [itemLog], teamsRef.current)
    );
    return snapshot;
  }, []);

  // ── 아이템 사용 롤백 ──
  const rollbackBattleItem = useCallback((snapshot) => {
    const battle = battleRef.current;
    if (!battle || !snapshot) return;
    const { player, targetSlot, prevHP, prevStatus, prevBoosts, prevFainted } = snapshot;
    const side = player === 'player1' ? battle.p1 : battle.p2;
    const pokemon = side.pokemon.find(p => p.position === targetSlot);
    if (!pokemon) return;

    pokemon.hp = prevHP;
    pokemon.status = prevStatus;
    pokemon.boosts = { ...prevBoosts };
    pokemon.fainted = prevFainted;

    // 해당 플레이어의 pending choice 제거
    setBattleState(prev => {
      const pending = { ...prev.pendingChoices };
      delete pending[player];
      return stateFromBattle(battle, { ...prev, pendingChoices: pending }, battle.log.length, [], teamsRef.current);
    });
    pendingChoicesRef.current = { ...pendingChoicesRef.current };
    delete pendingChoicesRef.current[player];
  }, []);

  return {
    battleState,
    startBattle,
    selectMove,
    selectSwitch,
    applyBattleItem,
    rollbackBattleItem,
    selectPass,
    clearPendingChoices,
    confirmAndSubmit,
    resetBattle,
    previewDamage,
    compareMoveDamage,
    showdownIntegration,
    fieldEffectsManager,
    statusManager,
  };
}

export default useAdvancedBattle;
