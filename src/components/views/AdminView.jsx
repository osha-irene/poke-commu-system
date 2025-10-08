import React, { useState } from 'react';
import RegionEditModal from '../modals/RegionEditModal';

export default function AdminView({ 
  trainer, 
  updateMaxDailyWalks, 
  regions, 
  allPokemon,
  updateRegionPokemon 
}) {
  const [maxWalks, setMaxWalks] = useState(trainer.maxDailyWalks);
  const [editingRegion, setEditingRegion] = useState(null);
  
  const handleApplyWalks = () => {
    updateMaxDailyWalks(maxWalks);
    alert('일일 산책 횟수가 설정되었습니다!');
  };

  const handleEditRegion = (region) => {
    setEditingRegion(region);
  };

  const handleCloseModal = () => {
    setEditingRegion(null);
  };

  const handleSaveRegion = (regionId, pokemonIds) => {
    updateRegionPokemon(regionId, pokemonIds);
    setEditingRegion(null);
    alert('구역 포켓몬이 업데이트되었습니다!');
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* 일일 산책 설정 */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">⚙️ 일일 산책 횟수 설정</h3>
        <div className="flex items-center gap-4">
          <input 
            type="number" 
            value={maxWalks}
            onChange={(e) => setMaxWalks(parseInt(e.target.value) || 0)}
            min="1"
            max="999"
            className="border-2 border-gray-300 rounded-lg px-4 py-3 w-32 text-lg font-semibold focus:border-indigo-500 focus:outline-none"
          />
          <span className="text-gray-600 font-semibold">회</span>
          <button 
            onClick={handleApplyWalks}
            className="bg-indigo-600 text-white px-8 py-3 rounded-lg hover:bg-indigo-700 font-semibold transition-colors"
          >
            적용
          </button>
          <span className="text-sm text-gray-500 ml-4">
            현재: {trainer.maxDailyWalks}회
          </span>
        </div>
      </div>

      {/* 구역별 포켓몬 설정 */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">🗺️ 구역별 포켓몬 설정</h3>
        <div className="space-y-3">
          {regions.map((region) => (
            <div 
              key={region.id} 
              className="flex items-center justify-between bg-gray-50 p-4 rounded-lg border border-gray-200 hover:border-indigo-300 transition-colors"
            >
              <div>
                <span className="font-semibold text-lg">{region.name}</span>
                <div className="text-sm text-gray-600 mt-1">
                  등장 포켓몬: {region.pokemons.length}종
                </div>
              </div>
              <button 
                onClick={() => handleEditRegion(region)}
                className="bg-indigo-100 text-indigo-700 px-6 py-2 rounded-lg hover:bg-indigo-200 font-semibold transition-colors"
              >
                포켓몬 편집
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 구역 편집 모달 */}
      {editingRegion && (
        <RegionEditModal
          region={editingRegion}
          allPokemon={allPokemon}
          onClose={handleCloseModal}
          onSave={handleSaveRegion}
        />
      )}
    </div>
  );
}