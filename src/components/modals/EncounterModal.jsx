import React, { useState } from 'react';

export default function EncounterModal({ pokemon, onClose, onCatchSuccess, items, sharedPokedexData = {}, caughtPokemon = [], onApplyLoot}) {
  const [selectedBall, setSelectedBall] = useState(null);
  const [catching, setCatching] = useState(false);
  const [result, setResult] = useState(null);
  const [shaking, setShaking] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [isFirstCatch, setIsFirstCatch] = useState(false);

  // 모달이 열린 직후 클릭 방지
  React.useEffect(() => {
    const timer = setTimeout(() => setIsReady(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // 현재 시간 (밤 판정용)
  const currentHour = new Date().getHours();
  const isNight = currentHour >= 20 || currentHour < 4;

  // 인벤토리에서 볼 종류만 필터링
  const pokeballs = items
    .filter(item => {
      const name = item.name.toLowerCase();
      return name.includes('볼') || name.includes('ball');
    })
    .filter(item => item.count > 0)
    .map(item => {
      const name = item.name;
      const pokemonType = pokemon.type?.toLowerCase() || '';
      const pokemonTypes = pokemonType.split('/').map(t => t.trim());
      
      let multiplier = 1.0;;
      
      if (name.includes('마스터')) {
        multiplier = 255; // 무조건 포획
      } else if (name.includes('하이퍼') || name.includes('울트라')) {
        multiplier = 2.0;
      } else if (name.includes('슈퍼') || name.includes('수퍼') || name.includes('그레이트')) {
        multiplier = 1.5;
      } else if (name.includes('넷트')) {
        // 물/벌레 타입
        const isWaterOrBug = pokemonTypes.some(t => t.includes('물') || t.includes('water') || t.includes('벌레') || t.includes('bug'));
        multiplier = isWaterOrBug ? 3.5 : 1.0;
      } else if (name.includes('다이브')) {
        // 물 타입
        const isWater = pokemonTypes.some(t => t.includes('물') || t.includes('water'));
        multiplier = isWater ? 3.5 : 1.0;
      } else if (name.includes('네스트')) {
        // 약한 포켓몬 (HP 40 이하)
        const hp = pokemon.hp || pokemon.baseHp || 100;
        multiplier = hp <= 40 ? 3.0 : 1.0;
      } else if (name.includes('리피트')) {
        // 잡은 적 있는 포켓몬 (도감에 등록되어 있으면)
        multiplier = 1.0; // 실제 구현 시 도감 체크 필요
      } else if (name.includes('타이머')) {
        multiplier = 1.5; // 턴 수 (실제로는 턴마다 증가)
      } else if (name.includes('퀵')) {
        multiplier = 5.0; // 첫 턴 (항상 첫 턴으로 가정)
      } else if (name.includes('다크')) {
        // 밤이거나 동굴에서
        multiplier = isNight ? 3.5 : 1.0;
      } else if (name.includes('문')) {
        // 달의돌로 진화하는 포켓몬
        multiplier = 4.0;
      } else if (name.includes('러브')) {
        // 같은 종족, 다른 성별
        multiplier = 8.0;
      } else if (name.includes('레벨')) {
        // 낮은 레벨 포켓몬
        multiplier = 8.0;
      } else if (name.includes('헤비')) {
        // 무거운 포켓몬
        multiplier = 1.0;
      } else if (name.includes('스피드')) {
        // 빠른 포켓몬
        multiplier = 4.0;
      }
      
       return { 
      name: item.name,
      id: item.itemId,        // ⭐ 추가
      multiplier,
      imageUrl: item.imageUrl,
      count: item.count       // ⭐ 추가
    };
  });

  // 포켓몬 스프라이트 URL (도트 정적 이미지)
  const pokemonSpriteUrl = pokemon.spriteUrl || 
    `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.number}.png`;

  const handleCatch = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!selectedBall) {
      alert('몬스터볼을 선택해주세요!');
      return;
    }

    // ✅ 수정: itemId 또는 name으로 찾기
    const ballItem = items.find(item => 
      item.itemId === selectedBall.id || 
      item.name === selectedBall.name
    );
    
    if (!ballItem || ballItem.count <= 0) {
      alert('선택한 볼이 부족합니다!');
      return;
    }


  
  // 파트너를 제외한 포켓몬 수 계산
  const nonPartnerCount = caughtPokemon.filter(p => p && !p.isPartner).length;
  
  // 파트너 제외 20마리 제한 (총 21마리)
  if (nonPartnerCount >= 20) {
    alert('⚠️ 포켓몬이 가득 찼습니다!\n\n파트너를 제외한 포켓몬이 20마리입니다.\n박스를 정리한 후 다시 시도해주세요.');
    return;
  }
  
    setCatching(true);
    setResult(null);

    // 최초 포획 여부 체크
    const pokemonNumber = pokemon.number || pokemon.originalNumber;
    const isFirst = !sharedPokedexData[pokemonNumber];
    setIsFirstCatch(isFirst);

    setTimeout(() => {
      let shakeCount = 0;
      const shakeInterval = setInterval(() => {
        shakeCount++;
        setShaking(shakeCount);
        
        if (shakeCount >= 3) {
          clearInterval(shakeInterval);
          
        setTimeout(() => {
  const catchChance = pokemon.catchRate * selectedBall.multiplier;
  const success = Math.random() < catchChance;
  setResult(success ? 'success' : 'fail');
  setCatching(false);

  setTimeout(() => {
  if (success) {
    // ⭐ 포획 성공 시 보상 적용
    if (pokemon.loot && onApplyLoot) {
      onApplyLoot(pokemon.loot);
      
      // 보상 알림 생성
      let lootMessage = '\n\n🎁 탐험 보상을 획득했습니다!\n';
      lootMessage += `💰 ${pokemon.loot.money}G\n`;
      
      if (pokemon.loot.items.length > 0) {
        lootMessage += `📦 아이템: ${pokemon.loot.items.map(i => `${i.name} x${i.count}`).join(', ')}\n`;
      }
      if (pokemon.loot.ingredients.length > 0) {
        lootMessage += `🍎 식재료: ${pokemon.loot.ingredients.map(i => `${i.name} x${i.count}`).join(', ')}\n`;
      }
      if (pokemon.loot.berries.length > 0) {
        lootMessage += `🌳 열매: ${pokemon.loot.berries.map(i => `${i.name} x${i.count}`).join(', ')}`;
      }
      
      // ⭐ 이 줄을 수정!
      setTimeout(() => {
        alert(`${pokemon.name}을(를) 잡았습니다!${lootMessage}`);
      }, 100);
    }
    
    onCatchSuccess(pokemon, selectedBall);
  }
  onClose();
}, 2500);
}, 500);
        }
      }, 800);
    }, 1000);


    
  };

  const handleBallSelect = (e, ball) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedBall(ball);
  };

  const handleCloseClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!isReady || catching || result) {
      return;
    }
    
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50" 
      onClick={isReady && !catching && !result ? handleCloseClick : undefined}
    >
      <div 
        className="w-full max-w-5xl mx-4 max-h-[95vh] overflow-y-auto" 
        onClick={(e) => e.stopPropagation()}
      >
        {!result && !catching && (
          <div className="bg-white rounded-lg overflow-hidden border-4 border-gray-800">
            {/* 상단 배틀 필드 */}
            <div className="relative bg-gradient-to-b from-blue-200 to-green-200 p-6 border-b-4 border-gray-800">
              <div className="flex justify-end mb-6">
                <div className="text-center">
                  <div className="bg-white rounded-lg px-4 py-1 mb-3 border-2 border-gray-800 inline-block">
                    <div className="font-bold text-base">야생의 {pokemon.name}</div>
                    <div className="text-xs text-gray-600">Lv.???</div>
                  </div>
                  
                  {/* 포켓몬 스프라이트 (도트 애니메이션) */}
                  <div 
                    className="w-40 h-40 mx-auto"
                    style={{
                      backgroundImage: `url(${pokemonSpriteUrl})`,
                      backgroundSize: 'contain',
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'center',
                      imageRendering: 'pixelated'
                    }}
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <div className="w-24 h-4 bg-black opacity-20 rounded-full blur-sm"></div>
              </div>
            </div>

            {/* 하단 UI */}
            <div className="bg-gray-100 p-4">
              <div className="bg-white rounded-lg border-4 border-gray-800 p-4 mb-4">
                <p className="text-lg font-bold text-gray-800">
                  야생의 {pokemon.name}이(가) 나타났다!
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  {pokemon.type} 타입 | HP {pokemon.hp || pokemon.baseHp}
                </p>
              </div>

              <div className="bg-white rounded-lg border-4 border-gray-800 p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-bold text-base">볼을 선택하세요</span>
                  <button 
                    onClick={handleCloseClick}
                    className="text-gray-500 hover:text-gray-700 font-bold text-sm"
                  >
                    ✕ 도망치기
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
                  {pokeballs.length === 0 ? (
                    <div className="col-span-3 text-center py-8 text-gray-500">
                      사용 가능한 볼이 없습니다!
                    </div>
                  ) : (
                    pokeballs.map((ball, i) => {
                      const ballItem = items.find(item => item.name === ball.name);
                      const count = ballItem ? ballItem.count : 0;
                      const disabled = count <= 0;

                      return (
                        <button
                          key={i}
                          onClick={(e) => !disabled && handleBallSelect(e, ball)}
                          disabled={disabled}
                          className={`flex items-center gap-2 bg-white rounded-lg p-2 border-2 transition-all ${
                            disabled 
                              ? 'opacity-30 cursor-not-allowed border-gray-300' 
                              : selectedBall?.name === ball.name 
                                ? 'border-yellow-400 shadow-lg ring-2 ring-yellow-300' 
                                : 'border-gray-300 hover:border-gray-400 hover:shadow-md'
                          }`}
                        >
                          <div 
                            className="w-10 h-10 flex-shrink-0"
                            style={{
                              backgroundImage: `url(${ball.imageUrl})`,
                              backgroundSize: 'contain',
                              backgroundRepeat: 'no-repeat',
                              backgroundPosition: 'center',
                              imageRendering: 'pixelated'
                            }}
                          />
                          <div className="flex-1 text-left min-w-0">
                            <div className="font-bold text-xs text-gray-800 truncate">{ball.name}</div>
                          </div>
                          <div className="bg-gray-800 text-white px-1.5 py-0.5 rounded text-xs font-bold flex-shrink-0">
                            {count}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>

                {selectedBall && (
                  <button 
                    onClick={handleCatch}
                    className="w-full mt-4 bg-green-500 text-white py-3 rounded-lg font-bold text-lg hover:bg-green-600 border-4 border-green-700 transition-all hover:scale-105"
                  >
                    ▶ {selectedBall.name}을(를) 던진다!
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {catching && (
          <div className="bg-gradient-to-b from-blue-200 to-green-200 rounded-lg p-12 text-center border-4 border-gray-800">
            <div className="bg-white rounded-lg border-4 border-gray-800 p-8">
              <div 
                key={shaking}
                className="w-32 h-32 mx-auto mb-6"
                style={{
                  backgroundImage: `url(${selectedBall.imageUrl})`,
                  backgroundSize: 'contain',
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'center',
                  animation: shaking > 0 ? 'shake 0.5s ease-in-out' : 'none'
                }}
              />
              
              <div className="space-y-2">
                <h3 className="text-3xl font-bold text-gray-800">
                  {shaking === 0 && '볼을 던졌다...'}
                  {shaking === 1 && '흔들... 한 번!'}
                  {shaking === 2 && '흔들흔들... 두 번!'}
                  {shaking === 3 && '흔들흔들흔들... 세 번!'}
                </h3>
                
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

        {result === 'success' && (
          <div className="bg-gradient-to-b from-yellow-200 to-orange-200 rounded-lg p-12 text-center border-4 border-gray-800">
            <div className="bg-white rounded-lg border-4 border-gray-800 p-8">
              <div className="text-9xl mb-6">🎉</div>
              <h3 className="text-4xl font-bold text-green-600 mb-4">잡았다!</h3>
              <p className="text-2xl text-gray-800 mb-2">{pokemon.name}을(를) 잡았다!</p>
              {isFirstCatch && (
                <div className="inline-block bg-yellow-100 px-6 py-3 rounded-lg border-2 border-yellow-400 mt-4">
                  <p className="text-sm text-gray-600">
                    {pokemon.name}의 데이터가 도감에 등록되었습니다
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {result === 'fail' && (
          <div className="bg-gradient-to-b from-red-200 to-orange-200 rounded-lg p-12 text-center border-4 border-gray-800">
            <div className="bg-white rounded-lg border-4 border-gray-800 p-8">
              <div className="text-9xl mb-6">💨</div>
              <h3 className="text-4xl font-bold text-red-600 mb-4">앗! 아깝다!</h3>
              <p className="text-2xl text-gray-800 mb-2">{pokemon.name}이(가) 볼에서 나왔다!</p>
              <div className="inline-block bg-red-100 px-6 py-3 rounded-lg border-2 border-red-400 mt-4">
                <p className="text-sm text-gray-600">
                  야생의 {pokemon.name}은(는) 도망쳤다...
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-15deg); }
          75% { transform: rotate(15deg); }
        }
      `}</style>
    </div>
  );
}