import React, { useState } from 'react';
import { ChefHat, Book, Plus, Minus, Sparkles, X, ClipboardList, Dice5, Utensils, Package, Soup, BookOpen, HelpCircle } from 'lucide-react';
import recipesData from '../../data/recipes.json';

import { useGame } from '../../contexts/GameContext';
import { getItemPocket, ITEM_POCKETS } from '../../utils/itemUtils';
import useMediaQuery from '../../hooks/useMediaQuery';

const DEFAULT_ITEM_IMAGE = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png';

function getItemImageUrl(item = {}, allItems = []) {
  const itemKeys = [item.itemId, item.id, item.nameEn, item.name]
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
  const { recipes, discoveredRecipes, cookRecipe: onCook, items: userItems } = useGame();
  const { allItems = [] } = useGame();
  const [selectedIngredients, setSelectedIngredients] = useState([]);
  const [showRecipeBook, setShowRecipeBook] = useState(false);
  const [cookingMode, setCookingMode] = useState('fixed');
  const isMobile = useMediaQuery('(max-width: 768px)');

  const fixedRecipes = recipes.filter(r => recipeSupports(r, 'fixed'));
  const statRecipes = [
    ...recipes.filter(r => recipeSupports(r, 'stat')),
    ...(recipesData.statBasedRecipes || []),
  ];
  const ingredientStats = recipesData.ingredientStats || [];
  const availableIngredients = userItems.filter(isCookingIngredient);

  const addIngredient = (item) => {
    if (selectedIngredients.length >= 3) {
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
      <div style={{ padding: '72px 14px 100px', minHeight: '100%' }}>
        {/* 헤더 */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 16,
          background: 'rgba(255,255,255,0.82)', backdropFilter: 'blur(6px)',
          borderRadius: 24, padding: '7px 16px 7px 12px',
          boxShadow: '0 1px 8px rgba(0,0,0,0.10)',
        }}>
          <ChefHat size={20} style={{ color: '#4a7a08' }} />
          <span style={{ fontSize: 18, fontWeight: 800, color: '#1a2e10' }}>요리하기</span>
        </div>

        {/* 모드 선택 */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {[
            { id: 'fixed', label: '정해진 레시피', icon: <ClipboardList size={16} />, color: '#ea580c', activeBg: '#ea580c' },
            { id: 'stat', label: '자유 실험', icon: <Dice5 size={16} />, color: '#9333ea', activeBg: '#9333ea' },
          ].map(m => (
            <button key={m.id} onClick={() => setCookingMode(m.id)} style={{
              flex: 1, padding: '10px 8px', borderRadius: 12, border: `2px solid ${cookingMode === m.id ? m.color : 'rgba(0,0,0,0.12)'}`,
               background: cookingMode === m.id ? m.activeBg : 'rgba(255,255,255,0.75)',
              color: cookingMode === m.id ? '#fff' : '#555',
              fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            }}>
              {m.icon}{m.label}
            </button>
          ))}
        </div>

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
            <span style={{ fontSize: 12, color: '#888' }}>{selectedIngredients.length}/3</span>
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
                  <CookingItemImage item={item} allItems={allItems} size={40} />
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
              <Sparkles size={18} style={{ color: '#4a7a08' }} />요리하기!
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
                  <CookingItemImage item={item} allItems={allItems} size={40} />
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

        {/* 레시피 도감 버튼 */}
        <button onClick={() => setShowRecipeBook(true)} style={{
          width: '100%', marginTop: 12, padding: '12px',
          border: '2px solid rgba(132,204,22,0.5)', borderRadius: 12,
          background: 'rgba(255,255,255,0.75)', color: '#1a2e10',
          fontWeight: 700, fontSize: 14, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          <Book size={16} style={{ color: '#4a7a08' }} />레시피 도감
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
              <h1 className="text-3xl font-bold mb-2 text-green-950">요리하기</h1>
              <p className="text-green-800">재료를 조합해서 특별한 아이템을 만들어보세요!</p>
            </div>
          </div>
          <button
            onClick={() => setShowRecipeBook(true)}
            className="border-2 border-lime-300 bg-white/65 text-green-950 px-6 py-3 rounded-lg hover:bg-lime-100/70 font-bold transition-all flex items-center gap-2 shadow-sm"
          >
            <Book size={20} />
            레시피 도감
          </button>
        </div>
      </div>

      {/* 요리 모드 선택 */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex gap-4">
          <button
            onClick={() => setCookingMode('fixed')}
            className={`flex-1 py-3 px-4 rounded-lg border-2 font-semibold transition-all ${
              cookingMode === 'fixed'
                ? 'border-orange-500 bg-orange-50 text-orange-700'
                : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'
            }`}
          >
            <ClipboardList size={28} className="mx-auto mb-1" />
            <div>정해진 레시피로 요리</div>
            <div className="text-xs text-gray-500 mt-1">정확한 재료 조합 필요</div>
          </button>
          <button
            onClick={() => setCookingMode('stat')}
            className={`flex-1 py-3 px-4 rounded-lg border-2 font-semibold transition-all ${
              cookingMode === 'stat'
                ? 'border-purple-500 bg-purple-50 text-purple-700'
                : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'
            }`}
          >
            <Dice5 size={28} className="mx-auto mb-1" />
            <div>자유롭게 실험하기</div>
            <div className="text-xs text-gray-500 mt-1">스탯 합산으로 결과 결정</div>
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
                  <CookingItemImage item={item} allItems={allItems} size={48} />
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
                    <CookingItemImage item={item} allItems={allItems} size={48} />
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
                요리하기!
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

function RecipeBookModal({ recipes, discoveredRecipes, onClose }) {
  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 border-b-2 border-lime-300 bg-white/95 text-green-950 p-6 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <Book size={32} className="text-lime-700" />
            <div>
              <h2 className="text-2xl font-bold">레시피 도감</h2>
              <p className="text-green-800 text-sm">발견한 레시피: {discoveredRecipes.length}개</p>
            </div>
          </div>
          <button onClick={onClose} className="text-green-950 hover:bg-lime-100/70 p-2 rounded-lg transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {recipes.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <BookOpen size={56} className="mx-auto mb-4" />
              <p className="font-semibold">등록된 레시피가 없습니다!</p>
              <p className="text-sm mt-2">관리자가 레시피를 등록하면 여기에 표시됩니다.</p>
            </div>
          ) : (
            recipes.map((recipe) => {
              const isDiscovered = discoveredRecipes.includes(recipe.id);
              return (
                <div key={recipe.id} className={`border-2 rounded-lg p-4 ${isDiscovered ? 'border-orange-300 bg-orange-50' : 'border-gray-300 bg-gray-50'}`}>
                  {isDiscovered ? (
                    <div className="flex items-start gap-4">
                      <div
                        className="item-sprite w-16 h-16 flex-shrink-0 bg-white rounded-lg border-2 border-orange-300"
                        style={{
                          backgroundImage: `url(${getItemImageUrl(recipe.result)})`,
                          backgroundSize: 'contain', backgroundRepeat: 'no-repeat',
                          backgroundPosition: 'center', imageRendering: 'pixelated'
                        }}
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-bold text-gray-800">{recipe.name}</h3>
                          <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                            recipeSupports(recipe, 'fixed') && recipeSupports(recipe, 'stat')
                              ? 'bg-emerald-200 text-emerald-700'
                              : recipeSupports(recipe, 'fixed')
                                ? 'bg-orange-200 text-orange-700'
                                : 'bg-purple-200 text-purple-700'
                          }`}>
                            {recipeSupports(recipe, 'fixed') && recipeSupports(recipe, 'stat')
                              ? '고정 + 스탯' : recipeSupports(recipe, 'fixed') ? '고정 레시피' : '스탯 기반'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-3">{recipe.description}</p>
                        {recipeSupports(recipe, 'fixed') && recipe.ingredients && (
                          <div className="bg-white rounded-lg p-3 border border-orange-200 mb-3">
                            <div className="text-xs font-semibold text-gray-700 mb-2">필요 재료:</div>
                            <div className="flex flex-wrap gap-2">
                              {recipe.ingredients.map((ing, i) => (
                                <span key={i} className="bg-orange-100 text-orange-700 px-2 py-1 rounded text-xs font-semibold">
                                  {ing.name} ×{ing.count}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {recipeSupports(recipe, 'stat') && recipe.requiredStats && (
                          <div className="bg-white rounded-lg p-3 border border-purple-200 mb-3">
                            <div className="text-xs font-semibold text-gray-700 mb-2">필요 스탯:</div>
                            <div className="flex flex-wrap gap-2">
                              {Object.entries(recipe.requiredStats).filter(([_, v]) => v > 0).map(([stat, value]) => (
                                <span key={stat} className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs font-semibold">
                                  {stat}: {value}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        <div className="bg-green-100 rounded-lg p-3 border border-green-300">
                          <div className="text-xs font-semibold text-green-800 mb-1">결과:</div>
                          <div className="font-bold text-green-700">{recipe.result.name}</div>
                          <div className="text-xs text-green-600 mt-1">{recipe.result.effect}</div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-400">
                      <HelpCircle size={40} className="mx-auto mb-2" />
                      <p className="font-semibold">미발견 레시피</p>
                      <p className="text-xs mt-1">요리에 성공하면 레시피가 공개됩니다!</p>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
