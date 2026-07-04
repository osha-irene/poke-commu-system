import React, { useState } from 'react';
import { ChevronDown, ChevronRight, ChevronLeft, MapPin, Footprints, Trees, Mountain, Waves } from 'lucide-react';
import { getPokemonLocalIconUrl } from '../../../utils/pokemonIconUtils';

const P = {
  bg:      'rgba(255,255,255,0.92)',
  border:  'rgba(120,180,60,0.22)',
  accent:  '#4a9a08',
  accentBg:'rgba(74,154,8,0.13)',
  text:    '#1a2e10',
  muted:   '#5a7a40',
};

const TAP = { WebkitTapHighlightColor: 'transparent', outline: 'none' };

function hexToRgb(hex) {
  if (!hex || !hex.startsWith('#')) return '74,154,8';
  return [parseInt(hex.slice(1,3),16), parseInt(hex.slice(3,5),16), parseInt(hex.slice(5,7),16)].join(',');
}

function PlaceIcon({ place }) {
  if (place.isCave)      return <Mountain size={14} />;
  if (place.isWaterside) return <Waves size={14} />;
  return <Trees size={14} />;
}

export default function MobileMapView({
  regions = [],
  onRegionClick,
  onBack,
  gamePokedex = [],
  allPokemonMaster = [],
  pokedexData = {},
  caughtPokemon = [],
}) {
  const [expandedTown, setExpandedTown] = useState(null);
  const [selectedArea, setSelectedArea]  = useState(null);
  const [selectedPlace, setSelectedPlace] = useState(null);

  const towns = (() => {
    const map = new Map();
    regions.forEach(r => {
      if (!r.groupId || !r.groupName || r.isTownMeta) return;
      if (!map.has(r.groupId)) {
        map.set(r.groupId, {
          groupId: r.groupId,
          groupName: r.groupName,
          color: r.color,
          visible: r.groupVisible !== false,
          isDefaultTown: r.isDefaultTown || false,
          townOrder: Number.isFinite(Number(r.townOrder)) ? Number(r.townOrder) : map.size,
          areas: []
        });
      }
      if (!r.isTownMeta && r.groupVisible !== false) {
        map.get(r.groupId).areas.push(r);
      }
    });
    const orderedTowns = Array.from(map.values()).sort((a, b) => a.townOrder - b.townOrder);
    const defaultTownIndex = orderedTowns.findIndex(town => town.isDefaultTown);
    const boundaryIndex = defaultTownIndex >= 0 ? defaultTownIndex : 0;

    return orderedTowns.filter((town, index) => town.visible || index < boundaryIndex);
  })();

  const caughtNumbers = new Set(caughtPokemon.flatMap(p => p ? [String(p.number), String(p.originalNumber)] : []));
  const seenNumbers   = new Set(Object.keys(pokedexData || {}));

  const getPokemon = (ids, allowNational) => {
    const pool = allowNational ? allPokemonMaster : gamePokedex;
    return pool.filter(p => ids.includes(p.id) || ids.includes(p.number));
  };

  const getDisplayPokemon = (area, place) => {
    if (place) {
      const placeIds = Array.isArray(place.pokemons) ? place.pokemons : [];
      if (placeIds.length > 0) return getPokemon(placeIds, area.allowNationalPokedex);
    }
    return getPokemon(area.pokemons || [], area.allowNationalPokedex);
  };

  const splitName = (name = '') => {
    const m = name.match(/^(.+?)(\(.+?\))$/);
    if (m) return { main: m[1].trim(), sub: m[2] };
    return { main: name, sub: null };
  };

  const handleSelectArea = (area) => {
    setSelectedArea(area);
    const places = Array.isArray(area.places) ? area.places.filter(p => p?.name && p.visible !== false) : [];
    setSelectedPlace(places.length > 0 ? places[0] : null);
  };

  const handleBack = () => {
    setSelectedArea(null);
    setSelectedPlace(null);
  };

  const handleExplore = () => {
    if (!onRegionClick) return;
    if (selectedPlace) {
      onRegionClick({
        ...selectedArea,
        placeName:    selectedPlace.name,
        encounterRate: selectedPlace.encounterRate ?? selectedArea.encounterRate,
        minLevel:     selectedPlace.minLevel ?? selectedArea.minLevel,
        maxLevel:     selectedPlace.maxLevel ?? selectedArea.maxLevel,
      });
    } else {
      onRegionClick(selectedArea);
    }
  };

  /* ── 지역 상세 패널 ── */
  if (selectedArea) {
    const places      = Array.isArray(selectedArea.places) ? selectedArea.places.filter(p => p?.name && p.visible !== false) : [];
    const areaPokemon = getDisplayPokemon(selectedArea, selectedPlace);
    const accentColor = selectedArea.color || P.accent;
    const activeLevel = selectedPlace
      ? { min: selectedPlace.minLevel ?? selectedArea.minLevel ?? 1, max: selectedPlace.maxLevel ?? selectedArea.maxLevel ?? 20 }
      : { min: selectedArea.minLevel ?? 1, max: selectedArea.maxLevel ?? 20 };
    const activeRate  = selectedPlace
      ? (selectedPlace.encounterRate ?? selectedArea.encounterRate)
      : selectedArea.encounterRate;

    return (
      <div style={{ minHeight: '100vh', maxWidth: 520, margin: '0 auto' }}>
        {/* 헤더 */}
        <div style={{
          position: 'sticky', top: 0, zIndex: 10,
          display: 'flex', alignItems: 'center',
          padding: '12px 14px',
          background: 'rgba(255,255,255,0.94)',
          border: `1px solid ${P.border}`,
          borderRadius: window.innerWidth >= 901 ? 16 : 0,
          backdropFilter: 'blur(12px)',
          minHeight: 56,
          marginBottom: 8,
        }}>
          <button onClick={handleBack} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px 10px', color: P.muted, flexShrink: 0, position: 'relative', zIndex: 2, ...TAP }}>
            <ChevronLeft size={22} />
          </button>
          <div style={{ position: 'absolute', left: 0, right: 0, textAlign: 'center', pointerEvents: 'none', zIndex: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: P.text }}>{selectedArea.name}</div>
            <div style={{ fontSize: 11, color: P.muted, marginTop: 1 }}>{selectedArea.groupName}</div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3, flexShrink: 0, zIndex: 1 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: P.accent, background: P.accentBg, borderRadius: 20, padding: '2px 8px' }}>
              Lv.{activeLevel.min}–{activeLevel.max}
            </span>
            {activeRate !== undefined && (
              <span style={{ fontSize: 11, fontWeight: 700, color: P.muted, background: 'rgba(255,255,255,0.85)', borderRadius: 20, padding: '2px 8px', border: `1px solid ${P.border}` }}>
                {activeRate < 1 ? Math.round(activeRate * 100) : activeRate}%
              </span>
            )}
          </div>
        </div>

        <div style={{ padding: '14px 14px 88px' }}>
          {/* 장소 선택 */}
          {places.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.75)', marginBottom: 8 }}>장소 선택</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {places.map(place => {
                  const active = selectedPlace?.id === place.id;
                  return (
                    <button
                      key={place.id}
                      onClick={() => setSelectedPlace(place)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '11px 14px',
                        background: active ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.70)',
                        border: `1.5px solid ${active ? accentColor : 'rgba(255,255,255,0.4)'}`,
                        borderRadius: 12, cursor: 'pointer', textAlign: 'left',
                        boxShadow: active ? `0 2px 12px rgba(${hexToRgb(accentColor)},0.25)` : 'none',
                        ...TAP,
                      }}
                    >
                      <span style={{ color: active ? accentColor : P.muted }}><PlaceIcon place={place} /></span>
                      <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: P.text }}>{place.name}</span>
                      <span style={{ fontSize: 11, color: P.muted }}>
                        Lv.{place.minLevel ?? selectedArea.minLevel ?? 1}–{place.maxLevel ?? selectedArea.maxLevel ?? 20}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 탐험 버튼 */}
          <button
            onClick={handleExplore}
            style={{
              width: '100%', padding: '14px', borderRadius: 14, marginBottom: 18,
              background: '#163501b6',
              color: '#fff',
              border: 'none', fontSize: 15, fontWeight: 800,
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
              ...TAP,
            }}
          >
            <Footprints size={18} />
            {selectedPlace ? `${selectedPlace.name} 탐험하기` : '탐험하기'}
          </button>

          {/* 등장 포켓몬 */}
          <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.75)', marginBottom: 10 }}>
            등장 포켓몬 <span style={{ color: 'rgba(180,230,100,0.9)' }}>{areaPokemon.length}</span>
          </div>

          {areaPokemon.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>
              등록된 포켓몬이 없습니다
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6 }}>
              {areaPokemon.map(p => {
                const num    = String(p.number);
                const caught = caughtNumbers.has(num);
                const known  = caught || seenNumbers.has(num);
                const iconUrl = known ? getPokemonLocalIconUrl({ ...p, nameEn: p.nameEn || p.name || 'UNKNOWN' }) : null;
                const { main, sub } = splitName(known ? p.name : '???');

                return (
                  <div key={p.id || p.number} style={{
                    background: caught ? 'rgba(220,245,195,0.95)' : 'rgba(255,255,255,0.90)',
                    border: `1.5px solid ${caught ? 'rgba(74,154,8,0.30)' : 'rgba(255,255,255,0.5)'}`,
                    borderRadius: 12, padding: '10px 4px 8px',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
                  }}>
                    <div style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {iconUrl ? (
                        <div style={{
                          width: 44, height: 44,
                          backgroundImage: `url(${iconUrl})`,
                          backgroundSize: '88px 44px',
                          backgroundPosition: 'left center',
                          backgroundRepeat: 'no-repeat',
                          imageRendering: 'pixelated',
                        }} />
                      ) : (
                        <span style={{ fontSize: 20, color: 'rgba(0,0,0,0.15)' }}>?</span>
                      )}
                    </div>
                    <div style={{ textAlign: 'center', lineHeight: 1.3 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: known ? P.text : '#bbb' }}>{main}</div>
                      {sub && <div style={{ fontSize: 9, color: P.muted, marginTop: 1 }}>{sub}</div>}
                    </div>
                    {caught && (
                      <div style={{ fontSize: 9, color: '#fff', fontWeight: 700, background: P.accent, borderRadius: 8, padding: '1px 6px' }}>포획</div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ── 마을/구역 목록 ── */
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: window.innerWidth <= 768 ? 'center' : 'flex-start', paddingBottom: 88, maxWidth: 400, margin: '0 auto', width: '88%' }}>
    <div style={{ padding: '14px 14px 0' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {towns.map(town => {
          const isOpen      = expandedTown === town.groupId;
          const isHidden    = town.visible === false;
          const accentColor = town.color || P.accent;

          return (
            <div key={town.groupId} style={{ borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 5px rgba(0,0,0,0.10)' }}>
              <button
                onClick={() => {
                  if (isHidden) return;
                  setExpandedTown(isOpen ? null : town.groupId);
                }}
                disabled={isHidden}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                  padding: '11px 14px',
                  background: isHidden ? 'rgba(255,255,255,0.60)' : (isOpen ? '#1e4a08' : 'rgba(255,255,255,0.95)'),
                  border: `1.5px solid ${isOpen ? '#1e4a08' : 'rgba(0,0,0,0.12)'}`,
                  borderBottom: isOpen ? 'none' : undefined,
                  borderRadius: isOpen ? '12px 12px 0 0' : 12,
                  cursor: isHidden ? 'default' : 'pointer',
                  opacity: isHidden ? 0.58 : 1,
                  textAlign: 'left',
                  ...TAP,
                }}
              >
                <MapPin size={16} style={{ color: isOpen ? '#a8d878' : '#1a2e10', flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: isOpen ? '#fff' : '#1a2e10' }}>{town.groupName}</span>
                <span style={{ fontSize: 11, color: isOpen ? 'rgba(255,255,255,0.6)' : '#3a5a20', marginRight: 2 }}>{town.areas.length}</span>
                {isOpen
                  ? <ChevronDown size={15} style={{ color: 'rgba(255,255,255,0.6)' }} />
                  : <ChevronRight size={15} style={{ color: '#3a5a20' }} />}
              </button>

              {isOpen && (
                <div style={{
                  background: 'rgba(255,255,255,0.95)',
                  border: `1.5px solid ${accentColor}`,
                  borderTop: `1px solid rgba(120,180,60,0.12)`,
                  borderRadius: '0 0 12px 12px',
                }}>
                  {town.areas.map((area, i) => {
                    const places = Array.isArray(area.places) ? area.places.filter(p => p?.name && p.visible !== false) : [];
                    return (
                      <button
                        key={area.id || area.name}
                        onClick={() => handleSelectArea(area)}
                        style={{
                          width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                          padding: '10px 14px',
                          background: 'transparent', border: 'none',
                          borderTop: i > 0 ? `1px solid rgba(120,180,60,0.10)` : 'none',
                          cursor: 'pointer', textAlign: 'left',
                          ...TAP,
                        }}
                      >
                        <div style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0, background: accentColor, opacity: 0.6 }} />
                        <span style={{ fontSize: 13, fontWeight: 600, color: P.text, flex: 1 }}>{area.name}</span>
                        {places.length > 0 && (
                          <span style={{ fontSize: 10, color: P.muted, background: P.accentBg, borderRadius: 10, padding: '1px 6px', marginRight: 4 }}>
                            {places.length}곳
                          </span>
                        )}
                        <ChevronRight size={13} style={{ color: P.muted }} />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {towns.length === 0 && (
          <div style={{ textAlign: 'center', padding: '64px 0', color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>
            탐험 가능한 지역이 없습니다
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
