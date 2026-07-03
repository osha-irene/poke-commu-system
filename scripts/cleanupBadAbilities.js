let admin;
try {
  admin = require('firebase-admin');
} catch (_) {
  admin = require('../functions/node_modules/firebase-admin');
}
const abilitiesData = require('../src/data/abilities.json');
const allPokemonData = require('../src/data/allPokemon.json');

const args = new Set(process.argv.slice(2));
const apply = args.has('--apply');
const getArgValue = (name) => {
  const prefix = `${name}=`;
  const found = process.argv.slice(2).find((arg) => arg.startsWith(prefix));
  return found ? found.slice(prefix.length) : null;
};
const inputPath = getArgValue('--input');
const updatesOutputPath = getArgValue('--updates-output');
const databaseURL =
  process.env.FIREBASE_DATABASE_URL ||
  process.env.REACT_APP_FIREBASE_DATABASE_URL ||
  'https://poke-commu-system-default-rtdb.firebaseio.com';

const normalizeKey = (value) => String(value || '')
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9가-힣]/g, '');

const normalizeEn = (value) => String(value || '')
  .trim()
  .toLowerCase()
  .replace(/[\s_]+/g, '-');

const abilityKoByEn = new Map();
const abilityEnByKo = new Map();
const pokemonByKey = new Map();
const pokemonList = Array.isArray(allPokemonData)
  ? allPokemonData
  : allPokemonData.pokemon || [];

const addPokemonKey = (key, pokemon) => {
  const normalized = normalizeKey(key);
  if (normalized && !pokemonByKey.has(normalized)) pokemonByKey.set(normalized, pokemon);
};

const addAbilityPair = (ko, en) => {
  if (!ko || !en) return;
  const enKey = normalizeEn(en);
  abilityKoByEn.set(enKey, ko);
  abilityEnByKo.set(normalizeKey(ko), enKey);
};

for (const ability of abilitiesData.abilities || []) {
  addAbilityPair(ability.name, ability.nameEn);
}

for (const pokemon of pokemonList) {
  const abilitiesEn = Array.isArray(pokemon.abilitiesEn) ? pokemon.abilitiesEn : [];
  abilitiesEn.forEach((abilityEn) => {
    const ko = abilityKoByEn.get(normalizeEn(abilityEn));
    if (ko) addAbilityPair(ko, abilityEn);
  });
  if (pokemon.hiddenAbilityEn) {
    const ko = abilityKoByEn.get(normalizeEn(pokemon.hiddenAbilityEn));
    if (ko) addAbilityPair(ko, pokemon.hiddenAbilityEn);
  }

  addPokemonKey(pokemon.id, pokemon);
  addPokemonKey(pokemon.name, pokemon);
  addPokemonKey(pokemon.nameKo, pokemon);
  addPokemonKey(pokemon.nameEn, pokemon);
  addPokemonKey(pokemon.species, pokemon);
  addPokemonKey(pokemon.number, pokemon);
  addPokemonKey(pokemon.originalNumber, pokemon);
  addPokemonKey(pokemon.displayNumber, pokemon);
}

const getPokemonTemplate = (pokemon) => {
  const keys = [
    pokemon.originalNumber,
    pokemon.displayNumber,
    pokemon.number,
    pokemon.pokedexNumber,
    pokemon.species,
    pokemon.nameKo,
    pokemon.name,
    pokemon.nameEn,
  ];

  for (const key of keys) {
    const found = pokemonByKey.get(normalizeKey(key));
    if (found) return found;
  }
  return null;
};

const getTemplateAbilityKo = (template, abilityEn) => {
  if (!template || !abilityEn) return null;
  const enKey = normalizeEn(abilityEn);
  const abilitiesEn = Array.isArray(template.abilitiesEn) ? template.abilitiesEn : [];
  const index = abilitiesEn.findIndex((item) => normalizeEn(item) === enKey);
  if (index !== -1) return abilityKoByEn.get(enKey) || null;
  if (normalizeEn(template.hiddenAbilityEn) === enKey) return abilityKoByEn.get(enKey) || null;
  return null;
};

const getTemplateAbilityEn = (template, abilityKo) => {
  if (!template || !abilityKo) return null;
  const koKey = normalizeKey(abilityKo);
  const abilitiesEn = Array.isArray(template.abilitiesEn) ? template.abilitiesEn : [];
  for (const abilityEn of abilitiesEn) {
    const enKey = normalizeEn(abilityEn);
    const ko = abilityKoByEn.get(enKey);
    if (normalizeKey(ko) === koKey) return enKey;
  }
  const hiddenEn = normalizeEn(template.hiddenAbilityEn);
  const hiddenKo = abilityKoByEn.get(hiddenEn);
  if (hiddenEn && normalizeKey(hiddenKo) === koKey) {
    return hiddenEn;
  }
  return null;
};

const resolveAbilityPatch = (pokemon) => {
  if (!pokemon || typeof pokemon !== 'object') return null;

  const template = getPokemonTemplate(pokemon);
  const currentAbility = String(pokemon.ability || '').trim();
  const currentAbilityEn = String(pokemon.abilityEn || pokemon.abilityName || '').trim();
  let nextAbilityEn = currentAbilityEn ? normalizeEn(currentAbilityEn) : '';
  let nextAbility = '';

  if (nextAbilityEn) {
    nextAbility = getTemplateAbilityKo(template, nextAbilityEn) || abilityKoByEn.get(nextAbilityEn) || '';
  } else if (currentAbility) {
    nextAbilityEn = getTemplateAbilityEn(template, currentAbility) || abilityEnByKo.get(normalizeKey(currentAbility)) || '';
    if (!nextAbilityEn && /^[a-z0-9\s_-]+$/i.test(currentAbility)) {
      nextAbilityEn = normalizeEn(currentAbility);
    }
    if (nextAbilityEn) {
      nextAbility = getTemplateAbilityKo(template, nextAbilityEn) || abilityKoByEn.get(nextAbilityEn) || currentAbility;
    }
  }

  if (!nextAbilityEn || !nextAbility) return null;

  const patch = {};
  if (currentAbility !== nextAbility) patch.ability = nextAbility;
  if (normalizeEn(currentAbilityEn) !== nextAbilityEn) patch.abilityEn = nextAbilityEn;

  if (template?.hiddenAbilityEn) {
    const nextHidden = normalizeEn(template.hiddenAbilityEn) === nextAbilityEn;
    if (Boolean(pokemon.isHiddenAbility) !== nextHidden) patch.isHiddenAbility = nextHidden;
  }

  return Object.keys(patch).length ? patch : null;
};

if (!inputPath && !admin.apps.length) {
  admin.initializeApp({ databaseURL });
}

const db = inputPath ? null : admin.database();

(async () => {
  const members = inputPath
    ? require(require('path').resolve(inputPath))
    : (await db.ref('members').once('value')).val() || {};
  const updates = {};
  const changes = [];

  for (const [memberId, member] of Object.entries(members)) {
    const caughtPokemon = member?.caughtPokemon || [];
    for (const [index, pokemon] of Object.entries(caughtPokemon)) {
      const patch = resolveAbilityPatch(pokemon);
      if (!patch) continue;

      for (const [field, value] of Object.entries(patch)) {
        updates[`members/${memberId}/caughtPokemon/${index}/${field}`] = value;
      }

      changes.push({
        memberId,
        memberName: member?.name || memberId,
        index,
        pokemon: pokemon?.nickname || pokemon?.name || pokemon?.nameKo || pokemon?.nameEn || '(unknown)',
        before: {
          ability: pokemon?.ability || null,
          abilityEn: pokemon?.abilityEn || null,
          isHiddenAbility: pokemon?.isHiddenAbility ?? null,
        },
        after: patch,
      });
    }
  }

  console.log(`Found ${changes.length} ability cleanup target(s).`);
  for (const change of changes.slice(0, 80)) {
    console.log(`${change.memberName} / ${change.pokemon} #${change.index}:`, change.before, '=>', change.after);
  }
  if (changes.length > 80) console.log(`...and ${changes.length - 80} more`);

  if (!apply) {
    if (updatesOutputPath) {
      require('fs').writeFileSync(updatesOutputPath, JSON.stringify(updates, null, 2));
      console.log(`Wrote dry-run update payload to ${updatesOutputPath}`);
    }
    console.log('Dry run only. Re-run with --apply to update Firebase.');
    return;
  }

  if (changes.length === 0) return;
  if (inputPath) {
    if (!updatesOutputPath) {
      throw new Error('--apply with --input requires --updates-output=<path>');
    }
    require('fs').writeFileSync(updatesOutputPath, JSON.stringify(updates, null, 2));
    console.log(`Wrote update payload to ${updatesOutputPath}`);
    return;
  }
  await db.ref().update(updates);
  console.log(`Applied ${Object.keys(updates).length} field update(s) for ${changes.length} Pokemon.`);
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
