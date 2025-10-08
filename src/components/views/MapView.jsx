import React from 'react';

export default function MapView({ regions, onRegionClick }) {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <div className="w-full max-w-7xl">
        <div className="bg-white rounded-lg border border-gray-200 p-8">
          <div className="mb-6">
            <h3 className="text-2xl font-bold text-gray-800 mb-2">탐험할 지역을 선택하세요</h3>
            <p className="text-gray-600">각 지역을 클릭하여 포켓몬을 만나보세요!</p>
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
            {regions.map(region => (
              <button
                key={region.id}
                onClick={() => onRegionClick(region)}
                className={`absolute hover:opacity-90 active:scale-95 transition-all rounded-lg w-36 h-36 flex items-center justify-center text-white font-bold border-4 border-white shadow-lg overflow-hidden`}
                style={{ 
                  left: `${region.x}%`, 
                  top: `${region.y}%`, 
                  transform: 'translate(-50%, -50%)',
                  backgroundColor: region.color.replace('bg-', '#') // fallback color
                }}
              >
                {/* 지역 이미지 */}
                <div 
                  className="absolute inset-0"
                  style={{
                    backgroundImage: `url(${region.imageUrl})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    opacity: 0.8
                  }}
                />
                
                {/* 지역 이름 오버레이 */}
                <span className="relative z-10 text-sm px-3 py-1 bg-black bg-opacity-60 rounded">
                  {region.name}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}