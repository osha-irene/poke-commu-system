import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { calculateBallMultiplier, calculateCaptureChance } from '../../utils/catchMechanics';
import {
  Zap,
  Wind,
  CheckCircle2,
} from 'lucide-react';
import encounterContextImg from '../../assets/map/encounter-context.png';
import encounterBallImg from '../../assets/map/encounter-ball.png';
import encounterBallWatermarkImg from '../../assets/map/encounter-ball-watermark.png';
import encounterChooseImg from '../../assets/map/encounter-choose.png';
import encounterRunImg from '../../assets/map/encounter-run.png';
import encounterPokemonImg from '../../assets/map/encounter-pokemon.png';
import { getEncounterBackground, isNoBaseBackground } from '../../utils/encounterBackground';
import { getEncounterBgBase } from '../../utils/encounterBgBase';

const getBaseName = (name) => name?.replace(/\s*\(.*?\)\s*/g, '').trim() || name;

const TYPE_COLORS = {
  '노말':'#9fa19f','불꽃':'#e62829','물':'#2980ef','풀':'#3fa129','전기':'#fac000',
  '얼음':'#3dcef3','격투':'#ff8000','독':'#9141cb','땅':'#915121','비행':'#81b9ef',
  '에스퍼':'#ef4179','벌레':'#92a212','바위':'#b0ab82','고스트':'#704170',
  '드래곤':'#5060e1','악':'#624d4e','강철':'#60a1b8','페어리':'#ef70ef',
};

export default function EncounterModal({
  pokemon,
  onClose,
  onCatchSuccess,
  items,
  sharedPokedexData = {},
  caughtPokemon = [],
  allPokemonMaster = [],
  onApplyLoot,
  maxNonPartnerPokemon = 18,
  escapeMode = 'none',
  isCave = false,
  isWaterside = false,
  isSafari = false,
  encounterBackground = null,
}) {
  const bgImage = useMemo(() => getEncounterBackground(encounterBackground), [encounterBackground]);
  const bgBase = useMemo(() => isNoBaseBackground(encounterBackground) ? null : getEncounterBgBase(encounterBackground), [encounterBackground]);
  const [selectedBall, setSelectedBall] = useState(null);
  const [catching, setCatching] = useState(false);
  const [result, setResult] = useState(null);
  const [shaking, setShaking] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [isFirstCatch, setIsFirstCatch] = useState(false);
  const [escapeAttempts, setEscapeAttempts] = useState(0);
  const [message, setMessage] = useState(''); // 안내 메시지 상태
  const [scrollRatio, setScrollRatio] = useState(0);
  const [thumbHeightPct, setThumbHeightPct] = useState(100);
  const [spriteTranslateY, setSpriteTranslateY] = useState(-28);
  const [spriteReady, setSpriteReady] = useState(false);
  const ballGridRef = useRef(null);

  useEffect(() => {
    const el = ballGridRef.current;
    if (!el) return;
    const update = () => {
      if (el.scrollHeight > 0) setThumbHeightPct((el.clientHeight / el.scrollHeight) * 100);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [ballGridRef.current]);

  const handleBallGridScroll = useCallback(() => {
    const el = ballGridRef.current;
    if (!el) return;
    const max = el.scrollHeight - el.clientHeight;
    setScrollRatio(max > 0 ? el.scrollTop / max : 0);
  }, []);

  const handleThumbDrag = useCallback((e) => {
    e.preventDefault();
    const el = ballGridRef.current;
    if (!el) return;
    const track = e.currentTarget.parentElement;
    const trackRect = track.getBoundingClientRect();
    const thumbH = track.clientHeight * (el.clientHeight / el.scrollHeight);
    const onMove = (me) => {
      const y = me.clientY - trackRect.top - thumbH / 2;
      const max = trackRect.height - thumbH;
      const ratio = Math.min(1, Math.max(0, y / max));
      el.scrollTop = ratio * (el.scrollHeight - el.clientHeight);
    };
    const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, []);

  // 모달이 열린 직후 클릭 방지
  React.useEffect(() => {
    const timer = setTimeout(() => setIsReady(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // 도망 모드 가져오기
  const activeEscapeMode = ['none', 'instant', 'speed'].includes(escapeMode) ? escapeMode : 'none';

  // 파트너 포켓몬 찾기
  const partnerPokemon = caughtPokemon.find(p => p && p.isPartner);

  // 현재 시간 (밤 판정용)
  const currentHour = new Date().getHours();
  const isNight = currentHour >= 20 || currentHour < 4;
  const targetSpeciesKey = pokemon.originalNumber || pokemon.number || pokemon.species || pokemon.nameEn || pokemon.name;
  const hasCaughtBefore = caughtPokemon.some((ownedPokemon) => {
    const ownedSpeciesKey = ownedPokemon?.originalNumber || ownedPokemon?.number || ownedPokemon?.species || ownedPokemon?.nameEn || ownedPokemon?.name;
    return ownedSpeciesKey && ownedSpeciesKey === targetSpeciesKey;
  });

  // 인벤토리에서 볼 종류만 필터링하고 배율 계산
  const pokeballs = items
    .filter(item => {
      if (!item || !item.name) return false;
      const name = item.name.toLowerCase();
      if (!(name.includes('볼') || name.includes('ball'))) return false;
      const isSafariBall = name.includes('사파리') || name.includes('safari');
      if (isSafariBall && !isSafari) return false;
      return true;
    })
    .filter(item => item.count > 0)
    .map(item => {
      const multiplier = calculateBallMultiplier(item, pokemon, {
        isNight,
        isCave,
        isWaterside,
        turnCount: escapeAttempts + 1,
        activePartyPokemon: partnerPokemon || null,
        hasCaughtBefore,
      });

      return {
        name: item.name,
        nameEn: item.nameEn,
        id: item.itemId,
        multiplier,
        imageUrl: item.imageUrl,
        count: item.count
      };
    });

  // 포켓몬 스프라이트 URL
  const pokemonSpriteUrl = pokemon.isShiny
    ? `https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/shiny/${pokemon.number}.png`
    : (pokemon.spriteUrl || `https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/${pokemon.number}.png`);

  // 스프라이트 하단 투명 여백 측정 후 translateY 계산
  useEffect(() => {
    if (!pokemonSpriteUrl) return;
    setSpriteReady(false);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
        // 하단에서 위로 올라가며 픽셀 있는 행 찾기
        let bottomRow = 0;
        for (let y = canvas.height - 1; y >= 0; y--) {
          let hasPixel = false;
          for (let x = 0; x < canvas.width; x++) {
            if (data[(y * canvas.width + x) * 4 + 3] > 10) { hasPixel = true; break; }
          }
          if (hasPixel) { bottomRow = y; break; }
        }
        // 하단 빈 비율 (0 = 내용이 바닥까지, 1 = 전부 빈칸)
        const emptyRatio = (canvas.height - 1 - bottomRow) / canvas.height;
        // 빈 공간이 많을수록 위로 덜 올림 (더 아래로)
        const offset = Math.round(-28 + emptyRatio * 40);
        setSpriteTranslateY(offset);
        setSpriteReady(true);
      } catch {
        setSpriteTranslateY(-28);
        setSpriteReady(true);
      }
    };
    img.src = pokemonSpriteUrl;
  }, [pokemonSpriteUrl]);

  // 도망 로직
  const checkIfPokemonEscapes = () => {
    if (activeEscapeMode === 'none') {
      console.log('[도망 판정] none 모드 - 포켓몬이 남아있습니다');
      return false;
    }

    if (activeEscapeMode === 'instant') {
      console.log('[도망 판정] instant 모드 - 포켓몬이 도망갑니다');
      return true;
    }

    if (activeEscapeMode === 'speed') {
      if (!partnerPokemon) {
        console.log('[도망 판정] 파트너 포켓몬 없음 - 즉시 도망');
        return true;
      }

      const A = pokemon.baseSpeed || pokemon.speed || 50;
      const B = (partnerPokemon.baseSpeed || partnerPokemon.speed || 50) / 4;
      const C = escapeAttempts;

      const F = Math.floor((A * 32) / B + 30 * C);

      console.log('[도망 판정] 스피드 기반 계산');
      console.log(`  야생 ${pokemon.name} 스피드(A): ${A}`);
      console.log(`  파트너 ${partnerPokemon.nickname || partnerPokemon.name} 스피드/4(B): ${B.toFixed(2)}`);
      console.log(`  포획 실패 횟수(C): ${C}`);
      console.log(`  F값: ${F}`);

      if (F > 255) {
        console.log('  -> F > 255, 100% 도망');
        return true;
      }

      const randomValue = Math.floor(Math.random() * 256);
      const escapes = randomValue <= F;

      console.log(`  -> 랜덤값: ${randomValue}, F: ${F}`);
      console.log(`  -> 결과: ${escapes ? '도망침' : '남아있음'}`);

      return escapes;
    }

    return false;
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
      alert(`포켓몬이 가득 찼습니다!\n\n파트너를 제외한 포켓몬이 ${maxPokemonCount}마리입니다.\n박스를 정리한 후 다시 시도해주세요.`);
      return;
    }

    setCatching(true);
    setResult(null);
    setMessage(''); // 메시지 초기화

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
              console.log('[리전폼 포획률 참조]', pokemon.name, '-> 원종:', originalPokemon?.name, '포획률:', baseCatchRate);
            }

            if (baseCatchRate === undefined) {
              baseCatchRate = 0.20;
            }

            const boostedCatchRate = baseCatchRate > 0 && baseCatchRate <= 1
              ? Math.round(baseCatchRate * 255 * 3)
              : baseCatchRate * 3;
            const catchChance = calculateCaptureChance(selectedBall, pokemon, {
              catchRate: boostedCatchRate,
              maxHp: 100,
              currentHp: 1,
              isNight,
              isCave,
              isWaterside,
              turnCount: escapeAttempts + 1,
              activePartyPokemon: partnerPokemon || null,
              hasCaughtBefore,
            });
            const randomValue = Math.random();
            const success = randomValue < catchChance;

            // 디버깅 로그
            console.log('[포획 시도]', pokemon.name);
            console.log('  - 기본 포획률:', pokemon.catchRate);
            console.log('  - 적용 포획률(체력 1 기준, 3배):', boostedCatchRate);
            console.log('  - 기준 체력:', '1%');
            console.log('  - 볼 배율:', selectedBall.multiplier);
            console.log('  - 원작식 최종 포획 확률:', catchChance);
            console.log('  - 랜덤 값:', randomValue);
            console.log('  - 결과:', success ? '성공' : '실패');

            if (success) {
              setResult('success');
              setCatching(false);

              setTimeout(async () => {
                alert(`${pokemon.name}을(를) 잡았습니다!`);

                try {
                  // 성공 시 볼 소모 + 포켓몬 추가를 onCatchSuccess 내에서 한 번에 처리
                  await onCatchSuccess(pokemon, selectedBall, true);
                } catch (error) {
                  console.error('❌ 포획 처리 중 오류 발생 (화면은 계속 진행합니다):', error);
                } finally {
                  onClose();
                }
              }, 2500);
            } else {
              // 포획 실패 시 볼 소모
              if (onApplyLoot) {
                onApplyLoot({ money: 0, items: [], ingredients: [], berries: [] }, selectedBall);
              }
              // 포획 실패
              setEscapeAttempts(prev => prev + 1);
              const pokemonEscapes = checkIfPokemonEscapes();

              // 랜덤 메시지 선택
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
                // 도망가지 않음 - UI만 업데이트
                setCatching(false);
                setResult(null);
                setShaking(0);
                setMessage(randomMessage);
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
      onClick={() => {
        if (catching || result) return;
        setSelectedBall(null);
      }}
    >
      <div
        className="w-full max-w-2xl mx-4"
        onClick={e => e.stopPropagation()}
      >
        {!result && !catching && (
          <div style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
            {/* 상단 배틀 필드 — encounter-context와 이어짐 */}
            <div className="relative p-6" style={{
              transform: 'scale(1.05)', transformOrigin: 'top center', marginBottom: 0, paddingTop: 120, paddingBottom: 44,
              backgroundColor: bgImage ? '#1a1a1a' : '#ffffff',
              backgroundImage: bgImage ? `url("${bgImage}")` : 'none',
              backgroundSize: 'cover',
              backgroundPosition: 'center 30%',
              backgroundRepeat: 'no-repeat',
            }}>
              {/* encounter-pokemon 이미지 + 포켓몬 정보 */}
              {/* encounter-pokemon 이미지 — 왼쪽 삐져나온 부분 clip */}
              <div style={{ position: 'absolute', top: 20, left: 0, zIndex: 2, overflow: 'hidden' }}>
                <img src={encounterPokemonImg} alt="" style={{ height: 120, width: 'auto', display: 'block', marginLeft: -15 }} />
                {/* 포켓몬 정보 오버레이 */}
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 12px 0 31px', fontFamily: "'Mona12 Text KR','Mona12',monospace" }}>
                  {/* 이름 + 레벨 */}
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
                    <span style={{ fontWeight: 800, fontSize: 20, color: '#1a1a1a', whiteSpace: 'nowrap' }}>야생의 {getBaseName(pokemon.name)}</span>
                    <span style={{ fontSize: 12, color: '#555', fontWeight: 600, whiteSpace: 'nowrap' }}>Lv.{pokemon.level ?? '???'}</span>
                  </div>
                  {/* 타입 뱃지 + 특성 + 성별 */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
                    {[pokemon.type, pokemon.type2].filter(Boolean).map(t => (
                      <span key={t} style={{
                        padding: '1px 7px', borderRadius: 999, fontSize: 10, fontWeight: 700, color: '#fff',
                        background: TYPE_COLORS[t] || '#888',
                      }}>{t}</span>
                    ))}
                    {pokemon.ability && (
                      <span style={{ fontSize: 10, color: '#333', fontWeight: 600, whiteSpace: 'nowrap', marginLeft: 8 }}>
                        {pokemon.ability}
                      </span>
                    )}
                    {pokemon.gender === 'male' && (
                      <svg width="13" height="13" viewBox="0 0 100 100" style={{ flexShrink: 0 }}>
                        {/* 원 */}
                        <circle cx="38" cy="62" r="26" fill="none" stroke="#4a90d9" strokeWidth="10"/>
                        {/* 화살표 선 */}
                        <line x1="57" y1="43" x2="90" y2="10" stroke="#4a90d9" strokeWidth="10" strokeLinecap="round"/>
                        {/* 화살표 머리 */}
                        <polyline points="65,8 92,8 92,35" fill="none" stroke="#4a90d9" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                    {pokemon.gender === 'female' && (
                      <svg width="13" height="13" viewBox="0 0 100 100" style={{ flexShrink: 0 }}>
                        {/* 원 */}
                        <circle cx="50" cy="38" r="28" fill="none" stroke="#e05c8a" strokeWidth="10"/>
                        {/* 세로선 */}
                        <line x1="50" y1="66" x2="50" y2="92" stroke="#e05c8a" strokeWidth="10" strokeLinecap="round"/>
                        {/* 가로선 */}
                        <line x1="34" y1="82" x2="66" y2="82" stroke="#e05c8a" strokeWidth="10" strokeLinecap="round"/>
                      </svg>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end mb-2" style={{ paddingRight: 16, paddingTop: 0 }}>
                <div className="text-center relative" style={{ marginTop: -26, marginRight: 18, zIndex: 10 }}>

                  {/* 이로치 반짝임 효과 */}
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
                    style={{ transform: `scale(1.25) translateY(${spriteTranslateY}px) translateX(-12px)`, transformOrigin: 'center', position: 'relative', zIndex: 2, opacity: spriteReady ? 1 : 0,
                      backgroundImage: `url(${pokemonSpriteUrl})`,
                      backgroundSize: 'contain',
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'center',
                      imageRendering: 'pixelated'
                    }}
                  />

                  {/* bg-base 상단 덩어리 — absolute로 레이아웃 영향 없음 */}
                  {bgBase && (
                    <div style={{
                      position: 'absolute',
                      top: 'calc(100% - 100px)', left: 'calc(50% + 25px)', zIndex: 1,
                      transform: 'translateX(-60%)',
                      width: 408, height: 64,
                      backgroundImage: `url(${bgBase})`,
                      backgroundSize: '408px 144px',
                      backgroundPosition: '0 0',
                      backgroundRepeat: 'no-repeat',
                      imageRendering: 'pixelated',
                    }} />
                  )}
                </div>
              </div>

              {/* bg-base 하단 덩어리 — 좌하단 */}
              {bgBase && (
                <div style={{
                  position: 'absolute', bottom: 0, left: 8,
                  width: 408, height: 60,
                  backgroundImage: `url(${bgBase})`,
                  backgroundSize: '408px 144px',
                  backgroundPosition: '0 -84px',
                  backgroundRepeat: 'no-repeat',
                  imageRendering: 'pixelated',
                }} />
              )}

            </div>

            {/* 애니메이션 스타일 */}
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

              .sparkle-1 { top: 45%; left: 5%; animation-delay: 0s; }
              .sparkle-2 { top: 55%; right: 10%; animation-delay: 0.4s; }
              .sparkle-3 { bottom: 10%; left: 15%; animation-delay: 0.8s; }
              .sparkle-4 { bottom: 5%; right: 5%; animation-delay: 1.2s; }
              .sparkle-5 { top: 65%; left: -5%; animation-delay: 0.6s; }
              .sparkle-6 { top: 70%; right: 0%; animation-delay: 1s; }
            `}</style>

            {/* encounter-context — 상단과 바로 이어짐, 이미지가 너비 결정 */}
            <div style={{ position: 'relative' }}>
              <img
                src={encounterContextImg}
                alt=""
                style={{ width: '100%', display: 'block', transform: 'scale(1.1)', transformOrigin: 'center' }}
              />
              <div style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                padding: '0 30px',
              }}>
                {message ? (
                  <div className="font-bold text-gray-800" style={{ fontSize: 18, lineHeight: 1.4, fontFamily: "'Mona12 Text KR','Mona12',monospace" }}>
                    {message.split('\n').map((line, i) => <p key={i}>{line}</p>)}
                  </div>
                ) : (
                  <div style={{ fontFamily: "'Mona12 Text KR','Mona12',monospace", fontWeight: 'bold', color: '#1f2937' }}>
                    <p style={{ fontSize: 22, lineHeight: 1.4 }}>야생의 {getBaseName(pokemon.name)}이(가) 나타났다!</p>
                    <p style={{ fontSize: 22, lineHeight: 1.4 }}>무엇을 할까?</p>
                  </div>
                )}
              </div>
            </div>

            {/* encounter-ball — 분리, 아래에 독립 배치 */}
            <div style={{ marginTop: 12, position: 'relative' }}>
              {/* 도망치기 — encounter-ball 우상단 */}
              <button onClick={handleCloseClick} style={{ position: 'absolute', top: 15, right: 8, zIndex: 30, background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
                <img src={encounterRunImg} alt="도망치기" style={{ height: 40, width: 'auto', display: 'block' }} />
              </button>
              {/* encounter-ball 9-slice 배경 — 모서리(28px)는 고정, 테두리는 콘텐츠 높이에 맞춰 늘어남.
                  중앙은 fill 없이 흰 배경 + 워터마크를 원래 비율 그대로(고정 크기) 얹어서 찌그러짐 없이 표시 */}
              <div style={{
                position: 'absolute',
                inset: 0,
                transform: 'scale(1.1)',
                transformOrigin: 'center',
                borderStyle: 'solid',
                borderWidth: 20,
                borderImageSource: `url(${encounterBallImg})`,
                borderImageSlice: 28,
                borderImageRepeat: 'stretch',
                backgroundColor: '#ffffff',
                backgroundImage: `url(${encounterBallWatermarkImg})`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center',
                backgroundSize: '150px 150px',
                backgroundClip: 'padding-box',
                pointerEvents: 'none',
              }} />
              <div style={{
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                padding: '20px 30px 30px 22px',
              }}>
                <div style={{ marginBottom: 10 }}>
                  <img src={encounterChooseImg} alt="볼을 선택하세요" style={{ height: 35, width: 'auto', display: 'block' }} />
                </div>

                {/* 볼 그리드 — 4줄 초과 시 커스텀 스크롤 */}
                <div onClick={(e) => e.stopPropagation()} style={{ display: 'flex', gap: 6 }}>
                  {/* 스크롤 영역 */}
                  <div
                    ref={ballGridRef}
                    onScroll={handleBallGridScroll}
                    style={{
                      flex: 1,
                      display: 'grid',
                      gridTemplateColumns: 'repeat(5, 1fr)',
                      alignContent: 'start',
                      gap: 6,
                      maxHeight: pokeballs.length > 15 ? 234 : 'none',
                      overflowY: pokeballs.length > 15 ? 'scroll' : 'visible',
                      scrollbarWidth: 'none',
                      msOverflowStyle: 'none',
                    }}
                  >
                    <style>{`.ball-grid-scroll::-webkit-scrollbar { display: none; }`}</style>
                    {pokeballs.length === 0 ? (
                      <div style={{ gridColumn: '1 / -1', textAlign: 'center', paddingTop: 16, color: '#888', fontSize: 14 }}>
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
                            className={`relative flex flex-col items-center gap-1 rounded-lg p-2 border-2 transition-all ${
                              disabled
                                ? 'opacity-30 cursor-not-allowed border-gray-300'
                                : selectedBall?.name === ball.name
                                  ? 'border-yellow-400 shadow-lg ring-2 ring-yellow-300'
                                  : 'border-gray-300 hover:border-gray-400 hover:shadow-md'
                            }`}
                            style={{ background: '#ffffff' }}
                          >
                            <div className="absolute top-1 right-1 bg-gray-800 text-white px-1 py-0 rounded text-sm font-bold leading-tight">
                              {count}
                            </div>
                            <div
                              className="item-sprite w-8 h-8 flex-shrink-0"
                              style={{
                                backgroundImage: `url(${ball.imageUrl})`,
                                backgroundSize: 'contain',
                                backgroundRepeat: 'no-repeat',
                                backgroundPosition: 'center',
                                imageRendering: 'pixelated'
                              }}
                            />
                            <div className="text-center w-full">
                              <div className="font-bold text-sm text-gray-800 leading-tight break-keep">{ball.name}</div>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>

                  {/* 커스텀 스크롤바 — 4줄 초과 시만 표시 */}
                  {pokeballs.length > 15 && (
                    <div style={{
                      width: 10,
                      borderRadius: 6,
                      background: 'rgba(0,0,0,0.10)',
                      border: '1.5px solid rgba(0,0,0,0.15)',
                      position: 'relative',
                      flexShrink: 0,
                      cursor: 'pointer',
                    }}>
                      <div
                        onMouseDown={handleThumbDrag}
                        style={{
                          position: 'absolute',
                          left: 1,
                          right: 1,
                          borderRadius: 4,
                          background: '#4a4a4a',
                          height: `${thumbHeightPct}%`,
                          top: `${scrollRatio * (100 - thumbHeightPct)}%`,
                          cursor: 'grab',
                          transition: 'top 0.05s',
                        }}
                      />
                    </div>
                  )}
                </div>

              </div>

              {/* 바텀시트 — 던진다! 버튼 */}
              {selectedBall && (
                <div onClick={(e) => e.stopPropagation()} style={{
                  position: 'absolute',
                  bottom: -16,
                  left: -14,
                  right: -14,
                  padding: '24px 20px 20px',
                  background: 'linear-gradient(to top, rgba(255,255,255,0.95) 60%, transparent 100%)',
                  borderRadius: '0 0 8px 8px',
                }}>
                  <button
                    onClick={handleCatch}
                    className="w-full flex items-center justify-center gap-2 bg-green-500 text-white rounded-lg font-bold hover:bg-green-600 border-4 border-green-700 transition-colors"
                    style={{ padding: '10px 0', fontSize: 18 }}
                  >
                    <Zap size={18} />
                    {selectedBall.name}을(를) 던진다!
                  </button>
                </div>
              )}
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
              <div className="mb-6 flex justify-center text-green-500">
                <CheckCircle2 size={96} />
              </div>
              <h3 className="text-4xl font-bold text-green-600 mb-4">잡았다!</h3>
              <p className="text-3xl text-gray-800 mb-2">{getBaseName(pokemon.name)}을(를) 잡았다!</p>
              {isFirstCatch && (
                <div className="inline-block bg-yellow-100 px-6 py-3 rounded-lg border-2 border-yellow-400 mt-4">
                  <p className="text-base text-gray-600">
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
              <div className="mb-6 flex justify-center text-gray-400">
                <Wind size={96} />
              </div>
              <h3 className="text-4xl font-bold text-red-600 mb-4">앗! 아깝다!</h3>
              <p className="text-3xl text-gray-800 mb-2">{getBaseName(pokemon.name)}이(가) 볼에서 나왔다!</p>
              <div className="inline-block bg-red-100 px-6 py-3 rounded-lg border-2 border-red-400 mt-4">
                <p className="text-base text-gray-600">
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

