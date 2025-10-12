import React, { useState } from 'react';
import { User, ChevronRight } from 'lucide-react';
import RegionEditModal from '../modals/RegionEditModal';
import PokedexAdminPanel from './PokedexAdminPanel';
import ShopAdminPanel from './ShopAdminPanel';

// 사용자 상세 관리 패널
function MemberDetailPanel({ member, trainer, allItems, allPokemonMaster, onClose, onGiveItem, onGivePokemon, onResetWalk, onToggleAdmin }) {
  const [selectedTab, setSelectedTab] = useState('pokemon'); // 'pokemon', 'items', 'info'
  const [pokemonMode, setPokemonMode] = useState('view'); // 'view' | 'give'
  const [itemMode, setItemMode] = useState('view'); // 'view' | 'give'
  
  // 아이템 지급 상태
  const [selectedItem, setSelectedItem] = useState(null);
  const [itemCount, setItemCount] = useState(1);
  const [categoryFilter, setCategoryFilter] = useState('all');
  
  // 포켓몬 지급 상태
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPokemon, setSelectedPokemon] = useState(null);
  const [level, setLevel] = useState(5);
  const [friendship, setFriendship] = useState(0);
  const [nickname, setNickname] = useState('');
  const [heldItemName, setHeldItemName] = useState('');
  
  const categories = [
    { id: 'all', name: '전체' },
    { id: 'ball', name: '포획' },
    { id: 'medicine', name: '회복' },
    { id: 'vitamin', name: '영양' },
    { id: 'berry', name: '나무열매' },
  ];
  
  const filteredItems = allItems.filter(item => {
    if (categoryFilter === 'all') return true;
    return item.category?.includes(categoryFilter);
  });
  
  const filteredPokemon = allPokemonMaster.filter(p => {
    const query = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(query) ||
      p.nameEn?.toLowerCase().includes(query) ||
      p.number.toString().includes(query)
    );
  }).slice(0, 50);
  
  const handleGiveItem = () => {
    if (!selectedItem || itemCount < 1) {
      alert('아이템과 개수를 선택해주세요.');
      return;
    }
    onGiveItem(member.id, selectedItem, itemCount);
    setSelectedItem(null);
    setItemCount(1);
    alert(`${member.name}님에게 ${selectedItem.name} ${itemCount}개를 지급했습니다!`);
  };
  
  const handleGivePokemon = () => {
    if (!selectedPokemon) {
      alert('포켓몬을 선택해주세요!');
      return;
    }
    
    const options = {
      level: level,
      friendship: friendship,
      nickname: nickname || null,
      heldItem: heldItemName || null,
      moves: []
    };
    
    onGivePokemon(member.id, selectedPokemon, options);
    setSelectedPokemon(null);
    setNickname('');
    setHeldItemName('');
    alert(`${member.name}님에게 ${selectedPokemon.name} (Lv.${level})을 지급했습니다!`);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* 헤더 */}
        <div className="bg-indigo-600 text-white p-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-indigo-600 font-bold text-2xl">
              {member.name.charAt(0)}
            </div>
            <div>
              <h2 className="text-2xl font-bold">{member.name}</h2>
              <p className="text-indigo-100">ID: {member.id}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white hover:bg-indigo-700 rounded-lg p-2">✕</button>
        </div>

        {/* 탭 - 3개 유지 */}
        <div className="flex border-b border-gray-200">
          <button onClick={() => setSelectedTab('pokemon')} className={`flex-1 py-3 font-semibold ${selectedTab === 'pokemon' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-600'}`}>
            포켓몬 ({member.caughtPokemon.length})
          </button>
          <button onClick={() => setSelectedTab('items')} className={`flex-1 py-3 font-semibold ${selectedTab === 'items' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-600'}`}>
            아이템 ({member.inventory?.length || 0})
          </button>
          <button onClick={() => setSelectedTab('info')} className={`flex-1 py-3 font-semibold ${selectedTab === 'info' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-600'}`}>
            정보/관리
          </button>
        </div>

        {/* 컨텐츠 */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* 포켓몬 탭 */}
          {selectedTab === 'pokemon' && (
            <div className="space-y-4">
              {/* 보기/지급 토글 */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-lg">
                  {pokemonMode === 'view' ? '보유 포켓몬' : '포켓몬 지급'}
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPokemonMode('view')}
                    className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                      pokemonMode === 'view'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    보기
                  </button>
                  <button
                    onClick={() => setPokemonMode('give')}
                    className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                      pokemonMode === 'give'
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    🎁 지급
                  </button>
                </div>
              </div>

              {/* 보기 모드 */}
              {pokemonMode === 'view' && (
                <>
                  {member.caughtPokemon.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">보유한 포켓몬이 없습니다</div>
                  ) : (
                    <div className="grid grid-cols-3 gap-3">
                      {member.caughtPokemon.map((pokemon, idx) => pokemon && (
                        <div key={pokemon.uniqueId} className="border border-gray-200 rounded-lg p-3">
                          <div className="text-xs text-gray-500 mb-1">#{idx + 1}</div>
                          <div className="font-bold">{pokemon.nickname || pokemon.name}</div>
                          <div className="text-sm text-gray-600">Lv.{pokemon.level}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* 지급 모드 */}
              {pokemonMode === 'give' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      포켓몬 검색
                    </label>
                    <input
                      type="text"
                      placeholder="이름 또는 번호로 검색..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div className="border border-gray-300 rounded-lg h-64 overflow-y-auto">
                    {searchQuery === '' ? (
                      <div className="flex items-center justify-center h-full text-gray-400">
                        포켓몬을 검색하세요
                      </div>
                    ) : filteredPokemon.length === 0 ? (
                      <div className="flex items-center justify-center h-full text-gray-400">
                        검색 결과가 없습니다
                      </div>
                    ) : (
                      <div className="p-2 space-y-1">
                        {filteredPokemon.map((pokemon) => (
                          <button
                            key={pokemon.number}
                            onClick={() => setSelectedPokemon(pokemon)}
                            className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors ${
                              selectedPokemon?.number === pokemon.number
                                ? 'bg-indigo-100 border-2 border-indigo-500'
                                : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                            }`}
                          >
                            <div
                              className="w-12 h-12 flex-shrink-0"
                              style={{
                                backgroundImage: `url(${pokemon.imageUrl})`,
                                backgroundSize: 'contain',
                                backgroundRepeat: 'no-repeat',
                                backgroundPosition: 'center'
                              }}
                            />
                            <div className="flex-1 text-left">
                              <div className="font-semibold text-sm">
                                #{pokemon.number} {pokemon.name}
                              </div>
                              <div className="text-xs text-gray-600">
                                {pokemon.type}{pokemon.type2 ? ` / ${pokemon.type2}` : ''}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {selectedPokemon && (
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <div className="flex items-center gap-3 mb-4">
                        <div
                          className="w-20 h-20"
                          style={{
                            backgroundImage: `url(${selectedPokemon.imageUrl})`,
                            backgroundSize: 'contain',
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'center'
                          }}
                        />
                        <div>
                          <div className="font-bold text-lg">
                            #{selectedPokemon.number} {selectedPokemon.name}
                          </div>
                          <div className="text-sm text-gray-600">
                            {selectedPokemon.type}
                            {selectedPokemon.type2 ? ` / ${selectedPokemon.type2}` : ''}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1">레벨</label>
                          <input
                            type="number"
                            min="1"
                            max="100"
                            value={level}
                            onChange={(e) => setLevel(parseInt(e.target.value) || 1)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:border-indigo-500 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1">친밀도 (0-255)</label>
                          <input
                            type="number"
                            min="0"
                            max="255"
                            value={friendship}
                            onChange={(e) => setFriendship(parseInt(e.target.value) || 0)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:border-indigo-500 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1">닉네임 (선택)</label>
                          <input
                            type="text"
                            placeholder="닉네임 없음"
                            value={nickname}
                            onChange={(e) => setNickname(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:border-indigo-500 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1">지니고 있는 도구</label>
                          <input
                            type="text"
                            placeholder="도구 없음"
                            value={heldItemName}
                            onChange={(e) => setHeldItemName(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:border-indigo-500 focus:outline-none"
                          />
                        </div>
                      </div>
                      
                      <button
                        onClick={handleGivePokemon}
                        className="w-full bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 font-semibold transition-colors"
                      >
                        지급하기
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 아이템 탭 */}
          {selectedTab === 'items' && (
            <div className="space-y-4">
              {/* 보기/지급 토글 */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-lg">
                  {itemMode === 'view' ? '보유 아이템' : '아이템 지급'}
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => setItemMode('view')}
                    className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                      itemMode === 'view'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    보기
                  </button>
                  <button
                    onClick={() => setItemMode('give')}
                    className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                      itemMode === 'give'
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    🎁 지급
                  </button>
                </div>
              </div>

              {/* 보기 모드 */}
              {itemMode === 'view' && (
                <>
                  {!member.inventory || member.inventory.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">보유한 아이템이 없습니다</div>
                  ) : (
                    <div className="space-y-2">
                      {member.inventory.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                          <div className="flex items-center gap-3">
                            <img src={item.imageUrl} alt={item.name} className="w-10 h-10" style={{ imageRendering: 'pixelated' }} />
                            <span className="font-semibold">{item.name}</span>
                          </div>
                          <span className="font-bold text-lg">{item.count}개</span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* 지급 모드 */}
              {itemMode === 'give' && (
                <div className="space-y-4">
                  {/* 카테고리 필터 */}
                  <div className="flex gap-2">
                    {categories.map(cat => (
                      <button
                        key={cat.id}
                        onClick={() => setCategoryFilter(cat.id)}
                        className={`px-3 py-1 rounded-lg text-sm font-semibold transition-colors ${
                          categoryFilter === cat.id
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>

                  {/* 아이템 선택 */}
                  <div className="grid grid-cols-6 gap-2 max-h-60 overflow-y-auto p-2">
                    {filteredItems.map(item => (
                      <button
                        key={item.id}
                        onClick={() => setSelectedItem(item)}
                        className={`p-2 rounded-lg border-2 transition-all ${
                          selectedItem?.id === item.id
                            ? 'border-indigo-500 bg-indigo-50'
                            : 'border-gray-200 hover:border-indigo-300'
                        }`}
                        title={item.name}
                      >
                        <img 
                          src={item.spriteUrl} 
                          alt={item.name}
                          className="w-full h-12 object-contain"
                          style={{ imageRendering: 'pixelated' }}
                        />
                        <div className="text-xs text-center truncate mt-1">{item.name}</div>
                      </button>
                    ))}
                  </div>

                  {/* 선택된 아이템 정보 */}
                  {selectedItem && (
                    <div className="bg-indigo-50 rounded-lg p-4">
                      <div className="flex items-center gap-4 mb-3">
                        <img 
                          src={selectedItem.spriteUrl} 
                          alt={selectedItem.name}
                          className="w-20 h-20"
                          style={{ imageRendering: 'pixelated' }}
                        />
                        <div className="flex-1">
                          <h4 className="font-bold text-lg">{selectedItem.name}</h4>
                          <p className="text-sm text-gray-600">{selectedItem.effect?.replace(/\n/g, ' ')}</p>
                        </div>
                      </div>

                      {/* 개수 입력 & 지급 */}
                      <div className="flex items-center gap-4">
                        <label className="font-semibold">개수:</label>
                        <input
                          type="number"
                          value={itemCount}
                          onChange={(e) => setItemCount(Math.max(1, parseInt(e.target.value) || 1))}
                          min="1"
                          max="999"
                          className="border border-gray-300 rounded-lg px-4 py-2 w-32 focus:border-indigo-500 focus:outline-none"
                        />
                        <button
                          onClick={handleGiveItem}
                          className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 font-semibold transition-colors"
                        >
                          지급하기
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 정보/관리 탭 */}
          {selectedTab === 'info' && (
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-bold mb-3">기본 정보</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-gray-600">돈:</span><span className="font-bold">{member.money || 0}원</span></div>
                  <div className="flex justify-between"><span className="text-gray-600">탐험 횟수:</span><span className="font-bold">{member.dailyWalks}/{member.maxDailyWalks}회</span></div>
                  <div className="flex justify-between"><span className="text-gray-600">포켓몬:</span><span className="font-bold">{member.caughtPokemon.length}마리</span></div>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-bold">관리 기능</h3>
                <button onClick={() => onResetWalk(member.id, member.name)} className="w-full bg-green-100 text-green-700 py-3 rounded-lg hover:bg-green-200 font-semibold">
                  탐험 횟수 리셋
                </button>
                
                {trainer.isSuperAdmin && member.id !== 'admin' && (
                  <button onClick={() => onToggleAdmin(member.id, member.name)} className={`w-full py-3 rounded-lg font-semibold ${member.isAdmin ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'}`}>
                    {member.isAdmin ? '관리자 권한 제거' : '관리자 권한 부여'}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminView({ 
  trainer, members, updateMaxDailyWalks, regions, allPokemon, allPokemonMaster, allItems,
  addItemToSelf, giveItemToMember, toggleItemManagement, givePokemonToMember, addPokemonToSelf,
  gamePokedex, updateRegionPokemon, updateGamePokedex, addMember, toggleAdminStatus,
  resetMemberWalkCount, resetAllWalkCounts, resetGameData, shopData, updateShopData
}) {
  const [maxWalks, setMaxWalks] = useState(trainer.maxDailyWalks);
  const [editingRegion, setEditingRegion] = useState(null);
  const [selectedMember, setSelectedMember] = useState(null);
  
  const [newMemberId, setNewMemberId] = useState('');
  const [newMemberPassword, setNewMemberPassword] = useState('');
  const [newMemberName, setNewMemberName] = useState('');

  const handleAddMember = () => {
    if (!newMemberId || !newMemberPassword || !newMemberName) {
      alert('모든 정보를 입력해주세요.');
      return;
    }
    
    const success = addMember(newMemberId, newMemberPassword, newMemberName);
    if (success) {
      alert(`${newMemberName}님이 추가되었습니다!`);
      setNewMemberId('');
      setNewMemberPassword('');
      setNewMemberName('');
    } else {
      alert('이미 존재하는 아이디입니다.');
    }
  };

  const handleToggleAdmin = (memberId, memberName) => {
    const member = members[memberId];
    const action = member.isAdmin ? '제거' : '부여';
    if (window.confirm(`${memberName}님의 관리자 권한을 ${action}하시겠습니까?`)) {
      toggleAdminStatus(memberId);
    }
  };

  const handleResetMember = (memberId, memberName) => {
    if (window.confirm(`${memberName}님의 탐험 횟수를 리셋하시겠습니까?`)) {
      resetMemberWalkCount(memberId);
      alert(`${memberName}님의 탐험 횟수가 리셋되었습니다!`);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* 멤버 관리 */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <User size={24} /> 멤버 관리
        </h3>
        
        {/* 새 멤버 추가 */}
        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <h4 className="font-semibold text-gray-700 mb-3">새 멤버 추가</h4>
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="아이디"
              value={newMemberId}
              onChange={(e) => setNewMemberId(e.target.value)}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:border-indigo-500 focus:outline-none"
            />
            <input
              type="password"
              placeholder="비밀번호"
              value={newMemberPassword}
              onChange={(e) => setNewMemberPassword(e.target.value)}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:border-indigo-500 focus:outline-none"
            />
            <input
              type="text"
              placeholder="이름"
              value={newMemberName}
              onChange={(e) => setNewMemberName(e.target.value)}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:border-indigo-500 focus:outline-none"
            />
            <button
              onClick={handleAddMember}
              className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 font-semibold transition-colors"
            >
              추가
            </button>
          </div>
        </div>

        {/* 멤버 목록 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-gray-700">멤버 목록 ({Object.keys(members).length}명)</h4>
            <button onClick={() => { if(window.confirm('⚠️ 모든 멤버의 탐험 횟수를 리셋하시겠습니까?')) { resetAllWalkCounts(); alert('리셋 완료!'); }}} className="bg-orange-100 text-orange-700 px-4 py-1 rounded-lg hover:bg-orange-200 text-sm font-semibold">
              전체 탐험 횟수 리셋
            </button>
          </div>
          
          {Object.values(members).map((member) => (
            <button 
              key={member.id} 
              onClick={() => setSelectedMember(member)}
              className="w-full flex items-center justify-between bg-gray-50 p-4 rounded-lg border border-gray-200 hover:border-indigo-400 hover:bg-indigo-50 transition-all text-left"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                  {member.name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-lg">{member.name}</span>
                    <span className="text-sm text-gray-500">({member.id})</span>
                    {member.isSuperAdmin && <span className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full font-semibold">슈퍼관리자</span>}
                    {member.isAdmin && !member.isSuperAdmin && <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full font-semibold">관리자</span>}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    탐험: {member.dailyWalks}/{member.maxDailyWalks}회 | 포켓몬: {member.caughtPokemon.length}마리
                  </div>
                </div>
              </div>
              <ChevronRight className="text-gray-400" />
            </button>
          ))}
        </div>
      </div>

{/* ⭐ 상점 관리 패널 추가 */}
      <ShopAdminPanel 
        shopData={shopData}
        allItems={allItems}
        onUpdateShop={updateShopData}
      />

      {/* 나머지 패널들은 AdminItemPanel, AdminPokemonPanel 그대로 유지 */}
      {/* 탐험 설정 */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">⚙️ 내 일일 탐험 횟수 설정</h3>
        <div className="flex items-center gap-4">
          <input type="number" value={maxWalks} onChange={(e) => setMaxWalks(parseInt(e.target.value) || 0)} min="1" max="999" className="border-2 border-gray-300 rounded-lg px-4 py-3 w-32 text-lg font-semibold focus:border-indigo-500 focus:outline-none" />
          <span className="text-gray-600 font-semibold">회</span>
          <button onClick={() => { updateMaxDailyWalks(maxWalks); alert('설정 완료!'); }} className="bg-indigo-600 text-white px-8 py-3 rounded-lg hover:bg-indigo-700 font-semibold">적용</button>
          <span className="text-sm text-gray-500 ml-4">현재: {trainer.maxDailyWalks}회</span>
        </div>
      </div>

      {/* 구역별 포켓몬 설정 */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">🗺️ 구역별 포켓몬 설정</h3>
        <div className="space-y-3">
          {regions.map((region) => (
            <div key={region.id} className="flex items-center justify-between bg-gray-50 p-4 rounded-lg border border-gray-200 hover:border-indigo-300 transition-colors">
              <div>
                <span className="font-semibold text-lg">{region.name}</span>
                <div className="text-sm text-gray-600 mt-1">등장 포켓몬: {region.pokemons.length}종</div>
              </div>
              <button onClick={() => setEditingRegion(region)} className="bg-indigo-100 text-indigo-700 px-6 py-2 rounded-lg hover:bg-indigo-200 font-semibold">편집</button>
            </div>
          ))}
        </div>
      </div>

      {/* 게임 도감 포켓몬 설정 */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">📖 게임 도감 포켓몬 설정</h3>
        <PokedexAdminPanel allPokemonMaster={allPokemonMaster} gamePokedex={gamePokedex} updateGamePokedex={updateGamePokedex} />
      </div>

      {/* 위험 구역 */}
      {trainer.isSuperAdmin && (
        <div className="bg-red-50 rounded-lg border border-red-200 p-6">
          <h3 className="text-xl font-bold text-red-800 mb-4">⚠️ 위험 구역</h3>
          <p className="text-red-600 mb-4">모든 게임 데이터를 초기화합니다. 되돌릴 수 없습니다!</p>
          <button onClick={resetGameData} className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 font-semibold">전체 데이터 초기화</button>
        </div>
      )}

      {/* 모달들 */}
      {editingRegion && <RegionEditModal region={editingRegion} allPokemon={gamePokedex} onClose={() => setEditingRegion(null)} onSave={(id, ids, rates) => { updateRegionPokemon(id, ids, rates); setEditingRegion(null); alert('저장 완료!'); }} />}
      {selectedMember && <MemberDetailPanel member={selectedMember} trainer={trainer} allItems={allItems} allPokemonMaster={allPokemonMaster} onClose={() => setSelectedMember(null)} onGiveItem={giveItemToMember} onGivePokemon={givePokemonToMember} onResetWalk={handleResetMember} onToggleAdmin={handleToggleAdmin} />}
    </div>
  );
}