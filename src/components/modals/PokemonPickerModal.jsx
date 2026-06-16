import React, { useState, useMemo } from 'react';
import { X, Globe } from 'lucide-react';

const REGIONAL_FORM_LABELS = {
  alola: '알로라',
  galar: '가라르',
  hisui: '히스이',
  paldea: '팔데아',
  kalos: '칼로스',
};

function splitRegionalName(pokemon) {
  // e.g. "파이어 (가라르의 모습)" → base: "파이어", region: "가라르"
  // Or use regionalForm field directly
  if (pokemon.regionalForm && REGIONAL_FORM_LABELS[pokemon.regionalForm]) {
    // strip region suffix from name if present
    const label = REGIONAL_FORM_LABELS[pokemon.regionalForm];
    const cleaned = pokemon.name
      .replace(/\s*\(.*모습\)/, '')
      .replace(/\s*\(.*의\s*모습\)/, '')
      .trim();
    return { base: cleaned, region: label };
  }
  // fallback: parse from name string
  const match = pokemon.name.match(/^(.+?)\s*\((.+?)(?:의\s*모습)?\)$/);
  if (match) {
    const regionWord = match[2].replace(/의\s*모습/, '').trim();
    return { base: match[1].trim(), region: regionWord };
  }
  return { base: pokemon.name, region: null };
}

const TYPE_COLORS = {
  '노말': 'bg-gray-400', '불꽃': 'bg-red-500', '물': 'bg-blue-500', '풀': 'bg-green-500',
  '전기': 'bg-yellow-400', '얼음': 'bg-cyan-300', '격투': 'bg-orange-600', '독': 'bg-purple-500',
  '땅': 'bg-yellow-600', '비행': 'bg-indigo-300', '에스퍼': 'bg-pink-500', '벌레': 'bg-lime-500',
  '바위': 'bg-yellow-700', '고스트': 'bg-purple-700', '드래곤': 'bg-indigo-600',
  '악': 'bg-gray-700', '강철': 'bg-gray-500', '페어리': 'bg-pink-300',
};

function getPokemonImageUrl(pokemon) {
  if (!pokemon) return '';
  const url =
    pokemon.spriteUrl || pokemon.iconUrl || pokemon.imageUrl ||
    pokemon.sprite || pokemon.sprites?.front_default ||
    pokemon.sprites?.other?.['official-artwork']?.front_default;
  if (url) return url;
  const num = pokemon.originalNumber || pokemon.number;
  return num
    ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${num}.png`
    : '';
}

// onSelect(pokemon) — single pick mode
// onClose() — close without selecting
export default function PokemonPickerModal({ allPokemon = [], onSelect, onClose }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [generationFilter, setGenerationFilter] = useState('1');
  const [typeFilter, setTypeFilter] = useState('all');
  const [showRegionalForms, setShowRegionalForms] = useState(true);

  const filtered = useMemo(() => {
    const effectiveGenFilter = searchQuery ? 'all' : generationFilter;
    return allPokemon.filter(p => {
      if (!showRegionalForms && p.isRegionalForm) return false;
      if (effectiveGenFilter !== 'all' && parseInt(p.generation) !== parseInt(effectiveGenFilter)) return false;
      if (typeFilter !== 'all' && p.type !== typeFilter && p.type2 !== typeFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const num = p.number?.toString() || '';
        const origNum = p.originalNumber?.toString() || '';
        if (
          !p.name?.toLowerCase().includes(q) &&
          !p.nameEn?.toLowerCase().includes(q) &&
          !num.includes(q) &&
          !origNum.includes(q)
        ) return false;
      }
      return true;
    });
  }, [allPokemon, searchQuery, generationFilter, typeFilter, showRegionalForms]);

  return (
    <div className="fixed inset-0 z-[9500] flex items-center justify-center bg-black/60 p-4">
      <div className="flex w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl" style={{ maxHeight: '85vh' }}>
        {/* 헤더 */}
        <div className="flex items-center justify-between border-b px-5 py-3">
          <h3 className="font-bold text-gray-900">포켓몬 선택</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
        </div>

        {/* 필터 */}
        <div className="flex flex-wrap gap-2 border-b px-4 py-3">
          <input
            type="text"
            autoFocus
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="이름 또는 번호로 검색..."
            className="flex-1 min-w-[160px] rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
          />
          <select
            value={generationFilter}
            onChange={e => setGenerationFilter(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
          >
            <option value="all">전체 세대</option>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(gen => (
              <option key={gen} value={gen}>{gen}세대</option>
            ))}
          </select>
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
          >
            <option value="all">전체 타입</option>
            {Object.keys(TYPE_COLORS).map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
          <button
            onClick={() => setShowRegionalForms(v => !v)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
              showRegionalForms
                ? 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Globe size={14} />
            {showRegionalForms ? '리전폼 포함' : '원종만'}
          </button>
        </div>

        {/* 그리드 */}
        <div className="overflow-y-scroll p-3" style={{ scrollbarWidth: 'thin' }}>
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-gray-400">검색 결과가 없습니다</div>
          ) : (
            <div className="grid grid-cols-5 gap-2 sm:grid-cols-6 md:grid-cols-7">
              {filtered.map(pokemon => (
                <button
                  key={pokemon.id || pokemon.number || pokemon.nameEn}
                  onClick={() => onSelect(pokemon)}
                  className="flex flex-col items-center rounded-lg border-2 border-gray-200 p-2 transition-all hover:border-indigo-400 hover:bg-indigo-50"
                >
                  {(() => {
                    const { base, region } = splitRegionalName(pokemon);
                    return (
                      <>
                        <div className="flex h-16 w-full items-center justify-center">
                          <img
                            src={getPokemonImageUrl(pokemon)}
                            alt={pokemon.name}
                            className="h-14 w-14 object-contain"
                            style={{ imageRendering: 'pixelated' }}
                            loading="lazy"
                            onError={e => {
                              e.target.src = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/0.png';
                            }}
                          />
                        </div>
                        <p className="w-full truncate text-center text-xs font-semibold text-gray-800">{base}</p>
                        {region
                          ? <p className="text-[9px] text-indigo-500 font-medium">{region}</p>
                          : <p className="text-[10px] text-gray-400">No.{pokemon.number}</p>
                        }
                        {region && <p className="text-[9px] text-gray-400">No.{pokemon.number}</p>}
                        <div className="mt-1 flex gap-0.5">
                          {pokemon.type && (
                            <span className={`rounded px-1 text-[9px] font-bold text-white ${TYPE_COLORS[pokemon.type] || 'bg-gray-400'}`}>
                              {pokemon.type}
                            </span>
                          )}
                          {pokemon.type2 && (
                            <span className={`rounded px-1 text-[9px] font-bold text-white ${TYPE_COLORS[pokemon.type2] || 'bg-gray-400'}`}>
                              {pokemon.type2}
                            </span>
                          )}
                        </div>
                      </>
                    );
                  })()}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
