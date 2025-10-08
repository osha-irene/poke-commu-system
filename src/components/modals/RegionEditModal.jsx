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
        className="bg-white rounded-lg border border-gray-300 p-8 max-w-3xl w-full mx-4 max-h-[80vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold text-gray-800 mb-4">
          {region.name} - 포켓몬 설정
        </h2>
        <p className="text-gray-600 mb-6">
          이 지역에 등장할 포켓몬을 선택하세요 (현재 {selectedPokemon.length}종 선택됨)
        </p>

        <div className="grid grid-cols-3 gap-4 mb-6">
          {allPokemon.map((pokemon) => {
            const isSelected = selectedPokemon.includes(pokemon.id);
            return (
              <button
                key={pokemon.id}
                onClick={() => togglePokemon(pokemon.id)}
                className={`p-4 rounded-lg border-2 transition-all ${
                  isSelected
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div 
                  className="w-full h-24 mb-2 bg-gray-100 rounded flex items-center justify-center"
                  style={{
                    backgroundImage: `url(${pokemon.imageUrl})`,
                    backgroundSize: 'contain',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'center'
                  }}
                >
                  {/* 이미지가 없을 때 대체 텍스트 */}
                  <span className="text-4xl">No.{pokemon.number}</span>
                </div>
                <div className="font-bold text-sm">{pokemon.name}</div>
                <div className="text-xs text-gray-600">{pokemon.type} 타입</div>
                {isSelected && (
                  <div className="mt-2 text-xs font-bold text-indigo-600">✓ 선택됨</div>
                )}
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