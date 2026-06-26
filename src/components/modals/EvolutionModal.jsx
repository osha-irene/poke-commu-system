import React from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';
import { getPokemonDisplayParts } from '../../utils/pokemonDisplayName';

const getBaseName = (pokemon) => getPokemonDisplayParts(pokemon).name;

export default function EvolutionModal({ 
  pokemon, 
  evolution, 
  allPokemonMaster,
  onAccept, 
  onCancel 
}) {
  if (!pokemon || !evolution) return null;

  const evolvedPokemon = allPokemonMaster.find(p => p.number === evolution.to);
  
  if (!evolvedPokemon) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden">
        {/* 헤더 */}
        <div className="border-b-2 border-lime-300 bg-white/95 p-6 text-green-950">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Sparkles size={32} className="text-lime-700 animate-pulse" />
            <h2 className="text-3xl font-bold">진화!</h2>
            <Sparkles size={32} className="text-lime-700 animate-pulse" />
          </div>
          <p className="text-center text-green-800">
            {pokemon.nickname || getBaseName(pokemon)}이(가) 진화하려고 합니다!
          </p>
        </div>

        {/* 진화 비교 */}
        <div className="p-8">
          <div className="flex items-center justify-center gap-8">
            {/* 진화 전 */}
            <div className="flex-1 text-center">
              <div className="bg-white/40 rounded-xl p-6 border-2 border-lime-200">
                <div 
                  className="w-40 h-40 mx-auto mb-4"
                  style={{
                    backgroundImage: `url(${pokemon.spriteUrl})`,
                    backgroundSize: 'contain',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'center',
                    imageRendering: 'pixelated'
                  }}
                />
                <h3 className="text-2xl font-bold text-gray-800 mb-1">
                  {pokemon.nickname || getBaseName(pokemon)}
                </h3>
                <p className="text-base text-gray-600">Lv. {pokemon.level}</p>
                <div className="flex gap-2 justify-center mt-3">
                  <span className="text-sm px-3 py-1 rounded-full bg-blue-100 text-blue-700 font-semibold">
                    {pokemon.type}
                  </span>
                  {pokemon.type2 && (
                    <span className="text-sm px-3 py-1 rounded-full bg-blue-100 text-blue-700 font-semibold">
                      {pokemon.type2}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* 화살표 */}
            <div className="flex flex-col items-center">
              <ArrowRight size={48} className="text-yellow-500 animate-pulse" />
              <span className="text-sm text-gray-500 mt-2">진화!</span>
            </div>

            {/* 진화 후 */}
            <div className="flex-1 text-center">
              <div className="bg-white/40 rounded-xl p-6 border-2 border-lime-200 relative overflow-hidden">
                <div 
                  className="w-40 h-40 mx-auto mb-4 relative z-10"
                  style={{
                    backgroundImage: `url(https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${evolvedPokemon.number}.png)`,
                    backgroundSize: 'contain',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'center',
                    imageRendering: 'pixelated'
                  }}
                />
                <h3 className="text-2xl font-bold text-gray-800 mb-1 relative z-10">
                  {getBaseName(evolvedPokemon)}
                </h3>
                <p className="text-base text-gray-600 relative z-10">Lv. {pokemon.level}</p>
                <div className="flex gap-2 justify-center mt-3 relative z-10">
                  <span className="text-sm px-3 py-1 rounded-full bg-yellow-100 text-yellow-700 font-semibold">
                    {evolvedPokemon.type}
                  </span>
                  {evolvedPokemon.type2 && (
                    <span className="text-sm px-3 py-1 rounded-full bg-yellow-100 text-yellow-700 font-semibold">
                      {evolvedPokemon.type2}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 진화 조건 표시 */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-base text-gray-700 text-center">
              {evolution.condition.type === 'level' && (
                <>✨ 레벨 {evolution.condition.level} 달성으로 진화 조건 충족!</>
              )}
              {evolution.condition.type === 'friendship' && (
                <>💖 친밀도 {evolution.condition.friendship} 달성으로 진화 조건 충족!</>
              )}
              {evolution.condition.type === 'item' && (
                <>🔮 {evolution.condition.item} 사용으로 진화!</>
              )}
            </p>
          </div>

          {/* 버튼 */}
          <div className="flex gap-4 mt-8">
            <button
              onClick={onCancel}
              className="flex-1 bg-gray-200 text-gray-700 py-4 rounded-lg hover:bg-gray-300 font-semibold transition-colors"
            >
              진화 취소
            </button>
            <button
              onClick={onAccept}
              className="flex-1 border-2 border-lime-300 bg-white/55 text-green-950 py-4 rounded-lg hover:bg-lime-100/70 font-semibold transition-all shadow-sm flex items-center justify-center gap-2"
            >
              <Sparkles size={20} />
              <span>진화하기!</span>
              <Sparkles size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

