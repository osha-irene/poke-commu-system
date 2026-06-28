import React, { useState } from 'react';
import { X, Plus, Minus, Sparkles, Heart, Star, Zap, TrendingUp } from 'lucide-react';
import { 
  getItemEffect, 
  getStatNameKo, 
  getMaxValue,
  getCurrentValue as getHelperCurrentValue,
  calculateAfterValue,
  getEffectTypeInfo
} from '../../utils/itemEffectHelper';

export default function UseItemOnPokemonModal({
  item,
  pokemon,
  onUse,
  onLevelUp,
  onClose
}) {
  const [quantity, setQuantity] = useState(1);
  const [selectedConditionStat, setSelectedConditionStat] = useState(null);
  
  const effect = getItemEffect(item);
  const isRareCandy = effect?.type === 'levelup';
  const isMultiStat = effect?.stat === 'all';
  
  // 이상한 사탕은 1개씩, 날개는 최대 252개까지, 일반 아이템은 25개까지
  const maxQuantity = isRareCandy ? 1 : 
                      effect?.amount === 1 ? Math.min(item.count, 252) : 
                      Math.min(item.count, 25);

  // 현재 수치 가져오기
  const getCurrentValue = () => {
    if (!effect) return 0;
    
    // 다중 스탯 선택 시
    if (isMultiStat && selectedConditionStat) {
      const tempEffect = { ...effect, stat: selectedConditionStat };
      return getHelperCurrentValue(pokemon, tempEffect);
    }
    
    return getHelperCurrentValue(pokemon, effect);
  };

// 최대값 가져오기
const maxValue = effect ? getMaxValue(effect.type) : 100; // ✅ effect가 없을 때 기본값

// 사용 후 수치
const currentValue = getCurrentValue();
const afterValue = !effect ? currentValue :
  isRareCandy 
    ? Math.min(maxValue, currentValue + 1)
    : calculateAfterValue(currentValue, effect, quantity, maxValue);
const actualIncrease = afterValue - currentValue;

  // 스탯명 가져오기
  const getDisplayStatName = () => {
    if (!effect) return '';
    if (isMultiStat && selectedConditionStat) {
      return getStatNameKo(effect.type, selectedConditionStat);
    }
    return getStatNameKo(effect.type, effect.stat);
  };

  // 아이콘 가져오기
  const getIcon = () => {
    if (!effect) return <Sparkles size={24} />;
    if (effect.type === 'friendship') return <Heart size={24} className="text-pink-500" />;
    if (effect.type === 'condition') return <Star size={24} className="text-purple-500" />;
    if (effect.type === 'effort') return <Zap size={24} className="text-yellow-500" />;
    if (effect.type === 'levelup') return <TrendingUp size={24} className="text-green-500" />;
    return <Sparkles size={24} />;
  };

  const handleUse = () => {
    if (!effect) {
      alert('이 아이템은 포켓몬에게 사용할 수 없습니다!');
      return;
    }

    if (isMultiStat && !selectedConditionStat) {
      const typeInfo = getEffectTypeInfo(effect.type);
      const typeName = typeInfo?.name || '능력치';
      alert(`올릴 ${typeName}를 선택해주세요!`);
      return;
    }

    if (actualIncrease === 0 && !isRareCandy) {
      alert(`${getDisplayStatName()}가 이미 최대치입니다!`);
      return;
    }

    // 이상한 사탕인 경우 onLevelUp 콜백 사용
    if (isRareCandy && onLevelUp) {
      onLevelUp(item, pokemon, 1, effect);
    } else {
      // 다중 스탯인 경우 선택한 스탯으로 효과 변경
      const finalEffect = isMultiStat 
        ? { ...effect, stat: selectedConditionStat }
        : effect;
      onUse(item, pokemon, quantity, finalEffect);
    }
    onClose();
  };

  // 스탯 선택지 (노력치 또는 컨디션)
  const getStatChoices = () => {
    if (!effect || !isMultiStat) return [];
    
    const typeInfo = getEffectTypeInfo(effect.type);
    if (!typeInfo || !typeInfo.stats) return [];
    
    return Object.entries(typeInfo.stats).map(([key, info]) => ({
      key,
      name: info.name,
      icon: info.icon || '📊',
      current: effect.type === 'effort' 
        ? pokemon.effort?.[key] || 0
        : pokemon.condition?.[key] || 0,
      max: typeInfo.maxValue
    }));
  };

  const statChoices = getStatChoices();

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* 헤더 */}
        <div className="border-b-2 border-lime-300 bg-white/95 text-green-950 p-6 rounded-t-xl">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-3">
              {getIcon()}
              <div>
                <h2 className="text-3xl font-bold">
                  {isRareCandy ? '🍬 레벨업' : '아이템 사용'}
                </h2>
                <p className="text-base mt-1 text-green-800">
                  {pokemon.nickname || pokemon.name}에게 사용
                </p>
              </div>
            </div>
            <button onClick={onClose} className="text-green-950 hover:text-lime-700 transition-colors">
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* 아이템 정보 */}
          <div className="flex items-center gap-4 bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="w-16 h-16 bg-white rounded-lg border border-gray-200 flex items-center justify-center flex-shrink-0">
              <img 
                src={item.imageUrl}
                alt={item.name}
                className={item.isCustom ? 'custom-item-image-64' : 'w-14 h-14'}
                style={{ imageRendering: 'pixelated' }}
              />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-xl text-gray-800">{item.name}</h3>
              <p className="text-base text-gray-600">보유: {item.count}개</p>
              {item.effect && (
                <p className="text-sm text-gray-500 mt-1">{item.effect}</p>
              )}
              {item.onUse?.effectLabel && (
                <p className="text-sm text-purple-600 font-semibold mt-1">
                  ✨ {item.onUse.effectLabel}
                </p>
              )}
            </div>
          </div>

          {/* 이상한 사탕 특별 안내 */}
          {isRareCandy && (
            <div className="bg-white/40 rounded-lg p-4 border-2 border-lime-200">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-3xl">🍬</span>
                <span className="font-bold text-xl text-gray-800">이상한 사탕</span>
              </div>
              <div className="space-y-2 text-base text-gray-700">
                <p>• 포켓몬의 레벨이 1 올라갑니다</p>
                <p>• 새로 배울 수 있는 기술이 있으면 선택할 수 있습니다</p>
                <p>• 한 번에 1개씩만 사용 가능합니다</p>
              </div>
              <div className="mt-3 pt-3 border-t border-yellow-300">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-700">현재 레벨</span>
                  <span className="text-3xl font-bold text-gray-800">Lv. {pokemon.level}</span>
                </div>
                <div className="flex items-center justify-center my-2">
                  <span className="text-3xl text-yellow-600">↓</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-green-700">레벨업 후</span>
                  <span className="text-3xl font-bold text-green-600">Lv. {pokemon.level + 1}</span>
                </div>
              </div>
            </div>
          )}

          {/* 다중 스탯 선택 */}
          {isMultiStat && statChoices.length > 0 && (
            <div className="space-y-3">
              <label className="block text-base font-semibold text-gray-700">
                {getEffectTypeInfo(effect.type)?.name || '능력치'} 선택
              </label>
              <div className="grid grid-cols-2 gap-2">
                {statChoices.map(stat => {
                  const isMax = stat.current >= stat.max;
                  return (
                    <button
                      key={stat.key}
                      onClick={() => !isMax && setSelectedConditionStat(stat.key)}
                      disabled={isMax}
                      className={`p-3 rounded-lg border-2 transition-all text-left ${
                        selectedConditionStat === stat.key
                          ? 'border-purple-500 bg-purple-50'
                          : isMax
                            ? 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
                            : 'border-gray-200 hover:border-purple-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{stat.icon}</span>
                        <div className="flex-1">
                          <div className="font-semibold text-base text-gray-800">{stat.name}</div>
                          <div className="text-sm text-gray-600 mt-1">
                            {stat.current}/{stat.max} {isMax && '(최대)'}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 일반 아이템 효과 표시 */}
          {effect && !isRareCandy && !isMultiStat && (
            <div className="bg-white/40 rounded-lg p-4 border-2 border-lime-200">
              <div className="text-base font-semibold text-gray-700 mb-3">
                📊 효과 미리보기
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-base text-gray-600">능력치</span>
                  <span className="font-bold text-xl text-indigo-600">
                    {getDisplayStatName()}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-base text-gray-600">현재</span>
                  <span className="font-bold text-gray-800">
                    {currentValue} / {maxValue}
                  </span>
                </div>
                
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-blue-500 h-3 rounded-full transition-all"
                    style={{ width: `${(currentValue / maxValue) * 100}%` }}
                  />
                </div>
                
                <div className="flex items-center justify-between pt-2 border-t border-blue-200">
                  <span className="text-base font-semibold text-green-600">사용 후</span>
                  <span className="font-bold text-2xl text-green-600">
                    {afterValue} / {maxValue}
                    <span className="text-base ml-2">
                      (+{actualIncrease})
                    </span>
                  </span>
                </div>
                
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-green-500 h-3 rounded-full transition-all"
                    style={{ width: `${(afterValue / maxValue) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* 효과 없음 */}
          {!effect && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
              <p className="text-yellow-700 font-semibold">
                ⚠️ 이 아이템은 포켓몬에게 직접 사용할 수 없습니다
              </p>
              <p className="text-base text-yellow-600 mt-1">
                배틀 중에 사용하거나 다른 방식으로 활용하세요
              </p>
            </div>
          )}

          {/* 수량 선택 - 이상한 사탕이 아니고 다중 스탯도 아닌 경우 */}
          {effect && !isRareCandy && !isMultiStat && actualIncrease > 0 && (
            <div>
              <label className="block text-base font-semibold text-gray-700 mb-3">
                사용 개수 선택
              </label>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                  className="w-10 h-10 rounded-lg bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 disabled:text-gray-400 flex items-center justify-center font-bold transition-colors"
                >
                  <Minus size={20} />
                </button>
                
                <div className="flex-1">
                  <input
                    type="number"
                    min="1"
                    max={maxQuantity}
                    value={quantity}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 1;
                      setQuantity(Math.min(maxQuantity, Math.max(1, val)));
                    }}
                    className="w-full text-center text-3xl font-bold border-2 border-gray-300 rounded-lg py-2 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                
                <button
                  onClick={() => setQuantity(Math.min(maxQuantity, quantity + 1))}
                  disabled={quantity >= maxQuantity}
                  className="w-10 h-10 rounded-lg bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 disabled:text-gray-400 flex items-center justify-center font-bold transition-colors"
                >
                  <Plus size={20} />
                </button>
              </div>
              
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => setQuantity(1)}
                  className="flex-1 text-sm bg-gray-100 text-gray-700 px-3 py-2 rounded hover:bg-gray-200 font-semibold"
                >
                  1개
                </button>
                <button
                  onClick={() => setQuantity(Math.min(5, maxQuantity))}
                  className="flex-1 text-sm bg-gray-100 text-gray-700 px-3 py-2 rounded hover:bg-gray-200 font-semibold"
                >
                  5개
                </button>
                <button
                  onClick={() => setQuantity(Math.min(10, maxQuantity))}
                  className="flex-1 text-sm bg-gray-100 text-gray-700 px-3 py-2 rounded hover:bg-gray-200 font-semibold"
                >
                  10개
                </button>
                <button
                  onClick={() => setQuantity(maxQuantity)}
                  className="flex-1 text-sm bg-indigo-100 text-indigo-700 px-3 py-2 rounded hover:bg-indigo-200 font-semibold"
                >
                  최대
                </button>
              </div>
            </div>
          )}

          {/* 버튼 */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300 font-semibold transition-colors"
            >
              취소
            </button>
            <button
              onClick={handleUse}
              disabled={!effect || (actualIncrease === 0 && !isRareCandy) || (isMultiStat && !selectedConditionStat)}
              className={`flex-1 py-3 rounded-lg font-semibold transition-colors ${
                effect && (actualIncrease > 0 || isRareCandy) && (!isMultiStat || selectedConditionStat)
                  ? 'border-2 border-lime-300 bg-white/55 text-green-950 hover:bg-lime-100/70'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {isRareCandy ? '🍬 레벨업!' : '사용하기'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

