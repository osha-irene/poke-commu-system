import evolutionsData from '../data/evolutions.json';
import { getLearnsetTmMoves, getPokemonLearnset } from './pokemonLearnsets';
import { getEVItemEffect, isEVItem } from './evItemUtils';

export const normalizeItemNameForUse = (name) => (
  String(name || '')
    .toLowerCase()
    .replace(/[\s-_]/g, '')
    .replace(/stone/g, '')
    .replace(/돌/g, '')
);

export const resolveItemData = (allItems = [], item = {}) => {
  const items = Array.isArray(allItems) ? allItems : (allItems.items || []);
  return items.find(candidate => (
    candidate.id === item.itemId ||
    candidate.id === item.id ||
    candidate.name === item.name ||
    candidate.nameEn === item.nameEn ||
    candidate.nameEn === item.name ||
    candidate.id === item.name
  ));
};

export const isRareCandyItem = (item = {}, itemData = null) => {
  const names = [
    item.name,
    item.nameEn,
    item.id,
    item.itemId,
    itemData?.name,
    itemData?.nameEn,
    itemData?.id
  ].map(value => String(value || '').toLowerCase().replace(/[\s-_]/g, ''));

  return names.includes('이상한사탕') || names.includes('rarecandy');
};

const getPokemonNumbers = (pokemon = {}) => [
  pokemon.number,
  pokemon.originalNumber,
  pokemon.pokemonId,
  pokemon.nationalNo
].map(value => Number(value)).filter(Number.isFinite);

export const findItemEvolution = (pokemon, item, itemData = null) => {
  const pokemonNumbers = new Set(getPokemonNumbers(pokemon));
  if (pokemonNumbers.size === 0) return null;

  const itemNames = [
    item?.name,
    item?.nameEn,
    itemData?.name,
    itemData?.nameEn
  ].map(normalizeItemNameForUse).filter(Boolean);

  if (itemNames.length === 0) return null;

  return (evolutionsData.evolutions || []).find(evolution => (
    pokemonNumbers.has(Number(evolution.from)) &&
    evolution.condition?.type === 'item' &&
    itemNames.includes(normalizeItemNameForUse(evolution.condition.item))
  )) || null;
};

const canUseEVItemOnPokemon = (pokemon, itemName) => {
  const effect = getEVItemEffect(itemName);
  if (!effect) return true;

  const statFieldMapping = {
    hp: 'hp',
    attack: 'attack',
    defense: 'defense',
    'special-attack': 'specialAttack',
    'special-defense': 'specialDefense',
    speed: 'speed'
  };
  const effortField = statFieldMapping[effect.stat];
  const currentEffort = pokemon.effort || {};
  const currentValue = Number(currentEffort[effortField] || 0);
  const nextValue = Math.max(0, Math.min(252, currentValue + effect.change));

  if (currentValue === nextValue) return false;

  const totalEVs = Object.entries(currentEffort).reduce((sum, [key, value]) => (
    sum + (key === effortField ? nextValue : Number(value || 0))
  ), 0);

  return totalEVs <= 510;
};

const canUseBoostItemOnPokemon = (pokemon, item, itemData) => {
  const friendshipBoost = item.friendshipBoost || itemData?.friendshipBoost;
  if (friendshipBoost && Number(pokemon.friendship || 0) >= 255) return false;

  const ivBoost = item.ivBoost || itemData?.ivBoost;
  if (ivBoost) {
    return Object.keys(ivBoost).some(stat => Number(pokemon.ivs?.[stat] || 0) < 31);
  }

  const evBoost = item.evBoost || itemData?.evBoost;
  if (evBoost) {
    const effort = pokemon.effortValues || pokemon.effort || {};
    const total = Object.values(effort).reduce((sum, value) => sum + Number(value || 0), 0);
    return Object.keys(evBoost).some(stat => (
      total < 510 && Number(effort[stat] || 0) < 252
    ));
  }

  const conditionBoost = item.conditionBoost || itemData?.conditionBoost;
  if (conditionBoost) {
    const condition = pokemon.condition || {};
    return Object.keys(conditionBoost).some(stat => Number(condition[stat] || 0) < 255);
  }

  return true;
};

export const canUseItemOnPokemonTarget = ({
  item,
  itemData,
  pokemon,
  allMoves = [],
  pokemonLearnsets = {}
}) => {
  if (!item || !pokemon) return false;

  const resolvedItemData = itemData || item;

  if (isRareCandyItem(item, itemData)) {
    return Number(pokemon.level || 1) < 100;
  }

  if (resolvedItemData?.isTM) {
    const moveData = allMoves.find(move => (
      move.id === resolvedItemData.moveId ||
      move.id === resolvedItemData.nameEn ||
      move.nameEn === resolvedItemData.nameEn ||
      move.name === resolvedItemData.name
    ));
    const learnset = getPokemonLearnset(pokemonLearnsets, pokemon);

    if (!moveData || !learnset) return false;
    if ((pokemon.moves || []).some(move => move.moveId === moveData.id)) return false;

    return getLearnsetTmMoves(learnset).includes(moveData.id);
  }

  if (resolvedItemData?.category?.includes('evolution')) {
    return Boolean(findItemEvolution(pokemon, item, itemData));
  }

  const itemName = resolvedItemData?.nameEn || resolvedItemData?.name || item.nameEn || item.name;
  if (isEVItem(itemName)) {
    return canUseEVItemOnPokemon(pokemon, itemName);
  }

  return canUseBoostItemOnPokemon(pokemon, item, itemData);
};
