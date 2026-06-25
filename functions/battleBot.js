const FORMAT_ID = 'gen9customgame';
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
Object.entries(customBattleData.aliases?.items || {}).forEach(([key, value]) => {
  itemIdMap.set(normalizeId(key), value);
});
(Array.isArray(itemsData) ? itemsData : itemsData.items || []).forEach((item) => {
  [item.id, item.nameEn, item.name].forEach((key) => {
    const normalized = normalizeId(key);
    if (normalized) itemIdMap.set(normalized, item.nameEn || item.id);
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

const wantsMega = (content) => /\[?\s*메가\s*진화\s*\]?|\[?\s*메가진화\s*\]?/i.test(content);

const moveChoiceTokenFromText = (content) => {
  const text = stripCommandText(content)
    .replace(/\[?\s*메가\s*진화\s*\]?/gi, '')
    .replace(/\[?\s*메가진화\s*\]?/gi, '')
    .trim();

  const moveNumber = text.match(/\[?\s*기술\s*([1-4])\s*\]?/i);
  if (moveNumber) return { kind: 'index', value: Number(moveNumber[1]) - 1 };

  const bracket = extractBracketText(text);
  if (!bracket) return null;
  const bracketMoveNumber = bracket.match(/^기술\s*([1-4])$/i);
  if (bracketMoveNumber) return { kind: 'index', value: Number(bracketMoveNumber[1]) - 1 };

  const cleaned = bracket.replace(/^기술\s*/i, '').trim();
  if (!cleaned) return null;
  return { kind: 'name', value: cleaned };
};

const teamChoiceFromText = (content) => {
  const text = extractBracketText(content);
  const match = text.match(/^(?:포켓몬|엔트리|선택)\s*([1-6])$/i) || text.match(/^([1-6])번?$/);
  if (match) return { type: 'index', value: Number(match[1]) };
  if (text && !/^(캠핑|계속|만족|교환|배틀|기권)/i.test(text)) return { type: 'name', value: text };
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
  const stripped = stripCommandText(content).replace(/\[?\s*메가\s*진화\s*\]?/gi, '').trim();
  if (/\[?\s*기술\s*[1-4]\s*\]?/i.test(stripped)) return true;
  const bracket = extractBracketText(stripped);
  if (!bracket) return false;
  return /^기술\s+\S/i.test(bracket); // [기술 리프스톰] 형태만
};

const isBattleMoveLikeText = (content) => {
  const text = extractBracketText(content);
  if (!text) return false;
  if (/^(캠핑|계속|만족|교환|배틀\s*(신청|수락|거절|도움말|help)|기권)/i.test(text)) return false;
  if (/^(포켓몬|엔트리|선택)\s*[1-6]$/i.test(text)) return false;
  return isExplicitMoveText(content);
};

const getBattleCommand = (content) => {
  if (/\[?\s*배틀\s*신청\s*\]?/i.test(content)) return 'challenge';
  if (/\[?\s*배틀\s*수락\s*\]?/i.test(content)) return 'accept';
  if (/\[?\s*배틀\s*거절\s*\]?/i.test(content)) return 'decline';
  if (/\[?\s*배틀\s*종료\s*\]?/i.test(content)) return 'endByHp';
  if (/\[?\s*기권\s*\]?/i.test(content)) return 'forfeit';
  if (/\[?\s*배틀\s*(?:도움말|help)\s*\]?/i.test(content)) return 'help';
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
    evs: pokemon.evs || {},
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
  const cleaned = String(effect || '').replace(/^move:\s*/i, '');
  return translateMoveName(cleaned);
};

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

const formatHp = value => String(value || '').replace(' fnt', ' 기절');

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
      return `${extractName(parts[2])}에게 피해! HP ${formatHp(parts[3])}`;
    case '-heal':
      return `${extractName(parts[2])}의 HP가 회복되었다! HP ${formatHp(parts[3])}`;
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
      return `${extractName(parts[2])}의 ${parts[3]}!`;
    case '-enditem':
      return `${extractName(parts[2])}의 ${parts[3]}은(는) 사라졌다.`;
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
      return `${extractName(parts[2])}의 ${parts[3]} 효과가 발동했다!`;
    case '-fieldstart':
      return `${parts[2]}이(가) 전개되었다!`;
    case '-fieldend':
      return `${parts[2]}이(가) 사라졌다.`;
    case '-sidestart':
      return `${parts[2]} 쪽에 ${parts[3]} 효과가 펼쳐졌다!`;
    case '-sideend':
      return `${parts[2]} 쪽의 ${parts[3]} 효과가 사라졌다.`;
    case '-prepare':
      return `${extractName(parts[2])}은(는) ${translateMoveName(parts[3])}을(를) 준비하고 있다!`;
    case '-hitcount':
      return `${extractName(parts[2])}은(는) ${parts[3]}번 맞았다!`;
    case '-mustrecharge':
      return `${extractName(parts[2])}은(는) 반동으로 움직일 수 없다!`;
    case '-singleturn':
      return `${extractName(parts[2])}은(는) ${parts[3]} 태세를 취했다!`;
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
  const p1Key = session.player1Entries?.[session.pendingTeamChoices?.p1 - 1]?.key
    || session.player1Entries?.[0]?.key;
  const p2Key = session.player2Entries?.[session.pendingTeamChoices?.p2 - 1]?.key
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
  }

  // 각 멤버의 caughtPokemon에서 해당 pokemon을 찾아 업데이트
  const memberIds = new Set([...Object.keys(usage), ...Object.keys(crits)]);
  await Promise.all([...memberIds].map(async (memberId) => {
    const snap = await db.ref(`members/${memberId}/caughtPokemon`).once('value');
    const caught = snap.val();
    if (!Array.isArray(caught)) return;

    const updated = caught.map(p => {
      const key = pokemonKey(p);
      let next = p;

      if (usage[memberId]?.[key]) {
        const prev = next.moveUsage || {};
        const merged = { ...prev };
        for (const [mid, cnt] of Object.entries(usage[memberId][key])) {
          merged[mid] = (merged[mid] || 0) + cnt;
        }
        next = { ...next, moveUsage: merged };
      }

      if (crits[memberId]?.[key]) {
        // 이 배틀에서의 급소 횟수만 저장 (누적 아님 — 진화 조건이 "한 배틀에서" 이므로)
        next = { ...next, lastBattleCritCount: crits[memberId][key] };
      } else if (next.lastBattleCritCount !== undefined) {
        // 배틀마다 초기화
        next = { ...next, lastBattleCritCount: 0 };
      }

      return next;
    });

    await db.ref(`members/${memberId}/caughtPokemon`).set(updated);
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
    `${battle.p1.name}: ${activeName(p1)} HP ${p1.hp}/${p1.maxhp}`,
    `${battle.p2.name}: ${activeName(p2)} HP ${p2.hp}/${p2.maxhp}`,
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
  const battle = new Battle({ formatid: FORMAT_ID });
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
    `${index + 1}. ${formatPokemonName(pokemon)} Lv.${pokemon.level || 50}`
  )),
].join('\n');

const resolveMoveChoice = (battle, side, content) => {
  const token = moveChoiceTokenFromText(content);
  if (!token) return null;

  const activePokemon = battle[side]?.active?.[0];
  const moveSlots = (activePokemon?.moveSlots || []).slice(0, 4);

  if (token.kind === 'index') {
    if (!moveSlots[token.value]) return null;
    return token.value + 1;
  }

  const requested = normalizeId(token.value);
  const matchedIndex = moveSlots.findIndex((moveSlot) => {
    const candidates = [
      moveSlot.id,
      moveSlot.move,
      translateMoveName(moveSlot.id || moveSlot.move),
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
    const accounts = extractMentionAccounts(status)
      .map(normalizeAccount)
      .filter(account => localUsername(account) !== botAccount && account !== author);

    for (const account of accounts) {
      const match = findMemberByAccount(members, account);
      if (match) return { ...match, account };
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

  const findSelectingBattle = async (memberId) => {
    const snapshot = await db.ref('gameData/battleSessions').once('value');
    const sessions = snapshot.val() || {};
    const selecting = Object.entries(sessions)
      .filter(([, session]) =>
        session.status === 'selecting' &&
        (session.player1Id === memberId || session.player2Id === memberId)
      )
      .sort((a, b) => String(b[1].updatedAt || b[1].createdAt || '').localeCompare(String(a[1].updatedAt || a[1].createdAt || '')));
    if (!selecting.length) return null;
    return { sessionKey: selecting[0][0], session: selecting[0][1] };
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
      mastodonStatusId: status.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const ref = db.ref('gameData/battleSessions').push();
    await ref.set(session);
    return withBattleMentions(session, [
      `${session.player2Name}님에게 배틀을 신청했어요.`,
      '상대가 [배틀 수락]을 보내면 엔트리를 선택합니다.',
    ].join('\n'));
  };

  const acceptChallenge = async ({ author }) => {
    const pending = await findPendingChallenge(author.id);
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

  const selectPokemon = async ({ author, content }) => {
    const selecting = await findSelectingBattle(author.id);
    // 포켓몬 선택 단계가 아니면 기술 이름으로 재시도 (예: [리프스톰])
    if (!selecting) return chooseMove({ author, content });

    const { sessionKey, session } = selecting;
    const side = session.player1Id === author.id ? 'p1' : 'p2';
    const entries = side === 'p1' ? session.player1Entries : session.player2Entries;
    const token = teamChoiceFromText(content);
    const selectedSlot = resolveTeamChoice(token, entries);

    if (!selectedSlot || selectedSlot < 1 || selectedSlot > entries.length) {
      return `선택할 수 있는 번호나 이름을 찾지 못했어요. [포켓몬 1] 또는 [피카츄]처럼 입력해 주세요.\n${formatEntryList(side === 'p1' ? session.player1Name : session.player2Name, entries)}`;
    }

    const pendingTeamChoices = {
      ...(session.pendingTeamChoices || {}),
      [side]: selectedSlot,
    };

    if (!pendingTeamChoices.p1 || !pendingTeamChoices.p2) {
      await db.ref(`gameData/battleSessions/${sessionKey}`).update({
        pendingTeamChoices,
        updatedAt: new Date().toISOString(),
      });
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

  const declineChallenge = async ({ author }) => {
    const pending = await findPendingChallenge(author.id);
    if (!pending) return '거절할 배틀 신청이 없어요.';
    await db.ref(`gameData/battleSessions/${pending.sessionKey}`).update({
      status: 'declined',
      updatedAt: new Date().toISOString(),
    });
    return withBattleMentions(pending.session, '배틀 신청을 거절했어요.');
  };

  const forfeit = async ({ author }) => {
    const active = await findActiveBattle(author.id) || await findSelectingBattle(author.id);
    if (!active) return '진행 중인 배틀이 없어요.';
    const winner = active.session.player1Id === author.id ? active.session.player2Name : active.session.player1Name;
    await db.ref(`gameData/battleSessions/${active.sessionKey}`).update({
      status: 'forfeited',
      winner,
      updatedAt: new Date().toISOString(),
    });
    return withBattleMentions(active.session, `${winner} 승리! 상대가 기권했습니다.`);
  };

  const endByHp = async ({ author }) => {
    const active = await findActiveBattle(author.id);
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

  const chooseMove = async ({ author, content }) => {
    const active = await findActiveBattle(author.id);
    if (!active) return '진행 중인 배틀이 없어요. [배틀 신청]으로 먼저 시작해 주세요.';

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

    const pendingChoices = {
      ...(session.pendingChoices || {}),
      [side]: choice,
    };

    if (!pendingChoices.p1 || !pendingChoices.p2) {
      await db.ref(`gameData/battleSessions/${sessionKey}`).update({
        pendingChoices,
        updatedAt: new Date().toISOString(),
      });
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
    if (command === 'help') return formatHelp();
    if (command === 'challenge') return createChallenge({ status, members, author, authorAccount });
    if (command === 'accept') return acceptChallenge({ author });
    if (command === 'selectPokemon') return selectPokemon({ author, content });
    if (command === 'decline') return declineChallenge({ author });
    if (command === 'forfeit') return forfeit({ author });
    if (command === 'endByHp') return endByHp({ author });
    if (command === 'move') return chooseMove({ author, content });
    return formatHelp();
  };

  const findSessionByMember = async (memberId) => {
    const active = await findActiveBattle(memberId);
    if (active) return active;
    const selecting = await findSelectingBattle(memberId);
    if (selecting) return selecting;
    const pending = await findPendingChallenge(memberId);
    return pending || null;
  };

  return {
    getCommand: getBattleCommand,
    handle,
    findSessionByMember,
  };
};

module.exports = {
  createBattleBot,
};
