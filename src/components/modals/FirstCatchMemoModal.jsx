import React, { useState } from 'react';
import { Star } from 'lucide-react';

export default function FirstCatchMemoModal({ pokemon, onSave, onSkip }) {
  const [memo, setMemo] = useState('');

  const handleSave = () => {
    onSave(memo.trim());
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-md w-full m-4 border-4 border-lime-300">
        <div className="text-center mb-6">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-3xl font-bold text-green-950 mb-2">축하합니다!</h2>
          <div className="flex items-center justify-center gap-2 mb-4">
            <Star size={20} className="text-yellow-500 fill-yellow-500" />
            <p className="text-xl font-semibold">첫 포획 달성!</p>
            <Star size={20} className="text-yellow-500 fill-yellow-500" />
          </div>
          
          <div className="bg-white rounded-lg p-4 mb-4 border-2 border-yellow-300">
            <img 
              src={pokemon.imageUrl} 
              alt={pokemon.name}
              className="w-32 h-32 mx-auto mb-2"
            />
            <p className="text-lg font-bold text-gray-800">
              {pokemon.name}
            </p>
            <p className="text-sm text-gray-600">
              전 멤버 중 최초로 포획했습니다!
            </p>
          </div>

          <div className="text-left bg-white rounded-lg p-4 border-2 border-yellow-300">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              ✏️ 이 포켓몬에 대한 메모를 남겨보세요
            </label>
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="출현 위치, 포획 팁, 특징 등을 자유롭게 작성해보세요..."
              className="w-full p-3 border border-gray-300 rounded-lg text-sm resize-none focus:ring-2 focus:ring-yellow-400 focus:outline-none"
              rows="4"
              maxLength="200"
              autoFocus
            />
            <div className="text-xs text-gray-500 text-right mt-1">
              {memo.length}/200
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onSkip}
            className="flex-1 bg-gray-300 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-400 transition-colors"
          >
            나중에 작성
          </button>
          <button
            onClick={handleSave}
            className="flex-1 bg-yellow-500 text-white py-3 rounded-lg font-bold hover:bg-yellow-600 transition-colors shadow-lg"
          >
            저장하기
          </button>
        </div>

        <p className="text-xs text-gray-600 text-center mt-3">
          💡 도감에서 언제든지 수정할 수 있습니다
        </p>
      </div>
    </div>
  );
}
