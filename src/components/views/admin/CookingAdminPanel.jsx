import React, { useState } from 'react';
import { Plus, Trash2, Save } from 'lucide-react';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';

export default function CookingAdminPanel({ onCreateRecipe, onUpdateIngredientStats }) {
  const [recipeType, setRecipeType] = useState('fixed'); // 'fixed' | 'stat'
  const [recipeName, setRecipeName] = useState('');
  const [recipeDesc, setRecipeDesc] = useState('');
  const [ingredients, setIngredients] = useState([{ name: '', count: 1 }]);
  const [resultItem, setResultItem] = useState({
    name: '',
    pocket: 'berries',
    effect: '',
    friendshipBoost: 0,
    conditionBoost: { elegance: 0, beauty: 0, cuteness: 0, intelligence: 0, strength: 0 },
    spriteUrl: ''
  });
  
  // 스탯 기반 레시피용
  const [requiredStats, setRequiredStats] = useState({
    elegance: 0,
    beauty: 0,
    cuteness: 0,
    intelligence: 0,
    strength: 0,
    power: 0,
    sweetness: 0
  });

  const addIngredient = () => {
    if (ingredients.length < 3) {
      setIngredients([...ingredients, { name: '', count: 1 }]);
    } else {
      alert('재료는 최대 3개까지만 추가할 수 있습니다!');
    }
  };

  const removeIngredient = (index) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const handleCreateRecipe = () => {
    if (!recipeName.trim()) {
      alert('레시피 이름을 입력해주세요!');
      return;
    }

    if (recipeType === 'fixed' && ingredients.some(ing => !ing.name.trim())) {
      alert('모든 재료 이름을 입력해주세요!');
      return;
    }

    if (!resultItem.name.trim()) {
      alert('결과 아이템 이름을 입력해주세요!');
      return;
    }

    const recipe = {
      id: `recipe_${Date.now()}`,
      name: recipeName,
      type: recipeType,
      description: recipeDesc,
      ingredients: recipeType === 'fixed' ? ingredients : [],
      requiredStats: recipeType === 'stat' ? requiredStats : {},
      result: resultItem,
      createdAt: new Date().toISOString()
    };

    onCreateRecipe(recipe);
    
    // 초기화
    setRecipeName('');
    setRecipeDesc('');
    setIngredients([{ name: '', count: 1 }]);
    setResultItem({
      name: '',
      pocket: 'berries',
      effect: '',
      friendshipBoost: 0,
      conditionBoost: { elegance: 0, beauty: 0, cuteness: 0, intelligence: 0, strength: 0 },
      spriteUrl: ''
    });
    setRequiredStats({
      elegance: 0,
      beauty: 0,
      cuteness: 0,
      intelligence: 0,
      strength: 0,
      power: 0,
      sweetness: 0
    });
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">🍳 레시피 등록</h3>

        {/* 레시피 타입 선택 */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            레시피 타입
          </label>
          <div className="flex gap-4">
            <button
              onClick={() => setRecipeType('fixed')}
              className={`flex-1 py-3 px-4 rounded-lg border-2 font-semibold transition-all ${
                recipeType === 'fixed'
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                  : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'
              }`}
            >
              <div className="text-2xl mb-1">📝</div>
              <div className="text-sm">고정 레시피</div>
              <div className="text-xs text-gray-500 mt-1">정해진 재료 조합</div>
            </button>
            <button
              onClick={() => setRecipeType('stat')}
              className={`flex-1 py-3 px-4 rounded-lg border-2 font-semibold transition-all ${
                recipeType === 'stat'
                  ? 'border-purple-500 bg-purple-50 text-purple-700'
                  : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'
              }`}
            >
              <div className="text-2xl mb-1">📊</div>
              <div className="text-sm">스탯 기반</div>
              <div className="text-xs text-gray-500 mt-1">스탯 합산으로 결정</div>
            </button>
          </div>
        </div>

        {/* 레시피 기본 정보 */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              레시피 이름 *
            </label>
            <input
              type="text"
              value={recipeName}
              onChange={(e) => setRecipeName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              placeholder="예: 친밀도 상승 카레"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              설명
            </label>
            <input
              type="text"
              value={recipeDesc}
              onChange={(e) => setRecipeDesc(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              placeholder="레시피 설명"
            />
          </div>
        </div>

        {/* 고정 레시피 - 재료 */}
        {recipeType === 'fixed' && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-semibold text-gray-700">
                재료 (최소 1개, 최대 3개)
              </label>
              <Button
                variant="secondary"
                size="sm"
                onClick={addIngredient}
                disabled={ingredients.length >= 3}
              >
                <Plus size={16} /> 재료 추가
              </Button>
            </div>
            <div className="space-y-2">
              {ingredients.map((ing, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={ing.name}
                    onChange={(e) => {
                      const newIng = [...ingredients];
                      newIng[index].name = e.target.value;
                      setIngredients(newIng);
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
                    placeholder="재료 이름"
                  />
                  <input
                    type="number"
                    min="1"
                    value={ing.count}
                    onChange={(e) => {
                      const newIng = [...ingredients];
                      newIng[index].count = parseInt(e.target.value) || 1;
                      setIngredients(newIng);
                    }}
                    className="w-20 px-4 py-2 border border-gray-300 rounded-lg"
                  />
                  {ingredients.length > 1 && (
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => removeIngredient(index)}
                    >
                      <Trash2 size={16} />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 스탯 기반 레시피 - 필요 스탯 */}
        {recipeType === 'stat' && (
          <div className="mb-6 bg-purple-50 rounded-lg p-4 border-2 border-purple-200">
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              필요 스탯 합계
            </label>
            <div className="grid grid-cols-3 gap-3">
              {Object.keys(requiredStats).map(stat => (
                <div key={stat}>
                  <label className="block text-xs text-gray-600 mb-1 capitalize">
                    {stat === 'elegance' ? '근사함' :
                     stat === 'beauty' ? '아름다움' :
                     stat === 'cuteness' ? '귀여움' :
                     stat === 'intelligence' ? '슬기로움' :
                     stat === 'strength' ? '강인함' :
                     stat === 'power' ? '파워' : '달콤함'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={requiredStats[stat]}
                    onChange={(e) => setRequiredStats({
                      ...requiredStats,
                      [stat]: parseInt(e.target.value) || 0
                    })}
                    className="w-full px-3 py-1 border border-gray-300 rounded text-sm"
                  />
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-600 mt-2">
              💡 재료들의 스탯 합이 이 값 이상이면 레시피 완성
            </p>
          </div>
        )}

        {/* 결과 아이템 */}
        <div className="bg-green-50 rounded-lg p-4 border-2 border-green-200 mb-4">
          <h4 className="font-bold text-gray-800 mb-3">🎁 결과 아이템</h4>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <input
              type="text"
              value={resultItem.name}
              onChange={(e) => setResultItem({ ...resultItem, name: e.target.value })}
              className="px-4 py-2 border border-gray-300 rounded-lg"
              placeholder="아이템 이름 *"
            />
            <select
              value={resultItem.pocket}
              onChange={(e) => setResultItem({ ...resultItem, pocket: e.target.value })}
              className="px-4 py-2 border border-gray-300 rounded-lg"
            >
              <option value="berries">나무열매</option>
              <option value="medicine">회복</option>
              <option value="vitamins">영양</option>
              <option value="misc">기타</option>
            </select>
          </div>
          <textarea
            value={resultItem.effect}
            onChange={(e) => setResultItem({ ...resultItem, effect: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-3"
            rows="2"
            placeholder="효과 설명"
          />
          <input
            type="text"
            value={resultItem.spriteUrl}
            onChange={(e) => setResultItem({ ...resultItem, spriteUrl: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-3"
            placeholder="이미지 URL (선택)"
          />
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">친밀도 증가</label>
              <input
                type="number"
                min="0"
                value={resultItem.friendshipBoost}
                onChange={(e) => setResultItem({
                  ...resultItem,
                  friendshipBoost: parseInt(e.target.value) || 0
                })}
                className="w-full px-3 py-1 border border-gray-300 rounded"
              />
            </div>
          </div>
          
          <div className="mt-3">
            <label className="block text-xs text-gray-600 mb-2">컨디션 증가</label>
            <div className="grid grid-cols-5 gap-2">
              {Object.keys(resultItem.conditionBoost).map(stat => (
                <div key={stat}>
                  <label className="block text-[10px] text-gray-500 mb-1">
                    {stat === 'elegance' ? '근사함' :
                     stat === 'beauty' ? '아름다움' :
                     stat === 'cuteness' ? '귀여움' :
                     stat === 'intelligence' ? '슬기' : '강인함'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={resultItem.conditionBoost[stat]}
                    onChange={(e) => setResultItem({
                      ...resultItem,
                      conditionBoost: {
                        ...resultItem.conditionBoost,
                        [stat]: parseInt(e.target.value) || 0
                      }
                    })}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        <Button
          variant="primary"
          size="lg"
          onClick={handleCreateRecipe}
          className="w-full"
        >
          <Save size={18} /> 레시피 등록
        </Button>
      </Card>

      {/* 등록된 레시피 목록 */}
      <Card className="p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">📋 등록된 레시피</h3>
        <p className="text-sm text-gray-600">
          레시피 목록은 localStorage에서 확인할 수 있습니다.
        </p>
      </Card>
    </div>
  );
}