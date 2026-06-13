import React, { useState } from 'react';
import { Search, Lock, CheckCircle, Edit2, MapPin } from 'lucide-react';
import { COLORS } from '../../styles/theme';
import { getPokemonDisplayParts } from '../../utils/pokemonDisplayName';

const TYPE_COLORS = COLORS.types;


function getRegionalFormLabel(pokemon = {}) {
  const displayParts = getPokemonDisplayParts(pokemon);
  return displayParts.formLabel || displayParts.name;
}

const toDexNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export default function PokedexView({
  pokedex = [],
  allPokedex = [],
  caughtPokemon = [],
  pokedexData = {},
  regions = [],
  currentUser = null,
  onUpdateMemo,
  onUpdatePokedexRegions,
  isMobile = false,
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPokemon, setSelectedPokemon] = useState(null);
  const [selectedForm, setSelectedForm] = useState(null);
  const [isEditingMemo, setIsEditingMemo] = useState(false);
  const [memoText, setMemoText] = useState('');
  const [isEditingRegions, setIsEditingRegions] = useState(false);
  const [editableRegions, setEditableRegions] = useState([]);

  const myCaughtNumbers = new Set(
    caughtPokemon
      .flatMap(p => p ? [p.number, p.originalNumber] : [])
      .map(toDexNumber)
      .filter(Boolean)
  );
  const unlockedNumbers = new Set([
    ...Object.keys(pokedexData).map(toDexNumber).filter(Boolean),
    ...myCaughtNumbers
  ]);
  const gamePokedexNumbers = new Set(
    pokedex.map(pokemon => toDexNumber(pokemon.number)).filter(Boolean)
  );

  const isPokemonUnlocked = (pokemon = {}) => {
    const number = toDexNumber(pokemon.number);
    const originalNumber = toDexNumber(pokemon.originalNumber);

    if (number && unlockedNumbers.has(number)) return true;
    if (originalNumber && unlockedNumbers.has(originalNumber)) return true;

    return allPokedex.some(form => (
      form.originalNumber === pokemon.number &&
      gamePokedexNumbers.has(toDexNumber(form.number)) &&
      unlockedNumbers.has(toDexNumber(form.number))
    ));
  };

  const getPokedexEntryWithKey = (pokemon = {}) => {
    const number = toDexNumber(pokemon.number);
    const originalNumber = toDexNumber(pokemon.originalNumber);
    const entryByNumber = number ? pokedexData[number] : null;
    const entryByOriginal = originalNumber ? pokedexData[originalNumber] : null;

    if (entryByNumber && entryByOriginal && number !== originalNumber) {
      const mergedEntry = {
        ...entryByOriginal,
        ...entryByNumber,
        firstEncounter: entryByNumber.firstEncounter || entryByOriginal.firstEncounter,
        encounteredAt: entryByNumber.encounteredAt || entryByOriginal.encounteredAt,
        firstCatcher: entryByNumber.firstCatcher || entryByOriginal.firstCatcher,
        caughtBy: entryByNumber.caughtBy || entryByOriginal.caughtBy,
        caughtAt: entryByNumber.caughtAt || entryByOriginal.caughtAt,
        memo: entryByNumber.memo || entryByOriginal.memo || null,
        regions: entryByNumber.regions?.length ? entryByNumber.regions : (entryByOriginal.regions || [])
      };

      return {
        entry: mergedEntry,
        key: entryByOriginal.firstCatcher ? originalNumber : number
      };
    }

    if (entryByOriginal) {
      return { entry: entryByOriginal, key: originalNumber };
    }

    if (entryByNumber) {
      return { entry: entryByNumber, key: number };
    }

    return { entry: null, key: originalNumber || number };
  };

  const getPokedexEntry = (pokemon = {}) => {
    return getPokedexEntryWithKey(pokemon).entry;
  };

  // 영운 도감에 등록된 포켓몬은 해금 전에도 카드로 표시
  const visiblePokedex = pokedex.filter(pokemon => {
    const isRegionalForm = pokemon.originalNumber && pokemon.originalNumber !== pokemon.number;

    if (isRegionalForm) {
      // 원종이 영운 도감에 있으면 원종 카드 안의 폼 탭으로만 표시
      if (gamePokedexNumbers.has(toDexNumber(pokemon.originalNumber))) {
        return false;
      }

      // 원종이 영운 도감에 없고 리전폼만 등록되어 있으면 리전폼 카드로 표시
      return true;
    }

    return true;
  });

  const filteredPokedex = visiblePokedex.filter(pokemon => {
    if (!searchTerm) return true;
    if (!isPokemonUnlocked(pokemon)) return false;

    const query = searchTerm.toLowerCase();
    return (
      pokemon.name.toLowerCase().includes(query) ||
      pokemon.nameEn?.toLowerCase().includes(query) ||
      (pokemon.newNumber && pokemon.newNumber.toString().includes(query)) ||
      (pokemon.originalNumber && pokemon.originalNumber.toString().includes(query))
    );
  });

  const unlockedCount = visiblePokedex.filter(isPokemonUnlocked).length;
  const totalCount = visiblePokedex.length;
  const percentage = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0;

  const getPokemonRegions = (pokemon) => {
    // 由ъ쟾?쇱? ?먯떊??number濡?癒쇱? ?뺤씤, ?놁쑝硫?originalNumber濡??뺤씤
    const pokemonNumber = pokemon.number;
    const pokemonOriginalNumber = pokemon.originalNumber || pokemon.number;

    console.log('?뿺截?異쒗쁽 吏??寃??', pokemon.name, 'number:', pokemon.number, 'originalNumber:', pokemon.originalNumber);

    const getCurrentRegionLabels = () => {
      const labelSet = new Set();

      (regions || []).forEach(region => {
        if (!region || region.isTownMeta || !region.name) return;

        labelSet.add(region.name);
        const places = Array.isArray(region.places) ? region.places : [];
        places.forEach(place => {
          if (place?.name) {
            labelSet.add(`${region.name} ${place.name}`);
          }
        });
      });

      return labelSet;
    };

    const filterActiveRegions = (regionNames = []) => {
      const currentLabels = getCurrentRegionLabels();
      if (currentLabels.size === 0) return [];
      return regionNames.filter(regionName => currentLabels.has(regionName));
    };

    // 1. ?섎룞 ?깅줉: 由ъ쟾???먯껜 踰덊샇濡?癒쇱? ?뺤씤
    const entryByNumber = pokedexData[pokemonNumber];
    if (entryByNumber?.regions && entryByNumber.regions.length > 0) {
      const activeRegions = filterActiveRegions(entryByNumber.regions);
      if (activeRegions.length > 0) {
        console.log('  ???섎룞 ?깅줉??吏??(?먯껜 踰덊샇):', activeRegions);
        return activeRegions;
      }
    }

    // 2. ?섎룞 ?깅줉: ?먯쥌 踰덊샇濡??뺤씤 (?대갚)
    const entryByOriginal = pokedexData[pokemonOriginalNumber];
    if (entryByOriginal?.regions && entryByOriginal.regions.length > 0) {
      const activeRegions = filterActiveRegions(entryByOriginal.regions);
      if (activeRegions.length > 0) {
        console.log('  ???섎룞 ?깅줉??吏??(?먯쥌 踰덊샇):', activeRegions);
        return activeRegions;
      }
    }

    if (!regions || regions.length === 0) return [];

    const hasPokemonId = (pokemonIds = []) => (
      Array.isArray(pokemonIds) && (
        pokemonIds.includes(pokemon.id) ||
        pokemonIds.includes(pokemonNumber) ||
        pokemonIds.includes(pokemonOriginalNumber)
      )
    );

    // 3. ?먮룞 寃?? ?μ냼蹂?異쒗쁽 ?ㅼ젙 ?곗꽑, 湲곗〈 吏???ㅼ젙? ?대갚
    const foundRegions = regions
      .filter(region => !region?.isTownMeta)
      .flatMap(region => {
      const regionLabel = region.name;
      const places = Array.isArray(region.places) ? region.places : [];
      const matchedPlaces = places
        .filter(place => hasPokemonId(place.pokemons))
        .map(place => `${regionLabel} ${place.name}`);

      if (matchedPlaces.length > 0) {
        console.log('  ???μ냼 諛쒓껄:', regionLabel, matchedPlaces);
        return matchedPlaces;
      }

      if (hasPokemonId(region.pokemons)) {
        console.log('  ??吏??諛쒓껄:', region.name, 'pokemons:', region.pokemons.slice(0, 5), '...');
        return [regionLabel];
      }

      return [];
    });

    console.log('  ??理쒖쥌 異쒗쁽 吏??', foundRegions);
    return foundRegions;
  };

  const getEditableRegionOptions = () => (
    (regions || []).filter(region => !region?.isTownMeta).flatMap(region => {
      const regionLabel = region.name;
      const places = Array.isArray(region.places) ? region.places.filter(place => place?.name) : [];

      if (places.length > 0) {
        return places.map(place => ({
          id: `${region.id}__place__${place.id}`,
          label: `${regionLabel} ${place.name}`
        }));
      }

      return [{ id: region.id, label: regionLabel }];
    })
  );

  // 由ъ쟾??寃??(?꾩껜 ?꾧컧?먯꽌, ?닿툑??寃껊쭔)
  const getRegionalForms = (pokemon) => {
    if (!pokemon || !allPokedex || allPokedex.length === 0) return [];

    const baseNumber = pokemon.originalNumber || pokemon.number;

    const forms = allPokedex.filter(p => {
      // 由ъ쟾??議곌굔: originalNumber瑜?媛吏怨??덇퀬, ?먯쥌怨??ㅻⅨ 踰덊샇
      const isRegionalForm = p.originalNumber && p.originalNumber !== p.number;
      // 媛숈? ?먯쥌 媛議?
      const isSameFamily = p.originalNumber === baseNumber || (p.originalNumber && p.originalNumber === pokemon.number);
      // ?먭린 ?먯떊 ?쒖쇅
      const isDifferent = p.number !== pokemon.number;
      // ?닿툑 ?щ?
      const isUnlocked = gamePokedexNumbers.has(toDexNumber(p.number)) &&
        unlockedNumbers.has(toDexNumber(p.number));

      return isRegionalForm && isSameFamily && isDifferent && isUnlocked;
    });

    console.log('?뵇 由ъ쟾??寃??', pokemon.name, 'baseNumber:', baseNumber, 'forms:', forms.map(f => `${f.name}(${f.number})`));
    return forms;
  };

  // ?먯쥌 李얘린 (?꾩껜 ?꾧컧?먯꽌, ?닿툑??寃껊쭔)
  const getOriginalForm = (pokemon) => {
    if (!pokemon || !allPokedex || allPokedex.length === 0) return null;

    // ?꾩옱 ?ъ폆紐ъ씠 由ъ쟾?쇱씤 寃쎌슦?먮쭔 ?먯쥌 李얘린
    const isRegionalForm = pokemon.originalNumber && pokemon.originalNumber !== pokemon.number;

    if (isRegionalForm) {
      const original = allPokedex.find(p =>
        p.number === pokemon.originalNumber &&
        unlockedNumbers.has(p.number) // ?먯쥌???닿툑?섏뼱?????쒖떆
      );
      console.log('원종 검색:', pokemon.name, '=>', original?.name, '해금:', original ? unlockedNumbers.has(original.number) : false);
      return original;
    }

    return null;
  };

  const handlePokemonClick = (pokemon) => {
    if (!isPokemonUnlocked(pokemon)) return;

    setSelectedPokemon(pokemon);

    // 狩??먯쥌???닿툑?섏뼱 ?덉쑝硫??먯쥌遺?? ?꾨땲硫??닿툑??泥?踰덉㎏ 由ъ쟾??
    if (unlockedNumbers.has(toDexNumber(pokemon.number))) {
      setSelectedForm(pokemon);
    } else {
      // ?먯쥌???닿툑 ???먯쑝硫?由ъ쟾??以??닿툑??寃?李얘린
      const unlockedRegionalForm = allPokedex.find(p =>
        p.originalNumber === pokemon.number &&
        gamePokedexNumbers.has(toDexNumber(p.number)) &&
        unlockedNumbers.has(toDexNumber(p.number))
      );
      setSelectedForm(unlockedRegionalForm || pokemon);
    }

    setIsEditingMemo(false);
    setIsEditingRegions(false);

    const entry = getPokedexEntry(pokemon);
    setMemoText(entry?.memo || '');
  };

  const handleSaveMemo = () => {
    if (!selectedPokemon || !onUpdateMemo) return;

    const { entry, key } = getPokedexEntryWithKey(selectedForm || selectedPokemon);

    if (entry && entry.firstCatcher === currentUser?.name) {
      onUpdateMemo(key, memoText);
      setIsEditingMemo(false);
    } else {
      alert('최초 포획자만 메모를 작성할 수 있습니다!');
    }
  };

  const handleEditMemo = () => {
    const { entry } = getPokedexEntryWithKey(selectedForm || selectedPokemon);
    if (entry && entry.firstCatcher === currentUser?.name) {
      setIsEditingMemo(true);
    } else {
      alert('최초 포획자만 메모를 작성할 수 있습니다!');
    }
  };

  const handleStartEditRegions = () => {
    const pokemonRegions = getPokemonRegions(selectedPokemon);
    setEditableRegions(pokemonRegions);
    setIsEditingRegions(true);
  };

  const toggleRegion = (regionName) => {
    setEditableRegions(prev =>
      prev.includes(regionName)
        ? prev.filter(r => r !== regionName)
        : [...prev, regionName]
    );
  };

  const handleSaveRegions = () => {
    const pokemonOriginalNumber = selectedPokemon.originalNumber || selectedPokemon.number;
    if (onUpdatePokedexRegions) {
      onUpdatePokedexRegions(pokemonOriginalNumber, editableRegions);
    }
    setIsEditingRegions(false);
  };

  const getPokemonSpriteUrl = (pokemon) => (
    `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.number}.png`
  );

  if (isMobile) {
    return (
      <div style={{ padding: '72px 12px 80px', minHeight: '100%', color: '#2a3d1a' }}>
        {/* 검색 */}
        <div style={{ position: 'relative', marginBottom: 14 }}>
          <Search size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#7a9a50' }} />
          <input
            type="text"
            placeholder="포켓몬 이름 검색"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{
              width: '100%', boxSizing: 'border-box',
              padding: '9px 12px 9px 34px',
              background: 'rgba(255,255,255,0.88)',
              border: '1px solid rgba(120,175,60,0.35)',
              borderRadius: 12, color: '#2a3d1a',
              fontSize: 13, outline: 'none',
              boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
            }}
          />
        </div>

        {/* 그리드 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 7 }}>
          {filteredPokedex.map((pokemon) => {
            const currentNumber = toDexNumber(pokemon.number);
            const isUnlocked = isPokemonUnlocked(pokemon);
            const isCaught = myCaughtNumbers.has(currentNumber);

            let displayPokemon = pokemon;
            const unlockedRegionalForm = allPokedex.find(p =>
              p.originalNumber === pokemon.number &&
              gamePokedexNumbers.has(toDexNumber(p.number)) &&
              unlockedNumbers.has(toDexNumber(p.number))
            );
            const myCaughtRegionalForm = allPokedex.find(p =>
              p.originalNumber === pokemon.number &&
              gamePokedexNumbers.has(toDexNumber(p.number)) &&
              myCaughtNumbers.has(toDexNumber(p.number))
            );
            if (myCaughtRegionalForm && !myCaughtNumbers.has(currentNumber)) {
              displayPokemon = myCaughtRegionalForm;
            } else if (!unlockedNumbers.has(currentNumber) && unlockedRegionalForm) {
              displayPokemon = unlockedRegionalForm;
            }
            const displayNameParts = getPokemonDisplayParts(displayPokemon);

            return (
              <div
                key={pokemon.number}
                onClick={() => handlePokemonClick(pokemon)}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  padding: '8px 6px 7px',
                  background: isCaught
                    ? 'rgba(220,245,195,0.95)'
                    : isUnlocked
                    ? 'rgba(255,255,255,0.88)'
                    : 'rgba(255,255,255,0.50)',
                  border: `1px solid ${isCaught ? 'rgba(90,154,30,0.35)' : 'rgba(180,210,140,0.4)'}`,
                  borderRadius: 12,
                  cursor: isUnlocked ? 'pointer' : 'default',
                  opacity: isUnlocked ? 1 : 1,
                  gap: 3,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                }}
              >
                <div style={{ width: 64, height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {isUnlocked ? (
                    <img
                      src={getPokemonSpriteUrl(displayPokemon)}
                      alt={displayPokemon.name}
                      style={{ width: 64, height: 64, imageRendering: 'pixelated', objectFit: 'contain' }}
                      loading="lazy"
                    />
                  ) : (
                    <span style={{ fontSize: 28, fontWeight: 900, color: 'rgba(120,160,80,0.35)' }}>?</span>
                  )}
                </div>
                <span style={{ fontSize: 9, fontWeight: 700, color: '#8aaa60', letterSpacing: '0.04em' }}>
                  {pokemon.newNumber ? `No.${String(pokemon.newNumber).padStart(3, '0')}` : `No.${String(currentNumber).padStart(3, '0')}`}
                </span>
                <span style={{
                  fontSize: 10, fontWeight: 600,
                  color: isUnlocked ? '#2a3d1a' : 'rgba(80,110,50,0.65)',
                  lineHeight: 1.2, textAlign: 'center',
                  width: '100%',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {isUnlocked ? displayNameParts.name : '???'}
                </span>
              </div>
            );
          })}
        </div>

        {/* 모바일 도감 팝업 모달 */}
        {selectedPokemon && selectedForm && (
          <div
            style={{
              position: 'fixed', inset: 0, zIndex: 9000,
              background: 'rgba(0,0,0,0.7)',
              display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
              paddingBottom: 64,
              backdropFilter: 'blur(4px)',
            }}
            onClick={() => { setSelectedPokemon(null); setSelectedForm(null); }}
          >
            <div
              className="pokedex-mobile-modal"
              style={{
                width: '100%', maxHeight: '88vh', overflowY: 'auto',
                scrollbarWidth: 'none', msOverflowStyle: 'none',
                background: 'rgba(14,26,14,0.97)',
                border: '1px solid rgba(130,185,65,0.3)',
                borderTop: '1px solid rgba(130,185,65,0.4)',
                borderRadius: 20,
                padding: '20px 16px 28px',
                color: 'rgba(225,248,185,0.95)',
              }}
              onClick={e => e.stopPropagation()}
            >
              {/* 드래그 핸들 */}
              <div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(130,185,65,0.35)', margin: '0 auto 16px' }} />

              {/* 번호 */}
              <div style={{ textAlign: 'center', fontSize: 12, color: 'rgba(170,210,125,0.7)', marginBottom: 4 }}>
                No.{(selectedForm.originalNumber || selectedForm.number).toString().padStart(3, '0')}
              </div>

              {/* 이름 */}
              <div style={{ textAlign: 'center', fontSize: 20, fontWeight: 800, marginBottom: 12 }}>
                {getPokemonDisplayParts(selectedForm).name}
              </div>

              {/* 스프라이트 */}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
                <img
                  src={getPokemonSpriteUrl(selectedForm)}
                  alt={selectedForm.name}
                  style={{ width: 96, height: 96, imageRendering: 'pixelated', objectFit: 'contain' }}
                />
              </div>

              {/* 리전폼 탭 */}
              {(() => {
                const originalForm = selectedPokemon.originalNumber
                  ? getOriginalForm(selectedPokemon)
                  : selectedPokemon;
                const regionalForms = allPokedex.filter(p =>
                  p.originalNumber === (originalForm?.number || selectedPokemon.number) &&
                  p.originalNumber !== p.number &&
                  gamePokedexNumbers.has(toDexNumber(p.number)) &&
                  unlockedNumbers.has(toDexNumber(p.number))
                );
                const allForms = originalForm ? [originalForm, ...regionalForms] : regionalForms;
                if (allForms.length <= 1) return null;
                return (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 14 }}>
                    {allForms.map(form => {
                      const isActive = selectedForm.number === form.number;
                      return (
                        <button
                          key={form.number}
                          onClick={() => setSelectedForm(form)}
                          style={{
                            padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                            border: `1px solid ${isActive ? 'rgba(185,240,90,0.8)' : 'rgba(130,185,65,0.3)'}`,
                            background: isActive ? 'rgba(100,160,42,0.4)' : 'transparent',
                            color: isActive ? 'rgba(195,245,100,1)' : 'rgba(170,210,125,0.7)',
                            cursor: 'pointer',
                          }}
                        >
                          {getPokemonDisplayParts(form).formLabel || '기본형'}
                        </button>
                      );
                    })}
                  </div>
                );
              })()}

              {/* 도감 정보 */}
              {(() => {
                const { entry } = getPokedexEntryWithKey(selectedForm);
                if (!entry) {
                  return (
                    <div style={{ textAlign: 'center', color: 'rgba(170,210,125,0.5)', fontSize: 13, padding: '12px 0' }}>
                      아직 발견 기록이 없습니다.
                    </div>
                  );
                }
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {entry.firstCatcher && (
                      <div style={{ background: 'rgba(30,52,20,0.65)', border: '1px solid rgba(130,185,65,0.2)', borderRadius: 10, padding: '10px 14px' }}>
                        <div style={{ fontSize: 11, color: 'rgba(170,210,125,0.65)', marginBottom: 3 }}>최초 포획</div>
                        <div style={{ fontSize: 14, fontWeight: 700 }}>{entry.firstCatcher}</div>
                      </div>
                    )}
                    {entry.firstEncounter && (
                      <div style={{ background: 'rgba(30,52,20,0.65)', border: '1px solid rgba(130,185,65,0.2)', borderRadius: 10, padding: '10px 14px' }}>
                        <div style={{ fontSize: 11, color: 'rgba(170,210,125,0.65)', marginBottom: 3 }}>최초 조우</div>
                        <div style={{ fontSize: 13 }}>{entry.firstEncounter}</div>
                      </div>
                    )}
                    {entry.memo && (
                      <div style={{ background: 'rgba(30,52,20,0.45)', border: '1px solid rgba(130,185,65,0.15)', borderRadius: 10, padding: '10px 14px', fontStyle: 'italic', fontSize: 13, color: 'rgba(200,235,155,0.8)' }}>
                        "{entry.memo}"
                      </div>
                    )}
                  </div>
                );
              })()}

              <button
                onClick={() => { setSelectedPokemon(null); setSelectedForm(null); }}
                style={{
                  marginTop: 18, width: '100%', padding: '12px',
                  borderRadius: 10, border: 'none',
                  background: 'rgba(100,160,42,0.4)',
                  color: 'rgba(195,245,100,1)',
                  fontSize: 14, fontWeight: 700, cursor: 'pointer',
                }}
              >
                닫기
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-4 text-[#26351f]">
      {/* 헤더 */}
      <div className="rounded-lg border border-[#b7d982] bg-[#eef7df]/90 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-[#26351f]">포켓몬 도감</h2>
          <div className="text-right">
            <div className="text-3xl font-bold text-[#4f741f]">{unlockedCount}/{totalCount}</div>
            <div className="text-sm text-[#627a3a]">발견 {percentage}%</div>
            <div className="text-xs text-[#82965d] mt-1">
              내가 잡은 포켓몬 {myCaughtNumbers.size}마리
            </div>
          </div>
        </div>

        <div className="w-full rounded-full h-3 bg-[#dbeabf]">
          <div
            className="h-3 rounded-full bg-gradient-to-r from-[#2f4a24] via-[#7fa438] to-[#c7e57d] transition-all duration-300"
            style={{ width: `${percentage}%` }}
          />
        </div>

        <div className="mt-4 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#789252]" size={20} />
          <input
            type="text"
            placeholder="해금된 포켓몬 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-[#a7c86f] bg-[#f8fbef]/90 py-2 pl-10 pr-4 text-[#26351f] placeholder:text-[#7f9360] focus:outline-none focus:ring-2 focus:ring-[#9fcf45]"
          />
        </div>
      </div>

      {/* 도감 그리드 */}
      <div className="flex-1 overflow-y-auto rounded-lg border border-[#b7d982] bg-[#f3f8e8]/75 p-6">
        {filteredPokedex.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-[#819665]">
            <Lock size={64} className="mb-4" />
            <p className="text-lg font-semibold">
              {searchTerm ? '검색 결과가 없습니다' : '아직 발견한 포켓몬이 없습니다'}
            </p>
            <p className="text-sm mt-2">모험을 떠나 새로운 포켓몬을 만나보세요</p>
          </div>
        ) : (
          <div className="grid grid-cols-6 gap-4">
            {filteredPokedex.map((pokemon) => {
              const originalNumber = pokemon.originalNumber || pokemon.number;
              const currentNumber = toDexNumber(pokemon.number);
              const originalDexNumber = toDexNumber(originalNumber);
              const isMyCaught = myCaughtNumbers.has(currentNumber) || myCaughtNumbers.has(originalDexNumber);
              const isUnlocked = isPokemonUnlocked(pokemon);
              const entry = getPokedexEntry(pokemon);
              const hasNote = entry?.memo;

              // 狩?移대뱶???쒖떆???ъ폆紐?寃곗젙: ?먯쥌???닿툑?섎㈃ ?먯쥌, ?꾨땲硫??닿툑??泥?由ъ쟾??
              let displayPokemon = pokemon;
              const unlockedRegionalForm = allPokedex.find(p =>
                p.originalNumber === pokemon.number &&
                gamePokedexNumbers.has(toDexNumber(p.number)) &&
                unlockedNumbers.has(toDexNumber(p.number))
              );
              const myCaughtRegionalForm = allPokedex.find(p =>
                p.originalNumber === pokemon.number &&
                gamePokedexNumbers.has(toDexNumber(p.number)) &&
                myCaughtNumbers.has(toDexNumber(p.number))
              );
              if (myCaughtRegionalForm && !myCaughtNumbers.has(currentNumber)) {
                displayPokemon = myCaughtRegionalForm;
              } else if (!unlockedNumbers.has(currentNumber) && unlockedRegionalForm) {
                displayPokemon = unlockedRegionalForm;
              }
              const displayNameParts = getPokemonDisplayParts(displayPokemon);

              return (
                <div
                  key={pokemon.number}
                  onClick={() => handlePokemonClick(pokemon)}
                  className={`relative rounded-lg border-2 p-3 text-center transition-all ${
                    isUnlocked
                      ? 'border-[#a9cc62] bg-transparent cursor-pointer hover:shadow-lg hover:shadow-[#6d8f2f]/20 hover:scale-105 hover:border-[#7fa438]'
                      : 'border-[#d4e4b5] bg-transparent opacity-45'
                  }`}
                >
                  {isMyCaught && (
                    <div className="absolute top-1 left-1 rounded bg-[#6f8f25] px-1.5 py-0.5 text-xs font-bold text-white">
                      보유
                    </div>
                  )}

                  <div className="mb-2 text-xs font-bold text-[#6f804f]">
                    No.{(pokemon.newNumber || pokemon.number).toString().padStart(3, '0')}
                  </div>

                  <div className={`flex w-full items-center justify-center bg-transparent ${isUnlocked ? 'mb-2 h-24' : 'h-36'}`}>
                    {isUnlocked ? (
                      <img
                        src={getPokemonSpriteUrl(displayPokemon)}
                        alt={displayPokemon.name}
                        className="pokedex-card-sprite"
                        loading="lazy"
                      />
                    ) : (
                      <span className="text-5xl font-black text-[#8fa66a] drop-shadow-sm">?</span>
                    )}
                  </div>

                  {isUnlocked && (
                    <div className="min-h-[36px]">
                      <div className="truncate text-sm font-bold text-[#26351f]">
                        {displayNameParts.name}
                      </div>
                      {displayNameParts.formLabel && (
                        <div className="mt-0.5 truncate text-[11px] font-semibold text-[#7c9157]">
                          {displayNameParts.formLabel}
                        </div>
                      )}
                    </div>
                  )}

                  {isUnlocked && (
                    <div className="flex gap-1 justify-center mt-2">
                      <span
                        className="text-xs px-2 py-0.5 rounded font-bold text-white"
                        style={{ backgroundColor: TYPE_COLORS[displayPokemon.type]?.bg || '#777' }}
                      >
                        {displayPokemon.type}
                      </span>
                      {displayPokemon.type2 && (
                        <span
                          className="text-xs px-2 py-0.5 rounded font-bold text-white"
                          style={{ backgroundColor: TYPE_COLORS[displayPokemon.type2]?.bg || '#777' }}
                        >
                          {displayPokemon.type2}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="absolute top-2 right-2 flex gap-1">
                    {entry?.firstCatcher && (
                      <div className="relative group">
                        <CheckCircle size={16} className="text-[#a7b92d]" />
                        <div className="absolute bottom-full right-0 mb-1 px-2 py-1 bg-[#21351f] text-[#f2f8de] text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                          최초 포획: {entry.firstCatcher}
                        </div>
                      </div>
                    )}
                    {hasNote && (
                      <Edit2 size={14} className="text-[#6f8f25]" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 상세 정보 모달 */}
      {selectedPokemon && selectedForm && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => {
            setSelectedPokemon(null);
            setSelectedForm(null);
          }}
        >
          <div
            className="m-4 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-[#b7d982] bg-[#f4f8e8] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center">
              {/* 도감 번호 */}
              <div className="mb-2 text-sm text-[#6f804f]">
                {(() => {
                  const displayNumber = selectedForm.originalNumber || selectedForm.number;
                  const baseForm = selectedForm.originalNumber
                    ? allPokedex.find(p => p.number === selectedForm.originalNumber && !p.originalNumber)
                    : selectedForm;

                  return (
                    <>
                      No.{displayNumber.toString().padStart(3, '0')}
                      {baseForm?.newNumber && (
                        <span className="ml-2 text-xs">
                          (영운 도감 No.{baseForm.newNumber.toString().padStart(3, '0')})
                        </span>
                      )}
                    </>
                  );
                })()}
              </div>

              {/* 리전폼 */}
              {(() => {
                // ?꾩옱 ?좏깮???ъ폆紐ъ씠 ?먯쥌?몄? 由ъ쟾?쇱씤吏 ?뺤씤
                const isCurrentRegionalForm = selectedPokemon.originalNumber &&
                                              selectedPokemon.originalNumber !== selectedPokemon.number;

                let originalForm = null;
                let regionalForms = [];

                if (isCurrentRegionalForm) {
                  // 由ъ쟾??移대뱶 ?대┃: ?먯쥌 + ?ㅻⅨ 由ъ쟾?쇰뱾
                  originalForm = getOriginalForm(selectedPokemon);
                  regionalForms = getRegionalForms(selectedPokemon);
                } else {
                  // ?먯쥌 移대뱶 ?대┃: ?먯쥌 ?먯떊 + 由ъ쟾?쇰뱾
                  originalForm = selectedPokemon;
                  regionalForms = allPokedex.filter(p =>
                    p.originalNumber === selectedPokemon.number &&
                    p.originalNumber !== p.number &&
                    gamePokedexNumbers.has(toDexNumber(p.number)) &&
                    unlockedNumbers.has(toDexNumber(p.number))
                  );
                }

                const hasForms = regionalForms.length > 0;

                return hasForms && (
                  <div className="mb-4 flex flex-wrap gap-2 justify-center">
                    {/* 원종 버튼 */}
                    {originalForm && gamePokedexNumbers.has(toDexNumber(originalForm.number)) && unlockedNumbers.has(toDexNumber(originalForm.number)) && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedForm(originalForm);
                        }}
                        className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                          selectedForm.number === originalForm.number
                            ? 'bg-[#4f741f] text-white shadow-lg'
                            : 'bg-[#e2edc6] text-[#2f4a24] hover:bg-[#d0e69b]'
                        }`}
                      >
                        {getPokemonDisplayParts(originalForm).formLabel || '원종'}
                      </button>
                    )}

                    {/* 리전폼 버튼 */}
                    {regionalForms.map(form => {
                      const regionName = getRegionalFormLabel(form);

                      return (
                        <button
                          key={form.number}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedForm(form);
                          }}
                          className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                            selectedForm.number === form.number
                              ? 'bg-[#4f741f] text-white shadow-lg'
                              : 'bg-[#e2edc6] text-[#2f4a24] hover:bg-[#d0e69b]'
                          }`}
                        >
                          {regionName}
                        </button>
                      );
                    })}
                  </div>
                );
              })()}

              {/* 포켓몬 이미지 */}
              <img
                src={getPokemonSpriteUrl(selectedForm)}
                alt={selectedForm.name}
                className="pokedex-modal-sprite mx-auto mb-4 bg-transparent"
              />

              {/* 이름 */}
              <h3 className="mb-2 text-2xl font-bold text-[#26351f]">
                {getPokemonDisplayParts(selectedForm).name}
              </h3>
              {getPokemonDisplayParts(selectedForm).formLabel && (
                <div className="mb-3 text-sm font-semibold text-[#7c9157]">
                  {getPokemonDisplayParts(selectedForm).formLabel}
                </div>
              )}
              {/* 타입 */}
              <div className="flex gap-2 justify-center mb-4">
                <span
                  className="px-3 py-1 rounded font-bold text-white"
                  style={{ backgroundColor: TYPE_COLORS[selectedForm.type]?.bg || '#777' }}
                >
                  {selectedForm.type}
                </span>
                {selectedForm.type2 && (
                  <span
                    className="px-3 py-1 rounded font-bold text-white"
                    style={{ backgroundColor: TYPE_COLORS[selectedForm.type2]?.bg || '#777' }}
                  >
                    {selectedForm.type2}
                  </span>
                )}
              </div>

              <div className="mb-4 grid gap-3 md:grid-cols-2">
              {/* 출현 지역 */}
              <div className="rounded border border-[#b7d982] bg-[#eef7df] p-3 text-left">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <MapPin size={16} className="text-[#4f741f]" />
                    <div className="text-sm font-semibold text-gray-700">출현 지역</div>
                  </div>
                  {currentUser?.isAdmin && !isEditingRegions && (
                    <button
                      onClick={handleStartEditRegions}
                      className="rounded bg-[#d9e9ad] px-2 py-1 text-xs font-semibold text-[#355421] hover:bg-[#c7e57d]"
                    >
                      편집
                    </button>
                  )}
                </div>

                {isEditingRegions ? (
                  <div className="space-y-2">
                    {getEditableRegionOptions().map(region => (
                      <label key={region.id} className="flex items-center gap-2 cursor-pointer hover:bg-[#d9e9ad] p-1 rounded">
                        <input
                          type="checkbox"
                          checked={editableRegions.includes(region.label)}
                          onChange={() => toggleRegion(region.label)}
                          className="h-4 w-4 text-[#5f8228]"
                        />
                        <span className="text-sm text-gray-700">{region.label}</span>
                      </label>
                    ))}
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={handleSaveRegions}
                        className="flex-1 rounded bg-[#4f741f] px-3 py-1 text-sm font-semibold text-white hover:bg-[#385b1f]"
                      >
                        저장
                      </button>
                      <button
                        onClick={() => setIsEditingRegions(false)}
                        className="flex-1 rounded bg-[#d7e7b8] px-3 py-1 text-sm font-semibold text-[#2f4a24] hover:bg-[#c6dc93]"
                      >
                        취소
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-[#536b35]">
                    {(() => {
                      // ?꾩옱 ?좏깮???쇱쓽 異쒗쁽 吏???쒖떆
                      const pokemonRegions = getPokemonRegions(selectedForm);
                      return pokemonRegions.length > 0
                        ? pokemonRegions.join(', ')
                        : '출현 지역 정보가 없습니다';
                    })()}
                  </div>
                )}
              </div>

              {/* 최초 포획 및 조우 정보 */}
              {(() => {
                const entry = getPokedexEntry(selectedForm) || getPokedexEntry(selectedPokemon);

                if (!entry || (!entry.firstCatcher && !entry.firstEncounter)) return null;

                if (entry.firstCatcher) {
                  return (
                    <div className="rounded border border-[#d2df87] bg-[#f4f8d8] p-4 text-left">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm font-semibold text-gray-700">
                          최초 포획: {entry.firstCatcher}
                        </div>
                        {entry.firstCatcher === currentUser?.name && !isEditingMemo && (
                          <button
                            onClick={handleEditMemo}
                            className="text-[#5f8228] hover:text-[#385b1f]"
                          >
                            <Edit2 size={16} />
                          </button>
                        )}
                      </div>

                      {isEditingMemo ? (
                        <div>
                          <textarea
                            value={memoText}
                            onChange={(e) => setMemoText(e.target.value)}
                            placeholder="이 포켓몬에 대한 메모를 남겨보세요..."
                            className="w-full resize-none rounded border border-[#a7c86f] bg-[#fbfdf3] p-2 text-sm text-[#26351f] focus:outline-none focus:ring-2 focus:ring-[#9fcf45]"
                            rows="3"
                            maxLength="200"
                          />
                          <div className="flex gap-2 mt-2">
                            <button
                              onClick={handleSaveMemo}
                              className="flex-1 rounded bg-[#4f741f] py-1 text-sm font-semibold text-white hover:bg-[#385b1f]"
                            >
                              저장
                            </button>
                            <button
                              onClick={() => {
                                setIsEditingMemo(false);
                                setMemoText(entry?.memo || '');
                              }}
                              className="flex-1 rounded bg-[#d7e7b8] py-1 text-sm font-semibold text-[#2f4a24] hover:bg-[#c6dc93]"
                            >
                              취소
                            </button>
                          </div>
                        </div>
                      ) : (
                        entry.memo && (
                          <div className="rounded bg-[#fbfdf3] p-2 text-sm italic text-[#536b35]">
                            "{entry.memo}"
                          </div>
                        )
                      )}

                      {!entry.memo && !isEditingMemo &&
                       entry.firstCatcher === currentUser?.name && (
                        <div className="text-xs italic text-[#6f804f]">
                          메모를 남겨보세요
                        </div>
                      )}
                    </div>
                  );
                }

                return (
                  <div className="rounded border border-[#b7d982] bg-[#eef7df] p-4 text-left">
                    <div className="text-sm font-semibold text-gray-700 mb-2">
                      최초 조우: {entry.firstEncounter}
                    </div>
                    <div className="flex items-start gap-2 rounded bg-[#fbfdf3] p-2 text-xs text-[#536b35]">
                      <span>정보</span>
                      <span>아직 아무도 포획하지 않았습니다. 첫 포획자가 되어보세요.</span>
                    </div>
                  </div>
                );
              })()}
              </div>

              <button
                onClick={() => {
                  setSelectedPokemon(null);
                  setSelectedForm(null);
                }}
                className="w-full rounded-lg bg-[#4f741f] py-2 font-semibold text-white hover:bg-[#385b1f]"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
