import React, { useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChefHat, Book, Plus, Minus, Sparkles, X, Utensils, Package, Soup, BookOpen, HelpCircle, UtensilsCrossed } from 'lucide-react';
import recipesData from '../../data/recipes.json';

import { useGame } from '../../contexts/GameContext';
import { getItemPocket, ITEM_POCKETS } from '../../utils/itemUtils';
import useMediaQuery from '../../hooks/useMediaQuery';

const DEFAULT_ITEM_IMAGE = '/pokeball.png';

function stripCountSuffix(name = '') {
  return String(name).replace(/\s*\d+\s*개\s*$/, '').trim();
}

function getItemImageUrl(item = {}, allItems = []) {
  const rawName = stripCountSuffix(item.name || '');
const itemKeys = [item.itemId, item.id, item.nameEn, rawName]
    .filter((value) => value !== undefined && value !== null && String(value).trim() !== '')
    .map((value) => String(value).toLowerCase());

  const sourceItem = allItems.find((candidate) => {
    const candidateKeys = [candidate.id, candidate.itemId, candidate.nameEn, candidate.name]
      .filter((value) => value !== undefined && value !== null && String(value).trim() !== '')
      .map((value) => String(value).toLowerCase());

    return candidateKeys.some((key) => itemKeys.includes(key));
  });

  return (
    sourceItem?.spriteUrl ||
    sourceItem?.imageUrl ||
    sourceItem?.image ||
    item.spriteUrl ||
    item.imageUrl ||
    item.image ||
    sourceItem?.spriteUrl ||
    sourceItem?.imageUrl ||
    DEFAULT_ITEM_IMAGE
  );
}

function isCookingIngredient(item = {}) {
  const pocket = getItemPocket(item);
  const category = String(item.category || item.categoryData?.name || '').toLowerCase();

  return (
    pocket === ITEM_POCKETS.BERRIES ||
    pocket === ITEM_POCKETS.INGREDIENTS ||
    item.cooking?.isIngredient === true ||
    item.isIngredient === true ||
    category.includes('ingredient') ||
    category.includes('berries')
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
  const availableIngredients = userItems.filter(isCookingIngredient);

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
    return statRecipes.find(recipe =>
      Object.keys(recipe.requiredStats || {}).every(stat => (totalStats[stat] || 0) >= recipe.requiredStats[stat])
    );
  };

  const handleCook = () => {
    if (selectedIngredients.length === 0) { alert('재료를 선택해주세요!'); return; }
    let matchedRecipe = matchFixedRecipe();
    if (!matchedRecipe) matchedRecipe = matchStatRecipe();
    if (matchedRecipe) {
      onCook(matchedRecipe, selectedIngredients);
      setSelectedIngredients([]);
    } else {
      alert('❌ 레시피가 맞지 않습니다!\n다른 재료 조합을 시도해보세요.');
    }
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
  const { allItems = [] } = useGame();
  const [activeTab, setActiveTab] = useState('요리');
  const isMobile = useMediaQuery('(max-width: 768px)');

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
      <div key={recipe.id} className={`border-2 rounded-lg ${isDiscovered ? 'border-orange-300 bg-orange-50' : 'border-gray-300 bg-gray-50'}`}>
        {isDiscovered ? (
          <>
            <div className="px-3 py-2 border-b border-orange-200 flex items-center justify-between" style={{background:'rgba(40,80,30,0.85)'}}>
              <h3 className="text-base font-bold text-white">{recipe.name}</h3>
            </div>
            <div className="flex items-center justify-center gap-4 p-3">
              <div className="flex-shrink-0 mx-3 flex flex-col items-center gap-1">
                <PortalTooltip text={recipe.description}>
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
                            <div className="w-8 h-8 bg-white rounded-md border border-orange-200 flex items-center justify-center overflow-hidden">
                              <CookingItemImage item={enriched} allItems={[]} size={32} />
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
          </>
        ) : (
          <div style={{ minHeight: 80, padding: '16px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
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
        className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-scroll"
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

        <div className={`p-6 grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`} style={{ alignItems: 'start' }}>
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
      </div>
    </div>
  );
}
