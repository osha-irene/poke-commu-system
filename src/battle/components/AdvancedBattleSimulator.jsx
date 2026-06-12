import React, { useEffect, useRef, useState } from 'react';
import {
  CloudSun,
  Heart,
  Info,
  Package,
  RefreshCw,
  RotateCcw,
  Shield,
  Swords,
  TrendingUp,
  Users,
  Wind,
  X,
  Zap,
} from 'lucide-react';
import useAdvancedBattle from '../hooks/useAdvancedBattle';
import { getOwnedPokemonDisplayParts } from '../../utils/ownedPokemonDisplay';

const BOOST_LABELS = {
  atk: '공격',
  def: '방어',
  spa: '특수공격',
  spd: '특수방어',
  spe: '스피드',
  accuracy: '명중률',
  evasion: '회피율',
};

const formatBoosts = (boosts = {}) => Object.entries(boosts)
  .filter(([, value]) => value !== 0)
  .map(([stat, value]) => `${BOOST_LABELS[stat] || stat} ${value > 0 ? '+' : ''}${value}`);

const PokemonNameText = ({ pokemon, className = '', speciesClassName = '' }) => {
  const displayName = getOwnedPokemonDisplayParts(pokemon);
  return (
    <span className={className}>
      <span>{displayName.primary}</span>
      {displayName.hasNickname && (
        <span className={`ml-1 text-xs font-semibold opacity-70 ${speciesClassName}`}>
          {displayName.species}
        </span>
      )}
    </span>
  );
};

const requestLabel = {
  move: '기술 선택',
  switch: '교체 선택',
  wait: '대기 중',
  none: '대기 중',
};

const fieldChipTone = {
  gray: 'bg-gray-100 text-gray-800',
  green: 'bg-green-100 text-green-800',
  purple: 'bg-purple-100 text-purple-800',
  yellow: 'bg-yellow-100 text-yellow-800',
};

const FieldChip = ({ icon: Icon, label, value, tone = 'gray' }) => (
  <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-semibold ${fieldChipTone[tone] || fieldChipTone.gray}`}>
    <Icon size={15} />
    {label}: {value || '없음'}
  </span>
);

const BoostList = ({ pokemon }) => {
  const boosts = formatBoosts(pokemon?.boosts);
  if (!boosts.length) return <span className="text-gray-500">랭크 변화 없음</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {boosts.map(boost => (
        <span key={boost} className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-gray-800">
          {boost}
        </span>
      ))}
    </div>
  );
};

const BattleInfoPanel = ({ battleState, onClose }) => {
  const p1Active = battleState.player1.active[0];
  const p2Active = battleState.player2.active[0];

  const renderSideInfo = (title, side, active, accent) => (
    <div className={`rounded-lg border-2 p-4 ${accent === 'blue' ? 'border-blue-200 bg-blue-50' : 'border-red-200 bg-red-50'}`}>
      <h4 className="mb-3 font-bold text-gray-900">{title}</h4>
      <div className="space-y-3 text-sm">
        <div>
          <div className="mb-1 font-semibold text-gray-700">현재 포켓몬</div>
          <div className="flex flex-wrap items-center gap-2">
            <PokemonNameText pokemon={active} className="font-bold" />
            <span>HP {active?.currentHP}/{active?.maxHP}</span>
            {active?.status && <span className="rounded-full bg-red-100 px-2 py-1 text-red-800">{active.status}</span>}
          </div>
        </div>
        <div>
          <div className="mb-1 flex items-center gap-1 font-semibold text-gray-700">
            <Package size={15} />
            지닌 도구
          </div>
          <div>{active?.item ? `${active.item}${active.itemEn ? ` (${active.itemEn})` : ''}` : '없음'}</div>
        </div>
        <div>
          <div className="mb-1 font-semibold text-gray-700">랭크</div>
          <BoostList pokemon={active} />
        </div>
        <div>
          <div className="mb-1 font-semibold text-gray-700">상태 효과</div>
          {active?.volatileStatus?.length ? active.volatileStatus.join(', ') : '없음'}
        </div>
        <div>
          <div className="mb-1 font-semibold text-gray-700">사이드 효과</div>
          {side.sideConditions?.length ? side.sideConditions.join(', ') : '없음'}
        </div>
        <div>
          <div className="mb-1 font-semibold text-gray-700">요청 상태</div>
          {requestLabel[side.requestType] || side.requestType}
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            <Info className="text-blue-600" size={24} />
            배틀 정보
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-gray-600 hover:bg-gray-100"
            aria-label="닫기"
          >
            <X size={22} />
          </button>
        </div>

        <div className="mb-5 rounded-lg border border-gray-200 bg-gray-50 p-4">
          <h4 className="mb-3 font-bold text-gray-900">필드</h4>
          <div className="flex flex-wrap gap-2">
            <FieldChip icon={CloudSun} label="날씨" value={battleState.field.weather} tone="yellow" />
            <FieldChip icon={Wind} label="필드" value={battleState.field.terrain} tone="green" />
            <FieldChip icon={Info} label="룸/전체 효과" value={battleState.field.rooms?.join(', ')} tone="purple" />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {renderSideInfo('Player 1', battleState.player1, p1Active, 'blue')}
          {renderSideInfo('Player 2', battleState.player2, p2Active, 'red')}
        </div>
      </div>
    </div>
  );
};

export function AdvancedBattleSimulator({ player1Team, player2Team, autoStart = false, onBattleFinished, onExit }) {
  const {
    battleState,
    startBattle,
    selectMove,
    selectSwitch,
    clearPendingChoices,
    resetBattle,
    previewDamage,
  } = useAdvancedBattle({
    player1Team,
    player2Team,
    battleFormat: 'Singles',
    generation: 9,
  });

  const [selectedP1Pokemon, setSelectedP1Pokemon] = useState([0]);
  const [selectedP2Pokemon, setSelectedP2Pokemon] = useState([0]);
  const [showDamagePreview, setShowDamagePreview] = useState(null);
  const [megaIntent, setMegaIntent] = useState({ player1: false, player2: false });
  const megaIntentRef = useRef({ player1: false, player2: false });
  const [showBattleInfo, setShowBattleInfo] = useState(false);
  const autoStartedRef = useRef(false);
  const finishedNotifiedRef = useRef(false);

  const toggleSelection = (index, setter) => {
    setter((prev) => {
      if (prev.includes(index)) return prev.filter(i => i !== index);
      if (prev.length < 6) return [...prev, index];
      return prev;
    });
  };

  const setMegaIntentForPlayer = (player, value) => {
    setMegaIntent((prev) => {
      const next = { ...prev, [player]: value };
      megaIntentRef.current = next;
      return next;
    });
  };

  const toggleMegaIntent = (player) => {
    const nextValue = !megaIntentRef.current[player];
    setMegaIntentForPlayer(player, nextValue);
  };

  useEffect(() => {
    const p1CanMega = battleState.player1.active[0]?.canMegaEvolve;
    const p2CanMega = battleState.player2.active[0]?.canMegaEvolve;

    setMegaIntent((prev) => {
      const next = {
        player1: p1CanMega ? prev.player1 : false,
        player2: p2CanMega ? prev.player2 : false,
      };
      megaIntentRef.current = next;
      return next.player1 === prev.player1 && next.player2 === prev.player2 ? prev : next;
    });
  }, [battleState.player1.active, battleState.player2.active]);

  useEffect(() => {
    autoStartedRef.current = false;
    finishedNotifiedRef.current = false;
  }, [player1Team, player2Team, autoStart]);

  useEffect(() => {
    if (!autoStart || autoStartedRef.current || battleState.phase !== 'team_selection') return;
    if (!player1Team.length || !player2Team.length) return;

    autoStartedRef.current = true;
    startBattle(
      player1Team.map((_, index) => index),
      player2Team.map((_, index) => index)
    );
  }, [autoStart, battleState.phase, player1Team, player2Team, startBattle]);

  useEffect(() => {
    if (battleState.phase !== 'finished') return;
    if (finishedNotifiedRef.current) return;

    finishedNotifiedRef.current = true;
    onBattleFinished?.({
      winner: battleState.winner,
      turn: battleState.turn,
      player1Fainted: battleState.player1.fainted.length,
      player2Fainted: battleState.player2.fainted.length,
      log: battleState.log,
    });
  }, [
    battleState.log,
    battleState.phase,
    battleState.player1.fainted.length,
    battleState.player2.fainted.length,
    battleState.turn,
    battleState.winner,
    onBattleFinished,
  ]);

  const hasPendingChoice = Boolean(battleState.pendingChoices?.player1 || battleState.pendingChoices?.player2);

  if (battleState.phase === 'team_selection') {
    if (autoStart) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-gray-100">
          <div className="rounded-lg bg-white px-6 py-4 font-semibold text-gray-700 shadow">
            배틀을 준비하는 중입니다.
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 text-center">
            <h1 className="mb-2 flex items-center justify-center gap-3 text-4xl font-bold text-gray-800">
              <Users className="text-blue-600" size={36} />
              포켓몬 배틀 시뮬레이터
              <Users className="text-red-600" size={36} />
            </h1>
            <p className="text-gray-600">각 플레이어의 엔트리 순서를 선택하세요. 첫 번째 선택 포켓몬이 선봉으로 나옵니다.</p>
          </div>

          <div className="mb-8 grid grid-cols-1 gap-8 md:grid-cols-2">
            <div className="rounded-lg border border-blue-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 flex items-center gap-2 text-2xl font-bold text-blue-900">
                <Shield className="text-blue-600" size={24} />
                Player 1 엔트리 선택
              </h2>
              <p className="mb-4 text-sm text-gray-600">선택한 포켓몬 {selectedP1Pokemon.length}마리</p>
              <div className="space-y-2">
                {player1Team.map((pokemon, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => toggleSelection(idx, setSelectedP1Pokemon)}
                    className={`flex w-full items-center justify-between rounded-lg p-4 font-semibold transition-all ${
                      selectedP1Pokemon.includes(idx)
                        ? 'bg-blue-600 text-white shadow-lg'
                        : 'bg-white text-gray-800 hover:bg-blue-100'
                    }`}
                  >
                    <div className="text-left">
                      <PokemonNameText pokemon={pokemon} className="font-bold" />
                      <div className="text-sm opacity-80">Lv.{pokemon.level} {pokemon.types?.join('/')}</div>
                    </div>
                    <div className="text-sm opacity-80">
                      {selectedP1Pokemon.includes(idx) ? '선택됨' : `HP ${pokemon.stats?.hp || pokemon.hp || '-'}`}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-red-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 flex items-center gap-2 text-2xl font-bold text-red-900">
                <Swords className="text-red-600" size={24} />
                Player 2 엔트리 선택
              </h2>
              <p className="mb-4 text-sm text-gray-600">선택한 포켓몬 {selectedP2Pokemon.length}마리</p>
              <div className="space-y-2">
                {player2Team.map((pokemon, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => toggleSelection(idx, setSelectedP2Pokemon)}
                    className={`flex w-full items-center justify-between rounded-lg p-4 font-semibold transition-all ${
                      selectedP2Pokemon.includes(idx)
                        ? 'bg-red-600 text-white shadow-lg'
                        : 'bg-white text-gray-800 hover:bg-red-100'
                    }`}
                  >
                    <div className="text-left">
                      <PokemonNameText pokemon={pokemon} className="font-bold" />
                      <div className="text-sm opacity-80">Lv.{pokemon.level} {pokemon.types?.join('/')}</div>
                    </div>
                    <div className="text-sm opacity-80">
                      {selectedP2Pokemon.includes(idx) ? '선택됨' : `HP ${pokemon.stats?.hp || pokemon.hp || '-'}`}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={() => {
                if (selectedP1Pokemon.length > 0 && selectedP2Pokemon.length > 0) {
                  startBattle(selectedP1Pokemon, selectedP2Pokemon);
                } else {
                  alert('각 플레이어는 최소 1마리의 포켓몬을 선택해야 합니다.');
                }
              }}
              disabled={selectedP1Pokemon.length === 0 || selectedP2Pokemon.length === 0}
              className="mx-auto flex items-center gap-3 rounded-lg bg-gray-900 px-12 py-4 text-xl font-bold text-white shadow-sm transition-all hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500"
            >
              <Zap size={24} />
              배틀 시작
              <Zap size={24} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  const p1Active = battleState.player1.active[0];
  const p2Active = battleState.player2.active[0];

  if (!p1Active || !p2Active) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <div className="text-center">
          <h2 className="mb-2 text-2xl font-bold text-gray-800">배틀 가능한 포켓몬이 없습니다</h2>
          <button
            type="button"
            onClick={resetBattle}
            className="mt-4 rounded-lg bg-blue-600 px-6 py-2 text-white hover:bg-blue-700"
          >
            리셋
          </button>
        </div>
      </div>
    );
  }

  const renderPokemonPanel = (player, active, opponent, color) => {
    const waiting = player === 'player1' ? battleState.waitingForP1 : battleState.waitingForP2;
    const side = player === 'player1' ? battleState.player1 : battleState.player2;
    const borderClass = color === 'blue' ? 'border-blue-200 bg-white' : 'border-red-200 bg-white';
    const titleClass = color === 'blue' ? 'text-blue-900' : 'text-red-900';
    const buttonClass = color === 'blue' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-red-600 hover:bg-red-700';
    const megaSelected = Boolean(megaIntent[player]);
    const pendingChoice = battleState.pendingChoices?.[player];
    const canChooseMove = waiting && side.requestType === 'move';
    const canSwitch = waiting && side.canSwitch && side.bench.length > 0;
    const switchBlockedReason = active.request?.trapped
      ? '교체할 수 없는 상태입니다.'
      : active.request?.maybeTrapped
        ? '교체가 막힐 수 있습니다.'
        : '';

    const handleMoveSelect = (moveIndex) => {
      selectMove(player, 0, moveIndex, { mega: megaIntentRef.current[player] && active.canMegaEvolve });
    };

    return (
      <div className={`${borderClass} rounded-lg border p-6 shadow-sm`}>
        <div className="mb-4 text-center">
          <h2 className={`mb-2 text-2xl font-bold ${titleClass}`}>
            {player === 'player1' ? 'Player 1' : 'Player 2'}: <PokemonNameText pokemon={active} />
          </h2>
          <div className="mb-2 text-sm text-gray-600">
            Lv.{active.level} | {active.types?.join('/')} | {active.ability}
          </div>
          <div className="mb-2 flex items-center justify-center gap-2">
            <Heart className="text-red-500" size={20} />
            <div className="font-semibold">HP: {active.currentHP} / {active.maxHP}</div>
          </div>
          <div className="h-4 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className={`h-full transition-all duration-500 ${
                active.currentHP / active.maxHP > 0.5 ? 'bg-green-500'
                  : active.currentHP / active.maxHP > 0.2 ? 'bg-yellow-500'
                    : 'bg-red-500'
              }`}
              style={{ width: `${(active.currentHP / active.maxHP) * 100}%` }}
            />
          </div>
          <div className="mt-2 flex flex-wrap justify-center gap-1">
            {active.status && (
              <span className="rounded-full bg-red-100 px-3 py-1 text-sm text-red-800">{active.status}</span>
            )}
            {active.item && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-sm text-amber-900">
                <Package size={14} />
                {active.item}
              </span>
            )}
          </div>
          {formatBoosts(active.boosts).length > 0 && (
            <div className="mt-2 flex flex-wrap justify-center gap-1">
              {formatBoosts(active.boosts).map(boost => (
                <span key={boost} className="rounded-full bg-white px-2 py-1 text-xs text-gray-900">
                  {boost}
                </span>
              ))}
            </div>
          )}
          {active.volatileStatus?.length > 0 && (
            <div className="mt-2 flex flex-wrap justify-center gap-1">
              {active.volatileStatus.map(status => (
                <span key={status} className="rounded-full bg-purple-100 px-2 py-1 text-xs text-purple-900">
                  {status}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <h3 className={`mb-3 flex items-center gap-2 font-bold ${titleClass}`}>
            <Swords size={20} />
            기술 선택
          </h3>
          {active.request?.maybeLocked && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm font-semibold text-amber-900">
              연속 기술 진행 중입니다. 시뮬레이터가 가능한 선택만 보여줍니다.
            </div>
          )}
          {active.canMegaEvolve && (
            <button
              type="button"
              onClick={() => toggleMegaIntent(player)}
              disabled={!canChooseMove}
              className={`w-full rounded-lg border px-4 py-2 font-semibold transition-all ${
                megaSelected
                  ? 'border-fuchsia-700 bg-fuchsia-600 text-white shadow-md'
                  : canChooseMove
                    ? 'border-fuchsia-300 bg-white text-fuchsia-700 hover:bg-fuchsia-50'
                    : 'cursor-not-allowed border-gray-300 bg-gray-200 text-gray-500'
              }`}
              >
                메가진화{active.megaSpecies ? ` -> ${active.megaSpecies}` : ''} {megaSelected ? 'ON' : 'OFF'}
              </button>
            )}
          {active.moves?.map((move, i) => {
            const isSelected = pendingChoice?.type === 'move' && pendingChoice.moveIndex === i;
            return (
              <button
                key={`${move.id}-${i}`}
                type="button"
                onClick={() => handleMoveSelect(i)}
                onMouseEnter={() => {
                  const preview = previewDamage(active, opponent, move.nameEn || move.id || move.name);
                  setShowDamagePreview({ player, move: move.name || move.id, preview });
                }}
                onMouseLeave={() => setShowDamagePreview(null)}
                disabled={!canChooseMove || move.disabled}
                className={`w-full rounded-lg px-4 py-3 font-semibold transition-all ${
                  isSelected
                    ? 'bg-gray-950 text-white shadow-lg ring-4 ring-yellow-300'
                    : canChooseMove && !move.disabled
                      ? `${buttonClass} text-white shadow-md hover:-translate-y-0.5 hover:shadow-lg`
                      : 'cursor-not-allowed bg-gray-300 text-gray-500'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span>{move.name || move.id}</span>
                  <span className="text-xs opacity-80">
                    {isSelected ? '선택됨' : move.disabled ? `사용 불가${move.disabledSource ? ` (${move.disabledSource})` : ''}` : `${move.type} | ${move.category}`}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-5">
          <h3 className={`mb-2 flex items-center gap-2 text-sm font-bold ${titleClass}`}>
            <RotateCcw size={18} />
            포켓몬 교체
          </h3>
          {switchBlockedReason && (
            <div className="mb-2 rounded-lg bg-white/80 p-2 text-xs font-semibold text-gray-700">{switchBlockedReason}</div>
          )}
          {side.bench.length > 0 ? (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {side.bench.map(pokemon => {
                const isSelected = pendingChoice?.type === 'switch' && pendingChoice.slot === pokemon.slot;
                return (
                  <button
                    key={pokemon.slot}
                    type="button"
                    onClick={() => selectSwitch(player, 0, pokemon.slot)}
                    disabled={!canSwitch}
                    className={`rounded-lg border p-3 text-left text-sm transition-all ${
                      isSelected
                        ? 'border-yellow-400 bg-gray-950 text-white shadow-lg ring-2 ring-yellow-300'
                        : canSwitch
                          ? 'border-gray-300 bg-white hover:border-gray-500 hover:shadow'
                          : 'cursor-not-allowed border-gray-200 bg-gray-200 text-gray-500'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <PokemonNameText pokemon={pokemon} className="font-bold" />
                      <span>HP {pokemon.currentHP}/{pokemon.maxHP}</span>
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-2 text-xs">
                      <span>{pokemon.types?.join('/')}</span>
                      <span>{isSelected ? '선택됨' : pokemon.item || '도구 없음'}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="rounded-lg bg-white/80 p-3 text-sm text-gray-600">교체 가능한 포켓몬이 없습니다.</div>
          )}
        </div>

        {waiting && (
          <div className={`mt-4 rounded-lg border-2 p-3 text-center ${color === 'blue' ? 'border-blue-300 bg-blue-100' : 'border-red-300 bg-red-100'}`}>
            <div className={`${color === 'blue' ? 'text-blue-800' : 'text-red-800'} font-semibold`}>
              {side.requestType === 'switch' ? '교체할 포켓몬을 선택하세요.' : side.requestType === 'move' ? '기술 또는 교체를 선택하세요.' : '상대 선택을 기다리는 중입니다.'}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <h1 className="mb-2 flex items-center justify-center gap-3 text-3xl font-bold text-gray-800">
            <Swords className="text-red-600" size={32} />
            포켓몬 배틀
            <Shield className="text-blue-600" size={32} />
          </h1>
          <div className="flex flex-wrap items-center justify-center gap-3 text-xl font-semibold text-gray-600">
            <span>{battleState.turn}턴</span>
            {battleState.field.weather && (
              <span className="rounded-full bg-yellow-100 px-3 py-1 text-sm">날씨: {battleState.field.weather}</span>
            )}
            {battleState.field.terrain && (
              <span className="rounded-full bg-green-100 px-3 py-1 text-sm">필드: {battleState.field.terrain}</span>
            )}
            <button
              type="button"
              onClick={() => setShowBattleInfo(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-gray-800 px-4 py-2 text-sm font-bold text-white hover:bg-gray-900"
            >
              <Info size={18} />
              배틀 정보
            </button>
          </div>
        </div>

        {battleState.phase === 'finished' && (
          <div className="mb-6 rounded-lg border-2 border-yellow-300 bg-yellow-50 p-5 text-center shadow-sm">
            <h2 className="text-2xl font-bold text-gray-900">{battleState.winner} 승리!</h2>
            <p className="mt-2 text-sm font-semibold text-gray-700">하단의 배틀 완료 버튼을 누르면 배틀 페이지를 종료합니다.</p>
          </div>
        )}

        <div className="mb-6 grid grid-cols-1 gap-8 md:grid-cols-2">
          {renderPokemonPanel('player1', p1Active, p2Active, 'blue')}
          {renderPokemonPanel('player2', p2Active, p1Active, 'red')}
        </div>

        {showDamagePreview && !showDamagePreview.preview?.error && (
          <div className="mb-6 rounded-lg border-2 border-yellow-400 bg-white p-4 shadow-lg">
            <h3 className="mb-2 flex items-center gap-2 font-bold text-gray-800">
              <TrendingUp className="text-yellow-600" size={20} />
              데미지 미리보기: {showDamagePreview.move}
            </h3>
            <div className="text-sm text-gray-700">
              <p>{showDamagePreview.preview.damagePercent}</p>
              {showDamagePreview.preview.koChance && (
                <p className="font-semibold text-red-600">KO 확률: {showDamagePreview.preview.koChance.text}</p>
              )}
            </div>
          </div>
        )}

        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 text-xl font-bold text-gray-800">
            <Zap size={24} className="text-yellow-500" />
            배틀 로그
          </h3>

          <div className="max-h-96 overflow-y-auto rounded-lg bg-gray-50 p-4">
            {battleState.log.length === 0 ? (
              <p className="py-8 text-center text-gray-500">로그가 없습니다.</p>
            ) : (
              <div className="space-y-1">
                {battleState.log.map((entry, i) => (
                  <div
                    key={`${entry.type}-${entry.message}-${i}`}
                    className={`rounded px-3 py-2 text-sm ${
                      entry.type === 'system' ? 'bg-blue-100 font-bold'
                        : entry.type === 'damage' ? 'bg-red-50'
                          : entry.type === 'faint' ? 'bg-gray-200 font-semibold'
                            : entry.type === 'winner' ? 'bg-yellow-100 text-lg font-bold'
                              : entry.type === 'item' ? 'bg-amber-50'
                                : 'bg-white'
                    }`}
                  >
                    {entry.message}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={clearPendingChoices}
            disabled={!hasPendingChoice || battleState.phase === 'finished'}
            className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-amber-700 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500"
          >
            <RotateCcw size={20} />
            선택 롤백
          </button>
          <button
            type="button"
            onClick={resetBattle}
            className="inline-flex items-center gap-2 rounded-lg bg-gray-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-gray-700"
          >
            <RefreshCw size={20} />
            배틀 리셋
          </button>
          {battleState.phase === 'finished' && (
            <button
              type="button"
              onClick={onExit || resetBattle}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-8 py-3 font-semibold text-white transition-colors hover:bg-blue-700"
            >
              <X size={20} />
              배틀 완료
            </button>
          )}
        </div>
      </div>
      {showBattleInfo && (
        <BattleInfoPanel battleState={battleState} onClose={() => setShowBattleInfo(false)} />
      )}
    </div>
  );
}

export default AdvancedBattleSimulator;

