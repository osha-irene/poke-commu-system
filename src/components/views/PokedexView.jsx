import React, { useState, useMemo } from 'react';
import { Search, Lock, CheckCircle, Edit2, MapPin } from 'lucide-react';
import { COLORS } from '../../styles/theme';
import { getPokemonDisplayParts } from '../../utils/pokemonDisplayName';

const TYPE_COLORS = COLORS.types;


function getRegionalFormLabel(pokemon = {}) {
  const displayParts = getPokemonDisplayParts(pokemon);
  return displayParts.formLabel || displayParts.name;
}

// 호바귀/펌킨인(호화귀)은 사이즈별로 내부 기록(조우/포획/메모)은 그대로 유지하되,
// 도감 화면에서만 폼 탭과 폼 이름 표시를 없애고 하나의 항목처럼 보이게 한다.
const SIZE_UNIFIED_SPECIES = new Set(['pumpkaboo', 'gourgeist']);
const isSizeUnifiedForm = (pokemon = {}) =>
  SIZE_UNIFIED_SPECIES.has(String(pokemon.baseSpeciesEn || '').toLowerCase());

const getDexDisplayParts = (pokemon = {}) => {
  const parts = getPokemonDisplayParts(pokemon);
  if (isSizeUnifiedForm(pokemon)) {
    return { name: pokemon.baseSpecies || parts.name, formLabel: '' };
  }
  return parts;
};

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
  onResetPokedex,
  pokedexActiveTowns = [],
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
  const unlockedNumbers = new Set(
    Object.keys(pokedexData).map(toDexNumber).filter(Boolean)
  );
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

  // 폼(리전폼 등)마다 조우/포획/메모를 독립적으로 기록하기 위해, 해당 폼 자신의
  // number 키에 저장된 항목을 최우선으로 사용한다. 예전에는 원종 쪽 항목이 먼저
  // 잡혀 있으면 폼 탭에서 메모를 저장해도 원종 키로 덮어써져 모든 폼이 메모를
  // 공유해버리는 문제가 있었다 — 폼별 메모 요구사항 때문에 병합을 제거했다.
  const getPokedexEntryWithKey = (pokemon = {}) => {
    const number = toDexNumber(pokemon.number);
    const originalNumber = toDexNumber(pokemon.originalNumber);
    const entryByNumber = number ? pokedexData[number] : null;
    const entryByOriginal = originalNumber ? pokedexData[originalNumber] : null;

    if (entryByNumber) {
      return { entry: entryByNumber, key: number };
    }

    if (entryByOriginal) {
      return { entry: entryByOriginal, key: originalNumber };
    }

    return { entry: null, key: originalNumber || number };
  };

  const getPokedexEntry = (pokemon = {}) => {
    return getPokedexEntryWithKey(pokemon).entry;
  };

  // 활성 마을에 속한 포켓몬 번호 집합 계산
  // pokedexActiveTowns는 "이 마을을 도감에 포함시킬지"만 결정하는 마을 단위 화이트리스트다.
  // 마을/지역의 눈감기(groupVisible/visible)는 여기서도 무시해 실제 출현 여부와 분리하지만,
  // 장소(place)의 눈감기는 이 화이트리스트 안에서도 그대로 존중해야 한다 — 안 그러면
  // "파도" 같은 특정 장소만 숨겨도 소속 마을이 활성 마을이라는 이유로 그대로 새어 나온다.
  // region.pokemons는 places[]를 합쳐놓은 집계 캐시라 places가 있으면 참조하지 않는다.
  const activeTownPokemonNums = useMemo(() => {
    if (!pokedexActiveTowns || pokedexActiveTowns.length === 0) return null;
    const nums = new Set();
    (regions || []).forEach(region => {
      if (region.isTownMeta || !pokedexActiveTowns.includes(region.groupId)) return;
      const places = Array.isArray(region.places) ? region.places : [];

      if (places.length === 0) {
        (region.pokemons || []).forEach(n => nums.add(Number(n)));
        return;
      }

      places.forEach(place => {
        if (place.visible === false) return;
        (place.pokemons || []).forEach(n => nums.add(Number(n)));
      });
    });
    return nums;
  }, [pokedexActiveTowns, regions]);

  // pokedexActiveTowns로 오버라이드되지 않는 일반 경로에서는, 장소(place)의 눈(visible)이
  // 전부 감겨서 어디서도 출현하지 않는 포켓몬은 도감에서 제외한다.
  // 마을/지역의 눈감기는 실제 출현(탐험/스폰) 여부만 결정할 뿐 도감 노출과는 무관하므로
  // 여기서는 참조하지 않는다.
  // 주의: region.pokemons는 독립된 목록이 아니라 소속 places[]의 포켓몬을 합쳐놓은
  // 집계 캐시 필드라서(장소를 편집하면 지역 쪽에도 그대로 미러링됨) 참조하지 않는다.
  // places가 없는 지역(옛 목업 시드처럼 관리 UI 밖에 있는 데이터 포함)의 포켓몬은
  // 장소 단위로 숨길 수 있는 대상이 아니므로 이 계산에서 아예 다루지 않는다 —
  // hiddenOnly에 안 잡히니 기존과 동일하게 계속 보인다.
  const hiddenOnlyPokemonNums = useMemo(() => {
    const visibleNums = new Set();
    const allNums = new Set();

    (regions || []).forEach(region => {
      if (region.isTownMeta) return;

      (region.places || []).forEach(place => {
        const placeVisible = place.visible !== false;
        (place.pokemons || []).forEach(n => {
          const num = Number(n);
          allNums.add(num);
          if (placeVisible) visibleNums.add(num);
        });
      });
    });

    const hiddenOnly = new Set();
    allNums.forEach(num => {
      if (!visibleNums.has(num)) hiddenOnly.add(num);
    });
    return hiddenOnly;
  }, [regions]);

  const passesLocationFilter = (pokemon) => {
    const num = toDexNumber(pokemon.number);
    const orig = toDexNumber(pokemon.originalNumber);
    if (activeTownPokemonNums) {
      return (num && activeTownPokemonNums.has(num)) || (orig && activeTownPokemonNums.has(orig));
    }
    const isHidden = (num && hiddenOnlyPokemonNums.has(num)) || (orig && hiddenOnlyPokemonNums.has(orig));
    return !isHidden;
  };

  // 원종이 실제로 카드로 뜰 예정인 번호만 모아둔다. 장소(마을/눈감기) 필터를 통과하지
  // 못해 원종 카드 자체가 안 뜰 거라면, 리전폼을 "원종 카드 안 폼 탭"으로 숨겨버리면
  // 안 된다 — 원종도 리전폼도 화면에서 통째로 사라지는 문제가 생긴다(예: 팔데아
  // 켄타로스만 장소에 배치돼 있고 원종 켄타로스는 어디에도 배치 안 된 경우).
  const locationVisiblePokedexNumbers = new Set(
    pokedex.filter(passesLocationFilter).map(pokemon => toDexNumber(pokemon.number)).filter(Boolean)
  );

  // 영운 도감에 등록된 포켓몬은 해금 전에도 카드로 표시
  const visiblePokedex = pokedex.filter(pokemon => {
    if (!passesLocationFilter(pokemon)) return false;

    const isRegionalForm = pokemon.originalNumber && pokemon.originalNumber !== pokemon.number;

    if (isRegionalForm) {
      // 원종이 실제로 카드로 뜬다면 원종 카드 안의 폼 탭으로만 표시
      if (
        gamePokedexNumbers.has(toDexNumber(pokemon.originalNumber)) &&
        locationVisiblePokedexNumbers.has(toDexNumber(pokemon.originalNumber))
      ) {
        return false;
      }

      // 원종이 안 뜨거나(장소 필터로 제외 포함) 영운 도감에 없으면 리전폼 카드로 표시
      return true;
    }

    return true;
  });

  const townFilteredPokedex = visiblePokedex;

  const filteredPokedex = townFilteredPokedex.filter(pokemon => {
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

  const unlockedCount = townFilteredPokedex.filter(isPokemonUnlocked).length;
  const totalCount = townFilteredPokedex.length;
  const percentage = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0;

  const getPokemonRegions = (pokemon) => {
    // 由ъ쟾?쇱? ?먯떊??number濡?癒쇱? ?뺤씤, ?놁쑝硫?originalNumber濡??뺤씤
    const pokemonNumber = pokemon.number;
    const pokemonOriginalNumber = pokemon.originalNumber || pokemon.number;

    const pokemonRegionCandidateIds = [
      pokemon.id,
      pokemonNumber,
      pokemonOriginalNumber,
    ]
      .filter(value => value !== undefined && value !== null)
      .map(value => String(value));

    const hasPokemonInCurrentSetting = (pokemonIds = []) => (
      Array.isArray(pokemonIds) &&
      pokemonIds.some(id => pokemonRegionCandidateIds.includes(String(id)))
    );

    // 지도에서 숨김(visible === false) 처리됐거나, 소속 마을 자체가 아직 공개 안
    // 됐으면(groupVisible === false) 출현 장소 목록에서 제외한다.
    const currentSettingRegions = (regions || [])
      .filter(region => region && !region.isTownMeta && region.name && region.visible !== false && region.groupVisible !== false)
      .flatMap(region => {
        const regionLabel = region.name;
        const places = Array.isArray(region.places)
          ? region.places.filter(place => place?.name && place.visible !== false)
          : [];
        const matchedPlaces = places
          .filter(place => hasPokemonInCurrentSetting(place.pokemons))
          .map(place => `${regionLabel} ${place.name}`);

        if (matchedPlaces.length > 0) return matchedPlaces;
        return places.length === 0 && hasPokemonInCurrentSetting(region.pokemons)
          ? [regionLabel]
          : [];
      });

    if (currentSettingRegions.length > 0) {
      return [...new Set(currentSettingRegions)];
    }

    console.log('?뿺截?異쒗쁽 吏??寃??', pokemon.name, 'number:', pokemon.number, 'originalNumber:', pokemon.originalNumber);

    // 여기서는 visible 여부를 걸지 않는다: 관리자가 "편집"으로 수동 지정한 지역은
    // 그 지역이 지도에서 잠시 숨겨져 있어도 그대로 유지/표시되어야 하기 때문.
    // (visible 필터는 자동 감지 경로에만 적용한다.)
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
      .filter(region => !region?.isTownMeta && region?.visible !== false && region?.groupVisible !== false)
      .flatMap(region => {
      const regionLabel = region.name;
      const places = Array.isArray(region.places)
        ? region.places.filter(place => place?.visible !== false)
        : [];
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
    return [...new Set(foundRegions)];
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

      return isRegionalForm && isSameFamily && isDifferent && isUnlocked && !isSizeUnifiedForm(p);
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
    const pokemonRegions = getPokemonRegions(selectedForm || selectedPokemon);
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
    const target = selectedForm || selectedPokemon;
    const pokemonOriginalNumber = target.originalNumber || target.number;
    if (onUpdatePokedexRegions) {
      onUpdatePokedexRegions(pokemonOriginalNumber, editableRegions);
    }
    setIsEditingRegions(false);
  };

  const getPokemonSpriteUrl = (pokemon) => (
    `https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/${pokemon.number}.png`
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
            const displayNameParts = getDexDisplayParts(displayPokemon);

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

        {/* 모바일 도감 팝업 */}
        {selectedPokemon && selectedForm && (
          <div
            style={{
              position: 'fixed', inset: 0, zIndex: 9000,
              background: 'rgba(0,0,0,0.55)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '24px 20px',
              backdropFilter: 'blur(4px)',
            }}
            onClick={() => { setSelectedPokemon(null); setSelectedForm(null); }}
          >
            <div
              style={{
                width: '100%', maxWidth: 260, maxHeight: '80vh', overflowY: 'auto',
                scrollbarWidth: 'none',
                background: 'rgba(255,255,255,0.97)',
                border: '1px solid rgba(160,210,80,0.3)',
                borderRadius: 20,
                padding: '20px 18px 20px',
                position: 'relative',
                color: '#1a2e10',
                boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
              }}
              onClick={e => e.stopPropagation()}
            >
              {/* 우상단 X */}
              <button onClick={() => { setSelectedPokemon(null); setSelectedForm(null); }} style={{
                position: 'absolute', top: 12, right: 14,
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#bbb', fontSize: 18, lineHeight: 1, padding: 4,
              }}>✕</button>

              {/* 번호 + 이름 */}
              <div style={{ fontSize: 19, fontWeight: 800, color: '#1a2e10', marginBottom: 12 }}>
                {getDexDisplayParts(selectedForm).name}
              </div>

              {/* 스프라이트 */}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
                <img src={getPokemonSpriteUrl(selectedForm)} alt={selectedForm.name}
                  style={{ width: 96, height: 96, imageRendering: 'pixelated', objectFit: 'contain' }} />
              </div>

              {/* 리전폼 탭 */}
              {(() => {
                const originalForm = selectedPokemon.originalNumber ? getOriginalForm(selectedPokemon) : selectedPokemon;
                const regionalForms = allPokedex.filter(p =>
                  p.originalNumber === (originalForm?.number || selectedPokemon.number) &&
                  p.originalNumber !== p.number &&
                  gamePokedexNumbers.has(toDexNumber(p.number)) &&
                  unlockedNumbers.has(toDexNumber(p.number)) &&
                  !isSizeUnifiedForm(p)
                );
                const allForms = originalForm ? [originalForm, ...regionalForms] : regionalForms;
                if (allForms.length <= 1) return null;
                return (
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 12 }}>
                    {allForms.map(form => {
                      const isActive = selectedForm.number === form.number;
                      return (
                        <button key={form.number} onClick={() => setSelectedForm(form)} style={{
                          padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                          border: `1.5px solid ${isActive ? '#5a9a20' : 'rgba(120,180,60,0.35)'}`,
                          background: isActive ? '#5a9a20' : 'transparent',
                          color: isActive ? '#fff' : '#5a7a40', cursor: 'pointer',
                        }}>
                          {getPokemonDisplayParts(form).formLabel || '기본형'}
                        </button>
                      );
                    })}
                  </div>
                );
              })()}

              <div style={{ height: 1, background: 'rgba(120,180,60,0.15)', marginBottom: 12 }} />

              {/* 출현 장소 */}
              {(() => {
                const pokemonRegions = getPokemonRegions(selectedForm);
                return (
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 10, color: '#7a9a50', fontWeight: 700, marginBottom: 5 }}>📍 출현 장소</div>
                    <div>
                      {pokemonRegions.length > 0
                        ? pokemonRegions.map((r, i) => (
                            <span key={i} style={{
                              display: 'inline-block',
                              background: 'rgba(220,245,195,0.8)',
                              border: '1px solid rgba(120,180,60,0.25)',
                              borderRadius: 6, padding: '2px 8px',
                              margin: '2px 3px 2px 0', fontSize: 11, color: '#2a3d1a',
                            }}>{r}</span>
                          ))
                        : <span style={{ color: '#bbb', fontSize: 11 }}>정보 없음</span>
                      }
                    </div>
                  </div>
                );
              })()}

              {/* 도감 정보 */}
              {(() => {
                const { entry } = getPokedexEntryWithKey(selectedForm);
                if (!entry) return null;
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {entry.firstCatcher && (
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ fontSize: 12, color: '#2a3d1a' }}>
                            <span style={{ color: '#7a9a50', fontWeight: 700 }}>최초 포획 </span>
                            <span style={{ fontWeight: 700 }}>{entry.firstCatcher}</span>
                          </div>
                          {entry.firstCatcher === currentUser?.name && !isEditingMemo && (
                            <button
                              onClick={handleEditMemo}
                              style={{ background: 'none', border: 'none', padding: 2, cursor: 'pointer', color: '#5f8228', display: 'flex' }}
                              aria-label="메모 편집"
                            >
                              <Edit2 size={14} />
                            </button>
                          )}
                        </div>

                        {isEditingMemo ? (
                          <div style={{ marginTop: 6 }}>
                            <textarea
                              value={memoText}
                              onChange={(e) => setMemoText(e.target.value)}
                              placeholder="이 포켓몬에 대한 메모를 남겨보세요..."
                              maxLength="200"
                              rows="3"
                              style={{
                                width: '100%', boxSizing: 'border-box', resize: 'none',
                                border: '1px solid rgba(120,180,60,0.35)', borderRadius: 8,
                                background: 'rgba(255,255,255,0.9)', padding: 8,
                                fontSize: 12, color: '#26351f', outline: 'none',
                              }}
                            />
                            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                              <button
                                onClick={handleSaveMemo}
                                style={{ flex: 1, borderRadius: 8, background: '#4f741f', color: '#fff', border: 'none', padding: '6px 0', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                              >
                                저장
                              </button>
                              <button
                                onClick={() => { setIsEditingMemo(false); setMemoText(entry?.memo || ''); }}
                                style={{ flex: 1, borderRadius: 8, background: '#d7e7b8', color: '#2f4a24', border: 'none', padding: '6px 0', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                              >
                                취소
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            {entry.memo && (
                              <div style={{ fontSize: 11, color: '#4a6a30', fontStyle: 'italic', borderTop: '1px solid rgba(120,180,60,0.15)', paddingTop: 6, marginTop: 6 }}>
                                "{entry.memo}"
                              </div>
                            )}
                            {!entry.memo && entry.firstCatcher === currentUser?.name && (
                              <div style={{ fontSize: 11, fontStyle: 'italic', color: '#6f804f', marginTop: 4 }}>
                                메모를 남겨보세요
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}
                    {entry.firstEncounter && (
                      <div style={{ fontSize: 12, color: '#2a3d1a' }}>
                        <span style={{ color: '#7a9a50', fontWeight: 700 }}>최초 조우 </span>
                        {entry.firstEncounter}
                      </div>
                    )}
                  </div>
                );
              })()}
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
              const displayNameParts = getDexDisplayParts(displayPokemon);

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
            className="m-4 max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg border border-[#b7d982] bg-[#f4f8e8] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center">
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
                    unlockedNumbers.has(toDexNumber(p.number)) &&
                    !isSizeUnifiedForm(p)
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
                {getDexDisplayParts(selectedForm).name}
              </h3>
              {getDexDisplayParts(selectedForm).formLabel && (
                <div className="mb-3 text-sm font-semibold text-[#7c9157]">
                  {getDexDisplayParts(selectedForm).formLabel}
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

              <div className="mb-4 flex flex-col gap-3">
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
