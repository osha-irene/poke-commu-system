import React, { useEffect, useMemo, useState } from 'react';
import { Settings, Percent, TrendingUp, Sparkles, Package, Plus, X, Save, ShieldCheck, ChevronDown, ImageOff } from 'lucide-react';
import { useGame } from '../../../../contexts/GameContext';
import { getPokemonDisplayParts } from '../../../../utils/pokemonDisplayName';
import CachedImage from '../../../common/CachedImage';

const SELECTABLE_POKEMON_RENDER_LIMIT = 180;

const toPercent = (value, fallback = 100) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return parsed <= 1 ? Math.round(parsed * 100) : parsed;
};

const toRate = (value, fallback = 1) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.min(100, parsed)) / 100;
};

// 메가진화 폼은 배틀 전용이라 야생 조우 폼 후보에서 제외한다. (allPokemon.json에는
// tatsugiri-*-mega 처럼 일반 폼과 구분이 안 되는 형태로 들어있는 항목이 있어서,
// 안 걸러주면 관리자가 "싸리용" 카드 여러 개 중 메가를 실수로 골라 야생에 튀어나온다.)
const isMegaFormVariant = (pokemon) =>
  /-mega(-[xy])?$/i.test(String(pokemon?.formVariant || pokemon?.nameEn || pokemon?.species || ''));

// 폼 카드/칩에 "싸리용 (말린모습)"처럼 폼 이름을 같이 보여준다.
const getPokemonNameWithForm = (pokemon) => {
  const base = pokemon?.name || pokemon?.nameEn || '';
  if (!base || base.includes('(')) return base;
  const { formLabel } = getPokemonDisplayParts(pokemon);
  return formLabel ? `${base} (${formLabel})` : base;
};

const getPokemonSpriteSrc = (pokemon, fallbackNumber = pokemon?.number) =>
  pokemon?.spriteUrl || `https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/${fallbackNumber}.png`;

const getPokemonFallbackSpriteSrc = (pokemon, fallbackNumber = pokemon?.number) =>
  fallbackNumber ? `https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/${fallbackNumber}.png` : '';

const IMAGE_MAX_RETRIES = 2;
const IMAGE_RETRY_DELAY_MS = 1500;

function LazyPokemonImage({ src, fallbackSrc = '', alt, className, style, immediate = false }) {
  const wrapRef = React.useRef(null);
  const retryTimerRef = React.useRef(null);
  const [shouldLoad, setShouldLoad] = useState(() => immediate);
  const [activeSrc, setActiveSrc] = useState(src);
  const [hasTriedFallback, setHasTriedFallback] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [hasFailed, setHasFailed] = useState(false);

  useEffect(() => {
    setActiveSrc(src);
    setHasTriedFallback(false);
    setRetryCount(0);
    setHasFailed(false);
    setShouldLoad(immediate);
  }, [src, immediate]);

  useEffect(() => () => {
    if (retryTimerRef.current) window.clearTimeout(retryTimerRef.current);
  }, []);

  useEffect(() => {
    if (immediate || shouldLoad) return undefined;
    const element = wrapRef.current;
    if (!element) return undefined;
    if (typeof IntersectionObserver === 'undefined') {
      setShouldLoad(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setShouldLoad(true);
        observer.disconnect();
      },
      { root: null, rootMargin: '180px 0px', threshold: 0.01 }
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [immediate, shouldLoad]);

  if (!shouldLoad || !activeSrc) {
    return (
      <div
        ref={wrapRef}
        className={className}
        style={{ ...style, background: 'rgba(148, 163, 184, 0.12)' }}
      />
    );
  }

  if (hasFailed) {
    return (
      <div
        className={className}
        style={{
          ...style,
          background: 'rgba(148, 163, 184, 0.12)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ImageOff size={20} className="text-gray-300" />
      </div>
    );
  }

  return (
    <CachedImage
      key={`${activeSrc}:${retryCount}`}
      src={activeSrc}
      alt={alt}
      className={className}
      style={style}
      onError={() => {
        if (retryCount < IMAGE_MAX_RETRIES) {
          if (retryTimerRef.current) window.clearTimeout(retryTimerRef.current);
          retryTimerRef.current = window.setTimeout(() => {
            setRetryCount(count => count + 1);
          }, IMAGE_RETRY_DELAY_MS * (retryCount + 1));
          return;
        }
        if (fallbackSrc && activeSrc !== fallbackSrc && !hasTriedFallback) {
          setHasTriedFallback(true);
          setActiveSrc(fallbackSrc);
          setRetryCount(0);
          return;
        }
        setHasFailed(true);
      }}
    />
  );
}

// ─── 폼 선택 팝업 (지역 모드) ───────────────────────────────────────────────
function FormSelectPopup({ basePokemon, forms, selected, onToggle, onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-5 space-y-3"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-gray-800">{basePokemon?.name} 폼 선택</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <p className="text-xs text-gray-500">이 지역에서 등장 가능한 폼을 선택하세요. 최소 1개 필요.</p>
        <div className="space-y-1.5 max-h-72 overflow-y-auto">
          {forms.map(f => {
            const isChecked = selected.includes(f.number);
            const isLast = isChecked && selected.length <= 1;
            return (
              <label
                key={f.number}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 cursor-pointer transition-colors ${
                  isChecked ? 'bg-indigo-50 border border-indigo-300' : 'bg-gray-50 border border-gray-200 hover:bg-gray-100'
                } ${isLast ? 'opacity-50' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  disabled={isLast}
                  onChange={() => !isLast && onToggle(f.number)}
                  className="w-4 h-4 accent-indigo-500"
                />
                <LazyPokemonImage
                  src={getPokemonSpriteSrc(f)}
                  fallbackSrc={getPokemonFallbackSpriteSrc(f)}
                  alt={f.name}
                  immediate
                  className="w-8 h-8 object-contain"
                  style={{ imageRendering: 'pixelated' }}
                />
                <span className="text-sm font-medium text-gray-700">{getPokemonNameWithForm(f)}</span>
              </label>
            );
          })}
        </div>
        <button
          onClick={onClose}
          className="w-full py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
        >
          확인
        </button>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
export default function PokemonSettingsPanel({
  region,
  parentRegion = null,
  mode = 'place',
  onUpdateRegion
}) {
  const { allPokemonMaster = [], gamePokedex = [] } = useGame();
  const isRegionMode = mode === 'region';

  const regionPokemonPool = useMemo(
    () => (Array.isArray(parentRegion?.pokemons) ? parentRegion.pokemons : []),
    [parentRegion?.pokemons]
  );
  const parentEncounterRate = parentRegion?.encounterRate ?? 90;
  const parentMinLevel = parentRegion?.minLevel || 5;
  const parentMaxLevel = parentRegion?.maxLevel || 100;

  // ── 공통 상태 ──
  const [encounterRate, setEncounterRate] = useState(region.encounterRate !== undefined ? region.encounterRate : parentEncounterRate);
  const [minLevel, setMinLevel] = useState(region.minLevel || parentMinLevel);
  const [maxLevel, setMaxLevel] = useState(region.maxLevel || parentMaxLevel || 20);
  const [maxCatchRate, setMaxCatchRate] = useState(toPercent(region.maxCatchRate, 100));
  const [shinyRate, setShinyRate] = useState(region.shinyRate || parentRegion?.shinyRate || 4096);
  const [pokemonSearchQuery, setPokemonSearchQuery] = useState('');
  const [allowNationalPokedex, setAllowNationalPokedex] = useState(
    region.allowNationalPokedex !== undefined ? region.allowNationalPokedex : false
  );
  const [pokedexTab, setPokedexTab] = useState(allowNationalPokedex ? 'national' : 'game');
  const [isSelectablePokemonOpen, setIsSelectablePokemonOpen] = useState(false);

  // ── 지역 모드 전용 상태 ──
  // selectedPokemon: base number[]
  // pokemonFormSelections: { [baseNum]: formNum[] }
  const [selectedPokemon, setSelectedPokemon] = useState(
    Array.isArray(region.pokemons) ? region.pokemons : []
  );
  const [pokemonFormSelections, setPokemonFormSelections] = useState(
    region.pokemonFormConfig || {}
  );
  const [formPopupBaseId, setFormPopupBaseId] = useState(null); // 팝업 열린 base number

  // ── 장소 모드 전용 상태 ──
  // selectedFormIds: number[] — 선택된 폼 번호
  // formWeights: { [formNum]: number }
  const [selectedFormIds, setSelectedFormIds] = useState(
    Array.isArray(region.pokemons) ? region.pokemons : []
  );
  const [formWeights, setFormWeights] = useState(region.pokemonRates || {});

  const pokemonLookup = useMemo(() => {
    const byId = new Map();
    const byNumber = new Map();
    const formsByOriginal = new Map();
    const list = allPokemonMaster || [];

    // 1차: 자기 자신의 id/number를 최우선으로 등록한다. 배쓰나이 적색근처럼
    // "자기 number"가 곧 원종 도감번호(550)인 폼이 있는 경우, 아래 2차 패스에서
    // 다른 폼(청색근 등)의 originalNumber:550 키가 먼저 먹어버리면 적색근 자체를
    // 조회할 때도 청색근이 나오는 문제가 있었다. id/number는 항상 정확한 값이므로
    // 뒤에 나오는 항목이라도 덮어써서 최신/정확한 매핑을 유지한다.
    list.forEach((pokemon) => {
      if (!pokemon) return;
      [pokemon.id, pokemon.number].forEach((key) => {
        if (key !== undefined && key !== null) {
          byId.set(String(key), pokemon);
        }
      });
    });

    // 2차: originalNumber는 1차에서 채워지지 않은 키에 한해 폴백으로만 채운다.
    list.forEach((pokemon) => {
      if (!pokemon) return;
      const key = pokemon.originalNumber;
      if (key !== undefined && key !== null && !byId.has(String(key))) {
        byId.set(String(key), pokemon);
      }
      // "pokemon-form-10039" 같은 폼 전용 문자열 id는 Number()로 변환하면 전부 NaN이 되어
      // Map 키가 겹쳐버린다(나중에 처리된 폼이 앞선 폼을 덮어씀 - 지역폼 조회 시 엉뚱한
      // 포켓몬이 나오는 원인). 진짜 숫자 도감번호일 때만 byNumber에 넣는다.
      if (pokemon.number !== undefined && pokemon.number !== null && Number.isFinite(Number(pokemon.number))) {
        byNumber.set(Number(pokemon.number), pokemon);
      }
      if (pokemon.originalNumber !== undefined && pokemon.originalNumber !== null && pokemon.formVariant) {
        const originalKey = Number(pokemon.originalNumber);
        const forms = formsByOriginal.get(originalKey) || [];
        forms.push(pokemon);
        formsByOriginal.set(originalKey, forms);
      }
    });
    return { byId, byNumber, formsByOriginal };
  }, [allPokemonMaster]);

  const regionPokemonPoolSet = useMemo(
    () => new Set(regionPokemonPool.map(id => String(id))),
    [regionPokemonPool]
  );

  const selectedPokemonSet = useMemo(
    () => new Set(selectedPokemon.map(id => Number(id))),
    [selectedPokemon]
  );

  const gamePokedexIdSet = useMemo(() => {
    const ids = new Set();
    (gamePokedex || []).forEach((pokemon) => {
      [pokemon?.id, pokemon?.number, pokemon?.originalNumber].forEach((id) => {
        if (id !== undefined && id !== null) ids.add(String(id));
      });
    });
    return ids;
  }, [gamePokedex]);

  // ─────────────────────────────────────────────────────────────────────────
  const getPokemonById = (pokemonId) =>
    pokemonLookup.byId.get(String(pokemonId));

  // 폼 변형 목록 (사철록 봄의 모습 레이블 포함). 메가폼은 배틀 전용이라 조우 폼 후보에서 뺀다.
  const getFormsForPokemon = (baseNumber) => {
    const forms = (pokemonLookup.formsByOriginal.get(Number(baseNumber)) || [])
      .filter(f => !isMegaFormVariant(f));
    const hasBase = forms.some(f => f.number === baseNumber);
    let result;
    if (!hasBase) {
      const base = getPokemonById(baseNumber);
      if (base) {
        const isSeasonBase = forms.some(f =>
          f.nameEn?.endsWith('-summer') || f.nameEn?.endsWith('-autumn') || f.nameEn?.endsWith('-winter')
        );
        const displayName = isSeasonBase ? `${base.name} (봄의 모습)` : base.name;
        result = [{ ...base, name: displayName }, ...forms];
      } else {
        result = forms;
      }
    } else {
      result = forms;
    }
    return result;
  };

  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const savedPokemons = Array.isArray(region.pokemons) ? region.pokemons : [];
    setEncounterRate(region.encounterRate !== undefined ? region.encounterRate : parentEncounterRate);
    setMinLevel(region.minLevel || parentMinLevel);
    setMaxLevel(region.maxLevel || parentMaxLevel || 20);
    setMaxCatchRate(toPercent(region.maxCatchRate, 100));
    setShinyRate(region.shinyRate || parentRegion?.shinyRate || 4096);
    setSelectedPokemon(savedPokemons);
    setPokemonFormSelections(region.pokemonFormConfig || {});
    setSelectedFormIds(savedPokemons);
    setFormWeights(region.pokemonRates || {});
    const national = region.allowNationalPokedex !== undefined ? region.allowNationalPokedex : false;
    setAllowNationalPokedex(national);
    setPokedexTab(national ? 'national' : 'game');
  }, [
    region.id, region.encounterRate, region.minLevel, region.maxLevel,
    region.maxCatchRate, region.pokemons, region.pokemonRates, region.shinyRate,
    region.allowNationalPokedex, region.pokemonFormConfig,
    parentEncounterRate, parentMinLevel, parentMaxLevel, parentRegion?.shinyRate,
  ]);

  // ── 도감 ──
  const currentPokedex = allowNationalPokedex ? allPokemonMaster : gamePokedex;

  const selectablePokemon = useMemo(() => {
    if (!Array.isArray(currentPokedex)) return [];
    return currentPokedex.filter(pokemon => {
      if (isRegionMode) {
        // 폼 변형은 제외 (폼 선택은 카드 클릭 팝업으로)
        // 단, 호바귀/호화귀처럼 base number === originalNumber인 경우는 허용
        if (pokemon.formVariant && pokemon.number !== pokemon.originalNumber) return false;
        return true;
      }
      if (regionPokemonPool.length === 0) return false;
      return (
        regionPokemonPoolSet.has(String(pokemon.id)) ||
        regionPokemonPoolSet.has(String(pokemon.number)) ||
        regionPokemonPoolSet.has(String(pokemon.originalNumber))
      );
    });
  }, [currentPokedex, isRegionMode, regionPokemonPool.length, regionPokemonPoolSet]);

  const filteredSelectablePokemon = useMemo(() => {
    const query = pokemonSearchQuery.trim().toLowerCase().replace(/^#/, '');
    if (!query) return selectablePokemon;
    return selectablePokemon.filter(p => {
      const num = String(p.number ?? p.id ?? '');
      const orig = String(p.originalNumber ?? '');
      const name = String(p.name ?? '').toLowerCase();
      const en = String(p.englishName ?? p.nameEn ?? '').toLowerCase();
      return num.includes(query) || orig.includes(query) || name.includes(query) || en.includes(query);
    });
  }, [pokemonSearchQuery, selectablePokemon]);

  const visibleSelectablePokemon = useMemo(
    () => filteredSelectablePokemon.slice(0, SELECTABLE_POKEMON_RENDER_LIMIT),
    [filteredSelectablePokemon]
  );
  const hiddenSelectableCount = Math.max(0, filteredSelectablePokemon.length - visibleSelectablePokemon.length);

  const isInGamePokedex = id => gamePokedexIdSet.has(String(id));

  // ── 장소 모드: 지역 풀을 폼 카드로 확장 ──
  const placeFormPool = useMemo(() => {
    if (isRegionMode) return [];
    return regionPokemonPool.flatMap(baseId => {
      // 부모 지역에 pokemonFormConfig가 있으면 그 폼 목록 사용
      const configForms = parentRegion?.pokemonFormConfig?.[baseId];
      if (configForms && configForms.length > 0) {
        return configForms.map(fid => {
          const p = pokemonLookup.byId.get(String(fid));
          if (!p || isMegaFormVariant(p)) return null;
          // 사철록 봄의 모습 레이블
          if (fid === baseId) {
            const siblings = pokemonLookup.formsByOriginal.get(Number(baseId)) || [];
            const isSeason = siblings.some(q => q.nameEn?.endsWith('-summer') || q.nameEn?.endsWith('-autumn') || q.nameEn?.endsWith('-winter'));
            if (isSeason) return { ...p, name: `${p.name} (봄의 모습)` };
          }
          return p;
        }).filter(Boolean);
      }
      // pokemonFormConfig 없으면 기본 포켓몬만 표시
      const base = getPokemonById(baseId);
      return base ? [base] : [];
    });
  }, [isRegionMode, regionPokemonPool, parentRegion?.pokemonFormConfig, pokemonLookup]);

  // ── 장소 모드: 확률 계산 ──
  const placeFormIdSet = useMemo(
    () => new Set(placeFormPool.map(form => form.number)),
    [placeFormPool]
  );

  const availableFormIds = useMemo(
    () => selectedFormIds.filter(fid => placeFormIdSet.has(fid)),
    [selectedFormIds, placeFormIdSet]
  );

  const placeProbabilities = useMemo(() => {
    const total = availableFormIds.reduce((s, id) => s + (formWeights[id] || 10), 0);
    return availableFormIds.map(id => {
      const w = formWeights[id] || 10;
      const rel = total > 0 ? (w / total) * 100 : 0;
      return { id, weight: w, actualProb: (rel / 100) * Number(encounterRate || 0) };
    });
  }, [availableFormIds, formWeights, encounterRate]);

  // ── 지역 모드: 확률 계산 (가중치 없음, 균등) ──

  // ─── 지역 모드 핸들러 ───────────────────────────────────────────────────
  const toggleRegionPokemon = (pokemon) => {
    const id = Number(pokemon.number) || pokemon.number;
    const isSelected = selectedPokemon.some(x => Number(x) === id || x === id);
    if (isSelected) {
      setSelectedPokemon(prev => prev.filter(x => Number(x) !== id && x !== id));
      setPokemonFormSelections(ps => { const n = { ...ps }; delete n[id]; return n; });
    } else {
      const forms = getFormsForPokemon(id);
      const defaultForm = forms.length > 0 ? [forms[0].number] : [id];
      setSelectedPokemon(prev => [...prev, id]);
      setPokemonFormSelections(ps => ({ ...ps, [id]: defaultForm }));
    }
  };

  const toggleFormInRegion = (baseId, formNum) => {
    setPokemonFormSelections(prev => {
      const current = prev[baseId] || [baseId];
      if (current.includes(formNum)) {
        if (current.length <= 1) return prev;
        return { ...prev, [baseId]: current.filter(n => n !== formNum) };
      }
      return { ...prev, [baseId]: [...current, formNum] };
    });
  };

  // ─── 장소 모드 핸들러 ───────────────────────────────────────────────────
  const togglePlaceForm = (formNum) => {
    setSelectedFormIds(prev => {
      if (prev.includes(formNum)) {
        setFormWeights(w => { const n = { ...w }; delete n[formNum]; return n; });
        return prev.filter(id => id !== formNum);
      }
      setFormWeights(w => ({ ...w, [formNum]: w[formNum] || 10 }));
      return [...prev, formNum];
    });
  };

  const updateFormWeight = (formNum, rate) => {
    setFormWeights(prev => ({ ...prev, [formNum]: parseInt(rate, 10) || 1 }));
  };

  const handleToggleNationalPokedex = () => {
    const next = !allowNationalPokedex;
    setAllowNationalPokedex(next);
    setPokedexTab(next ? 'national' : 'game');
  };

  // ─── 저장 ───────────────────────────────────────────────────────────────
  const handleSave = async () => {
    const cappedMaxLevel = isRegionMode
      ? parseInt(maxLevel, 10) || 1
      : Math.min(parseInt(maxLevel, 10) || 1, parentMaxLevel);
    const cappedMinLevel = Math.min(parseInt(minLevel, 10) || 1, cappedMaxLevel);

    const updatedRegion = isRegionMode
      ? {
          ...region,
          pokemons: selectedPokemon,
          pokemonFormConfig: pokemonFormSelections,
          pokemonRates: {},
          encounterRate: parseFloat(encounterRate) || 0,
          minLevel: cappedMinLevel,
          maxLevel: cappedMaxLevel,
          maxCatchRate: toRate(maxCatchRate, 1),
          shinyRate: parseInt(shinyRate, 10) || 4096,
          allowNationalPokedex: false,
          places: Array.isArray(region.places)
            ? region.places.map(place => {
                return {
                  ...place,
                  pokemons: (place.pokemons || []).filter(fid => {
                    const p = pokemonLookup.byId.get(String(fid));
                    const base = p?.originalNumber && p.originalNumber !== fid ? p.originalNumber : fid;
                    return selectedPokemonSet.has(Number(base)) || selectedPokemonSet.has(Number(fid));
                  }),
                  encounterRate: place.encounterRate !== undefined ? place.encounterRate : parseFloat(encounterRate) || 0,
                  maxLevel: Math.min(place.maxLevel || cappedMaxLevel, cappedMaxLevel),
                  minLevel: Math.min(place.minLevel || cappedMinLevel, place.maxLevel || cappedMaxLevel),
                };
              })
            : [],
        }
      : {
          ...region,
          pokemons: selectedFormIds.filter(fid => placeFormIdSet.has(fid)),
          pokemonRates: Object.fromEntries(
            availableFormIds.map(id => [id, formWeights[id] || 10])
          ),
          encounterRate: parseFloat(encounterRate) || 0,
          minLevel: cappedMinLevel,
          maxLevel: cappedMaxLevel,
          shinyRate: parseInt(shinyRate, 10) || parentRegion?.shinyRate || 4096,
          allowNationalPokedex,
        };

    await onUpdateRegion(region.id, updatedRegion);
    alert(isRegionMode ? '지역 포켓몬 기준 설정이 저장되었습니다.' : '장소 출현 설정이 저장되었습니다.');
  };

  // ─── 렌더 ───────────────────────────────────────────────────────────────
  const colorPalette = ['#6366f1', '#ec4899', '#8b5cf6', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#06b6d4'];

  // 지역 모드: 선택된 포켓몬 카드
  const renderRegionCard = (baseId) => {
    const pokemon = getPokemonById(baseId);
    if (!pokemon) return null;
    const forms = getFormsForPokemon(baseId);
    const hasMultipleForms = forms.length > 1;
    const selectedForms = pokemonFormSelections[baseId] || [baseId];

    // 단일 폼 선택 시 해당 폼 이미지 사용
    const displayPokemon = selectedForms.length === 1
      ? (pokemonLookup.byId.get(String(selectedForms[0])) || pokemon)
      : pokemon;

    return (
      <div
        key={baseId}
        className={`relative bg-indigo-50 border-2 border-indigo-200 rounded-lg p-2 text-center flex flex-col items-center gap-1 ${
          hasMultipleForms ? 'cursor-pointer hover:bg-indigo-100' : ''
        }`}
        onClick={hasMultipleForms ? () => setFormPopupBaseId(baseId) : undefined}
      >
        {/* X 버튼 */}
        <button
          type="button"
          onClick={e => { e.stopPropagation(); toggleRegionPokemon(pokemon); }}
          className="absolute right-1 top-1 z-20 rounded p-1 text-red-500 hover:bg-red-50"
        >
          <X size={14} />
        </button>

        <LazyPokemonImage
          src={getPokemonSpriteSrc(displayPokemon)}
          fallbackSrc={getPokemonFallbackSpriteSrc(displayPokemon)}
          alt={displayPokemon.name}
          immediate
          className="h-[72px] w-[72px] object-contain"
          style={{ imageRendering: 'pixelated' }}
        />
        <div className="text-sm font-bold leading-tight text-gray-800 min-h-[2rem] flex items-center justify-center text-center">
          {getPokemonNameWithForm(displayPokemon)}
        </div>
        <div className="text-xs text-gray-500">No.{baseId}</div>

        {/* 폼 pills */}
        {hasMultipleForms && (
          <div className="flex flex-wrap gap-1 justify-center mt-1">
            {selectedForms.map(fid => {
              const f = forms.find(x => x.number === fid);
              return (
                <span
                  key={fid}
                  className="px-1.5 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-semibold rounded-full border border-indigo-300 leading-tight"
                >
                  {f ? getPokemonNameWithForm(f) : fid}
                </span>
              );
            })}
            <span className="text-[10px] text-indigo-400 flex items-center gap-0.5">
              <ChevronDown size={10} /> 클릭해서 변경
            </span>
          </div>
        )}
      </div>
    );
  };

  // 장소 모드: 폼 카드
  const renderPlaceFormCard = (formPokemon) => {
    const fid = formPokemon.number;
    const isSelected = selectedFormIds.includes(fid);
    const prob = placeProbabilities.find(p => p.id === fid);

    return (
      <div
        key={fid}
        onClick={() => togglePlaceForm(fid)}
        className={`relative cursor-pointer rounded-lg border-2 p-2 transition-colors text-center ${
          isSelected
            ? 'bg-indigo-50 border-indigo-400 hover:bg-indigo-100'
            : 'bg-white border-gray-200 text-gray-500 hover:border-indigo-300'
        }`}
      >
        <LazyPokemonImage
          src={getPokemonSpriteSrc(formPokemon, fid)}
          fallbackSrc={getPokemonFallbackSpriteSrc(formPokemon, fid)}
          alt={formPokemon.name}
          immediate={isSelected}
          className={`h-16 w-16 mx-auto object-contain ${isSelected ? '' : 'opacity-40 grayscale'}`}
          style={{ imageRendering: 'pixelated' }}
        />
        <div
          className="text-xs font-semibold leading-tight mt-1 min-h-[2rem] flex items-center justify-center"
          style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
        >
          {getPokemonNameWithForm(formPokemon)}
        </div>

        {isSelected && (
          <div className="mt-1.5 space-y-1" onClick={e => e.stopPropagation()}>
            <div className="text-[11px] text-indigo-600 font-semibold">{(prob?.actualProb || 0).toFixed(2)}%</div>
            <div className="flex items-center gap-1 justify-center">
              <span className="text-[10px] text-gray-500">가중치</span>
              <input
                type="number"
                value={formWeights[fid] || 10}
                onChange={e => updateFormWeight(fid, e.target.value)}
                min="1" max="100"
                className="w-12 border border-indigo-300 rounded px-1 py-0.5 text-center text-[11px] focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>
        )}
      </div>
    );
  };

  // 팝업용 데이터
  const popupBasePokemon = formPopupBaseId != null ? getPokemonById(formPopupBaseId) : null;
  const popupForms = formPopupBaseId != null ? getFormsForPokemon(formPopupBaseId) : [];
  const popupSelected = formPopupBaseId != null ? (pokemonFormSelections[formPopupBaseId] || [formPopupBaseId]) : [];


  // ────────────────────────────────────────────────────────────────────────
  return (
    <div className="bg-white rounded-lg border-2 border-indigo-200 p-6 space-y-6">
      {/* 팝업 */}
      {formPopupBaseId != null && popupBasePokemon && (
        <FormSelectPopup
          basePokemon={popupBasePokemon}
          forms={popupForms}
          selected={popupSelected}
          onToggle={formNum => toggleFormInRegion(formPopupBaseId, formNum)}
          onClose={() => setFormPopupBaseId(null)}
        />
      )}

      {/* 헤더 */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h4 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Settings size={24} />
            {isRegionMode ? '지역 포켓몬 기준 설정' : '장소 출현 설정'}
          </h4>
          <p className="mt-1 text-sm text-gray-600">
            {isRegionMode
              ? '이 지역 전체에서 사용할 포켓몬 풀과 폼을 정합니다.'
              : '지역 풀 안에서 이 장소에 실제 등장할 폼과 가중치를 정합니다.'}
          </p>
        </div>

        {!isRegionMode && (
          <div className="flex shrink-0 items-center gap-2 whitespace-nowrap">
            <span className="text-sm font-semibold leading-none text-gray-700">전국도감</span>
            <button
              type="button"
              onClick={handleToggleNationalPokedex}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                allowNationalPokedex ? 'bg-green-500' : 'bg-gray-300'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                allowNationalPokedex ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>
        )}
      </div>

      {/* 수치 설정 */}
      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(150px,1fr))]">
        <div className="min-w-0">
          <label className="mb-2 flex items-center gap-1 whitespace-nowrap text-sm font-bold text-gray-700">
            <Percent size={16} /> 조우율 (%)
          </label>
          <input type="number" value={encounterRate}
            onChange={e => setEncounterRate(parseFloat(e.target.value) || 0)}
            min="0" max="100" step="5"
            className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 focus:border-indigo-500 focus:outline-none"
          />
        </div>
        <div className="min-w-0">
          <label className="mb-2 flex items-center gap-1 whitespace-nowrap text-sm font-bold text-gray-700">
            <TrendingUp size={16} /> 최소 레벨
          </label>
          <input type="number" value={minLevel}
            onChange={e => setMinLevel(parseInt(e.target.value, 10) || 1)}
            min="1" max={isRegionMode ? 100 : parentMaxLevel}
            className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 focus:border-indigo-500 focus:outline-none"
          />
        </div>
        <div className="min-w-0">
          <label className="mb-2 flex items-center gap-1 whitespace-nowrap text-sm font-bold text-gray-700">
            <TrendingUp size={16} /> {isRegionMode ? '지역 최대 레벨' : '최대 레벨'}
          </label>
          <input type="number" value={maxLevel}
            onChange={e => setMaxLevel(parseInt(e.target.value, 10) || 1)}
            min="1" max={isRegionMode ? 100 : parentMaxLevel}
            className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 focus:border-indigo-500 focus:outline-none"
          />
          {!isRegionMode && <div className="mt-1 text-xs text-gray-500">지역 최대 레벨: {parentMaxLevel}</div>}
        </div>
        {isRegionMode && (
          <div className="min-w-0">
            <label className="mb-2 flex items-center gap-1 whitespace-nowrap text-sm font-bold text-gray-700">
              <ShieldCheck size={16} /> 최대 포획률 (%)
            </label>
            <input type="number" value={maxCatchRate}
              onChange={e => setMaxCatchRate(parseFloat(e.target.value) || 0)}
              min="1" max="100"
              className="w-full border-2 border-gray-300 rounded-lg px-4 py-2 focus:border-indigo-500 focus:outline-none"
            />
          </div>
        )}
        <div className="min-w-0">
          <label className="mb-2 flex items-center gap-1 whitespace-nowrap text-sm font-bold text-gray-700">
            <Sparkles size={16} /> 이로치 확률
          </label>
          <input type="number" value={shinyRate}
            onChange={e => setShinyRate(parseInt(e.target.value, 10) || 4096)}
            min="1" max="100000"
            className="w-full border-2 border-gray-300 rounded-lg px-4 py-2 focus:border-indigo-500 focus:outline-none"
          />
          <div className="mt-1 text-xs text-gray-600">1/{shinyRate}</div>
        </div>
      </div>

      {/* 확률 분포 바 */}
      {!isRegionMode && availableFormIds.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <h5 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
            <TrendingUp size={18} /> 확률 분포
          </h5>
          <div className="w-full h-8 flex rounded-lg overflow-hidden border-2 border-gray-300">
            <div
              className="bg-gray-400 flex items-center justify-center text-white text-xs font-bold"
              style={{ width: `${Math.max(0, 100 - Number(encounterRate || 0))}%` }}
              title={`미조우 ${Math.max(0, 100 - Number(encounterRate || 0)).toFixed(1)}%`}
            >
              {Math.max(0, 100 - Number(encounterRate || 0)) >= 5 && '미조우'}
            </div>
            {[...placeProbabilities].sort((a, b) => b.actualProb - a.actualProb).map(({ id, actualProb }, idx) => {
              const p = pokemonLookup.byId.get(String(id));
              return (
                <div key={id}
                  className="flex items-center justify-center text-white text-xs font-bold hover:brightness-110"
                  style={{ width: `${actualProb}%`, backgroundColor: colorPalette[idx % colorPalette.length] }}
                  title={`${p?.name || id}: ${actualProb.toFixed(2)}%`}
                >
                  {actualProb >= 5 && p?.name}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 지역 모드: 선택된 포켓몬 + 추가 ── */}
      {isRegionMode && (
        <>
          <div>
            <h5 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
              <Package size={20} /> 선택된 포켓몬 ({selectedPokemon.length}종)
              {selectedPokemon.some(id => getFormsForPokemon(id).length > 1) && (
                <span className="text-xs text-indigo-500 font-normal">— 폼 있는 포켓몬은 카드 클릭으로 폼 선택</span>
              )}
            </h5>
            {selectedPokemon.length === 0 ? (
              <div className="bg-gray-50 rounded-lg p-6 text-center text-gray-500">
                <Package size={48} className="mx-auto mb-2 text-gray-300" />
                <p>선택된 포켓몬이 없습니다.</p>
              </div>
            ) : (
              <div className="max-h-80 overflow-y-auto pr-1">
                {[
                  { title: '영운 도감', ids: selectedPokemon.filter(isInGamePokedex) },
                  { title: '전국 도감', ids: selectedPokemon.filter(id => !isInGamePokedex(id)) },
                ].map(group => group.ids.length > 0 && (
                  <div key={group.title} className="mb-4">
                    <div className="mb-2 text-sm font-bold text-lime-800">{group.title} ({group.ids.length}종)</div>
                    <div className="grid gap-2 [grid-template-columns:repeat(auto-fill,minmax(140px,1fr))]">
                      {group.ids.map(id => renderRegionCard(id))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h5 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
              <Plus size={20} /> 포켓몬 추가
            </h5>
            <button
              type="button"
              onClick={() => setIsSelectablePokemonOpen(open => !open)}
              className="mb-3 flex w-full items-center justify-between rounded-lg border-2 border-lime-200 bg-lime-50 px-4 py-3 text-sm font-bold text-lime-900 transition-colors hover:bg-lime-100"
            >
              <span>선택 가능한 도감 목록</span>
              <span className="flex items-center gap-2 text-xs text-lime-700">
                {isSelectablePokemonOpen ? '닫기' : '열기'} · {pokedexTab === 'game' ? (gamePokedex?.length || 0) : (allPokemonMaster?.length || 0)}마리
                <ChevronDown size={16} className={`transition-transform ${isSelectablePokemonOpen ? 'rotate-180' : ''}`} />
              </span>
            </button>
            {isSelectablePokemonOpen && (
              <>
            <input
              type="search" value={pokemonSearchQuery}
              onChange={e => setPokemonSearchQuery(e.target.value)}
              className="mb-3 w-full rounded-lg border-2 border-lime-200 bg-white px-4 py-2 text-sm font-semibold text-gray-800 outline-none focus:border-lime-500 placeholder:text-gray-400"
              placeholder="포켓몬 이름 또는 번호 검색"
            />
            <div className="flex gap-2 mb-3">
              <button type="button"
                onClick={() => { setPokedexTab('game'); setAllowNationalPokedex(false); }}
                className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-colors ${
                  pokedexTab === 'game' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >영운 도감 ({gamePokedex?.length || 0})</button>
              <button type="button"
                onClick={() => { setPokedexTab('national'); setAllowNationalPokedex(true); }}
                className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-colors ${
                  pokedexTab === 'national' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >전국 도감 ({allPokemonMaster?.length || 0})</button>
            </div>
            <div className="text-xs text-gray-600 mb-2 flex items-center gap-1">
              <Package size={12} /> {filteredSelectablePokemon.length}마리 표시 중
            </div>
            {hiddenSelectableCount > 0 && (
              <div className="mb-2 text-xs font-semibold text-amber-600">
                처음 {visibleSelectablePokemon.length}마리만 먼저 표시 중입니다. 나머지 {hiddenSelectableCount}마리는 검색으로 좁혀주세요.
              </div>
            )}
            <div className="grid max-h-80 gap-2 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 p-2 [grid-template-columns:repeat(auto-fill,minmax(104px,1fr))]">
              {filteredSelectablePokemon.length === 0 ? (
                <div className="col-span-full py-8 text-center text-sm font-semibold text-gray-500">검색 결과가 없습니다.</div>
              ) : visibleSelectablePokemon.map(pokemon => {
                const isSel = selectedPokemonSet.has(Number(pokemon.number));
                const parts = getPokemonDisplayParts(pokemon);
                return (
                  <button key={pokemon.id || pokemon.number} type="button"
                    onClick={() => toggleRegionPokemon(pokemon)}
                    className={`min-h-[124px] p-1 rounded-lg border-2 transition-all ${
                      isSel ? 'border-indigo-500 bg-indigo-100' : 'border-gray-200 hover:border-indigo-300 bg-white'
                    }`}
                    title={pokemon.name}
                  >
                    <div className="flex h-24 w-full items-center justify-center">
                      <LazyPokemonImage
                        src={getPokemonSpriteSrc(pokemon)}
                        fallbackSrc={getPokemonFallbackSpriteSrc(pokemon)}
                        alt={pokemon.name}
                        className="h-24 w-24 max-w-none object-contain"
                        style={{ imageRendering: 'pixelated' }}
                      />
                    </div>
                    <div className="min-h-[2rem] text-center text-xs font-semibold leading-tight"
                      style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {parts.name}
                    </div>
                    {parts.formLabel && (
                      <div className="min-h-[1.5rem] text-center text-[10px] leading-tight text-gray-500"
                        style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {parts.formLabel}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
              </>
            )}
          </div>
        </>
      )}

      {/* ── 장소 모드: 폼 카드 그리드 ── */}
      {!isRegionMode && (
        <>
          {regionPokemonPool.length === 0 && (
            <div className="rounded-lg border border-yellow-300 bg-yellow-50 p-4 text-sm font-semibold text-yellow-900">
              먼저 지역 포켓몬 기준 설정에서 이 지역에 등장 가능한 포켓몬을 선택하세요.
            </div>
          )}

          {placeFormPool.length > 0 && (
            <div>
              <h5 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                <Package size={20} />
                포켓몬 / 폼 선택 ({selectedFormIds.length}개 선택됨)
              </h5>
              <div className="max-h-80 overflow-y-auto pr-1">
                <div className="grid gap-2 [grid-template-columns:repeat(auto-fill,minmax(120px,1fr))]">
                  {placeFormPool.map(f => renderPlaceFormCard(f))}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      <button type="button" onClick={handleSave}
        className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold text-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
      >
        <Save size={20} /> 설정 저장
      </button>
    </div>
  );
}
