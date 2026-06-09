import React, { useState } from 'react';
import PokemonPreviewInfo from '../views/pokemon/PokemonPreviewInfo';

export default function EncounterModal({ 
  pokemon, 
  onClose, 
  onCatchSuccess, 
  items, 
  sharedPokedexData = {}, 
  caughtPokemon = [], 
  allPokemonMaster = [],
  onApplyLoot,
  maxNonPartnerPokemon = 18
}) {
  const [selectedBall, setSelectedBall] = useState(null);
  const [catching, setCatching] = useState(false);
  const [result, setResult] = useState(null);
  const [shaking, setShaking] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [isFirstCatch, setIsFirstCatch] = useState(false);
  const [escapeAttempts, setEscapeAttempts] = useState(0);
  const [message, setMessage] = useState(''); // ✅ 메시지 상태 추가

  // 모달이 열린 직후 클릭 방지
  React.useEffect(() => {
    const timer = setTimeout(() => setIsReady(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // 도망 모드 가져오기
  const escapeMode = localStorage.getItem('poke_escapeMode') || 'instant';

  // 파트너 포켓몬 찾기
  const partnerPokemon = caughtPokemon.find(p => p && p.isPartner);

  // 현재 시간 (밤 판정용)
  const currentHour = new Date().getHours();
  const isNight = currentHour >= 20 || currentHour < 4;

  // 인벤토리에서 볼 종류만 필터링
  const pokeballs = items
    .filter(item => {
      if (!item || !item.name) return false;
      const name = item.name.toLowerCase();
      return name.includes('볼') || name.includes('ball');
    })
    .filter(item => item.count > 0)
    .map(item => {
      const name = item.name;
      const pokemonType = pokemon.type?.toLowerCase() || '';
      const pokemonTypes = pokemonType.split('/').map(t => t.trim());
      
      let multiplier = 1.0;
      
      if (name.includes('마스터')) {
        multiplier = 255;
      } else if (name.includes('하이퍼') || name.includes('울트라')) {
        multiplier = 2.0;
      } else if (name.includes('슈퍼') || name.includes('수퍼') || name.includes('그레이트')) {
        multiplier = 1.5;
      } else if (name.includes('넷트')) {
        const isWaterOrBug = pokemonTypes.some(t => t.includes('물') || t.includes('water') || t.includes('벌레') || t.includes('bug'));
        multiplier = isWaterOrBug ? 3.5 : 1.0;
      } else if (name.includes('다이브')) {
        const isWater = pokemonTypes.some(t => t.includes('물') || t.includes('water'));
        multiplier = isWater ? 3.5 : 1.0;
      } else if (name.includes('네스트')) {
        const hp = pokemon.hp || pokemon.baseHp || 100;
        multiplier = hp <= 40 ? 3.0 : 1.0;
      } else if (name.includes('타이머')) {
        multiplier = 1.5;
      } else if (name.includes('퀵')) {
        multiplier = 5.0;
      } else if (name.includes('다크')) {
        multiplier = isNight ? 3.5 : 1.0;
      } else if (name.includes('문')) {
        multiplier = 4.0;
      } else if (name.includes('러브')) {
        multiplier = 8.0;
      } else if (name.includes('레벨')) {
        multiplier = 8.0;
      } else if (name.includes('스피드')) {
        multiplier = 4.0;
      }
      
      return { 
        name: item.name,
        id: item.itemId,
        multiplier,
        imageUrl: item.imageUrl,
        count: item.count
      };
    });

  // 포켓몬 스프라이트 URL
const pokemonSpriteUrl = pokemon.isShiny 
  ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${pokemon.number}.png`
  : (pokemon.spriteUrl || `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.number}.png`);

  // 도망 로직
  const checkIfPokemonEscapes = () => {
    if (escapeMode === 'none') {
      console.log('🏃 도망 안함 모드 - 포켓몬이 남아있습니다');
      return false;
    }

    if (escapeMode === 'instant') {
      console.log('⚡ 즉시 도망 모드 - 포켓몬이 도망갑니다');
      return true;
    }

    if (escapeMode === 'speed') {
      if (!partnerPokemon) {
        console.log('❌ 파트너 포켓몬 없음 - 즉시 도망');
        return true;
      }

      const A = pokemon.baseSpeed || pokemon.speed || 50;
      const B = (partnerPokemon.baseSpeed || partnerPokemon.speed || 50) / 4;
      const C = escapeAttempts;

      const F = Math.floor((A * 32) / B + 30 * C);

      console.log('💨 스피드 기반 도망 계산:');
      console.log(`  야생 ${pokemon.name} 스피드(A): ${A}`);
      console.log(`  파트너 ${partnerPokemon.nickname || partnerPokemon.name} 스피드/4(B): ${B.toFixed(2)}`);
      console.log(`  포획 실패 횟수(C): ${C}`);
      console.log(`  F값: ${F}`);

      if (F > 255) {
        console.log('  → F > 255, 100% 도망!');
        return true;
      }

      const randomValue = Math.floor(Math.random() * 256);
      const escapes = randomValue <= F;

      console.log(`  → 랜덤값: ${randomValue}, F: ${F}`);
      console.log(`  → 결과: ${escapes ? '도망침!' : '남아있음'}`);

      return escapes;
    }

    return true;
  };

  const handleCatch = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!selectedBall) {
      alert('몬스터볼을 선택해주세요!');
      return;
    }

    const ballItem = items.find(item => 
      item.itemId === selectedBall.id || 
      item.name === selectedBall.name
    );
    
    if (!ballItem || ballItem.count <= 0) {
      alert('선택한 볼이 부족합니다!');
      return;
    }

    const nonPartnerCount = caughtPokemon.filter(p => p && !p.isPartner).length;
    
    const maxPokemonCount = Number(maxNonPartnerPokemon) || 18;
    if (nonPartnerCount >= maxPokemonCount) {
      alert(`⚠️ 포켓몬이 가득 찼습니다!\n\n파트너를 제외한 포켓몬이 ${maxPokemonCount}마리입니다.\n박스를 정리한 후 다시 시도해주세요.`);
      return;
    }
  
    setCatching(true);
    setResult(null);
    setMessage(''); // ✅ 메시지 초기화

      const pokemonNumber = pokemon.number || pokemon.originalNumber;
      const originalNumber = pokemon.originalNumber || pokemon.number;
      const isFirst = !sharedPokedexData[pokemonNumber]?.firstCatcher &&
        !sharedPokedexData[originalNumber]?.firstCatcher;
    setIsFirstCatch(isFirst);

    setTimeout(() => {
      let shakeCount = 0;
      const shakeInterval = setInterval(() => {
        shakeCount++;
        setShaking(shakeCount);
        
         if (shakeCount >= 3) {
          clearInterval(shakeInterval);
          
          setTimeout(() => {
            // 리전폼은 원종의 포획률 사용
            let baseCatchRate = pokemon.catchRate;
            
            if (baseCatchRate === undefined && pokemon.originalNumber) {
              const originalPokemon = allPokemonMaster.find(p => p.number === pokemon.originalNumber);
              baseCatchRate = originalPokemon?.catchRate || 0.20;
              console.log('📝 리전폼 포획률 참조:', pokemon.name, '→ 원종:', originalPokemon?.name, '포획률:', baseCatchRate);
            }
            
            if (baseCatchRate === undefined) {
              baseCatchRate = 0.20;
            }
            
            const catchChance = baseCatchRate * selectedBall.multiplier;
            const randomValue = Math.random();
		      	const success = randomValue < catchChance;
			
			  // ✅ 디버깅 로그 추가
			  console.log('🎯 포획 시도:', pokemon.name);
			  console.log('  - 기본 포획률:', pokemon.catchRate);
			  console.log('  - 볼 배율:', selectedBall.multiplier);
			  console.log('  - 최종 포획 확률:', catchChance);
			  console.log('  - 랜덤 값:', randomValue);
			  console.log('  - 결과:', success ? '성공 ✅' : '실패 ❌');

                
          // ✅ 볼 소모는 항상 발생
          if (onApplyLoot) {
            onApplyLoot({ money: 0, items: [], ingredients: [], berries: [] }, selectedBall);
          }

          if (success) {
            setResult('success');
            setCatching(false);

            setTimeout(() => {  // ⭐ 이 setTimeout이 빠졌습니다!
              alert(`${pokemon.name}을(를) 잡았습니다!`);
              
              onCatchSuccess(pokemon, selectedBall);
              onClose();
            }, 2500);
          } else {
            // ✅ 포획 실패
            setEscapeAttempts(prev => prev + 1);
            const pokemonEscapes = checkIfPokemonEscapes();
            
            // ✅ 랜덤 메시지 선택
            const failMessages = [
              `앗! 아깝다!\n${pokemon.name}이(가) 볼에서 나왔다!`,
              `아쉽다!\n조금만 더 하면 잡을 수 있었는데!`,
              `아깝다!\n조금만 더 하면 됐는데!`
            ];
            const randomMessage = failMessages[Math.floor(Math.random() * failMessages.length)];
            
            if (pokemonEscapes) {
              setResult('fail');
              setCatching(false);
                    
              setTimeout(() => {
                onClose();
              }, 3000);
            } else {
              // ✅ 도망가지 않음 - UI만 업데이트
              setCatching(false);
              setResult(null);
              setShaking(0);
              setMessage(randomMessage); // ✅ 랜덤 메시지 설정
            }
          }
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
    >
      <div 
        className="w-full max-w-5xl mx-4 max-h-[95vh] overflow-y-auto" 
        onClick={(e) => e.stopPropagation()}
      >
        {!result && !catching && (
          <div className="bg-white rounded-lg overflow-hidden border-4 border-gray-800">
                          {/* 상단 배틀 필드 */}
              <div className="relative bg-white p-6 border-b-4 border-gray-800">
                <div className="flex justify-end mb-6">
                  <div className="text-center relative">
                    <div className="bg-white rounded-lg px-4 py-1 mb-3 border-2 border-gray-800 inline-block">
                      <div className="font-bold text-base">야생의 {pokemon.name}</div>
                      <div className="text-xs text-gray-600">Lv.???</div>
                    </div>
                    
                    {/* ✅ 이로치 반짝임 효과 */}
                    {pokemon.isShiny && (
                      <>
                        <div className="sparkle sparkle-1"></div>
                        <div className="sparkle sparkle-2"></div>
                        <div className="sparkle sparkle-3"></div>
                        <div className="sparkle sparkle-4"></div>
                      </>
                    )}
                    
                    {/* 포켓몬 스프라이트 */}
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

              {/* ✅ 스타일 추가 */}
              <style>{`
                @keyframes shake {
                  0%, 100% { transform: rotate(0deg); }
                  25% { transform: rotate(-15deg); }
                  75% { transform: rotate(15deg); }
                }
                
                @keyframes sparkle {
                  0%, 100% { 
                    opacity: 0;
                    transform: scale(0) rotate(0deg);
                  }
                  50% { 
                    opacity: 1;
                    transform: scale(1) rotate(180deg);
                  }
                }
                
                .sparkle {
                  position: absolute;
                  width: 0;
                  height: 0;
                  pointer-events: none;
                  animation: sparkle 2s ease-in-out infinite;
                }

                .sparkle::before {
                  content: '★';
                  position: absolute;
                  font-size: 24px;
                  color: #ffffffff;
                  text-shadow: 0 0 10px #ffff00, 0 0 20px #ffd700;
                }
                
                  .sparkle-1 {
                    top: 45%;
                    left: 5%;
                    animation-delay: 0s;
                  }
                  
                  .sparkle-2 {
                    top: 55%;
                    right: 10%;
                    animation-delay: 0.4s;
                  }
                  
                  .sparkle-3 {
                    bottom: 10%;
                    left: 15%;
                    animation-delay: 0.8s;
                  }
                  
                  .sparkle-4 {
                    bottom: 5%;
                    right: 5%;
                    animation-delay: 1.2s;
                  }
                  
                  .sparkle-5 {
                    top: 65%;
                    left: -5%;
                    animation-delay: 0.6s;
                  }
                  
                  .sparkle-6 {
                    top: 70%;
                    right: 0%;
                    animation-delay: 1s;
                  }
                `}</style>

            {/* 하단 UI */}
            <div className="bg-gray-100 p-4">
              <div className="bg-white rounded-lg border-4 border-gray-800 p-4 mb-4">
				  {/* ✅ 메시지 표시 (줄바꿈 지원) */}
				  {message ? (
					<div className="text-lg font-bold text-gray-800">
					  {message.split('\n').map((line, i) => (
						<p key={i}>{line}</p>
					  ))}
					</div>
				  ) : (
					<p className="text-lg font-bold text-gray-800">
					  야생의 {pokemon.name}이(가) 나타났다!
					</p>
				  )}
				  <p className="text-xs text-gray-600 mt-1">
					 <PokemonPreviewInfo pokemon={pokemon} />
					{escapeAttempts > 0 && (
					  <span className="ml-2 text-orange-600 font-semibold">
						| 포획 실패 {escapeAttempts}회
					  </span>
					)}
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
                            className="item-sprite w-10 h-10 flex-shrink-0"
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
          <div className="bg-white rounded-lg p-12 text-center border-4 border-gray-800">
            <div className="bg-white rounded-lg border-4 border-gray-800 p-8">
              <div 
                key={shaking}
                className="item-sprite item-sprite-xl w-32 h-32 mx-auto mb-6"
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
          <div className="bg-white rounded-lg p-12 text-center border-4 border-gray-800">
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
          <div className="bg-white rounded-lg p-12 text-center border-4 border-gray-800">
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
