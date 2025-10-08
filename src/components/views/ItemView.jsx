import React from 'react';

export default function ItemsView({ items }) {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-6">보유 아이템</h3>
        <div className="space-y-3">
          {items.map((item, i) => (
            <div 
              key={i} 
              className="flex items-center justify-between bg-gray-50 rounded-lg p-5 border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="flex items-center gap-4">
                {/* 아이템 이미지 */}
                <div 
                  className="w-16 h-16 flex-shrink-0"
                  style={{
                    backgroundImage: `url(${item.imageUrl})`,
                    backgroundSize: 'contain',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'center'
                  }}
                />
                <div>
                  <div className="font-bold text-lg text-gray-800">{item.name}</div>
                  <div className="text-sm text-gray-600">{item.description}</div>
                </div>
              </div>
              <div className="text-3xl font-bold text-indigo-600">×{item.count}</div>
            </div>
          ))}
          {items.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              보유한 아이템이 없습니다
            </div>
          )}
        </div>
      </div>
    </div>
  );
}