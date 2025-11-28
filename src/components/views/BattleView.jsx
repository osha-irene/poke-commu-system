import React, { useState, useEffect } from 'react';
import { ref, get } from 'firebase/database';
import { database } from '../../firebase';
import { BattleArena } from '../../battle/components/BattleArena';

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

      // members에서 해당 유저의 caughtPokemon 가져오기
      const memberRef = ref(database, `members/${userId}/caughtPokemon`);
      const snapshot = await get(memberRef);

      if (snapshot.exists()) {
        const pokemonData = snapshot.val();
        // 배열이면 그대로, 객체면 배열로 변환
        const pokemonList = Array.isArray(pokemonData) 
          ? pokemonData.filter(p => p !== null)
          : Object.values(pokemonData).filter(p => p !== null);
        
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

      // members에서 해당 유저의 caughtPokemon 가져오기
      const memberRef = ref(database, `members/${userId}/caughtPokemon`);
      const snapshot = await get(memberRef);

      if (snapshot.exists()) {
        const pokemonData = snapshot.val();
        // 배열이면 그대로, 객체면 배열로 변환
        const pokemonList = Array.isArray(pokemonData)
          ? pokemonData.filter(p => p !== null)
          : Object.values(pokemonData).filter(p => p !== null);
        
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

  // Firebase → 배틀 형식 변환
  const convertToBattleFormat = (pokemon) => {
    console.log('🔄 변환할 포켓몬:', pokemon);
    
    const defaultIVs = { hp: 31, attack: 31, defense: 31, spAttack: 31, spDefense: 31, speed: 31 };
    const defaultEVs = { hp: 0, attack: 0, defense: 0, spAttack: 0, spDefense: 0, speed: 0 };

    // moves 처리: moveId를 name으로 변환
    const moves = (pokemon.moves || [])
      .filter(move => move && move.moveId)
      .slice(0, 4)
      .map(move => ({ 
        name: move.moveId  // moveId가 실제 기술 이름
      }));

    // 타입 처리
    const types = [];
    if (pokemon.type) types.push(pokemon.type);
    if (pokemon.type2) types.push(pokemon.type2);

    const converted = {
      name: pokemon.nameEn || pokemon.name,  // 영문명 우선
      level: pokemon.level || 50,
      types: types.length > 0 ? types : ['Normal'],
      ability: pokemon.ability || 'Overgrow',
      item: pokemon.heldItem || null,
      nature: pokemon.nature || 'Hardy',
      stats: {
        hp: pokemon.maxHp || pokemon.hp || 100,
        attack: 50,  // Firebase에 stats가 없으므로 기본값
        defense: 50,
        spAttack: 50,
        spDefense: 50,
        speed: 50
      },
      ivs: pokemon.ivs || defaultIVs,
      evs: pokemon.effort || defaultEVs,  // effort가 EVs
      moves: moves.length > 0 ? moves : [{ name: 'tackle' }]  // 최소 1개
    };

    console.log('✅ 변환된 포켓몬:', converted);
    return converted;
  };

  const startBattle = () => {
    if (selectedPokemon1 && selectedPokemon2) {
      console.log('⚔️ 배틀 시작!');
      setBattleStarted(true);
    }
  };

  const backToSelection = () => {
    setBattleStarted(false);
  };

  // 배틀 중
  if (battleStarted && selectedPokemon1 && selectedPokemon2) {
    return (
      <div className="p-6">
        <button
          onClick={backToSelection}
          className="mb-4 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
        >
          ← 포켓몬 재선택
        </button>
        <BattleArena
          player1Pokemon={convertToBattleFormat(selectedPokemon1)}
          player2Pokemon={convertToBattleFormat(selectedPokemon2)}
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
              disabled={!selectedPokemon1 || !selectedPokemon2}
              className={`px-8 py-4 rounded-lg font-bold text-xl transition-colors ${
                selectedPokemon1 && selectedPokemon2
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