// src/components/views/MapView.jsx
import React, { useState } from 'react';
import { ArrowLeft, MapPin, Package, Percent, TrendingUp } from 'lucide-react';

export default function MapView({ regions, onRegionClick }) {
  const [selectedGroup, setSelectedGroup] = useState(null);

  // groupId가 있는 지역만 필터링
  const visibleRegions = regions.filter(r => r.groupId);
  
  // 마을별로 그룹화 (지도에 표시할 마커)
  const uniqueGroups = {};
  visibleRegions.forEach(region => {
    if (!uniqueGroups[region.groupId]) {
      uniqueGroups[region.groupId] = region;
    }
  });

  // 구역 선택 화면
  if (selectedGroup) {
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
          
          <div>
            <h2 className="text-3xl font-bold text-gray-800 mb-2">{selectedGroup.groupName}</h2>
            <p className="text-gray-600">탐험할 구역을 선택하세요</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {areas.map(area => (
              <button
                key={area.id}
                onClick={() => onRegionClick(area)}
                className="bg-white border-2 border-gray-200 rounded-xl p-6
                         hover:border-blue-400 hover:shadow-lg transition-all
                         hover:scale-[1.02] active:scale-[0.98] text-left group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-800 mb-1 group-hover:text-blue-600">
                      {area.areaName}
                    </h3>
                    <p className="text-sm text-gray-500">{area.description}</p>
                  </div>
                  <div 
                    className="w-12 h-12 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: area.color || '#e5e7eb' }}
                  >
                    <MapPin size={24} className="text-white" />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div className="bg-gray-50 rounded-lg p-2">
                    <div className="text-gray-500 text-xs mb-1 flex items-center gap-1">
                      <Package size={12} />
                      포켓몬
                    </div>
                    <div className="font-bold text-gray-800">{area.pokemons?.length || 0}종</div>
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
          <div className="mb-6">
            <h3 className="text-2xl font-bold text-gray-800 mb-2">탐험할 마을을 선택하세요</h3>
            <p className="text-gray-600">지도에서 마을을 클릭하면 구역을 선택할 수 있습니다</p>
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
            {Object.values(uniqueGroups).map(region => (
              <button
                key={region.groupId}
                onClick={() => setSelectedGroup(region)}
                className="absolute hover:opacity-90 active:scale-95 transition-all 
                         rounded-lg w-36 h-36 flex items-center justify-center 
                         text-white font-bold border-4 border-white shadow-lg 
                         overflow-hidden group"
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
                </div>
              </button>
            ))}
          </div>

          <div className="mt-4 text-sm text-gray-600 text-center">
            표시 중: {Object.keys(uniqueGroups).length}개 마을 | 
            총 {visibleRegions.length}개 구역
          </div>
        </div>
      </div>
    </div>
  );
}