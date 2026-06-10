import React from 'react';
import { ArrowRightLeft, Edit, Gift, Plus, Sparkles, Trash2 } from 'lucide-react';

export default function MemberPokemonViewMode({
  member,
  onStartEdit,
  onDelete,
  onStartGive,
  onStartTransfer
}) {
  const memberPokemon = member?.caughtPokemon?.filter(pokemon => pokemon && pokemon.uniqueId) || [];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-bold text-lg">
          보유 포켓몬 ({memberPokemon.length}/26)
        </h3>
        <button
          type="button"
          onClick={onStartGive}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 font-semibold"
        >
          <Plus size={16} />
          포켓몬 지급
        </button>
      </div>

      {memberPokemon.length === 0 ? (
        <div className="col-span-2 text-center py-8 text-gray-500">
          보유한 포켓몬이 없습니다.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {memberPokemon.map((pokemon, index) => (
            <div key={pokemon.uniqueId || index} className="bg-white rounded-lg border p-3">
              <div className="flex items-start gap-3">
                <img
                  src={pokemon.spriteUrl || pokemon.sprite || ''}
                  alt={pokemon.name || '포켓몬'}
                  className="w-20 h-20"
                  style={{ imageRendering: 'pixelated' }}
                  onError={(event) => {
                    event.currentTarget.src = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/0.png';
                  }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1 mb-1">
                    <h4 className="font-bold text-sm truncate">
                      {pokemon.nickname || pokemon.name || '???'}
                    </h4>
                    {pokemon.isShiny && <Sparkles size={14} className="text-yellow-500" />}
                  </div>
                  <p className="text-xs text-gray-600">Lv.{pokemon.level || 1}</p>
                  <p className="text-xs text-gray-500">No.{pokemon.number || '???'}</p>
                  {pokemon.heldItem && (
                    <div className="flex items-center gap-1 mt-1">
                      <Gift size={10} className="text-purple-500" />
                      <p className="text-xs text-purple-600">{pokemon.heldItem}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mt-3">
                <button
                  type="button"
                  onClick={() => onStartEdit(pokemon)}
                  className="bg-blue-50 text-blue-600 px-2 py-1 rounded text-xs font-semibold hover:bg-blue-100"
                >
                  <Edit size={12} className="inline mr-1" />
                  편집
                </button>
                <button
                  type="button"
                  onClick={() => onStartTransfer?.(pokemon)}
                  className="bg-indigo-50 text-indigo-600 px-2 py-1 rounded text-xs font-semibold hover:bg-indigo-100"
                >
                  <ArrowRightLeft size={12} className="inline mr-1" />
                  이전
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`${pokemon.nickname || pokemon.name}을(를) 삭제하시겠습니까?`)) {
                      onDelete(pokemon.uniqueId);
                    }
                  }}
                  className="bg-red-50 text-red-600 px-2 py-1 rounded text-xs font-semibold hover:bg-red-100"
                >
                  <Trash2 size={12} className="inline mr-1" />
                  삭제
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
