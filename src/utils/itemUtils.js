// src/utils/itemUtils.js

export const ITEM_POCKETS = {
  POKEBALLS: 'pokeballs',
  MEDICINE: 'medicine',
  BERRIES: 'berries',
  MACHINES: 'machines',
  HELD_ITEMS: 'held-items',
  EVOLUTION: 'evolution',
  VITAMINS: 'vitamins',
  BATTLE: 'battle-items',
  KEY: 'key-items',
  MISC: 'misc'
};

export const POCKET_LABELS = {
  [ITEM_POCKETS.POKEBALLS]: '몬스터볼',
  [ITEM_POCKETS.MEDICINE]: '회복',
  [ITEM_POCKETS.BERRIES]: '나무열매',
  [ITEM_POCKETS.MACHINES]: '기술머신',
  [ITEM_POCKETS.HELD_ITEMS]: '지닌물건',
  [ITEM_POCKETS.EVOLUTION]: '진화',
  [ITEM_POCKETS.VITAMINS]: '영양',
  [ITEM_POCKETS.BATTLE]: '배틀',
  [ITEM_POCKETS.KEY]: '중요',
  [ITEM_POCKETS.MISC]: '기타'
};

export const CATEGORIES = [
  { id: 'all', name: '전체' },
  { id: ITEM_POCKETS.POKEBALLS, name: POCKET_LABELS[ITEM_POCKETS.POKEBALLS] },
  { id: ITEM_POCKETS.MEDICINE, name: POCKET_LABELS[ITEM_POCKETS.MEDICINE] },
  { id: ITEM_POCKETS.BERRIES, name: POCKET_LABELS[ITEM_POCKETS.BERRIES] },
  { id: ITEM_POCKETS.MACHINES, name: POCKET_LABELS[ITEM_POCKETS.MACHINES] },
  { id: ITEM_POCKETS.HELD_ITEMS, name: POCKET_LABELS[ITEM_POCKETS.HELD_ITEMS] },
  { id: ITEM_POCKETS.EVOLUTION, name: POCKET_LABELS[ITEM_POCKETS.EVOLUTION] },
  { id: ITEM_POCKETS.VITAMINS, name: POCKET_LABELS[ITEM_POCKETS.VITAMINS] },
  { id: ITEM_POCKETS.BATTLE, name: POCKET_LABELS[ITEM_POCKETS.BATTLE] },
  { id: ITEM_POCKETS.KEY, name: POCKET_LABELS[ITEM_POCKETS.KEY] },
  { id: ITEM_POCKETS.MISC, name: POCKET_LABELS[ITEM_POCKETS.MISC] }
];

// 통일된 아이템 pocket 가져오기
export const getItemPocket = (item) => {
  return item?.categoryData?.pocket || item?.pocket || ITEM_POCKETS.MISC;
};

// 아이템 category 가져오기
export const getItemCategory = (item) => {
  return item?.category || '';
};

// 아이템 사용 가능 여부
export const canUseItem = (item) => {
  if (!item) return false;
  
  const pocket = getItemPocket(item);
  const category = getItemCategory(item);
  
  return (
    pocket === ITEM_POCKETS.BERRIES ||
    pocket === ITEM_POCKETS.MEDICINE ||
    pocket === ITEM_POCKETS.VITAMINS ||
    pocket === ITEM_POCKETS.MACHINES ||
    category === ITEM_POCKETS.VITAMINS ||
    category === ITEM_POCKETS.MEDICINE ||
    category === ITEM_POCKETS.MACHINES ||
    category?.includes('evolution') ||
    category?.includes('berry') ||
    item.isTM ||
    item.specialEffect ||
    item.friendshipBoost ||
    item.ivBoost ||
    item.evBoost ||
    item.conditionBoost
  );
};

// pocket ID로 아이템 필터링
export const filterItemsByPocket = (items, pocketId) => {
  if (pocketId === 'all') return items;
  
  return items.filter(item => {
    const pocket = getItemPocket(item);
    const category = getItemCategory(item);
    
    // 특수 케이스 처리
    if (pocketId === ITEM_POCKETS.MACHINES && item.isTM) return true;
    if (pocketId === ITEM_POCKETS.EVOLUTION && category.includes('evolution')) return true;
    
    return pocket === pocketId;
  });
};