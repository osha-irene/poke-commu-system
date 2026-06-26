import React, { useState } from 'react';
import { Plus, Trash2, Save, FileText, BarChart3, Gift, Package, Star, TrendingUp, ChefHat, Layers, Edit2, X } from 'lucide-react';
import ItemSelectorModal from '../../modals/ItemSelectorModal';

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
  // 특수 효과 — conditionSelect/evSelect: 사용 시 유저가 항목 선택
  specialEffect: null,
  boostAmount: 0,
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

export default function CookingAdminPanel({ onCreateRecipe, onUpdateRecipe, onDeleteRecipe, onCreateCustomItem, onUpdateCustomItem, allItems = [], recipes = [] }) {
  const [recipeType, setRecipeType] = useState('fixed');
  const [enabledRecipeTypes, setEnabledRecipeTypes] = useState({ fixed: true, stat: false });
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
      description: resultItem.effect,
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
      await onUpdateRecipe?.(editingRecipeId, payload);
      // 커스텀 아이템 목록에서도 이름/효과/이미지 업데이트
      if (onUpdateCustomItem) {
        const existCustomId = `recipe_item_${editingRecipeId}`;
        await onUpdateCustomItem(existCustomId, {
          name: payload.result.name,
          effect: payload.result.effect,
          spriteUrl: payload.result.spriteUrl || '',
          specialEffect: payload.result.specialEffect || null,

          boostAmount: payload.result.boostAmount || 0,
          conditionBoost: payload.result.conditionBoost || {},
          effortBoost: payload.result.effortBoost || {},
          friendshipBoost: payload.result.friendshipBoost || 0,
          pocket: payload.result.pocket || 'misc',
        });
      }
    } else {
      await onCreateRecipe?.({ id: recipeId, ...payload, createdAt: new Date().toISOString() });
      // 커스텀 아이템으로도 등록
      if (onCreateCustomItem && payload.result.name) {
        await onCreateCustomItem({
          id: `recipe_item_${recipeId}`,
          name: payload.result.name,
          effect: payload.result.effect,
          spriteUrl: payload.result.spriteUrl || '',
          pocket: payload.result.pocket || 'misc',
          category: payload.result.pocket || 'misc',
          isCustom: true,
          isRecipe: true,
          recipeId,
          specialEffect: payload.result.specialEffect || null,

          boostAmount: payload.result.boostAmount || 0,
          conditionBoost: payload.result.conditionBoost || {},
          effortBoost: payload.result.effortBoost || {},
          friendshipBoost: payload.result.friendshipBoost || 0,
          cost: 0,
          sellPrice: 0,
          canSell: false,
        });
      }
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
      effect: r.effect || recipe.description || '',
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
                <h4 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
                  <Gift size={20} /> 결과 아이템
                </h4>
                <div className="grid grid-cols-2 gap-2 mb-2">
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-2 resize-none"
                  rows="4"
                  placeholder="효과 설명 *"
                />
                <input
                  type="text"
                  value={resultItem.spriteUrl}
                  onChange={(event) => setResultItem({ ...resultItem, spriteUrl: event.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-2"
                  placeholder="이미지 URL"
                />

                <div className="mb-2">
                  <label className="block text-xs text-gray-600 mb-1">친밀도 증가</label>
                  <input
                    type="number"
                    min="0"
                    value={resultItem.friendshipBoost}
                    onChange={(event) => setResultItem({ ...resultItem, friendshipBoost: parseInt(event.target.value, 10) || 0 })}
                    className="w-full px-2 py-1 border border-gray-300 rounded"
                  />
                </div>

                <div className="mb-2">
                  <label className="block text-xs text-gray-600 mb-1">컨디션 증가</label>
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
                </div>

                <div className="mb-2">
                  <label className="block text-xs text-gray-600 mb-1">노력치 증가</label>
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
                </div>

                {/* 특수 효과 */}
                <div className="mb-2">
                  <label className="block text-xs text-gray-600 mb-1">특수 효과 (선택)</label>
                  <select
                    value={resultItem.specialEffect || ''}
                    onChange={e => setResultItem({ ...resultItem, specialEffect: e.target.value || null, boostAmount: 0 })}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                  >
                    <option value="">없음</option>
                    <option value="conditionSelect">컨디션 특정 항목 고정 상승</option>
                    <option value="evSelect">노력치 특정 항목 고정 상승</option>
                  </select>
                </div>

                {resultItem.specialEffect === 'conditionSelect' && (
                  <div className="bg-green-50 border border-green-200 rounded p-2 mb-2 flex gap-3 items-center">
                    <p className="flex-1 text-xs text-green-700">사용 시 사용자가 원하는 컨디션 항목을 직접 선택해 올립니다</p>
                    <div className="shrink-0">
                      <label className="block text-[10px] text-gray-500 mb-0.5">상승량</label>
                      <input type="number" min={1} value={resultItem.boostAmount}
                        onChange={e => setResultItem({ ...resultItem, boostAmount: parseInt(e.target.value) || 0 })}
                        className="w-16 px-2 py-1 border border-gray-300 rounded text-xs text-center" />
                    </div>
                  </div>
                )}

                {resultItem.specialEffect === 'evSelect' && (
                  <div className="bg-purple-50 border border-purple-200 rounded p-2 mb-2 flex gap-3 items-center">
                    <p className="flex-1 text-xs text-purple-700">사용 시 사용자가 원하는 노력치 항목을 직접 선택해 올립니다</p>
                    <div className="shrink-0">
                      <label className="block text-[10px] text-gray-500 mb-0.5">상승량</label>
                      <input type="number" min={1} value={resultItem.boostAmount}
                        onChange={e => setResultItem({ ...resultItem, boostAmount: parseInt(e.target.value) || 0 })}
                        className="w-16 px-2 py-1 border border-gray-300 rounded text-xs text-center" />
                    </div>
                  </div>
                )}

                <div className="mt-auto pt-4 flex justify-end">
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
                        {recipe.description || recipe.result?.effect || '특별한 요리 아이템'}
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
        pockets={['ingredients', 'berries', 'medicine', 'vitamins']}
      />
    </div>
  );
}
