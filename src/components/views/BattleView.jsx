import React, { useState, useEffect } from 'react';
import { ref, get } from 'firebase/database';
import { database } from '../../firebase';
import AdvancedBattleSimulator from '../../battle/components/AdvancedBattleSimulator';
import { toCalcAbilityName } from '../../utils/abilityUtils';
import allPokemonMaster from '../../data/allPokemon.json';
import customBattleData from '../../data/customBattleData.json';

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
  페어리: 'Fairy'
};

const normalizeType = (type) => TYPE_MAP[type] || type || 'Normal';

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

const resolveCustomAbility = (value) =>
  CUSTOM_ABILITY_ALIASES[normalizeLookupKey(value)] || toCalcAbilityName(value) || value || 'Adaptability';

const resolveCustomItem = (value) =>
  CUSTOM_ITEM_ALIASES[normalizeLookupKey(value)] || value || '';

const POKEMON_NAME_MAP = allPokemonMaster.reduce((map, pokemon) => {
  [
    pokemon.name,
    pokemon.nameEn,
    pokemon.id,
    pokemon.number,
    pokemon.displayNumber
  ].forEach(key => {
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
    pokemon.originalNumber
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
  const hpIv = pokemon.ivs?.hp ?? 31;
  const hpEv = pokemon.effort?.hp ?? pokemon.evs?.hp ?? 0;
  const baseHp = Number(pokemon.baseHp || template?.baseHp || 50);

  return {
    hp: Number(pokemon.maxHp || calculateBattleHP(baseHp, level, hpIv, hpEv)),
    atk: Number(pokemon.stats?.atk || pokemon.stats?.attack || calculateBattleStat(Number(pokemon.baseAttack || template?.baseAttack || 50), level, pokemon.ivs?.attack ?? pokemon.ivs?.atk ?? 31, pokemon.effort?.attack ?? pokemon.evs?.atk ?? 0)),
    def: Number(pokemon.stats?.def || pokemon.stats?.defense || calculateBattleStat(Number(pokemon.baseDefense || template?.baseDefense || 50), level, pokemon.ivs?.defense ?? pokemon.ivs?.def ?? 31, pokemon.effort?.defense ?? pokemon.evs?.def ?? 0)),
    spa: Number(pokemon.stats?.spa || pokemon.stats?.spAttack || calculateBattleStat(Number(pokemon.baseSpAttack || pokemon.baseSpecialAttack || template?.baseSpAttack || template?.baseSpecialAttack || 50), level, pokemon.ivs?.specialAttack ?? pokemon.ivs?.spa ?? 31, pokemon.effort?.specialAttack ?? pokemon.evs?.spa ?? 0)),
    spd: Number(pokemon.stats?.spd || pokemon.stats?.spDefense || calculateBattleStat(Number(pokemon.baseSpDefense || pokemon.baseSpecialDefense || template?.baseSpDefense || template?.baseSpecialDefense || 50), level, pokemon.ivs?.specialDefense ?? pokemon.ivs?.spd ?? 31, pokemon.effort?.specialDefense ?? pokemon.evs?.spd ?? 0)),
    spe: Number(pokemon.stats?.spe || pokemon.stats?.speed || calculateBattleStat(Number(pokemon.baseSpeed || template?.baseSpeed || 50), level, pokemon.ivs?.speed ?? pokemon.ivs?.spe ?? 31, pokemon.effort?.speed ?? pokemon.evs?.spe ?? 0))
  };
};

const toBattleFormat = (pokemon) => {
  const template = resolvePokemonTemplate(pokemon);
  const speciesName = pokemon.nameEn || template?.nameEn || pokemon.species || pokemon.name || 'ditto';
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
    nickname: pokemon.nickname || pokemon.name,
    level: Number(pokemon.level || 50),
    types: [
      normalizeType(pokemon.type || template?.type),
      pokemon.type2 || template?.type2 ? normalizeType(pokemon.type2 || template?.type2) : null
    ].filter(Boolean),
    ability: resolveCustomAbility(pokemon.ability),
    item: resolveCustomItem(pokemon.heldItem || pokemon.item || pokemon.heldItemName),
    nature: pokemon.nature || 'Hardy',
    stats,
    baseStats: stats,
    ivs: {
      hp: pokemon.ivs?.hp ?? 31,
      atk: pokemon.ivs?.attack ?? pokemon.ivs?.atk ?? 31,
      def: pokemon.ivs?.defense ?? pokemon.ivs?.def ?? 31,
      spa: pokemon.ivs?.specialAttack ?? pokemon.ivs?.spa ?? 31,
      spd: pokemon.ivs?.specialDefense ?? pokemon.ivs?.spd ?? 31,
      spe: pokemon.ivs?.speed ?? pokemon.ivs?.spe ?? 31
    },
    evs: {
      hp: pokemon.effort?.hp ?? pokemon.evs?.hp ?? 0,
      atk: pokemon.effort?.attack ?? pokemon.evs?.atk ?? 0,
      def: pokemon.effort?.defense ?? pokemon.evs?.def ?? 0,
      spa: pokemon.effort?.specialAttack ?? pokemon.evs?.spa ?? 0,
      spd: pokemon.effort?.specialDefense ?? pokemon.evs?.spd ?? 0,
      spe: pokemon.effort?.speed ?? pokemon.evs?.spe ?? 0
    },
    hp: stats.hp,
    maxHP: stats.hp,
    currentHP: stats.hp,
    moves: moves.length > 0 ? moves : [{ name: 'tackle', id: 'tackle' }]
  };
};

const buildBattleTeam = (pokemonList, selectedPokemon) => {
  const orderedPokemon = selectedPokemon
    ? [
        selectedPokemon,
        ...pokemonList.filter(pokemon => pokemon?.uniqueId !== selectedPokemon.uniqueId)
      ]
    : pokemonList;

  return orderedPokemon
    .filter(pokemon => pokemon && pokemon.uniqueId)
    .slice(0, 6)
    .map(toBattleFormat);
};

/**
 * 배틀 뷰 - 완전 독립 버전 (Context 불필요)
 */
export function BattleView() {
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState([]);
  const [selectedUser1, setSelectedUser1] = useState(null);
  const [selectedUser2, setSelectedUser2] = useState(null);
  const [user1Pokemon, setUser1Pokemon] = useState([]);
  const [user2Pokemon, setUser2Pokemon] = useState([]);
  const [selectedPokemon1, setSelectedPokemon1] = useState(null);
  const [selectedPokemon2, setSelectedPokemon2] = useState(null);
  const [battleStarted, setBattleStarted] = useState(false);

  // 회원 목록 로드
  useEffect(() => {
    loadMembers();
  }, []);

  const loadMembers = async () => {
    try {
      setLoading(true);
      
      // 1. members에서 로드
      const membersRef = ref(database, 'members');
      const membersSnapshot = await get(membersRef);
      
      let membersList = [];
      
      if (membersSnapshot.exists()) {
        const membersData = membersSnapshot.val();
        membersList = Object.entries(membersData)
          .filter(([_, data]) => data !== null)
          .map(([uid, data]) => ({
            uid,
            ...data
          }));
        console.log('📋 members에서 로드:', membersList.length, '명');
      }
      
      // 2. users에서 로드 (members에 없는 유저 추가)
      const usersRef = ref(database, 'users');
      const usersSnapshot = await get(usersRef);
      
      if (usersSnapshot.exists()) {
        const usersData = usersSnapshot.val();
        const existingUids = membersList.map(m => m.uid);
        
        const additionalUsers = Object.entries(usersData)
          .filter(([uid]) => !existingUids.includes(uid))
          .map(([uid, data]) => ({
            uid,
            name: data.name || data.displayName || data.email || uid.substring(0, 8),
            email: data.email
          }));
        
        membersList = [...membersList, ...additionalUsers];
        console.log('👥 users에서 추가:', additionalUsers.length, '명');
      }
      
      setMembers(membersList);
      console.log('✅ 전체 회원:', membersList.length, '명', membersList);
      
    } catch (err) {
      console.error('❌ 회원 로드 실패:', err);
    } finally {
      setLoading(false);
    }
  };

  // User 1 포켓몬 로드
  const loadUser1Pokemon = async (userId) => {
    try {
      setLoading(true);
      setSelectedUser1(userId);
      setSelectedPokemon1(null);
      setBattleStarted(false);

      // members에서 해당 유저의 포켓몬 전체 가져오기
      const memberRef = ref(database, `members/${userId}`);
      const snapshot = await get(memberRef);

      if (snapshot.exists()) {
        const memberData = snapshot.val();
        const pokemonData = memberData.caughtPokemon || [];
        const pokemonList = Array.isArray(pokemonData)
          ? pokemonData.filter(p => p && p.uniqueId)
          : Object.values(pokemonData).filter(p => p && p.uniqueId);

        if (memberData.partnerPokemon?.uniqueId) {
          pokemonList.unshift(memberData.partnerPokemon);
        }
        
        setUser1Pokemon(pokemonList);
        console.log('✅ Player 1 포켓몬:', pokemonList.length, '마리');
      } else {
        setUser1Pokemon([]);
        console.warn('⚠️ Player 1의 포켓몬이 없습니다.');
      }
    } catch (err) {
      console.error('❌ 포켓몬 로드 실패:', err);
    } finally {
      setLoading(false);
    }
  };

  // User 2 포켓몬 로드
  const loadUser2Pokemon = async (userId) => {
    try {
      setLoading(true);
      setSelectedUser2(userId);
      setSelectedPokemon2(null);
      setBattleStarted(false);

      // members에서 해당 유저의 포켓몬 전체 가져오기
      const memberRef = ref(database, `members/${userId}`);
      const snapshot = await get(memberRef);

      if (snapshot.exists()) {
        const memberData = snapshot.val();
        const pokemonData = memberData.caughtPokemon || [];
        const pokemonList = Array.isArray(pokemonData)
          ? pokemonData.filter(p => p && p.uniqueId)
          : Object.values(pokemonData).filter(p => p && p.uniqueId);

        if (memberData.partnerPokemon?.uniqueId) {
          pokemonList.unshift(memberData.partnerPokemon);
        }
        
        setUser2Pokemon(pokemonList);
        console.log('✅ Player 2 포켓몬:', pokemonList.length, '마리');
      } else {
        setUser2Pokemon([]);
        console.warn('⚠️ Player 2의 포켓몬이 없습니다.');
      }
    } catch (err) {
      console.error('❌ 포켓몬 로드 실패:', err);
    } finally {
      setLoading(false);
    }
  };

  const startBattle = () => {
    if (user1Pokemon.length > 0 && user2Pokemon.length > 0) {
      console.log('⚔️ 배틀 시작!');
      setBattleStarted(true);
    }
  };

  const backToSelection = () => {
    setBattleStarted(false);
  };

  // 배틀 중
  if (battleStarted && user1Pokemon.length > 0 && user2Pokemon.length > 0) {
    const player1Team = buildBattleTeam(user1Pokemon, selectedPokemon1);
    const player2Team = buildBattleTeam(user2Pokemon, selectedPokemon2);

    return (
      <div className="p-6">
        <button
          onClick={backToSelection}
          className="mb-4 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
        >
          ← 포켓몬 재선택
        </button>
        <AdvancedBattleSimulator
          player1Team={player1Team}
          player2Team={player2Team}
        />
      </div>
    );
  }

  // 선택 화면
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">포켓몬 배틀</h1>

      {loading && members.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">⚡</div>
          <p className="text-lg text-gray-600">회원 데이터를 불러오는 중...</p>
        </div>
      ) : members.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">😥</div>
          <p className="text-lg text-gray-600">회원이 없습니다.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Player 1 */}
            <div className="border rounded-lg p-6 bg-blue-50">
              <h2 className="text-xl font-bold mb-4 text-blue-800">Player 1</h2>
              
              <div className="mb-4">
                <label className="block font-semibold mb-2">트레이너 선택:</label>
                <select
                  value={selectedUser1 || ''}
                  onChange={(e) => loadUser1Pokemon(e.target.value)}
                  className="w-full p-2 border rounded bg-white"
                  disabled={loading}
                >
                  <option value="">-- 선택하세요 --</option>
                  {members.map((member, idx) => (
                    <option key={member.uid || idx} value={member.uid}>
                      {member.name || member.displayName || member.email || 'Unknown'}
                    </option>
                  ))}
                </select>
              </div>

              {selectedUser1 && (
                <div>
                  <label className="block font-semibold mb-2">포켓몬 선택:</label>
                  {loading ? (
                    <p className="text-gray-500">로딩 중...</p>
                  ) : user1Pokemon.length === 0 ? (
                    <p className="text-gray-500">포켓몬이 없습니다.</p>
                  ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {user1Pokemon.map((pokemon, idx) => (
                        <button
                          key={pokemon.uniqueId || idx}
                          onClick={() => setSelectedPokemon1(pokemon)}
                          className={`w-full p-3 rounded text-left transition-colors ${
                            selectedPokemon1?.uniqueId === pokemon.uniqueId
                              ? 'bg-blue-500 text-white'
                              : 'bg-white hover:bg-blue-100'
                          }`}
                        >
                          <div className="font-bold">
                            {pokemon.nickname || pokemon.name} Lv.{pokemon.level}
                          </div>
                          <div className="text-sm opacity-80">
                            HP: {pokemon.hp || pokemon.maxHp || '?'} / 기술: {pokemon.moves?.length || 0}개
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Player 2 */}
            <div className="border rounded-lg p-6 bg-red-50">
              <h2 className="text-xl font-bold mb-4 text-red-800">Player 2</h2>
              
              <div className="mb-4">
                <label className="block font-semibold mb-2">트레이너 선택:</label>
                <select
                  value={selectedUser2 || ''}
                  onChange={(e) => loadUser2Pokemon(e.target.value)}
                  className="w-full p-2 border rounded bg-white"
                  disabled={loading}
                >
                  <option value="">-- 선택하세요 --</option>
                  {members.map((member, idx) => (
                    <option key={member.uid || idx} value={member.uid}>
                      {member.name || member.displayName || member.email || 'Unknown'}
                    </option>
                  ))}
                </select>
              </div>

              {selectedUser2 && (
                <div>
                  <label className="block font-semibold mb-2">포켓몬 선택:</label>
                  {loading ? (
                    <p className="text-gray-500">로딩 중...</p>
                  ) : user2Pokemon.length === 0 ? (
                    <p className="text-gray-500">포켓몬이 없습니다.</p>
                  ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {user2Pokemon.map((pokemon, idx) => (
                        <button
                          key={pokemon.uniqueId || idx}
                          onClick={() => setSelectedPokemon2(pokemon)}
                          className={`w-full p-3 rounded text-left transition-colors ${
                            selectedPokemon2?.uniqueId === pokemon.uniqueId
                              ? 'bg-red-500 text-white'
                              : 'bg-white hover:bg-red-100'
                          }`}
                        >
                          <div className="font-bold">
                            {pokemon.nickname || pokemon.name} Lv.{pokemon.level}
                          </div>
                          <div className="text-sm opacity-80">
                            HP: {pokemon.hp || pokemon.maxHp || '?'} / 기술: {pokemon.moves?.length || 0}개
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 배틀 시작 버튼 */}
          <div className="mt-8 text-center">
            <button
              onClick={startBattle}
              disabled={user1Pokemon.length === 0 || user2Pokemon.length === 0}
              className={`px-8 py-4 rounded-lg font-bold text-xl transition-colors ${
                user1Pokemon.length > 0 && user2Pokemon.length > 0
                  ? 'bg-green-500 hover:bg-green-600 text-white'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              배틀 시작!
            </button>
          </div>

          {/* 선택 상태 */}
          {(selectedPokemon1 || selectedPokemon2) && (
            <div className="mt-6 p-4 bg-gray-100 rounded-lg">
              <h3 className="font-bold mb-2">선택된 포켓몬:</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Player 1:</p>
                  <p className="font-semibold">
                    {selectedPokemon1 
                      ? `${selectedPokemon1.nickname || selectedPokemon1.name} Lv.${selectedPokemon1.level}`
                      : '-'
                    }
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Player 2:</p>
                  <p className="font-semibold">
                    {selectedPokemon2
                      ? `${selectedPokemon2.nickname || selectedPokemon2.name} Lv.${selectedPokemon2.level}`
                      : '-'
                    }
                  </p>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default BattleView;
