// src/components/views/admin/LootConfigPanel.jsx
import React, { useState } from 'react';
import { Coins, Package, Apple, Cherry, Settings, TrendingUp } from 'lucide-react';
import RegionLootSettingsModal from '../../modals/RegionLootSettingsModal';

export default function LootConfigPanel({ regions, allItems, onUpdateLootConfig }) {
  const [selectedRegion, setSelectedRegion] = useState(null);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-2">
          <Package className="text-indigo-600" size={28} />
          <h3 className="text-xl font-bold text-gray-800">탐험 보상 설정</h3>
        </div>
        <p className="text-gray-600 text-sm mb-6">
          각 지역별 포획 성공 시 자동 지급되는 보상을 설정합니다
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {regions.map(region => {
            const hasConfig = region.lootConfig;
            
            return (
              <button
                key={region.id}
                onClick={() => setSelectedRegion(region)}
                className={`p-5 rounded-xl border-2 transition-all text-left hover:shadow-lg ${
                  hasConfig
                    ? 'bg-gradient-to-br from-blue-50 to-indigo-50 border-indigo-300 hover:border-indigo-500'
                    : 'bg-gray-50 border-gray-200 hover:border-gray-400'
                }`}
              >
                {/* 헤더 */}
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-bold text-lg text-gray-800">{region.name}</h4>
                  <Settings 
                    className={hasConfig ? 'text-indigo-600' : 'text-gray-400'} 
                    size={20} 
                  />
                </div>
                
                {/* 보상 정보 */}
                {hasConfig ? (
                  <div className="space-y-2">
                    {/* 돈 */}
                    <div className="flex items-center gap-2 text-sm">
                      <Coins size={16} className="text-yellow-600 flex-shrink-0" />
                      <span className="text-gray-700 font-medium">
                        {region.lootConfig.money.min.toLocaleString()}
                        {' ~ '}
                        {region.lootConfig.money.max.toLocaleString()}₽
                      </span>
                    </div>
                    
                    {/* 일반 아이템 */}
                    <div className="flex items-center gap-2 text-sm">
                      <Package size={16} className="text-blue-600 flex-shrink-0" />
                      <span className="text-gray-700">
                        아이템 {region.lootConfig.itemCount.min}~{region.lootConfig.itemCount.max}개
                      </span>
                    </div>
                    
                    {/* 식재료 */}
                    <div className="flex items-center gap-2 text-sm">
                      <Apple size={16} className="text-green-600 flex-shrink-0" />
                      <span className="text-gray-700">
                        식재료 {region.lootConfig.ingredientCount.min}~{region.lootConfig.ingredientCount.max}개
                      </span>
                    </div>
                    
                    {/* 열매 */}
                    <div className="flex items-center gap-2 text-sm">
                      <Cherry size={16} className="text-pink-600 flex-shrink-0" />
                      <span className="text-gray-700">
                        열매 {region.lootConfig.berryCount.min}~{region.lootConfig.berryCount.max}개
                      </span>
                    </div>

                    {/* 총 보상 범위 */}
                    <div className="pt-2 mt-2 border-t border-indigo-200">
                      <div className="flex items-center gap-2 text-xs text-indigo-600 font-semibold">
                        <TrendingUp size={14} />
                        <span>
                          총 {
                            region.lootConfig.itemCount.min + 
                            region.lootConfig.ingredientCount.min + 
                            region.lootConfig.berryCount.min
                          }~{
                            region.lootConfig.itemCount.max + 
                            region.lootConfig.ingredientCount.max + 
                            region.lootConfig.berryCount.max
                          }개 보상
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <Settings className="mx-auto mb-2 text-gray-300" size={32} />
                    <p className="text-sm text-gray-400 font-medium">설정 필요</p>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 보상 설정 모달 */}
      {selectedRegion && (
        <RegionLootSettingsModal
          region={selectedRegion}
          allItems={allItems}
          onClose={() => setSelectedRegion(null)}
          onSave={(regionId, lootConfig) => {
            onUpdateLootConfig(regionId, lootConfig);
            setSelectedRegion(null);
          }}
        />
      )}
    </div>
  );
}