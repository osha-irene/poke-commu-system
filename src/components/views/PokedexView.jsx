import React from 'react';

export default function PokedexView({ caughtPokemon }) {
  // 중복 제거 - 같은 포켓몬을 여러 번 잡았을 경우 하나만 표시
  const uniquePokemon = [];
  const seenNumbers = new Set();
  
  caughtPokemon.forEach(pokemon => {
    if (!seenNumbers.has(pokemon.number)) {
      seenNumbers.add(pokemon.number);
      uniquePokemon.push(pokemon);
    }
  });

  uniquePokemon.sort((a, b) => a.number - b.number);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-white rounded-lg border border-gray-200 p-8">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xl font-bold text-gray-800">포획 현황</h3>
              <p className="text-gray-600">{uniquePokemon.length}/151 마리 포획</p>
            </div>
            <div className="bg-blue-50 px-6 py-3 rounded-lg border border-blue-200">
              <div className="text-sm text-gray-600">완성도</div>
              <div className="text-2xl font-bold text-blue-600">
                {Math.round((uniquePokemon.length / 151) * 100)}%
              </div>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-6 gap-4">
          {uniquePokemon.map(pokemon => (
            <div 
              key={pokemon.number} 
              className="bg-yellow-50 rounded-lg p-4 text-center hover:shadow-md transition-shadow cursor-pointer border border-yellow-200"
              style={{
                // backgroundImage: `url(${pokemon.imageUrl})`,
                backgroundSize: 'contain',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center top'
              }}
            >
              <div className="text-5xl mb-2">{pokemon.emoji}</div>
              <div className="text-xs text-gray-600 font-semibold">No.{pokemon.number}</div>
              <div className="font-bold text-sm">{pokemon.name}</div>
            </div>
          ))}
          
          {/* 미포획 포켓몬 */}
          {[...Array(Math.max(0, 12 - uniquePokemon.length))].map((_, i) => (
            <div key={`unknown-${i}`} className="bg-gray-50 rounded-lg p-4 text-center border border-gray-200">
              <div className="text-5xl mb-2 opacity-20">❓</div>
              <div className="text-xs text-gray-400 font-semibold">No.???</div>
              <div className="font-bold text-sm text-gray-400">???</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}