import React, { useState } from 'react';
import { Search, Check, X } from 'lucide-react';

export default function PokedexAdminPanel({ 
  allPokemonMaster = [],
  gamePokedex = [],
  updateGamePokedex 
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGen, setSelectedGen] = useState('all');
  const [selectedPokemon, setSelectedPokemon] = useState(() => 
    new Set(gamePokedex.map(p => p.originalNumber || p.number))
  );

  // 필터링
  const filteredPokemon = allPokemonMaster.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         p.nameEn.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         p.number.toString().includes(searchTerm);
    const matchesGen = selectedGen === 'all' || p.generation === selectedGen;
    return matchesSearch && matchesGen;
  });

  // 세대별 그룹
  const generations = [...new Set(allPokemonMaster.map(p => p.generation))].sort();

  const togglePokemon = (number) => {
    setSelectedPokemon(prev => {
      const newSet = new Set(prev);
      if (newSet.has(number)) {
        newSet.delete(number);
      } else {
        newSet.add(number);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    setSelectedPokemon(new Set(filteredPokemon.map(p => p.number)));
  };

  const deselectAll = () => {
    setSelectedPokemon(new Set());
  };

  const handleSave = () => {
    const confirmed = window.confirm(
      `선택된 ${selectedPokemon.size}마리의 포켓몬으로 게임 도감을 설정하시겠습니까?\n\n` +
      '기존 도감 데이터는 유지되며, 출현 포켓몬만 변경됩니다.'
    );
    
    if (confirmed) {
      updateGamePokedex(Array.from(selectedPokemon));
      alert('✅ 게임 도감이 업데이트되었습니다!');
    }
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">게임 도감 설정</h3>
        <p className="text-sm text-gray-600 mb-4">
          게임에서 사용할 포켓몬을 선택하세요. 선택된 포켓몬들은 자동으로 1번부터 리넘버링됩니다.
        </p>

        {/* 통계 */}
        <div className="flex gap-4 mb-4">
          <div className="bg-indigo-50 rounded-lg p-3 flex-1">
            <div className="text-sm text-gray-600">선택된 포켓몬</div>
            <div className="text-2xl font-bold text-indigo-600">{selectedPokemon.size}마리</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 flex-1">
            <div className="text-sm text-gray-600">전체 포켓몬</div>
            <div className="text-2xl font-bold text-gray-600">{allPokemonMaster.length}마리</div>
          </div>
        </div>

        {/* 검색 & 필터 */}
        <div className="flex gap-3 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="이름 또는 번호로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          
          <select
            value={selectedGen}
            onChange={(e) => setSelectedGen(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">전체 세대</option>
            {generations.map(gen => (
              <option key={gen} value={gen}>{gen}세대</option>
            ))}
          </select>
        </div>

        {/* 액션 버튼 */}
        <div className="flex gap-2">
          <button
            onClick={selectAll}
            className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors font-semibold"
          >
            현재 필터 전체 선택
          </button>
          <button
            onClick={deselectAll}
            className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors font-semibold"
          >
            전체 해제
          </button>
          <button
            onClick={handleSave}
            className="ml-auto px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-semibold"
          >
            도감 저장
          </button>
        </div>
      </div>

      {/* 포켓몬 그리드 */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="grid grid-cols-8 gap-3">
          {filteredPokemon.map(pokemon => {
            const isSelected = selectedPokemon.has(pokemon.number);
            
            return (
              <div
                key={pokemon.number}
                onClick={() => togglePokemon(pokemon.number)}
                className={`relative rounded-lg border-2 p-2 text-center cursor-pointer transition-all ${
                  isSelected
                    ? 'border-indigo-500 bg-indigo-50 shadow-md'
                    : 'border-gray-200 bg-white hover:border-indigo-300'
                }`}
              >
                {/* 선택 표시 */}
                {isSelected && (
                  <div className="absolute top-1 right-1 bg-indigo-600 rounded-full p-1">
                    <Check size={12} className="text-white" />
                  </div>
                )}

                {/* 포켓몬 이미지 */}
                <div 
                  className="w-full h-16 mb-1"
                  style={{
                    backgroundImage: `url(${pokemon.imageUrl})`,
                    backgroundSize: 'contain',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'center'
                  }}
                />

                {/* 번호 & 이름 */}
                <div className="text-xs text-gray-500">#{pokemon.number}</div>
                <div className="text-xs font-bold text-gray-700 truncate">{pokemon.name}</div>
                <div className="text-xs text-gray-400">{pokemon.generation}세대</div>
              </div>
            );
          })}
        </div>

        {filteredPokemon.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            검색 결과가 없습니다
          </div>
        )}
      </div>
    </div>
  );
}