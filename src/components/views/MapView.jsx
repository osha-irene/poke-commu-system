import React, { useState, useEffect } from 'react';
import { MapPin, Map as MapIcon, Building2 } from 'lucide-react';

export default function MapView({ regions, onRegionClick }) {
  const [viewMode, setViewMode] = useState('default');
  const [selectedTown, setSelectedTown] = useState(null);

  useEffect(() => {
    const defaultTown = regions.find(r => r.groupId && r.isDefaultTown === true);
    if (defaultTown) {
      setSelectedTown(defaultTown.groupId);
    }
  }, [regions]);

  const visibleRegions = (() => {
    if (viewMode === 'all') {
      // 전체 보기: 마을에 속한 모든 구역 표시 (마을 메타 제외, 미분류 제외)
      return regions.filter(r => !r.isTownMeta && r.groupId);
    } else {
      // 기본 보기: 선택된 마을의 구역만 표시
      if (selectedTown) {
        return regions.filter(r => 
          r.groupId === selectedTown && 
          !r.isTownMeta &&
          r.groupVisible !== false
        );
      }
      // 선택된 마을 없으면 마을에 속한 모든 구역
      return regions.filter(r => !r.isTownMeta && r.groupId);
    }
  })();

  const towns = (() => {
    const townMap = new Map();
    regions.forEach(region => {
      if (region.groupId && region.groupName && !region.isTownMeta) {
        if (!townMap.has(region.groupId)) {
          townMap.set(region.groupId, {
            groupId: region.groupId,
            groupName: region.groupName,
            isDefaultTown: region.isDefaultTown || false,
            color: region.color
          });
        }
      }
    });
    return Array.from(townMap.values());
  })();

  const currentTown = towns.find(t => t.groupId === selectedTown);

  return (
    <div className="w-full h-full flex items-center justify-center">
      <div className="w-full max-w-7xl">
        <div className="bg-white rounded-lg border border-gray-200 p-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold text-gray-800 mb-2">
                탐험할 구역을 선택하세요
              </h3>
              <p className="text-gray-600 flex items-center gap-2">
                {currentTown && viewMode === 'default' && (
                  <>
                    <Building2 size={16} />
                    <span className="font-semibold" style={{ color: currentTown.color }}>
                      {currentTown.groupName}
                    </span>
                    {currentTown.isDefaultTown && (
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                        기본 마을
                      </span>
                    )}
                  </>
                )}
                {viewMode === 'all' && '모든 구역 표시 중'}
              </p>
            </div>
            
            <div className="flex gap-2 items-center">
              {towns.length > 0 && viewMode === 'default' && (
                <select
                  value={selectedTown || ''}
                  onChange={(e) => setSelectedTown(e.target.value)}
                  className="px-4 py-2 border-2 border-gray-300 rounded-lg font-semibold focus:border-purple-500 focus:outline-none"
                >
                  {towns.map(town => (
                    <option key={town.groupId} value={town.groupId}>
                      {town.groupName} {town.isDefaultTown ? '⭐' : ''}
                    </option>
                  ))}
                </select>
              )}

              <button
                onClick={() => {
                  if (viewMode === 'all') {
                    setViewMode('default');
                    const defaultTown = regions.find(r => r.groupId && r.isDefaultTown === true);
                    if (defaultTown) {
                      setSelectedTown(defaultTown.groupId);
                    }
                  } else {
                    setViewMode('all');
                  }
                }}
                className={`px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2 ${
                  viewMode === 'all'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <MapIcon size={18} />
                {viewMode === 'all' ? '마을 보기' : '전체 보기'}
              </button>
            </div>
          </div>
          
          <div 
            className="relative bg-green-100 rounded-lg border-2 border-gray-300" 
            style={{ 
              height: '70vh', 
              minHeight: '500px',
              backgroundImage: 'url("/images/regions/map-background.jpg")',
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}
          >
            {visibleRegions.length === 0 ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <MapPin size={48} className="mx-auto mb-4 text-gray-300" />
                  <p className="font-semibold">탐험 가능한 구역이 없습니다</p>
                </div>
              </div>
            ) : (
              visibleRegions.map(region => (
                <button
                  key={region.id}
                  onClick={() => onRegionClick(region)}
                  className="absolute hover:opacity-90 active:scale-95 transition-all 
                           rounded-lg px-4 py-2 flex items-center justify-center 
                           text-white font-bold border-2 border-white shadow-lg 
                           overflow-hidden group"
                  style={{ 
                    left: `${region.x}%`, 
                    top: `${region.y}%`, 
                    transform: 'translate(-50%, -50%)',
                    backgroundColor: region.color || '#10b981',
                    minWidth: '100px'
                  }}
                >
                  <div className="relative z-10 text-center">
                    <span className="text-sm">
                      {region.areaName || region.name}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>

          <div className="mt-4 text-sm text-gray-600 text-center">
            표시 중: {visibleRegions.length}개 구역
            {viewMode === 'default' && currentTown && (
              <span className="ml-2">
                ({currentTown.groupName})
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}