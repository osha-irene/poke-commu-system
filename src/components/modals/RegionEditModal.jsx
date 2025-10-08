import React, { useState } from 'react';

export default function RegionEditModal({ region, allPokemon, onClose, onSave }) {
  const [selectedPokemon, setSelectedPokemon] = useState(region.pokemons);

  const togglePokemon = (pokemonId) => {
    if (selectedPokemon.includes(pokemonId)) {
      setSelectedPokemon(selectedPokemon.filter(id => id !== pokemonId));
    } else {
      setSelectedPokemon([...selectedPokemon, pokemonId]);
    }
  };

  const handleSave = () => {
    if (selectedPokemon.length === 0) {
      alert('최소 1개 이상의 포켓몬을 선택해주세요!');
      return;
    }
    onSave(region.id, selectedPokemon);
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg border border-gray-300 p-8 max-w-4xl w-full mx-4 max-h-[80vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold text-gray-800 mb-4">
          {region.name} - 포켓몬 설정
        </h2>
        <p className="text-gray-600 mb-6">
          이 지역에 등장할 포켓몬을 선택하세요 (현재 {selectedPokemon.length}종 선택됨)
        </p>

        {/* 리스트 형식 */}
        <div className="space-y-2 mb-6 max-h-96 overflow-auto">
          {allPokemon.map((pokemon) => {
            const isSelected = selectedPokemon.includes(pokemon.id);
            return (
              <button
                key={pokemon.id}
                onClick={() => togglePokemon(pokemon.id)}
                className={`w-full flex items-center gap-4 p-3 rounded-lg border-2 transition-all ${
                  isSelected
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                {/* 선택 체크박스 */}
                <div className={`w-6 h-6 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                  isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300'
                }`}>
                  {isSelected && <span className="text-white text-sm">✓</span>}
                </div>
                
                {/* 포켓몬 아이콘 (Gen VIII Icons) */}
                <div 
                  className="w-12 h-12 flex-shrink-0"
                  style={{
                    backgroundImage: `url(https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-viii/icons/${pokemon.number}.png)`,
                    backgroundSize: 'contain',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'center'
                  }}
                />
                
                {/* 포켓몬 정보 */}
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2">
                    <span className="font-bold">No.{String(pokemon.number).padStart(3, '0')}</span>
                    <span className="font-semibold text-lg">{pokemon.name}</span>
                  </div>
                  <div className="text-sm text-gray-600">{pokemon.type} 타입</div>
                </div>
                
                {/* 포획률 */}
                <div className="text-right flex-shrink-0">
                  <div className="text-xs text-gray-500">포획률</div>
                  <div className="text-sm font-semibold">{Math.round(pokemon.catchRate * 100)}%</div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex gap-4">
          <button
            onClick={handleSave}
            className="flex-1 bg-indigo-600 text-white py-3 rounded-lg font-bold hover:bg-indigo-700 transition-colors"
          >
            저장
          </button>
          <button
            onClick={onClose}
            className="px-8 bg-gray-300 text-gray-700 py-3 rounded-lg font-bold hover:bg-gray-400 transition-colors"
          >
            취소
          </button>
        </div>
      </div>
    </div>
  );
}