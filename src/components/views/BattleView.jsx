import React, { useEffect, useMemo, useState } from 'react';
import { get, ref } from 'firebase/database';
import { database } from '../../firebase';
import AdvancedBattleSimulator from '../../battle/components/AdvancedBattleSimulator';
import { toCalcAbilityName } from '../../utils/abilityUtils';
import { getOwnedPokemonDisplayParts } from '../../utils/ownedPokemonDisplay';
import allPokemonMaster from '../../data/allPokemon.json';
import customBattleData from '../../data/customBattleData.json';

const BATTLE_LOG_ARCHIVE_KEY = 'poke-commu-battle-log-archive';
const MAX_BATTLE_LOG_ARCHIVE = 50;

const readBattleLogArchive = () => {
  if (typeof window === 'undefined') return [];

  try {
    const parsed = JSON.parse(window.localStorage.getItem(BATTLE_LOG_ARCHIVE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn('배틀 로그 아카이브를 불러오지 못했습니다:', error);
    return [];
  }
};

const writeBattleLogArchive = (logs) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(BATTLE_LOG_ARCHIVE_KEY, JSON.stringify(logs));
};

const TYPE_MAP = {
  노말: 'Normal',
  불꽃: 'Fire',
  물: 'Water',
  전기: 'Electric',
  풀: 'Grass',
  얼음: 'Ice',
  격투: 'Fighting',
  독: 'Poison',
  땅: 'Ground',
  비행: 'Flying',
  에스퍼: 'Psychic',
  벌레: 'Bug',
  바위: 'Rock',
  고스트: 'Ghost',
  드래곤: 'Dragon',
  악: 'Dark',
  강철: 'Steel',
  페어리: 'Fairy',
};

const normalizeType = type => TYPE_MAP[type] || type || 'Normal';

const normalizeLookupKey = (value) => String(value || '')
  .toLowerCase()
  .replace(/[\s_\-'.:]/g, '')
  .replace(/[^\p{L}\p{N}]/gu, '');

const CUSTOM_ABILITY_ALIASES = Object.entries(customBattleData.aliases?.abilities || {}).reduce((map, [key, value]) => {
  map[normalizeLookupKey(key)] = value;
  return map;
}, {});

const CUSTOM_ITEM_ALIASES = Object.entries(customBattleData.aliases?.items || {}).reduce((map, [key, value]) => {
  map[normalizeLookupKey(key)] = value;
  return map;
}, {});

const resolveCustomAbility = value =>
  CUSTOM_ABILITY_ALIASES[normalizeLookupKey(value)] || toCalcAbilityName(value) || value || 'Adaptability';

const resolveCustomItem = value =>
  CUSTOM_ITEM_ALIASES[normalizeLookupKey(value)] || value || '';

const POKEMON_NAME_MAP = allPokemonMaster.reduce((map, pokemon) => {
  [
    pokemon.name,
    pokemon.nameEn,
    pokemon.id,
    pokemon.number,
    pokemon.displayNumber,
  ].forEach((key) => {
    const normalizedKey = normalizeLookupKey(key);
    if (normalizedKey) map[normalizedKey] = pokemon;
  });
  return map;
}, {});

const resolvePokemonTemplate = (pokemon) => {
  const candidates = [
    pokemon.nameEn,
    pokemon.species,
    pokemon.name,
    pokemon.pokemonId,
    pokemon.id,
    pokemon.number,
    pokemon.originalNumber,
  ];

  return candidates
    .map(candidate => POKEMON_NAME_MAP[normalizeLookupKey(candidate)])
    .find(Boolean);
};

const toBattleMoveName = (move) => {
  if (!move) return null;
  if (typeof move === 'string') return move;
  return move.nameEn || move.name || move.id || move.moveId || null;
};

const calculateBattleHP = (baseHp, level, iv = 31, ev = 0) => (
  Math.floor(((2 * baseHp + iv + Math.floor(ev / 4)) * level) / 100) + level + 10
);

const calculateBattleStat = (baseStat, level, iv = 31, ev = 0) => (
  Math.floor(((2 * baseStat + iv + Math.floor(ev / 4)) * level) / 100) + 5
);

const toBattleStats = (pokemon, template) => {
  const level = Number(pokemon.level || 50);
  const hpIv = pokemon.ivs?.hp ?? pokemon.iv?.hp ?? 31;
  const hpEv = pokemon.effort?.hp ?? pokemon.evs?.hp ?? 0;
  const baseHp = Number(pokemon.baseHp || template?.baseHp || 50);

  return {
    hp: calculateBattleHP(baseHp, level, hpIv, hpEv),
    atk: calculateBattleStat(Number(pokemon.baseAttack || template?.baseAttack || 50), level, pokemon.ivs?.attack ?? pokemon.ivs?.atk ?? pokemon.iv?.attack ?? 31, pokemon.effort?.attack ?? pokemon.evs?.atk ?? 0),
    def: calculateBattleStat(Number(pokemon.baseDefense || template?.baseDefense || 50), level, pokemon.ivs?.defense ?? pokemon.ivs?.def ?? pokemon.iv?.defense ?? 31, pokemon.effort?.defense ?? pokemon.evs?.def ?? 0),
    spa: calculateBattleStat(Number(pokemon.baseSpAttack || pokemon.baseSpecialAttack || template?.baseSpAttack || template?.baseSpecialAttack || 50), level, pokemon.ivs?.specialAttack ?? pokemon.ivs?.spa ?? pokemon.iv?.specialAttack ?? 31, pokemon.effort?.specialAttack ?? pokemon.evs?.spa ?? 0),
    spd: calculateBattleStat(Number(pokemon.baseSpDefense || pokemon.baseSpecialDefense || template?.baseSpDefense || template?.baseSpecialDefense || 50), level, pokemon.ivs?.specialDefense ?? pokemon.ivs?.spd ?? pokemon.iv?.specialDefense ?? 31, pokemon.effort?.specialDefense ?? pokemon.evs?.spd ?? 0),
    spe: calculateBattleStat(Number(pokemon.baseSpeed || template?.baseSpeed || 50), level, pokemon.ivs?.speed ?? pokemon.ivs?.spe ?? pokemon.iv?.speed ?? 31, pokemon.effort?.speed ?? pokemon.evs?.spe ?? 0),
  };
};

const toBattleFormat = (pokemon) => {
  const template = resolvePokemonTemplate(pokemon);
  const speciesName = pokemon.nameEn || template?.nameEn || pokemon.species || pokemon.name || 'Ditto';
  const stats = toBattleStats(pokemon, template);
  const moves = (pokemon.moves || [])
    .map(toBattleMoveName)
    .filter(Boolean)
    .slice(0, 4)
    .map(name => ({ name, id: name }));

  return {
    ...pokemon,
    name: speciesName,
    species: speciesName,
    nickname: pokemon.nickname || pokemon.name || speciesName,
    speciesName: pokemon.name || template?.name || speciesName,
    level: Number(pokemon.level || 50),
    types: [
      normalizeType(pokemon.type || template?.type),
      pokemon.type2 || template?.type2 ? normalizeType(pokemon.type2 || template?.type2) : null,
    ].filter(Boolean),
    ability: resolveCustomAbility(pokemon.abilityEn || pokemon.ability),
    item: resolveCustomItem(pokemon.heldItem || pokemon.item || pokemon.heldItemName),
    nature: pokemon.nature || 'Hardy',
    stats,
    baseStats: stats,
    ivs: {
      hp: pokemon.ivs?.hp ?? pokemon.iv?.hp ?? 31,
      atk: pokemon.ivs?.attack ?? pokemon.ivs?.atk ?? pokemon.iv?.attack ?? 31,
      def: pokemon.ivs?.defense ?? pokemon.ivs?.def ?? pokemon.iv?.defense ?? 31,
      spa: pokemon.ivs?.specialAttack ?? pokemon.ivs?.spa ?? pokemon.iv?.specialAttack ?? 31,
      spd: pokemon.ivs?.specialDefense ?? pokemon.ivs?.spd ?? pokemon.iv?.specialDefense ?? 31,
      spe: pokemon.ivs?.speed ?? pokemon.ivs?.spe ?? pokemon.iv?.speed ?? 31,
    },
    evs: {
      hp: pokemon.effort?.hp ?? pokemon.evs?.hp ?? 0,
      atk: pokemon.effort?.attack ?? pokemon.evs?.atk ?? 0,
      def: pokemon.effort?.defense ?? pokemon.evs?.def ?? 0,
      spa: pokemon.effort?.specialAttack ?? pokemon.evs?.spa ?? 0,
      spd: pokemon.effort?.specialDefense ?? pokemon.evs?.spd ?? 0,
      spe: pokemon.effort?.speed ?? pokemon.evs?.spe ?? 0,
    },
    hp: stats.hp,
    maxHP: stats.hp,
    currentHP: stats.hp,
    moves: moves.length > 0 ? moves : [{ name: 'tackle', id: 'tackle' }],
  };
};

const getMemberName = member => member?.name || member?.displayName || member?.email || 'Unknown';

const getOwnedPokemonList = (value) => {
  if (Array.isArray(value)) return value.filter(pokemon => pokemon && pokemon.uniqueId);
  return Object.values(value || {}).filter(pokemon => pokemon && pokemon.uniqueId);
};

const pokemonKey = (pokemon, fallback) => pokemon?.uniqueId || pokemon?.id || `${pokemon?.name || 'pokemon'}-${fallback}`;

const getSelectablePokemon = (entryPokemon, partnerPokemon) => {
  const partnerKey = partnerPokemon?.uniqueId ? pokemonKey(partnerPokemon, 'partner') : null;
  const partnerList = partnerPokemon?.uniqueId ? [partnerPokemon] : [];
  const entryList = entryPokemon.filter((pokemon, index) => pokemonKey(pokemon, index) !== partnerKey);
  return [...partnerList, ...entryList];
};

const getSelectedPokemon = (entryPokemon, partnerPokemon, selectedIds) => {
  const selectablePokemon = getSelectablePokemon(entryPokemon, partnerPokemon);
  return selectedIds
    .map(id => selectablePokemon.find((pokemon, index) => pokemonKey(pokemon, index) === id))
    .filter(Boolean);
};

const buildBattleTeam = (entryPokemon, partnerPokemon, selectedIds) => (
  getSelectedPokemon(entryPokemon, partnerPokemon, selectedIds).map(toBattleFormat)
);

const PokemonName = ({ pokemon }) => {
  if (!pokemon) return <span>-</span>;
  const displayName = getOwnedPokemonDisplayParts(pokemon);

  return (
    <span>
      <span className="font-bold">{displayName.primary}</span>
      {displayName.hasNickname && <span className="ml-1 text-xs text-gray-500">{displayName.species}</span>}
    </span>
  );
};

const PartnerCard = ({ canSelect, onClick, order, pokemon, selected }) => (
  <button
    type="button"
    onClick={pokemon?.uniqueId ? onClick : undefined}
    disabled={!pokemon?.uniqueId || (!selected && !canSelect)}
    className={`w-full rounded-lg border p-3 text-left transition-colors ${
      selected
        ? 'border-amber-600 bg-amber-500 text-white'
        : pokemon?.uniqueId && canSelect
          ? 'border-amber-200 bg-amber-50 hover:border-amber-400 hover:bg-amber-100'
          : 'border-gray-200 bg-gray-50 text-gray-500'
    }`}
  >
    <div className={`mb-1 text-xs font-bold uppercase tracking-wide ${selected ? 'text-white' : 'text-amber-700'}`}>파트너</div>
    {pokemon?.uniqueId ? (
      <div className="flex items-center justify-between gap-2 text-sm">
        <div>
          <PokemonName pokemon={pokemon} /> <span className={selected ? 'text-white/80' : 'text-gray-600'}>Lv.{pokemon.level || '?'}</span>
        </div>
        {selected && (
          <span className="rounded-full bg-white px-2 py-1 text-xs font-bold text-gray-900">
            {order === 1 ? '선봉' : `${order}번`}
          </span>
        )}
      </div>
    ) : (
      <div className="text-sm text-gray-500">파트너 없음</div>
    )}
  </button>
);

const EntrySelector = ({
  accent,
  entryPokemon,
  loading,
  partnerPokemon,
  requiredCount,
  selectedIds,
  setSelectedIds,
}) => {
  const partnerKey = partnerPokemon?.uniqueId ? pokemonKey(partnerPokemon, 'partner') : null;
  const partnerOrder = partnerKey ? selectedIds.indexOf(partnerKey) + 1 : 0;
  const partnerSelected = partnerOrder > 0;
  const entryList = partnerKey
    ? entryPokemon.filter((pokemon, index) => pokemonKey(pokemon, index) !== partnerKey)
    : entryPokemon;
  const accentClass = accent === 'blue'
    ? {
        border: 'border-blue-500 bg-blue-50',
        selected: 'border-blue-600 bg-blue-600 text-white',
        idle: 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-100',
        text: 'text-blue-900',
      }
    : {
        border: 'border-red-500 bg-red-50',
        selected: 'border-red-600 bg-red-600 text-white',
        idle: 'border-gray-200 bg-white hover:border-red-300 hover:bg-red-100',
        text: 'text-red-900',
      };

  const togglePokemon = (pokemon, index) => {
    const key = pokemonKey(pokemon, index);
    setSelectedIds((prev) => {
      if (prev.includes(key)) return prev.filter(id => id !== key);
      if (prev.length >= requiredCount) return prev;
      return [...prev, key];
    });
  };

  return (
    <div className={`rounded-lg border-2 p-5 ${accentClass.border}`}>
      <PartnerCard
        canSelect={selectedIds.length < requiredCount}
        onClick={() => togglePokemon(partnerPokemon, 'partner')}
        order={partnerOrder}
        pokemon={partnerPokemon}
        selected={partnerSelected}
      />

      <div className="mt-4 flex items-center justify-between gap-3">
        <h3 className={`font-bold ${accentClass.text}`}>엔트리 선택</h3>
        <span className="text-sm font-semibold text-gray-600">
          {selectedIds.length}/{requiredCount}
        </span>
      </div>

      {loading ? (
        <p className="mt-3 text-sm text-gray-500">포켓몬을 불러오는 중입니다.</p>
      ) : entryList.length === 0 ? (
        <p className="mt-3 text-sm text-gray-500">엔트리에 포켓몬이 없습니다.</p>
      ) : (
        <div className="mt-3 grid max-h-[28rem] gap-2 overflow-y-auto">
          {entryList.map((pokemon, index) => {
            const key = pokemonKey(pokemon, index);
            const order = selectedIds.indexOf(key) + 1;
            const selected = order > 0;
            const displayName = getOwnedPokemonDisplayParts(pokemon);

            return (
              <button
                key={key}
                type="button"
                onClick={() => togglePokemon(pokemon, index)}
                className={`rounded-lg border p-3 text-left transition-colors ${selected ? accentClass.selected : accentClass.idle}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-bold">
                      {displayName.primary} <span className="text-sm opacity-80">Lv.{pokemon.level || '?'}</span>
                    </div>
                    {displayName.hasNickname && (
                      <div className="text-xs opacity-75">{displayName.species}</div>
                    )}
                    <div className="mt-1 text-xs opacity-80">
                      HP {pokemon.hp || pokemon.maxHp || '?'} · 기술 {pokemon.moves?.length || 0}개
                    </div>
                  </div>
                  {selected && (
                    <span className="rounded-full bg-white px-2 py-1 text-xs font-bold text-gray-900">
                      {order === 1 ? '선봉' : `${order}번`}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

const formatBattleLogDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  return date.toLocaleString('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const BattleLogArchiveModal = ({ logs, onClose }) => {
  const [selectedId, setSelectedId] = useState(logs[0]?.id || null);
  const selectedLog = logs.find(log => log.id === selectedId) || logs[0] || null;

  useEffect(() => {
    setSelectedId(logs[0]?.id || null);
  }, [logs]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">역대 배틀 로그</h2>
            <p className="text-sm text-gray-500">완료된 배틀 기록을 다시 확인합니다.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-bold text-white hover:bg-gray-700"
          >
            닫기
          </button>
        </div>

        {logs.length === 0 ? (
          <div className="p-10 text-center text-gray-500">아직 저장된 배틀 로그가 없습니다.</div>
        ) : (
          <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[280px_minmax(0,1fr)]">
            <div className="min-h-0 overflow-y-auto border-r border-gray-200 bg-gray-50 p-3">
              {logs.map(log => (
                <button
                  key={log.id}
                  type="button"
                  onClick={() => setSelectedId(log.id)}
                  className={`mb-2 w-full rounded-lg border px-3 py-3 text-left transition-colors ${
                    selectedLog?.id === log.id
                      ? 'border-gray-900 bg-white text-gray-950 shadow-sm'
                      : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-white'
                  }`}
                >
                  <div className="text-sm font-bold">{log.player1Name} vs {log.player2Name}</div>
                  <div className="mt-1 text-xs text-gray-500">
                    {formatBattleLogDate(log.createdAt)} · {log.turn}턴 · {log.winner || '-'} 승리
                  </div>
                </button>
              ))}
            </div>

            <div className="min-h-0 overflow-y-auto p-5">
              {selectedLog && (
                <>
                  <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <div className="text-lg font-bold text-gray-900">
                      {selectedLog.player1Name} vs {selectedLog.player2Name}
                    </div>
                    <div className="mt-1 text-sm text-gray-600">
                      {formatBattleLogDate(selectedLog.createdAt)} · 총 {selectedLog.turn}턴 · 승자: {selectedLog.winner || '-'}
                    </div>
                    <div className="mt-3 grid gap-3 text-sm md:grid-cols-2">
                      <div>
                        <div className="font-bold text-blue-800">Player 1</div>
                        <div className="text-gray-700">{selectedLog.player1Team?.join(', ') || '-'}</div>
                      </div>
                      <div>
                        <div className="font-bold text-red-800">Player 2</div>
                        <div className="text-gray-700">{selectedLog.player2Team?.join(', ') || '-'}</div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1 rounded-lg bg-gray-50 p-4">
                    {(selectedLog.log || []).map((entry, index) => (
                      <div
                        key={`${entry.type}-${entry.message}-${index}`}
                        className={`rounded px-3 py-2 text-sm ${
                          entry.type === 'turn'        ? 'bg-gray-700 font-bold text-white text-center tracking-widest'
                          : entry.type === 'system'      ? 'bg-blue-100 font-bold text-blue-900'
                          : entry.type === 'damage'    ? 'bg-red-50 text-red-800'
                          : entry.type === 'faint'     ? 'bg-gray-200 font-semibold text-gray-700'
                          : entry.type === 'winner'    ? 'bg-yellow-100 text-lg font-bold text-yellow-900'
                          : entry.type === 'item'      ? 'bg-amber-50 text-amber-800'
                          : entry.type === 'status'    ? 'bg-yellow-50 text-yellow-800 font-medium'
                          : entry.type === 'boost'     ? 'bg-indigo-50 text-indigo-700'
                          : entry.type === 'weather'   ? 'bg-sky-50 text-sky-700'
                          : entry.type === 'terrain'   ? 'bg-green-50 text-green-700'
                          : entry.type === 'critical'  ? 'bg-orange-50 text-orange-700 font-semibold'
                          : entry.type === 'miss'      ? 'bg-gray-100 text-gray-500 italic'
                          : entry.type === 'fail'      ? 'bg-gray-100 text-gray-500 italic'
                          : entry.type === 'recoil'    ? 'bg-red-50 text-red-600'
                          : entry.type === 'drain'     ? 'bg-green-50 text-green-600'
                          : entry.type === 'blocked'   ? 'bg-gray-100 text-gray-500 italic'
                          : entry.type === 'error'     ? 'bg-red-100 text-red-700 font-semibold'
                          : 'bg-white text-gray-700'
                        }`}
                      >
                        {entry.message}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export function BattleView() {
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [loadingPokemon, setLoadingPokemon] = useState({ player1: false, player2: false });
  const [members, setMembers] = useState([]);
  const [battleSize, setBattleSize] = useState(3);
  const [selectedUser1, setSelectedUser1] = useState('');
  const [selectedUser2, setSelectedUser2] = useState('');
  const [player1Data, setPlayer1Data] = useState({ entryPokemon: [], partnerPokemon: null });
  const [player2Data, setPlayer2Data] = useState({ entryPokemon: [], partnerPokemon: null });
  const [selectedP1Ids, setSelectedP1Ids] = useState([]);
  const [selectedP2Ids, setSelectedP2Ids] = useState([]);
  const [battleStarted, setBattleStarted] = useState(false);
  const [battleLogArchive, setBattleLogArchive] = useState(() => readBattleLogArchive());
  const [showBattleLogArchive, setShowBattleLogArchive] = useState(false);

  useEffect(() => {
    const loadMembers = async () => {
      try {
        setLoadingMembers(true);

        const membersSnapshot = await get(ref(database, 'members'));
        let membersList = [];

        if (membersSnapshot.exists()) {
          membersList = Object.entries(membersSnapshot.val())
            .filter(([, data]) => data !== null)
            .map(([uid, data]) => ({ uid, ...data }));
        }

        const usersSnapshot = await get(ref(database, 'users'));
        if (usersSnapshot.exists()) {
          const existingUids = membersList.map(member => member.uid);
          const additionalUsers = Object.entries(usersSnapshot.val())
            .filter(([uid]) => !existingUids.includes(uid))
            .map(([uid, data]) => ({
              uid,
              name: data.name || data.displayName || data.email || uid.substring(0, 8),
              email: data.email,
            }));
          membersList = [...membersList, ...additionalUsers];
        }

        setMembers(membersList.sort((a, b) => getMemberName(a).localeCompare(getMemberName(b), 'ko')));
      } catch (error) {
        console.error('회원 로드 실패:', error);
      } finally {
        setLoadingMembers(false);
      }
    };

    loadMembers();
  }, []);

  const loadPlayerPokemon = async (player, userId) => {
    const setUser = player === 'player1' ? setSelectedUser1 : setSelectedUser2;
    const setData = player === 'player1' ? setPlayer1Data : setPlayer2Data;
    const setSelectedIds = player === 'player1' ? setSelectedP1Ids : setSelectedP2Ids;

    setUser(userId);
    setData({ entryPokemon: [], partnerPokemon: null });
    setSelectedIds([]);
    setBattleStarted(false);

    if (!userId) return;

    try {
      setLoadingPokemon(prev => ({ ...prev, [player]: true }));
      const snapshot = await get(ref(database, `members/${userId}`));

      if (!snapshot.exists()) return;

      const memberData = snapshot.val();
      const entryPokemon = getOwnedPokemonList(memberData.caughtPokemon).slice(0, 6);

      setData({
        entryPokemon,
        partnerPokemon: memberData.partnerPokemon || null,
      });
    } catch (error) {
      console.error('포켓몬 로드 실패:', error);
    } finally {
      setLoadingPokemon(prev => ({ ...prev, [player]: false }));
    }
  };

  useEffect(() => {
    const p1SelectableIds = getSelectablePokemon(player1Data.entryPokemon, player1Data.partnerPokemon)
      .map((pokemon, index) => pokemonKey(pokemon, index));
    const p2SelectableIds = getSelectablePokemon(player2Data.entryPokemon, player2Data.partnerPokemon)
      .map((pokemon, index) => pokemonKey(pokemon, index));

    setSelectedP1Ids(prev => prev.filter(id => p1SelectableIds.includes(id)).slice(0, Math.min(battleSize, p1SelectableIds.length)));
    setSelectedP2Ids(prev => prev.filter(id => p2SelectableIds.includes(id)).slice(0, Math.min(battleSize, p2SelectableIds.length)));
  }, [battleSize, player1Data.entryPokemon, player1Data.partnerPokemon, player2Data.entryPokemon, player2Data.partnerPokemon]);

  const p1RequiredCount = Math.min(battleSize, getSelectablePokemon(player1Data.entryPokemon, player1Data.partnerPokemon).length);
  const p2RequiredCount = Math.min(battleSize, getSelectablePokemon(player2Data.entryPokemon, player2Data.partnerPokemon).length);
  const canStart = p1RequiredCount > 0
    && p2RequiredCount > 0
    && selectedP1Ids.length === p1RequiredCount
    && selectedP2Ids.length === p2RequiredCount;

  const player1Team = useMemo(
    () => buildBattleTeam(player1Data.entryPokemon, player1Data.partnerPokemon, selectedP1Ids),
    [player1Data.entryPokemon, player1Data.partnerPokemon, selectedP1Ids]
  );
  const player2Team = useMemo(
    () => buildBattleTeam(player2Data.entryPokemon, player2Data.partnerPokemon, selectedP2Ids),
    [player2Data.entryPokemon, player2Data.partnerPokemon, selectedP2Ids]
  );

  const player1Name = getMemberName(members.find(member => member.uid === selectedUser1));
  const player2Name = getMemberName(members.find(member => member.uid === selectedUser2));

  const handleBattleFinished = (battleSummary) => {
    const archiveEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
      player1Name,
      player2Name,
      player1Team: player1Team.map(pokemon => getOwnedPokemonDisplayParts(pokemon).primary),
      player2Team: player2Team.map(pokemon => getOwnedPokemonDisplayParts(pokemon).primary),
      ...battleSummary,
    };

    setBattleLogArchive((prev) => {
      const next = [archiveEntry, ...prev].slice(0, MAX_BATTLE_LOG_ARCHIVE);
      writeBattleLogArchive(next);
      return next;
    });
  };

  const renderBattleLogArchiveButton = () => (
    <button
      type="button"
      onClick={() => setShowBattleLogArchive(true)}
      className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-bold text-gray-800 shadow-sm hover:bg-gray-100"
    >
      역대 배틀 로그
      <span className="ml-2 rounded-full bg-gray-900 px-2 py-0.5 text-xs text-white">{battleLogArchive.length}</span>
    </button>
  );

  if (battleStarted && player1Team.length > 0 && player2Team.length > 0) {
    return (
      <div className="p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setBattleStarted(false)}
            className="rounded bg-gray-600 px-4 py-2 font-semibold text-white hover:bg-gray-700"
          >
            엔트리 다시 고르기
          </button>
          {renderBattleLogArchiveButton()}
        </div>
        <AdvancedBattleSimulator
          player1Team={player1Team}
          player2Team={player2Team}
          autoStart
          onBattleFinished={handleBattleFinished}
          onExit={() => setBattleStarted(false)}
        />
        {showBattleLogArchive && (
          <BattleLogArchiveModal logs={battleLogArchive} onClose={() => setShowBattleLogArchive(false)} />
        )}
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">포켓몬 배틀</h1>
          <p className="mt-1 text-sm text-gray-600">파트너는 별도 표시하고, 배틀에는 각 트레이너의 엔트리 앞 6마리 중 선택한 포켓몬만 참가합니다.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {renderBattleLogArchiveButton()}
          <div className="inline-flex rounded-lg border border-gray-300 bg-white p-1">
            {[3, 6].map(size => (
              <button
                key={size}
                type="button"
                onClick={() => setBattleSize(size)}
                className={`rounded-md px-4 py-2 text-sm font-bold ${battleSize === size ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
              >
                {size}마리
              </button>
            ))}
          </div>
        </div>
      </div>

      {loadingMembers ? (
        <div className="rounded-lg bg-white p-8 text-center text-gray-600 shadow">회원 데이터를 불러오는 중입니다.</div>
      ) : members.length === 0 ? (
        <div className="rounded-lg bg-white p-8 text-center text-gray-600 shadow">회원이 없습니다.</div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="space-y-4">
              <div>
                <label className="mb-2 block font-semibold text-gray-800">Player 1 트레이너</label>
                <select
                  value={selectedUser1}
                  onChange={event => loadPlayerPokemon('player1', event.target.value)}
                  className="w-full rounded border bg-white p-2"
                >
                  <option value="">트레이너 선택</option>
                  {members.map(member => (
                    <option key={member.uid} value={member.uid}>{getMemberName(member)}</option>
                  ))}
                </select>
              </div>
              {selectedUser1 && (
                <EntrySelector
                  accent="blue"
                  entryPokemon={player1Data.entryPokemon}
                  loading={loadingPokemon.player1}
                  partnerPokemon={player1Data.partnerPokemon}
                  requiredCount={p1RequiredCount}
                  selectedIds={selectedP1Ids}
                  setSelectedIds={setSelectedP1Ids}
                />
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block font-semibold text-gray-800">Player 2 트레이너</label>
                <select
                  value={selectedUser2}
                  onChange={event => loadPlayerPokemon('player2', event.target.value)}
                  className="w-full rounded border bg-white p-2"
                >
                  <option value="">트레이너 선택</option>
                  {members.map(member => (
                    <option key={member.uid} value={member.uid}>{getMemberName(member)}</option>
                  ))}
                </select>
              </div>
              {selectedUser2 && (
                <EntrySelector
                  accent="red"
                  entryPokemon={player2Data.entryPokemon}
                  loading={loadingPokemon.player2}
                  partnerPokemon={player2Data.partnerPokemon}
                  requiredCount={p2RequiredCount}
                  selectedIds={selectedP2Ids}
                  setSelectedIds={setSelectedP2Ids}
                />
              )}
            </div>
          </div>

          <div className="mt-8 rounded-lg bg-gray-50 p-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <div className="text-sm font-semibold text-gray-600">Player 1 선봉</div>
                <div className="mt-1 text-gray-900">
                  <PokemonName pokemon={getSelectedPokemon(player1Data.entryPokemon, player1Data.partnerPokemon, selectedP1Ids)[0]} />
                </div>
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-600">Player 2 선봉</div>
                <div className="mt-1 text-gray-900">
                  <PokemonName pokemon={getSelectedPokemon(player2Data.entryPokemon, player2Data.partnerPokemon, selectedP2Ids)[0]} />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 text-center">
            <button
              type="button"
              onClick={() => setBattleStarted(true)}
              disabled={!canStart}
              className={`rounded-lg px-8 py-4 text-xl font-bold transition-colors ${
                canStart
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'cursor-not-allowed bg-gray-300 text-gray-500'
              }`}
            >
              배틀 시작
            </button>
            {!canStart && (
              <p className="mt-2 text-sm text-gray-500">
                양쪽 모두 필요한 엔트리 수만큼 선택해야 합니다.
              </p>
            )}
          </div>
        </>
      )}
      {showBattleLogArchive && (
        <BattleLogArchiveModal logs={battleLogArchive} onClose={() => setShowBattleLogArchive(false)} />
      )}
    </div>
  );
}

export default BattleView;
