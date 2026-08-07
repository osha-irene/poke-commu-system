import evolutionsData from '../data/evolutions.json';
import { getLearnsetTmMoves, getInheritedEggMoves, getPokemonLearnset } from './pokemonLearnsets';
import { getEVItemEffect, isEVItem } from './evItemUtils';
import { isSoyYYNItem } from './specialItemUtils';

export const FORM_CHANGE_ITEM_POKEMON = {
  'rotom-catalog': [479],
  'gracidea': [492],
  'meteorite': [386], 'meteorite--2': [386], 'meteorite--3': [386], 'meteorite--4': [386],
  'red-nectar': [741], 'yellow-nectar': [741], 'pink-nectar': [741], 'purple-nectar': [741],
  'furfrou-trim-ticket': [676],
};

const FORM_CHANGE_ITEM_NAMES = new Set(Object.keys(FORM_CHANGE_ITEM_POKEMON));

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
    (item.itemId != null && candidate.id === item.itemId) ||
    (item.id != null && candidate.id === item.id) ||
    (item.name  != null && candidate.name === item.name) ||
    (item.nameEn != null && candidate.nameEn === item.nameEn) ||
    (item.name  != null && candidate.nameEn === item.name) ||
    (item.name  != null && candidate.id === item.name)
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

const getPokemonNumbers = (pokemon = {}) => {
  const originalNumber = Number(pokemon.originalNumber);
  const formNumbers = [pokemon.number, pokemon.pokemonId, pokemon.id]
    .map(value => Number(value))
    .filter(number => Number.isFinite(number) && number !== originalNumber);
  // 플라베베/플라엣테 꽃 색깔 폼처럼 number/pokemonId/id가 전부 "pokemon-form-XXXXX" 같은
  // 비숫자 문자열뿐인 코스메틱 폼은 formNumbers가 항상 빈 배열이 되는데, 그 상태로 originalNumber도
  // 없이 폴백하면 진화 후보 숫자가 하나도 안 남아 이 아이템으로 진화 가능한 포켓몬인지 자체를
  // 영영 판단 못한다(= 빛의돌 등 진화 아이템이 항상 사용 불가로 뜸). originalNumber를 폴백에 포함시킨다.
  const sourceNumbers = pokemon.regionalForm || pokemon.formVariant
    ? (formNumbers.length > 0 ? formNumbers : [pokemon.number, pokemon.pokemonId, pokemon.id, pokemon.originalNumber])
    : [pokemon.number, pokemon.originalNumber, pokemon.pokemonId, pokemon.nationalNo];

  return sourceNumbers
    .map(value => Number(value))
    .filter((number, index, numbers) => Number.isFinite(number) && numbers.indexOf(number) === index);
};

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

  const isPartner = Boolean(pokemon?.isPartner);
  const isLinkingCord = itemNames.some(n => n === 'linkingcord' || n === 'linkedcord');

  return (evolutionsData.evolutions || []).find(evolution => {
    if (!pokemonNumbers.has(Number(evolution.from))) return false;
    const cond = evolution.condition;
    // 일반 아이템 진화 (누구나)
    if (cond?.type === 'item') return itemNames.includes(normalizeItemNameForUse(cond.item));
    // 교환 진화는 파트너만 아이템으로 대체 가능
    if (!isPartner) return false;
    if (cond?.type === 'trade' && !cond.heldItem) return isLinkingCord;
    if (cond?.type === 'trade' && cond.heldItem) return itemNames.includes(normalizeItemNameForUse(cond.heldItem));
    return false;
  }) || null;
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
  const otherTotal = Object.entries(currentEffort).reduce((sum, [key, value]) => (
    key === effortField ? sum : sum + Number(value || 0)
  ), 0);

  // 총합 510 상한에 걸려도 남은 자리만큼 부분 적용이 가능하므로(applyEVItem 참고),
  // 정확히 change만큼 못 채운다는 이유만으로 사용 자체를 막지 않는다.
  const nextValue = effect.change > 0
    ? Math.max(0, Math.min(252, currentValue + effect.change, 510 - otherTotal))
    : Math.max(0, Math.min(252, currentValue + effect.change));

  return currentValue !== nextValue;
};

const hasBoost = (boost) => boost && Object.values(boost).some(v => Number(v) > 0);

const canUseBoostItemOnPokemon = (pokemon, item, itemData, systemSettings = {}) => {
  const src = itemData || item;
  if (isSoyYYNItem(item) || isSoyYYNItem(itemData)) return true;

  const friendshipBoost = src.friendshipBoost;
  if (Number(friendshipBoost) > 0 && Number(pokemon.friendship || 0) >= 255) return false;

  const ivBoost = src.ivBoost;
  if (!src.isCustom && hasBoost(ivBoost)) {
    return Object.keys(ivBoost).some(stat => Number(ivBoost[stat]) > 0 && Number(pokemon.ivs?.[stat] || 0) < 31);
  }

  const evBoost = src.evBoost;
  if (hasBoost(evBoost)) {
    const effort = pokemon.effortValues || pokemon.effort || {};
    const total = Object.values(effort).reduce((sum, value) => sum + Number(value || 0), 0);
    return Object.keys(evBoost).some(stat => (
      Number(evBoost[stat]) > 0 && total < 510 && Number(effort[stat] || 0) < 252
    ));
  }

  const conditionBoost = src.conditionBoost;
  if (hasBoost(conditionBoost)) {
    const condition = pokemon.condition || {};
    const condMax = systemSettings?.conditionMax || 100;
    return Object.keys(conditionBoost).some(stat => Number(conditionBoost[stat]) > 0 && Number(condition[stat] || 0) < condMax);
  }

  if (src.isCustom) {
    const hasFriendshipRoom = Number(friendshipBoost) > 0 && Number(pokemon.friendship || 0) < 255;
    const hasAnyEffect = hasFriendshipRoom || hasBoost(ivBoost) || Boolean(src.specialEffect);
    if (!hasAnyEffect) return false;
  }

  return true;
};

export const canUseItemOnPokemonTarget = ({
  item,
  itemData,
  pokemon,
  allMoves = [],
  pokemonLearnsets = {},
  systemSettings = {}
}) => {
  if (!item || !pokemon) return false;

  const resolvedItemData = itemData || item;

  if (isRareCandyItem(item, itemData)) {
    return Number(pokemon.level || 1) < 100;
  }

  if (resolvedItemData?.specialEffect === 'learnAnyTmMove' || resolvedItemData?.specialEffect === 'learnAnyEggMove') {
    const learnset = getPokemonLearnset(pokemonLearnsets, pokemon);
    if (!learnset) return false;
    const poolIds = resolvedItemData.specialEffect === 'learnAnyTmMove'
      ? getLearnsetTmMoves(learnset)
      : getInheritedEggMoves(pokemonLearnsets, pokemon);
    const knownMoveIds = new Set((pokemon.moves || []).map(move => move.moveId));
    return poolIds.some(moveId => !knownMoveIds.has(moveId));
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

  if (FORM_CHANGE_ITEM_NAMES.has(itemName)) {
    const eligibleNumbers = FORM_CHANGE_ITEM_POKEMON[itemName] || [];
    const baseNum = Number(pokemon.originalNumber || pokemon.number);
    return eligibleNumbers.includes(baseNum);
  }

  if (isEVItem(itemName)) {
    return canUseEVItemOnPokemon(pokemon, itemName);
  }

  return canUseBoostItemOnPokemon(pokemon, item, itemData, systemSettings);
};
