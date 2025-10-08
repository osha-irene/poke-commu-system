import React, { useState } from 'react';

export default function EncounterModal({ pokemon, onClose, onCatchSuccess, items }) {
  const [selectedBall, setSelectedBall] = useState(null);
  const [catching, setCatching] = useState(false);
  const [result, setResult] = useState(null);
  const [shaking, setShaking] = useState(0); // 흔들림 횟수

  const pokeballs = [
    { name: '몬스터볼', multiplier: 1.0, emoji: '⚪', color: 'bg-red-500' },
    { name: '슈퍼볼', multiplier: 1.5, emoji: '🔵', color: 'bg-blue-500' },
    { name: '하이퍼볼', multiplier: 2.0, emoji: '🟡', color: 'bg-yellow-500' },
  ];

  const handleCatch = () => {
    if (!selectedBall) {
      alert('몬스터볼을 선택해주세요!');
      return;
    }

    const ballItem = items.find(item => item.name === selectedBall.name);
    if (!ballItem || ballItem.count <= 0) {
      alert('선택한 볼이 부족합니다!');
      return;
    }

    setCatching(true);

    // 볼 던지기 애니메이션
    setTimeout(() => {
      // 흔들림 애니메이션 (3번)
      let shakeCount = 0;
      const shakeInterval = setInterval(() => {
        shakeCount++;
        setShaking(shakeCount);
        
        if (shakeCount >= 3) {
          clearInterval(shakeInterval);
          
          // 포획 성공/실패 판정
          setTimeout(() => {
            const catchChance = pokemon.catchRate * selectedBall.multiplier;
            const success = Math.random() < catchChance;
            setResult(success ? 'success' : 'fail');
            setCatching(false);

            setTimeout(() => {
              if (success) {
                onCatchSuccess(pokemon, selectedBall);
              }
              onClose();
            }, 2500);
          }, 500);
        }
      }, 800);
    }, 1000);
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50" 
      onClick={onClose}
    >
      <div 
        className="w-full max-w-4xl mx-4" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* 포켓몬 배틀 화면 스타일 */}
        {!result && !catching && (
          <div className="bg-white rounded-lg overflow-hidden border-4 border-gray-800">
            {/* 상단 배틀 필드 */}
            <div className="relative bg-gradient-to-b from-blue-200 to-green-200 p-8 border-b-4 border-gray-800">
              {/* 야생 포켓몬 영역 */}
              <div className="flex justify-end mb-8">
                <div className="text-center">
                  <div className="bg-white rounded-lg px-6 py-2 mb-4 border-2 border-gray-800 inline-block">
                    <div className="font-bold text-lg">야생의 {pokemon.name}</div>
                    <div className="text-sm text-gray-600">Lv.???</div>
                  </div>
                  <div 
                    className="relative"
                    style={{
                      animation: 'bounce 2s ease-in-out infinite'
                    }}
                  >
                    <div className="text-9xl">{pokemon.emoji}</div>
                  </div>
                </div>
              </div>

              {/* 그림자 */}
              <div className="flex justify-end">
                <div className="w-32 h-6 bg-black opacity-20 rounded-full blur-sm"></div>
              </div>
            </div>

            {/* 하단 UI */}
            <div className="bg-gray-100 p-6">
              {/* 텍스트 박스 */}
              <div className="bg-white rounded-lg border-4 border-gray-800 p-6 mb-6">
                <p className="text-xl font-bold text-gray-800">
                  야생의 {pokemon.name}이(가) 나타났다!
                </p>
                <p className="text-sm text-gray-600 mt-2">
                  {pokemon.type} 타입 | HP {pokemon.hp} | 포획률 {Math.round(pokemon.catchRate * 100)}%
                </p>
              </div>

              {/* 볼 선택 UI */}
              <div className="bg-white rounded-lg border-4 border-gray-800 p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="font-bold text-lg">볼을 선택하세요</span>
                  <button 
                    onClick={onClose}
                    className="text-gray-500 hover:text-gray-700 font-bold"
                  >
                    ✕ 도망치기
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  {pokeballs.map((ball, i) => {
                    const ballItem = items.find(item => item.name === ball.name);
                    const count = ballItem ? ballItem.count : 0;
                    const disabled = count <= 0;

                    return (
                      <button
                        key={i}
                        onClick={() => !disabled && setSelectedBall(ball)}
                        disabled={disabled}
                        className={`relative ${ball.color} text-white rounded-lg p-4 border-4 transition-all ${
                          disabled 
                            ? 'opacity-30 cursor-not-allowed border-gray-400' 
                            : selectedBall?.name === ball.name 
                              ? 'border-yellow-300 scale-105 shadow-xl' 
                              : 'border-gray-700 hover:scale-105'
                        }`}
                      >
                        <div className="text-5xl mb-2">{ball.emoji}</div>
                        <div className="font-bold">{ball.name}</div>
                        <div className="text-xs opacity-90">×{ball.multiplier}</div>
                        <div className="absolute top-2 right-2 bg-white text-gray-800 px-2 py-1 rounded text-xs font-bold">
                          {count}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {selectedBall && (
                  <button 
                    onClick={handleCatch}
                    className="w-full mt-6 bg-green-500 text-white py-4 rounded-lg font-bold text-xl hover:bg-green-600 border-4 border-green-700 transition-all hover:scale-105"
                  >
                    ▶ {selectedBall.name}을(를) 던진다!
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 포획 시도 중 */}
        {catching && (
          <div className="bg-gradient-to-b from-blue-200 to-green-200 rounded-lg p-12 text-center border-4 border-gray-800">
            <div className="bg-white rounded-lg border-4 border-gray-800 p-8">
              {/* 볼 흔들림 애니메이션 */}
              <div 
                className="text-9xl mb-6 inline-block"
                style={{
                  animation: shaking > 0 ? 'shake 0.5s ease-in-out' : 'none',
                  animationIterationCount: 1
                }}
              >
                {selectedBall.emoji}
              </div>
              
              <div className="space-y-2">
                <h3 className="text-3xl font-bold text-gray-800">
                  {shaking === 0 && '볼을 던졌다...'}
                  {shaking === 1 && '흔들... 한 번!'}
                  {shaking === 2 && '흔들흔들... 두 번!'}
                  {shaking === 3 && '흔들흔들흔들... 세 번!'}
                </h3>
                
                {/* 진행 표시 */}
                <div className="flex justify-center gap-2 mt-4">
                  {[1, 2, 3].map(num => (
                    <div 
                      key={num}
                      className={`w-4 h-4 rounded-full ${
                        shaking >= num ? 'bg-green-500' : 'bg-gray-300'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 포획 성공 */}
        {result === 'success' && (
          <div className="bg-gradient-to-b from-yellow-200 to-orange-200 rounded-lg p-12 text-center border-4 border-gray-800">
            <div className="bg-white rounded-lg border-4 border-gray-800 p-8">
              <div className="text-9xl mb-6 animate-bounce">🎉</div>
              <h3 className="text-4xl font-bold text-green-600 mb-4">
                잡았다!
              </h3>
              <p className="text-2xl text-gray-800 mb-2">
                {pokemon.name}을(를) 잡았다!
              </p>
              <div className="inline-block bg-yellow-100 px-6 py-3 rounded-lg border-2 border-yellow-400 mt-4">
                <p className="text-sm text-gray-600">
                  {pokemon.name}의 데이터가 도감에 등록되었습니다
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 포획 실패 */}
        {result === 'fail' && (
          <div className="bg-gradient-to-b from-red-200 to-orange-200 rounded-lg p-12 text-center border-4 border-gray-800">
            <div className="bg-white rounded-lg border-4 border-gray-800 p-8">
              <div className="text-9xl mb-6">💨</div>
              <h3 className="text-4xl font-bold text-red-600 mb-4">
                앗! 아깝다!
              </h3>
              <p className="text-2xl text-gray-800 mb-2">
                {pokemon.name}이(가) 볼에서 나왔다!
              </p>
              <div className="inline-block bg-red-100 px-6 py-3 rounded-lg border-2 border-red-400 mt-4">
                <p className="text-sm text-gray-600">
                  야생의 {pokemon.name}은(는) 도망쳤다...
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 애니메이션 스타일 */}
      <style jsx>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }
        
        @keyframes shake {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-15deg); }
          75% { transform: rotate(15deg); }
        }
      `}</style>
    </div>
  );
}