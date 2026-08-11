import React, { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChefHat, Book, Plus, Minus, Sparkles, X, Utensils, Package, Soup, BookOpen, HelpCircle, Edit2 } from 'lucide-react';
import recipesData from '../../data/recipes.json';

import { useGame } from '../../contexts/GameContext';
import { getItemPocket, ITEM_POCKETS } from '../../utils/itemUtils';
import useMediaQuery from '../../hooks/useMediaQuery';

const DEFAULT_ITEM_IMAGE = '/pokeball.png';

// 같은 한글 문자열도 입력 경로(모바일 키보드 조합, 복사/붙여넣기 등)에 따라 유니코드 정규화
// 형태(NFC/NFD)가 달라질 수 있어, 눈으로는 완전히 같아 보이는 이름이 하나는 인벤토리 스냅샷에,
// 다른 하나는 관리자가 나중에 수정한 커스텀 아이템 카탈로그에 서로 다른 형태로 저장되면
// 문자열 비교가 조용히 실패한다. 매칭 전에 항상 NFC로 정규화한다.
function normalizeItemName(name = '') {
  return String(name).normalize('NFC');
}

function stripCountSuffix(name = '') {
  return normalizeItemName(name).replace(/\s*\d+\s*개\s*$/, '').trim();
}

const toKeyList = (values) => values
  .filter((value) => value !== undefined && value !== null && String(value).trim() !== '')
  .map((value) => normalizeItemName(value).toLowerCase());

// id/itemId, 한글 표시 이름, nameEn을 한 번에 뒤섞어서 찾지 않고 강도 순으로 단계별 매칭한다.
// nameEn은 커스텀 아이템을 만들 때 실제 포켓몬 아이템 이름을 그대로 흉내내는 일이 흔해서(예:
// "럭키의알" 커스텀 아이템에 nameEn "lucky-egg"를 넣는 경우) 공식 아이템(행복의알, nameEn도
// lucky-egg)과 충돌하기 쉽다. allItems는 공식 아이템이 커스텀 아이템보다 앞에 오므로, 모든
// 키를 동급으로 취급하면 이런 충돌에서 항상 공식 아이템이 먼저 잡혀 엉뚱한 이름/이미지가 뜬다.
// id → 한글 이름 → nameEn 순으로, 충돌 가능성이 낮은 식별자부터 시도한다.
function findCatalogItem(item = {}, allItems = []) {
  const idKeys = toKeyList([item.itemId, item.id]);
  if (idKeys.length > 0) {
    const idMatch = allItems.find((candidate) => (
      toKeyList([candidate.id, candidate.itemId]).some((key) => idKeys.includes(key))
    ));
    if (idMatch) return idMatch;
  }

  const rawName = stripCountSuffix(item.name || '');
  const nameKeys = toKeyList([rawName]);
  if (nameKeys.length > 0) {
    const nameMatch = allItems.find((candidate) => (
      toKeyList([candidate.name]).some((key) => nameKeys.includes(key))
    ));
    if (nameMatch) return nameMatch;
  }

  const nameEnKeys = toKeyList([item.nameEn]);
  if (nameEnKeys.length > 0) {
    return allItems.find((candidate) => (
      toKeyList([candidate.nameEn]).some((key) => nameEnKeys.includes(key))
    ));
  }

  return undefined;
}

// 인벤토리에 저장된 아이템 스냅샷의 imageUrl은 "지급받던 시점"의 카탈로그를 찍어둔 것이라,
// 관리자가 나중에 커스텀 아이템의 이미지를 바꿔도(특히 삭제 후 재생성) 갱신되지 않는다.
// 카탈로그 매칭에 성공했다면(sourceItem) 그 이미지를 항상 우선한다 - 매칭된 카탈로그가
// 이미지가 비어있다고 해서 스냅샷의 옛 이미지로 조용히 넘어가면, 관리자가 방금 바꾼 이미지가
// 아니라 예전에 지급됐을 때의 이미지가 뜨는 것처럼 보인다. 카탈로그를 아예 못 찾았을 때만
// (예: 삭제된 커스텀 아이템) 스냅샷 자체의 이미지로 대체한다.
function getItemImageUrl(item = {}, allItems = []) {
  const sourceItem = findCatalogItem(item, allItems);

  if (sourceItem) {
    return sourceItem.spriteUrl || sourceItem.imageUrl || sourceItem.image || DEFAULT_ITEM_IMAGE;
  }

  return item.spriteUrl || item.imageUrl || item.image || DEFAULT_ITEM_IMAGE;
}

// 레시피(관리자가 만든 요리 포함)의 재료 목록에 등장하는 이름들을 모아둔다.
// 커스텀 아이템(관리자 지급 재료, 레시피 결과물로 파생되는 아이템 등)은 category가
// "misc"로만 잡혀 있는 경우가 많아서 pocket/category 판정만으로는 재료로 인식되지 않는다.
// 실제로 어떤 레시피에서 재료로 쓰이고 있다면 그 자체가 "이건 재료다"라는 확실한 근거이므로,
// 이름 기반으로도 재료 여부를 판정한다.
function collectKnownIngredientNames(recipes = [], ingredientStats = []) {
  const names = new Set();
  recipes.forEach(recipe => {
    (recipe?.ingredients || []).forEach(ing => {
      if (ing?.name) names.add(normalizeItemName(ing.name));
    });
  });
  ingredientStats.forEach(stat => {
    if (stat?.name) names.add(normalizeItemName(stat.name));
  });
  return names;
}

// 인벤토리에 저장되는 아이템 스냅샷(useShop/useLoot 등)은 category/pocket 정도만 들고 있고
// 카탈로그(items.json)의 cooking.isIngredient 플래그는 복사하지 않는다. 그래서 인벤토리
// 아이템만 보고 판단하면 "맛있는물"처럼 cooking.isIngredient로만 재료 판정되는 아이템은
// 항상 재료 목록에서 빠진다 - allItems에서 원본 카탈로그 아이템을 찾아 같이 확인한다.
function isCookingIngredient(item = {}, allItems = [], knownIngredientNames = new Set()) {
  const catalogItem = findCatalogItem(item, allItems) || {};

  // 관리자가 커스텀 아이템의 cooking.isIngredient를 명시적으로 false로 지정한 경우, 이름이
  // 우연히 다른 레시피의 재료 이름(예: 공식 "오랭열매")과 같더라도 재료 목록에 넣지 않는다.
  // (아래 이름 기반 매칭은 원래 isIngredient 플래그가 없는 아이템을 구제하기 위한 것이라,
  //  명시적 false보다 우선하면 안 됨)
  // ⚠️ isCustom인 경우로만 한정한다 - items.json의 공식 아이템은 샌드위치류가 아니면
  // cooking.isIngredient가 기본값 false로 깔려있을 뿐이라, isCustom 체크 없이 적용하면
  // 실제로 오란다 레시피 재료로 쓰이는 공식 나무열매(오랭열매 등 67종)까지 전부 목록에서 빠진다.
  if ((item.isCustom && item.cooking?.isIngredient === false) ||
      (catalogItem.isCustom && catalogItem.cooking?.isIngredient === false)) {
    return false;
  }

  const rawName = stripCountSuffix(item.name || '');
  const isKnownIngredientName = knownIngredientNames.has(rawName) || knownIngredientNames.has(normalizeItemName(item.name || ''));

  // 완성된 요리(오란다 등) 자체는 재료가 아니라 완제품이다. 어떤 레시피가 실제로 그 이름을
  // 재료로 지정해두지 않는 한(예: 오란다를 넣어야 하는 다른 요리가 생기는 경우), 오래된
  // pocket:"berries" 스냅샷이 인벤토리에 남아있어도 재료 목록에 다시 뜨지 않는다.
  const isCookedDishResult = item.isCooked === true || catalogItem.isRecipe === true || catalogItem.__customItemSource === 'recipe';
  if (isCookedDishResult && !isKnownIngredientName) {
    return false;
  }

  const pocket = getItemPocket(item);
  const catalogPocket = getItemPocket(catalogItem);
  const category = String(item.category || item.categoryData?.name || '').toLowerCase();
  const catalogCategory = String(catalogItem.category || catalogItem.categoryData?.name || '').toLowerCase();

  return (
    pocket === ITEM_POCKETS.BERRIES ||
    pocket === ITEM_POCKETS.INGREDIENTS ||
    catalogPocket === ITEM_POCKETS.BERRIES ||
    catalogPocket === ITEM_POCKETS.INGREDIENTS ||
    item.cooking?.isIngredient === true ||
    item.isIngredient === true ||
    catalogItem.cooking?.isIngredient === true ||
    category.includes('ingredient') ||
    category.includes('berries') ||
    catalogCategory.includes('ingredient') ||
    catalogCategory.includes('berries') ||
    isKnownIngredientName
  );
}

function CookingItemImage({ item, allItems, size = 48 }) {
  const [failed, setFailed] = useState(false);
  const imageUrl = getItemImageUrl(item, allItems);

  return (
    <span style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      {!failed && imageUrl ? (
        <img
          src={imageUrl}
          alt={item?.name || ''}
          onError={() => setFailed(true)}
          style={{ width: size, height: size, objectFit: 'contain', imageRendering: 'pixelated' }}
        />
      ) : (
        <Package size={size * 0.6} style={{ color: '#ccc' }} />
      )}
    </span>
  );
}

function recipeSupports(recipe, type) {
  if (!recipe) return false;
  if (Array.isArray(recipe.types)) return recipe.types.includes(type);
  if (recipe.type === 'both') return true;
  return recipe.type === type;
}

export default function CookingView() {
  const { recipes, discoveredRecipes, cookRecipe: onCook, items: userItems, allItems = [] } = useGame();
  const [selectedIngredients, setSelectedIngredients] = useState([]);
  const [showRecipeBook, setShowRecipeBook] = useState(false);
  const isMobile = useMediaQuery('(max-width: 768px)');

  const fixedRecipes = recipes.filter(r => recipeSupports(r, 'fixed'));
  const statRecipes = Array.from(new Map(
    [
      ...recipes.filter(r => recipeSupports(r, 'stat')),
      ...(recipesData.statBasedRecipes || []),
    ].map(recipe => [recipe.id, recipe])
  ).values());
  const ingredientStats = recipesData.ingredientStats || [];
  const knownIngredientNames = collectKnownIngredientNames(recipes, ingredientStats);
  const availableIngredients = userItems.filter(item => isCookingIngredient(item, allItems, knownIngredientNames));

  const totalIngredientCount = selectedIngredients.reduce((sum, i) => sum + i.count, 0);

  const addIngredient = (item) => {
    if (totalIngredientCount >= 3) {
      alert('재료는 최대 3개까지만 사용할 수 있습니다!');
      return;
    }
    const existing = selectedIngredients.find(i => i.name === item.name);
    if (existing) {
      if (existing.count >= item.count) {
        alert('보유한 수량을 초과할 수 없습니다!');
        return;
      }
      setSelectedIngredients(selectedIngredients.map(i => i.name === item.name ? { ...i, count: i.count + 1 } : i));
    } else {
      setSelectedIngredients([...selectedIngredients, { ...item, count: 1 }]);
    }
  };

  const removeIngredient = (itemName) => {
    setSelectedIngredients(prev => {
      const item = prev.find(i => i.name === itemName);
      if (item.count > 1) return prev.map(i => i.name === itemName ? { ...i, count: i.count - 1 } : i);
      return prev.filter(i => i.name !== itemName);
    });
  };

  const matchFixedRecipe = () => {
    return fixedRecipes.find(recipe => {
      if (!recipe.ingredients || recipe.ingredients.length !== selectedIngredients.length) return false;
      return recipe.ingredients.every(recipeIng => {
        const userIng = selectedIngredients.find(i => i.name === recipeIng.name);
        return userIng && userIng.count === recipeIng.count;
      });
    });
  };

  const matchStatRecipe = () => {
    const totalStats = { elegance: 0, beauty: 0, cuteness: 0, intelligence: 0, strength: 0, power: 0, sweetness: 0 };
    selectedIngredients.forEach(ing => {
      const ingredientStat = ingredientStats.find(s => s.name === ing.name);
      if (ingredientStat?.stats) {
        Object.keys(ingredientStat.stats).forEach(stat => {
          totalStats[stat] = (totalStats[stat] || 0) + (ingredientStat.stats[stat] * ing.count);
        });
      }
    });

    const matchingRecipes = statRecipes.filter(recipe =>
      Object.keys(recipe.requiredStats || {}).every(stat => (totalStats[stat] || 0) >= recipe.requiredStats[stat])
    );
    if (matchingRecipes.length === 0) return undefined;

    // 여러 티어가 동시에 조건을 만족할 수 있어(예: 매운맛 55 → 기본/고급/특제 오란다 모두 통과),
    // 요구 수치 합이 가장 높은(=가장 상위 티어) 레시피를 고른다. statRecipes 배열 순서(find의
    // 첫 매치)에 의존하면 레시피 나열 순서가 바뀌거나 관리자가 레시피를 새로 추가할 때
    // 하위 티어가 먼저 매칭되는 회귀가 생길 수 있다.
    const getThreshold = (recipe) => Object.values(recipe.requiredStats || {}).reduce((sum, v) => sum + v, 0);
    const maxThreshold = Math.max(...matchingRecipes.map(getThreshold));
    const topRecipes = matchingRecipes.filter(recipe => getThreshold(recipe) === maxThreshold);

    // 베리잼처럼 서로 다른 맛 스탯에 같은 값을 주는 재료 탓에 요구 수치 합까지 동률로
    // 부딪히는 경우(예: 귀여움 60 = 힘 60 → 단맛/신맛 특제 오란다 동시 충족)엔 우열을 가릴
    // 근거가 없으므로 동률 후보 중 하나를 무작위로 뽑는다.
    return topRecipes[Math.floor(Math.random() * topRecipes.length)];
  };

  const FAIL_ITEMS = [
    {
      id: 'fail_thingX',
      name: '물체X',
      nameEn: 'thingX',
      pocket: 'misc',
      category: 'misc',
      effect: '이것은... 무어라 불러야 좋을까. 일단 물체라고 하자.',
      spriteUrl: 'img/items/foods/messed3.png',
      canSell: true,
      sellPrice: 10,
      isFailureItem: true,
    },
    {
      id: 'fail_muk_like_thing',
      name: '요리...?',
      nameEn: 'muk-like-thing',
      pocket: 'misc',
      category: 'misc',
      effect: '질뻐기를 떠오르게 하는 요리. 어쩐지 해독제가 필요해질 것 같다.',
      spriteUrl: 'img/items/foods/messed1.png',
      canSell: true,
      sellPrice: 10,
      isFailureItem: true,
    },
    {
      id: 'fail_trubbish_like_thing',
      name: '음식...?',
      nameEn: 'Trubbish-like-thing',
      pocket: 'misc',
      category: 'misc',
      effect: '깨봉이를 떠오르게 하는 음식. 어쩐지 해독제가 필요해질 것 같다.',
      spriteUrl: 'img/items/foods/messed2.png',
      canSell: true,
      sellPrice: 10,
      isFailureItem: true,
    },
  ];

  const normalizeItemKey = (value) => String(value || '').trim().toLowerCase();

  const itemMatchesKey = (item, key) => {
    const target = normalizeItemKey(key);
    return [item.id, item.itemId, item.nameEn, item.name]
      .some((value) => normalizeItemKey(value) === target);
  };

  const findFailItem = (nameEn) => (
    allItems.find((item) => itemMatchesKey(item, nameEn)) ||
    FAIL_ITEMS.find((item) => itemMatchesKey(item, nameEn))
  );

  const handleCook = async () => {
    if (selectedIngredients.length === 0) { alert('재료를 선택해주세요!'); return; }
    let matchedRecipe = matchFixedRecipe();
    if (!matchedRecipe) matchedRecipe = matchStatRecipe();
    if (matchedRecipe) {
      await onCook(matchedRecipe, selectedIngredients);
    } else {
      const failNames = FAIL_ITEMS.map((item) => item.nameEn);
      const failNameEn = failNames[Math.floor(Math.random() * failNames.length)];
      // Prefer admin-registered failure items, then fall back to the built-in definitions.
      const failItem = findFailItem(failNameEn);
      if (!failItem) {
        alert(`요리 실패 아이템(${failNameEn})이 아직 등록되어 있지 않습니다. 관리자에게 문의해주세요.`);
        setSelectedIngredients([]);
        return;
      }
      const failRecipe = {
        id: `fail_${Date.now()}`,
        name: failItem.name,
        result: failItem,
      };
      const result = await onCook(failRecipe, selectedIngredients);
      if (result?.success) {
        const trainerName = result.trainerName || '트레이너';
        alert(`${trainerName}가 요리에 실패했다! ${failItem.name}가 만들어졌다...!`);
      }
    }
    setSelectedIngredients([]);
  };

  if (isMobile) {
    return (
      <div style={{ padding: '14px 14px 100px', minHeight: '100%' }}>

        {/* 요리 냄비 (선택된 재료) */}
        <div style={{
          background: 'rgba(255,255,255,0.85)', borderRadius: 16,
          border: '1.5px solid rgba(200,230,140,0.5)', padding: '14px 14px 10px',
          marginBottom: 12, boxShadow: '0 1px 6px rgba(0,0,0,0.06)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontWeight: 800, fontSize: 14, color: '#1a2e10', display: 'flex', alignItems: 'center', gap: 6 }}>
              <ChefHat size={16} style={{ color: '#4a7a08' }} /> 요리 냄비
            </span>
            <span style={{ fontSize: 12, color: '#888' }}>{totalIngredientCount}/3</span>
          </div>

          {selectedIngredients.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '18px 0', color: '#aaa' }}>
              <Soup size={32} style={{ margin: '0 auto 6px' }} />
              <p style={{ fontSize: 13 }}>재료를 선택해주세요</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
              {selectedIngredients.map((item, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  background: '#fff7ed', borderRadius: 10, padding: '8px 10px',
                  border: '1.5px solid #fed7aa',
                }}>
                  <CookingItemImage item={item} allItems={allItems} size={64} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: '#1a2e10' }}>{item.name}</div>
                    <div style={{ fontSize: 11, color: '#888' }}>사용: {item.count}개</div>
                  </div>
                  <button onClick={() => removeIngredient(item.name)} style={{
                    background: '#ef4444', color: '#fff', border: 'none', borderRadius: 8,
                    width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                  }}>
                    <Minus size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {selectedIngredients.length > 0 && (
            <button onClick={handleCook} style={{
              width: '100%', padding: '12px', borderRadius: 12,
              border: '2px solid #84cc16', background: 'rgba(255,255,255,0.7)',
              color: '#1a2e10', fontWeight: 800, fontSize: 15, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
            }}>
              <Sparkles size={18} style={{ color: '#4a7a08' }} />요리!
            </button>
          )}
        </div>

        {/* 재료 선택 */}
        <div style={{
          background: 'rgba(255,255,255,0.85)', borderRadius: 16,
          border: '1.5px solid rgba(200,230,140,0.5)', padding: '14px',
          boxShadow: '0 1px 6px rgba(0,0,0,0.06)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontWeight: 800, fontSize: 14, color: '#1a2e10', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Utensils size={16} style={{ color: '#4a7a08' }} /> 재료 선택
            </span>
            <span style={{ fontSize: 12, color: '#888' }}>{availableIngredients.length}종</span>
          </div>

          {availableIngredients.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: '#aaa' }}>
              <Package size={36} style={{ margin: '0 auto 8px' }} />
              <p style={{ fontSize: 13 }}>사용 가능한 재료가 없습니다</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
              {availableIngredients.map((item, i) => (
                <button key={i} onClick={() => addIngredient(item)} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: '#f9fafb', borderRadius: 10, padding: '8px 10px',
                  border: '1.5px solid #e5e7eb', cursor: 'pointer', textAlign: 'left',
                  transition: 'border-color 0.15s',
                }}>
                  <CookingItemImage item={item} allItems={allItems} size={64} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 12, color: '#1a2e10', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
                    <div style={{ fontSize: 11, color: '#888' }}>×{item.count}</div>
                  </div>
                  <Plus size={14} style={{ color: '#ea580c', flexShrink: 0 }} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 레시피 북 버튼 */}
        <button onClick={() => setShowRecipeBook(true)} style={{
          width: '100%', marginTop: 12, padding: '12px',
          border: '2px solid rgba(132,204,22,0.5)', borderRadius: 12,
          background: 'rgba(255,255,255,0.75)', color: '#1a2e10',
          fontWeight: 700, fontSize: 14, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          <Book size={16} style={{ color: '#4a7a08' }} />레시피 북
        </button>

        {showRecipeBook && (
          <RecipeBookModal recipes={recipes} discoveredRecipes={discoveredRecipes} onClose={() => setShowRecipeBook(false)} />
        )}
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 p-6">
      {/* 헤더 */}
      <div className="rounded-lg border-2 border-lime-300 bg-white/55 p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <ChefHat size={48} className="text-lime-700" />
            <div>
              <h1 className="text-3xl font-bold mb-2 text-green-950">요리</h1>
              <p className="text-green-800">재료를 조합해 요리를 만들어보세요!</p>
            </div>
          </div>
          <button
            onClick={() => setShowRecipeBook(true)}
            className="border-2 border-lime-300 bg-white/65 text-green-950 px-6 py-3 rounded-lg hover:bg-lime-100/70 font-bold transition-all flex items-center gap-2 shadow-sm"
          >
            <Book size={20} />
            레시피 북
          </button>
        </div>
      </div>


      <div className="grid grid-cols-2 gap-6">
        {/* 왼쪽: 재료 선택 */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Utensils size={22} /> 재료 선택
            <span className="text-sm text-gray-500 ml-2">({availableIngredients.length}개)</span>
          </h3>
          {availableIngredients.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Package size={56} className="mx-auto mb-4" />
              <p className="font-semibold">사용 가능한 재료가 없습니다!</p>
              <p className="text-sm mt-2">아이템을 구해보세요.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-2">
              {availableIngredients.map((item, i) => (
                <button key={i} onClick={() => addIngredient(item)}
                  className="flex items-center gap-2 bg-gray-50 rounded-lg p-3 border-2 border-gray-200 hover:border-orange-400 hover:bg-orange-50 transition-all text-left"
                >
                  <CookingItemImage item={item} allItems={allItems} size={64} />
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm text-gray-800 truncate">{item.name}</div>
                    <div className="text-xs text-gray-500">보유: {item.count}개</div>
                  </div>
                  <Plus size={16} className="text-orange-500 flex-shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 오른쪽: 선택된 재료 & 요리 */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <ChefHat size={22} /> 요리 냄비
          </h3>
          {selectedIngredients.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Soup size={56} className="mx-auto mb-4" />
              <p>재료를 선택해주세요!</p>
              <p className="text-sm mt-2">(최소 1개, 최대 3개)</p>
            </div>
          ) : (
            <>
              <div className="space-y-3 mb-6">
                {selectedIngredients.map((item, i) => (
                  <div key={i} className="flex items-center gap-3 bg-orange-50 rounded-lg p-3 border-2 border-orange-200">
                    <CookingItemImage item={item} allItems={allItems} size={64} />
                    <div className="flex-1">
                      <div className="font-bold text-gray-800">{item.name}</div>
                      <div className="text-sm text-gray-600">사용: {item.count}개</div>
                    </div>
                    <button onClick={() => removeIngredient(item.name)}
                      className="bg-red-500 text-white p-2 rounded-lg hover:bg-red-600 transition-colors"
                    >
                      <Minus size={16} />
                    </button>
                  </div>
                ))}
              </div>
              <button onClick={handleCook}
                className="w-full border-2 border-lime-300 bg-white/55 text-green-950 py-4 rounded-lg hover:bg-lime-100/70 font-bold text-lg transition-all shadow-sm flex items-center justify-center gap-2"
              >
                <Sparkles size={20} />
                요리!
              </button>
            </>
          )}
        </div>
      </div>

      {showRecipeBook && (
        <RecipeBookModal recipes={recipes} discoveredRecipes={discoveredRecipes} onClose={() => setShowRecipeBook(false)} />
      )}
    </div>
  );
}

function PortalTooltip({ text, children }) {
  const [pos, setPos] = useState(null);
  const ref = useRef(null);

  const handleMouseEnter = useCallback(() => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    setPos({ x: rect.left + rect.width / 2, y: rect.top });
  }, []);

  const handleMouseLeave = useCallback(() => setPos(null), []);

  return (
    <div ref={ref} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} style={{ position: 'relative', display: 'inline-block' }}>
      {children}
      {pos && text && createPortal(
        <div style={{
          position: 'fixed',
          left: pos.x,
          top: pos.y - 8,
          transform: 'translate(-50%, -100%)',
          zIndex: 9999,
          pointerEvents: 'none',
          background: '#1f2937',
          color: '#fff',
          fontSize: 12,
          borderRadius: 8,
          padding: '8px 12px',
          maxWidth: 200,
          textAlign: 'center',
          lineHeight: 1.5,
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          whiteSpace: 'pre-wrap',
          wordBreak: 'keep-all',
        }}>
          {text}
          <div style={{
            position: 'absolute',
            top: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 0,
            height: 0,
            borderLeft: '6px solid transparent',
            borderRight: '6px solid transparent',
            borderTop: '6px solid #1f2937',
          }} />
        </div>,
        document.body
      )}
    </div>
  );
}

function ResultItemImage({ imageUrl }) {
  const [failed, setFailed] = useState(false);
  return (
    <div style={{ width: 64, height: 64, padding: 4, background: '#fff', borderRadius: 8, border: '2px solid #fdba74', display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' }}>
      {!failed && imageUrl ? (
        <img
          src={imageUrl}
          alt=""
          onError={() => setFailed(true)}
          style={{ width: '100%', height: '100%', objectFit: 'contain', imageRendering: 'pixelated' }}
        />
      ) : (
        <Package size={28} style={{ color: '#ccc' }} />
      )}
    </div>
  );
}

function RecipeBookModal({ recipes, discoveredRecipes, onClose }) {
  const { allItems = [], recipeMemos = {}, updateRecipeMemo, currentUser } = useGame();
  const [activeTab, setActiveTab] = useState('요리');
  const isMobile = useMediaQuery('(max-width: 768px)');
  const recipeGridRef = useRef(null);
  const [recipeScrollbar, setRecipeScrollbar] = useState({ visible: false, height: 0, top: 0 });
  const [editingMemoRecipeId, setEditingMemoRecipeId] = useState(null);
  const [memoText, setMemoText] = useState('');

  const handleEditMemo = (recipe) => {
    const entry = recipeMemos[recipe.id];
    if (entry?.firstDiscoverer !== currentUser?.name) {
      alert('최초 발견자만 메모를 작성할 수 있습니다!');
      return;
    }
    setMemoText(entry?.memo || '');
    setEditingMemoRecipeId(recipe.id);
  };

  const handleSaveMemo = (recipe) => {
    if (!updateRecipeMemo) return;
    const entry = recipeMemos[recipe.id];
    if (entry?.firstDiscoverer !== currentUser?.name) {
      alert('최초 발견자만 메모를 작성할 수 있습니다!');
      return;
    }
    updateRecipeMemo(recipe.id, memoText.trim());
    setEditingMemoRecipeId(null);
  };

  const updateRecipeScrollbar = useCallback(() => {
    const el = recipeGridRef.current;
    if (!el) return;
    const maxScroll = el.scrollHeight - el.clientHeight;
    if (maxScroll <= 1) { setRecipeScrollbar({ visible: false, height: 0, top: 0 }); return; }
    const trackHeight = Math.max(el.clientHeight - 16, 0);
    const thumbHeight = Math.max(36, Math.round((el.clientHeight / el.scrollHeight) * trackHeight));
    const thumbTravel = Math.max(trackHeight - thumbHeight, 1);
    const thumbTop = 8 + Math.round((el.scrollTop / maxScroll) * thumbTravel);
    setRecipeScrollbar({ visible: true, height: thumbHeight, top: thumbTop });
  }, []);

  const handleRecipeScrollbarMouseDown = useCallback((e) => {
    const el = recipeGridRef.current;
    if (!el || !recipeScrollbar.visible) return;
    e.preventDefault();
    e.stopPropagation();
    const startY = e.clientY;
    const startScrollTop = el.scrollTop;
    const maxScroll = el.scrollHeight - el.clientHeight;
    const trackHeight = Math.max(el.clientHeight - 16, 0);
    const thumbTravel = Math.max(trackHeight - recipeScrollbar.height, 1);
    const handleMove = (mv) => { el.scrollTop = startScrollTop + ((mv.clientY - startY) / thumbTravel) * maxScroll; updateRecipeScrollbar(); };
    const handleUp = () => { document.removeEventListener('mousemove', handleMove); document.removeEventListener('mouseup', handleUp); };
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
  }, [recipeScrollbar, updateRecipeScrollbar]);

  useEffect(() => {
    updateRecipeScrollbar();
    const el = recipeGridRef.current;
    if (!el) return;
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateRecipeScrollbar) : null;
    ro?.observe(el);
    return () => ro?.disconnect();
  }, [updateRecipeScrollbar, activeTab]);

  const recipeArr = Array.isArray(recipes) ? recipes : Object.values(recipes);
  const discoveredArr = Array.isArray(discoveredRecipes) ? discoveredRecipes : Object.values(discoveredRecipes || {});

  const getRecipeCategory = (r) => {
    if (r.category && r.category !== '요리') return r.category;
    if (r.name?.includes('오란다')) return '오란다';
    return r.category || '요리';
  };

  const tabRecipes = recipeArr.filter(r => getRecipeCategory(r) === activeTab);

  const tabs = ['요리', '오란다'];

  const renderRecipeCard = (recipe) => {
    const isDiscovered = discoveredArr.includes(recipe.id);
    return (
      <div key={recipe.id} className={`border-2 rounded-lg ${isDiscovered ? 'border-orange-300 bg-orange-50' : 'border-gray-300 bg-gray-50'}`} style={{ display: 'flex', flexDirection: 'column' }}>
        {isDiscovered ? (
          <>
            <div className="px-3 py-2 border-b border-orange-200 flex items-center justify-between" style={{background:'rgba(40,80,30,0.85)'}}>
              <h3 className="text-base font-bold text-white">{recipe.name}</h3>
            </div>
            <div className="flex items-center justify-center gap-4 p-3">
              <div className="flex-shrink-0 mx-3 flex flex-col items-center gap-1">
                <PortalTooltip text={recipe.result?.effect}>
                  <ResultItemImage imageUrl={getItemImageUrl(recipe.result, allItems)} />
                </PortalTooltip>
              </div>
              <div className="flex-1 min-w-0">
                {recipeSupports(recipe, 'fixed') && recipe.ingredients && (
                  <div className="flex items-center flex-wrap gap-1">
                    {(Array.isArray(recipe.ingredients) ? recipe.ingredients : Object.values(recipe.ingredients || {})).map((ing, i) => {
                      const ingName = stripCountSuffix(ing.name || '');
                      const matched = allItems.find(a => stripCountSuffix(a.name || '') === ingName);
                      const enriched = matched ? { ...ing, name: ingName, spriteUrl: matched.spriteUrl, imageUrl: matched.imageUrl } : { ...ing, name: ingName };
                      return (
                        <React.Fragment key={i}>
                          {i > 0 && <span className="text-sm font-bold text-gray-400">+</span>}
                          <div className="flex flex-col items-center gap-0.5">
                            <div style={{ width: 32, height: 32, padding: 2, background: '#fff', borderRadius: 6, border: '1px solid #fcd9a0', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', boxSizing: 'border-box' }}>
                              <CookingItemImage item={enriched} allItems={[]} size={28} />
                            </div>
                            <span className="text-xs text-gray-500 whitespace-nowrap">{ingName} {ing.count}개</span>
                          </div>
                        </React.Fragment>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
            {(() => {
              const memoEntry = recipeMemos[recipe.id];
              const canEditMemo = memoEntry?.firstDiscoverer === currentUser?.name;
              const isEditingThis = editingMemoRecipeId === recipe.id;
              if (!memoEntry?.firstDiscoverer && !isEditingThis) return null;
              return (
                <div className="px-3 pb-2">
                  {isEditingThis ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={memoText}
                        onChange={(e) => setMemoText(e.target.value)}
                        placeholder="이 레시피에 대한 한 줄 메모..."
                        maxLength="60"
                        autoFocus
                        className="flex-1 min-w-0 rounded border border-orange-300 bg-white px-2 py-1 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-orange-400"
                      />
                      <button
                        onClick={() => handleSaveMemo(recipe)}
                        className="shrink-0 rounded bg-orange-500 px-2 py-1 text-xs font-semibold text-white hover:bg-orange-600"
                      >
                        저장
                      </button>
                      <button
                        onClick={() => setEditingMemoRecipeId(null)}
                        className="shrink-0 rounded bg-gray-200 px-2 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-300"
                      >
                        취소
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-xs italic text-gray-500">
                      <span className="truncate">
                        {memoEntry.memo ? `"${memoEntry.memo}"` : (canEditMemo ? '메모를 남겨보세요' : '')}
                      </span>
                      {canEditMemo && (
                        <button
                          onClick={() => handleEditMemo(recipe)}
                          className="shrink-0 text-gray-400 hover:text-orange-600"
                        >
                          <Edit2 size={12} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}
          </>
        ) : (
          <div style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <HelpCircle size={16} className="text-gray-400 flex-shrink-0" />
              <p className="text-sm font-bold text-gray-700">{recipe.name}</p>
            </div>
            <p className="text-xs font-semibold text-gray-400">미발견 레시피</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg w-full max-w-4xl flex flex-col"
        style={{ maxHeight: '90vh', minHeight: '70vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 border-b-2 border-lime-300 bg-white/95 text-green-950 p-6 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <Book size={32} className="text-lime-700" />
            <div>
              <h2 className="text-2xl font-bold">레시피 북</h2>
              <p className="text-green-800 text-sm">발견한 레시피: {discoveredArr.length}개</p>
            </div>
          </div>
          <button onClick={onClose} className="text-green-950 hover:bg-lime-100/70 p-2 rounded-lg transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* 카테고리 탭 */}
        <div className="flex border-b border-gray-200 px-6 pt-4">
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-2 font-bold text-sm transition-all border-b-2 ${
                activeTab === tab
                  ? 'border-lime-500 text-lime-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div style={{ position: 'relative', flex: '1 1 auto', minHeight: 0 }}>
          <div
            ref={recipeGridRef}
            onScroll={updateRecipeScrollbar}
            className={`p-6 grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}
            style={{ position: 'absolute', inset: 0, overflowY: 'scroll', scrollbarWidth: 'none', boxSizing: 'border-box', alignContent: 'start' }}
          >
            {tabRecipes.length === 0 ? (
              <div className="col-span-2 text-center py-12 text-gray-400">
                <BookOpen size={56} className="mx-auto mb-4" />
                <p className="font-semibold">등록된 레시피가 없습니다!</p>
                <p className="text-sm mt-2">관리자가 레시피를 등록하면 여기에 표시됩니다.</p>
              </div>
            ) : (
              tabRecipes.map(renderRecipeCard)
            )}
          </div>
          {recipeScrollbar.visible && (
            <div style={{ position: 'absolute', top: 0, right: 4, bottom: 0, width: 8, zIndex: 5, pointerEvents: 'auto' }}>
              <div
                onMouseDown={handleRecipeScrollbarMouseDown}
                style={{
                  position: 'absolute',
                  width: 6,
                  borderRadius: 999,
                  background: 'rgba(41, 88, 30, 0.55)',
                  cursor: 'grab',
                  height: recipeScrollbar.height,
                  transform: `translateY(${recipeScrollbar.top}px)`,
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
