import React, { useState } from 'react';
import { Coins, Package, Apple, TreePine, Settings } from 'lucide-react';
import RegionLootSettingsModal from '../../modals/RegionLootSettingsModal';

export default function LootConfigPanel({ regions, allItems, onUpdateLootConfig }) {
  const [selectedRegion, setSelectedRegion] = useState(null);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-2">🎁 탐험 보상 설정</h3>
        <p className="text-gray-600 mb-6">
          각 지역에서 탐험 시 획득할 수 있는 아이템과 범위를 설정합니다.
          <br />
          <span className="text-sm text-indigo-600 font-semibold">
            ⭐ 포켓몬 인카운터 후 포획 성공 시 자동으로 보상이 지급됩니다!
          </span>
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {regions.map(region => (
            <button
              key={region.id}
              onClick={() => setSelectedRegion(region)}
              className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-lg border-2 border-gray-200 hover:border-indigo-400 transition-all text-left"
            >
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-bold text-lg">{region.name}</h4>
                <Settings className="text-gray-400" size={20} />
              </div>
              
              {region.lootConfig ? (
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Coins size={14} className="text-yellow-600" />
                    <span className="text-gray-600">
                      {region.lootConfig.money.min}G ~ {region.lootConfig.money.max}G
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Package size={14} className="text-blue-600" />
                    <span className="text-gray-600">
                      아이템 {region.lootConfig.itemCount.min}~{region.lootConfig.itemCount.max}개
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Apple size={14} className="text-green-600" />
                    <span className="text-gray-600">
                      식재료 {region.lootConfig.ingredientCount.min}~{region.lootConfig.ingredientCount.max}개
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <TreePine size={14} className="text-pink-600" />
                    <span className="text-gray-600">
                      열매 {region.lootConfig.berryCount.min}~{region.lootConfig.berryCount.max}개
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-400 italic">설정되지 않음</p>
              )}
            </button>
          ))}
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