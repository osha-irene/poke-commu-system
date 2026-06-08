import React, { useState } from 'react';
import { ChefHat, Book, Plus, Minus, Sparkles, X } from 'lucide-react';
import recipesData from '../../data/recipes.json'; // ✅ import 추가

import { useGame } from '../../contexts/GameContext';

export default function CookingView() {
  const {    recipes,
    discoveredRecipes,
    cookRecipe: onCook,    items: userItems  // ← 추가
  } = useGame();
  const [selectedIngredients, setSelectedIngredients] = useState([]);
  const [showRecipeBook, setShowRecipeBook] = useState(false);
  const [cookingMode, setCookingMode] = useState('fixed');

  const fixedRecipes = recipes.filter(r => r.type === 'fixed');
  const statRecipes = recipes.filter(r => r.type === 'stat');

  // ✅ ingredientStats 가져오기
  const ingredientStats = recipesData.ingredientStats || [];

  const availableIngredients = userItems.filter(item => {
    const pocket = item.pocket?.toLowerCase() || '';
    const category = item.category?.toLowerCase() || '';
    const name = item.name?.toLowerCase() || '';
    
    if (name.includes('볼') || name.includes('ball')) {
      return false;
    }
    
    return (
      pocket === 'berries' || 
      pocket === 'ingredients' ||
      pocket === 'medicine' ||
      category === 'berries' ||
      category === 'ingredients' ||
      name.includes('열매') ||
      name.includes('berry') ||
      name.includes('사탕') ||
      name.includes('candy') ||
      item.isIngredient === true ||
      true
    );
  });

  console.log('🍳 전체 아이템:', userItems);
  console.log('🥕 재료 목록:', availableIngredients);

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
      setSelectedIngredients(
        selectedIngredients.map(i => 
          i.name === item.name ? { ...i, count: i.count + 1 } : i
        )
      );
    } else {
      setSelectedIngredients([...selectedIngredients, { ...item, count: 1 }]);
    }
  };

  const removeIngredient = (itemName) => {
    setSelectedIngredients(prev => {
      const item = prev.find(i => i.name === itemName);
      if (item.count > 1) {
        return prev.map(i => 
          i.name === itemName ? { ...i, count: i.count - 1 } : i
        );
      } else {
        return prev.filter(i => i.name !== itemName);
      }
    });
  };

  const matchFixedRecipe = () => {
    return fixedRecipes.find(recipe => {
      if (recipe.ingredients.length !== selectedIngredients.length) return false;
      
      return recipe.ingredients.every(recipeIng => {
        const userIng = selectedIngredients.find(i => i.name === recipeIng.name);
        return userIng && userIng.count === recipeIng.count;
      });
    });
  };

  // ✅ 스탯 기반 레시피 매칭 수정
  const matchStatRecipe = () => {
    const totalStats = {
      elegance: 0,
      beauty: 0,
      cuteness: 0,
      intelligence: 0,
      strength: 0,
      power: 0,
      sweetness: 0
    };

    console.log('📊 스탯 계산 시작');
    console.log('📋 사용 가능한 재료 스탯:', ingredientStats);

    selectedIngredients.forEach(ing => {
      // ✅ recipes.json의 ingredientStats에서 스탯 찾기
      const ingredientStat = ingredientStats.find(s => s.name === ing.name);
      
      if (ingredientStat && ingredientStat.stats) {
        console.log(`  - ${ing.name} x${ing.count}:`, ingredientStat.stats);
        
        Object.keys(ingredientStat.stats).forEach(stat => {
          totalStats[stat] = (totalStats[stat] || 0) + (ingredientStat.stats[stat] * ing.count);
        });
      } else {
        console.log(`  - ${ing.name}: 스탯 정보 없음`);
      }
    });

    console.log('📊 총 스탯:', totalStats);
    console.log('📋 스탯 기반 레시피:', statRecipes);

    const matchedRecipe = statRecipes.find(recipe => {
      console.log(`\n레시피 체크: ${recipe.name}`);
      console.log('  필요 스탯:', recipe.requiredStats);
      
      const matches = Object.keys(recipe.requiredStats).every(stat => {
        const required = recipe.requiredStats[stat];
        const actual = totalStats[stat] || 0;
        const pass = actual >= required;
        
        console.log(`  - ${stat}: ${actual} >= ${required} ? ${pass}`);
        return pass;
      });
      
      console.log(`  결과: ${matches ? '✅ 매칭됨!' : '❌ 매칭 안됨'}`);
      return matches;
    });

    return matchedRecipe;
  };

  const handleCook = () => {
    if (selectedIngredients.length === 0) {
      alert('재료를 선택해주세요!');
      return;
    }

    console.log('🍳 요리 시도!');
    console.log('선택한 재료:', selectedIngredients);
    console.log('등록된 고정 레시피:', fixedRecipes);
    console.log('등록된 스탯 레시피:', statRecipes);
    console.log('요리 모드:', cookingMode);

    let matchedRecipe = null;

    if (cookingMode === 'fixed') {
      matchedRecipe = matchFixedRecipe();
    } else {
      matchedRecipe = matchStatRecipe();
    }

    console.log('매칭된 레시피:', matchedRecipe);

    if (matchedRecipe) {
      onCook(matchedRecipe, selectedIngredients);
      setSelectedIngredients([]);
    } else {
      alert('❌ 레시피가 맞지 않습니다!\n다른 재료 조합을 시도해보세요.');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 p-6">
      {/* 헤더 */}
      <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <ChefHat size={48} />
            <div>
              <h1 className="text-3xl font-bold mb-2">요리하기</h1>
              <p className="text-orange-100">재료를 조합해서 특별한 아이템을 만들어보세요!</p>
            </div>
          </div>
          <button
            onClick={() => setShowRecipeBook(true)}
            className="bg-white text-orange-600 px-6 py-3 rounded-lg hover:bg-orange-50 font-bold transition-all flex items-center gap-2 shadow-lg"
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
            <div className="text-2xl mb-1">📝</div>
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
            <div className="text-2xl mb-1">🎲</div>
            <div>자유롭게 실험하기</div>
            <div className="text-xs text-gray-500 mt-1">스탯 합산으로 결과 결정</div>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* 왼쪽: 재료 선택 */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">
            🥘 재료 선택 
            <span className="text-sm text-gray-500 ml-2">
              ({availableIngredients.length}개)
            </span>
          </h3>
          
          {availableIngredients.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <div className="text-6xl mb-4">📦</div>
              <p className="font-semibold">사용 가능한 재료가 없습니다!</p>
              <p className="text-sm mt-2">아이템을 구해보세요.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-2">
              {availableIngredients.map((item, i) => (
                <button
                  key={i}
                  onClick={() => addIngredient(item)}
                  className="flex items-center gap-2 bg-gray-50 rounded-lg p-3 border-2 border-gray-200 hover:border-orange-400 hover:bg-orange-50 transition-all text-left"
                >
                  <div 
                    className="w-12 h-12 flex-shrink-0 bg-white rounded-lg border border-gray-200 flex items-center justify-center"
                    style={{
                      backgroundImage: `url(${item.imageUrl})`,
                      backgroundSize: 'contain',
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'center',
                      imageRendering: 'pixelated'
                    }}
                  />
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
          <h3 className="text-xl font-bold text-gray-800 mb-4">🍳 요리 냄비</h3>
          
          {selectedIngredients.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <div className="text-6xl mb-4">🍲</div>
              <p>재료를 선택해주세요!</p>
              <p className="text-sm mt-2">(최소 1개, 최대 3개)</p>
            </div>
          ) : (
            <>
              <div className="space-y-3 mb-6">
                {selectedIngredients.map((item, i) => (
                  <div key={i} className="flex items-center gap-3 bg-orange-50 rounded-lg p-3 border-2 border-orange-200">
                    <div 
                      className="w-12 h-12 flex-shrink-0 bg-white rounded-lg border border-gray-200"
                      style={{
                        backgroundImage: `url(${item.imageUrl})`,
                        backgroundSize: 'contain',
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'center',
                        imageRendering: 'pixelated'
                      }}
                    />
                    <div className="flex-1">
                      <div className="font-bold text-gray-800">{item.name}</div>
                      <div className="text-sm text-gray-600">사용: {item.count}개</div>
                    </div>
                    <button
                      onClick={() => removeIngredient(item.name)}
                      className="bg-red-500 text-white p-2 rounded-lg hover:bg-red-600 transition-colors"
                    >
                      <Minus size={16} />
                    </button>
                  </div>
                ))}
              </div>

              <button
                onClick={handleCook}
                className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white py-4 rounded-lg hover:from-orange-600 hover:to-red-600 font-bold text-lg transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
              >
                <Sparkles size={20} />
                요리하기!
              </button>
            </>
          )}
        </div>
      </div>

      {/* 레시피 도감 모달 */}
      {showRecipeBook && (
        <RecipeBookModal
          recipes={recipes}
          discoveredRecipes={discoveredRecipes}
          onClose={() => setShowRecipeBook(false)}
        />
      )}
    </div>
  );
}

// 레시피 도감 모달
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
        <div className="sticky top-0 bg-gradient-to-r from-orange-500 to-red-500 text-white p-6 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <Book size={32} />
            <div>
              <h2 className="text-2xl font-bold">레시피 도감</h2>
              <p className="text-orange-100 text-sm">발견한 레시피: {discoveredRecipes.length}개</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {recipes.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <div className="text-6xl mb-4">📖</div>
              <p className="font-semibold">등록된 레시피가 없습니다!</p>
              <p className="text-sm mt-2">관리자가 레시피를 등록하면 여기에 표시됩니다.</p>
            </div>
          ) : (
            recipes.map((recipe) => {
              const isDiscovered = discoveredRecipes.includes(recipe.id);
              
              return (
                <div 
                  key={recipe.id} 
                  className={`border-2 rounded-lg p-4 ${
                    isDiscovered 
                      ? 'border-orange-300 bg-orange-50' 
                      : 'border-gray-300 bg-gray-50'
                  }`}
                >
                  {isDiscovered ? (
                    <>
                      <div className="flex items-start gap-4">
                        <div 
                          className="w-16 h-16 flex-shrink-0 bg-white rounded-lg border-2 border-orange-300"
                          style={{
                            backgroundImage: `url(${recipe.result.spriteUrl})`,
                            backgroundSize: 'contain',
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'center',
                            imageRendering: 'pixelated'
                          }}
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-lg font-bold text-gray-800">{recipe.name}</h3>
                            <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                              recipe.type === 'fixed' 
                                ? 'bg-orange-200 text-orange-700' 
                                : 'bg-purple-200 text-purple-700'
                            }`}>
                              {recipe.type === 'fixed' ? '고정 레시피' : '스탯 기반'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mb-3">{recipe.description}</p>
                          
                          {recipe.type === 'fixed' && recipe.ingredients && (
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
                          
                          {recipe.type === 'stat' && recipe.requiredStats && (
                            <div className="bg-white rounded-lg p-3 border border-purple-200 mb-3">
                              <div className="text-xs font-semibold text-gray-700 mb-2">필요 스탯:</div>
                              <div className="flex flex-wrap gap-2">
                                {Object.entries(recipe.requiredStats)
                                  .filter(([_, value]) => value > 0)
                                  .map(([stat, value]) => (
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
                    </>
                  ) : (
                    <div className="text-center py-8 text-gray-400">
                      <div className="text-4xl mb-2">❓</div>
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