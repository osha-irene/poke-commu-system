import React, { useState } from 'react';
import { Plus, Trash2, Save, FileText, BarChart3, Gift, Package, Star, TrendingUp, ChefHat, Layers, Edit2, X, Image, Search } from 'lucide-react';
import ItemSelectorModal from '../../modals/ItemSelectorModal';
import { getItemPocket } from '../../../utils/itemUtils';

// 레시피 재료 선택 모달의 기본 포켓 필터. ItemSelectorModal의 `pockets`는 여기 없는 포켓의
// 아이템을 무조건 제외하는 하드 필터라, 커스텀 아이템 생성 화면의 "🥕 식재료로도 사용 가능"
// 체크박스(cooking.isIngredient)로 다른 포켓(도구/기타 등)에 있는 아이템을 재료로 지정해도
// 이 목록에는 절대 뜨지 않았다 - pockets만으로 거르지 않고 isIngredient 플래그도 함께 본다.
const INGREDIENT_PICKER_POCKETS = ['ingredients', 'berries', 'medicine', 'vitamins'];
const isIngredientPickerCandidate = (item) => (
  INGREDIENT_PICKER_POCKETS.includes(getItemPocket(item)) || item?.cooking?.isIngredient === true
);

// public 폴더 이미지 목록
const FOOD_IMAGES = [
  'aligo.png','almond-powder.png','apple-pie.png','berry-cake.png','berry-macaron.png',
  'blacktea-paste.png','blacktea.png','boochoo.png','boochoopa.png','bottle-cake.png',
  'bread.png','breakfast.png','caprese.png','carrot-cake.png','carrot-cookie.png',
  'carrot.png','cheese-cake.png','cheesecake-bingsu.png','chilly-paste.png','choco-bread.png',
  'choco-cookie.png','choco-macaron.png','chocolate-fruit.png','chocolate-strawberry.png',
  'chocolate.png','chowder.png','coffe-icecream.png','coffee-bingsu.png','coffee.png',
  'cookie-jam.png','cookie.png','corn.png','curry-rice.png','durian-cheese-pizza.png',
  'durian.png','egg-bacon-toast.png','egg-mayo.png','egg-tart.png','eidible-ice.png',
  'flour.png','fried-beans.png','fried-corn.png','fried-egg.png','fried-mushveg.png',
  'fruit-cordial.png','ice-tea.png','icecream.png','jam.png','jelatin.png',
  'kelp.png','kimchi.png','loaf.png','messed1.png','messed2.png','messed3.png',
  'milktea.png','mint.png','mushroom-jelly.png','octillery-ink.png','omelet.png',
  'ongsim.png','orange-jelly.png','orange-juice.png','orange.png','pancake.png',
  'peach-bingsu.png','pineapple-jelly.png','pizza-alola.png','pizza.png','popcorn.png',
  'potato-fried.png','potato-mashed.png','potato-sandwich.png','potato-soup.png',
  'pudding.png','rolled-egg.png','salad.png','salt.png','slowpoke-tail-jelly.png',
  'slowpoke-tail-stew.png','soy-paste.png','soy-stew.png','soymeat-hotdog.png',
  'soymeat-steak.png','soymeat.png','soysauce.png','strawberry-choco.png',
  'strawberry-jelly.png','strawberry-macaron.png','strawberry-sugar.png','strawberry_cake.png',
  'sugar.png','t.png','tbk-alola.png','tbk-black.png','tbk-cheese.png','tbk-cold.png',
  'tbk-cream.png','tbk-fire.png','tbk-galar.png','tbk-mintchoco.png','tbk-rose.png',
  'tbk-salad.png','tbk-sandwich-paldea.png','tbk-seafood.png','tbk-soy.png',
  'tbk-strawnana.png','tbk.png','tch.png','tea.png','toast-choco.png',
  'toast-creamcheese.png','toast-honey.png','toast-jam.png','toast.png','tofu.png',
  'tomato-pasta.png','tomato-sugared.png',
].map(f => ({ src: `/img/items/foods/${f}`, name: f.replace('.png', '') }));

const INGREDIENT_IMAGES = [
  'apple.png','avocado.png','bacon.png','baguette.png','banana.png','basil.png',
  'bitterherbamystica.png','boiledegg.png','bread.png','brittlebones.png','butter.png',
  'cheese.png','cherrytomatoes.png','chilisauce.png','chorizo.png','coconutmilk.png',
  'creamcheese.png','cucumber.png','currypowder.png','egg.png','fancyapple.png',
  'freshcream.png','friedfillet.png','friedfood.png','fruitbunch.png','gigantamix.png',
  'greenbellpepper.png','ham.png','hamburger.png','herbedsausage.png','horseradish.png',
  'instantnoodles.png','jam.png','ketchup.png','kiwi.png','klawfstick.png',
  'largeleek.png','lettuce.png','marmalade.png','mayonnaise.png','mixedmushrooms.png',
  'moomoocheese.png','mustard.png','noodles.png','oliveoil.png','onion.png',
  'packagedcurry.png','packofpotatoes.png','pasta.png','peanutbutter.png','pepper.png',
  'pickle.png','pineapple.png','potatosalad.png','potatotortilla.png','precookedburger.png',
  'prosciutto.png','pungentroot.png','redbellpepper.png','redonion.png','rice.png',
  'saladmix.png','salt.png','saltyherbamystica.png','sausages.png','smokedfillet.png',
  'sourherbamystica.png','spicemix.png','spicyherbamystica.png','strawberry.png',
  'sweetherbamystica.png','tinofbeans.png','tofu.png','tomato.png','vinegar.png',
  'wasabi.png','watercress.png','whippedcream.png','yellowbellpepper.png','yogurt.png',
].map(f => ({ src: `/img/ingredient-sprites/${f}`, name: f.replace('.png', '') }));

function PublicImagePicker({ onSelect, onClose }) {
  const [tab, setTab] = useState('food');
  const [search, setSearch] = useState('');
  const images = tab === 'food' ? FOOD_IMAGES : INGREDIENT_IMAGES;
  const filtered = search.trim()
    ? images.filter(img => img.name.toLowerCase().includes(search.toLowerCase()))
    : images;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4" onClick={onClose}>
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h3 className="font-bold text-gray-800 flex items-center gap-2"><Image size={18} /> 이미지 선택</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 p-1 rounded"><X size={18} /></button>
        </div>
        <div className="flex gap-2 px-5 pt-3">
          {[['food','요리 결과물'],['ingredient','식재료']].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition ${tab === id ? 'bg-lime-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {label}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-1 border border-gray-300 rounded-lg px-2 py-1">
            <Search size={13} className="text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="검색..." className="text-sm outline-none w-28" />
          </div>
        </div>
        <div className="overflow-y-auto flex-1 p-4">
          <div className="grid grid-cols-6 gap-2">
            {filtered.map(img => (
              <button key={img.src} onClick={() => { onSelect(img.src); onClose(); }}
                className="flex flex-col items-center gap-1 p-2 rounded-lg border border-gray-200 hover:border-lime-400 hover:bg-lime-50 transition group">
                <img src={img.src} alt={img.name} className="w-10 h-10 object-contain" style={{ imageRendering: 'pixelated' }}
                  onError={e => { e.target.src = '/pokeball.png'; }} />
                <span className="text-[9px] text-gray-500 text-center leading-tight line-clamp-2 w-full">{img.name}</span>
              </button>
            ))}
            {filtered.length === 0 && <p className="col-span-6 text-center text-gray-400 py-8 text-sm">검색 결과 없음</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

const Card = ({ children, className = '' }) => (
  <div className={`bg-white rounded-lg shadow ${className}`}>{children}</div>
);

const Button = ({ children, variant = 'primary', size = 'md', onClick, disabled, className = '' }) => {
  const baseClass = 'inline-flex items-center gap-2 font-semibold rounded-lg transition-all';
  const variants = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700',
    secondary: 'bg-gray-200 text-gray-700 hover:bg-gray-300'
  };
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2',
    lg: 'px-6 py-3 text-lg'
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`${baseClass} ${variants[variant]} ${sizes[size]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
    >
      {children}
    </button>
  );
};

const conditionLabels = {
  elegance: '근사함',
  beauty: '아름다움',
  cuteness: '귀여움',
  intelligence: '슬기로움',
  strength: '강인함',
  power: '파워',
  sweetness: '달콤함'
};

const effortLabels = {
  hp: 'HP',
  attack: '공격',
  defense: '방어',
  spAttack: '특수공격',
  spDefense: '특수방어',
  speed: '스피드'
};

const RESULT_EFFECT_CATEGORIES = [
  { id: 'none', label: '없음' },
  { id: 'friendship', label: '친밀도 증가' },
  { id: 'condition', label: '컨디션 증가' },
  { id: 'ev', label: '노력치 증가' },
  { id: 'trainerExp', label: '경험치 상승' },
];

// 결과 아이템은 friendshipBoost/conditionBoost/effortBoost/specialEffect를 동시에 들고 있을 수 있는
// 구조라, 관리 화면에서는 "지금 어떤 효과가 켜져있는지" 하나로 판단해서 보여준다.
const getResultEffectCategory = (item) => {
  if (item.specialEffect === 'trainerExp') return 'trainerExp';
  if (item.specialEffect === 'conditionSelect') return 'condition';
  if (item.specialEffect === 'evSelect') return 'ev';
  if (item.specialEffect === 'friendship' || Number(item.friendshipBoost) > 0) return 'friendship';
  if (item.specialEffect === 'condition' || Object.values(item.conditionBoost || {}).some(v => Number(v) > 0)) return 'condition';
  if (item.specialEffect === 'ev' || Object.values(item.effortBoost || {}).some(v => Number(v) > 0)) return 'ev';
  return 'none';
};

const getResultEffectMode = (item) => (
  (item.specialEffect === 'conditionSelect' || item.specialEffect === 'evSelect') ? 'select' : 'all'
);

const emptyIngredients = () => [
  { name: '', count: 1 },
  { name: '', count: 1 },
  { name: '', count: 1 }
];

const emptyResultItem = () => ({
  name: '',
  pocket: 'berries',
  effect: '',
  friendshipBoost: 0,
  conditionBoost: { elegance: 0, beauty: 0, cuteness: 0, intelligence: 0, strength: 0 },
  effortBoost: { hp: 0, attack: 0, defense: 0, spAttack: 0, spDefense: 0, speed: 0 },
  spriteUrl: '',
  // 특수 효과 — conditionSelect/evSelect: 사용 시 유저가 항목 선택, trainerExp: 멤버 경험치 상승
  specialEffect: null,
  boostAmount: 0,
  canSell: false,
  sellPrice: 0,
});

const emptyRequiredStats = () => ({
  elegance: 0,
  beauty: 0,
  cuteness: 0,
  intelligence: 0,
  strength: 0,
  power: 0,
  sweetness: 0
});

const emptyRequiredEfforts = () => ({
  hp: 0,
  attack: 0,
  defense: 0,
  spAttack: 0,
  spDefense: 0,
  speed: 0
});

const recipeSupports = (recipe, type) => {
  if (!recipe) return false;
  if (Array.isArray(recipe.types)) return recipe.types.includes(type);
  if (recipe.type === 'both') return true;
  return recipe.type === type;
};

export default function CookingAdminPanel({ onCreateRecipe, onUpdateRecipe, onDeleteRecipe, allItems = [], recipes = [] }) {
  const [recipeType, setRecipeType] = useState('fixed');
  const [enabledRecipeTypes, setEnabledRecipeTypes] = useState({ fixed: true, stat: false });
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [ingredients, setIngredients] = useState(emptyIngredients);
  const [resultItem, setResultItem] = useState(emptyResultItem);
  const [requiredStats, setRequiredStats] = useState(emptyRequiredStats);
  const [requiredEfforts, setRequiredEfforts] = useState(emptyRequiredEfforts);
  const [editingRecipeId, setEditingRecipeId] = useState(null);
  const [recipeFilter, setRecipeFilter] = useState('all');
  const [showItemModal, setShowItemModal] = useState(false);
  const [selectingIndex, setSelectingIndex] = useState(null);

  const openItemSelector = (index) => {
    setSelectingIndex(index);
    setShowItemModal(true);
  };

  const handleSelectIngredient = (item) => {
    if (selectingIndex === null) return;
    const next = [...ingredients];
    next[selectingIndex] = { ...next[selectingIndex], name: item.name };
    setIngredients(next);
    setShowItemModal(false);
  };

  const removeIngredient = (index) => {
    const next = [...ingredients];
    next[index] = { name: '', count: 1 };
    setIngredients(next);
  };

  const resultEffectCategory = getResultEffectCategory(resultItem);
  const resultEffectMode = getResultEffectMode(resultItem);

  const selectResultEffectCategory = (category) => {
    if (category === resultEffectCategory) return;

    const base = {
      ...resultItem,
      specialEffect: null,
      boostAmount: 0,
      friendshipBoost: 0,
      conditionBoost: { elegance: 0, beauty: 0, cuteness: 0, intelligence: 0, strength: 0 },
      effortBoost: { hp: 0, attack: 0, defense: 0, spAttack: 0, spDefense: 0, speed: 0 },
    };

    if (category === 'none') setResultItem(base);
    else setResultItem({ ...base, specialEffect: category });
  };

  const selectResultEffectMode = (category, mode) => {
    const selectType = category === 'condition' ? 'conditionSelect' : 'evSelect';
    setResultItem({
      ...resultItem,
      specialEffect: mode === 'select' ? selectType : category,
      boostAmount: mode === 'select' ? (resultItem.boostAmount || 1) : 0,
    });
  };

  const handleDeleteRecipe = (recipeId) => {
    if (window.confirm('정말로 이 레시피를 삭제하시겠습니까?')) {
      if (editingRecipeId === recipeId) {
        resetForm();
      }
      onDeleteRecipe?.(recipeId);
    }
  };

  const resetForm = () => {
    setIngredients(emptyIngredients());
    setResultItem(emptyResultItem());
    setRequiredStats(emptyRequiredStats());
    setRequiredEfforts(emptyRequiredEfforts());
    setEnabledRecipeTypes({ fixed: true, stat: false });
    setRecipeType('fixed');
    setEditingRecipeId(null);
  };

  const buildRecipePayload = () => {
    if (!resultItem.name.trim()) {
      alert('결과 아이템 이름을 입력해주세요!');
      return null;
    }

    if (!resultItem.effect.trim()) {
      alert('결과 아이템 설명을 입력해주세요!');
      return null;
    }

    const needsBoostAmount = ['conditionSelect', 'evSelect', 'trainerExp'].includes(resultItem.specialEffect);
    if (needsBoostAmount && (!resultItem.boostAmount || resultItem.boostAmount <= 0)) {
      alert('상승량을 입력해주세요!');
      return null;
    }

    const validIngredients = ingredients.filter((ing) => ing.name.trim());
    const enabledTypes = Object.entries(enabledRecipeTypes)
      .filter(([, enabled]) => enabled)
      .map(([type]) => type);

    if (enabledTypes.length === 0) {
      alert('고정 레시피 또는 스탯 레시피를 하나 이상 선택해주세요!');
      return null;
    }

    if (enabledRecipeTypes.fixed && validIngredients.length === 0) {
      alert('최소 1개 이상의 재료를 선택해주세요!');
      return null;
    }

    return {
      name: resultItem.name,
      type: enabledTypes.length === 2 ? 'both' : enabledTypes[0],
      types: enabledTypes,
      ingredients: enabledRecipeTypes.fixed ? validIngredients : [],
      requiredStats: enabledRecipeTypes.stat ? requiredStats : {},
      requiredEfforts: enabledRecipeTypes.stat ? requiredEfforts : {},
      result: {
        ...resultItem,
        name: resultItem.name,
        effect: resultItem.effect,
        specialEffect: resultItem.specialEffect || null,
        boostAmount: resultItem.boostAmount || 0,
      }
    };
  };

  const handleSaveRecipe = async () => {
    const payload = buildRecipePayload();
    if (!payload) return;

    const recipeId = editingRecipeId || `recipe_${Date.now()}`;

    if (editingRecipeId) {
      // 결과 아이템은 recipes 데이터에서 파생되어 표시되므로(useGameData의 allItems),
      // 여기서 별도로 customItems를 만들거나 갱신할 필요가 없다.
      await onUpdateRecipe?.(editingRecipeId, payload);
    } else {
      await onCreateRecipe?.({ id: recipeId, ...payload, createdAt: new Date().toISOString() });
    }

    resetForm();
  };

  const handleEditRecipe = (recipe) => {
    const supportsFixed = recipeSupports(recipe, 'fixed');
    const supportsStat = recipeSupports(recipe, 'stat');
    const nextIngredients = emptyIngredients();

    (recipe.ingredients || []).slice(0, 3).forEach((ingredient, index) => {
      nextIngredients[index] = {
        name: ingredient.name || '',
        count: ingredient.count || 1
      };
    });

    setEditingRecipeId(recipe.id);
    setEnabledRecipeTypes({ fixed: supportsFixed, stat: supportsStat });
    setRecipeType(supportsFixed ? 'fixed' : 'stat');
    setIngredients(nextIngredients);
    setRequiredStats({ ...emptyRequiredStats(), ...(recipe.requiredStats || {}) });
    setRequiredEfforts({ ...emptyRequiredEfforts(), ...(recipe.requiredEfforts || {}) });
    const r = recipe.result || {};
    setResultItem({
      ...emptyResultItem(),
      ...r,
      name: r.name || recipe.name || '',
      effect: r.effect || '',
      spriteUrl: r.spriteUrl || '',
      specialEffect: r.specialEffect || null,
      boostAmount: r.boostAmount || 0,
    });
  };

  const toggleRecipeType = (type, checked) => {
    setEnabledRecipeTypes((prev) => ({ ...prev, [type]: checked }));
    if (checked) setRecipeType(type);
  };

  const filterOptions = [
    { id: 'all', label: '전체', count: recipes.length },
    { id: 'fixed', label: '고정', count: recipes.filter((recipe) => recipeSupports(recipe, 'fixed') && !recipeSupports(recipe, 'stat')).length },
    { id: 'stat', label: '스탯', count: recipes.filter((recipe) => recipeSupports(recipe, 'stat') && !recipeSupports(recipe, 'fixed')).length },
    { id: 'both', label: '고정 + 스탯', count: recipes.filter((recipe) => recipeSupports(recipe, 'fixed') && recipeSupports(recipe, 'stat')).length }
  ];

  const filteredRecipes = recipes.filter((recipe) => {
    const supportsFixed = recipeSupports(recipe, 'fixed');
    const supportsStat = recipeSupports(recipe, 'stat');

    if (recipeFilter === 'fixed') return supportsFixed && !supportsStat;
    if (recipeFilter === 'stat') return supportsStat && !supportsFixed;
    if (recipeFilter === 'both') return supportsFixed && supportsStat;
    return true;
  });

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <ChefHat size={24} /> {editingRecipeId ? '레시피 편집' : '레시피 등록'}
        </h3>
        {editingRecipeId && (
          <div className="mb-4 flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            <span className="font-semibold">기존 레시피를 수정 중입니다.</span>
            <button
              type="button"
              onClick={resetForm}
              className="inline-flex items-center gap-1 rounded px-2 py-1 font-semibold hover:bg-emerald-100"
            >
              <X size={14} />
              편집 취소
            </button>
          </div>
        )}

        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">레시피 조건</label>
          <div className="mb-3 flex flex-wrap gap-3">
            <label className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700">
              <input
                type="checkbox"
                checked={enabledRecipeTypes.fixed}
                onChange={(event) => toggleRecipeType('fixed', event.target.checked)}
              />
              고정 레시피 사용
            </label>
            <label className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700">
              <input
                type="checkbox"
                checked={enabledRecipeTypes.stat}
                onChange={(event) => toggleRecipeType('stat', event.target.checked)}
              />
              스탯 레시피 사용
            </label>
          </div>

          <div className="flex gap-0 relative">
            <button
              type="button"
              onClick={() => setRecipeType('fixed')}
              className={`flex-1 py-3 px-4 rounded-t-lg border-2 border-b-0 font-semibold transition-all flex items-center gap-3 relative ${
                recipeType === 'fixed'
                  ? 'border-gray-300 bg-white text-indigo-700 z-20'
                  : 'border-transparent bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              <FileText size={32} className="flex-shrink-0" />
              <div className="text-left">
                <div className="text-sm font-bold">고정 레시피</div>
                <div className="text-xs text-gray-500 mt-0.5">정해진 재료 조합</div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setRecipeType('stat')}
              className={`flex-1 py-3 px-4 rounded-t-lg border-2 border-b-0 font-semibold transition-all flex items-center gap-3 relative ${
                recipeType === 'stat'
                  ? 'border-gray-300 bg-white text-purple-700 z-20'
                  : 'border-transparent bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              <BarChart3 size={32} className="flex-shrink-0" />
              <div className="text-left">
                <div className="text-sm font-bold">스탯 레시피</div>
                <div className="text-xs text-gray-500 mt-0.5">재료 스탯 합산 조건</div>
              </div>
            </button>
          </div>
        </div>

        <div className="border-2 border-gray-300 rounded-b-lg bg-white relative">
          <div className="p-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="flex flex-col" style={{ height: '510px' }}>
                {recipeType === 'fixed' ? (
                  <div className="flex-1 flex flex-col h-full">
                    <label className="text-sm font-semibold text-gray-700 mb-3">재료 (최대 3개)</label>
                    <div className="space-y-3 flex-1">
                      {ingredients.map((ing, index) => {
                        const selectedItem = allItems.find((item) => item.name === ing.name);

                        return (
                          <div key={index} className="border-2 border-gray-200 rounded-lg p-3 bg-white relative" style={{ height: '154px' }}>
                            {ing.name ? (
                              <div className="flex items-center gap-2 h-full">
                                <div className="item-sprite w-20 h-20 bg-gray-50 rounded flex items-center justify-center flex-shrink-0">
                                  <img
                                    src={selectedItem?.spriteUrl || selectedItem?.imageUrl}
                                    alt={ing.name}
                                    className="max-w-full max-h-full object-contain"
                                    style={{ imageRendering: 'pixelated' }}
                                  />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-base font-semibold text-gray-800 truncate mb-1">{ing.name}</div>
                                  <button type="button" onClick={() => openItemSelector(index)} className="text-sm text-indigo-600 hover:text-indigo-700">
                                    변경
                                  </button>
                                </div>
                                <div className="flex items-center gap-2">
                                  <label className="text-sm text-gray-600">개수:</label>
                                  <input
                                    type="number"
                                    min="1"
                                    value={ing.count}
                                    onChange={(event) => {
                                      const next = [...ingredients];
                                      next[index].count = parseInt(event.target.value, 10) || 1;
                                      setIngredients(next);
                                    }}
                                    className="w-20 px-3 py-2 border border-gray-300 rounded text-center font-semibold"
                                  />
                                </div>
                                <button type="button" onClick={() => removeIngredient(index)} className="p-2 text-red-400 hover:bg-red-50 hover:text-red-600 rounded transition-colors">
                                  <Trash2 size={20} />
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => openItemSelector(index)}
                                className="w-full h-full border-2 border-dashed border-gray-300 rounded-lg hover:border-indigo-400 hover:bg-indigo-50 transition-colors flex flex-col items-center justify-center"
                              >
                                <Plus size={48} className="mb-2 text-gray-400" />
                                <div className="text-sm text-gray-500 font-medium">아이템 선택</div>
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 h-full overflow-y-auto">
                    <label className="block text-sm font-semibold text-gray-700 mb-3">필요 컨디션 & 노력치 합계</label>

                    <div className="mb-4">
                      <div className="text-xs font-semibold text-gray-600 mb-2">컨디션 스탯</div>
                      <div className="grid grid-cols-2 gap-2">
                        {Object.keys(requiredStats).map((stat) => (
                          <div key={stat}>
                            <label className="block text-xs text-gray-600 mb-1">{conditionLabels[stat] || stat}</label>
                            <input
                              type="number"
                              min="0"
                              value={requiredStats[stat]}
                              onChange={(event) => setRequiredStats({ ...requiredStats, [stat]: parseInt(event.target.value, 10) || 0 })}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-semibold text-gray-600 mb-2">노력치</div>
                      <div className="grid grid-cols-2 gap-2">
                        {Object.keys(requiredEfforts).map((stat) => (
                          <div key={stat}>
                            <label className="block text-xs text-gray-600 mb-1">{effortLabels[stat] || stat}</label>
                            <input
                              type="number"
                              min="0"
                              value={requiredEfforts[stat]}
                              onChange={(event) => setRequiredEfforts({ ...requiredEfforts, [stat]: parseInt(event.target.value, 10) || 0 })}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                            />
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-gray-600 mt-2 flex items-center gap-1">
                        <Star size={12} /> 재료들의 컨디션과 노력치가 이 값 이상이면 레시피 완성
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-gray-50 rounded-lg p-4 border-2 border-gray-300 flex flex-col" style={{ height: '510px' }}>
                <h4 className="font-bold text-gray-800 mb-2 flex items-center gap-2 shrink-0">
                  <Gift size={20} /> 결과 아이템
                </h4>

                <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={resultItem.name}
                      onChange={(event) => setResultItem({ ...resultItem, name: event.target.value })}
                      className="px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="아이템 이름 *"
                    />
                    <select
                      value={resultItem.pocket}
                      onChange={(event) => setResultItem({ ...resultItem, pocket: event.target.value })}
                      className="px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="berries">나무열매</option>
                      <option value="medicine">회복</option>
                      <option value="vitamins">영양</option>
                      <option value="misc">기타</option>
                    </select>
                  </div>

                  <textarea
                    value={resultItem.effect}
                    onChange={(event) => setResultItem({ ...resultItem, effect: event.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-y"
                    rows="3"
                    placeholder="효과 설명 *"
                  />

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={resultItem.spriteUrl}
                      onChange={(event) => setResultItem({ ...resultItem, spriteUrl: event.target.value })}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="이미지 URL 또는 선택"
                    />
                    <button
                      type="button"
                      onClick={() => setShowImagePicker(true)}
                      className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-1 text-sm text-gray-600 shrink-0"
                      title="public 이미지에서 선택"
                    >
                      <Image size={15} /> 선택
                    </button>
                    {resultItem.spriteUrl && (
                      <img src={resultItem.spriteUrl} alt="preview" className="w-9 h-9 object-contain border rounded shrink-0" style={{ imageRendering: 'pixelated' }} onError={e => { e.target.style.display = 'none'; }} />
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="resultCanSell"
                      checked={resultItem.canSell}
                      onChange={(event) => setResultItem({ ...resultItem, canSell: event.target.checked })}
                      className="w-4 h-4"
                    />
                    <label htmlFor="resultCanSell" className="text-xs font-semibold text-gray-700">판매 가능한 아이템</label>
                    {resultItem.canSell && (
                      <input
                        type="number"
                        min="0"
                        value={resultItem.sellPrice}
                        onChange={(event) => setResultItem({ ...resultItem, sellPrice: parseInt(event.target.value, 10) || 0 })}
                        className="w-24 ml-auto px-2 py-1 border border-gray-300 rounded text-xs"
                        placeholder="판매 가격"
                      />
                    )}
                  </div>

                  {/* 효과 종류 */}
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">효과 종류</label>
                    <div className="grid grid-cols-5 gap-1">
                      {RESULT_EFFECT_CATEGORIES.map(cat => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => selectResultEffectCategory(cat.id)}
                          className={`px-1.5 py-1.5 rounded text-[11px] font-semibold border transition-colors ${
                            resultEffectCategory === cat.id
                              ? 'bg-indigo-600 text-white border-indigo-600'
                              : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-100'
                          }`}
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {resultEffectCategory === 'friendship' && (
                    <div className="bg-pink-50 border border-pink-200 rounded p-2">
                      <label className="block text-[10px] text-pink-700 mb-1">친밀도 상승량</label>
                      <input
                        type="number"
                        min="0"
                        value={resultItem.friendshipBoost}
                        onChange={(event) => setResultItem({ ...resultItem, friendshipBoost: parseInt(event.target.value, 10) || 0 })}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                    </div>
                  )}

                  {resultEffectCategory === 'condition' && (
                    <div className="bg-green-50 border border-green-200 rounded p-2">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-semibold text-green-800">컨디션 증가</span>
                        <div className="flex gap-1">
                          {[['all', '전체 입력'], ['select', '선택 상승']].map(([mode, label]) => (
                            <button
                              key={mode}
                              type="button"
                              onClick={() => selectResultEffectMode('condition', mode)}
                              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold transition-colors ${
                                resultEffectMode === mode ? 'bg-green-600 text-white' : 'bg-white text-green-700 border border-green-300'
                              }`}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>
                      {resultEffectMode === 'all' ? (
                        <div className="grid grid-cols-5 gap-1">
                          {Object.keys(resultItem.conditionBoost).map((stat) => (
                            <div key={stat}>
                              <label className="block text-[10px] text-gray-500 mb-0.5">{conditionLabels[stat] || stat}</label>
                              <input
                                type="number"
                                min="0"
                                value={resultItem.conditionBoost[stat]}
                                onChange={(event) => setResultItem({
                                  ...resultItem,
                                  conditionBoost: {
                                    ...resultItem.conditionBoost,
                                    [stat]: parseInt(event.target.value, 10) || 0
                                  }
                                })}
                                className="w-full px-1 py-1 border border-gray-300 rounded text-xs"
                              />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex gap-3 items-center">
                          <p className="flex-1 text-xs text-green-700">사용 시 유저가 원하는 컨디션 항목을 직접 선택해 올립니다</p>
                          <div className="shrink-0">
                            <label className="block text-[10px] text-gray-500 mb-0.5">상승량</label>
                            <input type="number" min={1} value={resultItem.boostAmount}
                              onChange={e => setResultItem({ ...resultItem, boostAmount: parseInt(e.target.value) || 0 })}
                              className="w-16 px-2 py-1 border border-gray-300 rounded text-xs text-center" />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {resultEffectCategory === 'ev' && (
                    <div className="bg-purple-50 border border-purple-200 rounded p-2">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-semibold text-purple-800">노력치 증가</span>
                        <div className="flex gap-1">
                          {[['all', '전체 입력'], ['select', '선택 상승']].map(([mode, label]) => (
                            <button
                              key={mode}
                              type="button"
                              onClick={() => selectResultEffectMode('ev', mode)}
                              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold transition-colors ${
                                resultEffectMode === mode ? 'bg-purple-600 text-white' : 'bg-white text-purple-700 border border-purple-300'
                              }`}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>
                      {resultEffectMode === 'all' ? (
                        <div className="grid grid-cols-6 gap-1">
                          {Object.keys(resultItem.effortBoost).map((stat) => (
                            <div key={stat}>
                              <label className="block text-[10px] text-gray-500 mb-0.5">{effortLabels[stat] || stat}</label>
                              <input
                                type="number"
                                min="0"
                                value={resultItem.effortBoost[stat]}
                                onChange={(event) => setResultItem({
                                  ...resultItem,
                                  effortBoost: {
                                    ...resultItem.effortBoost,
                                    [stat]: parseInt(event.target.value, 10) || 0
                                  }
                                })}
                                className="w-full px-1 py-1 border border-gray-300 rounded text-xs"
                              />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex gap-3 items-center">
                          <p className="flex-1 text-xs text-purple-700">사용 시 유저가 원하는 노력치 항목을 직접 선택해 올립니다</p>
                          <div className="shrink-0">
                            <label className="block text-[10px] text-gray-500 mb-0.5">상승량</label>
                            <input type="number" min={1} value={resultItem.boostAmount}
                              onChange={e => setResultItem({ ...resultItem, boostAmount: parseInt(e.target.value) || 0 })}
                              className="w-16 px-2 py-1 border border-gray-300 rounded text-xs text-center" />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {resultEffectCategory === 'trainerExp' && (
                    <div className="bg-blue-50 border border-blue-200 rounded p-2 flex gap-3 items-center">
                      <p className="flex-1 text-xs text-blue-700">사용 시 포켓몬이 아닌 사용한 멤버 본인의 경험치가 상승합니다</p>
                      <div className="shrink-0">
                        <label className="block text-[10px] text-gray-500 mb-0.5">상승량</label>
                        <input type="number" min={1} value={resultItem.boostAmount}
                          onChange={e => setResultItem({ ...resultItem, boostAmount: parseInt(e.target.value) || 0 })}
                          className="w-16 px-2 py-1 border border-gray-300 rounded text-xs text-center" />
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-3 mt-2 border-t border-gray-200 flex justify-end shrink-0">
                  <Button variant="primary" size="md" onClick={handleSaveRecipe} className="px-8">
                    <Save size={16} />
                    <span>{editingRecipeId ? '레시피 수정' : '레시피 등록'}</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Layers size={24} /> 등록된 레시피 ({filteredRecipes.length}/{recipes.length}개)
          </h3>
          <div className="flex flex-wrap gap-2">
            {filterOptions.map((option) => (
              <button
                type="button"
                key={option.id}
                onClick={() => setRecipeFilter(option.id)}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                  recipeFilter === option.id
                    ? 'bg-emerald-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {option.label} ({option.count})
              </button>
            ))}
          </div>
        </div>

        {filteredRecipes.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <ChefHat size={64} className="mx-auto mb-3 text-gray-300" />
            <p>표시할 레시피가 없습니다</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {filteredRecipes.map((recipe) => {
              const supportsFixed = recipeSupports(recipe, 'fixed');
              const supportsStat = recipeSupports(recipe, 'stat');

              return (
                <div key={recipe.id} className="border-2 border-gray-200 rounded-xl bg-white flex flex-col relative group">
                  <button
                    type="button"
                    onClick={() => handleEditRecipe(recipe)}
                    className="absolute top-2 right-12 p-2 bg-emerald-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    title="레시피 편집"
                  >
                    <Edit2 size={20} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteRecipe(recipe.id)}
                    className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    title="레시피 삭제"
                  >
                    <Trash2 size={20} />
                  </button>

                  <div className="flex gap-3 p-4">
                    <div className="item-sprite flex items-center justify-center bg-gray-50 rounded-lg p-3 w-24 h-24 flex-shrink-0">
                      {recipe.result?.spriteUrl ? (
                        <img
                          src={recipe.result.spriteUrl}
                          alt={recipe.result.name}
                          className="max-w-full max-h-full object-contain"
                          style={{ imageRendering: 'pixelated' }}
                        />
                      ) : (
                        <ChefHat size={40} className="text-gray-300" />
                      )}
                    </div>

                    <div className="flex-1">
                      <h4 className="font-bold text-lg text-gray-800 mb-1">{recipe.result?.name || recipe.name}</h4>
                      <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-semibold mb-2 ${
                        supportsFixed && supportsStat
                          ? 'bg-emerald-100 text-emerald-700'
                          : supportsFixed
                            ? 'bg-indigo-100 text-indigo-700'
                            : 'bg-purple-100 text-purple-700'
                      }`}>
                        <span className="flex items-center gap-1">
                          {supportsFixed && supportsStat ? <Layers size={12} /> : supportsFixed ? <FileText size={12} /> : <BarChart3 size={12} />}
                          {supportsFixed && supportsStat ? '고정 + 스탯 레시피' : supportsFixed ? '고정 레시피' : '스탯 레시피'}
                        </span>
                      </span>
                      <p className="text-xs text-gray-600 line-clamp-3">
                        {recipe.result?.effect || '특별한 요리 아이템'}
                      </p>
                    </div>
                  </div>

                  <div className="bg-gray-50 px-4 py-3 mt-auto space-y-3">
                    {supportsFixed && recipe.ingredients?.length > 0 && (
                      <div>
                        <div className="font-semibold text-gray-700 mb-2 flex items-center gap-1 text-sm">
                          <Package size={16} /> 필요 재료
                        </div>
                        <div className="space-y-1">
                          {recipe.ingredients.map((ing, idx) => (
                            <div key={idx} className="flex justify-between text-gray-700 text-sm">
                              <span>{ing.name}</span>
                              <span className="font-semibold text-indigo-600">x{ing.count}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {supportsStat && (
                      <div className="space-y-3">
                        {recipe.requiredStats && Object.values(recipe.requiredStats).some((value) => value > 0) && (
                          <div>
                            <div className="font-semibold text-gray-700 mb-2 flex items-center gap-1 text-sm">
                              <BarChart3 size={16} /> 필요 컨디션
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              {Object.entries(recipe.requiredStats).map(([stat, value]) => (
                                value > 0 && (
                                  <div key={stat} className="text-gray-700 text-xs">
                                    <span>{conditionLabels[stat] || stat}</span>
                                    <span className="font-semibold text-purple-600 ml-1">{value}+</span>
                                  </div>
                                )
                              ))}
                            </div>
                          </div>
                        )}

                        {recipe.requiredEfforts && Object.values(recipe.requiredEfforts).some((value) => value > 0) && (
                          <div>
                            <div className="font-semibold text-gray-700 mb-2 flex items-center gap-1 text-sm">
                              <TrendingUp size={16} /> 필요 노력치
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              {Object.entries(recipe.requiredEfforts).map(([stat, value]) => (
                                value > 0 && (
                                  <div key={stat} className="text-gray-700 text-xs">
                                    <span>{effortLabels[stat] || stat}</span>
                                    <span className="font-semibold text-blue-600 ml-1">{value}+</span>
                                  </div>
                                )
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <ItemSelectorModal
        show={showItemModal}
        onClose={() => setShowItemModal(false)}
        onSelect={handleSelectIngredient}
        items={allItems}
        title="재료 선택"
        multiSelect={false}
        filterFn={isIngredientPickerCandidate}
      />

      {showImagePicker && (
        <PublicImagePicker
          onSelect={(src) => setResultItem(prev => ({ ...prev, spriteUrl: src }))}
          onClose={() => setShowImagePicker(false)}
        />
      )}
    </div>
  );
}
