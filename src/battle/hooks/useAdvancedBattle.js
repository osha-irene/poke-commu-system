import { useCallback, useEffect, useRef, useState } from 'react';
import { Battle, Dex, Teams } from '@pkmn/sim';
import showdownIntegration from '../utils/ShowdownIntegration';
import fieldEffectsManager from '../utils/FieldEffectsManager';
import statusManager from '../utils/StatusManager';
import customBattleData from '../../data/customBattleData.json';
import customAbilities from '../data/customAbilities';
import { DEFAULT_BATTLE_RULE_ID, getBattleRule } from '../data/battleRules';
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
  toShowdownSpeciesName,
} from '../utils/battleTranslations';

// Showdown hardcodes ppUps=3 (PP Max, 1.6x base PP) for all moves internally.
// Patch to base PP so internal PP and display PP are 1:1.
Battle.prototype.calculatePP = (move) => move.pp;

const FORMAT_ID = 'gen9customgame';

const buildBattleFormat = (ruleId) => {
  const rule = getBattleRule(ruleId);
  const baseFormat = Dex.formats.get(rule.baseFormatId || FORMAT_ID);
  return rule.buildFormat(baseFormat);
};

const registerCustomBattleData = () => {
  Object.entries(customAbilities).forEach(([abilityId, ability]) => {
    Dex.data.Abilities[abilityId] = { id: abilityId, ...ability };
  });

  // @pkmn/sim에 내장된 라이츄-메가-X/Y(포켓몬 레전드 Z-A) 데이터가 특성을 서핑테일(Surge
  // Surfer)로 잘못 갖고 있음 - 실제로는 일렉트릭메이커/노가드 (Bulbapedia 확인, 2026-08-23).
  // baseStats/메가스톤 연결은 내장 데이터가 정확하므로 종 전체를 덮어쓰지 않고 특성만 패치한다.
  if (Dex.data.Species.raichumegax) Dex.data.Species.raichumegax.abilities = { 0: 'Electric Surge' };
  if (Dex.data.Species.raichumegay) Dex.data.Species.raichumegay.abilities = { 0: 'No Guard' };

  (customBattleData.customMegaEvolutions || []).forEach((mega) => {
    const speciesId = normalizeBattleKey(mega.name);
    const itemId = normalizeBattleKey(mega.item);
    if (!speciesId || !itemId) return;

    // ⚠️ Dex가 쓰는 정식 종족명으로 정규화한다. customBattleData.json은 아포스트로피를
    // ASCII("Sirfetch'd", U+0027)로 적어놨지만 @pkmn/sim의 정식 이름은 타이포그래픽
    // 아포스트로피("Sirfetch’d", U+2019)라서, megaStone 키를 raw 문자열로 두면
    // canMegaEvo()의 item.megaStone[species.name] 조회가 항상 빗나가 메가진화가 조용히
    // 실패한다(창파나이트/파오리 계열). 종족명에 특수문자가 없으면 그대로 통과된다.
    const canonicalBaseSpecies = Dex.species.get(mega.baseSpecies)?.name || mega.baseSpecies;

    Dex.data.Species[speciesId] = {
      num: 350,
      // ⚠️ gen: 9 필수. battle-actions.js canMegaEvo()는 두 경로로 조회한다:
      //   1) item.megaStone[species.name]  ─ 단, dex.species.get(mega).gen >= 9 일 때만 즉시 반환
      //   2) item.megaStone[species.baseSpecies]  ─ 지역폼이면 baseSpecies가 원종("Samurott",
      //      "Lycanroc")이라 우리 megaStone 키("Samurott-Hisui" 등)와 안 맞아 null이 된다
      // 즉 대검귀(히스이)/황혼의 모습 루가루암 같은 폼 기반 커스텀 메가는 gen:9로 경로1을
      // 태워야만 메가진화가 먹힌다. (일반 종족도 경로1로 통일되어 무해.)
      gen: 9,
      name: mega.name,
      baseSpecies: canonicalBaseSpecies,
      forme: mega.forme || 'Mega',
      types: mega.types || ['Normal'],
      abilities: { 0: mega.ability || 'No Ability' },
      baseStats: mega.baseStats,
      heightm: mega.heightm,
      weightkg: mega.weightkg,
      color: mega.color,
      eggGroups: mega.eggGroups || ['Water 1', 'Dragon'],
      requiredItem: mega.item,
      battleOnly: canonicalBaseSpecies,
      isNonstandard: 'Custom',
    };

    Dex.data.Items[itemId] = {
      name: mega.item,
      spritenum: 0,
      // battle-actions.js의 canMegaEvo()는 item.megaStone[species.name]으로 조회하므로
      // { baseSpecies: megaFormeName } 형태의 객체여야 한다. 문자열이면 실제 메가진화
      // 선택(choose 'move X mega')이 항상 조용히 실패한다.
      megaStone: { [canonicalBaseSpecies]: mega.name },
      megaEvolves: canonicalBaseSpecies,
      itemUser: [canonicalBaseSpecies],
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
  pendingSlotChoices: {
    player1: {},
    player2: {},
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

const ZERO_EVS = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };

// 메테노는 도감 데이터상 색깔별 운석 폼("minior-red-meteor" 등)으로 저장되지만,
// Pokemon Showdown 시뮬레이터에서 "Minior-Meteor"는 battleOnly 폼이라 팀 구성 시
// 직접 지정할 수 없다(코어 폼("Minior")만 팀에 넣을 수 있고, 방탄패기 특성이 HP에
// 따라 배틀 중 유성의 모습으로 자동 전환한다). "Minior-Meteor"를 그대로 넘기면
// 방탄패기가 "코어 폼으로 되돌리기"를 시도할 때 되돌아갈 대상(pokemon.set.species)도
// 유성의 모습이 되어버려서, 매 턴 폼체인지 메시지가 무한 반복되는 버그가 있었다
// (2026-08-11). 반드시 코어 폼인 "Minior"로 정규화해야 한다.
const resolveBattleSpeciesName = (species) => {
  const value = String(species || '');
  if (/^minior-.+-meteor$/i.test(value)) return 'Minior';
  return toShowdownSpeciesName(value) || value;
};

// 오리진 난이도(배틀 아이템 사용 ON)에서는 모든 포켓몬의 기초포인트(노력치)가
// 배틀 스탯에 반영되지 않도록 0으로 취급한다. 실제 저장된 pokemon.effort 값은
// 건드리지 않고, 배틀용 패킹 시점에서만 0으로 대체한다.
const toPackedSet = (pokemon, { zeroEffort = false } = {}) => ({
  name: pokemon.nickname || pokemon.nameKo || pokemon.name || pokemon.species || 'Pokemon',
  species: resolveBattleSpeciesName(pokemon.species || pokemon.nameEn || pokemon.name || 'Ditto'),
  item: toShowdownItemName(pokemon.item || pokemon.heldItem || ''),
  ability: toCalcAbilityName(pokemon.abilityEn || pokemon.ability) || 'No Ability',
  moves: (pokemon.moves || []).map(toShowdownMoveId).filter(Boolean).slice(0, 4),
  nature: pokemon.nature || 'Hardy',
  evs: zeroEffort ? ZERO_EVS : (pokemon.evs || {
    hp: pokemon.effort?.hp ?? 0,
    atk: pokemon.effort?.attack ?? pokemon.effort?.atk ?? 0,
    def: pokemon.effort?.defense ?? pokemon.effort?.def ?? 0,
    spa: pokemon.effort?.specialAttack ?? pokemon.effort?.spa ?? 0,
    spd: pokemon.effort?.specialDefense ?? pokemon.effort?.spd ?? 0,
    spe: pokemon.effort?.speed ?? pokemon.effort?.spe ?? 0,
  }),
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

const packTeam = (team, options) => Teams.pack(team.map(pokemon => toPackedSet(pokemon, options)));

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

// Showdown 프로토콜 HP 표기("48/100", "48/100 tox", "0 fnt")를 퍼센트로 변환
const formatHpFraction = (hpText) => {
  if (!hpText) return hpText;
  const spaceIndex = hpText.indexOf(' ');
  const hpPart = spaceIndex === -1 ? hpText : hpText.slice(0, spaceIndex);
  const suffix = spaceIndex === -1 ? '' : hpText.slice(spaceIndex);
  const [cur, max] = hpPart.split('/');
  if (!max) return `${hpPart === '0' ? '0%' : hpText}${suffix}`;
  const percent = Math.round((Number(cur) / Number(max)) * 100);
  return `${percent}%${suffix}`;
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
      return { message: `${extractName(parts[2])} HP ${formatHpFraction(parts[3])}`, type: 'damage' };
    case '-heal':
      return { message: `${extractName(parts[2])}\uc758 HP\uac00 \ud68c\ubcf5\ub418\uc5c8\ub2e4. HP ${formatHpFraction(parts[3])}`, type: 'healing' };
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
    case '-start': {
      const startEffect = (parts[3] || '').toLowerCase();
      if (startEffect === 'typechange' || startEffect === 'typeadd') {
        const newType = (parts[4] || '')
          .split('/')
          .map(t => translateTypeName(t.trim()))
          .filter(Boolean)
          .join('/') || parts[4] || '???';
        return { message: `${extractName(parts[2])}\uac00 ${newType}\ud0c0\uc785\uc73c\ub85c \ubcc0\ud588\ub2e4!`, type: 'ability' };
      }
      return { message: `${extractName(parts[2])}\uc5d0\uac8c ${translateEffectName(parts[3])} \ud6a8\uacfc\uac00 \ub098\ud0c0\ub0ac\ub2e4!`, type: 'status' };
    }
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
    case '-activate': {
      const powerArg = parts.slice(4).find(part => part?.startsWith('[power]'));
      const powerSuffix = powerArg
        ? ` (\ub2e4\uc74c \ub3c5\ud0c0\uc785 \uae30\uc220 \uc704\ub825 +${powerArg.replace('[power]', '').trim()})`
        : '';
      return { message: `${extractName(parts[2])}\uc758 ${translateEffectName(parts[3])} \ubc1c\ub3d9!${powerSuffix}`, type: 'ability' };
    }
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
// @pkmn/sim은 메가진화 시 detailschange(폼 변경) -> updateMaxHp(내부용 [silent] -heal) -> -mega(스톤 발광)
// 순서로 로그를 기록한다(pokemon.js의 formeChange 참고). 실제 게임에서는 스톤이 먼저 빛나고 그 다음
// 폼이 바뀌는 것처럼 보이므로, 표시용으로 -mega 줄을 detailschange 줄 앞으로 옮겨준다.
const reorderMegaEvolutionLines = (lines) => {
  const result = [...lines];
  for (let i = 0; i < result.length; i++) {
    const parts = result[i]?.split('|') || [];
    if (parts[1] !== 'detailschange') continue;
    if (!/-Mega(?:-[XY])?$/i.test(formatSpeciesDetails(parts[3]))) continue;

    const slot = parts[2];
    let j = i + 1;
    while (j < result.length) {
      const nextParts = result[j]?.split('|') || [];
      // '|split|pX' 줄(관전자/본인 시야 분기 마커)과 그 뒤에 오는 [silent] -heal은 건너뛴다
      if (nextParts[1] === 'split') {
        j += 1;
        continue;
      }
      if (nextParts[1] === '-heal' && nextParts[2] === slot && nextParts.includes('[silent]')) {
        j += 1;
        continue;
      }
      break;
    }

    const megaParts = result[j]?.split('|') || [];
    if (megaParts[1] === '-mega' && megaParts[2] === slot) {
      const [megaLine] = result.splice(j, 1);
      result.splice(i, 0, megaLine);
      i += 1;
    }
  }
  return result;
};

const collectLogs = (battle, fromIndex = 0, teams = []) => {
  const seenInBatch = new Set();
  const nickMap = buildNickMap(battle, teams);
  const displayNames = initialDisplayNames(battle, nickMap);

  return reorderMegaEvolutionLines(battle.log.slice(fromIndex))
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

const emptySlotChoices = () => ({
  player1: {},
  player2: {},
});

// 이번 요청에서 실제로 선택이 필요한 활성 슬롯 인덱스 목록.
// (더블배틀에서 한쪽이 기절해도 요청 객체 자체는 항상 활성 인원 수만큼의 항목을 유지하므로,
// 실제로 선택을 보내야 하는 슬롯은 여기서 직접 걸러야 한다 — @pkmn/sim의 Side#getChoiceIndex가
// 기절한 슬롯/스위치 불필요한 슬롯을 자동으로 건너뛰므로, 살아있는 슬롯 순서대로만 보내면 된다.)
const getRequiredSlotIndices = (battle, side) => {
  const request = getSideRequest(battle, side);
  if (!request) return [];
  if (request.forceSwitch) {
    return request.forceSwitch
      .map((flag, index) => (flag ? index : null))
      .filter(index => index !== null);
  }
  if (request.active) {
    return (side.active || [])
      .map((pokemon, index) => (pokemon && !pokemon.fainted ? index : null))
      .filter(index => index !== null);
  }
  return [];
};

// 한 플레이어의 슬롯별 선택(slotChoices)을 하나의 battle.choose() 문자열로 합친다.
// 필요한 슬롯이 모두 채워지기 전까지는 null을 반환한다.
const composeSlotChoice = (battle, side, slotChoices = {}) => {
  const requiredIndices = getRequiredSlotIndices(battle, side);
  if (requiredIndices.length === 0) return null;
  if (!requiredIndices.every(index => slotChoices[index])) return null;
  return {
    type: 'composite',
    choice: requiredIndices.map(index => slotChoices[index].choice).join(', '),
  };
};

// 특정 플레이어의 특정 활성 슬롯에 대한 선택을 토글(같은 선택 재클릭 시 취소)한다.
const toggleSlotChoice = (currentSlots, player, activeIndex, slotChoice) => {
  const currentPlayerSlots = currentSlots[player] || {};
  const existing = currentPlayerSlots[activeIndex];
  const isSame = existing && existing.type === slotChoice.type && existing.choice === slotChoice.choice;
  const nextPlayerSlots = { ...currentPlayerSlots };
  if (isSame) {
    delete nextPlayerSlots[activeIndex];
  } else {
    nextPlayerSlots[activeIndex] = slotChoice;
  }
  return { ...currentSlots, [player]: nextPlayerSlots };
};

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
    // 더블배틀 타겟 선택에 사용 (예: 'normal', 'adjacentAlly', 'allAdjacent', 'self' 등)
    targetType: requestMove?.target || moveData?.target || 'normal',
    basePower: moveData?.basePower || 0,
    accuracy: moveData?.accuracy === true ? 100 : (moveData?.accuracy ?? true),
    pp: moveData?.pp ?? null,
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
  // 커스텀 메가는 이제 sim의 canMegaEvo가 정상 인식하므로 builtInMegaSpecies 경로로 잡힌다.
  // 버튼에 영문 폼명("Sirfetchd-Mega")이 아니라 한글 표시명("메가창파나이트")을 쓰기 위해
  // customMegaEvolutions에서 폼명으로 역조회한다.
  const builtInMegaCustomEntry = builtInMegaSpecies
    ? customMegaEvolutions.find((entry) => normalizeBattleKey(entry.name) === normalizeBattleKey(builtInMegaSpecies))
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
    megaSpecies: builtInMegaCustomEntry?.displayName || builtInMegaSpecies || customMega?.displayName || customMega?.name || null,
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
    ruleId = DEFAULT_BATTLE_RULE_ID,
    originModeEnabled = false,
  } = initialOptions;

  const battleRef = useRef(null);
  const pendingChoicesRef = useRef(emptyPendingChoices());
  const slotChoicesRef = useRef(emptySlotChoices());
  const logFromRef = useRef(0);
  const teamsRef = useRef([player1Team, player2Team]);
  teamsRef.current = [player1Team, player2Team];
  const [battleState, setBattleState] = useState(() => emptyBattleState(player1Team, player2Team));

  useEffect(() => {
    pendingChoicesRef.current = emptyPendingChoices();
    slotChoicesRef.current = emptySlotChoices();
    logFromRef.current = 0;
    setBattleState(emptyBattleState(player1Team, player2Team));
    battleRef.current = null;
  }, [player1Team, player2Team]);

  // pendingChoices(제출 준비 완료된 조합 선택)를 갱신하면서, 그 시점의 슬롯별 선택 상태
  // (pendingSlotChoices)도 함께 노출한다. 더블배틀에서 UI가 활성 슬롯별로 "이미 골랐는지"를
  // 판단하려면 슬롯 단위 상태가 필요하기 때문.
  const setPendingChoices = useCallback((nextPending) => {
    pendingChoicesRef.current = nextPending;
    setBattleState(prev => ({
      ...prev,
      pendingChoices: nextPending,
      pendingSlotChoices: slotChoicesRef.current,
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
      const clearedSlots = emptySlotChoices();
      pendingChoicesRef.current = clearedPending;
      slotChoicesRef.current = clearedSlots;
      logFromRef.current = 0;
      setBattleState(prev => ({
        ...prev,
        pendingChoices: clearedPending,
        pendingSlotChoices: clearedSlots,
        log: [...prev.log, { message: '선택 처리 중 오류가 발생했습니다.', type: 'fail' }],
      }));
      return;
    }

    const clearedPending = emptyPendingChoices();
    const clearedSlots = emptySlotChoices();
    pendingChoicesRef.current = clearedPending;
    slotChoicesRef.current = clearedSlots;
    logFromRef.current = 0;
    const autoLogs = applyAutomaticChoices(battle);
    setBattleState(prev => stateFromBattle(battle, { ...prev, pendingChoices: clearedPending, pendingSlotChoices: clearedSlots }, logFrom, autoLogs, teamsRef.current));
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
    const battle = new Battle({ format: buildBattleFormat(ruleId) });
    const packOptions = { zeroEffort: originModeEnabled };
    battle.setPlayer('p1', { name: 'Player 1', team: packTeam(player1Team, packOptions) });
    battle.setPlayer('p2', { name: 'Player 2', team: packTeam(player2Team, packOptions) });

    battle.choose('p1', `team ${teamPreviewOrder(p1ActiveIndices, player1Team.length)}`);
    battle.choose('p2', `team ${teamPreviewOrder(p2ActiveIndices, player2Team.length)}`);

    battleRef.current = battle;
    pendingChoicesRef.current = emptyPendingChoices();
    slotChoicesRef.current = emptySlotChoices();

    const initialState = {
      ...emptyBattleState(player1Team, player2Team),
      pendingChoices: emptyPendingChoices(),
      pendingSlotChoices: emptySlotChoices(),
      log: [
        { message: '\ubc30\ud2c0 \uc2dc\uc791!', type: 'system' },
      ],
    };

    const autoLogs = applyAutomaticChoices(battle);
    setBattleState(stateFromBattle(battle, initialState, 0, autoLogs, teamsRef.current));
  }, [player1Team, player2Team, ruleId, originModeEnabled]);

  // options.target: 더블배틀 등 대상 지정이 필요한 기술에 쓰는 숫자.
  // 양수 = 상대 슬롯(1/2), 음수 = 아군 슬롯(-1/-2). 싱글배틀에서는 생략.
  const selectMove = useCallback((player, activeIndex, moveIndex, options = {}) => {
    const battle = battleRef.current;
    if (!battle || battle.ended) return;

    const target = options.target;
    const slotChoice = {
      type: 'move',
      activeIndex,
      moveIndex,
      target: target ?? null,
      choice: `move ${moveIndex + 1}${target != null ? ` ${target}` : ''}${options.mega ? ' mega' : ''}`,
      mega: Boolean(options.mega),
    };

    const nextSlots = toggleSlotChoice(slotChoicesRef.current, player, activeIndex, slotChoice);
    slotChoicesRef.current = nextSlots;

    const side = player === 'player1' ? battle.p1 : battle.p2;
    const nextPending = {
      ...pendingChoicesRef.current,
      [player]: composeSlotChoice(battle, side, nextSlots[player]),
    };
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
    const slotChoice = {
      type: 'switch',
      activeIndex,
      slot: slotOrBenchIndex,
      choice: `switch ${teamSlot}`,
    };

    const nextSlots = toggleSlotChoice(slotChoicesRef.current, player, activeIndex, slotChoice);
    slotChoicesRef.current = nextSlots;

    const nextPending = {
      ...pendingChoicesRef.current,
      [player]: composeSlotChoice(battle, side, nextSlots[player]),
    };
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
    slotChoicesRef.current = emptySlotChoices();
    setPendingChoices(emptyPendingChoices());
  }, [setPendingChoices]);

  const resetBattle = useCallback(() => {
    battleRef.current = null;
    pendingChoicesRef.current = emptyPendingChoices();
    slotChoicesRef.current = emptySlotChoices();
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
      effectMsg = `${speciesName} 부활 (HP ${formatHpFraction(`${hp}/${pokemon.maxhp}`)})`;
    } else if (effect.type === 'heal') {
      const amount = effect.amount == null ? (pokemon.maxhp - pokemon.hp) : effect.amount;
      const actual = Math.min(amount, pokemon.maxhp - pokemon.hp);
      if (actual <= 0) return null;
      pokemon.hp = pokemon.hp + actual;
      effectMsg = `HP ${actual} 회복 (${formatHpFraction(`${pokemon.hp}/${pokemon.maxhp}`)})`;
    } else if (effect.type === 'healpercent') {
      const amount = Math.floor(pokemon.maxhp * effect.percent);
      const actual = Math.min(amount, pokemon.maxhp - pokemon.hp);
      if (actual <= 0) return null;
      pokemon.hp = pokemon.hp + actual;
      effectMsg = `HP ${actual} 회복 (${formatHpFraction(`${pokemon.hp}/${pokemon.maxhp}`)})`;
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

  const getRawLog = () => battleRef.current?.log || [];

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
    getRawLog,
  };
}

export default useAdvancedBattle;
