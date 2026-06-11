const REGIONAL_FORM_LABELS = {
  alola: '\uC54C\uB85C\uB77C',
  galar: '\uAC00\uB77C\uB974',
  hisui: '\uD788\uC2A4\uC774',
  paldea: '\uD314\uB370\uC544',
};

const FORM_VARIANT_LABELS = {
  'dudunsparce-two-segment': '\uB450 \uB9C8\uB514\uD3FC',
  'dudunsparce-three-segment': '\uC138 \uB9C8\uB514\uD3FC',
  'maushold-family-of-three': '\uC138 \uC2DD\uAD6C',
  'maushold-family-of-four': '\uB124 \uC2DD\uAD6C',
  'tatsugiri-curly': '\uB9D0\uB9B0\uBAA8\uC2B5',
  'tatsugiri-droopy': '\uB298\uC5B4\uC9C4\uBAA8\uC2B5',
  'tatsugiri-stretchy': '\uD3BC\uCE5C\uBAA8\uC2B5',
  'sinistcha-unremarkable': '\uBC94\uC791\uD3FC',
  'sinistcha-masterpiece': '\uACE0\uAC78\uD3FC',
  'poltchageist-counterfeit': '\uBC94\uC791\uD3FC',
  'poltchageist-artisan': '\uACE0\uAC78\uD3FC',
  'polteageist-phony': '\uAC00\uC9DC\uD3FC',
  'polteageist-antique': '\uC9C4\uD488\uD3FC',
  'sinistea-phony': '\uAC00\uC9DC\uD3FC',
  'sinistea-antique': '\uC9C4\uD488\uD3FC',
};

const FORM_SUFFIX_LABELS = [
  ['family-of-three', '\uC138 \uC2DD\uAD6C'],
  ['family-of-four', '\uB124 \uC2DD\uAD6C'],
  ['two-segment', '\uB450 \uB9C8\uB514\uD3FC'],
  ['three-segment', '\uC138 \uB9C8\uB514\uD3FC'],
  ['female', '\uC554\uCEF7'],
  ['male', '\uC218\uCEF7'],
  ['starter', '\uC2A4\uD0C0\uD305\uD3FC'],
  ['droopy', '\uB298\uC5B4\uC9C4\uBAA8\uC2B5'],
  ['stretchy', '\uD3BC\uCE5C\uBAA8\uC2B5'],
  ['curly', '\uB9D0\uB9B0\uBAA8\uC2B5'],
];

function getFormVariantLabel(pokemon = {}) {
  const variant = `${pokemon.formVariant || pokemon.nameEn || pokemon.species || ''}`.toLowerCase();
  if (!variant) return '';
  if (FORM_VARIANT_LABELS[variant]) return FORM_VARIANT_LABELS[variant];

  const matched = FORM_SUFFIX_LABELS.find(([suffix]) => (
    variant === suffix || variant.endsWith(`-${suffix}`)
  ));

  return matched?.[1] || '';
}

export function getPokemonDisplayParts(pokemon = {}) {
  const rawName = pokemon.name || pokemon.nickname || pokemon.nameEn || '';
  const parenthesized = rawName.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
  const variantSource = `${pokemon.regionalForm || ''} ${pokemon.formVariant || ''} ${pokemon.nameEn || ''}`.toLowerCase();
  const regionKey = Object.keys(REGIONAL_FORM_LABELS).find(region => (
    pokemon.regionalForm?.toLowerCase() === region ||
    variantSource.includes(`-${region}`) ||
    variantSource.includes(` ${region}`)
  ));

  if (regionKey) {
    return {
      name: parenthesized?.[1]?.trim() || pokemon.baseSpecies || rawName,
      formLabel: REGIONAL_FORM_LABELS[regionKey],
    };
  }

  const formVariantLabel = getFormVariantLabel(pokemon);
  if (formVariantLabel) {
    return {
      name: parenthesized?.[1]?.trim() || pokemon.baseSpecies || rawName,
      formLabel: formVariantLabel,
    };
  }

  if (parenthesized) {
    return {
      name: parenthesized[1].trim(),
      formLabel: parenthesized[2].trim(),
    };
  }

  return {
    name: rawName,
    formLabel: '',
  };
}
