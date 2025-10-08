import React, { useState } from 'react';
import { X, ArrowUpCircle, ArrowDownCircle, Trash2, Heart } from 'lucide-react';

export default function PokemonDetailModal({ 
  pokemon, 
  isInParty, 
  onClose, 
  onMoveToParty, 
  onMoveToBox, 
  onRelease,
  onUseRareCandy,
  hasRareCandy 
}) {
  const [confirmRelease, setConfirmRelease] = useState(false);

  const handleRelease = () => {
    if (!confirmRelease) {
      setConfirmRelease(true);
      setTimeout(() => setConfirmRelease(false), 3000);
      return;
    }
    onRelease(pokemon.uniqueId);
    onClose();
  };

  const handleUseCandy = () => {
    if (!hasRareCandy) {
      alert('이상한사탕이 없습니다!');
      return;
    }
    if (window.confirm(`${pokemon.name}에게 이상한사탕을 사용하시겠습니까?\n레벨이 1 올라갑니다.`)) {
      onUseRareCandy(pokemon.uniqueId);
    }
  };

  const handleMove = () => {
    if (isInParty) {
      onMoveToBox(pokemon.uniqueId);
    } else {
      onMoveToParty(pokemon.uniqueId);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-500 p-6 rounded-t-2xl relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-colors"
          >
            <X size={24} />
          </button>
          
          <div className="flex items-center gap-6">
            {/* 포켓몬 이미지 */}
            <div 
              className="w-32 h-32 bg-white bg-opacity-20 rounded-2xl"
              style={{
                backgroundImage: `url(${pokemon.spriteUrl || pokemon.imageUrl})`,
                backgroundSize: 'contain',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center',
                imageRendering: 'pixelated'
              }}
            />
            
            <div className="flex-1 text-white">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs bg-white bg-opacity-30 px-2 py-1 rounded">
                  No.{pokemon.number}
                </span>
                <span className="text-xs bg-white bg-opacity-30 px-2 py-1 rounded">
                  {pokemon.type}
                </span>
              </div>
              <h2 className="text-3xl font-bold mb-2">{pokemon.name}</h2>
              <div className="text-lg">Lv. {pokemon.level}</div>
            </div>
          </div>
        </div>

        {/* 본문 */}
        <div className="p-6 space-y-6">
          {/* HP 바 */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="font-semibold text-gray-700">HP</span>
              <span className="text-sm text-gray-600">{pokemon.hp} / {pokemon.maxHp}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div 
                className={`h-4 rounded-full transition-all ${
                  (pokemon.hp / pokemon.maxHp) > 0.5 ? 'bg-green-500' :
                  (pokemon.hp / pokemon.maxHp) > 0.2 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${Math.max(0, (pokemon.hp / pokemon.maxHp) * 100)}%` }}
              />
            </div>
          </div>

          {/* 스탯 정보 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <div className="text-sm text-gray-600 mb-1">레벨</div>
              <div className="text-2xl font-bold text-blue-600">{pokemon.level}</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
              <div className="text-sm text-gray-600 mb-1">경험치</div>
              <div className="text-2xl font-bold text-purple-600">{pokemon.exp || 0}</div>
            </div>
          </div>

          {/* 기술 (임시 - 나중에 추가) */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-700 mb-3">배운 기술</h3>
            <div className="grid grid-cols-2 gap-2">
              {pokemon.moves && pokemon.moves.length > 0 ? (
                pokemon.moves.map((move, i) => (
                  <div key={i} className="bg-white rounded px-3 py-2 border border-gray-200">
                    <div className="text-sm font-semibold">{move.name}</div>
                    <div className="text-xs text-gray-500">{move.type}</div>
                  </div>
                ))
              ) : (
                <div className="col-span-2 text-sm text-gray-500 text-center py-2">
                  아직 기술이 없습니다
                </div>
              )}
            </div>
          </div>

          {/* 친밀도 (임시) */}
          <div className="bg-pink-50 rounded-lg p-4 border border-pink-200">
            <div className="flex items-center gap-2 mb-2">
              <Heart size={20} className="text-pink-500" />
              <span className="font-semibold text-gray-700">친밀도</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="bg-pink-500 h-3 rounded-full"
                style={{ width: `${(pokemon.friendship || 50)}%` }}
              />
            </div>
            <div className="text-sm text-gray-600 mt-1 text-right">
              {pokemon.friendship || 50} / 100
            </div>
          </div>

          {/* 액션 버튼들 */}
          <div className="space-y-3 border-t pt-4">
            {/* 이상한사탕 사용 */}
            <button
              onClick={handleUseCandy}
              disabled={!hasRareCandy}
              className={`w-full py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 ${
                hasRareCandy
                  ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200 border-2 border-yellow-300'
                  : 'bg-gray-100 text-gray-400 border-2 border-gray-200 cursor-not-allowed'
              }`}
            >
              <span>🍬</span>
              <span>이상한사탕 사용 (Lv +1)</span>
            </button>

            {/* 엔트리/박스 이동 */}
            <button
              onClick={handleMove}
              className="w-full bg-indigo-100 text-indigo-700 py-3 rounded-lg font-semibold hover:bg-indigo-200 transition-colors flex items-center justify-center gap-2 border-2 border-indigo-300"
            >
              {isInParty ? (
                <>
                  <ArrowDownCircle size={20} />
                  <span>박스로 이동</span>
                </>
              ) : (
                <>
                  <ArrowUpCircle size={20} />
                  <span>엔트리로 이동</span>
                </>
              )}
            </button>

            {/* 방생 */}
            <button
              onClick={handleRelease}
              className={`w-full py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 border-2 ${
                confirmRelease
                  ? 'bg-red-500 text-white border-red-700 animate-pulse'
                  : 'bg-red-50 text-red-600 hover:bg-red-100 border-red-200'
              }`}
            >
              <Trash2 size={20} />
              <span>{confirmRelease ? '다시 클릭하여 확정' : '포켓몬 방생'}</span>
            </button>
            
            {confirmRelease && (
              <p className="text-xs text-red-600 text-center">
                ⚠️ 방생하면 되돌릴 수 없습니다! (3초 안에 다시 클릭)
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}