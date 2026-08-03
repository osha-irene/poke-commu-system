const { normalizeCaughtPokemon } = require('./shared');

const FORMAT_ID = 'gen9customgame';
const BATTLE_CHOICE_TIMEOUT_MS = 10 * 60 * 1000;
const BATTLE_PENDING_EXPIRATION_MS = 24 * 60 * 60 * 1000;
let pokemonSim = null;
let customBattleDataRegistered = false;
let movesDataCache = null;
let pokemonDataForNamesCache = null;
let abilitiesDataCache = null;
let itemsDataCache = null;
let customBattleDataCache = null;
let translationMapsReady = false;

const getPokemonSim = () => {
  if (!pokemonSim) {
    pokemonSim = require('@pkmn/sim');
  }
  return pokemonSim;
};

const loadMovesData = () => {
  const candidates = ['./data/moves.json', '../src/data/moves.json'];
  for (const path of candidates) {
    try {
      return require(path);
    } catch (error) {
      // Try the next location. Firebase deploys normally include functions/data.
    }
  }
  return { moves: [] };
};

const loadPokemonData = () => {
  const candidates = [
    './data/allPokemon.json',
    '../src/data/allPokemon.json',
    './data/pokemon.json',
    '../src/data/pokemon.json',
  ];
  for (const path of candidates) {
    try {
      const loaded = require(path);
      return Array.isArray(loaded) ? loaded : loaded?.pokemon || [];
    } catch (error) {
      // Try the next location. Firebase deploys normally include functions/data.
    }
  }
  return [];
};

const loadJsonData = (candidates, fallback) => {
  for (const path of candidates) {
    try {
      return require(path);
    } catch (error) {
      // Try the next location.
    }
  }
  return fallback;
};

const getMovesData = () => {
  if (!movesDataCache) movesDataCache = loadMovesData();
  return movesDataCache;
};

const getPokemonDataForNames = () => {
  if (!pokemonDataForNamesCache) pokemonDataForNamesCache = loadPokemonData();
  return pokemonDataForNamesCache;
};

const getAbilitiesData = () => {
  if (!abilitiesDataCache) {
    abilitiesDataCache = loadJsonData(['./data/abilities.json', '../src/data/abilities.json'], []);
  }
  return abilitiesDataCache;
};

const getItemsData = () => {
  if (!itemsDataCache) {
    itemsDataCache = loadJsonData(['./data/items.json', '../src/data/items.json'], []);
  }
  return itemsDataCache;
};

const getCustomBattleData = () => {
  if (!customBattleDataCache) {
    customBattleDataCache = loadJsonData(['./data/customBattleData.json', '../src/data/customBattleData.json'], {});
  }
  return customBattleDataCache;
};

const customBattleData = { aliases: {} };
const abilitiesData = [];
const itemsData = [];

const normalizeId = (value) => String(value || '')
  .toLowerCase()
  .replace(/[\s_\-'.:]/g, '')
  .replace(/[^\p{L}\p{N}]/gu, '');

const registerCustomBattleData = () => {
  if (customBattleDataRegistered) return;
  const { Dex } = getPokemonSim();
  const customBattleData = getCustomBattleData();

  const customAbilities = require('./data/customAbilities');
  Object.entries(customAbilities).forEach(([abilityId, ability]) => {
    Dex.data.Abilities[abilityId] = { id: abilityId, ...ability };
  });

  (customBattleData.customMegaEvolutions || []).forEach((mega) => {
    Dex.data.Species[normalizeId(mega.name)] = {
      num: 350,
      name: mega.name,
      baseSpecies: mega.baseSpecies,
      forme: mega.forme || 'Mega',
      types: mega.types || ['Normal'],
      abilities: { 0: mega.ability || 'No Ability' },
      baseStats: mega.baseStats,
      heightm: mega.heightm,
      weightkg: mega.weightkg,
      color: mega.color || 'White',
      eggGroups: mega.eggGroups || ['Undiscovered'],
      requiredItem: mega.item,
      requiredItems: [mega.item].filter(Boolean),
      isMega: true,
      battleOnly: mega.baseSpecies,
      changesFrom: mega.baseSpecies,
    };

    Dex.data.Items[normalizeId(mega.item)] = {
      name: mega.item,
      spritenum: 0,
      megaStone: { [mega.baseSpecies]: mega.name },
      megaEvolves: mega.baseSpecies,
      itemUser: [mega.baseSpecies],
      onTakeItem: false,
    };
  });

  customBattleDataRegistered = true;
};

const moveNameMap = new Map();
const moveIdMap = new Map();
const pokemonNameMap = new Map();
const abilityIdMap = new Map([
  [normalizeId('매직미러'), 'Magic Bounce'],
]);
const abilityNameMap = new Map([
  [normalizeId('Magic Bounce'), '매직미러'],
  [normalizeId('magic-bounce'), '매직미러'],
  [normalizeId('매직미러'), '매직미러'],
]);
Object.entries(customBattleData.aliases?.abilities || {}).forEach(([key, value]) => {
  abilityIdMap.set(normalizeId(key), value);
});
Object.entries(customBattleData.aliases?.abilityLabels || {}).forEach(([key, value]) => {
  abilityNameMap.set(normalizeId(key), value);
});
(Array.isArray(abilitiesData) ? abilitiesData : abilitiesData.abilities || []).forEach((ability) => {
  [ability.id, ability.nameEn, ability.name].forEach((key) => {
    const normalized = normalizeId(key);
    if (normalized) abilityIdMap.set(normalized, ability.nameEn || ability.id);
    if (normalized) abilityNameMap.set(normalized, ability.name || ability.nameEn || ability.id);
  });
});

const itemIdMap = new Map([
  [normalizeId('디안시나이트'), 'Diancite'],
]);
const itemNameMap = new Map();
Object.entries(customBattleData.aliases?.items || {}).forEach(([key, value]) => {
  itemIdMap.set(normalizeId(key), value);
});
(Array.isArray(itemsData) ? itemsData : itemsData.items || []).forEach((item) => {
  [item.id, item.nameEn, item.name].forEach((key) => {
    const normalized = normalizeId(key);
    if (normalized) itemIdMap.set(normalized, item.nameEn || item.id);
    if (normalized) itemNameMap.set(normalized, item.name || item.nameEn || item.id);
  });
});

const ensureBattleDataMaps = () => {
  if (translationMapsReady) return;

  const movesData = getMovesData();
  (movesData.moves || []).forEach((move) => {
    [move.id, move.nameEn, move.name].forEach((key) => {
      const normalized = normalizeId(key);
      if (normalized) moveNameMap.set(normalized, move.name || move.nameEn || move.id);
      if (normalized) moveIdMap.set(normalized, move.nameEn || move.id);
    });
  });

  getPokemonDataForNames().forEach((pokemon) => {
    [pokemon.id, pokemon.nameEn, pokemon.name, pokemon.species].forEach((key) => {
      const normalized = normalizeId(key);
      if (normalized) pokemonNameMap.set(normalized, pokemon.name || pokemon.nameEn || pokemon.id);
    });
  });

  const loadedCustomBattleData = getCustomBattleData();
  Object.entries(loadedCustomBattleData.aliases?.speciesLabels || {}).forEach(([key, label]) => {
    pokemonNameMap.set(normalizeId(key), label);
  });
  Object.entries(loadedCustomBattleData.aliases?.abilities || {}).forEach(([key, value]) => {
    abilityIdMap.set(normalizeId(key), value);
  });
  Object.entries(loadedCustomBattleData.aliases?.abilityLabels || {}).forEach(([key, value]) => {
    abilityNameMap.set(normalizeId(key), value);
  });
  Object.entries(loadedCustomBattleData.aliases?.items || {}).forEach(([key, value]) => {
    itemIdMap.set(normalizeId(key), value);
  });

  const loadedAbilitiesData = getAbilitiesData();
  (Array.isArray(loadedAbilitiesData) ? loadedAbilitiesData : loadedAbilitiesData.abilities || []).forEach((ability) => {
    [ability.id, ability.nameEn, ability.name].forEach((key) => {
      const normalized = normalizeId(key);
      if (normalized) abilityIdMap.set(normalized, ability.nameEn || ability.id);
      if (normalized) abilityNameMap.set(normalized, ability.name || ability.nameEn || ability.id);
    });
  });

  const loadedItemsData = getItemsData();
  (Array.isArray(loadedItemsData) ? loadedItemsData : loadedItemsData.items || []).forEach((item) => {
    [item.id, item.nameEn, item.name].forEach((key) => {
      const normalized = normalizeId(key);
      if (normalized) itemIdMap.set(normalized, item.nameEn || item.id);
      if (normalized) itemNameMap.set(normalized, item.name || item.nameEn || item.id);
    });
  });

  translationMapsReady = true;
};

const translateMoveName = (value) => {
  ensureBattleDataMaps();
  const normalized = normalizeId(value);
  return moveNameMap.get(normalized) || value || '기술';
};

const translateAbilityName = (value) => {
  ensureBattleDataMaps();
  const normalized = normalizeId(value);
  return abilityNameMap.get(normalized) || value || '특성';
};

const resolveMoveId = (value) => {
  ensureBattleDataMaps();
  const normalized = normalizeId(value);
  return moveIdMap.get(normalized) || normalized;
};

const resolveAbilityName = (value, fallback = 'No Ability') => {
  ensureBattleDataMaps();
  const normalized = normalizeId(value);
  return abilityIdMap.get(normalized) || value || fallback;
};

const resolveItemName = (value) => {
  ensureBattleDataMaps();
  const normalized = normalizeId(value);
  return itemIdMap.get(normalized) || value || '';
};

const translateItemName = (value) => {
  ensureBattleDataMaps();
  const normalized = normalizeId(value);
  return itemNameMap.get(normalized) || value || '아이템';
};

const translatePokemonName = (value) => {
  ensureBattleDataMaps();
  const normalized = normalizeId(value);
  return pokemonNameMap.get(normalized) || value || '포켓몬';
};

const formatSpeciesDetails = (details = '') => String(details).split(',')[0].trim();

const formatMegaSpeciesName = (details = '') => {
  const species = formatSpeciesDetails(details);
  const megaMatch = species.match(/^(.+)-Mega(?:-[XY])?$/i);
  if (!megaMatch) return translatePokemonName(species);
  const suffix = /-Mega-X$/i.test(species) ? ' X' : /-Mega-Y$/i.test(species) ? ' Y' : '';
  return `메가${translatePokemonName(megaMatch[1])}${suffix}`;
};

const formatBattleSpeciesName = (species = '') =>
  /-Mega(?:-[XY])?$/i.test(formatSpeciesDetails(species))
    ? formatMegaSpeciesName(species)
    : translatePokemonName(formatSpeciesDetails(species));

const getSpeciesPrimaryAbility = (species = '') => {
  registerCustomBattleData();
  const { Dex } = getPokemonSim();
  const dexSpecies = Dex.species.get(species);
  if (!dexSpecies?.exists) return '';
  return dexSpecies.abilities?.['0'] || Object.values(dexSpecies.abilities || {})[0] || '';
};

const stripCommandText = (content) => String(content || '')
  .replace(/@\S+/g, '')
  .trim();

const extractBracketText = (content) => {
  const text = stripCommandText(content);
  const matches = [...text.matchAll(/\[([^\]]+)\]/g)].map(match => match[1].trim()).filter(Boolean);
  return matches.length ? matches[matches.length - 1] : text.trim();
};

const wantsMega = (content) => /\[\s*메가\s*진화\s*\]|\[\s*메가진화\s*\]/i.test(content);

const moveChoiceTokenFromText = (content) => {
  const text = stripCommandText(content)
    .replace(/\[\s*메가\s*진화\s*\]/gi, '')
    .replace(/\[\s*메가진화\s*\]/gi, '')
    .trim();

  const moveNumber = text.match(/\[?\s*기술\s*([1-4])\s*\]?/i);
  if (moveNumber) return { kind: 'index', value: Number(moveNumber[1]) - 1 };

  const bracket = extractBracketText(text);
  if (!bracket) return null;
  const bracketMoveNumber = bracket.match(/^기술\s*([1-4])$/i);
  if (bracketMoveNumber) return { kind: 'index', value: Number(bracketMoveNumber[1]) - 1 };
  const bareMoveNumber = bracket.match(/^([1-4])번?$/i);
  if (bareMoveNumber) return { kind: 'index', value: Number(bareMoveNumber[1]) - 1 };

  const cleaned = bracket.replace(/^기술\s*/i, '').trim();
  if (!cleaned) return null;
  return { kind: 'name', value: cleaned };
};

const teamChoiceFromText = (content) => {
  const text = extractBracketText(content);
  const match = text.match(/^(?:포켓몬|엔트리|선택)\s*([1-6])$/i) || text.match(/^([1-6])번?$/);
  if (match) return { type: 'index', value: Number(match[1]) };
  // 대괄호로 감싼 이름만 "이름으로 선택"으로 인정한다. 대괄호가 없으면 extractBracketText가
  // 메시지 전체를 그대로 돌려주므로, 여기서 막지 않으면 배틀과 무관한 잡담까지
  // selectPokemon 명령으로 오인식된다.
  const hasBracket = /\[[^\]]+\]/.test(stripCommandText(content));
  if (hasBracket && text && !/^(캠핑|계속|만족|교환|배틀|기권)/i.test(text)) return { type: 'name', value: text };
  return null;
};

const resolveTeamChoice = (token, entries) => {
  if (!token) return null;
  if (token.type === 'index') return token.value;
  const q = normalizeId(token.value);
  // 닉네임 정확 일치 우선, 그 다음 종족명
  const idx = entries.findIndex(e => normalizeId(e.nickname || '') === q && e.nickname);
  if (idx >= 0) return idx + 1;
  const idx2 = entries.findIndex(e => normalizeId(e.species || '') === q || normalizeId(e.name || '') === q);
  return idx2 >= 0 ? idx2 + 1 : null;
};

const isExplicitMoveText = (content) => {
  // 기술 번호 또는 '기술' 접두어 있는 경우만 명시적 기술 선택으로 인정
  const stripped = stripCommandText(content).replace(/\[\s*메가\s*진화\s*\]/gi, '').trim();
  if (/\[\s*기술\s*[1-4]\s*\]/i.test(stripped)) return true;
  const bracket = extractBracketText(stripped);
  if (!bracket) return false;
  return /^기술\s+\S/i.test(bracket); // [기술 리프스톰] 형태만
};

const isKnownMoveText = (content) => {
  const text = extractBracketText(content)
    .replace(/^기술\s*/i, '')
    .trim();
  if (!text) return false;
  ensureBattleDataMaps();
  return moveIdMap.has(normalizeId(text));
};

const isBattleMoveLikeText = (content) => {
  const text = extractBracketText(content);
  if (!text) return false;
  if (/^(캠핑|계속|만족|교환|배틀\s*(신청|수락|거절|도움말|help)|기권)/i.test(text)) return false;
  if (/^(포켓몬|엔트리|선택)\s*[1-6]$/i.test(text)) return false;
  return isExplicitMoveText(content) || isKnownMoveText(content);
};

const getBattleCommand = (content) => {
  if (/\[\s*배틀\s*신청\s*\]/i.test(content)) return 'challenge';
  if (/\[\s*배틀\s*수락\s*\]/i.test(content)) return 'accept';
  if (/\[\s*배틀\s*거절\s*\]/i.test(content)) return 'decline';
  if (/\[\s*배틀\s*종료\s*\]/i.test(content)) return 'endByHp';
  if (/\[\s*기권\s*\]/i.test(content)) return 'forfeit';
  if (/\[\s*배틀\s*(?:도움말|help)\s*\]/i.test(content)) return 'help';
  if (isBattleMoveLikeText(content)) return 'move';
  if (teamChoiceFromText(content) !== null) return 'selectPokemon';
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
  if (typeof move === 'string') return resolveMoveId(move);
  return resolveMoveId(move.id || move.moveId || move.nameEn || move.name);
};

const toPackedSet = (pokemonData, pokemon) => {
  const template = findPokemonTemplate(pokemonData, pokemon);
  const moves = (pokemon.moves || [])
    .map(getMoveId)
    .filter(Boolean)
    .slice(0, 4);

  const item = resolveItemName(pokemon.heldItemEn || pokemon.itemEn || pokemon.heldItem || pokemon.item || '');
  const ability = resolveAbilityName(
    pokemon.abilityEn || pokemon.ability || pokemon.hiddenAbility || template?.abilitiesEn?.[0] || template?.ability,
    template?.abilitiesEn?.[0] || 'No Ability'
  );

  return {
    name: pokemon.nickname || pokemon.name || template?.nameEn || 'Pokemon',
    species: pokemon.nameEn || template?.nameEn || pokemon.species || pokemon.name || 'Ditto',
    item,
    ability,
    moves: moves.length ? moves : ['tackle'],
    nature: pokemon.nature || 'Hardy',
    // 마스토돈 배틀봇 배틀은 오리진 난이도(BattleView의 배틀 아이템 사용 ON)와 동일하게
    // 기초포인트(노력치)를 배틀에 반영하지 않는다 — 항상 0으로 고정.
    evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
    ivs: pokemon.ivs || {},
    gender: pokemon.gender === 'male' ? 'M' : pokemon.gender === 'female' ? 'F' : '',
    shiny: Boolean(pokemon.isShiny),
    level: Number(pokemon.level || 50),
  };
};

const packTeam = (pokemonData, pokemonList) =>
  getPokemonSim().Teams.pack(pokemonList.slice(0, 6).map((pokemon) => toPackedSet(pokemonData, pokemon)));

const extractName = (value = '') => String(value).replace(/^p[12][a-z]?:\s*/, '') || value;

const battleSlotKey = (value = '') => {
  const match = String(value).match(/^(p[12][a-z]?):\s*/);
  return match ? match[1] : '';
};

const isSolarBeamMove = (move = '') => ['solarbeam', 'solar-beam'].includes(normalizeId(move));

const shouldHideResolvedSolarBeamPrepare = (orderedLog, prepareIndex) => {
  const prepareParts = String(orderedLog[prepareIndex] || '').split('|');
  if (prepareParts[1] !== '-prepare' || !isSolarBeamMove(prepareParts[3])) return false;

  const userSlot = battleSlotKey(prepareParts[2]);
  let targetSlot = '';

  for (let index = prepareIndex - 1; index >= 0; index -= 1) {
    const parts = String(orderedLog[index] || '').split('|');
    if (parts[1] === 'move') {
      if (battleSlotKey(parts[2]) === userSlot && isSolarBeamMove(parts[3])) {
        targetSlot = battleSlotKey(parts[4]);
      }
      break;
    }
  }

  for (let index = prepareIndex + 1; index < orderedLog.length; index += 1) {
    const parts = String(orderedLog[index] || '').split('|');
    if (parts[1] === 'move' || parts[1] === 'turn') break;
    if (
      ['-damage', '-supereffective', '-resisted', '-crit', '-immune'].includes(parts[1]) &&
      (!targetSlot || battleSlotKey(parts[2]) === targetSlot)
    ) {
      return true;
    }
  }

  return false;
};

const applyDisplayNamesToLine = (line, displayNames) => {
  let nextLine = line;
  for (const [slot, name] of displayNames.entries()) {
    nextLine = nextLine.replace(new RegExp(`${slot}: [^|]+`, 'g'), `${slot}: ${name}`);
  }
  return nextLine;
};

const formatEffectSource = (parts = []) => {
  const fromIndex = parts.findIndex(part => part === '[from]');
  if (fromIndex >= 0 && parts[fromIndex + 1]) {
    return parts[fromIndex + 1].replace(/^move:\s*/i, '').replace(/^ability:\s*/i, '');
  }
  return '';
};

const formatRawEffectSource = (parts = []) => {
  const fromIndex = parts.findIndex(part => part === '[from]');
  return fromIndex >= 0 && parts[fromIndex + 1] ? String(parts[fromIndex + 1]).trim() : '';
};

const formatDamageMessage = (parts = []) => {
  const name = extractName(parts[2]);
  const hp = formatHp(parts[3]);
  const source = formatRawEffectSource(parts);
  const normalizedSource = normalizeId(source);

  if (normalizedSource === 'psn' || normalizedSource === 'tox') {
    return `${name}은(는) 독으로 피해를 입었다! HP ${hp}`;
  }
  if (normalizedSource === 'brn') {
    return `${name}은(는) 화상으로 피해를 입었다! HP ${hp}`;
  }
  if (/^item:\s*/i.test(source)) {
    return `${name}은(는) ${translateItemName(source.replace(/^item:\s*/i, ''))}의 효과로 피해를 입었다! HP ${hp}`;
  }
  if (source) {
    return `${name}은(는) ${formatBattleEffect(source)} 효과로 피해를 입었다! HP ${hp}`;
  }
  return `${name}에게 피해! HP ${hp}`;
};

const formatHealMessage = (parts = []) => {
  const name = extractName(parts[2]);
  const hp = formatHp(parts[3]);
  const source = formatRawEffectSource(parts);

  if (/^item:\s*/i.test(source)) {
    return `${name}은(는) ${translateItemName(source.replace(/^item:\s*/i, ''))}을(를) 사용해 HP를 회복했다! HP ${hp}`;
  }
  if (source) {
    return `${name}의 HP가 ${formatBattleEffect(source)} 효과로 회복되었다! HP ${hp}`;
  }
  return `${name}의 HP가 회복되었다! HP ${hp}`;
};

const formatSourceSuffix = (parts = []) => {
  const source = formatEffectSource(parts);
  return source ? ` (${translateMoveName(source)})` : '';
};

const formatMoveSource = (parts = []) => {
  const source = formatEffectSource(parts);
  if (!source) return '';
  return ` (${translateAbilityName(source)}로 반사)`;
};

const formatBattleEffect = effect => {
  const text = String(effect || '').trim();
  if (/^ability:\s*/i.test(text)) return translateAbilityName(text.replace(/^ability:\s*/i, ''));
  if (/^item:\s*/i.test(text)) return translateItemName(text.replace(/^item:\s*/i, ''));
  const cleaned = text.replace(/^move:\s*/i, '');
  const normalized = normalizeId(cleaned);
  if (normalized === 'confusion') return '혼란';
  if (['psn', 'tox', 'par', 'brn', 'frz', 'slp'].includes(normalized)) return formatStatus(normalized);
  return translateMoveName(cleaned);
};

const formatSideEffect = effect => formatBattleEffect(effect);

const formatWeather = weather => ({
  SunnyDay: '쾌청',
  RainDance: '비',
  Sandstorm: '모래바람',
  Hail: '설경',
  Snow: '설경',
  DesolateLand: '끝의대지',
  PrimordialSea: '시작의바다',
  DeltaStream: '델타스트림',
})[weather] || weather;

const formatSourcePokemon = (parts = []) => {
  const ofIndex = parts.findIndex(part => part === '[of]');
  return ofIndex >= 0 && parts[ofIndex + 1] ? extractName(parts[ofIndex + 1]) : '';
};

const formatStatus = status => ({
  brn: '화상',
  par: '마비',
  psn: '독',
  tox: '맹독',
  slp: '잠듦',
  frz: '얼음',
})[status] || status;

const formatStat = stat => ({
  atk: '공격',
  def: '방어',
  spa: '특수공격',
  spd: '특수방어',
  spe: '스피드',
  accuracy: '명중률',
  evasion: '회피율',
})[stat] || stat;

const formatHpPercent = (current, max, suffix = '') => {
  const currentHp = Number(current);
  const maxHp = Number(max);
  if (!Number.isFinite(currentHp) || !Number.isFinite(maxHp) || maxHp <= 0) {
    return String(current || '').replace(' fnt', ' 기절');
  }
  const rawPercent = (currentHp / maxHp) * 100;
  const percent = currentHp > 0
    ? Math.max(1, Math.min(100, Math.round(rawPercent)))
    : 0;
  return `${percent}%${suffix}`;
};

const formatHp = (value) => {
  const text = String(value || '').trim();
  const fainted = /\bfnt\b/i.test(text);
  const hpMatch = text.match(/(\d+)\s*\/\s*(\d+)/);
  if (hpMatch) return formatHpPercent(hpMatch[1], hpMatch[2], fainted ? ' 기절' : '');

  const currentOnly = text.match(/^(\d+)(?:\s|$)/);
  if (currentOnly && fainted) return `${Number(currentOnly[1]) > 0 ? currentOnly[1] : 0}% 기절`;

  return text.replace(' fnt', ' 기절');
};

const protocolToMessage = (line) => {
  if (!line || !line.startsWith('|')) return null;
  const parts = line.split('|');
  const command = parts[1];

  switch (command) {
    case 'detailschange': {
      const changedTo = formatSpeciesDetails(parts[3]);
      if (/-Mega(?:-[XY])?$/i.test(changedTo)) {
        const ability = getSpeciesPrimaryAbility(changedTo);
        const megaName = formatMegaSpeciesName(parts[3]);
        return [
          `${extractName(parts[2])}은(는) ${megaName}로 메가진화했다!`,
          ability ? `${megaName}의 특성이 ${translateAbilityName(ability)}로 바뀌었다!` : '',
        ].filter(Boolean).join('\n');
      }
      return `${extractName(parts[2])}의 모습이 ${translatePokemonName(changedTo)}로 바뀌었다!`;
    }
    case 'move':
      if (formatEffectSource(parts)) {
        return `${extractName(parts[4])}의 ${translateMoveName(parts[3])}이(가) ${extractName(parts[2])}의 ${translateAbilityName(formatEffectSource(parts))} 특성으로 반사되었다!`;
      }
      return `${extractName(parts[2])}의 ${translateMoveName(parts[3])}!${formatMoveSource(parts)}`;
    case '-damage':
      return formatDamageMessage(parts);
    case '-heal':
      return formatHealMessage(parts);
    case '-boost':
      return `${extractName(parts[2])}의 ${formatStat(parts[3])}이(가) ${parts[4]}랭크 올랐다!${formatSourceSuffix(parts)}`;
    case '-unboost':
      return `${extractName(parts[2])}의 ${formatStat(parts[3])}이(가) ${parts[4]}랭크 떨어졌다!${formatSourceSuffix(parts)}`;
    case '-setboost':
      return `${extractName(parts[2])}의 ${formatStat(parts[3])} 랭크가 ${parts[4]}이(가) 되었다!`;
    case '-swapboost':
      return `${extractName(parts[2])}와(과) ${extractName(parts[3])}의 능력 변화가 뒤바뀌었다!`;
    case '-copyboost':
      return `${extractName(parts[2])}은(는) ${extractName(parts[3])}의 능력 변화를 복사했다!`;
    case '-clearboost':
      return `${extractName(parts[2])}의 능력 변화가 원래대로 돌아갔다!`;
    case '-clearallboost':
      return '모든 포켓몬의 능력 변화가 원래대로 돌아갔다!';
    case '-clearpositiveboost':
      return `${extractName(parts[2])}의 올라간 능력 변화가 사라졌다!`;
    case '-clearnegativeboost':
      return `${extractName(parts[2])}의 떨어진 능력 변화가 사라졌다!`;
    case '-invertboost':
      return `${extractName(parts[2])}의 능력 변화가 반대로 뒤집혔다!`;
    case '-status':
      return `${extractName(parts[2])}은(는) ${formatStatus(parts[3])} 상태가 되었다!`;
    case '-curestatus':
      return `${extractName(parts[2])}의 ${formatStatus(parts[3])} 상태가 회복되었다!`;
    case '-weather':
      if (parts[3] === '[upkeep]') return null;
      if (formatEffectSource(parts)) {
        const sourcePokemon = formatSourcePokemon(parts);
        return `${sourcePokemon ? `${sourcePokemon}의 ` : ''}${translateAbilityName(formatEffectSource(parts))} 특성으로 날씨가 ${formatWeather(parts[2])}(으)로 바뀌었다!`;
      }
      return `날씨가 ${formatWeather(parts[2])}(으)로 바뀌었다!`;
    case '-mega':
      return `${extractName(parts[2])}의 메가스톤이 빛났다!`;
    case '-miss':
      return `${extractName(parts[2])}의 공격은 빗나갔다!`;
    case '-fail':
      return `${extractName(parts[2])}에게는 효과가 없었다...`;
    case '-immune':
      return `${extractName(parts[2])}에게는 통하지 않았다!`;
    case '-supereffective':
      return '효과가 굉장했다!';
    case '-resisted':
      return '효과가 별로인 듯하다...';
    case '-crit':
      return '급소에 맞았다!';
    case '-item':
      return `${extractName(parts[2])}의 ${translateItemName(parts[3])}이(가) 발동했다!`;
    case '-enditem':
      return parts.includes('[eat]')
        ? `${extractName(parts[2])}은(는) ${translateItemName(parts[3])}을(를) 사용했다!`
        : `${extractName(parts[2])}의 ${translateItemName(parts[3])}은(는) 사라졌다.`;
    case '-ability':
      return `${extractName(parts[2])}의 특성 ${translateAbilityName(parts[3])}!`;
    case '-endability':
      return `${extractName(parts[2])}의 특성 ${translateAbilityName(parts[3])} 효과가 사라졌다.`;
    case '-transform':
      return `${extractName(parts[2])}은(는) ${extractName(parts[3])}로 변신했다!`;
    case '-formechange': {
      const changedTo = formatSpeciesDetails(parts[3]);
      return `${extractName(parts[2])}의 모습이 ${translatePokemonName(changedTo)}로 바뀌었다!`;
    }
    case '-terastallize':
      return `${extractName(parts[2])}은(는) ${parts[3]}타입으로 테라스탈했다!`;
    case '-start': {
      const source = formatEffectSource(parts);
      return `${extractName(parts[2])}에게 ${formatBattleEffect(parts[3])} 효과가 나타났다${source ? ` (${translateAbilityName(source)})` : ''}.`;
    }
    case '-end':
      return `${extractName(parts[2])}의 ${formatBattleEffect(parts[3])} 효과가 사라졌다.`;
    case '-activate':
      return `${extractName(parts[2])}의 ${formatBattleEffect(parts[3])} 효과가 발동했다!`;
    case '-fieldstart':
      return `${formatSideEffect(parts[2])}이(가) 전개되었다!`;
    case '-fieldend':
      return `${formatSideEffect(parts[2])}이(가) 사라졌다.`;
    case '-sidestart':
      return `${parts[2]} 쪽에 ${formatSideEffect(parts[3])} 효과가 펼쳐졌다!`;
    case '-sideend':
      return `${parts[2]} 쪽의 ${formatSideEffect(parts[3])} 효과가 사라졌다.`;
    case '-prepare':
      return `${extractName(parts[2])}은(는) ${translateMoveName(parts[3])}을(를) 준비하고 있다!`;
    case '-hitcount':
      return `${extractName(parts[2])}은(는) ${parts[3]}번 맞았다!`;
    case '-mustrecharge':
      return `${extractName(parts[2])}은(는) 반동으로 움직일 수 없다!`;
    case 'cant': {
      const name = extractName(parts[2]);
      const reason = parts[3];
      const reasonMessages = {
        par: `${name}은(는) 몸이 저려서 움직일 수 없다!`,
        frz: `${name}은(는) 얼어붙어서 움직일 수 없다!`,
        slp: `${name}은(는) 잠들어 있다.`,
        flinch: `${name}은(는) 풀이 죽어 움직일 수 없었다!`,
        trapped: `${name}은(는) 도망칠 수 없다!`,
        truant: `${name}은(는) 게으름 특성으로 움직이지 않았다!`,
        nopp: `${name}은(는) 그 기술의 PP가 없다!`,
      };
      if (reasonMessages[reason]) return reasonMessages[reason];
      const moveMatch = /^move:\s*(.+)$/.exec(reason || '');
      if (moveMatch) return `${name}은(는) ${translateMoveName(moveMatch[1])} 효과로 움직일 수 없었다!`;
      return `${name}은(는) 움직일 수 없었다!`;
    }
    case '-singleturn':
      return `${extractName(parts[2])}은(는) ${formatBattleEffect(parts[3])} 태세를 취했다!`;
    case 'switch':
      return `${extractName(parts[2])}, 등장!`;
    case 'faint':
      return `${extractName(parts[2])}은(는) 쓰러졌다!`;
    case 'turn':
      return `턴 ${parts[2]}`;
    case 'win':
      return `${parts[2]} 승리!`;
    default:
      if (command?.startsWith('-') && parts[2] && !['-anim', '-hint', '-message', '-nothing'].includes(command)) {
        return `${extractName(parts[2])}에게 변화가 일어났다. (${command.replace(/^-/, '')}${parts[3] ? `: ${formatBattleEffect(parts[3])}` : ''})`;
      }
      return null;
  }
};

// 배틀 로그에서 기술 사용 횟수를 파싱해 members DB에 누적
const recordMoveUsage = async (db, log, session) => {
  // p1/p2 선택된 포켓몬 uniqueId
  const p1Key = session.player1Entries?.[Number(session.player1Lead || 1) - 1]?.key
    || session.player1Entries?.[0]?.key;
  const p2Key = session.player2Entries?.[Number(session.player2Lead || 1) - 1]?.key
    || session.player2Entries?.[0]?.key;

  // 슬롯 → {memberId, pokemonKey} 매핑
  const slotMap = {
    p1a: { memberId: session.player1Id, key: p1Key },
    p2a: { memberId: session.player2Id, key: p2Key },
  };

  // 기술 사용 횟수 / 급소 횟수 집계
  // usage: { memberId: { pokemonKey: { moveId: count } } }
  // crits: { memberId: { pokemonKey: count } }  ← 이 배틀에서 맞힌 급소 수
  const usage = {};
  const crits = {}; // 급소를 "맞힌" 포켓몬 슬롯 기준
  const consumedItems = {};
  let lastMoveSlot = null; // 직전 move 라인의 슬롯 (급소는 공격자 기준)

  for (const line of log) {
    if (!line) continue;
    const parts = line.split('|');

    if (line.startsWith('|move|')) {
      const slotRaw = parts[2] || '';
      const slot = slotRaw.split(':')[0].trim().toLowerCase();
      const moveName = (parts[3] || '').trim();
      lastMoveSlot = slot;
      if (!moveName || moveName === 'Struggle') continue;
      const info = slotMap[slot];
      if (!info?.memberId || !info?.key) continue;
      const moveId = normalizeId(moveName);
      if (!usage[info.memberId]) usage[info.memberId] = {};
      if (!usage[info.memberId][info.key]) usage[info.memberId][info.key] = {};
      usage[info.memberId][info.key][moveId] = (usage[info.memberId][info.key][moveId] || 0) + 1;
    }

    if (line.startsWith('|-crit|') && lastMoveSlot) {
      // 급소는 공격자(lastMoveSlot) 기준으로 카운트
      const info = slotMap[lastMoveSlot];
      if (info?.memberId && info?.key) {
        if (!crits[info.memberId]) crits[info.memberId] = {};
        crits[info.memberId][info.key] = (crits[info.memberId][info.key] || 0) + 1;
      }
    }

    if (line.startsWith('|-enditem|') && parts.includes('[eat]')) {
      const slotRaw = parts[2] || '';
      const slot = slotRaw.split(':')[0].trim().toLowerCase();
      const itemName = (parts[3] || '').trim();
      const info = slotMap[slot];
      if (itemName && info?.memberId && info?.key) {
        if (!consumedItems[info.memberId]) consumedItems[info.memberId] = {};
        consumedItems[info.memberId][info.key] = itemName;
      }
    }
  }

  // 각 멤버의 caughtPokemon에서 해당 pokemon을 찾아 업데이트
  // transaction으로 읽고 쓴다: 같은 사람이 거의 동시에 교환/캠핑 등으로 caughtPokemon을
  // 건드리면 .set()만으로는 서로의 변경을 덮어쓸 수 있기 때문.
  const applyPokemonBattleUpdates = (pokemon, memberId) => {
    if (!pokemon) return pokemon;
    const key = pokemonKey(pokemon);
    let next = pokemon;

    if (usage[memberId]?.[key]) {
      const prev = next.moveUsage || {};
      const merged = { ...prev };
      for (const [mid, cnt] of Object.entries(usage[memberId][key])) {
        merged[mid] = (merged[mid] || 0) + cnt;
      }
      next = { ...next, moveUsage: merged };
    }

    if (crits[memberId]?.[key]) {
      next = { ...next, lastBattleCritCount: crits[memberId][key] };
    } else if (next.lastBattleCritCount !== undefined) {
      next = { ...next, lastBattleCritCount: 0 };
    }

    const consumedItem = consumedItems[memberId]?.[key];
    if (consumedItem) {
      const heldItemKeys = [
        next.heldItem,
        next.heldItemEn,
        next.item,
        next.itemEn,
      ].map(normalizeId).filter(Boolean);
      const consumedKey = normalizeId(consumedItem);
      if (!heldItemKeys.length || heldItemKeys.includes(consumedKey)) {
        next = {
          ...next,
          heldItem: null,
          heldItemEn: null,
          item: null,
          itemEn: null,
          lastBattleConsumedItem: consumedItem,
        };
      }
    }

    return next;
  };

  const memberIds = new Set([...Object.keys(usage), ...Object.keys(crits), ...Object.keys(consumedItems)]);
  await Promise.all([...memberIds].map(async (memberId) => {
    await Promise.all([
      db.ref(`members/${memberId}/caughtPokemon`).transaction((caught) => {
        if (caught === null || caught === undefined) return caught;
        // 중간에 삭제된 자리로 배열에 구멍이 있으면 Firebase가 caught를 배열이 아니라
        // 숫자 키 객체로 돌려준다. 두 형태 모두 정규화해서 처리하고, 쓸 때는 구멍을
        // undefined 대신 null로 채운 배열로 되돌린다 (undefined는 그대로 쓸 수 없어 실패한다).
        const list = normalizeCaughtPokemon(caught);
        return Array.from({ length: list.length }, (_, i) => applyPokemonBattleUpdates(list[i] ?? null, memberId));
      }),
      db.ref(`members/${memberId}/partnerPokemon`).transaction((partner) =>
        applyPokemonBattleUpdates(partner, memberId)
      ),
    ]);
  }));
};

const collectTurnMessages = (battle, fromIndex) => {
  const seen = new Set();
  const turnLog = battle.log.slice(fromIndex);
  const orderedLog = [];
  const displayNames = new Map();

  for (let index = 0; index < turnLog.length; index += 1) {
    const line = turnLog[index];
    const nextLine = turnLog[index + 1];
    if (
      line?.startsWith('|detailschange|') &&
      nextLine?.startsWith('|-mega|')
    ) {
      orderedLog.push(nextLine, line);
      index += 1;
      continue;
    }
    orderedLog.push(line);
  }

  return orderedLog
    .filter((line, index) => !shouldHideResolvedSolarBeamPrepare(orderedLog, index))
    .map((line) => {
      const message = protocolToMessage(applyDisplayNamesToLine(line, displayNames));

      if (line?.startsWith('|detailschange|') || line?.startsWith('|-formechange|')) {
        const parts = line.split('|');
        const slot = battleSlotKey(parts[2]);
        const nextName = formatBattleSpeciesName(parts[3]);
        if (slot && nextName) displayNames.set(slot, nextName);
      }

      return message;
    })
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
  const activeName = pokemon => {
    const speciesName = pokemon?.species?.name || pokemon?.species?.baseSpecies || '';
    const speciesLabel = /-Mega(?:-[XY])?$/i.test(speciesName)
      ? formatMegaSpeciesName(speciesName)
      : formatBattleSpeciesName(speciesName);
    const nickname = pokemon?.name || speciesLabel;
    return speciesLabel && normalizeDisplayName(nickname) !== normalizeDisplayName(speciesLabel)
      ? `${nickname} (${speciesLabel})`
      : nickname;
  };
  return [
    '',
    `${battle.p1.name}: ${activeName(p1)} HP ${formatHpPercent(p1.hp, p1.maxhp)}`,
    `${battle.p2.name}: ${activeName(p2)} HP ${formatHpPercent(p2.hp, p2.maxhp)}`,
  ].join('\n');
};

const formatMoveList = (battle) => {
  const p1 = battle.p1.active[0];
  const p2 = battle.p2.active[0];
  const sideMoves = (pokemon) => (pokemon?.moveSlots || [])
    .slice(0, 4)
    .map((moveSlot, index) => `${index + 1}. ${translateMoveName(moveSlot.id || moveSlot.move)}`)
    .join(', ');

  return [
    '',
    `${battle.p1.name} 기술: ${sideMoves(p1) || '없음'}`,
    `${battle.p2.name} 기술: ${sideMoves(p2) || '없음'}`,
  ].join('\n');
};

const hasFaintedThisTurn = (battle, fromIndex) =>
  battle.log.slice(fromIndex).some(line => line.startsWith('|faint|'));

const faintWinner = (battle, session) => {
  const p1 = battle.p1.active[0];
  const p2 = battle.p2.active[0];
  if (p1 && p1.hp <= 0 && (!p2 || p2.hp <= 0)) return '';
  if (p1 && p1.hp <= 0) return session.player2Name;
  if (p2 && p2.hp <= 0) return session.player1Name;
  return battle.winner || '';
};

const createBattle = (session) => {
  registerCustomBattleData();
  const { Battle } = getPokemonSim();
  const battle = new Battle({ formatid: FORMAT_ID, seed: session.seed });
  battle.setPlayer('p1', { name: session.player1Name || '1P', team: session.player1Team });
  battle.setPlayer('p2', { name: session.player2Name || '2P', team: session.player2Team });
  battle.choose('p1', `team ${Number(session.player1Lead || 1)}`);
  battle.choose('p2', `team ${Number(session.player2Lead || 1)}`);

  for (const turn of session.turns || []) {
    battle.choose('p1', turn.p1);
    battle.choose('p2', turn.p2);
  }

  return battle;
};

const formatHelp = () => [
  '배틀 명령어',
  '[배틀 신청] @상대',
  '[배틀 수락]',
  '[포켓몬 1] 또는 [엔트리 1]',
  '[기술 1] 또는 [화염자동차]',
  '[메가진화] [기술 1]',
  '[기권]',
].join('\n');

const accountMention = (account) => {
  const cleaned = String(account || '').trim().replace(/^@/, '');
  return cleaned ? `@${cleaned}` : '';
};

const battleMentions = (session) => Array.from(new Set([
  accountMention(session?.player1Account),
  accountMention(session?.player2Account),
].filter(Boolean))).join(' ');

const withBattleMentions = (session, message) => {
  const mentions = battleMentions(session);
  return mentions ? `${mentions}\n${message}` : message;
};

const timeoutResultForSession = (session) => {
  const pendingChoices = session?.pendingChoices || {};
  const p1Chose = Boolean(pendingChoices.p1);
  const p2Chose = Boolean(pendingChoices.p2);

  if (!p1Chose && !p2Chose) {
    return {
      winner: '',
      result: 'draw',
      message: '10분 동안 양쪽 모두 기술을 선택하지 않아 배틀이 무승부로 종료되었습니다.',
    };
  }

  if (!p1Chose) {
    return {
      winner: session.player2Name || '',
      loser: session.player1Name || '',
      result: 'timeout',
      message: `${session.player1Name || '1P'}이(가) 10분 동안 기술을 선택하지 않아 패배했습니다. ${session.player2Name || '2P'} 승리!`,
    };
  }

  return {
    winner: session.player1Name || '',
    loser: session.player2Name || '',
    result: 'timeout',
    message: `${session.player2Name || '2P'}이(가) 10분 동안 기술을 선택하지 않아 패배했습니다. ${session.player1Name || '1P'} 승리!`,
  };
};

const normalizeDisplayName = (value = '') => String(value || '').trim().toLowerCase().replace(/\s+/g, '');

const formatPokemonName = (pokemon) => {
  const species = pokemon?.name || pokemon?.species || pokemon?.nameEn || `No.${pokemon?.number || '?'}`;
  const nickname = String(pokemon?.nickname || '').trim();
  return nickname && normalizeDisplayName(nickname) !== normalizeDisplayName(species)
    ? `${nickname} (${species})`
    : species;
};

const formatEntryList = (label, pokemonList = []) => [
  `${label} 엔트리`,
  ...pokemonList.slice(0, 6).map((pokemon, index) => (
    // player1Entries/player2Entries의 pokemon.name은 세션 생성 시 이미 formatPokemonName으로
    // "닉네임 (종족명)" 형태로 만들어둔 값이라, 여기서 다시 formatPokemonName을 부르면
    // "닉네임 (닉네임 (종족명))"처럼 이중으로 감싸진다.
    `${index + 1}. ${pokemon.name || formatPokemonName(pokemon)} Lv.${pokemon.level || 50}`
  )),
].join('\n');

const resolveMoveChoice = (battle, side, content) => {
  const token = moveChoiceTokenFromText(content);
  if (!token) return null;

  const activePokemon = battle[side]?.active?.[0];
  const moveSlots = (activePokemon?.moveSlots || []).slice(0, 4);

  // 구멍파기/공중날기 2턴째처럼 trapped 상태면 서버 request의 moves가 원래 4개 기술 중
  // 단 하나로 줄어든다. 이때 제출할 "move N"은 moveSlots(원래 4개) 기준이 아니라
  // 이 축소된 요청 목록 안에서의 위치 기준이어야 한다 (안 그러면 choose()가 조용히 거부됨).
  const requestMoves = battle[side]?.activeRequest?.active?.[0]?.moves;
  const effectiveList = Array.isArray(requestMoves) && requestMoves.length ? requestMoves : moveSlots;

  // 발버둥(PP 소진)이나 하이퍼빔류 반동(recharge)은 서버가 moveSlots에도 없는 의사 기술
  // 하나만 요청 목록에 내려준다. 선택지가 하나뿐이면 이름이 안 맞아도 그걸로 확정한다 —
  // 실제로도 플레이어가 고를 여지가 없는 상태라, 이름 불일치로 거부하면 영영 진행 불가.
  if (effectiveList.length === 1) return 1;

  if (token.kind === 'index') {
    const targetSlot = moveSlots[token.value];
    if (!targetSlot) return null;
    if (effectiveList === moveSlots) return token.value + 1;
    const restrictedIndex = effectiveList.findIndex((move) => normalizeId(move.id || move.move) === normalizeId(targetSlot.id));
    return restrictedIndex >= 0 ? restrictedIndex + 1 : null;
  }

  const requested = normalizeId(token.value);
  const matchedIndex = effectiveList.findIndex((move) => {
    const candidates = [
      move.id,
      move.move,
      translateMoveName(move.id || move.move),
    ].map(normalizeId);
    return candidates.includes(requested);
  });

  return matchedIndex >= 0 ? matchedIndex + 1 : null;
};

const collectChoiceErrors = (battle, fromIndex = 0) => battle.log
  .slice(fromIndex)
  .filter(line => line.startsWith('|error|'))
  .map(line => line.split('|').slice(2).join('|').trim())
  .filter(Boolean);

const validateChoice = (session, side, choice) => {
  const battle = createBattle(session);
  const logFrom = battle.log.length;
  const accepted = battle.choose(side, choice);
  const errors = collectChoiceErrors(battle, logFrom);

  return {
    accepted: accepted !== false && errors.length === 0,
    errors,
  };
};

const formatChoiceError = (errors = []) => {
  const message = errors[0] || '선택을 처리할 수 없었어요.';
  if (/Can't mega evolve/i.test(message)) return '지금 선택한 포켓몬은 메가진화를 할 수 없어요.';
  if (/Can't move/i.test(message)) return '현재 포켓몬이 그 기술을 사용할 수 없어요.';
  if (/disabled/i.test(message)) return '그 기술은 지금 사용할 수 없는 상태예요.';
  if (/trapped|switch/i.test(message)) return '지금은 그 선택을 할 수 없어요.';
  return message.replace(/^\[Invalid choice\]\s*/i, '');
};

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
    const botUsername = localUsername(botAccount);
    const rawAccounts = extractMentionAccounts(status);
    // extractMentionAccounts는 멘션마다 acct/username/url/id를 모두 뽑기 때문에, 봇을
    // 유저네임으로 태그했어도 그 멘션의 숫자 id가 별도 후보로 섞여 들어온다.
    // localUsername만으로는 그 id를 걸러내지 못하므로, mentions에서 봇과 일치하는
    // 항목의 id도 함께 제외한다.
    const botMentionIds = new Set(
      (status?.mentions || [])
        .filter(m => localUsername(m?.acct || m?.username || '') === botUsername)
        .map(m => String(m?.id || ''))
        .filter(Boolean)
    );
    const accounts = rawAccounts
      .map(normalizeAccount)
      .filter(account =>
        localUsername(account) !== botUsername &&
        account !== author &&
        !botMentionIds.has(localUsername(account))
      );

    for (const account of accounts) {
      const match = findMemberByAccount(members, account);
      if (match) return { ...match, account };
    }
    console.warn('battleBot: tagged opponent not found', {
      statusId: status?.id || null,
      authorAccount,
      botAccount,
      rawAccounts,
      normalizedAccounts: accounts,
      memberCount: Object.keys(members || {}).length,
    });
    return null;
  };

  // gameData/battleSessions 전체(삭제 없이 계속 쌓이는 컬렉션)를 매번 통째로 읽는 대신,
  // functions/index.js의 syncBattleSessionIndex 트리거가 유지하는 회원별 포인터 색인
  // (gameData/memberBattleSessions/{memberId} - 그 회원이 참가한 세션만, 아주 작음)에서
  // 조건에 맞는 세션 키를 찾고, 실제로 필요한 세션 하나만 개별 조회한다.
  // markIgnoredBattleCandidate가 거의 모든 답글마다 findSessionByMember를 호출하는데,
  // 예전엔 이게 매번 전체 세션 컬렉션을 3번씩 읽어서(7/11 members 전체 버그와 동일한 구조로)
  // RTDB 다운로드를 불렸다(2026-07-23).
  // createChallenge가 회원당 열린 세션을 최대 1개로 유지하므로(forceCloseOpenSessions 참고)
  // 후보가 2개 이상 나오는 일은 정상 상황에선 없어야 하지만, 과거에 이미 꼬여 들어간 데이터나
  // 예외적인 경합을 대비해 replyToId(답글이 달린 스레드 = status.in_reply_to_id)가 주어지면
  // "가장 최근 갱신된 세션"이 아니라 실제 그 스레드(lastBotStatusId)와 일치하는 세션을 우선한다.
  // (2026-07-31 금붕어vs빈티나 / 빈티나vs브리 로그가 섞였던 사고 - 최신순으로만 골라서
  // 엉뚱한 배틀에 기술 선택이 적용됐다)
  const findMemberSessionPointer = async (memberId, matches, replyToId = null) => {
    const snapshot = await db.ref(`gameData/memberBattleSessions/${memberId}`).once('value');
    const pointers = snapshot.val() || {};
    const candidates = Object.entries(pointers)
      .filter(([, pointer]) => matches(pointer))
      .sort((a, b) => String(b[1].updatedAt || b[1].createdAt || '').localeCompare(String(a[1].updatedAt || a[1].createdAt || '')));
    if (!candidates.length) return null;

    if (replyToId && candidates.length > 1) {
      for (const [sessionKey] of candidates) {
        const sessionSnap = await db.ref(`gameData/battleSessions/${sessionKey}`).once('value');
        const session = sessionSnap.val();
        if (session?.lastBotStatusId === replyToId) return { sessionKey, session };
      }
    }

    const [sessionKey] = candidates[0];
    const sessionSnap = await db.ref(`gameData/battleSessions/${sessionKey}`).once('value');
    const session = sessionSnap.val();
    return session ? { sessionKey, session } : null;
  };

  const findPendingChallenge = (memberId, replyToId) => findMemberSessionPointer(
    memberId,
    (pointer) => pointer.status === 'pending' && pointer.role === 'player2',
    replyToId
  );

  const findSelectingBattle = (memberId, replyToId) => findMemberSessionPointer(
    memberId,
    (pointer) => pointer.status === 'selecting',
    replyToId
  );

  const findActiveBattle = (memberId, replyToId) => findMemberSessionPointer(
    memberId,
    (pointer) => pointer.status === 'active',
    replyToId
  );

  const findFinishedBattle = (memberId, replyToId) => findMemberSessionPointer(
    memberId,
    (pointer) => pointer.status === 'completed' || pointer.status === 'forfeited',
    replyToId
  );

  // 새 배틀 신청이 생성될 때 신청자/상대가 이미 열어둔 배틀(신청 대기·엔트리 선택·진행 중)을
  // 전부 강제 종료한다. 세션은 createChallenge에서만 새로 생기므로, 여기서 "회원당 열린
  // 세션은 최대 1개" 불변식을 지키면 다른 곳(수락/기술선택 등)에서 동시 배틀로 인한 세션
  // 혼선이 애초에 생기지 않는다. tradeBot.js의 교환 신청 시 기존 교환 전부 취소하는 것과
  // 동일한 패턴이다.
  const forceCloseOpenSessions = async (memberIds, now = Date.now()) => {
    const closed = [];
    const seen = new Set();
    for (const memberId of memberIds) {
      const snapshot = await db.ref(`gameData/memberBattleSessions/${memberId}`).once('value');
      const pointers = snapshot.val() || {};
      for (const [sessionKey, pointer] of Object.entries(pointers)) {
        if (seen.has(sessionKey)) continue;
        if (!['pending', 'selecting', 'active'].includes(pointer.status)) continue;
        seen.add(sessionKey);

        const completedAt = new Date(now).toISOString();
        const ref = db.ref(`gameData/battleSessions/${sessionKey}`);
        const result = await ref.transaction((current) => {
          if (!current) return current;
          if (!['pending', 'selecting', 'active'].includes(current.status)) return;
          return {
            ...current,
            status: 'cancelled',
            result: 'cancelled',
            pendingChoices: {},
            pendingTeamChoices: {},
            completedAt,
            updatedAt: completedAt,
          };
        });

        if (result.committed && result.snapshot.val()) {
          const session = result.snapshot.val();
          closed.push({
            sessionKey,
            session,
            message: withBattleMentions(session, '참가자 중 한 명이 다른 배틀을 새로 시작해서 이 배틀은 자동으로 종료되었습니다.'),
            lastBotStatusId: session.lastBotStatusId || null,
          });
        }
      }
    }
    return closed;
  };

  // gameData/openBattleSessions는 syncBattleSessionIndex 트리거가 status가 pending/active인
  // 세션만 담아두고 끝나면 자동으로 지우는 색인이라, 전체 이력이 아니라 "지금 열려있는 세션"만
  // 스캔하면 된다 - checkBattleMentions가 매분 이 함수들을 호출하므로 여기가 하루 1,440번
  // 반복되는 전체 컬렉션 스캔의 원인이었다(2026-07-23).
  const closeTimedOutBattles = async (now = Date.now()) => {
    const snapshot = await db.ref('gameData/openBattleSessions').once('value');
    const openSessions = snapshot.val() || {};
    const closed = [];

    for (const [sessionKey, meta] of Object.entries(openSessions)) {
      if (meta.status !== 'active') continue;
      const lastUpdated = Date.parse(meta.updatedAt || meta.startedAt || meta.createdAt || '');
      if (!Number.isFinite(lastUpdated) || now - lastUpdated < BATTLE_CHOICE_TIMEOUT_MS) continue;

      const sessionSnap = await db.ref(`gameData/battleSessions/${sessionKey}`).once('value');
      const session = sessionSnap.val();
      if (!session || session.status !== 'active') continue;

      const timeoutResult = timeoutResultForSession(session);
      const completedAt = new Date(now).toISOString();
      const updates = {
        status: 'completed',
        result: timeoutResult.result,
        winner: timeoutResult.winner || '',
        loser: timeoutResult.loser || '',
        pendingChoices: {},
        completedAt,
        timeoutAt: completedAt,
        updatedAt: completedAt,
      };

      const ref = db.ref(`gameData/battleSessions/${sessionKey}`);
      const result = await ref.transaction((current) => {
        if (current === null) return current;
        if (current.status !== 'active') return;
        const currentUpdated = Date.parse(current.updatedAt || current.startedAt || current.createdAt || '');
        if (!Number.isFinite(currentUpdated) || now - currentUpdated < BATTLE_CHOICE_TIMEOUT_MS) return;
        return { ...current, ...updates };
      });

      if (result.committed) {
        closed.push({
          sessionKey,
          session: { ...session, ...updates },
          message: withBattleMentions(session, timeoutResult.message),
          lastBotStatusId: session.lastBotStatusId || null,
        });
      }
    }

    return closed;
  };

  // 24시간 넘게 수락되지 않은 배틀 신청은 알림 없이 조용히 만료 처리한다.
  // (신청이 계속 쌓이기만 하고 정리가 안 되던 문제)
  const expireStalePendingChallenges = async (now = Date.now()) => {
    const snapshot = await db.ref('gameData/openBattleSessions').once('value');
    const openSessions = snapshot.val() || {};
    let expiredCount = 0;

    for (const [sessionKey, meta] of Object.entries(openSessions)) {
      if (meta.status !== 'pending') continue;
      const createdAt = Date.parse(meta.createdAt || '');
      if (!Number.isFinite(createdAt) || now - createdAt < BATTLE_PENDING_EXPIRATION_MS) continue;

      const ref = db.ref(`gameData/battleSessions/${sessionKey}`);
      const result = await ref.transaction((current) => {
        if (current === null) return current;
        if (current.status !== 'pending') return;
        const currentCreatedAt = Date.parse(current.createdAt || '');
        if (!Number.isFinite(currentCreatedAt) || now - currentCreatedAt < BATTLE_PENDING_EXPIRATION_MS) return;
        return { ...current, status: 'expired', expiredAt: new Date(now).toISOString(), updatedAt: new Date(now).toISOString() };
      });

      if (result.committed) expiredCount += 1;
    }

    return { count: expiredCount };
  };

  const createChallenge = async ({ status, members, author, authorAccount }) => {
    const opponent = findTaggedOpponent(members, status, authorAccount);
    if (!opponent) return '[배틀 신청] 뒤에 상대 계정을 함께 태그해 주세요.';
    if (opponent.id === author.id) return '자기 자신에게는 배틀을 신청할 수 없어요.';

    const player1Pokemon = getParticipantPokemon(author.member).slice(0, 6);
    const player2Pokemon = getParticipantPokemon(opponent.member).slice(0, 6);
    if (!player1Pokemon.length) return '신청자의 배틀 참가 포켓몬을 찾을 수 없어요.';
    if (!player2Pokemon.length) return '상대의 배틀 참가 포켓몬을 찾을 수 없어요.';

    const session = {
      id: `battle_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      status: 'pending',
      player1Id: author.id,
      player1Name: author.member.name || author.member.nickname || author.id,
      player1Account: normalizeAccount(authorAccount),
      player1Team: packTeam(pokemonData, player1Pokemon),
      player1Entries: player1Pokemon.map(pokemon => ({
        key: pokemonKey(pokemon),
        name: formatPokemonName(pokemon),
        nickname: (pokemon.nickname || '').trim() || null,
        species: pokemon.name || pokemon.species || '',
        level: pokemon.level || 50,
      })),
      player2Id: opponent.id,
      player2Name: opponent.member.name || opponent.member.nickname || opponent.id,
      player2Account: normalizeAccount(opponent.account || opponent.member.mastodonAccount || opponent.member.mastodonId || ''),
      player2Team: packTeam(pokemonData, player2Pokemon),
      player2Entries: player2Pokemon.map(pokemon => ({
        key: pokemonKey(pokemon),
        name: formatPokemonName(pokemon),
        nickname: (pokemon.nickname || '').trim() || null,
        species: pokemon.name || pokemon.species || '',
        level: pokemon.level || 50,
      })),
      pendingChoices: {},
      pendingTeamChoices: {},
      turns: [],
      // ⭐ 배틀은 매 턴마다 처음부터 재생(replay)되므로, 고정 시드가 없으면
      // 같은 턴 기록을 다시 재생할 때마다 데미지/명중 등 랜덤 결과가 달라진다.
      seed: getPokemonSim().PRNG.generateSeed(),
      mastodonStatusId: status.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // 신청자/상대 둘 중 누구라도 이미 열어둔 배틀이 있으면 새 배틀을 시작하기 전에
    // 강제 종료한다 (동시 배틀로 인한 세션 혼선 방지, forceCloseOpenSessions 참고).
    const closed = await forceCloseOpenSessions([author.id, opponent.id]);

    const ref = db.ref('gameData/battleSessions').push();
    await ref.set(session);
    const message = withBattleMentions(session, [
      `${session.player2Name}님에게 배틀을 신청했어요.`,
      '상대가 [배틀 수락]을 보내면 엔트리를 선택합니다.',
    ].join('\n'));
    return { message, closed };
  };

  const acceptChallenge = async ({ author, status }) => {
    const pending = await findPendingChallenge(author.id, status?.in_reply_to_id);
    if (!pending) return '수락할 배틀 신청이 없어요.';

    await db.ref(`gameData/battleSessions/${pending.sessionKey}`).update({
      status: 'selecting',
      pendingTeamChoices: {},
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return withBattleMentions(pending.session, [
      '배틀을 수락했습니다. 먼저 출전 포켓몬을 선택해 주세요.',
      formatEntryList(pending.session.player1Name, pending.session.player1Entries),
      formatEntryList(pending.session.player2Name, pending.session.player2Entries),
      '[포켓몬 1] 또는 [엔트리 1] 형식으로 선택할 수 있습니다.',
    ].join('\n'));
  };

  const selectPokemon = async ({ author, content, status }) => {
    const selecting = await findSelectingBattle(author.id, status?.in_reply_to_id);
    // 포켓몬 선택 단계가 아니면 기술 이름으로 재시도 (예: [리프스톰])
    if (!selecting) return chooseMove({ author, content, status });

    const { sessionKey, session } = selecting;
    const side = session.player1Id === author.id ? 'p1' : 'p2';
    const entries = side === 'p1' ? session.player1Entries : session.player2Entries;
    const token = teamChoiceFromText(content);
    const selectedSlot = resolveTeamChoice(token, entries);

    if (!selectedSlot || selectedSlot < 1 || selectedSlot > entries.length) {
      return `선택할 수 있는 번호나 이름을 찾지 못했어요. [포켓몬 1] 또는 [피카츄]처럼 입력해 주세요.\n${formatEntryList(side === 'p1' ? session.player1Name : session.player2Name, entries)}`;
    }

    // chooseMove와 동일한 이유로, 두 선수가 거의 동시에 엔트리를 고르면 .update()는
    // 한쪽 선택을 지울 수 있다. transaction으로 원자적으로 병합한다.
    const sessionRef = db.ref(`gameData/battleSessions/${sessionKey}`);
    const txResult = await sessionRef.transaction((current) => {
      if (!current || current.status !== 'selecting') return current;
      return {
        ...current,
        pendingTeamChoices: { ...(current.pendingTeamChoices || {}), [side]: selectedSlot },
        updatedAt: new Date().toISOString(),
      };
    });

    if (!txResult.committed || txResult.snapshot.val()?.status !== 'selecting') {
      return '지금은 엔트리를 선택할 수 없는 상태예요.';
    }

    const pendingTeamChoices = txResult.snapshot.val().pendingTeamChoices || {};
    if (!pendingTeamChoices.p1 || !pendingTeamChoices.p2) {
      return null;
    }

    const updatedSession = {
      ...session,
      player1Lead: pendingTeamChoices.p1,
      player2Lead: pendingTeamChoices.p2,
    };
    const battle = createBattle(updatedSession);

    await db.ref(`gameData/battleSessions/${sessionKey}`).update({
      status: 'active',
      player1Lead: pendingTeamChoices.p1,
      player2Lead: pendingTeamChoices.p2,
      pendingTeamChoices: {},
      updatedAt: new Date().toISOString(),
    });

    return withBattleMentions(updatedSession, [
      '배틀 시작!',
      `${session.player1Name}: ${session.player1Entries[pendingTeamChoices.p1 - 1]?.name}`,
      `${session.player2Name}: ${session.player2Entries[pendingTeamChoices.p2 - 1]?.name}`,
      activeSummary(battle),
      '[기술 1] 또는 [기술명]으로 기술을 선택해 주세요.',
    ].filter(Boolean).join('\n'));
  };

  const declineChallenge = async ({ author, status }) => {
    const pending = await findPendingChallenge(author.id, status?.in_reply_to_id);
    if (!pending) return '거절할 배틀 신청이 없어요.';
    await db.ref(`gameData/battleSessions/${pending.sessionKey}`).update({
      status: 'declined',
      updatedAt: new Date().toISOString(),
    });
    return withBattleMentions(pending.session, '배틀 신청을 거절했어요.');
  };

  const forfeit = async ({ author, status }) => {
    const active = await findActiveBattle(author.id, status?.in_reply_to_id) || await findSelectingBattle(author.id, status?.in_reply_to_id);
    if (!active) return '진행 중인 배틀이 없어요.';
    const winner = active.session.player1Id === author.id ? active.session.player2Name : active.session.player1Name;
    await db.ref(`gameData/battleSessions/${active.sessionKey}`).update({
      status: 'forfeited',
      winner,
      updatedAt: new Date().toISOString(),
    });
    return withBattleMentions(active.session, `${winner} 승리! 상대가 기권했습니다.`);
  };

  const endByHp = async ({ author, status }) => {
    const active = await findActiveBattle(author.id, status?.in_reply_to_id);
    if (!active) return '진행 중인 배틀이 없어요.';
    const { sessionKey, session } = active;

    const loser = author.id === session.player1Id ? session.player1Name : session.player2Name;
    const winner = author.id === session.player1Id ? session.player2Name : session.player1Name;

    const battle = createBattle(session);
    await db.ref(`gameData/battleSessions/${sessionKey}`).update({
      status: 'completed',
      winner,
      completedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    await recordMoveUsage(db, battle.log, session);

    return withBattleMentions(session, `${loser}이(가) 먼저 종료를 선언했습니다. ${winner} 승리!`);
  };

  const chooseMove = async ({ author, content, status }) => {
    const active = await findActiveBattle(author.id, status?.in_reply_to_id);
    if (!active) {
      const finished = await findFinishedBattle(author.id, status?.in_reply_to_id);
      if (finished) {
        const winner = finished.session.winner ? ` ${finished.session.winner} 승리!` : '';
        return withBattleMentions(finished.session, `배틀이 이미 종료되었습니다.${winner}`);
      }
      return '진행 중인 배틀이 없어요. [배틀 신청]으로 먼저 시작해 주세요.';
    }

    const { sessionKey, session } = active;
    const side = session.player1Id === author.id ? 'p1' : 'p2';
    const battleForChoice = createBattle(session);
    const moveNumber = resolveMoveChoice(battleForChoice, side, content);
    if (!moveNumber) {
      return [
        '현재 포켓몬이 가진 기술과 매치되는 입력을 찾지 못했어요.',
        '[기술 1] 또는 [화염자동차]처럼 입력해 주세요.',
      ].join('\n');
    }

    const choice = `move ${moveNumber}${wantsMega(content) ? ' mega' : ''}`;
    const validation = validateChoice(session, side, choice);
    if (!validation.accepted) {
      return formatChoiceError(validation.errors);
    }

    // 두 선수가 거의 동시에 기술을 선택하면 .update()로는 서로의 선택을 덮어쓸 수 있다
    // (read 이후 두 요청이 동시에 진행되면 나중에 쓰는 쪽이 상대 선택을 지워버림).
    // transaction으로 원자적으로 병합해야 양쪽 선택이 모두 안전하게 남는다.
    const sessionRef = db.ref(`gameData/battleSessions/${sessionKey}`);
    const txResult = await sessionRef.transaction((current) => {
      if (!current || current.status !== 'active') return current;
      return {
        ...current,
        pendingChoices: { ...(current.pendingChoices || {}), [side]: choice },
        updatedAt: new Date().toISOString(),
      };
    });

    if (!txResult.committed || txResult.snapshot.val()?.status !== 'active') {
      return '지금은 기술을 선택할 수 없는 상태예요.';
    }

    const pendingChoices = txResult.snapshot.val().pendingChoices || {};
    if (!pendingChoices.p1 || !pendingChoices.p2) {
      return null;
    }

    const battle = createBattle(session);
    const logFrom = battle.log.length;
    const p1Accepted = battle.choose('p1', pendingChoices.p1);
    const p1Errors = collectChoiceErrors(battle, logFrom);
    const p2LogFrom = battle.log.length;
    const p2Accepted = battle.choose('p2', pendingChoices.p2);
    const p2Errors = collectChoiceErrors(battle, p2LogFrom);
    const turnErrors = [...p1Errors, ...p2Errors];

    if (p1Accepted === false || p2Accepted === false || turnErrors.length) {
      await db.ref(`gameData/battleSessions/${sessionKey}`).update({
        pendingChoices: {},
        updatedAt: new Date().toISOString(),
      });
      return withBattleMentions(session, [
        '선택을 처리하지 못했어요.',
        formatChoiceError(turnErrors),
        '이번 턴 선택은 저장하지 않았습니다. 다시 기술을 선택해 주세요.',
      ].join('\n'));
    }

    const messages = collectTurnMessages(battle, logFrom);
    const nextTurns = [
      ...(session.turns || []),
      { p1: pendingChoices.p1, p2: pendingChoices.p2, createdAt: new Date().toISOString() },
    ];

    const endedByFaint = hasFaintedThisTurn(battle, logFrom);
    const updates = {
      turns: nextTurns,
      pendingChoices: {},
      updatedAt: new Date().toISOString(),
    };

    if (battle.ended || endedByFaint) {
      updates.status = 'completed';
      updates.winner = faintWinner(battle, session);
      updates.completedAt = new Date().toISOString();
    }

    await db.ref(`gameData/battleSessions/${sessionKey}`).update(updates);

    // 기술 사용 횟수 기록 (배틀 전체 로그 파싱)
    await recordMoveUsage(db, battle.log, session);

    return withBattleMentions(session, [
      '결과',
      ...messages,
      activeSummary(battle),
      updates.status === 'completed'
        ? `배틀 종료!${updates.winner ? ` ${updates.winner} 승리!` : ''}`
        : '다음 기술을 선택해 주세요.',
    ].filter(Boolean).join('\n'));
  };

  const handle = async ({ status, content, command, members, author, authorAccount }) => {
    let result;
    if (command === 'help') {
      result = formatHelp();
    } else if (command === 'challenge') {
      result = await createChallenge({ status, members, author, authorAccount });
    } else if (command === 'accept') {
      result = await acceptChallenge({ author, status });
    } else if (command === 'selectPokemon') {
      result = await selectPokemon({ author, content, status });
    } else if (command === 'decline') {
      result = await declineChallenge({ author, status });
    } else if (command === 'forfeit') {
      result = await forfeit({ author, status });
    } else if (command === 'endByHp') {
      result = await endByHp({ author, status });
    } else if (command === 'move') {
      // 엔트리 닉네임이 실제 기술명과 같으면(예: "플래시") getBattleCommand가 기술 선택으로
      // 오인식한다. selecting 단계에서는 기술 선택이 성립할 수 없으니, 그 단계라면
      // 엔트리 선택으로 취급한다. (2026-07-27 선/비비 배틀이 "이미 종료됨"으로 잘못 뜨던 버그)
      // 단, selecting 상태는 openBattleSessions 색인/타임아웃 대상이 아니라서 한쪽이
      // 엔트리를 끝내 안 고르면 영원히 남는다. active 배틀이 이미 있으면 이 방치된 selecting
      // 세션을 무시하고 항상 진짜 진행 중인 배틀의 기술 선택으로 처리한다. (2026-07-28 방치된
      // selecting 세션이 다른 active 배틀의 기술 입력까지 엔트리 선택으로 가로채던 버그)
      const active = await findActiveBattle(author.id, status?.in_reply_to_id);
      const selecting = active ? null : await findSelectingBattle(author.id, status?.in_reply_to_id);
      result = selecting
        ? await selectPokemon({ author, content, status })
        : await chooseMove({ author, content, status });
    } else {
      result = formatHelp();
    }

    // createChallenge는 강제 종료된 다른 배틀에 대한 알림({message, closed})을 함께 반환한다.
    // 그 외 커맨드는 문자열(또는 아직 양쪽 다 선택 안 한 턴처럼 응답 없음을 뜻하는 null)을
    // 반환하므로, 호출부(index.js)가 한 가지 형태만 다루도록 여기서 통일한다.
    if (result === null || result === undefined) return null;
    if (typeof result === 'object') return result;
    return { message: result, closed: [] };
  };

  const findSessionByMember = async (memberId, replyToId) => {
    const active = await findActiveBattle(memberId, replyToId);
    if (active) return active;
    const selecting = await findSelectingBattle(memberId, replyToId);
    if (selecting) return selecting;
    const pending = await findPendingChallenge(memberId, replyToId);
    return pending || null;
  };

  return {
    getCommand: getBattleCommand,
    handle,
    findSessionByMember,
    closeTimedOutBattles,
    expireStalePendingChallenges,
  };
};

module.exports = {
  createBattleBot,
};
