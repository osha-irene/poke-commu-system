import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, Footprints, MapPin, Trees, Mountain, Waves } from 'lucide-react';
import { getPokemonLocalIconUrl } from '../../utils/pokemonIconUtils';
import mapBg from '../../assets/map/map.png';
import deviceTop from '../../assets/map/device-top.png';
import deviceBottom from '../../assets/map/device-bottom.png';
import mapNameImg from '../../assets/map/map-name.png';
import searchGoImg from '../../assets/map/search-go.png';
import arrowTopImg from '../../assets/map/arrow_top.png';
import arrowBottomImg from '../../assets/map/arrow_bottom.png';
import arrowLeftImg from '../../assets/map/arrow_left.png';
import arrowRightImg from '../../assets/map/arrow_right.png';
import { ref, get } from 'firebase/database';
import { database } from '../../firebase';

const DEFAULT_VIEWPORT = { x: 0, y: 0, w: 100, h: 100 };

function getViewportBgStyle(vp) {
  const { x, y, w, h } = vp;
  const bgSizeW = w >= 100 ? '100%' : `${(10000 / w).toFixed(4)}%`;
  const bgPosX  = w >= 100 ? '0%' : `${(x * 100 / (100 - w)).toFixed(4)}%`;
  const bgPosY  = h >= 100 ? '0%' : `${(y * 100 / (100 - h)).toFixed(4)}%`;
  return {
    backgroundImage: `url("${mapBg}")`,
    backgroundSize: `${bgSizeW} auto`,
    backgroundPosition: `${bgPosX} ${bgPosY}`,
  };
}

function toViewportCoords(px, py, vp) {
  return {
    x: ((px - vp.x) / vp.w) * 100,
    y: ((py - vp.y) / vp.h) * 100,
  };
}

const toDexNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const getTooltipSpeciesKey = (pokemon = {}) => {
  const speciesNumber = pokemon.originalNumber || pokemon.displayNumber || pokemon.number;
  const formGroup = pokemon.regionalForm ? `regional:${pokemon.regionalForm}` : 'base';
  return `${speciesNumber || pokemon.baseSpecies || pokemon.name || pokemon.id}:${formGroup}`;
};

// device-map.png 흰색 픽셀 영역 (1322×908 기준, PowerShell로 측정)
// x=206~1115, y=153~808 → 909×655 px
const SCREEN = {
  left:   '15.58%',
  top:    '16.85%',
  right:  '15.66%',
  bottom: '11.01%',
};

export default function MapView({
  regions,
  onRegionClick,
  gamePokedex = [],
  allPokemonMaster = [],
  pokedexData = {},
  caughtPokemon = []
}) {
  const [selectedTownId, setSelectedTownId] = useState(null);
  const [openTownRegionsId, setOpenTownRegionsId] = useState(null);
  const [screenView, setScreenView] = useState('map'); // 'map' | 'areas' | 'detail'
  const [selectedArea, setSelectedArea] = useState(null);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [viewport, setViewport] = useState(DEFAULT_VIEWPORT);
  const [tvPhase, setTvPhase] = useState(0); // 0: 검은화면, 1: 애니메이션, 2: 종료
  const [visitedTownIds, setVisitedTownIds] = useState(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem('mapVisitedTownIds') || '[]'));
    } catch {
      return new Set();
    }
  });

  useEffect(() => {
    get(ref(database, 'gameData/config/mapViewport')).then(snap => {
      if (snap.exists()) setViewport(snap.val());
    });
  }, []);

  useEffect(() => {
    const t1 = setTimeout(() => setTvPhase(1), 60);
    const t2 = setTimeout(() => setTvPhase(2), 550); // 확장 시작 타이밍에 콘텐츠 팝인
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const towns = useMemo(() => {
    const townMap = new Map();
    regions.forEach(r => {
      if (r.isTownMeta && r.groupId) {
        townMap.set(r.groupId, {
          groupId: r.groupId,
          groupName: r.groupName || r.groupId,
          isDefaultTown: r.isDefaultTown || false,
          groupVisible: r.groupVisible,
          color: r.color || '#10b981',
          x: r.x ?? 50,
          y: r.y ?? 50,
        });
      }
    });
    regions.forEach(r => {
      if (!r.isTownMeta && r.groupId && r.groupName && !townMap.has(r.groupId)) {
        townMap.set(r.groupId, {
          groupId: r.groupId,
          groupName: r.groupName,
          isDefaultTown: r.isDefaultTown || false,
          groupVisible: r.groupVisible,
          color: r.color || '#10b981',
          x: r.x ?? 50,
          y: r.y ?? 50,
        });
      }
    });
    return Array.from(townMap.values());
  }, [regions]);

  useEffect(() => {
    if (towns.length === 0) return;
    setSelectedTownId(prev => {
      if (prev) return prev;
      return (towns.find(t => t.isDefaultTown) || towns[0]).groupId;
    });
  }, [towns]);

  const selectedTown = towns.find(t => t.groupId === selectedTownId) || null;

  const selectedTownRegions = useMemo(() => {
    if (!selectedTownId) return [];
    return regions.filter(r =>
      r.groupId === selectedTownId && !r.isTownMeta && r.groupVisible !== false
    );
  }, [regions, selectedTownId]);

  // Pokédex helpers
  const caughtNumbers = useMemo(() => new Set(
    caughtPokemon.flatMap(p => p ? [p.number, p.originalNumber] : []).map(toDexNumber).filter(Boolean)
  ), [caughtPokemon]);

  const unlockedNumbers = useMemo(() => new Set([
    ...Object.keys(pokedexData || {}).map(toDexNumber).filter(Boolean),
    ...caughtNumbers,
  ]), [pokedexData, caughtNumbers]);

  const gamePokedexNumbers = useMemo(() => new Set(
    gamePokedex.map(p => toDexNumber(p.number)).filter(Boolean)
  ), [gamePokedex]);

  const isPokemonUnlocked = (pokemon = {}) => {
    const number = toDexNumber(pokemon.number);
    const originalNumber = toDexNumber(pokemon.originalNumber);
    if (number && unlockedNumbers.has(number)) return true;
    if (originalNumber && unlockedNumbers.has(originalNumber)) return true;
    return allPokemonMaster.some(form => (
      form.originalNumber === pokemon.number &&
      gamePokedexNumbers.has(toDexNumber(form.number)) &&
      unlockedNumbers.has(toDexNumber(form.number))
    ));
  };

  const getPlacePokemonList = (place = {}) => {
    const pokemonIds = Array.isArray(place.pokemons) ? place.pokemons : [];
    const pokemonBySpecies = new Map();
    pokemonIds.forEach(pokemonId => {
      const pokemon = allPokemonMaster.find(c =>
        String(c.number) === String(pokemonId) ||
        String(c.originalNumber) === String(pokemonId) ||
        c.id === pokemonId
      );
      if (!pokemon) { pokemonBySpecies.set(`unknown:${pokemonId}`, '??'); return; }
      const key = getTooltipSpeciesKey(pokemon);
      if (!pokemonBySpecies.has(key)) pokemonBySpecies.set(key, isPokemonUnlocked(pokemon) ? pokemon.name : '??');
    });
    return Array.from(pokemonBySpecies.values());
  };

  const handleSelectArea = (area) => {
    const places = Array.isArray(area.places) ? area.places.filter(p => p?.name) : [];
    setSelectedArea(area);
    setSelectedPlace(places.length > 0 ? places[0] : null);
    setScreenView('detail');
  };

  const handleExplore = () => {
    if (!onRegionClick) return;
    const region = selectedArea;
    if (selectedPlace) {
      onRegionClick({
        ...region, ...selectedPlace,
        id: `${region.id}__place__${selectedPlace.id}`,
        baseRegionId: region.id,
        regionId: region.id,
        regionName: region.name,
        regionMaxLevel: region.maxLevel,
        lootConfig: selectedPlace.lootConfig || region.lootConfig,
        placeId: selectedPlace.id,
        placeName: selectedPlace.name,
        name: `${region.name} - ${selectedPlace.name}`,
      });
    } else {
      onRegionClick(region);
    }
  };

  const animateTownToCenter = useCallback((town) => {
    const vp = viewportRef.current;
    const screenRect = screenRef.current?.getBoundingClientRect();
    let centerXFrac = 0.5;
    let centerYFrac = 0.5;
    if (screenRect) {
      const upRect    = arrowBtnRefs.up.current?.getBoundingClientRect();
      const downRect  = arrowBtnRefs.down.current?.getBoundingClientRect();
      const leftRect  = arrowBtnRefs.left.current?.getBoundingClientRect();
      const rightRect = arrowBtnRefs.right.current?.getBoundingClientRect();
      const areaTop    = upRect    ? upRect.bottom    - screenRect.top  : 0;
      const areaBottom = downRect  ? downRect.top     - screenRect.top  : screenRect.height;
      const areaLeft   = leftRect  ? leftRect.right   - screenRect.left : 0;
      const areaRight  = rightRect ? rightRect.left   - screenRect.left : screenRect.width;
      centerXFrac = (areaLeft + areaRight) / 2 / screenRect.width;
      centerYFrac = ((areaTop + areaBottom) / 2 + 45) / screenRect.height;
    }
    const targetX = Math.max(0, Math.min(100 - vp.w, town.x - vp.w * centerXFrac));
    const targetY = Math.max(0, Math.min(100 - vp.h, town.y - vp.h * centerYFrac));
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    const startX = vp.x, startY = vp.y;
    const startTime = performance.now();
    const duration = 220;
    const ease = t => 1 - Math.pow(1 - t, 3);
    const frame = (now) => {
      const t = Math.min(1, (now - startTime) / duration);
      const e = ease(t);
      setViewport(v => ({ ...v, x: startX + (targetX - startX) * e, y: startY + (targetY - startY) * e }));
      if (t < 1) animFrameRef.current = requestAnimationFrame(frame);
    };
    animFrameRef.current = requestAnimationFrame(frame);
  }, []);

  const handlePinClick = (townId) => {
    setSelectedTownId(townId);
    setOpenTownRegionsId(townId);
    setVisitedTownIds(prev => {
      const next = new Set(prev);
      next.add(townId);
      try {
        localStorage.setItem('mapVisitedTownIds', JSON.stringify(Array.from(next)));
      } catch {}
      return next;
    });
    setScreenView('map');
    const town = towns.find(t => t.groupId === townId);
    if (town) animateTownToCenter(town);
  };

  const getDisplayPokemon = (area, place) => {
    const ids = place && Array.isArray(place.pokemons) && place.pokemons.length > 0
      ? place.pokemons : (area.pokemons || []);
    const pool = area.allowNationalPokedex ? allPokemonMaster : gamePokedex;
    return pool.filter(p => ids.includes(p.id) || ids.includes(p.number));
  };

  const BROWN = '#3d1a08';
  const BROWN_MUTED = 'rgba(61,26,8,0.55)';
  const fBold = { fontFamily: 'GmarketSans, sans-serif', fontWeight: 700, color: BROWN };
  const fMed  = { fontFamily: 'GmarketSans, sans-serif', fontWeight: 500, color: BROWN };

  // 첫 번째 지역이 오른쪽에 오도록
  // 5글자 초과 시 줄바꿈 (마지막 줄이 1글자가 되면 한 글자 앞에서 나눔)
  const wrapPillText = (text) => {
    const MAX = 5;
    if (text.length <= MAX) return [text];
    const lines = [];
    let str = text;
    while (str.length > MAX) {
      const leftover = str.slice(MAX).length;
      const cut = leftover === 1 ? MAX - 1 : MAX;
      lines.push(str.slice(0, cut));
      str = str.slice(cut);
    }
    lines.push(str);
    return lines;
  };

  // transform 미사용 — pillPop 애니메이션이 transform: scale(1)로 끝나면서 translateY를 덮어쓰는 문제 방지
  const regionPillPositions = [
    { top: 'calc(50% - 20px)', right: -125 },      // 0: 오른쪽 (첫 번째)
    { top: -44,    left: 0, right: 0, marginLeft: 'auto', marginRight: 'auto', width: 'fit-content' },   // 1: 위 (라벨 기준 중앙)
    { bottom: -44, left: 0, right: 0, marginLeft: 'auto', marginRight: 'auto', width: 'fit-content' }, // 2: 아래 (라벨 기준 중앙)
    { top: 'calc(50% - 20px)', left: -125 },       // 3: 왼쪽
  ];

  const screenRef = useRef(null);
  const arrowBtnRefs = { up: useRef(null), down: useRef(null), left: useRef(null), right: useRef(null) };
  const viewportRef = useRef(viewport);
  useEffect(() => { viewportRef.current = viewport; }, [viewport]);
  const animFrameRef = useRef(null);
  const dragRef = useRef(null); // { startX, startY, startVpX, startVpY }
  const [isDragging, setIsDragging] = useState(false);

  const handleMapMouseDown = useCallback((e) => {
    if (e.button !== 0) return;
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startVpX: viewportRef.current.x,
      startVpY: viewportRef.current.y,
    };
    setIsDragging(false);
  }, []);

  const handleMapMouseMove = useCallback((e) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    if (!isDragging && Math.hypot(dx, dy) < 4) return;
    setIsDragging(true);
    const rect = screenRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mapDx = (dx / rect.width)  * viewportRef.current.w;
    const mapDy = (dy / rect.height) * viewportRef.current.h;
    const newX = Math.max(0, Math.min(100 - viewportRef.current.w, dragRef.current.startVpX - mapDx));
    const newY = Math.max(0, Math.min(100 - viewportRef.current.h, dragRef.current.startVpY - mapDy));
    setViewport(v => ({ ...v, x: newX, y: newY }));
  }, [isDragging]);

  const handleMapMouseUp = useCallback(() => {
    dragRef.current = null;
    setTimeout(() => setIsDragging(false), 0);
  }, []);
  const clickAudioRef = useRef(null);
  useEffect(() => {
    const basePath = window.location.pathname.includes('/poke-commu-system') ? '/poke-commu-system' : '';
    const audio = new Audio(`${basePath}/sound/A-button.mp3`);
    audio.preload = 'auto';
    audio.volume = 0.5;
    clickAudioRef.current = audio;
  }, []);

  const playClickSound = () => {
    const audio = clickAudioRef.current;
    if (!audio) return;
    audio.currentTime = 0.2;
    audio.play().catch(() => {});
  };

  const navigateToDirection = (dir) => {
    if (towns.length === 0) return;
    const selectedTown = towns.find(t => t.groupId === selectedTownId);
    const cx = selectedTown ? selectedTown.x : viewport.x + viewport.w / 2;
    const cy = selectedTown ? selectedTown.y : viewport.y + viewport.h / 2;

    // 방향별로 해당 방향에 있는 마을 필터 후 가장 가까운 것
    const candidates = towns.filter(t => {
      const dx = t.x - cx;
      const dy = t.y - cy;
      if (dir === 'right') return dx > 1;
      if (dir === 'left')  return dx < -1;
      if (dir === 'down')  return dy > 1;
      if (dir === 'up')    return dy < -1;
      return false;
    });

    if (candidates.length === 0) return;

    // 해당 방향 축 기준 가장 가까운 마을
    const nearest = candidates.reduce((best, t) => {
      const dist = Math.hypot(t.x - cx, t.y - cy);
      const bestDist = Math.hypot(best.x - cx, best.y - cy);
      return dist < bestDist ? t : best;
    });

    animateTownToCenter(nearest);
    setSelectedTownId(nearest.groupId);
    setOpenTownRegionsId(null);
    playClickSound();
  };

  const arrowImgs = { up: arrowTopImg, down: arrowBottomImg, left: arrowLeftImg, right: arrowRightImg };

  const arrowHasTowns = useMemo(() => {
    const selectedTown = towns.find(t => t.groupId === selectedTownId);
    const cx = selectedTown ? selectedTown.x : viewport.x + viewport.w / 2;
    const cy = selectedTown ? selectedTown.y : viewport.y + viewport.h / 2;
    const has = (dir) => towns.some(t => {
      const dx = t.x - cx, dy = t.y - cy;
      if (dir === 'right') return dx > 1;
      if (dir === 'left')  return dx < -1;
      if (dir === 'down')  return dy > 1;
      if (dir === 'up')    return dy < -1;
      return false;
    });
    return { up: has('up'), down: has('down'), left: has('left'), right: has('right') };
  }, [towns, viewport]);

  const ArrowBtn = ({ dir }) => (
    <button
      ref={arrowBtnRefs[dir]}
      type="button"
      onClick={(e) => { e.stopPropagation(); navigateToDirection(dir); }}
      style={{
        position: 'absolute',
        ...(dir === 'up'    && { top: 6,    left: '50%', transform: 'translateX(-50%)' }),
        ...(dir === 'down'  && { bottom: 31, left: '50%', transform: 'translateX(-50%)' }),
        ...(dir === 'left'  && { left: 6,   top: '50%',  transform: 'translateY(-50%)' }),
        ...(dir === 'right' && { right: 6,  top: '50%',  transform: 'translateY(-50%)' }),
        zIndex: 20,
        background: 'none',
        border: 'none',
        padding: 0,
        cursor: 'pointer',
        opacity: arrowHasTowns[dir] ? 1 : 0.3,
        transition: 'opacity 0.2s',
      }}
    >
      <img src={arrowImgs[dir]} alt={dir} style={{ display: 'block', imageRendering: 'auto', transform: 'scale(0.9)', transformOrigin: 'center' }} />
    </button>
  );

  /* ── 스크린 내 영역 목록 패널 ── */
  const AreasPanel = () => {
    const areas = selectedTownRegions;
    const accentColor = selectedTown?.color || '#4a9a08';
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ background: 'rgba(0,0,0,0.42)', zIndex: 20, padding: 14 }}>
        <div className="flex items-center gap-2 px-3 py-2 shrink-0" style={{ width: '88%', maxWidth: 520, minHeight: 56, marginBottom: 8, background: 'rgba(255,255,255,0.94)', border: '1px solid rgba(120,180,60,0.22)', borderRadius: 16, backdropFilter: 'blur(12px)' }}>
          <button onClick={() => setScreenView('map')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: BROWN_MUTED, padding: 4 }}>
            <ChevronLeft size={16} />
          </button>
          <span style={{ ...fBold, fontSize: 13, flex: 1, textAlign: 'center' }}>{selectedTown?.groupName}</span>
          <div className="w-6" />
        </div>
        <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1.5">
          {areas.length === 0 ? (
            <div className="flex items-center justify-center h-full text-xs" style={fMed}>탐험 가능한 구역이 없습니다</div>
          ) : areas.map(area => {
            const places = Array.isArray(area.places) ? area.places.filter(p => p?.name) : [];
            return (
              <button key={area.id} onClick={() => handleSelectArea(area)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left hover:opacity-80 active:scale-95 transition-all"
                style={{ background: 'rgba(255,255,255,0.7)', border: `1px solid rgba(61,26,8,0.12)` }}>
                {area.isCave ? <Mountain size={13} style={{ color: BROWN_MUTED, flexShrink: 0 }} />
                  : area.isWaterside ? <Waves size={13} style={{ color: BROWN_MUTED, flexShrink: 0 }} />
                  : <Trees size={13} style={{ color: BROWN_MUTED, flexShrink: 0 }} />}
                <span style={{ ...fBold, fontSize: 12, flex: 1 }}>{area.name}</span>
                {places.length > 0 && (
                  <span style={{ ...fMed, fontSize: 10, background: accentColor + '22', color: accentColor, padding: '1px 6px', borderRadius: 6 }}>
                    {places.length}곳
                  </span>
                )}
                <ChevronRight size={12} style={{ color: BROWN_MUTED }} />
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const TownAreasPanel = () => {
    const areas = selectedTownRegions;
    const accentColor = selectedTown?.color || '#4a9a08';

    return (
      <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(245,238,225,0.78)', zIndex: 20, padding: 14 }}>
        <div style={{ width: '88%', maxWidth: 400, maxHeight: '100%', display: 'flex', flexDirection: 'column', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 5px rgba(0,0,0,0.10)' }}>
          <button
            onClick={() => setScreenView('map')}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '11px 14px',
              background: '#1e4a08',
              border: '1.5px solid #1e4a08',
              borderBottom: 'none',
              borderRadius: '12px 12px 0 0',
              cursor: 'pointer',
              textAlign: 'left',
              WebkitTapHighlightColor: 'transparent',
              outline: 'none',
            }}
          >
            <MapPin size={16} style={{ color: '#a8d878', flexShrink: 0 }} />
            <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: '#fff' }}>{selectedTown?.groupName}</span>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginRight: 2 }}>{areas.length}</span>
            <ChevronDown size={15} style={{ color: 'rgba(255,255,255,0.6)' }} />
          </button>

          <div style={{
            flex: '1 1 auto',
            minHeight: 0,
            overflowY: 'auto',
            background: 'rgba(255,255,255,0.95)',
            border: `1.5px solid ${accentColor}`,
            borderTop: '1px solid rgba(120,180,60,0.12)',
            borderRadius: '0 0 12px 12px',
          }}>
            {areas.length === 0 ? (
              <div style={{ padding: '24px 14px', textAlign: 'center', fontSize: 13, fontWeight: 600, color: BROWN_MUTED }}>
                탐험 가능한 구역이 없습니다
              </div>
            ) : areas.map((area, index) => {
              const places = Array.isArray(area.places) ? area.places.filter(p => p?.name) : [];

              return (
                <button
                  key={area.id || area.name}
                  onClick={() => handleSelectArea(area)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 14px',
                    background: 'transparent',
                    border: 'none',
                    borderTop: index > 0 ? '1px solid rgba(120,180,60,0.10)' : 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                    WebkitTapHighlightColor: 'transparent',
                    outline: 'none',
                  }}
                >
                  <div style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0, background: accentColor, opacity: 0.6 }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#1a2e10', flex: 1 }}>{area.name}</span>
                  {places.length > 0 && (
                    <span style={{ fontSize: 10, color: '#5a7a40', background: 'rgba(74,154,8,0.13)', borderRadius: 10, padding: '1px 6px', marginRight: 4 }}>
                      {places.length}곳
                    </span>
                  )}
                  <ChevronRight size={13} style={{ color: '#5a7a40' }} />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  /* ── 스크린 내 상세 뷰 ── */
  const DetailPanel = () => {
    if (!selectedArea) return null;
    const places = Array.isArray(selectedArea.places) ? selectedArea.places.filter(p => p?.name) : [];
    const accentColor = selectedArea.color || selectedTown?.color || '#4a9a08';
    const areaPokemon = getDisplayPokemon(selectedArea, selectedPlace);
    const activeLevel = selectedPlace
      ? { min: selectedPlace.minLevel ?? selectedArea.minLevel ?? 1, max: selectedPlace.maxLevel ?? selectedArea.maxLevel ?? 20 }
      : { min: selectedArea.minLevel ?? 1, max: selectedArea.maxLevel ?? 20 };
    const activeRate = selectedPlace ? (selectedPlace.encounterRate ?? selectedArea.encounterRate) : selectedArea.encounterRate;

    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ background: 'rgba(0,0,0,0.42)', zIndex: 20, padding: 14 }}>
        <div className="flex items-center gap-2 px-3 py-2 shrink-0" style={{ width: '88%', maxWidth: 520, minHeight: 56, marginBottom: 8, background: 'rgba(255,255,255,0.94)', border: '1px solid rgba(120,180,60,0.22)', borderRadius: 16, backdropFilter: 'blur(12px)' }}>
          <button onClick={() => setScreenView('areas')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: BROWN_MUTED, padding: 4 }}>
            <ChevronLeft size={16} />
          </button>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ ...fBold, fontSize: 13 }}>{selectedArea.name}</div>
            <div style={{ ...fMed, fontSize: 10, color: BROWN_MUTED }}>{selectedTown?.groupName}</div>
          </div>
          <div className="flex flex-col items-end gap-0.5">
            <span style={{ ...fBold, fontSize: 0, background: accentColor + '22', color: accentColor, padding: '1px 8px', borderRadius: 20 }}>
              <span style={{ fontSize: 10 }}>Lv.{activeLevel.min}-{activeLevel.max}</span>
              Lv.{activeLevel.min}–{activeLevel.max}
            </span>
            {activeRate !== undefined && (
              <span style={{ ...fMed, fontSize: 10, color: BROWN_MUTED }}>{activeRate < 1 ? Math.round(activeRate * 100) : activeRate}%</span>
            )}
          </div>
        </div>
        <div className="overflow-y-auto flex flex-col gap-2" style={{ width: '88%', maxWidth: 520, maxHeight: 'calc(100% - 72px)', padding: '14px 14px 0' }}>
          {places.length > 0 && (
            <div className="flex flex-col gap-1">
              {places.map(place => {
                const active = selectedPlace?.id === place.id;
                return (
                  <button key={place.id} onClick={() => setSelectedPlace(place)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-all"
                    style={{ background: active ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.5)', border: `1.5px solid ${active ? accentColor : 'rgba(61,26,8,0.12)'}` }}>
                    {place.isCave ? <Mountain size={12} style={{ color: active ? accentColor : BROWN_MUTED }} />
                      : place.isWaterside ? <Waves size={12} style={{ color: active ? accentColor : BROWN_MUTED }} />
                      : <Trees size={12} style={{ color: active ? accentColor : BROWN_MUTED }} />}
                    <span style={{ ...fBold, fontSize: 12, flex: 1 }}>{place.name}</span>
                    <span style={{ ...fMed, fontSize: 0, color: BROWN_MUTED }}>
                      <span style={{ fontSize: 10 }}>Lv.{place.minLevel ?? selectedArea.minLevel ?? 1}-{place.maxLevel ?? selectedArea.maxLevel ?? 20}</span>
                      Lv.{place.minLevel ?? selectedArea.minLevel ?? 1}–{place.maxLevel ?? selectedArea.maxLevel ?? 20}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
          <button onClick={handleExplore}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl"
            style={{ ...fBold, fontSize: 0, background: accentColor, color: '#fff', border: 'none', cursor: 'pointer' }}>
            <Footprints size={14} />
            <span style={{ fontSize: 12 }}>{selectedPlace ? `${selectedPlace.name} 탐험하기` : '탐험하기'}</span>
            {selectedPlace ? `${selectedPlace.name} 탐험하기` : '탐험하기'}
          </button>
          <div style={{ ...fBold, fontSize: 0, color: BROWN_MUTED, marginTop: 4 }}>
            <span style={{ fontSize: 10 }}>등장 포켓몬 <span style={{ color: accentColor }}>{areaPokemon.length}</span></span>
            등장 포켓몬 <span style={{ color: accentColor }}>{areaPokemon.length}</span>
          </div>
          {areaPokemon.length === 0 && (
            <div style={{ ...fMed, fontSize: 11, color: 'rgba(255,255,255,0.65)', textAlign: 'center', padding: '16px 0' }}>등록된 포켓몬이 없습니다</div>
          )}
          {areaPokemon.length === 0 ? false && (
            <div style={{ ...fMed, fontSize: 11, color: BROWN_MUTED, textAlign: 'center', padding: '16px 0' }}>등록된 포켓몬이 없습니다</div>
          ) : (
            <div className="grid grid-cols-4 gap-1">
              {areaPokemon.map(p => {
                const caught = caughtNumbers.has(Number(p.number));
                const known = caught || isPokemonUnlocked(p);
                const iconUrl = known ? getPokemonLocalIconUrl({ ...p, nameEn: p.nameEn || p.name || 'UNKNOWN' }) : null;
                return (
                  <div key={p.id || p.number} className="flex flex-col items-center gap-1 rounded-lg py-2 px-1"
                    style={{ background: caught ? 'rgba(180,230,100,0.2)' : 'rgba(255,255,255,0.6)', border: `1px solid rgba(61,26,8,0.10)` }}>
                    <div className="w-8 h-8 flex items-center justify-center">
                      {iconUrl ? (
                        <div style={{ width: 32, height: 32, backgroundImage: `url(${iconUrl})`, backgroundSize: '64px 32px', backgroundPosition: 'left center', backgroundRepeat: 'no-repeat', imageRendering: 'pixelated' }} />
                      ) : <span style={{ color: BROWN_MUTED, fontSize: 18 }}>?</span>}
                    </div>
                    <span style={{ ...fMed, fontSize: 9, textAlign: 'center', lineHeight: 1.3, color: known ? BROWN : BROWN_MUTED }}>
                      {known ? p.name : '???'}
                    </span>
                    {caught && <span style={{ ...fBold, fontSize: 8, background: accentColor, color: '#fff', borderRadius: 10, padding: '1px 5px' }}>포획</span>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  const DeviceMobileDetailPanel = () => {
    if (!selectedArea) return null;
    const places = Array.isArray(selectedArea.places) ? selectedArea.places.filter(p => p?.name) : [];
    const accentColor = selectedArea.color || selectedTown?.color || '#4a9a08';
    const areaPokemon = getDisplayPokemon(selectedArea, selectedPlace);
    const activeLevel = selectedPlace
      ? { min: selectedPlace.minLevel ?? selectedArea.minLevel ?? 1, max: selectedPlace.maxLevel ?? selectedArea.maxLevel ?? 20 }
      : { min: selectedArea.minLevel ?? 1, max: selectedArea.maxLevel ?? 20 };
    const activeRate = selectedPlace ? (selectedPlace.encounterRate ?? selectedArea.encounterRate) : selectedArea.encounterRate;

    return (
      <div className="absolute inset-0" style={{ zIndex: 20, background: 'rgba(0, 0, 0, 0.42)', overflow: 'hidden' }}>
        <div style={{ height: '100%', maxWidth: 520, margin: '0 auto', padding: '18px 14px 12px', display: 'flex', flexDirection: 'column' }}>
          <div style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            minHeight: 56,
            marginBottom: 8,
            padding: '12px 14px',
            background: 'rgba(255,255,255,0.94)',
            border: '1px solid rgba(120,180,60,0.22)',
            borderRadius: 16,
            backdropFilter: 'blur(12px)',
          }}>
            <button onClick={() => setScreenView('map')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px 10px', color: '#5a7a40', flexShrink: 0, position: 'relative', zIndex: 2 }}>
              <ChevronLeft size={22} />
            </button>
            <div style={{ position: 'absolute', left: 0, right: 0, textAlign: 'center', pointerEvents: 'none', zIndex: 0 }}>
              <div style={{ fontFamily: 'GmarketSans, sans-serif', fontSize: 19, fontWeight: 600, color: '#7a3f16' }}>{selectedArea.name}</div>
              <div style={{ fontFamily: 'GmarketSans, sans-serif', fontSize: 13, fontWeight: 800, color: '#9bd65c', marginTop: 1 }}>{selectedTown?.groupName}</div>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3, flexShrink: 0, zIndex: 1 }}>
              <span style={{ fontFamily: 'GmarketSans, sans-serif', fontSize: 11, fontWeight: 700, color: '#4a9a08', background: 'rgba(74,154,8,0.13)', borderRadius: 20, padding: '2px 8px' }}>
                Lv.{activeLevel.min}-{activeLevel.max}
              </span>
              {activeRate !== undefined && (
                <span style={{ fontFamily: 'GmarketSans, sans-serif', fontSize: 11, fontWeight: 700, color: '#5a7a40', background: 'rgba(255,255,255,0.85)', borderRadius: 20, padding: '2px 8px', border: '1px solid rgba(120,180,60,0.22)' }}>
                  {activeRate < 1 ? Math.round(activeRate * 100) : activeRate}%
                </span>
              )}
            </div>
          </div>

          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '14px 0 0' }}>
            {places.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontFamily: 'GmarketSans, sans-serif', fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.75)', marginBottom: 8 }}>장소 선택</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {places.map(place => {
                    const active = selectedPlace?.id === place.id;
                    return (
                      <button
                        key={place.id}
                        onClick={() => setSelectedPlace(place)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          padding: '11px 14px',
                          background: active ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.70)',
                          border: `1.5px solid ${active ? accentColor : 'rgba(255,255,255,0.4)'}`,
                          borderRadius: 12,
                          cursor: 'pointer',
                          textAlign: 'left',
                          boxShadow: active ? '0 2px 12px rgba(74,154,8,0.25)' : 'none',
                        }}
                      >
                        <span style={{ color: active ? accentColor : '#5a7a40' }}>
                          {place.isCave ? <Mountain size={14} /> : place.isWaterside ? <Waves size={14} /> : <Trees size={14} />}
                        </span>
                        <span style={{ flex: 1, fontFamily: 'GmarketSans, sans-serif', fontSize: 14, fontWeight: 700, color: '#1a2e10' }}>{place.name}</span>
                        <span style={{ fontFamily: 'GmarketSans, sans-serif', fontSize: 11, color: '#5a7a40' }}>
                          Lv.{place.minLevel ?? selectedArea.minLevel ?? 1}-{place.maxLevel ?? selectedArea.maxLevel ?? 20}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <button onClick={handleExplore} style={{
              width: '100%',
              padding: 0,
              borderRadius: 18,
              marginBottom: 18,
              background: 'transparent',
              color: '#fff',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.35))',
            }}>
              <img src={searchGoImg} alt={selectedPlace ? `${selectedPlace.name} 탐험하기` : '탐험하기'} style={{ width: 150, maxWidth: '58%', display: 'block' }} />
            </button>

            <div style={{ fontFamily: 'GmarketSans, sans-serif', fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.75)', marginBottom: 10 }}>
              등장 포켓몬 <span style={{ color: 'rgba(180,230,100,0.9)' }}>{areaPokemon.length}</span>
            </div>

            {areaPokemon.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>
                등록된 포켓몬이 없습니다
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6 }}>
                {areaPokemon.map(p => {
                  const caught = caughtNumbers.has(Number(p.number));
                  const known = caught || isPokemonUnlocked(p);
                  const iconUrl = known ? getPokemonLocalIconUrl({ ...p, nameEn: p.nameEn || p.name || 'UNKNOWN' }) : null;
                  return (
                    <div key={p.id || p.number} style={{
                      background: caught ? 'rgba(220,245,195,0.95)' : 'rgba(255,255,255,0.90)',
                      border: `1.5px solid ${caught ? 'rgba(74,154,8,0.30)' : 'rgba(255,255,255,0.5)'}`,
                      borderRadius: 12,
                      padding: '10px 4px 8px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 4,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
                    }}>
                      <div style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {iconUrl ? (
                          <div style={{ width: 44, height: 44, backgroundImage: `url(${iconUrl})`, backgroundSize: '88px 44px', backgroundPosition: 'left center', backgroundRepeat: 'no-repeat', imageRendering: 'pixelated' }} />
                        ) : (
                          <span style={{ fontSize: 20, color: 'rgba(0,0,0,0.15)' }}>?</span>
                        )}
                      </div>
                      <div style={{ fontFamily: 'GmarketSans, sans-serif', fontSize: 10, fontWeight: 700, color: known ? '#1a2e10' : '#bbb', textAlign: 'center', lineHeight: 1.3 }}>
                        {known ? p.name : '???'}
                      </div>
                      {caught && (
                        <div style={{ fontFamily: 'GmarketSans, sans-serif', fontSize: 9, color: '#fff', fontWeight: 700, background: '#4a9a08', borderRadius: 8, padding: '1px 6px' }}>포획</div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      className="map-view-root w-full flex items-start justify-center"
      style={{ marginTop: -50, overflow: 'hidden' }}
    >
      <div
        className="relative w-full"
        style={{ maxWidth: 1032, width: 'min(100%, 1032px, calc((100vh - 120px) * 1.456))' }}
      >
        <img src={deviceTop} className="w-full" style={{ opacity: 0, pointerEvents: 'none', display: 'block' }} alt="" />
        <img src={deviceBottom} className="absolute inset-0 w-full h-full pointer-events-none select-none" style={{ zIndex: 1 }} alt="" />

        {/* 스크린 영역 */}
        <div
          ref={screenRef}
          className="absolute overflow-hidden"
          onClick={() => { if (!isDragging) setOpenTownRegionsId(null); }}
          onMouseDown={handleMapMouseDown}
          onMouseMove={handleMapMouseMove}
          onMouseUp={handleMapMouseUp}
          onMouseLeave={handleMapMouseUp}
          style={{ zIndex: 2, left: SCREEN.left, top: SCREEN.top, right: SCREEN.right, bottom: SCREEN.bottom, cursor: isDragging ? 'grabbing' : 'grab' }}
        >

          {/* 항상 깔려있는 검은 배경 */}
          <div style={{ position: 'absolute', inset: 0, background: '#000' }} />

          {/* 레트로 TV 켜짐 효과 — 항상 최상위 */}
          {tvPhase === 0 && (
            <div style={{ position: 'absolute', inset: 0, zIndex: 100, background: '#000', pointerEvents: 'none' }} />
          )}
          {tvPhase === 1 && (
            <div style={{
              position: 'absolute', inset: 0, zIndex: 100,
              animation: 'retroTvOn 0.9s ease-out forwards',
              transformOrigin: 'center',
              pointerEvents: 'none',
            }} />
          )}

          {/* 맵 콘텐츠 래퍼 — TV reveal */}
          <div className="absolute inset-0" style={{
            transformOrigin: 'center',
            opacity: tvPhase < 2 ? 0 : 1,
            animation: tvPhase === 2 ? 'retroTvReveal 0.18s ease-out both' : undefined,
          }}>
            {/* 맵 배경 */}
            <div className="absolute inset-0" style={getViewportBgStyle(viewport)} />

          {/* 방향 화살표 */}
          {screenView === 'map' && <>
            <ArrowBtn dir="up" />
            <ArrowBtn dir="down" />
            <ArrowBtn dir="left" />
            <ArrowBtn dir="right" />
          </>}

          {/* 네비게이션 — 상단 */}
          {/* 마을 핀 */}
          {screenView !== 'detail' && towns.map(town => {
            const coords = toViewportCoords(town.x, town.y, viewport);
            if (coords.x < -8 || coords.x > 108 || coords.y < -8 || coords.y > 108) return null;
            const isHidden = town.groupVisible === false;
            const isActive = town.groupId === selectedTownId;
            const isNewTown = !visitedTownIds.has(town.groupId);
            const townRegions = regions
              .filter(region => region.groupId === town.groupId && !region.isTownMeta && region.groupVisible !== false)
              .slice(0, 4);
            const visibleTownRegions = townRegions;
            return (
              <div key={town.groupId} onClick={(event) => {
                event.stopPropagation();
                if (isHidden || isDragging) return;
                playClickSound();
                handlePinClick(town.groupId);
              }}
                role={isHidden ? undefined : 'button'}
                tabIndex={isHidden ? -1 : 0}
                onKeyDown={(event) => {
                  if (isHidden) return;
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.stopPropagation();
                    handlePinClick(town.groupId);
                  }
                }}
                className="absolute flex flex-col items-center gap-0.5 hover:scale-110 transition-transform"
                style={{ left: `${coords.x}%`, top: `${coords.y}%`, transform: 'translate(-50%, -100%)', zIndex: 10, opacity: isActive ? 1 : 0.85, cursor: isHidden ? 'default' : 'pointer', width: 'max-content' }}>
                <div className="relative flex items-center justify-center" style={{ height: 77, width: 'auto' }}>
                  <img src={mapNameImg} alt="" style={{ height: 77, width: 'auto', display: 'block', filter: `${isActive ? `drop-shadow(0 0 3px ${town.color}) ` : ''}drop-shadow(5px 5px 1px rgba(43, 16, 2, 0.55))` }} />
                  <span className="absolute inset-0 flex items-center justify-center whitespace-nowrap" style={{ fontFamily: "'GmarketSans', sans-serif", fontWeight: 700, fontSize: 24, lineHeight: 1, color: '#373a33', imageRendering: 'auto', letterSpacing: 0, fontSynthesis: 'none' }}>
                    <span style={{ position: 'relative', left: -2, top: 3 }}>
                      {town.groupName}
                    </span>
                  </span>
                  {isNewTown && (
                    <span
                      aria-hidden="true"
                      className="absolute rounded-full"
                      style={{
                        top: 19,
                        right: 18,
                        width: 8,
                        height: 8,
                        background: '#ef5e5e',
                      }}
                    />
                  )}
                  {openTownRegionsId === town.groupId && visibleTownRegions.map((region, index) => (
                    <button
                      key={region.id}
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        playClickSound();
                        handleSelectArea(region);
                      }}
                      style={{
                        position: 'absolute',
                        ...regionPillPositions[index],
                        padding: '5px 16px',
                        boxSizing: 'border-box',
                        border: 'none',
                        borderRadius: 999,
                        background: '#252624',
                        color: '#fff',
                        fontFamily: 'GmarketSans, sans-serif',
                        fontSize: 20,
                        fontWeight: 800,
                        lineHeight: '20px',
                        fontSynthesis: 'none',
                        letterSpacing: 0,
                        whiteSpace: 'normal',
                        textAlign: 'center',
                        cursor: 'pointer',
                        zIndex: 12,
                        animation: `pillPop 0.18s ease-out both`,
                      }}
                    >
                      <span style={{ position: 'relative', top: index === 0 ? 1 : 3, display: 'inline-block', transform: 'scaleX(0.9)', transformOrigin: 'center' }}>
                        {wrapPillText(region.name).map((line, li, arr) => (
                          <span key={li} style={{ display: 'block' }}>{line}</span>
                        ))}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}

          {/* 하단 구역 보기 버튼 */}
          {false && selectedTown && screenView === 'map' && selectedTownRegions.length > 0 && (
            <div className="absolute bottom-0 left-0 right-0 flex items-center justify-end px-3 py-2"
              style={{ zIndex: 25, background: 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 100%)' }}>
              <button onClick={() => setScreenView('areas')}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full text-white text-xs font-bold"
                style={{ background: selectedTown.color, boxShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>
                <Footprints size={12} />구역 보기
              </button>
            </div>
          )}

          {false && screenView === 'areas' && <TownAreasPanel />}
          {screenView === 'detail' && <DeviceMobileDetailPanel />}
          </div>{/* 맵 콘텐츠 래퍼 끝 */}
        </div>

        <img src={deviceTop} className="absolute inset-0 w-full h-full pointer-events-none select-none" style={{ zIndex: 3 }} alt="" />
      </div>
    </div>
  );
}
