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

// 통일된 아이템 pocket 가져오기
export const getItemPocket = (item) => {
  if (!item) return ITEM_POCKETS.MISC;

  // 예외: 나무열매가 이름에 포함되어 있어도 실제로는 다른 포켓인 아이템들
  const berryNameExceptions = ['나무열매쥬스', 'berry-juice', 'berry juice','딸기사탕공예','베리사탕공예','strawberry'];
  const isException = berryNameExceptions.some(ex =>
    item.name?.includes(ex) || item.nameEn?.toLowerCase().includes(ex.toLowerCase())
  );

  // 커스텀 아이템에서 관리자가 cooking.isIngredient를 명시적으로 false로 지정한 경우,
  // 이름에 "열매"가 들어있어도 나무열매 포켓으로 자동 분류하지 않는다.
  // (명시적 false는 "이건 재료/나무열매가 아니다"라는 확실한 의사표시이므로 이름 매칭보다 우선한다)
  // ⚠️ isCustom인 경우로만 한정한다 - 오랭/버치/유루열매 같은 공식 나무열매는 cooking.isIngredient가
  // 원래 false인 게 정상(요리 재료가 아닌 상태이상 회복용 지닌 물건일 뿐, 나무열매 포켓 자체는 맞음).
  // isCustom 체크 없이 적용하면 이 공식 나무열매들이 전부 나무열매 포켓에서 빠져버린다.
  const isExplicitlyNotIngredient = item.isCustom && item.cooking?.isIngredient === false;

  // item.pocket이 나무열매가 아닌 값으로 이미 명시적으로 박혀있으면(관리자가 CustomItemCreator의
  // 카테고리 버튼으로 직접 고른 값, 혹은 그 값이 상점 구매/지급을 거쳐 인벤토리에 그대로 복사된
  // 경우) 이름 매칭보다 그 지정을 우선한다. 공식 아이템(items.json)은 최상위 pocket 필드를 아예
  // 쓰지 않으므로(카테고리/categoryData.pocket만 사용) 이 체크는 isCustom 여부와 무관하게 안전하다.
  // (인벤토리로 복사되는 과정에서 isCustom 플래그 자체는 누락되는 경로가 있어, isCustom만 보고
  // 판단하면 상점에서 산 커스텀 아이템은 이 예외를 못 받는다)
  const hasExplicitPocket = item.pocket && item.pocket !== ITEM_POCKETS.MISC && item.pocket !== ITEM_POCKETS.BERRIES;

  // 커스텀 아이템에서 관리자가 카테고리를 나무열매가 아닌 값으로 직접 골라둔 경우도 우선한다.
  // (공식 아이템은 나무열매의 category가 'medicine'으로 잡혀있는 등 이름과 category가 어긋나는
  // 경우가 있어서, 이 체크는 isCustom인 경우로만 한정한다)
  const hasExplicitCustomCategory = item.isCustom && item.category && item.category !== 'misc' &&
    item.category !== 'berries' && categoryToPocketMap[item.category];

  const hasExplicitNonBerryPocket = hasExplicitPocket || hasExplicitCustomCategory;

  // 나무열매 체크 (예외 제외)
  if (!isException && !isExplicitlyNotIngredient && !hasExplicitNonBerryPocket && (item.name?.includes('열매') || item.nameEn?.toLowerCase().includes('berry'))) {
    return ITEM_POCKETS.BERRIES;
  }

  // category가 회복/영양 등으로 이미 명확한 아이템은 그 분류를 우선한다.
  // (맛있는물처럼 "회복 아이템이면서 요리 재료로도 쓰이는" 경우, 재료 여부는 CookingView 쪽에서
  // cooking.isIngredient를 따로 확인하므로, 여기 pocket까지 식재료로 덮어쓸 필요는 없다)
  if (item.category && categoryToPocketMap[item.category]) {
    return categoryToPocketMap[item.category];
  }

  // 식재료 체크 (위에서 매칭되는 카테고리가 없을 때만 - 커스텀 재료처럼 category가 misc뿐인 경우)
  if (item.cooking?.isIngredient || item.category?.includes('ingredient')) {
    return ITEM_POCKETS.INGREDIENTS;
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
  'furfrou-trim-ticket',
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
