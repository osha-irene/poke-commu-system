
// src/components/views/admin/member/MemberPokemonGiveMode.jsx
import React from 'react';
import {
  X, Gift, Sparkles, Plus, Trash2, Award, Zap, Heart, Star, Check, User, Ruler, Scale, Image as ImageIcon, Search
} from 'lucide-react';
import { POKEBALL_LIST } from '../../../../styles/theme';
import { getPokemonGenderOptions } from '../../../../utils/pokemonGender';
import { getGenderedSpriteUrl } from '../../../../utils/pokemonImageUtils';
import { getAbilityKoreanName } from '../../../../utils/abilityUtils';

export default function MemberPokemonGiveMode({
  allPokemonMaster,
  giveData,
  setGiveData,
  onGive,
  onCancel,
  onOpenItemModal,
  onOpenMoveModal,
  onOpenPokemonPicker
}) {
  const genderOptions = getPokemonGenderOptions(giveData.selectedPokemon);
  const isGenderless = genderOptions.length === 1 && genderOptions[0] === 'none';
  const genderValue = genderOptions.includes(giveData.gender) ? giveData.gender : 'random';


  return (
    <div className="bg-white rounded-lg border p-4 space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold">포켓몬 지급</h3>
        <button onClick={onCancel}>
          <X size={20} />
        </button>
      </div>

      {/* 포켓몬 선택 영역 */}
      <div className="flex items-center gap-3 rounded-lg border bg-gray-50 p-3">
        {giveData.selectedPokemon ? (
          <>
            <img
              src={
                getGenderedSpriteUrl({ gender: giveData.gender }, giveData.selectedPokemon) ||
                giveData.selectedPokemon.spriteUrl ||
                `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${giveData.selectedPokemon.number}.png`
              }
              alt={giveData.selectedPokemon.name}
              className="h-12 w-12"
              style={{ imageRendering: 'pixelated' }}
            />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-bold">{giveData.selectedPokemon.name}</div>
              <div className="text-xs text-gray-500">No.{giveData.selectedPokemon.number}</div>
            </div>
          </>
        ) : (
          <div className="flex-1 text-sm text-gray-400">선택된 포켓몬 없음</div>
        )}
        <button
          type="button"
          onClick={onOpenPokemonPicker}
          className="shrink-0 rounded border bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
        >
          <Search size={14} className="inline mr-1" />
          {giveData.selectedPokemon ? '다른 포켓몬 선택' : '포켓몬 선택'}
        </button>
      </div>

      {giveData.selectedPokemon && (
        <>
          {giveData.asEgg && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              🥚 알로 지급합니다. 부화 시 아래 설정(개체값·성별·특성·기술 등)이 적용됩니다. 레벨·닉네임·파트너 설정은 무시됩니다.
            </div>
          )}

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
                    value={giveData.level}
                    onChange={(e) => setGiveData(prev => ({ ...prev, level: parseInt(e.target.value) || 1 }))}
                    className="w-full px-3 py-2 border rounded"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-1">닉네임</label>
                  <input
                    type="text"
                    value={giveData.nickname}
                    onChange={(e) => setGiveData(prev => ({ ...prev, nickname: e.target.value }))}
                    className="w-full px-3 py-2 border rounded"
                  />
                </div>
              </div>
              {/* ⭐ 파트너 체크박스 추가 */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="giveAsEgg"
                    checked={giveData.asEgg || false}
                    onChange={(e) => setGiveData(prev => ({ ...prev, asEgg: e.target.checked }))}
                  />
                  <label htmlFor="giveAsEgg" className="text-sm font-semibold flex items-center gap-1">
                    🥚 알로 지급
                  </label>
                </div>
                {!giveData.asEgg && (
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="givePartner"
                      checked={giveData.isPartner || false}
                      onChange={(e) => setGiveData(prev => ({ ...prev, isPartner: e.target.checked }))}
                    />
                    <label htmlFor="givePartner" className="text-sm font-semibold flex items-center gap-1">
                      💖 파트너 포켓몬으로 설정
                    </label>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-1">포획볼</label>
                  <select
                    value={giveData.caughtWithBall}
                    onChange={(e) => setGiveData(prev => ({ ...prev, caughtWithBall: e.target.value }))}
                    className="w-full px-3 py-2 border rounded"
                  >
                    {POKEBALL_LIST.map(ball => (
                      <option key={ball.nameEn} value={ball.name}>{ball.name}</option>
                    ))}
                    <option value="기타">기타 (직접입력)</option>
                  </select>
                </div>

                {giveData.caughtWithBall === '기타' ? (
                  <div>
                    <label className="block text-sm font-semibold mb-1 flex items-center gap-1">
                      <ImageIcon size={14} />
                      볼 이미지 URL
                    </label>
                    <input
                      type="text"
                      value={giveData.customBallImage || ''}
                      onChange={(e) => setGiveData(prev => ({ ...prev, customBallImage: e.target.value }))}
                      placeholder="이미지 URL 입력"
                      className="w-full px-3 py-2 border rounded text-sm"
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-2 pt-6">
                    <input
                      type="checkbox"
                      id="giveShiny"
                      checked={giveData.isShiny}
                      onChange={(e) => setGiveData(prev => ({ ...prev, isShiny: e.target.checked }))}
                    />
                    <label htmlFor="giveShiny" className="text-sm font-semibold flex items-center gap-1">
                      <Sparkles size={14} className="text-yellow-500" />
                      이로치
                    </label>
                  </div>
                )}
              </div>

              {giveData.caughtWithBall === '기타' && (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="giveShiny"
                    checked={giveData.isShiny}
                    onChange={(e) => setGiveData(prev => ({ ...prev, isShiny: e.target.checked }))}
                  />
                  <label htmlFor="giveShiny" className="text-sm font-semibold flex items-center gap-1">
                    <Sparkles size={14} className="text-yellow-500" />
                    이로치
                  </label>
                </div>
              )}

                        {/* 성별/특성/체구 설정 */}
          <div className="space-y-4 bg-blue-50 p-4 rounded-lg">
            <div className="grid grid-cols-3 gap-4">
              {/* 성별 */}
              <div>
                <label className="block text-sm font-semibold mb-1 flex items-center gap-1">
                  <User size={14} />
                  성별
                </label>
                <select
                  value={isGenderless ? 'none' : genderValue}
                  onChange={(e) => setGiveData(prev => ({ ...prev, gender: e.target.value }))}
                  className="w-full px-3 py-2 border rounded text-sm"
                >
                  {!isGenderless && <option value="random">랜덤</option>}
                  {genderOptions.includes('male') && <option value="male">♂ 수컷</option>}
                  {genderOptions.includes('female') && <option value="female">♀ 암컷</option>}
                  {isGenderless && <option value="none">무성</option>}
                </select>
              </div>

              {/* 특성 */}
              <div className="col-span-2">
                <label className="block text-sm font-semibold mb-1 flex items-center gap-1">
                  <Zap size={14} />
                  특성
                </label>
                <select
                  value={giveData.ability}
                  onChange={(e) => setGiveData(prev => ({ ...prev, ability: e.target.value }))}
                  className="w-full px-3 py-2 border rounded text-sm"
                >
                  <option value="">기본 특성 (랜덤)</option>
                  {giveData.selectedPokemon?.abilitiesEn?.map((ab, idx) => (
                    <option key={idx} value={ab}>{getAbilityKoreanName(ab) || ab}</option>
                  ))}
                  {giveData.selectedPokemon?.hiddenAbilityEn && (
                    <option value={giveData.selectedPokemon.hiddenAbilityEn}>
                      {getAbilityKoreanName(giveData.selectedPokemon.hiddenAbilityEn) || giveData.selectedPokemon.hiddenAbilityEn} (숨특)
                    </option>
                  )}
                </select>
              </div>
            </div>

              {/* 체구 설정 */}
              <div>
                <label className="block text-sm font-semibold mb-2">체구 등급</label>
                <div className="flex gap-2">
                  {['XXXS', 'XXS', 'XS', 'M', 'XL', 'XXL', 'XXXL'].map(size => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setGiveData(prev => ({ ...prev, sizeRank: size }))}
                      className={`flex-1 px-2 py-1 rounded text-xs font-bold ${
                        giveData.sizeRank === size 
                          ? 'bg-indigo-600 text-white' 
                          : 'bg-gray-200 text-gray-700'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              {/* 키/몸무게 변동률 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-1 flex items-center gap-1">
                    <Ruler size={14} />
                    키 변동률 (%)
                  </label>
                  <input
                    type="number"
                    min="70"
                    max="130"
                    value={giveData.heightVariation}
                    onChange={(e) => setGiveData(prev => ({ ...prev, heightVariation: parseFloat(e.target.value) || 100 }))}
                    className="w-full px-3 py-2 border rounded text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1 flex items-center gap-1">
                    <Scale size={14} />
                    몸무게 변동률 (%)
                  </label>
                  <input
                    type="number"
                    min="70"
                    max="130"
                    value={giveData.weightVariation}
                    onChange={(e) => setGiveData(prev => ({ ...prev, weightVariation: parseFloat(e.target.value) || 100 }))}
                    className="w-full px-3 py-2 border rounded text-sm"
                  />
                </div>
              </div>
            </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-semibold flex items-center gap-2">
                    <Star size={14} />
                    기술 ({giveData.selectedMoves.length}/4)
                  </label>
                  <button
                    onClick={() => setGiveData(prev => ({ ...prev, randomMoves: !prev.randomMoves }))}
                    className={`text-xs px-2 py-1 rounded ${
                      giveData.randomMoves 
                        ? 'bg-purple-500 text-white' 
                        : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    {giveData.randomMoves ? <Check size={12} className="inline mr-1" /> : null}
                    랜덤 기술
                  </button>
                </div>

                {!giveData.randomMoves && (
                  <>
                    <div className="space-y-2 mb-2">
                      {giveData.selectedMoves.map((move, index) => (
                        <div key={index} className="flex items-center gap-2 bg-gray-50 p-2 rounded border">
                          <div className="flex-1">
                            <p className="text-sm font-semibold">{move.name}</p>
                            <p className="text-xs text-gray-500">PP: {move.pp}</p>
                          </div>
                          <button
                            onClick={() => {
                              setGiveData(prev => ({
                                ...prev,
                                selectedMoves: prev.selectedMoves.filter((_, i) => i !== index)
                              }));
                            }}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>

                    {giveData.selectedMoves.length < 4 && (
                      <button
                        type="button"
                        onClick={onOpenMoveModal}
                        className="w-full bg-indigo-50 text-indigo-600 px-4 py-2 rounded border-2 border-indigo-200 hover:bg-indigo-100 font-semibold"
                      >
                        <Plus size={16} className="inline mr-2" />
                        기술 추가
                      </button>
                    )}
                  </>
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
                  value={giveData.friendship || 0}
                  onChange={(e) => setGiveData(prev => ({ 
                    ...prev, 
                    friendship: Math.min(255, Math.max(0, parseInt(e.target.value) || 0))
                  }))}
                  className="w-full px-3 py-2 border rounded"
                  placeholder="0-255"
                />
                <div className="mt-1 w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-pink-500 h-2 rounded-full transition-all" 
                    style={{ width: `${((giveData.friendship || 0) / 255) * 100}%` }} 
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2 flex items-center gap-2">
                  <Gift size={14} />
                  지닌 물건
                </label>
                <div className="flex gap-2">
                  {giveData.heldItem ? (
                    <div className="flex-1 bg-gray-50 border rounded px-3 py-2 flex items-center justify-between">
                      <span className="text-sm">{giveData.heldItem}</span>
                      <button
                        onClick={() => setGiveData(prev => ({ ...prev, heldItem: null }))}
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
                        value={giveData.ivs[key]}
                        onChange={(e) => setGiveData(prev => ({
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
                        value={giveData.effort[key]}
                        onChange={(e) => setGiveData(prev => ({
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
                        value={giveData.condition[key]}
                        onChange={(e) => setGiveData(prev => ({
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

          <button
            onClick={onGive}
            className="w-full bg-green-500 text-white px-4 py-3 rounded font-bold hover:bg-green-600"
          >
            <Gift size={16} className="inline mr-2" />
            {giveData.asEgg ? '알로 지급하기 🥚' : '포켓몬 지급하기'}
          </button>
        </>
      )}
    </div>
  );
}
