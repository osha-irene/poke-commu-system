// 관리자용 지도 핀 배치 에디터
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { ref, get, set } from 'firebase/database';
import { database } from '../../../firebase';
import { MapPin, Save, EyeOff, Move } from 'lucide-react';
import mapImage from '../../../assets/map/map.png';

// device-map.png 흰색 픽셀 영역 비율 (PowerShell 측정: 909×655 px)
const SCREEN_RATIO = 909 / 655; // ≈ 1.3878

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

// 컨테이너 크기를 반영해 h를 고정 스크린 비율로 환산
// box CSS ratio: (w/100 × cW) / (h/100 × cH) = SCREEN_RATIO
// → h = w × cW / (SCREEN_RATIO × cH)
function lockedH(w, containerRect) {
  if (!containerRect) return w / SCREEN_RATIO;
  return w * containerRect.width / (SCREEN_RATIO * containerRect.height);
}

// 초기 뷰포트: 중앙 배치, h는 비율로 계산 (컨테이너 정보 없을 때 근사치)
const DEFAULT_VIEWPORT = (() => {
  const w = 60;
  const h = w / SCREEN_RATIO; // ≈ 43.2% (실제 컨테이너 크기로 보정됨)
  return { x: (100 - w) / 2, y: (100 - h) / 2, w, h };
})();

export default function MapEditorPanel({ regions, onUpdateTown }) {
  const mapRef = useRef(null);

  // Town pin positions
  const [pendingPositions, setPendingPositions] = useState({});
  const [selectedTownId, setSelectedTownId] = useState(null);
  const [draggingId, setDraggingId] = useState(null);

  // Viewport box: { x, y, w, h } as % of full map
  const [viewport, setViewport] = useState(DEFAULT_VIEWPORT);
  // What part of the viewport is being dragged: 'move' | 'nw'|'ne'|'sw'|'se'|null
  const [vpDrag, setVpDrag] = useState(null);
  const vpDragStart = useRef(null); // { mouseX%, mouseY%, vpSnapshot }

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Load viewport from Firebase, then re-lock aspect ratio with actual container size
  useEffect(() => {
    get(ref(database, 'gameData/config/mapViewport')).then(snap => {
      if (!snap.exists()) return;
      const saved = snap.val();
      // Wait one frame for mapRef to have dimensions
      requestAnimationFrame(() => {
        const rect = mapRef.current?.getBoundingClientRect() ?? null;
        const h = lockedH(saved.w, rect);
        setViewport({ ...saved, h });
      });
    });
  }, []);

  // Derive towns from isTownMeta records
  const towns = useMemo(() => {
    return regions
      .filter(r => r.isTownMeta && r.groupId)
      .map(r => ({
        groupId: r.groupId,
        groupName: r.groupName || r.groupId,
        color: r.color || '#10b981',
        isDefaultTown: r.isDefaultTown || false,
        groupVisible: r.groupVisible !== false,
        x: r.x ?? 50,
        y: r.y ?? 50,
      }));
  }, [regions]);

  // Init pending positions
  useEffect(() => {
    setPendingPositions(prev => {
      const next = { ...prev };
      towns.forEach(t => { if (!(t.groupId in next)) next[t.groupId] = { x: t.x, y: t.y }; });
      return next;
    });
  }, [towns]);

  // Convert mouse event to map %
  const getMapPercent = (e) => {
    const rect = mapRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return {
      x: Math.round(clamp(((e.clientX - rect.left) / rect.width) * 100, 0, 100) * 10) / 10,
      y: Math.round(clamp(((e.clientY - rect.top) / rect.height) * 100, 0, 100) * 10) / 10,
    };
  };

  // ── Map click (place pin) ──
  const handleMapClick = (e) => {
    if (draggingId || vpDrag || !selectedTownId) return;
    const pos = getMapPercent(e);
    if (!pos) return;
    setPendingPositions(prev => ({ ...prev, [selectedTownId]: pos }));
    setSaved(false);
  };

  // ── Pin drag ──
  const handlePinMouseDown = (e, townId) => {
    e.stopPropagation();
    e.preventDefault();
    setSelectedTownId(townId);
    setDraggingId(townId);
    setSaved(false);
  };

  // ── Viewport box drag ──
  const handleVpMouseDown = (e, handle) => {
    e.stopPropagation();
    e.preventDefault();
    setVpDrag(handle);
    const pos = getMapPercent(e);
    vpDragStart.current = { ...pos, vpSnapshot: { ...viewport } };
    setSaved(false);
  };

  // ── Mouse move (pins + viewport) ──
  const handleMouseMove = useCallback((e) => {
    const pos = getMapPercent(e);
    if (!pos) return;

    if (draggingId) {
      setPendingPositions(prev => ({ ...prev, [draggingId]: pos }));
      return;
    }

    if (vpDrag && vpDragStart.current) {
      const { x: startX, y: startY, vpSnapshot: vp } = vpDragStart.current;
      const dx = pos.x - startX;
      const dy = pos.y - startY;
      const MIN_W = 5;
      const rect = mapRef.current?.getBoundingClientRect() ?? null;

      setViewport(() => {
        if (vpDrag === 'move') {
          const h = lockedH(vp.w, rect);
          return {
            w: vp.w, h,
            x: clamp(vp.x + dx, 0, 100 - vp.w),
            y: clamp(vp.y + dy, 0, 100 - h),
          };
        }

        // Resize: w is primary, h is derived from aspect ratio
        let { x, y, w } = vp;

        if (vpDrag === 'se') {
          w = clamp(vp.w + dx, MIN_W, 100 - vp.x);
        } else if (vpDrag === 'sw') {
          w = clamp(vp.w - dx, MIN_W, vp.x + vp.w);
          x = vp.x + vp.w - w;
        } else if (vpDrag === 'ne') {
          w = clamp(vp.w + dx, MIN_W, 100 - vp.x);
        } else if (vpDrag === 'nw') {
          w = clamp(vp.w - dx, MIN_W, vp.x + vp.w);
          x = vp.x + vp.w - w;
        }

        const h = lockedH(w, rect);

        // For north handles: keep bottom edge fixed
        if (vpDrag === 'ne' || vpDrag === 'nw') {
          y = vp.y + vp.h - h;
        }

        return {
          x: Math.round(clamp(x, 0, 100 - w) * 10) / 10,
          y: Math.round(clamp(y, 0, 100 - h) * 10) / 10,
          w: Math.round(w * 10) / 10,
          h: Math.round(h * 10) / 10,
        };
      });
    }
  }, [draggingId, vpDrag]);

  const handleMouseUp = () => {
    setDraggingId(null);
    setVpDrag(null);
    vpDragStart.current = null;
  };

  // ── Save ──
  const handleSave = async () => {
    setSaving(true);
    try {
      for (const town of towns) {
        const pos = pendingPositions[town.groupId];
        if (!pos) continue;
        if (Math.abs(pos.x - town.x) > 0.05 || Math.abs(pos.y - town.y) > 0.05) {
          await onUpdateTown(town.groupId, {
            groupName: town.groupName,
            x: pos.x,
            y: pos.y,
            color: town.color,
            isDefaultTown: town.isDefaultTown,
            visible: town.groupVisible,
          });
        }
      }
      await set(ref(database, 'gameData/config/mapViewport'), viewport);
      setSaved(true);
    } catch (err) {
      console.error('맵 저장 실패:', err);
      alert('저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const selectedTown = towns.find(t => t.groupId === selectedTownId);

  // Corner handle style (aspect-ratio locked → show resize cursor generically)
  const cornerHandle = (pos, handle) => ({
    position: 'absolute',
    ...pos,
    width: 10,
    height: 10,
    background: '#fff',
    border: '2px solid #3b82f6',
    borderRadius: 2,
    transform: 'translate(-50%, -50%)',
    cursor: `${handle}-resize`,
    zIndex: 40,
  });

  // Sidebar: show effective aspect ratio info
  const displayRatio = viewport.w > 0 && viewport.h > 0
    ? `${(viewport.w / viewport.h).toFixed(2)} : 1`
    : '-';

  return (
    <div
      className="flex gap-4"
      style={{ height: 'calc(100vh - 180px)', minHeight: 500 }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* ── Left sidebar ── */}
      <div className="w-56 flex-shrink-0 flex flex-col gap-3 overflow-hidden">

        {/* Viewport info */}
        <div className="bg-white rounded-lg border p-3">
          <p className="text-xs font-bold text-gray-600 mb-2 flex items-center gap-1">
            <Move size={12} /> 맵 뷰 영역 (흰 박스)
          </p>
          <div className="grid grid-cols-2 gap-1 text-xs text-gray-500 font-mono">
            <span>x: {viewport.x.toFixed(1)}%</span>
            <span>y: {viewport.y.toFixed(1)}%</span>
            <span>w: {viewport.w.toFixed(1)}%</span>
            <span>h: {viewport.h.toFixed(1)}%</span>
          </div>
          <div className="text-[10px] text-gray-400 mt-2 flex items-center justify-between">
            <span>박스 드래그 이동 / 모서리 크기 조절</span>
            <span className="font-mono text-blue-500">{displayRatio}</span>
          </div>
        </div>

        {/* Town list */}
        <div className="bg-white rounded-lg border p-3 flex-1 overflow-y-auto">
          <p className="text-xs font-bold text-gray-600 mb-1">마을 목록</p>
          <p className="text-xs text-gray-400 mb-3">선택 후 클릭 또는 핀 드래그</p>

          {towns.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-4">등록된 마을 없음</p>
          )}
          <div className="flex flex-col gap-1.5">
            {towns.map(town => {
              const pos = pendingPositions[town.groupId] || { x: town.x, y: town.y };
              const isActive = town.groupId === selectedTownId;
              return (
                <button
                  key={town.groupId}
                  onClick={() => setSelectedTownId(isActive ? null : town.groupId)}
                  className={`text-left p-2.5 rounded-lg border-2 transition-all text-xs ${
                    isActive ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: town.color }} />
                    <span className="font-semibold text-gray-800 truncate">{town.groupName}</span>
                    {town.isDefaultTown && <span className="ml-auto text-yellow-600 text-[10px] font-bold shrink-0">기본</span>}
                    {!town.groupVisible && <EyeOff size={11} className="ml-auto text-gray-400 shrink-0" />}
                  </div>
                  <div className="text-gray-400 mt-1 font-mono">
                    x {pos.x.toFixed(1)} / y {pos.y.toFixed(1)}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className={`w-full py-2.5 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50 ${
            saved ? 'bg-green-500 text-white' : 'bg-green-600 hover:bg-green-700 text-white'
          }`}
        >
          <Save size={16} />
          {saving ? '저장 중...' : saved ? '저장 완료!' : '위치 저장'}
        </button>
      </div>

      {/* ── Map canvas ── */}
      <div className="flex-1 min-w-0 flex flex-col gap-2">
        {selectedTown && (
          <div className="flex items-center gap-2 text-sm bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 flex-shrink-0">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: selectedTown.color }} />
            <span className="font-semibold text-blue-800">{selectedTown.groupName}</span>
            <span className="text-blue-500 text-xs">클릭 또는 핀 드래그로 위치 지정</span>
            <button onClick={() => setSelectedTownId(null)} className="ml-auto text-blue-400 hover:text-blue-700 text-xs font-semibold">해제</button>
          </div>
        )}

        <div
          ref={mapRef}
          className="flex-1 relative rounded-lg border-2 border-gray-300 overflow-hidden select-none"
          style={{
            backgroundImage: `url("${mapImage}")`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundColor: '#d1fae5',
            cursor: selectedTownId ? 'crosshair' : 'default',
          }}
          onClick={handleMapClick}
        >
          {/* ── Viewport box ── */}
          {/* Dark overlay outside viewport */}
          <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 20 }}>
            {/* top strip */}
            <div className="absolute bg-black/30" style={{ left: 0, right: 0, top: 0, height: `${viewport.y}%` }} />
            {/* bottom strip */}
            <div className="absolute bg-black/30" style={{ left: 0, right: 0, top: `${viewport.y + viewport.h}%`, bottom: 0 }} />
            {/* left strip */}
            <div className="absolute bg-black/30" style={{ left: 0, top: `${viewport.y}%`, width: `${viewport.x}%`, height: `${viewport.h}%` }} />
            {/* right strip */}
            <div className="absolute bg-black/30" style={{ left: `${viewport.x + viewport.w}%`, top: `${viewport.y}%`, right: 0, height: `${viewport.h}%` }} />
          </div>

          {/* Viewport border + drag handle */}
          <div
            className="absolute"
            style={{
              left: `${viewport.x}%`,
              top: `${viewport.y}%`,
              width: `${viewport.w}%`,
              height: `${viewport.h}%`,
              border: '2px solid rgba(255,255,255,0.9)',
              boxShadow: '0 0 0 1px rgba(59,130,246,0.6)',
              zIndex: 25,
              cursor: 'move',
            }}
            onMouseDown={e => handleVpMouseDown(e, 'move')}
          >
            {/* Label */}
            <div className="absolute top-1 left-1 bg-white/90 text-blue-700 text-[10px] font-bold px-1.5 py-0.5 rounded pointer-events-none select-none">
              맵 뷰 영역
            </div>

            {/* Corner resize handles */}
            <div style={cornerHandle({ top: 0, left: 0 }, 'nw')} onMouseDown={e => handleVpMouseDown(e, 'nw')} />
            <div style={cornerHandle({ top: 0, right: 0 }, 'ne')} onMouseDown={e => handleVpMouseDown(e, 'ne')} />
            <div style={cornerHandle({ bottom: 0, left: 0 }, 'sw')} onMouseDown={e => handleVpMouseDown(e, 'sw')} />
            <div style={cornerHandle({ bottom: 0, right: 0 }, 'se')} onMouseDown={e => handleVpMouseDown(e, 'se')} />
          </div>

          {/* Town pins */}
          {towns.map(town => {
            const pos = pendingPositions[town.groupId] || { x: town.x, y: town.y };
            const isActive = town.groupId === selectedTownId;
            return (
              <div
                key={town.groupId}
                className={`absolute flex flex-col items-center gap-0.5 ${draggingId === town.groupId ? 'cursor-grabbing' : 'cursor-grab'}`}
                style={{
                  left: `${pos.x}%`,
                  top: `${pos.y}%`,
                  transform: 'translate(-50%, -100%)',
                  zIndex: isActive ? 35 : 30,
                }}
                onMouseDown={e => handlePinMouseDown(e, town.groupId)}
              >
                <span
                  className={`px-2 py-0.5 rounded text-xs font-bold shadow-md border-2 whitespace-nowrap ${
                    isActive ? 'border-blue-400 ring-2 ring-blue-300 scale-110' : 'border-transparent opacity-90'
                  } ${!town.groupVisible ? 'opacity-40' : ''}`}
                  style={{ backgroundColor: town.color, color: '#fff' }}
                >
                  {town.groupName}
                </span>
                <MapPin
                  size={isActive ? 24 : 18}
                  fill={town.color}
                  color={isActive ? '#3b82f6' : town.color}
                  className={`drop-shadow ${!town.groupVisible ? 'opacity-40' : ''}`}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
