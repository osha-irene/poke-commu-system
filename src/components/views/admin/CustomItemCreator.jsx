// src/components/views/admin/CustomItemCreator.jsx
import React, { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import { isSoyYYNItem } from '../../../utils/specialItemUtils';

const EMPTY_ITEM = {
  name: '',
  nameEn: '',
  category: 'misc',
  pocket: 'misc',
  cost: 0,
  sellPrice: 0,
  canSell: true,
  effect: '',
  spriteUrl: '',
  specialEffect: null,
  cooking: { isIngredient: false },
  evBoost: { hp: 0, attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 },
  friendshipBoost: 0,
  conditionBoost: { elegance: 0, beauty: 0, cuteness: 0, intelligence: 0, strength: 0 },
  conditionTarget: '',
  evTarget: '',
  boostAmount: 0,
  maxPurchasePerMember: 0,
};

const CATEGORIES = [
  { id: 'pokeballs', name: '포획', icon: '⚾', color: 'bg-red-100 text-red-700' },
  { id: 'medicine', name: '회복', icon: '💊', color: 'bg-green-100 text-green-700' },
  { id: 'vitamins', name: '영양', icon: '💪', color: 'bg-purple-100 text-purple-700' },
  { id: 'berries', name: '나무열매', icon: '🍇', color: 'bg-pink-100 text-pink-700' },
  { id: 'machines', name: '기술머신', icon: '💿', color: 'bg-blue-100 text-blue-700' },
  { id: 'held-items', name: '도구', icon: '🎒', color: 'bg-orange-100 text-orange-700' },
  { id: 'evolution', name: '진화', icon: '✨', color: 'bg-yellow-100 text-yellow-700' },
  { id: 'ingredients', name: '식재료', icon: '🥕', color: 'bg-lime-100 text-lime-700' },
  { id: 'misc', name: '기타', icon: '📦', color: 'bg-gray-100 text-gray-700' },
];

const STAT_LABELS = {
  hp: 'HP', attack: '공격', defense: '방어',
  specialAttack: '특수공격', specialDefense: '특수방어', speed: '스피드',
};

const CONDITION_LABELS = {
  elegance: '근사함', beauty: '아름다움', cuteness: '귀여움',
  intelligence: '슬기로움', strength: '강인함',
};

// 기존 아이템 데이터를 편집 폼 형태로 정규화
function normalizeForEdit(item) {
  const isFixedSpecialEffect = isSoyYYNItem(item);
  const rawSpecialEffect = isFixedSpecialEffect
    ? 'effortEdit'
    : item.specialEffect === 'iv' ? null : item.specialEffect;
  const specialEffect = rawSpecialEffect ||
    (item.evBoost && Object.values(item.evBoost).some(v => Number(v) > 0) ? 'ev' :
     item.friendshipBoost > 0 ? 'friendship' :
     item.conditionBoost && Object.values(item.conditionBoost).some(v => Number(v) > 0) ? 'condition' :
     null);

  const conditionTarget = item.conditionTarget ||
    (specialEffect === 'conditionSelect' && item.conditionBoost ? Object.keys(item.conditionBoost)[0] : '');
  const evTarget = item.evTarget ||
    (specialEffect === 'evSelect' && item.evBoost ? Object.keys(item.evBoost)[0] : '');
  const boostAmount = item.boostAmount ||
    (specialEffect === 'conditionSelect' && item.conditionBoost ? Object.values(item.conditionBoost)[0] :
     specialEffect === 'evSelect' && item.evBoost ? Object.values(item.evBoost)[0] : 0);

  return {
    ...EMPTY_ITEM,
    ...item,
    ivBoost: {},
    evBoost: { ...EMPTY_ITEM.evBoost, ...(item.evBoost || {}) },
    conditionBoost: { ...EMPTY_ITEM.conditionBoost, ...(item.conditionBoost || {}) },
    friendshipBoost: item.friendshipBoost || 0,
    specialEffect,
    conditionTarget,
    evTarget,
    boostAmount,
  };
}

// 모달 내용만 별도 컴포넌트로 분리 (생성/수정 공용)
export function CustomItemModal({ editItem = null, onSubmit, onClose }) {
  const isEdit = Boolean(editItem);
  const [itemData, setItemData] = useState(() =>
    isEdit ? normalizeForEdit(editItem) : { ...EMPTY_ITEM }
  );

  useEffect(() => {
    setItemData(isEdit ? normalizeForEdit(editItem) : { ...EMPTY_ITEM });
  }, [editItem]);

  const set = (fields) => setItemData(prev => ({ ...prev, ...fields }));
  const isFixedSpecialEffect = isSoyYYNItem(itemData);

  const handleSubmit = async () => {
    if (!itemData.name.trim()) { alert('아이템 이름을 입력해주세요!'); return; }

    const cleanConditionBoost = Object.fromEntries(
      Object.entries(itemData.conditionBoost).filter(([, v]) => Number(v) > 0)
    );
    const cleanEvBoost = Object.fromEntries(
      Object.entries(itemData.evBoost).filter(([, v]) => Number(v) > 0)
    );

    let finalConditionBoost = cleanConditionBoost;
    let finalEvBoost = cleanEvBoost;
    let finalSpecialEffect = isFixedSpecialEffect
      ? 'effortEdit'
      : itemData.specialEffect === 'iv' ? null : itemData.specialEffect;

    if (!isFixedSpecialEffect && (itemData.specialEffect === 'conditionSelect' || itemData.specialEffect === 'evSelect' || itemData.specialEffect === 'trainerExp' || itemData.specialEffect === 'maxPokemonSlots')) {
      if (!itemData.boostAmount || itemData.boostAmount <= 0) { alert('상승량을 입력해주세요!'); return; }
      finalConditionBoost = {};
      finalEvBoost = {};
    } else if (isFixedSpecialEffect) {
      finalConditionBoost = {};
      finalEvBoost = {};
    }

    const payload = {
      ...itemData,
      pocket: itemData.pocket || itemData.category,
      sellPrice: itemData.sellPrice || Math.floor(itemData.cost * 0.5),
      conditionBoost: finalConditionBoost,
      ivBoost: {},
      evBoost: finalEvBoost,
      specialEffect: finalSpecialEffect,
    };

    try {
      const success = await onSubmit(payload);
      if (success) {
        onClose();
      } else {
        alert(isEdit ? '아이템 수정에 실패했습니다.' : '아이템 생성에 실패했습니다.');
      }
    } catch (error) {
      console.error(isEdit ? '커스텀 아이템 수정 실패:' : '커스텀 아이템 생성 실패:', error);
      alert(isEdit ? '아이템 수정 중 오류가 발생했습니다.' : '아이템 생성 중 오류가 발생했습니다.');
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4"
      style={{ zIndex: 1000, pointerEvents: 'auto' }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        style={{ pointerEvents: 'auto' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="border-b-2 border-lime-300 bg-white/95 p-6">
          <h2 className="text-2xl font-bold flex items-center gap-2 text-green-950">
            <Sparkles size={24} className="text-lime-700" />
            {isEdit ? '커스텀 아이템 수정' : '커스텀 아이템 생성'}
          </h2>
          <p className="text-green-800 text-sm mt-1">
            {isEdit ? `"${editItem.name}" 아이템을 수정합니다.` : '나만의 독특한 아이템을 만들어보세요!'}
          </p>
        </div>

        <div className="p-6 space-y-4">
          {/* 이름 */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              아이템 이름 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={itemData.name}
              onChange={e => set({ name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="예: 마스터볼, 신비한 사탕"
            />
          </div>

          {/* nameEn */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              영어 ID (nameEn)
            </label>
            <input
              type="text"
              value={itemData.nameEn}
              onChange={e => set({ nameEn: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="예: custom-elegance-up (소문자, 하이픈)"
            />
          </div>

          {/* 카테고리 */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              카테고리 <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => set({ category: cat.id, pocket: cat.id })}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg font-semibold transition-all ${
                    itemData.category === cat.id
                      ? cat.color + ' ring-2 ring-offset-2 ring-purple-500'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span className="text-sm">{cat.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 가격 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">구매 가격 (원)</label>
              <input
                type="number"
                min="0"
                value={itemData.cost}
                onChange={e => set({ cost: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">판매 가격 (원)</label>
              <input
                type="number"
                min="0"
                value={itemData.sellPrice}
                onChange={e => set({ sellPrice: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder={`자동: ${Math.floor(itemData.cost * 0.5)}`}
              />
            </div>
          </div>

          {/* 인당 최대 구매 개수 */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              인당 최대 구매 개수 (평생 누적, 0이면 무제한)
            </label>
            <input
              type="number"
              min="0"
              value={itemData.maxPurchasePerMember}
              onChange={e => set({ maxPurchasePerMember: Math.max(0, parseInt(e.target.value) || 0) })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="0 = 무제한"
            />
          </div>

          {/* 판매 가능 */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="canSell"
              checked={itemData.canSell}
              onChange={e => set({ canSell: e.target.checked })}
              className="w-4 h-4 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
            />
            <label htmlFor="canSell" className="text-sm font-semibold text-gray-700">판매 가능한 아이템</label>
          </div>

          {/* 식재료 겸용 (카테고리와 별개로 요리 재료 목록에도 포함) */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isIngredient"
              checked={Boolean(itemData.cooking?.isIngredient)}
              onChange={e => set({ cooking: { ...(itemData.cooking || {}), isIngredient: e.target.checked } })}
              className="w-4 h-4 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
            />
            <label htmlFor="isIngredient" className="text-sm font-semibold text-gray-700">
              🥕 식재료로도 사용 가능 (원래 카테고리는 유지한 채 요리 재료 목록에 포함)
            </label>
          </div>

          {/* 특수 효과 선택 */}
          <div>
            {isFixedSpecialEffect ? (
              <>
                <label className="block text-sm font-semibold text-gray-700 mb-2">정해진 특수효과</label>
                <div className="w-full px-4 py-2 border border-purple-200 rounded-lg bg-purple-50 text-purple-700 font-semibold">
                  노력치 자유 배분
                </div>
              </>
            ) : (
              <>
                <label className="block text-sm font-semibold text-gray-700 mb-2">특수 효과 (선택)</label>
                <select
                  value={itemData.specialEffect || ''}
                  onChange={e => set({ specialEffect: e.target.value || null })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="">없음</option>
                  <option value="ev">노력치 상승 (전체 입력)</option>
                  <option value="evSelect">노력치 상승 (항목 선택)</option>
                  <option value="friendship">친밀도 상승</option>
                  <option value="condition">컨디션 상승 (전체 입력)</option>
                  <option value="conditionSelect">컨디션 상승 (항목 선택)</option>
                  <option value="trainerExp">멤버(트레이너) 경험치 상승</option>
                  <option value="maxPokemonSlots">최대 포켓몬 슬롯 상승</option>
                  <option value="effortEdit">노력치 자유배분</option>
                  <option value="unlockBerryPlanter">나무열매플랜터 슬롯 추가</option>
                </select>
              </>
            )}
          </div>

          {/* 노력치 */}
          {itemData.specialEffect === 'ev' && (
            <div className="bg-purple-50 rounded-lg p-4 border-2 border-purple-200">
              <h4 className="font-bold text-purple-800 mb-3">⚡ 노력치 상승량 (0-252)</h4>
              <div className="grid grid-cols-3 gap-3">
                {Object.keys(itemData.evBoost).map(stat => (
                  <div key={stat}>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">{STAT_LABELS[stat]}</label>
                    <input
                      type="number" min="0" max="252"
                      value={itemData.evBoost[stat]}
                      onChange={e => set({ evBoost: { ...itemData.evBoost, [stat]: Math.min(252, Math.max(0, parseInt(e.target.value) || 0)) } })}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    />
                  </div>
                ))}
              </div>
              <p className="text-xs text-purple-600 mt-2">💡 현재 노력치에 추가됩니다 (최대 252, 총합 510)</p>
            </div>
          )}

          {/* 친밀도 */}
          {itemData.specialEffect === 'friendship' && (
            <div className="bg-pink-50 rounded-lg p-4 border-2 border-pink-200">
              <h4 className="font-bold text-pink-800 mb-3">💖 친밀도 상승량</h4>
              <div className="flex items-center gap-4">
                <input
                  type="number" min="0" max="255"
                  value={itemData.friendshipBoost}
                  onChange={e => set({ friendshipBoost: Math.min(255, Math.max(0, parseInt(e.target.value) || 0)) })}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-lg font-semibold"
                />
                <span className="text-gray-600 font-semibold">/ 255</span>
              </div>
              <div className="mt-3 bg-pink-100 rounded-full h-3 overflow-hidden">
                <div className="h-full bg-pink-500 transition-all" style={{ width: `${(itemData.friendshipBoost / 255) * 100}%` }} />
              </div>
              <p className="text-xs text-pink-600 mt-2">💡 현재 친밀도에 추가됩니다 (최대 255)</p>
            </div>
          )}

          {/* 컨디션 선택 (항목은 사용자가 선택) */}
          {itemData.specialEffect === 'conditionSelect' && (
            <div className="bg-white/40 rounded-lg p-4 border-2 border-lime-200">
              <h4 className="font-bold text-green-900 mb-3">✨ 컨디션 항목 선택 상승</h4>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">상승량 (N)</label>
                <input
                  type="number" min="1" max="100"
                  value={itemData.boostAmount}
                  onChange={e => set({ boostAmount: Math.min(100, Math.max(1, parseInt(e.target.value) || 0)) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  placeholder="예: 10"
                />
              </div>
              {itemData.boostAmount > 0 && (
                <p className="text-xs text-lime-700 mt-2 font-semibold">
                  → 사용 시 유저가 컨디션 항목을 선택 후 +{itemData.boostAmount} 상승
                </p>
              )}
              <p className="text-xs text-purple-600 mt-1">💡 현재 컨디션에 추가됩니다 (최대 100)</p>
            </div>
          )}

          {/* 노력치 선택 (항목은 사용자가 선택) */}
          {itemData.specialEffect === 'evSelect' && (
            <div className="bg-purple-50 rounded-lg p-4 border-2 border-purple-200">
              <h4 className="font-bold text-purple-800 mb-3">⚡ 노력치 항목 선택 상승</h4>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">상승량 (N)</label>
                <input
                  type="number" min="1" max="252"
                  value={itemData.boostAmount}
                  onChange={e => set({ boostAmount: Math.min(252, Math.max(1, parseInt(e.target.value) || 0)) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  placeholder="예: 10"
                />
              </div>
              {itemData.boostAmount > 0 && (
                <p className="text-xs text-purple-700 mt-2 font-semibold">
                  → 사용 시 유저가 노력치 항목을 선택 후 +{itemData.boostAmount} 상승
                </p>
              )}
              <p className="text-xs text-purple-600 mt-1">💡 현재 노력치에 추가됩니다 (최대 252, 총합 510)</p>
            </div>
          )}

          {/* 멤버(트레이너) 경험치 */}
          {itemData.specialEffect === 'trainerExp' && (
            <div className="bg-blue-50 rounded-lg p-4 border-2 border-blue-200">
              <h4 className="font-bold text-blue-800 mb-3">🌟 멤버 경험치 상승량</h4>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">상승량 (N)</label>
                <input
                  type="number" min="1"
                  value={itemData.boostAmount}
                  onChange={e => set({ boostAmount: Math.max(1, parseInt(e.target.value) || 0) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  placeholder="예: 100"
                />
              </div>
              {itemData.boostAmount > 0 && (
                <p className="text-xs text-blue-700 mt-2 font-semibold">
                  → 사용 시 대상 포켓몬이 아닌 사용한 멤버 본인의 경험치가 +{itemData.boostAmount} 상승
                </p>
              )}
              <p className="text-xs text-blue-600 mt-1">💡 포켓몬이 아닌 멤버(트레이너)의 경험치에 추가됩니다</p>
            </div>
          )}

          {/* 최대 포켓몬 슬롯 */}
          {itemData.specialEffect === 'maxPokemonSlots' && (
            <div className="bg-teal-50 rounded-lg p-4 border-2 border-teal-200">
              <h4 className="font-bold text-teal-800 mb-3">🎒 최대 포켓몬 슬롯 상승량</h4>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">상승량 (N)</label>
                <input
                  type="number" min="1"
                  value={itemData.boostAmount}
                  onChange={e => set({ boostAmount: Math.max(1, parseInt(e.target.value) || 0) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  placeholder="예: 3"
                />
              </div>
              {itemData.boostAmount > 0 && (
                <p className="text-xs text-teal-700 mt-2 font-semibold">
                  → 사용 시 사용한 멤버 본인의 최대 포켓몬 소지 수가 +{itemData.boostAmount} 됩니다
                </p>
              )}
              <p className="text-xs text-teal-600 mt-1">💡 포켓몬이 아닌 사용한 멤버(트레이너) 개인에게만 누적 적용됩니다</p>
            </div>
          )}

          {/* 노력치 자유배분 */}
          {itemData.specialEffect === 'effortEdit' && (
            <div className="bg-orange-50 rounded-lg p-4 border-2 border-orange-200">
              <h4 className="font-bold text-orange-800 mb-2">🧮 노력치 자유배분</h4>
              <p className="text-xs text-orange-700">
                → 사용 시 대상 포켓몬을 고른 뒤, 능력치별 노력치를 원하는 대로 자유롭게 재분배할 수 있는 화면이 뜹니다 (총합 510 제한은 그대로 적용).
              </p>
              <p className="text-xs text-orange-600 mt-1">💡 별도 상승량 입력은 필요 없습니다.</p>
            </div>
          )}

          {/* 나무열매플랜터 슬롯 추가 */}
          {itemData.specialEffect === 'unlockBerryPlanter' && (
            <div className="bg-lime-50 rounded-lg p-4 border-2 border-lime-200">
              <h4 className="font-bold text-lime-800 mb-2">🌱 나무열매플랜터 슬롯 추가</h4>
              <p className="text-xs text-lime-700">
                → 사용 시 사용한 멤버 본인의 나무열매 농장 플랜터 슬롯이 +1 됩니다 (최대 4개까지).
              </p>
              <p className="text-xs text-lime-600 mt-1">💡 별도 상승량 입력은 필요 없습니다.</p>
            </div>
          )}

          {/* 컨디션 */}
          {itemData.specialEffect === 'condition' && (
            <div className="bg-white/40 rounded-lg p-4 border-2 border-lime-200">
              <h4 className="font-bold text-green-900 mb-3">✨ 컨디션 상승량 (0-100)</h4>
              <div className="grid grid-cols-2 gap-3">
                {Object.keys(itemData.conditionBoost).map(stat => (
                  <div key={stat}>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">{CONDITION_LABELS[stat]}</label>
                    <input
                      type="number" min="0" max="100"
                      value={itemData.conditionBoost[stat]}
                      onChange={e => set({ conditionBoost: { ...itemData.conditionBoost, [stat]: Math.min(100, Math.max(0, parseInt(e.target.value) || 0)) } })}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    />
                  </div>
                ))}
              </div>
              <p className="text-xs text-purple-600 mt-2">💡 현재 컨디션에 추가됩니다 (최대 100)</p>
            </div>
          )}

          {/* 효과 설명 */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">효과 설명</label>
            <textarea
              value={itemData.effect}
              onChange={e => set({ effect: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              rows="3"
              placeholder="아이템의 효과를 설명해주세요"
            />
          </div>

          {/* 이미지 URL */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">이미지 URL (선택)</label>
            <input
              type="text"
              value={itemData.spriteUrl}
              onChange={e => set({ spriteUrl: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="https://..."
            />
            {itemData.spriteUrl && (
              <div className="mt-2 flex items-center gap-2">
                <span className="text-sm text-gray-600">미리보기:</span>
                <img
                  src={itemData.spriteUrl}
                  alt="preview"
                  className="w-12 h-12"
                  style={{ imageRendering: 'pixelated' }}
                  onError={e => { e.target.style.display = 'none'; }}
                />
              </div>
            )}
          </div>

          {/* 하단 버튼 */}
          <div className="flex gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold transition-colors"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="flex-1 px-4 py-2 border-2 border-lime-300 bg-white/55 text-green-950 rounded-lg hover:bg-lime-100/70 font-semibold transition-all shadow-sm"
            >
              {isEdit ? '수정하기' : '생성하기'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CustomItemCreator({ onCreateItem }) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="flex items-center gap-2 border-2 border-lime-300 bg-white/55 text-green-950 px-4 py-2 rounded-lg hover:bg-lime-100/70 font-semibold transition-all shadow-sm"
      >
        <Sparkles size={18} className="text-lime-700" />
        커스텀 아이템 생성
      </button>

      {showModal && (
        <CustomItemModal
          onSubmit={async (payload) => {
            const ok = await onCreateItem?.(payload);
            return ok;
          }}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}

export default CustomItemCreator;
