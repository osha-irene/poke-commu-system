// 암수 아이콘이 별도로 존재하는 포켓몬 (기본명 기준)
const GENDER_ICON_SET = new Set(['MEOWSTIC', 'INDEEDEE', 'BASCULEGION']);

const FORM_ICON_ALIASES = {
  'PUMPKABOO-AVERAGE': 'PUMPKABOO',
  'PUMPKABOO-SMALL': 'PUMPKABOO',
  'PUMPKABOO-LARGE': 'PUMPKABOO',
  'PUMPKABOO-SUPER': 'PUMPKABOO',
  'GOURGEIST-AVERAGE': 'GOURGEIST',
  'GOURGEIST-SMALL': 'GOURGEIST',
  'GOURGEIST-LARGE': 'GOURGEIST',
  'GOURGEIST-SUPER': 'GOURGEIST',
  'ROTOM': 'ROTOM',
  'ROTOM-HEAT': 'ROTOM-HEAT',
  'ROTOM-WASH': 'ROTOM-WASH',
  'ROTOM-FROST': 'ROTOM-FROST',
  'ROTOM-FAN': 'ROTOM-FAN',
  'ROTOM-MOW': 'ROTOM-MOW',
  'PORYGON-Z': 'PORYGONZ',
  'NIDORAN-F': 'NIDORANfE',
  'NIDORAN-M': 'NIDORANmA',
  'JANGMO-O': 'JANGMOO',
  'HAKAMO-O': 'HAKAMOO',
  'KOMMO-O': 'KOMMOO',
  'HO-OH': 'HOOH',
  'MIME-JR': 'MIMEJR',
  'TYPE-NULL': 'TYPENULL',
};

const REGIONAL_ICON_SUFFIXES = {
  alola: 'ALOLA',
  galar: 'GALAR',
  hisui: 'HISUI',
  paldea: 'PALDEA',
};

const normalizeIconName = value => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[.'?]/g, '')
  .replace(/\s+/g, '-')
  .toUpperCase();

export function toPokemonIconFileName(pokemon = {}, options = {}) {
  const rawName = pokemon.formVariant || pokemon.nameEn || pokemon.nameEnglish || pokemon.speciesNameEn || pokemon.species || pokemon.name || '';
  if (!rawName) return '';

  const canonicalName = normalizeIconName(rawName);

  const aliasName = FORM_ICON_ALIASES[canonicalName];
  if (options.aliasesOnly && !aliasName) return '';

  let baseName = aliasName || canonicalName;

  const regionalForm = String(pokemon.regionalForm || '').toLowerCase();
  const regionalSuffix = REGIONAL_ICON_SUFFIXES[regionalForm];
  if (regionalSuffix && !baseName.includes(`-${regionalSuffix}`)) {
    baseName = `${baseName}-${regionalSuffix}`;
  }

  // 암수 아이콘이 따로 있는 포켓몬은 성별 suffix 추가
  if (GENDER_ICON_SET.has(baseName)) {
    const gender = pokemon.gender;
    if (gender === 'female') return `${baseName}-FEMALE`;
    if (gender === 'male')   return `${baseName}-MALE`;
  }

  return baseName;
}

export function getPokemonLocalIconUrl(pokemon = {}, options = {}) {
  const basePath = typeof window !== 'undefined' && window.location.pathname.includes('/poke-commu-system')
    ? '/poke-commu-system'
    : '';

  // 마휘핑: 진화 시 고른 맛(alcremieFlavor)이 있으면 맛별 전용 아이콘(ALCREMIE-{맛}.png)을 쓴다
  if (pokemon.alcremieFlavor) {
    return `${basePath}/img/icons/ALCREMIE-${pokemon.alcremieFlavor.toUpperCase()}.png`;
  }

  const fileName = toPokemonIconFileName(pokemon, options);
  if (!fileName) return '';

  return `${basePath}/img/icons/${fileName}.png`;
}
