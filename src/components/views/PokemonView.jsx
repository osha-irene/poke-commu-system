import React from 'react';

export default function PokemonView({ caughtPokemon }) {
  const party = caughtPokemon.slice(0, 6);
  const box = caughtPokemon.slice(6);

  return (
    <div className="max-w-6xl mx-auto">
      {/* 메인 엔트리 */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">메인 엔트리 ({party.length}/6)</h3>
        <div className="grid grid-cols-3 gap-4">
          {party.map(pokemon => (
            <div 
              key={pokemon.uniqueId} 
              className="bg-indigo-50 rounded-lg p-4 flex items-center justify-between border border-indigo-200 hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="flex items-center gap-4">
                {/* 포켓몬 이미지 */}
                <div 
                  className="w-16 h-16 flex-shrink-0"
                  style={{
                    backgroundImage: `url(${pokemon.imageUrl})`,
                    backgroundSize: 'contain',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'center'
                  }}
                />
                <div>
                  <div className="font-bold text-lg">{pokemon.name}</div>
                  <div className="text-sm text-gray-600">Lv.{pokemon.level}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-600">HP</div>
                <div className="font-bold text-lg text-green-600">{pokemon.hp}/{pokemon.maxHp}</div>
              </div>
            </div>
          ))}
          {[...Array(6 - party.length)].map((_, i) => (
            <div key={`empty-${i}`} className="bg-gray-50 rounded-lg p-4 border border-dashed border-gray-300 text-center text-gray-400 flex items-center justify-center min-h-[100px]">
              빈 슬롯
            </div>
          ))}
        </div>
      </div>

      {/* 박스 */}
      {box.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">보관함 ({box.length}마리)</h3>
          <div className="grid grid-cols-6 gap-3">
            {box.map(pokemon => (
              <div 
                key={pokemon.uniqueId} 
                className="bg-gray-50 rounded-lg p-3 text-center border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
              >
                {/* 포켓몬 이미지 */}
                <div 
                  className="w-full h-16 mb-1 flex items-center justify-center"
                  style={{
                    backgroundImage: `url(${pokemon.imageUrl})`,
                    backgroundSize: 'contain',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'center'
                  }}
                />
                <div className="text-xs font-bold text-gray-700">{pokemon.name}</div>
                <div className="text-xs text-gray-500">Lv.{pokemon.level}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}