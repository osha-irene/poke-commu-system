import allPokemonData from '../data/allPokemon.json';
import movesData from '../data/moves.json';
import abilitiesData from '../data/abilities.json';

export const speciesOptions = allPokemonData.map((p) => p.name).filter(Boolean);
export const moveOptions = movesData.moves.map((m) => m.name).filter(Boolean);
export const abilityOptions = abilitiesData.abilities.map((a) => a.name).filter(Boolean);
