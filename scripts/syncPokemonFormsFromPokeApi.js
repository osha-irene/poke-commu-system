const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const SRC_ALL_POKEMON = path.join(ROOT_DIR, 'src', 'data', 'allPokemon.json');
const FUNCTION_ALL_POKEMON = path.join(ROOT_DIR, 'functions', 'data', 'allPokemon.json');
const FUNCTION_POKEMON = path.join(ROOT_DIR, 'functions', 'data', 'pokemon.json');
const ABILITIES_FILE = path.join(ROOT_DIR, 'src', 'data', 'abilities.json');
const CACHE_DIR = path.join(ROOT_DIR, '.cache', 'pokeapi');
const API_BASE = 'https://pokeapi.co/api/v2';

const TYPE_KO = {
  normal: '노말',
  fire: '불꽃',
  water: '물',
  electric: '전기',
  grass: '풀',
  ice: '얼음',
  fighting: '격투',
  poison: '독',
  ground: '땅',
  flying: '비행',
  psychic: '에스퍼',
  bug: '벌레',
  rock: '바위',
  ghost: '고스트',
  dragon: '드래곤',
  dark: '악',
  steel: '강철',
  fairy: '페어리',
};

const EGG_GROUP_KO = {
  monster: '괴수',
  water1: '수중1',
  water2: '수중2',
  water3: '수중3',
  bug: '벌레',
  flying: '비행',
  field: '육상',
  fairy: '요정',
  grass: '식물',
  'human-like': '인간형',
  mineral: '광물',
  amorphous: '부정형',
  indeterminate: '부정형',
  ditto: '메타몽',
  dragon: '드래곤',
  undiscovered: '미발견',
  'no-eggs': '알미발견',
};

const REGION_SUFFIXES = ['alola', 'galar', 'hisui', 'paldea'];

const FORM_SUFFIX_KO = {
  sunny: '태양의 모습',
  rainy: '빗방울의 모습',
  snowy: '설운의 모습',
  attack: '어택폼',
  defense: '디펜스폼',
  speed: '스피드폼',
  sandy: '모래땅도롱',
  trash: '슈레도롱',
  sunshine: '포지폼',
  heat: '히트',
  wash: '워시',
  frost: '프로스트',
  fan: '스핀',
  mow: '커트',
  origin: '오리진폼',
  sky: '스카이폼',
  zen: '달마모드',
  standard: '노말모드',
  therian: '영물폼',
  incarnate: '화신폼',
  black: '블랙',
  white: '화이트',
  resolute: '각오의 모습',
  pirouette: '스텝폼',
  blade: '블레이드폼',
  shield: '실드폼',
  active: '액티브모드',
  unbound: '굴레를 벗어난 모습',
  baile: '이글이글스타일',
  'pom-pom': '파칙파칙스타일',
  pau: '훌라훌라스타일',
  sensu: '하늘하늘스타일',
  school: '군집의 모습',
  noice: '나이스페이스',
  hangry: '배고픈 모양',
  crowned: '검왕/방패왕',
  ice: '아이스',
  shadow: '섀도',
  hero: '마이티폼',
  terastal: '테라스탈폼',
  stellar: '스텔라폼',
};

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeJson(file, data) {
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function slugFromUrl(url) {
  return url.replace(/\/$/, '').split('/').pop();
}

function cacheFileFor(url) {
  const pathname = new URL(url).pathname.replace(/^\/api\/v2\//, '').replace(/\/$/, '');
  return path.join(CACHE_DIR, `${pathname.replace(/[\\/]/g, '__')}.json`);
}

async function fetchJson(url) {
  ensureDir(CACHE_DIR);
  const cacheFile = cacheFileFor(url);
  if (fs.existsSync(cacheFile)) {
    return readJson(cacheFile);
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}: ${url}`);
  }

  const data = await response.json();
  writeJson(cacheFile, data);
  return data;
}

async function fetchResource(resource, nameOrId) {
  return fetchJson(`${API_BASE}/${resource}/${nameOrId}`);
}

function firstByLanguage(entries = [], language) {
  return entries.find(entry => entry.language?.name === language)?.name || null;
}

function statValue(pokemon, statName) {
  return pokemon.stats.find(stat => stat.stat.name === statName)?.base_stat || 0;
}

function generationNumber(species) {
  const id = Number(slugFromUrl(species.generation.url));
  return Number.isFinite(id) ? id : null;
}

function genderRatio(species) {
  if (species.gender_rate === -1) {
    return { male: 0, female: 0 };
  }
  return {
    male: ((8 - species.gender_rate) / 8) * 100,
    female: (species.gender_rate / 8) * 100,
  };
}

function normalizeFormName(name) {
  return String(name || '').toLowerCase();
}

function isRegionalForm(name) {
  return REGION_SUFFIXES.some(region => normalizeFormName(name).includes(`-${region}`));
}

function regionalForm(name) {
  return REGION_SUFFIXES.find(region => normalizeFormName(name).includes(`-${region}`)) || null;
}

function buildAbilityMap() {
  if (!fs.existsSync(ABILITIES_FILE)) return new Map();
  const data = readJson(ABILITIES_FILE);
  const abilities = Array.isArray(data) ? data : data.abilities || [];
  return new Map(abilities.map(ability => [ability.nameEn, ability.name]));
}

function koreanAbilityName(nameEn, abilityMap) {
  return abilityMap.get(nameEn) || nameEn;
}

function spriteFromPokemon(pokemon, form) {
  return (
    form?.sprites?.front_default ||
    pokemon.sprites?.other?.['official-artwork']?.front_default ||
    pokemon.sprites?.front_default ||
    null
  );
}

function shinySpriteFromPokemon(pokemon, form) {
  return (
    form?.sprites?.front_shiny ||
    pokemon.sprites?.other?.['official-artwork']?.front_shiny ||
    pokemon.sprites?.front_shiny ||
    null
  );
}

function isUsefulKoreanName(name) {
  return Boolean(name && !name.includes('?') && !/^[a-z0-9 -]+$/i.test(name));
}

function fallbackFormSuffix(formName, speciesName) {
  const suffix = normalizeFormName(formName)
    .replace(new RegExp(`^${speciesName}-?`), '')
    .split('-')
    .filter(Boolean);
  if (!suffix.length) return '';
  return suffix.map(part => FORM_SUFFIX_KO[part] || part).join(' ');
}

function isTotemFormName(name) {
  return normalizeFormName(name).split('-').includes('totem');
}

function combineSpeciesAndFormName(speciesKo, formKo, pokemonName, speciesName) {
  if (!formKo) return null;
  if (!speciesKo || pokemonName === speciesName || formKo.includes(speciesKo)) return formKo;
  return `${speciesKo} (${formKo})`;
}

function pokemonDisplayName({ existing, species, pokemon, form }) {
  const speciesKo = firstByLanguage(species.names, 'ko') || firstByLanguage(species.names, 'ko-Hrkt');
  const formKo = firstByLanguage(form?.names, 'ko') || firstByLanguage(form?.form_names, 'ko');
  if (pokemon.name === species.name && speciesKo) return speciesKo;
  if (formKo) return combineSpeciesAndFormName(speciesKo, formKo, pokemon.name, species.name);
  if (isUsefulKoreanName(existing?.name)) return existing.name;

  const suffix = fallbackFormSuffix(form?.name || pokemon.name, species.name);
  return suffix && speciesKo ? `${speciesKo} ${suffix}` : (speciesKo || pokemon.name);
}

function cloneBaseTemplate(data, species, pokemon) {
  const speciesName = species.name;
  return (
    data.find(item => item.nameEn === pokemon.name) ||
    data.find(item => item.nameEn === speciesName) ||
    data.find(item => item.species === speciesName) ||
    data.find(item => item.number === species.id || item.originalNumber === species.id) ||
    {}
  );
}

async function pokemonFromForm(form) {
  const pokemonUrl = form.pokemon?.url;
  if (!pokemonUrl) return null;
  return fetchJson(pokemonUrl);
}

async function formsForPokemon(pokemon) {
  const forms = [];
  for (const formRef of pokemon.forms || []) {
    try {
      forms.push(await fetchJson(formRef.url));
    } catch (error) {
      console.warn(`  ! form fetch failed: ${formRef.name} (${error.message})`);
    }
  }
  return forms;
}

function mergePokemonEntry({ baseTemplate, existing, species, pokemon, form, abilityMap, forceFormName = null }) {
  const types = (form?.types?.length ? form.types : pokemon.types)
    .slice()
    .sort((a, b) => a.slot - b.slot)
    .map(entry => entry.type.name);
  const normalAbilities = pokemon.abilities
    .filter(entry => !entry.is_hidden)
    .sort((a, b) => a.slot - b.slot);
  const hiddenAbility = pokemon.abilities.find(entry => entry.is_hidden);
  const imageUrl = spriteFromPokemon(pokemon, form) || existing?.imageUrl || baseTemplate.imageUrl || null;
  const shinySprite = shinySpriteFromPokemon(pokemon, form) || existing?.shinySprite || baseTemplate.shinySprite || null;
  const pokemonName = forceFormName || form?.pokemon?.name || pokemon.name;
  const hasSeparatePokemon = pokemon.name === pokemonName;

  const entry = {
    ...baseTemplate,
    ...existing,
    id: hasSeparatePokemon ? pokemon.id : `pokemon-form-${form.id}`,
    number: hasSeparatePokemon ? pokemon.id : `pokemon-form-${form.id}`,
    originalNumber: species.id,
    displayNumber: species.id,
    name: pokemonDisplayName({ existing, species, pokemon, form }),
    nameEn: pokemonName,
    species: pokemonName,
    type: TYPE_KO[types[0]] || types[0] || null,
    type2: types[1] ? (TYPE_KO[types[1]] || types[1]) : null,
    catchRate: (species.capture_rate / 255).toFixed(2),
    baseHp: statValue(pokemon, 'hp'),
    baseAttack: statValue(pokemon, 'attack'),
    baseDefense: statValue(pokemon, 'defense'),
    baseSpAttack: statValue(pokemon, 'special-attack'),
    baseSpDefense: statValue(pokemon, 'special-defense'),
    baseSpeed: statValue(pokemon, 'speed'),
    generation: generationNumber(species),
    imageUrl,
    shinySprite,
    isShiny: false,
    genderRatio: genderRatio(species),
    height: pokemon.height,
    weight: pokemon.weight,
    abilities: normalAbilities.map(entry => koreanAbilityName(entry.ability.name, abilityMap)),
    abilitiesEn: normalAbilities.map(entry => entry.ability.name),
    hiddenAbility: hiddenAbility ? koreanAbilityName(hiddenAbility.ability.name, abilityMap) : null,
    hiddenAbilityEn: hiddenAbility?.ability.name || null,
    eggGroups: species.egg_groups.map(group => EGG_GROUP_KO[group.name] || group.name),
    eggGroupsEn: species.egg_groups.map(group => group.name),
    hatchSteps: species.hatch_counter * 255,
    iconUrl: imageUrl,
    spriteUrl: imageUrl,
    isRegionalForm: isRegionalForm(pokemonName),
    regionalForm: regionalForm(pokemonName),
  };

  if (pokemonName !== species.name || entry.isRegionalForm) {
    entry.formVariant = pokemonName;
    entry.baseSpecies = firstByLanguage(species.names, 'ko') || baseTemplate.baseSpecies || baseTemplate.name || species.name;
    entry.baseSpeciesEn = species.name;
  } else {
    delete entry.formVariant;
    delete entry.baseSpecies;
    delete entry.baseSpeciesEn;
  }

  return entry;
}

function upsertByName(data, entry) {
  const index = data.findIndex(item => (
    item.nameEn === entry.nameEn ||
    item.formVariant === entry.nameEn ||
    (item.id === entry.id && item.nameEn === entry.nameEn)
  ));

  if (index >= 0) {
    data[index] = entry;
    return 'updated';
  }

  data.push(entry);
  return 'added';
}

async function syncSpecies(data, speciesName, abilityMap) {
  const species = await resolveSpecies(speciesName);
  const pokemonNames = new Set(species.varieties
    .map(variety => variety.pokemon.name)
    .filter(name => !isTotemFormName(name)));
  const pokemonByName = new Map();
  const formNames = new Set();
  const formsByName = new Map();

  for (const name of pokemonNames) {
    const pokemon = await fetchResource('pokemon', name);
    pokemonByName.set(name, pokemon);
    for (const form of await formsForPokemon(pokemon)) {
      if (isTotemFormName(form.name)) continue;
      formNames.add(form.name);
      formsByName.set(form.name, form);
    }
  }

  for (const formName of formNames) {
    if (isTotemFormName(formName)) continue;
    if (!pokemonNames.has(formName)) {
      const form = formsByName.get(formName);
      const formPokemon = await pokemonFromForm(form);
      if (formPokemon && !isTotemFormName(formPokemon.name)) {
        pokemonNames.add(formPokemon.name);
        pokemonByName.set(formPokemon.name, formPokemon);
      }
    }
  }

  let added = 0;
  let updated = 0;
  for (const name of pokemonNames) {
    const pokemon = pokemonByName.get(name) || await fetchResource('pokemon', name);
    const matchingForm = formsByName.get(name) || (await formsForPokemon(pokemon))[0] || null;
    const existing = data.find(item => item.nameEn === name || item.formVariant === name);
    const baseTemplate = cloneBaseTemplate(data, species, pokemon);
    const entry = mergePokemonEntry({ baseTemplate, existing, species, pokemon, form: matchingForm, abilityMap });
    const result = upsertByName(data, entry);
    if (result === 'added') added += 1;
    else updated += 1;
  }

  return { speciesName: species.name, varieties: pokemonNames.size, added, updated };
}

async function resolveSpecies(name) {
  try {
    return await fetchResource('pokemon-species', name);
  } catch (speciesError) {
    const pokemon = await fetchResource('pokemon', name);
    return fetchJson(pokemon.species.url);
  }
}

async function syncExistingPokemonForms(data, abilityMap) {
  const formNames = Array.from(new Set(data
    .filter(item => item.formVariant || item.nameEn?.includes('-'))
    .map(item => item.formVariant || item.nameEn)
    .filter(Boolean)
    .filter(name => !isTotemFormName(name))));

  let added = 0;
  let updated = 0;
  let skipped = 0;

  for (const name of formNames) {
    try {
      const form = await fetchResource('pokemon-form', name);
      const pokemon = await pokemonFromForm(form);
      if (!pokemon) {
        skipped += 1;
        continue;
      }
      const species = await fetchJson(pokemon.species.url);
      const existing = data.find(item => item.nameEn === name || item.formVariant === name);
      const baseTemplate = cloneBaseTemplate(data, species, pokemon);
      const entry = mergePokemonEntry({
        baseTemplate,
        existing,
        species,
        pokemon,
        form,
        abilityMap,
        forceFormName: form.name,
      });
      const result = upsertByName(data, entry);
      if (result === 'added') added += 1;
      else updated += 1;
    } catch (error) {
      skipped += 1;
    }
  }

  return { added, updated, skipped, total: formNames.length };
}

function speciesTargetsFromData(data) {
  return Array.from(new Set(data
    .filter(item => item.formVariant || item.baseSpeciesEn || item.regionalForm || item.isRegionalForm)
    .map(item => item.baseSpeciesEn || item.nameEn)
    .filter(Boolean)
    .map(name => normalizeFormName(name).replace(/-(alola|galar|hisui|paldea)$/, ''))));
}

function removeStaleGeneratedForms(data) {
  const staleIndexes = [];
  data.forEach((item, index) => {
    const staleGeneratedId = String(item.id || '').startsWith('form-') || String(item.number || '').startsWith('form-');
    const brokenText = String(item.name || '').includes('?') || String(item.type || '').includes('?') || String(item.type2 || '').includes('?');
    const totemForm = [item.nameEn, item.species, item.formVariant].some(isTotemFormName);
    if ((staleGeneratedId && brokenText) || totemForm) {
      staleIndexes.push(index);
    }
  });

  for (let index = staleIndexes.length - 1; index >= 0; index -= 1) {
    data.splice(staleIndexes[index], 1);
  }

  return staleIndexes.length;
}

async function main() {
  const data = readJson(SRC_ALL_POKEMON);
  const abilityMap = buildAbilityMap();
  const targets = speciesTargetsFromData(data);

  console.log(`PokeAPI form sync: ${targets.length} species targets`);
  const results = [];
  for (let index = 0; index < targets.length; index += 1) {
    const speciesName = targets[index];
    try {
      const result = await syncSpecies(data, speciesName, abilityMap);
      results.push(result);
      console.log(`[${index + 1}/${targets.length}] ${speciesName}: ${result.varieties} forms, +${result.added}/~${result.updated}`);
    } catch (error) {
      console.warn(`[${index + 1}/${targets.length}] ${speciesName}: skipped (${error.message})`);
    }
  }

  const formResult = await syncExistingPokemonForms(data, abilityMap);
  console.log(`Pokemon-form pass: ${formResult.total} checked, +${formResult.added}/~${formResult.updated}, ${formResult.skipped} skipped`);
  const removedStale = removeStaleGeneratedForms(data);
  console.log(`Removed ${removedStale} stale generated form entries`);

  data.sort((a, b) => {
    const aNumber = Number(a.displayNumber || a.originalNumber || a.number || 999999);
    const bNumber = Number(b.displayNumber || b.originalNumber || b.number || 999999);
    if (aNumber !== bNumber) return aNumber - bNumber;
    return String(a.nameEn || a.name).localeCompare(String(b.nameEn || b.name));
  });

  writeJson(SRC_ALL_POKEMON, data);
  if (fs.existsSync(path.dirname(FUNCTION_ALL_POKEMON))) writeJson(FUNCTION_ALL_POKEMON, data);
  if (fs.existsSync(FUNCTION_POKEMON)) writeJson(FUNCTION_POKEMON, data);

  const added = results.reduce((sum, result) => sum + result.added, 0) + formResult.added;
  const updated = results.reduce((sum, result) => sum + result.updated, 0) + formResult.updated;
  console.log(`Done. Added ${added}, updated ${updated}.`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
