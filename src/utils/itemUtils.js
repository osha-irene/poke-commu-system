// src/utils/itemUtils.js
import { Package, Circle, Heart, Zap, Sparkles, Disc, ShoppingBag, Cpu, Dumbbell, Key, ChefHat } from 'lucide-react';
import { isSoyYYNItem } from './specialItemUtils';

export const ITEM_POCKETS = {
  POKEBALLS: 'pokeballs',
  MEDICINE: 'medicine',
  BERRIES: 'berries',
  MACHINES: 'machines',
  HELD_ITEMS: 'held-items',
  EVOLUTION: 'evolution',
  VITAMINS: 'vitamins',
  BATTLE: 'battle-items',
  INGREDIENTS: 'ingredients', 
  KEY: 'key-items',
  MISC: 'misc'
};

export const POCKET_LABELS = {
  [ITEM_POCKETS.POKEBALLS]: '몬스터볼',
  [ITEM_POCKETS.MEDICINE]: '회복',
  [ITEM_POCKETS.BERRIES]: '나무열매',
  [ITEM_POCKETS.MACHINES]: '기술머신',
  [ITEM_POCKETS.HELD_ITEMS]: '도구',
  [ITEM_POCKETS.EVOLUTION]: '진화',
  [ITEM_POCKETS.VITAMINS]: '영양',
  [ITEM_POCKETS.BATTLE]: '배틀',
  [ITEM_POCKETS.INGREDIENTS]: '식재료', 
  [ITEM_POCKETS.KEY]: '중요',
  [ITEM_POCKETS.MISC]: '기타'
};

// 아이콘 매핑
export const POCKET_ICONS = {
  'all': Package,
  [ITEM_POCKETS.POKEBALLS]: Circle,
  [ITEM_POCKETS.MEDICINE]: Heart,
  [ITEM_POCKETS.BERRIES]: Sparkles,
  [ITEM_POCKETS.MACHINES]: Disc,
  [ITEM_POCKETS.HELD_ITEMS]: ShoppingBag,
  [ITEM_POCKETS.EVOLUTION]: Cpu,
  [ITEM_POCKETS.VITAMINS]: Zap,
  [ITEM_POCKETS.BATTLE]: Dumbbell,
  [ITEM_POCKETS.INGREDIENTS]: ChefHat, 
  [ITEM_POCKETS.KEY]: Key,
  [ITEM_POCKETS.MISC]: Package
};

// 색상 매핑
export const POCKET_COLORS = {
  'all': 'bg-purple-600 text-white',
  [ITEM_POCKETS.POKEBALLS]: 'bg-red-600 text-white',
  [ITEM_POCKETS.MEDICINE]: 'bg-pink-600 text-white',
  [ITEM_POCKETS.BERRIES]: 'bg-green-600 text-white',
  [ITEM_POCKETS.MACHINES]: 'bg-blue-600 text-white',
  [ITEM_POCKETS.HELD_ITEMS]: 'bg-yellow-600 text-white',
  [ITEM_POCKETS.EVOLUTION]: 'bg-indigo-600 text-white',
  [ITEM_POCKETS.VITAMINS]: 'bg-orange-600 text-white',
  [ITEM_POCKETS.BATTLE]: 'bg-red-700 text-white',
  [ITEM_POCKETS.INGREDIENTS]: 'bg-amber-600 text-white', 
  [ITEM_POCKETS.KEY]: 'bg-gray-600 text-white',
  [ITEM_POCKETS.MISC]: 'bg-gray-500 text-white'
};

// 통합된 카테고리 배열 (아이콘과 색상 포함)
export const CATEGORIES = [
  { 
    id: 'all', 
    name: '전체',
    Icon: POCKET_ICONS['all'],
    color: POCKET_COLORS['all']
  },
  { 
    id: ITEM_POCKETS.POKEBALLS, 
    name: POCKET_LABELS[ITEM_POCKETS.POKEBALLS],
    Icon: POCKET_ICONS[ITEM_POCKETS.POKEBALLS],
    color: POCKET_COLORS[ITEM_POCKETS.POKEBALLS]
  },
  { 
    id: ITEM_POCKETS.MEDICINE, 
    name: POCKET_LABELS[ITEM_POCKETS.MEDICINE],
    Icon: POCKET_ICONS[ITEM_POCKETS.MEDICINE],
    color: POCKET_COLORS[ITEM_POCKETS.MEDICINE]
  },
  { 
    id: ITEM_POCKETS.BERRIES, 
    name: POCKET_LABELS[ITEM_POCKETS.BERRIES],
    Icon: POCKET_ICONS[ITEM_POCKETS.BERRIES],
    color: POCKET_COLORS[ITEM_POCKETS.BERRIES]
  },
  { 
    id: ITEM_POCKETS.MACHINES, 
    name: POCKET_LABELS[ITEM_POCKETS.MACHINES],
    Icon: POCKET_ICONS[ITEM_POCKETS.MACHINES],
    color: POCKET_COLORS[ITEM_POCKETS.MACHINES]
  },
  { 
    id: ITEM_POCKETS.HELD_ITEMS, 
    name: POCKET_LABELS[ITEM_POCKETS.HELD_ITEMS],
    Icon: POCKET_ICONS[ITEM_POCKETS.HELD_ITEMS],
    color: POCKET_COLORS[ITEM_POCKETS.HELD_ITEMS]
  },
  { 
    id: ITEM_POCKETS.EVOLUTION, 
    name: POCKET_LABELS[ITEM_POCKETS.EVOLUTION],
    Icon: POCKET_ICONS[ITEM_POCKETS.EVOLUTION],
    color: POCKET_COLORS[ITEM_POCKETS.EVOLUTION]
  },
  { 
    id: ITEM_POCKETS.VITAMINS, 
    name: POCKET_LABELS[ITEM_POCKETS.VITAMINS],
    Icon: POCKET_ICONS[ITEM_POCKETS.VITAMINS],
    color: POCKET_COLORS[ITEM_POCKETS.VITAMINS]
  },
  { 
    id: ITEM_POCKETS.BATTLE, 
    name: POCKET_LABELS[ITEM_POCKETS.BATTLE],
    Icon: POCKET_ICONS[ITEM_POCKETS.BATTLE],
    color: POCKET_COLORS[ITEM_POCKETS.BATTLE]
  },
  { 
    id: ITEM_POCKETS.INGREDIENTS, 
    name: POCKET_LABELS[ITEM_POCKETS.INGREDIENTS],
    Icon: POCKET_ICONS[ITEM_POCKETS.INGREDIENTS],
    color: POCKET_COLORS[ITEM_POCKETS.INGREDIENTS]
  },
  { 
    id: ITEM_POCKETS.KEY, 
    name: POCKET_LABELS[ITEM_POCKETS.KEY],
    Icon: POCKET_ICONS[ITEM_POCKETS.KEY],
    color: POCKET_COLORS[ITEM_POCKETS.KEY]
  },
  { 
    id: ITEM_POCKETS.MISC, 
    name: POCKET_LABELS[ITEM_POCKETS.MISC],
    Icon: POCKET_ICONS[ITEM_POCKETS.MISC],
    color: POCKET_COLORS[ITEM_POCKETS.MISC]
  }
];

// 통일된 아이템 pocket 가져오기
export const getItemPocket = (item) => {
  if (!item) return ITEM_POCKETS.MISC;
  
  // 예외: 나무열매가 이름에 포함되어 있어도 실제로는 다른 포켓인 아이템들
  const berryNameExceptions = ['나무열매쥬스', 'berry-juice', 'berry juice','딸기사탕공예','베리사탕공예','strawberry'];
  const isException = berryNameExceptions.some(ex => 
    item.name?.includes(ex) || item.nameEn?.toLowerCase().includes(ex.toLowerCase())
  );
  
  // 나무열매 체크 (예외 제외)
  if (!isException && (item.name?.includes('열매') || item.nameEn?.toLowerCase().includes('berry'))) {
    return ITEM_POCKETS.BERRIES;
  }
  
  // 식재료 체크
  if (item.cooking?.isIngredient || item.category?.includes('ingredient')) {
    return ITEM_POCKETS.INGREDIENTS;
  }

  const categoryToPocketMap = {
    'vitamins': ITEM_POCKETS.VITAMINS,
    'held-items': ITEM_POCKETS.HELD_ITEMS,
    'species-specific': ITEM_POCKETS.HELD_ITEMS,
    'type-enhancement': ITEM_POCKETS.HELD_ITEMS,
    'evolution': ITEM_POCKETS.EVOLUTION,
    'machines': ITEM_POCKETS.MACHINES,
    'berries': ITEM_POCKETS.BERRIES,
    'medicine': ITEM_POCKETS.MEDICINE,
    'healing': ITEM_POCKETS.MEDICINE,
    'pokeballs': ITEM_POCKETS.POKEBALLS,
    'standard-balls': ITEM_POCKETS.POKEBALLS,
    'special-balls': ITEM_POCKETS.POKEBALLS,
    'apricorn-balls': ITEM_POCKETS.POKEBALLS,
    'battle-items': ITEM_POCKETS.BATTLE,
    'stat-boosts': ITEM_POCKETS.BATTLE,
    'key-items': ITEM_POCKETS.KEY,
    'event-items': ITEM_POCKETS.KEY,
    'gameplay': ITEM_POCKETS.KEY,
  };
  
  if (item.category && categoryToPocketMap[item.category]) {
    return categoryToPocketMap[item.category];
  }
  
  if (item.categoryData?.pocket) {
    return item.categoryData.pocket;
  }
  
  if (item.pocket) {
    return item.pocket;
  }
  
  return ITEM_POCKETS.MISC;
};

// 아이템 category 가져오기
export const getItemCategory = (item) => {
  return item?.category || '';
};

// 아이템 사용 가능 여부
const FORM_CHANGE_ITEM_NAMES = new Set([
  'rotom-catalog', 'gracidea',
  'meteorite', 'meteorite--2', 'meteorite--3', 'meteorite--4',
  'red-nectar', 'yellow-nectar', 'pink-nectar', 'purple-nectar',
]);

export const canUseItem = (item) => {
  if (!item) return false;
  if (isSoyYYNItem(item)) return true;

  const nameEn = item.nameEn || item.name || '';
  if (FORM_CHANGE_ITEM_NAMES.has(nameEn)) return true;

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
    (item.specialEffect && !(item.isCustom && item.specialEffect === 'iv')) ||
    item.friendshipBoost ||
    (!item.isCustom && item.ivBoost) ||
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
    
    if (pocketId === ITEM_POCKETS.MACHINES && item.isTM) return true;
    if (pocketId === ITEM_POCKETS.EVOLUTION && category.includes('evolution')) return true;
    
    return pocket === pocketId;
  });
};

// 아이템의 아이콘 가져오기
export const getItemIcon = (item) => {
  const pocket = getItemPocket(item);
  return POCKET_ICONS[pocket] || Package;
};

// 아이템의 색상 가져오기
export const getItemColor = (item) => {
  const pocket = getItemPocket(item);
  return POCKET_COLORS[pocket] || POCKET_COLORS[ITEM_POCKETS.MISC];
};
