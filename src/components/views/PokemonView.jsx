import React from 'react';

export default function PokemonView({ caughtPokemon }) {
  const party = caughtPokemon.slice(0, 6);
  const box = caughtPokemon.slice(6);

  return (
    <div className="max-w-6xl mx-auto">
      {/* 메인 엔트리 */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">메인 엔트리 ({party.length}/6)</h3>
        
        {/* 리스트 형식 */}
        <div className="space-y-2">
          {party.map((pokemon, index) => (
            <div 
              key={pokemon.uniqueId} 
              className="flex items-center gap-4 bg-indigo-50 rounded-lg p-3 border border-indigo-200 hover:shadow-md transition-shadow cursor-pointer"
            >
              {/* 순서 번호 */}
              <div className="flex-shrink-0 w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                {index + 1}
              </div>
              
              {/* 포켓몬 아이콘 (Gen VIII Icons) */}
              <div 
                className="w-12 h-12 flex-shrink-0"
                style={{
                  backgroundImage: `url(${pokemon.iconUrl || `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-viii/icons/${pokemon.number}.png`})`,
                  backgroundSize: 'contain',
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'center'
                }}
              />
              
              {/* 포켓몬 정보 */}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-lg">{pokemon.name}</span>
                  <span className="text-xs bg-gray-200 px-2 py-1 rounded">No.{pokemon.number}</span>
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded font-semibold">{pokemon.type}</span>
                </div>
                <div className="text-sm text-gray-600">Lv.{pokemon.level}</div>
              </div>
              
              {/* HP 바 */}
              <div className="flex-shrink-0 w-32">
                <div className="text-xs text-gray-600 mb-1">HP</div>
                <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
                  <div 
                    className="bg-green-500 h-2 rounded-full transition-all"
                    style={{ width: `${(pokemon.hp / pokemon.maxHp) * 100}%` }}
                  />
                </div>
                <div className="text-xs text-gray-600">{pokemon.hp}/{pokemon.maxHp}</div>
              </div>
            </div>
          ))}
          
          {/* 빈 슬롯 */}
          {[...Array(6 - party.length)].map((_, i) => (
            <div key={`empty-${i}`} className="flex items-center gap-4 bg-gray-50 rounded-lg p-3 border border-dashed border-gray-300 text-gray-400">
              <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-sm">
                {party.length + i + 1}
              </div>
              <div className="w-12 h-12 bg-gray-100 rounded"></div>
              <div className="flex-1 text-sm">빈 슬롯</div>
            </div>
          ))}
        </div>
      </div>

      {/* 박스 */}
      {box.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">보관함 ({box.length}마리)</h3>
          
          {/* 그리드 형식으로 작게 */}
          <div className="grid grid-cols-8 gap-2">
            {box.map(pokemon => (
              <div 
                key={pokemon.uniqueId} 
                className="bg-gray-50 rounded-lg p-2 text-center border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
                title={`${pokemon.name} Lv.${pokemon.level}`}
              >
                {/* 아이콘 */}
                <div 
                  className="w-full h-12 mb-1"
                  style={{
                    backgroundImage: `url(${pokemon.iconUrl || `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-viii/icons/${pokemon.number}.png`})`,
                    backgroundSize: 'contain',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'center'
                  }}
                />
                <div className="text-xs font-bold text-gray-700 truncate">{pokemon.name}</div>
                <div className="text-xs text-gray-500">Lv.{pokemon.level}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}