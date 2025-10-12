import React, { useState } from 'react';
import { User, ChevronRight } from 'lucide-react';
import RegionEditModal from '../modals/RegionEditModal';
import PokedexAdminPanel from './admin/PokedexAdminPanel';
import ShopAdminPanel from './admin/ShopAdminPanel';
import MemberDetailPanel from './admin/MemberDetailPanel';
import CustomItemCreator from './admin/CustomItemCreator';
import LootConfigPanel from './admin/LootConfigPanel';

export default function AdminView({ 
  trainer, members, updateMaxDailyWalks, regions, allPokemon, allPokemonMaster, allItems,
  addItemToSelf, giveItemToMember, toggleItemManagement, givePokemonToMember, addPokemonToSelf,
  gamePokedex, updateRegionPokemon, updateGamePokedex, addMember, toggleAdminStatus,
  resetMemberWalkCount, resetAllWalkCounts, resetGameData, shopData, updateShopData, 
  createCustomItem, editMemberPokemon, updateMemberMoney, updateMemberRegionAccess,
  maintenanceMode, setMaintenanceMode,
  updateRegionLootConfig
}) {
  const [adminTab, setAdminTab] = useState('members');
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
    
    const success = addMember(newMemberId, newMemberPassword, newMemberName, allItems);
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
      {/* ⭐ 서브메뉴 탭 */}
      <div className="bg-white rounded-lg border border-gray-200 p-2 flex gap-2 overflow-x-auto">
        <button
          onClick={() => setAdminTab('members')}
          className={`px-4 py-2 rounded-lg font-semibold whitespace-nowrap transition-colors ${
            adminTab === 'members' 
              ? 'bg-indigo-600 text-white' 
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          👥 멤버 관리
        </button>
        
        <button
          onClick={() => setAdminTab('settings')}
          className={`px-4 py-2 rounded-lg font-semibold whitespace-nowrap transition-colors ${
            adminTab === 'settings' 
              ? 'bg-indigo-600 text-white' 
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          ⚙️ 시스템 설정
        </button>
        
        <button
          onClick={() => setAdminTab('regions')}
          className={`px-4 py-2 rounded-lg font-semibold whitespace-nowrap transition-colors ${
            adminTab === 'regions' 
              ? 'bg-indigo-600 text-white' 
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          🗺️ 지역 설정
        </button>
        
        <button
          onClick={() => setAdminTab('loot')}
          className={`px-4 py-2 rounded-lg font-semibold whitespace-nowrap transition-colors ${
            adminTab === 'loot' 
              ? 'bg-indigo-600 text-white' 
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          🎁 탐험 보상
        </button>
        
        <button
          onClick={() => setAdminTab('shop')}
          className={`px-4 py-2 rounded-lg font-semibold whitespace-nowrap transition-colors ${
            adminTab === 'shop' 
              ? 'bg-indigo-600 text-white' 
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          🏪 상점 관리
        </button>
        
        <button
          onClick={() => setAdminTab('pokedex')}
          className={`px-4 py-2 rounded-lg font-semibold whitespace-nowrap transition-colors ${
            adminTab === 'pokedex' 
              ? 'bg-indigo-600 text-white' 
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          📖 도감 관리
        </button>
        
        {trainer.isSuperAdmin && (
          <button
            onClick={() => setAdminTab('danger')}
            className={`px-4 py-2 rounded-lg font-semibold whitespace-nowrap transition-colors ${
              adminTab === 'danger' 
                ? 'bg-red-600 text-white' 
                : 'bg-red-100 text-red-600 hover:bg-red-200'
            }`}
          >
            ⚠️ 위험 구역
          </button>
        )}
      </div>

      {/* ⭐ 멤버 관리 탭 */}
      {adminTab === 'members' && (
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
              <button 
                onClick={() => { 
                  if(window.confirm('⚠️ 모든 멤버의 탐험 횟수를 리셋하시겠습니까?')) { 
                    resetAllWalkCounts(); 
                    alert('리셋 완료!'); 
                  }
                }} 
                className="bg-orange-100 text-orange-700 px-4 py-1 rounded-lg hover:bg-orange-200 text-sm font-semibold"
              >
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
                      탐험: {member.dailyWalks}/{member.maxDailyWalks}회 | 포켓몬: {member.caughtPokemon.length}마리 | 소지금: {member.money?.toLocaleString() || 0}원
                    </div>
                  </div>
                </div>
                <ChevronRight className="text-gray-400" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ⭐ 시스템 설정 탭 */}
      {adminTab === 'settings' && (
        <>
          {/* 점검 모드 */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg border-2 border-yellow-200">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🔧</span>
                <div>
                  <div className="font-bold text-gray-800">시스템 점검 모드</div>
                  <div className="text-sm text-gray-600">
                    {maintenanceMode ? '⚠️ 점검 중 - 일반 유저 접근 차단됨' : '✅ 정상 운영 중'}
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  const newMode = !maintenanceMode;
                  if (newMode) {
                    if (window.confirm('⚠️ 점검 모드를 활성화하시겠습니까?\n\n관리자를 제외한 모든 유저의 접근이 차단됩니다.')) {
                      setMaintenanceMode(true);
                      alert('✅ 점검 모드가 활성화되었습니다.');
                    }
                  } else {
                    setMaintenanceMode(false);
                    alert('✅ 점검 모드가 해제되었습니다.');
                  }
                }}
                className={`px-6 py-2 rounded-lg font-bold transition-colors ${
                  maintenanceMode
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-yellow-600 text-white hover:bg-yellow-700'
                }`}
              >
                {maintenanceMode ? '점검 종료' : '점검 시작'}
              </button>
            </div>
          </div>

          {/* 커스텀 아이템 */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-gray-800">✨ 커스텀 아이템</h3>
                <p className="text-sm text-gray-600 mt-1">나만의 특별한 아이템을 만들어보세요</p>
              </div>
              <CustomItemCreator 
                onCreateItem={createCustomItem}
                allItems={allItems}
                trainer={trainer}
              />
            </div>
          </div>

          {/* 탐험 횟수 설정 */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">⚙️ 내 일일 탐험 횟수 설정</h3>
            <div className="flex items-center gap-4">
              <input 
                type="number" 
                value={maxWalks} 
                onChange={(e) => setMaxWalks(parseInt(e.target.value) || 0)} 
                min="1" 
                max="999" 
                className="border-2 border-gray-300 rounded-lg px-4 py-3 w-32 text-lg font-semibold focus:border-indigo-500 focus:outline-none" 
              />
              <span className="text-gray-600 font-semibold">회</span>
              <button 
                onClick={() => { updateMaxDailyWalks(maxWalks); alert('설정 완료!'); }} 
                className="bg-indigo-600 text-white px-8 py-3 rounded-lg hover:bg-indigo-700 font-semibold"
              >
                적용
              </button>
              <span className="text-sm text-gray-500 ml-4">현재: {trainer.maxDailyWalks}회</span>
            </div>
          </div>
        </>
      )}

      {/* ⭐ 지역 설정 탭 */}
      {adminTab === 'regions' && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">🗺️ 구역별 포켓몬 설정</h3>
          <div className="space-y-3">
            {regions.map((region) => (
              <div key={region.id} className="flex items-center justify-between bg-gray-50 p-4 rounded-lg border border-gray-200 hover:border-indigo-300 transition-colors">
                <div>
                  <span className="font-semibold text-lg">{region.name}</span>
                  <div className="text-sm text-gray-600 mt-1">등장 포켓몬: {region.pokemons.length}종</div>
                </div>
                <button 
                  onClick={() => setEditingRegion(region)} 
                  className="bg-indigo-100 text-indigo-700 px-6 py-2 rounded-lg hover:bg-indigo-200 font-semibold"
                >
                  편집
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ⭐ 탐험 보상 탭 */}
      {adminTab === 'loot' && (
        <LootConfigPanel 
          regions={regions}
          allItems={allItems}
          onUpdateLootConfig={updateRegionLootConfig}
        />
      )}

      {/* ⭐ 상점 관리 탭 */}
      {adminTab === 'shop' && (
        <ShopAdminPanel 
          shopData={shopData}
          allItems={allItems}
          onUpdateShop={updateShopData}
        />
      )}

      {/* ⭐ 도감 관리 탭 */}
      {adminTab === 'pokedex' && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">📖 게임 도감 포켓몬 설정</h3>
          <PokedexAdminPanel 
            allPokemonMaster={allPokemonMaster} 
            gamePokedex={gamePokedex} 
            updateGamePokedex={updateGamePokedex} 
          />
        </div>
      )}

      {/* ⭐ 위험 구역 탭 */}
      {adminTab === 'danger' && trainer.isSuperAdmin && (
        <div className="bg-red-50 rounded-lg border border-red-200 p-6">
          <h3 className="text-xl font-bold text-red-800 mb-4">⚠️ 위험 구역</h3>
          <p className="text-red-600 mb-4">모든 게임 데이터를 초기화합니다. 되돌릴 수 없습니다!</p>
          <button 
            onClick={resetGameData} 
            className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 font-semibold"
          >
            전체 데이터 초기화
          </button>
        </div>
      )}

      {/* 모달들 */}
      {editingRegion && (
       <RegionEditModal 
          region={editingRegion} 
          allPokemon={gamePokedex} 
          onClose={() => setEditingRegion(null)} 
          onSave={(id, ids, rates, encounterRate, minLevel, maxLevel) => {  // ⭐ 파라미터 추가
            updateRegionPokemon(id, ids, rates, encounterRate, minLevel, maxLevel); 
            setEditingRegion(null); 
            alert('저장 완료!'); 
          }} 
        />
      )}

      
      {selectedMember && (
        <MemberDetailPanel 
          member={selectedMember} 
          trainer={trainer} 
          allItems={allItems} 
          allPokemonMaster={allPokemonMaster}
          regions={regions}
          onClose={() => setSelectedMember(null)} 
          onGiveItem={giveItemToMember} 
          onGivePokemon={givePokemonToMember} 
          onEditPokemon={editMemberPokemon}
          onResetWalk={handleResetMember} 
          onToggleAdmin={handleToggleAdmin}
          onUpdateMoney={updateMemberMoney}
          onUpdateRegionAccess={updateMemberRegionAccess}
        />
      )}
    </div>
  );
}