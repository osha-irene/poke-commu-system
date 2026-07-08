import React, { useState } from 'react';
import { ArrowRightLeft, Edit, Gift, Plus, RefreshCw, Sparkles, Trash2, X } from 'lucide-react';
import FormIconSprite from '../../pokemon/FormIconSprite';
import { getOwnedPokemonDisplayParts } from '../../../../utils/ownedPokemonDisplay';
import { getGenderedSpriteUrl } from '../../../../utils/pokemonImageUtils';

export default function MemberPokemonViewMode({
  member,
  allPokemonMaster = [],
  getPokemonFormCandidates,
  onStartEdit,
  onChangeForm,
  onDelete,
  onStartGive,
  onStartTransfer,
  maxNonPartnerPokemon = 18,
}) {
  const [openFormPokemonId, setOpenFormPokemonId] = useState(null);
  const partnerPokemon = member?.partnerPokemon?.uniqueId ? member.partnerPokemon : null;
  const caughtPokemon = member?.caughtPokemon?.filter(pokemon => pokemon && pokemon.uniqueId) || [];
  const memberPokemon = partnerPokemon
    ? [
        partnerPokemon,
        ...caughtPokemon.filter(pokemon => pokemon.uniqueId !== partnerPokemon.uniqueId),
      ]
    : caughtPokemon;

  const getAvailableForms = (pokemon) => {
    if (typeof getPokemonFormCandidates !== 'function') return [];
    const currentFormKey = pokemon.pokemonId || pokemon.id || pokemon.nameEn || pokemon.name;
    return getPokemonFormCandidates(pokemon).filter(form => (
      (form.id || form.nameEn || form.name) !== currentFormKey &&
      form.nameEn !== pokemon.nameEn &&
      form.name !== pokemon.name
    ));
  };

  const getMasterData = (pokemon) => {
    const formVariant = String(pokemon?.formVariant || '').toLowerCase();
    const regionalForm = String(pokemon?.regionalForm || '').toLowerCase();
    const pokemonId = Number(pokemon?.pokemonId || pokemon?.id);
    const number = Number(pokemon?.number);
    const originalNumber = Number(pokemon?.originalNumber || pokemon?.number);

    return allPokemonMaster.find(template => (
      formVariant && String(template.formVariant || '').toLowerCase() === formVariant
    )) || allPokemonMaster.find(template => (
      regionalForm &&
      String(template.regionalForm || '').toLowerCase() === regionalForm &&
      Number(template.originalNumber || template.number) === originalNumber
    )) || allPokemonMaster.find(template => (
      pokemonId && Number(template.id) === pokemonId
    )) || allPokemonMaster.find(template => (
      number && Number(template.number) === number
    )) || allPokemonMaster.find(template => (
      originalNumber && Number(template.originalNumber || template.number) === originalNumber
    ));
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-bold text-lg">
          보유 포켓몬 ({caughtPokemon.filter(p => !p.isPartner).length}/{maxNonPartnerPokemon})
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
          {memberPokemon.map((pokemon, index) => {
            const displayName = getOwnedPokemonDisplayParts(pokemon);
            const masterData = getMasterData(pokemon);
            const spriteUrl = getGenderedSpriteUrl(pokemon, masterData) || pokemon.spriteUrl || pokemon.sprite || '';
            return (
            <div key={pokemon.uniqueId || index} className="bg-white rounded-lg border p-3">
              <div className="flex items-start gap-3">
                <img
                  src={spriteUrl}
                  alt={pokemon.name || '포켓몬'}
                  className="w-20 h-20"
                  style={{ imageRendering: 'pixelated' }}
                  onError={(event) => {
                    event.currentTarget.src = 'https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/0.png';
                  }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1 mb-1">
                    <h4 className="font-bold text-sm truncate">
                      {displayName.primary || '???'}
                    </h4>
                    {pokemon.isShiny && <Sparkles size={14} className="text-yellow-500" />}
                  </div>
                  {displayName.hasNickname && (
                    <p className="text-xs font-semibold text-gray-500 truncate">{displayName.species}</p>
                  )}
                  <p className="text-xs text-gray-600">Lv.{pokemon.level || 1}</p>
                  <p className="text-xs text-gray-500">No.{pokemon.originalNumber || pokemon.number || '???'}</p>
                  {pokemon.heldItem && (
                    <div className="flex items-center gap-1 mt-1">
                      <Gift size={10} className="text-purple-500" />
                      <p className="text-xs text-purple-600">{pokemon.heldItem}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2 mt-3">
                <button
                  type="button"
                  onClick={() => onStartEdit(pokemon)}
                  className="bg-blue-50 text-blue-600 px-2 py-1 rounded text-xs font-semibold hover:bg-blue-100"
                >
                  <Edit size={12} className="inline mr-1" />
                  편집
                </button>
                {getAvailableForms(pokemon).length > 0 && (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setOpenFormPokemonId(value => value === pokemon.uniqueId ? null : pokemon.uniqueId)}
                      className="w-full bg-teal-50 text-teal-700 px-2 py-1 rounded text-xs font-semibold hover:bg-teal-100"
                      title="폼체인지"
                    >
                      <RefreshCw size={12} className="inline mr-1" />
                      폼
                    </button>

                    {openFormPokemonId === pokemon.uniqueId && (
                      <div className="absolute right-0 top-full z-30 mt-2 w-56 rounded-lg border border-lime-200 bg-white p-3 shadow-xl">
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <strong className="text-sm text-green-950">폼체인지</strong>
                          <button
                            type="button"
                            onClick={() => setOpenFormPokemonId(null)}
                            className="text-gray-500 hover:text-gray-700"
                          >
                            <X size={14} />
                          </button>
                        </div>
                        <div className="max-h-64 space-y-2 overflow-y-auto">
                          {getAvailableForms(pokemon).map(form => (
                            <button
                              key={form.id || form.nameEn || form.name}
                              type="button"
                              onClick={() => {
                                onChangeForm?.(pokemon, form);
                                setOpenFormPokemonId(null);
                              }}
                              className="flex w-full items-center gap-2 rounded-md border border-lime-100 bg-lime-50/60 px-2 py-2 text-left hover:bg-lime-100"
                            >
                              <FormIconSprite
                                form={form}
                                size={32}
                                fallbackUrl={form.iconUrl || form.spriteUrl || form.imageUrl || ''}
                                className="h-8 w-8"
                              />
                              <span className="min-w-0">
                                <span className="block truncate text-xs font-bold text-green-950">{form.name || form.nameEn}</span>
                                <span className="block truncate text-[11px] text-green-700">
                                  {form.type}{form.type2 ? ` / ${form.type2}` : ''}
                                </span>
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
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
            );
          })}
        </div>
      )}
    </div>
  );
}
