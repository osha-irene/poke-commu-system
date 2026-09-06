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
  // 돌핀맨은 폼(제로/히어로) 구분 없이 기본 아이콘(PALAFIN.png) 하나만 쓴다.
  'PALAFIN-HERO': 'PALAFIN',
  'PALAFIN-ZERO': 'PALAFIN',
  // 팔데아 켄타로스는 formVariant가 PokeAPI 이름 그대로("...-BREED"가 붙은 형태)라
  // 다른 지역폼(WOOPER-PALDEA 등)과 다르게 그대로 두면 파일명이 지저분해진다.
  // "-BREED"를 뗀 짧은 이름으로 통일한다.
  'TAUROS-PALDEA-AQUA-BREED': 'TAUROS-PALDEA-AQUA',
  'TAUROS-PALDEA-BLAZE-BREED': 'TAUROS-PALDEA-BLAZE',
  'TAUROS-PALDEA-COMBAT-BREED': 'TAUROS-PALDEA-COMBAT',
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

  // 암수 아이콘이 따로 있는 포켓몬은 성별 suffix 추가.
  // 냐오닉스/엘풍/배쓰나이처럼 formVariant가 "meowstic-male"같이 성별 접미사를 이미
  // 달고 오는 경우가 있어(템플릿 기본값이 수컷), 그대로 두면 암컷 개체도 -MALE 아이콘이
  // 나온다. 접미사를 떼어낸 기준명으로 GENDER_ICON_SET을 확인하고, 실제 개체 성별로
  // 다시 붙인다.
  const genderSuffixMatch = baseName.match(/-(MALE|FEMALE)$/);
  const genderBaseName = genderSuffixMatch
    ? baseName.slice(0, -genderSuffixMatch[0].length)
    : baseName;
  if (GENDER_ICON_SET.has(genderBaseName)) {
    const gender = String(pokemon.gender || '').toLowerCase();
    if (gender === 'female') return `${genderBaseName}-FEMALE`;
    if (gender === 'male')   return `${genderBaseName}-MALE`;
    // 개체 성별 정보가 없으면: 이름에 이미 성별이 박혀 있으면 그걸 쓰고, 없으면 수컷 아이콘
    return genderSuffixMatch ? baseName : `${genderBaseName}-MALE`;
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
