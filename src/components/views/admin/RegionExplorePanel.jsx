// src/components/views/admin/RegionExplorePanel.jsx
import React, { useState, useMemo, useEffect } from 'react';
import { ref, get, set } from 'firebase/database';
import { database } from '../../../firebase';
import { MapPin } from 'lucide-react';
import RegionManagementPanel from './regions/RegionManagementPanel';

export default function RegionExplorePanel({ 
  regions = [],
  setRegions,
  allItems = [],
  onUpdateRegion,
  onUpdateRegionLootConfig,
  onAddRegion,
  onDeleteRegion,
  onCreateTown,
  onUpdateTown,  
  onDeleteTown  
}) {
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [editMode, setEditMode] = useState(null);
  const selectedRegionId = selectedRegion?.id;

  useEffect(() => {
    if (!selectedRegionId) return;
    const latestRegion = regions.find((region) => region.id === selectedRegionId);
    if (latestRegion) {
      setSelectedRegion({
        ...latestRegion,
        pokemons: Array.isArray(latestRegion.pokemons) ? latestRegion.pokemons : [],
        allowNationalPokedex: latestRegion.allowNationalPokedex !== undefined ? latestRegion.allowNationalPokedex : false
      });
    }
  }, [regions, selectedRegionId]);

  const handleRegionClick = (region) => {
  console.log('🔍 선택한 지역 원본:', region);
  console.log('🔍 allowNationalPokedex 값:', region.allowNationalPokedex);
  
  const sanitizedRegion = {
    ...region,
    pokemons: Array.isArray(region.pokemons) ? region.pokemons : [],
    allowNationalPokedex: region.allowNationalPokedex !== undefined ? region.allowNationalPokedex : false
  };
  
  console.log('🔍 sanitizedRegion:', sanitizedRegion);
  
  setSelectedRegion(sanitizedRegion);
  setEditMode(null);
};

  const groupedRegions = useMemo(() => {
    if (!regions || !Array.isArray(regions)) return {};
    
    return regions
      .filter(r => !r.isTownMeta)
      .reduce((acc, region) => {
        const group = region.groupName || '미분류';
        if (!acc[group]) acc[group] = [];
        acc[group].push(region);
        return acc;
      }, {});
  }, [regions]);

  const towns = useMemo(() => {
    if (!regions || !Array.isArray(regions)) return [];
    
    const townMap = new Map();
    regions.forEach(region => {
      if (region.groupId && region.groupName) {
        if (!townMap.has(region.groupId)) {
          townMap.set(region.groupId, {
            groupId: region.groupId,
            groupName: region.groupName,
            visible: region.groupVisible !== false,
            areaCount: 0,
            x: region.x,
            y: region.y,
            color: region.color,
            isDefaultTown: region.isDefaultTown || false
          });
        }
        if (!region.isTownMeta) {
          townMap.get(region.groupId).areaCount++;
        }
      }
    });
    return Array.from(townMap.values());
  }, [regions]);

  const handleToggleTownVisibility = async (groupId) => {
    const town = towns.find(t => t.groupId === groupId);
    if (!town) return;
    
    const updatedRegions = regions.map(region => {
      if (region.groupId === groupId) {
        return {
          ...region,
          groupVisible: !town.visible
        };
      }
      return region;
    });
    
    setRegions(updatedRegions);
    
    try {
      await set(ref(database, 'gameData/regions'), updatedRegions);

      const configRef = ref(database, 'gameData/config');
      const snapshot = await get(configRef);
      const currentConfig = snapshot.val() || {};
      
      await set(configRef, {
        ...currentConfig,
        regions: updatedRegions
      });
      
      console.log('✅ 마을 표시 토글:', groupId, !town.visible);
    } catch (error) {
      console.error('❌ 마을 표시 토글 실패:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border-2 border-gray-300 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <MapPin size={22} />
              지역 & 탐험 관리
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              각 지역의 그룹 설정, 출현 포켓몬, 탐험 보상을 관리합니다
            </p>
          </div>

        </div>
      </div>

      <RegionManagementPanel
        regions={regions}
        towns={towns}
        groupedRegions={groupedRegions}
        selectedRegion={selectedRegion}
        editMode={editMode}
        allItems={allItems}
        onRegionClick={handleRegionClick}
        onUpdateRegion={onUpdateRegion}
        onUpdateRegionLootConfig={onUpdateRegionLootConfig}
        onAddRegion={onAddRegion}
        onDeleteRegion={onDeleteRegion}
        onToggleTownVisibility={handleToggleTownVisibility}
        onCreateTown={onCreateTown}
        onUpdateTown={onUpdateTown}
        onDeleteTown={onDeleteTown}
        setEditMode={setEditMode}
      />
    </div>
  );
}
