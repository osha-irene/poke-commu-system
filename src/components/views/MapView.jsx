// src/components/views/MapView.jsx
import React, { useState, useEffect } from 'react';
import { ArrowLeft, MapPin, Package, Percent, TrendingUp, Map as MapIcon, Building2 } from 'lucide-react';

export default function MapView({ regions, onRegionClick }) {
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [viewMode, setViewMode] = useState('areas'); // 'areas' 또는 'towns'

  // 기본 마을이 설정되어 있으면 자동으로 선택
  useEffect(() => {
    if (viewMode === 'towns') {
      // defaultTown이 true인 마을 찾기
      const defaultTown = regions.find(r => r.groupId && r.isDefaultTown === true);
      if (defaultTown && !selectedGroup) {
        setSelectedGroup(defaultTown);
      }
    }
  }, [viewMode, regions]);

  // viewMode에 따라 다르게 필터링
  const visibleRegions = viewMode === 'areas'
    ? regions // 모든 구역 표시
    : regions.filter(r => r.groupId && r.groupVisible !== false); // 숨기지 않은 마을만 표시
  
  // 마을별로 그룹화 (마을 모드용)
  const uniqueGroups = {};
  if (viewMode === 'towns') {
    visibleRegions.forEach(region => {
      if (region.groupId && !uniqueGroups[region.groupId]) {
        uniqueGroups[region.groupId] = region;
      }
    });
  }

  // 구역 선택 화면 (마을 모드에서만 사용)
  if (selectedGroup && viewMode === 'towns') {
    const areas = regions.filter(r => r.groupId === selectedGroup.groupId);
    
    return (
      <div className="w-full h-full flex flex-col">
        <div className="bg-white border-b border-gray-200 p-6">
          <button 
            onClick={() => setSelectedGroup(null)} 
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4"
          >
            <ArrowLeft size={20} />
            <span className="font-semibold">지도로 돌아가기</span>
          </button>
          
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold text-gray-800 mb-2">
                {selectedGroup.groupName}
                {selectedGroup.isDefaultTown && (
                  <span className="ml-3 text-sm bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
                    기본 마을
                  </span>
                )}
              </h2>
              <p className="text-gray-600">탐험할 구역을 선택하세요</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {areas.map(area => (
              <button
                key={area.id}
                onClick={() => onRegionClick(area)}
                className="bg-white border-2 border-gray-200 rounded-lg p-6 hover:border-indigo-400 
                         hover:shadow-lg transition-all text-left group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-800 mb-1 group-hover:text-indigo-600">
                      {area.areaName || area.name}
                    </h3>
                    <p className="text-sm text-gray-500">{area.description || '탐험 가능'}</p>
                  </div>
                  <MapPin size={24} className="text-gray-400 group-hover:text-indigo-600" />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-gray-50 rounded-lg p-2">
                    <div className="text-gray-500 text-xs mb-1 flex items-center gap-1">
                      <Package size={12} />
                      포켓몬
                    </div>
                    <div className="font-bold text-gray-800">
                      {area.pokemons?.length || 0}종
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-2">
                    <div className="text-gray-500 text-xs mb-1 flex items-center gap-1">
                      <Percent size={12} />
                      조우율
                    </div>
                    <div className="font-bold text-gray-800">{area.encounterRate}%</div>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-2">
                    <div className="text-gray-500 text-xs mb-1 flex items-center gap-1">
                      <TrendingUp size={12} />
                      레벨
                    </div>
                    <div className="font-bold text-gray-800">
                      {area.minLevel}~{area.maxLevel}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // 지도 화면
  return (
    <div className="w-full h-full flex items-center justify-center">
      <div className="w-full max-w-7xl">
        <div className="bg-white rounded-lg border border-gray-200 p-8">
          {/* 헤더 & 모드 전환 버튼 */}
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold text-gray-800 mb-2">
                {viewMode === 'areas' ? '탐험할 구역을 선택하세요' : '탐험할 마을을 선택하세요'}
              </h3>
              <p className="text-gray-600">
                {viewMode === 'areas' 
                  ? '지도에서 구역을 직접 클릭하여 탐험을 시작하세요' 
                  : '지도에서 마을을 클릭하면 구역을 선택할 수 있습니다'}
              </p>
            </div>
            
            {/* 모드 전환 버튼 */}
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setViewMode('areas');
                  setSelectedGroup(null);
                }}
                className={`px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2 ${
                  viewMode === 'areas'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <MapIcon size={18} />
                구역 보기
              </button>
              <button
                onClick={() => {
                  setViewMode('towns');
                  setSelectedGroup(null);
                  // 기본 마을이 있으면 자동 선택
                  const defaultTown = regions.find(r => r.groupId && r.isDefaultTown === true);
                  if (defaultTown) {
                    setTimeout(() => setSelectedGroup(defaultTown), 100);
                  }
                }}
                className={`px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2 ${
                  viewMode === 'towns'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <Building2 size={18} />
                마을 보기
              </button>
            </div>
          </div>
          
          {/* 지도 */}
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
            {viewMode === 'areas' ? (
              // 구역 모드: 모든 구역을 직접 표시
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
            ) : (
              // 마을 모드: 마을 마커만 표시
              Object.values(uniqueGroups).map(region => (
                <button
                  key={region.groupId}
                  onClick={() => setSelectedGroup(region)}
                  className={`absolute hover:opacity-90 active:scale-95 transition-all 
                           rounded-lg w-36 h-36 flex items-center justify-center 
                           text-white font-bold border-4 shadow-lg 
                           overflow-hidden group ${
                             region.isDefaultTown ? 'border-yellow-400' : 'border-white'
                           }`}
                  style={{ 
                    left: `${region.x}%`, 
                    top: `${region.y}%`, 
                    transform: 'translate(-50%, -50%)',
                    backgroundColor: region.color || '#10b981'
                  }}
                >
                  {region.imageUrl && (
                    <div 
                      className="absolute inset-0"
                      style={{
                        backgroundImage: `url(${region.imageUrl})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        opacity: 0.8
                      }}
                    />
                  )}
                  
                  <div className="relative z-10 text-center">
                    <MapPin size={32} className="mx-auto mb-2" />
                    <span className="text-sm px-3 py-1 bg-black bg-opacity-60 rounded">
                      {region.groupName}
                    </span>
                    {region.isDefaultTown && (
                      <div className="mt-1">
                        <span className="text-xs px-2 py-0.5 bg-yellow-400 text-yellow-900 rounded-full">
                          기본
                        </span>
                      </div>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>

          <div className="mt-4 text-sm text-gray-600 text-center">
            {viewMode === 'areas' ? (
              <>표시 중: {visibleRegions.length}개 구역</>
            ) : (
              <>표시 중: {Object.keys(uniqueGroups).length}개 마을 | 총 {visibleRegions.length}개 구역</>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}