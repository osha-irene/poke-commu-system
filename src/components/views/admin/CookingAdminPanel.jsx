import React, { useState } from 'react';
import { Plus, Trash2, Save, X, Search, FileText, BarChart3, Gift, Package, Sparkles, Zap, Heart, Star, TrendingUp, ChefHat, Layers } from 'lucide-react';

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
      onClick={onClick}
      disabled={disabled}
      className={`${baseClass} ${variants[variant]} ${sizes[size]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
    >
      {children}
    </button>
  );
};

export default function CookingAdminPanel({ onCreateRecipe, onDeleteRecipe, allItems = [], recipes = [] }) {
  const [recipeType, setRecipeType] = useState('fixed');
  const [ingredients, setIngredients] = useState([
    { name: '', count: 1 },
    { name: '', count: 1 },
    { name: '', count: 1 }
  ]);
  const [resultItem, setResultItem] = useState({
    name: '',
    pocket: 'berries',
    effect: '',
    friendshipBoost: 0,
    conditionBoost: { elegance: 0, beauty: 0, cuteness: 0, intelligence: 0, strength: 0 },
    effortBoost: { hp: 0, attack: 0, defense: 0, spAttack: 0, spDefense: 0, speed: 0 },
    spriteUrl: ''
  });
  
  const [showItemModal, setShowItemModal] = useState(false);
  const [selectingIndex, setSelectingIndex] = useState(null);
  const [itemSearch, setItemSearch] = useState('');
  const [itemCategory, setItemCategory] = useState('all');
  
  const [requiredStats, setRequiredStats] = useState({
    elegance: 0,
    beauty: 0,
    cuteness: 0,
    intelligence: 0,
    strength: 0,
    power: 0,
    sweetness: 0
  });

  const [requiredEfforts, setRequiredEfforts] = useState({
    hp: 0,
    attack: 0,
    defense: 0,
    spAttack: 0,
    spDefense: 0,
    speed: 0
  });

  const categories = [
    { id: 'all', name: '전체', icon: Package },
    { id: 'berries', name: '나무열매', icon: Sparkles },
    { id: 'medicine', name: '회복', icon: Heart },
    { id: 'vitamins', name: '영양', icon: Zap },
  ];

  const filteredItems = allItems.filter(item => {
    const pocket = item.categoryData?.pocket || item.pocket || 'misc';
    
    if (itemCategory !== 'all' && pocket !== itemCategory) {
      return false;
    }
    
    if (!['berries', 'medicine', 'vitamins'].includes(pocket)) {
      return false;
    }
    
    if (itemSearch) {
      const query = itemSearch.toLowerCase();
      return item.name?.toLowerCase().includes(query);
    }
    
    return true;
  }).sort((a, b) => (a.name || '').localeCompare(b.name || ''));

  const removeIngredient = (index) => {
    const newIng = [...ingredients];
    newIng[index] = { name: '', count: 1 };
    setIngredients(newIng);
  };

  const openItemSelector = (index) => {
    setSelectingIndex(index);
    setShowItemModal(true);
    setItemSearch('');
    setItemCategory('all');
  };

  const selectItem = (item) => {
    const newIng = [...ingredients];
    newIng[selectingIndex].name = item.name;
    setIngredients(newIng);
    setShowItemModal(false);
  };

  const handleDeleteRecipe = (recipeId) => {
    if (window.confirm('정말로 이 레시피를 삭제하시겠습니까?')) {
      if (onDeleteRecipe) {
        onDeleteRecipe(recipeId);
      }
    }
  };

  const handleCreateRecipe = () => {
    if (!resultItem.name.trim()) {
      alert('결과 아이템 이름을 입력해주세요!');
      return;
    }

    if (!resultItem.effect.trim()) {
      alert('결과 아이템 설명을 입력해주세요!');
      return;
    }

    const validIngredients = ingredients.filter(ing => ing.name.trim());

    if (recipeType === 'fixed' && validIngredients.length === 0) {
      alert('최소 1개 이상의 재료를 선택해주세요!');
      return;
    }

    const recipe = {
      id: `recipe_${Date.now()}`,
      name: resultItem.name,
      type: recipeType,
      description: resultItem.effect,
      ingredients: recipeType === 'fixed' ? validIngredients : [],
      requiredStats: recipeType === 'stat' ? requiredStats : {},
      requiredEfforts: recipeType === 'stat' ? requiredEfforts : {},
      result: resultItem,
      createdAt: new Date().toISOString()
    };

    onCreateRecipe(recipe);
    
    setIngredients([
      { name: '', count: 1 },
      { name: '', count: 1 },
      { name: '', count: 1 }
    ]);
    setResultItem({
      name: '',
      pocket: 'berries',
      effect: '',
      friendshipBoost: 0,
      conditionBoost: { elegance: 0, beauty: 0, cuteness: 0, intelligence: 0, strength: 0 },
      effortBoost: { hp: 0, attack: 0, defense: 0, spAttack: 0, spDefense: 0, speed: 0 },
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
    setRequiredEfforts({
      hp: 0,
      attack: 0,
      defense: 0,
      spAttack: 0,
      spDefense: 0,
      speed: 0
    });
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <ChefHat size={24} /> 레시피 등록
        </h3>

        {/* 레시피 타입 선택 */}
        <div className="mb-0">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            레시피 타입
          </label>
          <div className="flex gap-0 relative">
            <button
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
              onClick={() => setRecipeType('stat')}
              className={`flex-1 py-3 px-4 rounded-t-lg border-2 border-b-0 font-semibold transition-all flex items-center gap-3 relative ${
                recipeType === 'stat'
                  ? 'border-gray-300 bg-white text-purple-700 z-20'
                  : 'border-transparent bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              <BarChart3 size={32} className="flex-shrink-0" />
              <div className="text-left">
                <div className="text-sm font-bold">스탯 기반</div>
                <div className="text-xs text-gray-500 mt-0.5">스탯 합산으로 결정</div>
              </div>
            </button>
          </div>
        </div>

        {/* 전체를 감싸는 큰 테두리 박스 */}
        <div className={`border-2 rounded-b-lg bg-white relative ${
          recipeType === 'fixed' ? 'border-gray-300 rounded-tr-lg border-t-gray-300' : 'border-gray-300 rounded-tl-lg border-t-gray-300'
        }`}>
          {/* 선택된 탭 아래 흰색 덮개 - 테두리 완전히 가리기 */}
          <div 
            className="absolute bg-white z-30"
            style={{
              top: '-2px',
              left: recipeType === 'fixed' ? '0' : '50.3%',
              width: '49.8%',
              height: '4px'
            }}
          ></div>
          
          <div className="p-6">
            {/* 2열 그리드 */}
            <div className="grid grid-cols-2 gap-6">
              {/* 왼쪽: 재료 또는 스탯 */}
              <div className="flex flex-col" style={{ height: '510px' }}>
                {recipeType === 'fixed' ? (
                  <div className="flex-1 flex flex-col h-full">
                    <label className="text-sm font-semibold text-gray-700 mb-3">
                      재료 (최대 3개)
                    </label>
                    
                    <div className="space-y-3 flex-1">
                      {ingredients.map((ing, index) => {
                        const selectedItem = allItems.find(item => item.name === ing.name);
                        
                        return (
                          <div key={index} className="border-2 border-gray-200 rounded-lg p-3 bg-white relative" style={{ height: '154px' }}>
                            {ing.name ? (
                              <div className="flex items-center gap-2 h-full">
                                <div className="w-20 h-20 bg-gray-50 rounded flex items-center justify-center flex-shrink-0">
                                  <img 
                                    src={selectedItem?.spriteUrl || selectedItem?.imageUrl}
                                    alt={ing.name}
                                    className="max-w-full max-h-full object-contain"
                                    style={{ imageRendering: 'pixelated', transform: 'scale(1.8)' }}
                                  />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-base font-semibold text-gray-800 truncate mb-1">{ing.name}</div>
                                  <button
                                    onClick={() => openItemSelector(index)}
                                    className="text-sm text-indigo-600 hover:text-indigo-700"
                                  >
                                    변경
                                  </button>
                                </div>
                                <div className="flex items-center gap-2">
                                  <label className="text-sm text-gray-600">개수:</label>
                                  <input
                                    type="number"
                                    min="1"
                                    value={ing.count}
                                    onChange={(e) => {
                                      const newIng = [...ingredients];
                                      newIng[index].count = parseInt(e.target.value) || 1;
                                      setIngredients(newIng);
                                    }}
                                    className="w-20 px-3 py-2 border border-gray-300 rounded text-center font-semibold"
                                  />
                                </div>
                                <button
                                  onClick={() => removeIngredient(index)}
                                  className="p-2 text-red-400 hover:bg-red-50 hover:text-red-600 rounded transition-colors"
                                >
                                  <Trash2 size={20} />
                                </button>
                              </div>
                            ) : (
                              <button
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
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      필요 컨디션 & 노력치 합계
                    </label>
                    
                    <div className="mb-4">
                      <div className="text-xs font-semibold text-gray-600 mb-2">컨디션 스탯</div>
                      <div className="grid grid-cols-2 gap-2">
                        {Object.keys(requiredStats).map(stat => (
                          <div key={stat}>
                            <label className="block text-xs text-gray-600 mb-1">
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
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-semibold text-gray-600 mb-2">노력치</div>
                      <div className="grid grid-cols-2 gap-2">
                        {Object.keys(requiredEfforts).map(stat => (
                          <div key={stat}>
                            <label className="block text-xs text-gray-600 mb-1">
                              {stat === 'hp' ? 'HP' :
                               stat === 'attack' ? '공격' :
                               stat === 'defense' ? '방어' :
                               stat === 'spAttack' ? '특수공격' :
                               stat === 'spDefense' ? '특수방어' : '스피드'}
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={requiredEfforts[stat]}
                              onChange={(e) => setRequiredEfforts({
                                ...requiredEfforts,
                                [stat]: parseInt(e.target.value) || 0
                              })}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                            />
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-gray-600 mt-2 flex items-center gap-1">
                        <Star size={12} /> 재료들의 컨디션&노력치이 값 이상이면 레시피 완성
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* 오른쪽: 결과 아이템 */}
              <div className="bg-gray-50 rounded-lg p-4 border-2 border-gray-300 flex flex-col" style={{ height: '510px' }}>
                <h4 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
                  <Gift size={20} /> 결과 아이템
                </h4>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <input
                    type="text"
                    value={resultItem.name}
                    onChange={(e) => setResultItem({ ...resultItem, name: e.target.value })}
                    className="px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="아이템 이름 *"
                  />
                  <select
                    value={resultItem.pocket}
                    onChange={(e) => setResultItem({ ...resultItem, pocket: e.target.value })}
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
                  onChange={(e) => setResultItem({ ...resultItem, effect: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-2 resize-none"
                  rows="4"
                  placeholder="효과 설명 *"
                />
                <input
                  type="text"
                  value={resultItem.spriteUrl}
                  onChange={(e) => setResultItem({ ...resultItem, spriteUrl: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-2"
                  placeholder="이미지 URL (선택)"
                />
                
                <div className="grid grid-cols-2 gap-2 mb-2">
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
                      className="w-full px-2 py-1 border border-gray-300 rounded"
                    />
                  </div>
                </div>
                
                <div className="mb-2">
                  <label className="block text-xs text-gray-600 mb-1">컨디션 증가</label>
                  <div className="grid grid-cols-5 gap-1">
                    {Object.keys(resultItem.conditionBoost).map(stat => (
                      <div key={stat}>
                        <label className="block text-[10px] text-gray-500 mb-0.5">
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
                          className="w-full px-1 py-1 border border-gray-300 rounded text-xs"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mb-2">
                  <label className="block text-xs text-gray-600 mb-1">노력치 증가</label>
                  <div className="grid grid-cols-6 gap-1">
                    {Object.keys(resultItem.effortBoost).map(stat => (
                      <div key={stat}>
                        <label className="block text-[10px] text-gray-500 mb-0.5">
                          {stat === 'hp' ? 'HP' :
                           stat === 'attack' ? '공격' :
                           stat === 'defense' ? '방어' :
                           stat === 'spAttack' ? '특공' :
                           stat === 'spDefense' ? '특방' : '스피드'}
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={resultItem.effortBoost[stat]}
                          onChange={(e) => setResultItem({
                            ...resultItem,
                            effortBoost: {
                              ...resultItem.effortBoost,
                              [stat]: parseInt(e.target.value) || 0
                            }
                          })}
                          className="w-full px-1 py-1 border border-gray-300 rounded text-xs"
                        />
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="mt-auto pt-4 flex justify-end">
                  <Button
                    variant="primary"
                    size="md"
                    onClick={handleCreateRecipe}
                    className="px-8"
                  >
                    <Save size={16} />
                    <span>레시피 등록</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* 등록된 레시피 목록 */}
      <Card className="p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Layers size={24} /> 등록된 레시피 ({recipes.length}개)
        </h3>
        
        {recipes.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <ChefHat size={64} className="mx-auto mb-3 text-gray-300" />
            <p>등록된 레시피가 없습니다</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {recipes.map((recipe) => (
              <div
                key={recipe.id}
                className="border-2 border-gray-200 rounded-xl bg-white flex flex-col relative group"
              >
                {/* 호버 시 휴지통 아이콘 */}
                <button
                  onClick={() => handleDeleteRecipe(recipe.id)}
                  className="absolute top-2 right-2 p-2 bg-gray-300 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-10"
                  title="레시피 삭제"
                >
                  <Trash2 size={20} />
                </button>

                <div className="flex gap-3 p-4">
                  <div className="flex items-center justify-center bg-gray-50 rounded-lg p-3 w-24 h-24 flex-shrink-0">
                    {recipe.result.spriteUrl ? (
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
                    <h4 className="font-bold text-lg text-gray-800 mb-1">{recipe.result.name}</h4>
                    
                    <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-semibold mb-2 ${
                      recipe.type === 'fixed' 
                        ? 'bg-indigo-100 text-indigo-700' 
                        : 'bg-purple-100 text-purple-700'
                    }`}>
                      {recipe.type === 'fixed' ? (
                        <span className="flex items-center gap-1">
                          <FileText size={12} /> 고정 레시피
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <BarChart3 size={12} /> 스탯 레시피
                        </span>
                      )}
                    </span>

                    <p className="text-xs text-gray-600 line-clamp-3">
                      {recipe.description || recipe.result.effect || '특별한 요리 아이템'}
                    </p>
                  </div>
                </div>

                <div className="bg-gray-50 px-4 py-3 mt-auto">
                  {recipe.type === 'fixed' && recipe.ingredients ? (
                    <>
                      <div className="font-semibold text-gray-700 mb-2 flex items-center gap-1 text-sm">
                        <Package size={16} /> 필요 재료
                      </div>
                      <div className="space-y-1">
                        {recipe.ingredients.map((ing, idx) => (
                          <div key={idx} className="flex justify-between text-gray-700 text-sm">
                            <span>{ing.name}</span>
                            <span className="font-semibold text-indigo-600">×{ing.count}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : recipe.type === 'stat' ? (
                    <div className="space-y-3">
                      {recipe.requiredStats && Object.values(recipe.requiredStats).some(v => v > 0) && (
                        <>
                          <div className="font-semibold text-gray-700 mb-2 flex items-center gap-1 text-sm">
                            <BarChart3 size={16} /> 필요 컨디션
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            {Object.entries(recipe.requiredStats).map(([stat, value]) => (
                              value > 0 && (
                                <div key={stat} className="text-gray-700 text-xs">
                                  <span>
                                    {stat === 'elegance' ? '근사함' :
                                     stat === 'beauty' ? '아름다움' :
                                     stat === 'cuteness' ? '귀여움' :
                                     stat === 'intelligence' ? '슬기' :
                                     stat === 'strength' ? '강인함' :
                                     stat === 'power' ? '파워' : '달콤'}
                                  </span>
                                  <span className="font-semibold text-purple-600 ml-1">{value}+</span>
                                </div>
                              )
                            ))}
                          </div>
                        </>
                      )}
                      
                      {recipe.requiredEfforts && Object.values(recipe.requiredEfforts).some(v => v > 0) && (
                        <>
                          <div className="font-semibold text-gray-700 mb-2 flex items-center gap-1 text-sm">
                            <TrendingUp size={16} /> 필요 노력치
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            {Object.entries(recipe.requiredEfforts).map(([stat, value]) => (
                              value > 0 && (
                                <div key={stat} className="text-gray-700 text-xs">
                                  <span>
                                    {stat === 'hp' ? 'HP' :
                                     stat === 'attack' ? '공격' :
                                     stat === 'defense' ? '방어' :
                                     stat === 'spAttack' ? '특공' :
                                     stat === 'spDefense' ? '특방' : '스피드'}
                                  </span>
                                  <span className="font-semibold text-blue-600 ml-1">{value}+</span>
                                </div>
                              )
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* 아이템 선택 모달 */}
      {showItemModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-2xl font-bold text-gray-800">재료 선택</h3>
              <button
                onClick={() => setShowItemModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={24} className="text-gray-600" />
              </button>
            </div>

            <div className="p-6 border-b border-gray-200 space-y-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="아이템 검색..."
                  value={itemSearch}
                  onChange={(e) => setItemSearch(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div className="flex gap-2">
                {categories.map(cat => {
                  const IconComponent = cat.icon;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setItemCategory(cat.id)}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
                        itemCategory === cat.id
                          ? 'bg-indigo-600 text-white shadow-lg scale-105'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      <IconComponent size={16} /> {cat.name}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-6 gap-4">
                {filteredItems.map(item => (
                  <button
                    key={item.id}
                    onClick={() => selectItem(item)}
                    className="flex flex-col border-2 border-gray-200 rounded-xl hover:border-indigo-500 hover:shadow-lg transition-all group bg-white overflow-hidden"
                  >
                    <div className="aspect-square bg-gray-50 p-6 flex items-center justify-center">
                      <img 
                        src={item.spriteUrl || item.imageUrl} 
                        alt={item.name}
                        className="max-w-full max-h-full object-contain"
                        style={{ imageRendering: 'pixelated', transform: 'scale(2)' }}
                      />
                    </div>
                    
                    <div className="p-2 bg-white border-t border-gray-200">
                      <div className="text-xs font-semibold text-gray-800 text-center truncate group-hover:text-indigo-700">
                        {item.name}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              
              {filteredItems.length === 0 && (
                <div className="text-center py-16 text-gray-400">
                  <Search size={64} className="mx-auto mb-4 text-gray-300" />
                  <p className="text-lg">검색 결과가 없습니다</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}