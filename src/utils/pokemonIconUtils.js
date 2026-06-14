const FORM_ICON_ALIASES = {
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

export function toPokemonIconFileName(pokemon = {}, options = {}) {
  const rawName = pokemon.nameEn || pokemon.nameEnglish || pokemon.speciesNameEn || pokemon.formVariant || pokemon.species || pokemon.name || '';
  if (!rawName) return '';

  const canonicalName = rawName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[.'?]/g, '')
    .replace(/\s+/g, '-')
    .toUpperCase();

  const aliasName = FORM_ICON_ALIASES[canonicalName];
  if (options.aliasesOnly && !aliasName) return '';

  return aliasName || canonicalName;
}

export function getPokemonLocalIconUrl(pokemon = {}, options = {}) {
  const fileName = toPokemonIconFileName(pokemon, options);
  if (!fileName) return '';

  const basePath = typeof window !== 'undefined' && window.location.pathname.includes('/poke-commu-system')
    ? '/poke-commu-system'
    : '';

  return `${basePath}/img/icons/${fileName}.png`;
}
