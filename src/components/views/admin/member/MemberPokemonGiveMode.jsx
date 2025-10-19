// src/components/views/admin/member/MemberPokemonGiveMode.jsx
import React, { useMemo } from 'react';
import { 
  X, Gift, Sparkles, Plus, Trash2, Award, Zap, Heart, Star, Check, Image as ImageIcon
} from 'lucide-react';
import { POKEBALL_LIST } from '../../../../styles/theme';

export default function MemberPokemonGiveMode({
  allPokemonMaster,
  giveData,
  setGiveData,
  onGive,
  onCancel,
  onOpenItemModal,
  onOpenMoveModal
}) {
  const filteredPokemon = useMemo(() => {
    if (!giveData.searchQuery) return allPokemonMaster.slice(0, 50);
    const query = giveData.searchQuery.toLowerCase();
    return allPokemonMaster
      .filter(p => 
        p.name?.toLowerCase().includes(query) || 
        p.nameEn?.toLowerCase().includes(query) ||
        p.number?.toString().includes(query)
      )
      .slice(0, 50);
  }, [giveData.searchQuery, allPokemonMaster]);

  return (
    <div className="bg-white rounded-lg border p-4 space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold">포켓몬 지급</h3>
        <button onClick={onCancel}>
          <X size={20} />
        </button>
      </div>

      <div>
        <label className="block text-sm font-semibold mb-2">포켓몬 검색</label>
        <input
          type="text"
          value={giveData.searchQuery}
          onChange={(e) => setGiveData(prev => ({ ...prev, searchQuery: e.target.value }))}
          placeholder="이름, 영문명, 도감번호 검색..."
          className="w-full px-3 py-2 border rounded"
        />
      </div>

      <div className="grid grid-cols-4 gap-2 max-h-[300px] overflow-y-auto p-2 border rounded">
        {filteredPokemon.map(pokemon => (
          <button
            key={pokemon.number}
            onClick={() => setGiveData(prev => ({ 
              ...prev, 
              selectedPokemon: pokemon,
              nickname: pokemon.name,
              selectedMoves: []
            }))}
            className={`p-2 rounded border ${
              giveData.selectedPokemon?.number === pokemon.number
                ? 'bg-blue-100 border-blue-500'
                : 'bg-white hover:bg-gray-50'
            }`}
          >
            <img 
              src={pokemon.sprite || `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.number}.png`}
              alt={pokemon.name}
              className="w-12 h-12 mx-auto mb-1"
              style={{ imageRendering: 'pixelated' }}
              onError={(e) => {
                e.target.src = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/0.png';
              }}
            />
            <p className="text-xs text-center truncate">{pokemon.name}</p>
            <p className="text-xs text-gray-500 text-center">No.{pokemon.number}</p>
          </button>
        ))}
      </div>

      {giveData.selectedPokemon && (
        <>
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
            포켓몬 지급하기
          </button>
        </>
      )}
    </div>
  );
}