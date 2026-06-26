import React, { useState, useEffect } from 'react';
import { ArrowUpCircle, ArrowDownCircle, Trash2, Heart, X, Edit2, Check } from 'lucide-react';

export default function PokemonDetailPanel({ 
  pokemon, 
  hasRareCandy,
  onClose,
  onUseCandy,
  onMove,
  onRelease,
  onUpdateNickname
}) {
  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [nickname, setNickname] = useState(pokemon.nickname || pokemon.name);
  
  // pokemon이 변경될 때마다 nickname 동기화
  useEffect(() => {
    setNickname(pokemon.nickname || pokemon.name);
    setIsEditingNickname(false);
  }, [pokemon.uniqueId, pokemon.nickname, pokemon.name]);
  
  const hpPercent = Math.max(0, (pokemon.hp / pokemon.maxHp) * 100);
  const hpColor = hpPercent > 50 ? 'bg-green-500' : hpPercent > 20 ? 'bg-yellow-500' : 'bg-red-500';

  const handleSaveNickname = async () => {
    if (nickname.trim()) {
      const saved = await onUpdateNickname(pokemon.uniqueId, nickname.trim());
      if (saved !== false) setIsEditingNickname(false);
    }
  };

  const handleCancelEdit = () => {
    setNickname(pokemon.nickname || pokemon.name);
    setIsEditingNickname(false);
  };

  return (
    <div className="w-full bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-2xl font-bold text-gray-800">포켓몬 정보</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X size={20} />
        </button>
      </div>

      {/* 왼쪽 이미지 + 오른쪽 전체 정보 */}
      <div className="flex gap-6">
        {/* 포켓몬 이미지 (75% 크기 + 여백) */}
        <div className="flex-shrink-0">
          <div 
            className="w-36 h-36 p-4 bg-white/40 rounded-lg border-2 border-lime-200"
            style={{
              backgroundImage: `url(${pokemon.spriteUrl || pokemon.imageUrl})`,
              backgroundSize: '75%',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'center',
              imageRendering: 'pixelated'
            }}
          />
        </div>

        {/* 오른쪽: 모든 정보 */}
        <div className="flex-1 flex flex-col gap-3">
          {/* 기본 정보 */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm bg-gray-200 px-2 py-1 rounded">No.{pokemon.number}</span>
              <span className="text-sm bg-blue-100 text-blue-700 px-2 py-1 rounded font-semibold">
                {pokemon.type}
              </span>
              <span className="text-sm text-gray-500">{pokemon.name}</span>
            </div>
            
            {/* 별명 편집 */}
            {isEditingNickname ? (
              <div className="flex items-center gap-2 mb-1">
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  maxLength={12}
                  className="text-3xl font-bold border-b-2 border-indigo-500 focus:outline-none bg-transparent"
                  autoFocus
                  onKeyPress={(e) => e.key === 'Enter' && handleSaveNickname()}
                />
                <button
                  onClick={handleSaveNickname}
                  className="text-green-600 hover:text-green-700"
                >
                  <Check size={20} />
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={20} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-3xl font-bold">{nickname}</h2>
                <button
                  onClick={() => setIsEditingNickname(true)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <Edit2 size={16} />
                </button>
              </div>
            )}
            
            <div className="text-xl text-gray-600">Lv. {pokemon.level}</div>
          </div>

          {/* HP 바 */}
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex justify-between items-center mb-2">
              <span className="text-base font-semibold text-gray-700">HP</span>
              <span className="text-base text-gray-600">{pokemon.hp}/{pokemon.maxHp}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className={`h-2 rounded-full transition-all ${hpColor}`} style={{ width: `${hpPercent}%` }} />
            </div>
          </div>

          {/* 경험치 + 친밀도 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
              <div className="text-sm text-gray-600">경험치</div>
              <div className="text-xl font-bold text-purple-600">{pokemon.exp || 0}</div>
            </div>

            <div className="bg-pink-50 rounded-lg p-3 border border-pink-200">
              <div className="flex items-center gap-1 mb-2">
                <Heart size={12} className="text-pink-500" />
                <span className="text-sm font-semibold text-gray-700">친밀도</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
                <div className="bg-pink-500 h-2 rounded-full" style={{ width: `${pokemon.friendship || 50}%` }} />
              </div>
              <div className="text-sm text-gray-600 text-right">
                {pokemon.friendship || 50}/100
              </div>
            </div>
          </div>

          {/* 액션 버튼 */}
          <div className="space-y-2">
            <button
              onClick={onUseCandy}
              disabled={!hasRareCandy}
              className={`w-full py-2 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 ${
                hasRareCandy
                  ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200 border border-yellow-300'
                  : 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
              }`}
            >
              <span>🍬</span>
              <span>이상한사탕 사용</span>
            </button>

            <button
              onClick={onMove}
              className="w-full bg-indigo-100 text-indigo-700 py-2 rounded-lg font-semibold hover:bg-indigo-200 transition-colors flex items-center justify-center gap-2 border border-indigo-300"
            >
              {pokemon.isInParty ? (
                <>
                  <ArrowDownCircle size={18} />
                  <span>박스로 이동</span>
                </>
              ) : (
                <>
                  <ArrowUpCircle size={18} />
                  <span>엔트리로 이동</span>
                </>
              )}
            </button>

            <button
              onClick={onRelease}
              className="w-full bg-red-50 text-red-600 py-2 rounded-lg font-semibold hover:bg-red-100 transition-colors flex items-center justify-center gap-2 border border-red-200"
            >
              <Trash2 size={18} />
              <span>포켓몬 방생</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

