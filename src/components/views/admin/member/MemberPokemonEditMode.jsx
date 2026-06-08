// src/components/views/admin/member/MemberPokemonEditMode.jsx
import React from 'react';
import { 
  X, Save, Sparkles, Image, Gift, Star, Award, Zap, Heart, Plus, Trash2, ImageIcon
} from 'lucide-react';
import { POKEBALL_LIST } from '../../../../styles/theme';
import { getPokemonGenderOptions } from '../../../../utils/pokemonGender';

export default function MemberPokemonEditMode({ 
  pokemon,
  pokemonTemplate,
  editData,
  setEditData,
  allMoves,
  onSave,
  onCancel,
  onDelete,
  onOpenItemModal,
  onOpenMoveModal
}) {
  const genderOptions = getPokemonGenderOptions(pokemonTemplate || pokemon);
  const isGenderless = genderOptions.length === 1 && genderOptions[0] === 'none';
  const genderValue = genderOptions.includes(editData.gender) ? editData.gender : 'random';

  return (
    <div className="bg-white rounded-lg border p-4 space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold">포켓몬 수정</h3>
        <button onClick={onCancel}>
          <X size={20} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* 왼쪽 컬럼 */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1">레벨</label>
              <input
                type="number"
                min="1"
                max="100"
                value={editData.level}
                onChange={(e) => setEditData(prev => ({ ...prev, level: e.target.value }))}
                className="w-full px-3 py-2 border rounded"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">닉네임</label>
              <input
                type="text"
                value={editData.nickname}
                onChange={(e) => setEditData(prev => ({ ...prev, nickname: e.target.value }))}
                className="w-full px-3 py-2 border rounded"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="editShiny"
              checked={editData.isShiny}
              onChange={(e) => setEditData(prev => ({ ...prev, isShiny: e.target.checked }))}
            />
            <label htmlFor="editShiny" className="text-sm font-semibold flex items-center gap-1">
              <Sparkles size={14} className="text-yellow-500" />
              이로치 (스프라이트 자동변경)
            </label>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1 flex items-center gap-2">
              <Image size={14} />
              스프라이트 URL
            </label>
            <input
              type="text"
              value={editData.spriteUrl}
              onChange={(e) => setEditData(prev => ({ ...prev, spriteUrl: e.target.value }))}
              className="w-full px-3 py-2 border rounded text-xs"
              placeholder="https://..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1">포획볼</label>
              <select
                 value={editData.caughtWithBall || '몬스터볼'}  // ⭐ 추가
                onChange={(e) => setEditData(prev => ({ ...prev, caughtWithBall: e.target.value }))}
                className="w-full px-3 py-2 border rounded"
              >
                {POKEBALL_LIST.map(ball => (
                  <option key={ball.nameEn} value={ball.name}>{ball.name}</option>
                ))}
                <option value="기타">기타 (직접입력)</option>
              </select>
            </div>

            {editData.caughtWithBall === '기타' && (
              <div>
                <label className="block text-sm font-semibold mb-1 flex items-center gap-1">
                  <ImageIcon size={14} />
                  볼 이미지 URL
                </label>
                <input
                  type="text"
                  value={editData.customBallImage || ''}
                  onChange={(e) => setEditData(prev => ({ ...prev, customBallImage: e.target.value }))}
                  placeholder="이미지 URL 입력"
                  className="w-full px-3 py-2 border rounded text-sm"
                />
              </div>
            )}
          </div>

              {/* ⭐ 성별 선택 */}
              <div>
                <label className="block text-sm font-semibold mb-2">성별</label>
                <select
                  value={isGenderless ? 'none' : genderValue}
                  onChange={(e) => setEditData(prev => ({ ...prev, gender: e.target.value }))}
                  className="w-full px-3 py-2 border rounded"
                >
                  {!isGenderless && <option value="random">랜덤</option>}
                  {genderOptions.includes('male') && <option value="male">수컷 (♂)</option>}
                  {genderOptions.includes('female') && <option value="female">암컷 (♀)</option>}
                  {isGenderless && <option value="none">무성</option>}
                </select>
              </div>

              {/* ⭐ 체구 등급 */}
              <div>
                <label className="block text-sm font-semibold mb-2">체구 등급</label>
                <div className="grid grid-cols-7 gap-2">
                  {['XXXS', 'XXS', 'XS', 'M', 'XL', 'XXL', 'XXXL'].map(size => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setEditData(prev => ({ ...prev, sizeRank: size }))}
                      className={`px-3 py-2 rounded font-semibold text-xs transition-all ${
                        editData.sizeRank === size
                          ? 'bg-indigo-600 text-white shadow-md'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              {/* ⭐ 키 변동률 */}
              <div>
                <label className="block text-sm font-semibold mb-2">
                  키 변동률 (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="200"
                  step="0.1"
                  value={editData.heightVariation || 100}
                  onChange={(e) => setEditData(prev => ({ 
                    ...prev, 
                    heightVariation: parseFloat(e.target.value) || 100
                  }))}
                  className="w-full px-3 py-2 border rounded"
                />
              </div>

              {/* ⭐ 무게 변동률 */}
              <div>
                <label className="block text-sm font-semibold mb-2">
                  무게 변동률 (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="200"
                  step="0.1"
                  value={editData.weightVariation || 100}
                  onChange={(e) => setEditData(prev => ({ 
                    ...prev, 
                    weightVariation: parseFloat(e.target.value) || 100
                  }))}
                  className="w-full px-3 py-2 border rounded"
                />
              </div>

          <div>
            <label className="block text-sm font-semibold mb-2 flex items-center gap-2">
              <Star size={14} />
              기술 ({editData.moves.length}/4)
            </label>
            <div className="space-y-2 mb-2">
              {editData.moves.map((move, index) => {
                const moveData = allMoves.find(m => m.id === move.moveId);
                return (
                  <div key={index} className="flex items-center gap-2 bg-gray-50 p-2 rounded border">
                    <div className="flex-1">
                      <p className="text-sm font-semibold">{moveData?.name || '???'}</p>
                      <p className="text-xs text-gray-500">PP: {move.currentPp}/{moveData?.pp || 0}</p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        setEditData(prev => ({
                          ...prev,
                          moves: prev.moves.filter((_, i) => i !== index)
                        }));
                      }}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                );
              })}
            </div>

            {editData.moves.length < 4 && (
              <button
                type="button"
                onClick={onOpenMoveModal}
                className="w-full bg-indigo-50 text-indigo-600 px-4 py-2 rounded border-2 border-indigo-200 hover:bg-indigo-100 font-semibold"
              >
                <Plus size={16} className="inline mr-2" />
                기술 추가
              </button>
            )}
          </div>
        </div>

       {/* 오른쪽 컬럼 */}
          <div className="space-y-4">
            {/* ⭐ 친밀도 입력 필드 추가 */}
            <div>
              <label className="block text-sm font-semibold mb-2 flex items-center gap-2">
                <Heart size={14} />
                친밀도
              </label>
              <input
                type="number"
                min="0"
                max="255"
                value={editData.friendship || 0}
                onChange={(e) => setEditData(prev => ({ 
                  ...prev, 
                  friendship: Math.min(255, Math.max(0, parseInt(e.target.value) || 0))
                }))}
                className="w-full px-3 py-2 border rounded"
                placeholder="0-255"
              />
              <div className="mt-1 w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-pink-500 h-2 rounded-full transition-all" 
                  style={{ width: `${((editData.friendship || 0) / 255) * 100}%` }} 
                />
              </div>
            </div>

  
          <div>
            <label className="block text-sm font-semibold mb-2 flex items-center gap-2">
              <Gift size={14} />
              지닌 물건
            </label>
            <div className="flex gap-2">
              {editData.heldItem ? (
                <div className="flex-1 bg-gray-50 border rounded px-3 py-2 flex items-center justify-between">
                  <span className="text-sm">{editData.heldItem}</span>
                  <button
                    onClick={() => setEditData(prev => ({ ...prev, heldItem: null }))}
                    className="text-red-600 hover:text-red-800"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={onOpenItemModal}
                  className="flex-1 bg-gray-50 text-gray-600 px-3 py-2 rounded border-2 border-dashed border-gray-300 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600"
                >
                  <Plus size={16} className="inline mr-2" />
                  아이템 선택
                </button>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2 flex items-center gap-2">
              <Award size={14} />
              개체값 (IVs)
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { key: 'hp', label: 'HP' },
                { key: 'attack', label: '공격' },
                { key: 'defense', label: '방어' },
                { key: 'specialAttack', label: '특공' },
                { key: 'specialDefense', label: '특방' },
                { key: 'speed', label: '스피드' }
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className="text-xs text-gray-600">{label}</label>
                  <input
                    type="number"
                    min="0"
                    max="31"
                    value={editData.ivs[key]}
                    onChange={(e) => setEditData(prev => ({
                      ...prev,
                      ivs: { ...prev.ivs, [key]: parseInt(e.target.value) || 0 }
                    }))}
                    className="w-full px-2 py-1 border rounded text-sm"
                  />
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2 flex items-center gap-2">
              <Zap size={14} />
              노력치 (EVs)
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { key: 'hp', label: 'HP' },
                { key: 'attack', label: '공격' },
                { key: 'defense', label: '방어' },
                { key: 'specialAttack', label: '특공' },
                { key: 'specialDefense', label: '특방' },
                { key: 'speed', label: '스피드' }
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className="text-xs text-gray-600">{label}</label>
                  <input
                    type="number"
                    min="0"
                    max="252"
                    value={editData.effort[key]}
                    onChange={(e) => setEditData(prev => ({
                      ...prev,
                      effort: { ...prev.effort, [key]: parseInt(e.target.value) || 0 }
                    }))}
                    className="w-full px-2 py-1 border rounded text-sm"
                  />
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2 flex items-center gap-2">
              <Heart size={14} />
              컨디션
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { key: 'elegance', label: '근사함' },
                { key: 'beauty', label: '아름다움' },
                { key: 'cuteness', label: '귀여움' },
                { key: 'intelligence', label: '슬기로움' },
                { key: 'strength', label: '강인함' }
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className="text-xs text-gray-600">{label}</label>
                  <input
                    type="number"
                    min="0"
                    max="255"
                    value={editData.condition[key]}
                    onChange={(e) => setEditData(prev => ({
                      ...prev,
                      condition: { ...prev.condition, [key]: parseInt(e.target.value) || 0 }
                    }))}
                    className="w-full px-2 py-1 border rounded text-sm"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-2 pt-4 border-t">
          <button
            onClick={onSave}
            className="flex-1 bg-blue-500 text-white px-4 py-2 rounded font-semibold hover:bg-blue-600"
          >
            <Save size={16} className="inline mr-2" />
            저장
          </button>
          <button
            onClick={onCancel}
            className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded font-semibold hover:bg-gray-400"
          >
            <X size={16} className="inline mr-2" />
            취소
          </button>
          <button
            onClick={() => {
              if (window.confirm(`정말 ${pokemon.nickname || pokemon.name}을(를) 삭제하시겠습니까?`)) {
                onDelete?.(pokemon.uniqueId);
              }
            }}
            className="bg-red-500 text-white px-4 py-2 rounded font-semibold hover:bg-red-600"
          >
            <Trash2 size={16} className="inline mr-2" />
            삭제
          </button>
        </div>
    </div>
  );
}
