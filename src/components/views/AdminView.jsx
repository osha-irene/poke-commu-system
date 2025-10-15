import MigrationTool from '../admin/MigrationTool';
import React, { useState } from 'react';
import { User, ChevronRight } from 'lucide-react';
import RegionEditModal from '../modals/RegionEditModal';
import PokedexAdminPanel from './admin/PokedexAdminPanel';
import ShopAdminPanel from './admin/ShopAdminPanel';
import MemberDetailPanel from './admin/MemberDetailPanel';
import CustomItemCreator from './admin/CustomItemCreator';
import LootConfigPanel from './admin/LootConfigPanel';
import CookingAdminPanel from './admin/CookingAdminPanel';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';

export default function AdminView({ 
  trainer, 
  members, 
  setMembers,
  updateCurrentUser,
  updateMaxDailyWalks, 
  regions, 
  allPokemon, 
  allPokemonMaster, 
  allItems,
  addItemToSelf, 
  giveItemToMember, 
  toggleItemManagement, 
  givePokemonToMember, 
  addPokemonToSelf,
  gamePokedex, 
  updateRegionPokemon, 
  updateGamePokedex, 
  addMember, 
  toggleAdminStatus,
  resetMemberWalkCount, 
  resetAllWalkCounts, 
  resetGameData, 
  shopData, 
  updateShopData, 
  createCustomItem, 
  editMemberPokemon, 
  updateMemberMoney, 
  updateMemberRegionAccess,
  maintenanceMode, 
  setMaintenanceMode,
  updateRegionLootConfig,  
  createRecipe, 
  updateIngredientStats,
}) {
  const [adminTab, setAdminTab] = useState('members');
  const [maxWalks, setMaxWalks] = useState(trainer.maxDailyWalks);
  const [bulkWalkCount, setBulkWalkCount] = useState(5); // ⭐ 추가
  const [editingRegion, setEditingRegion] = useState(null);
  const [selectedMember, setSelectedMember] = useState(null);
  
  const [newMemberId, setNewMemberId] = useState('');
  const [newMemberPassword, setNewMemberPassword] = useState('');
  const [newMemberName, setNewMemberName] = useState('');
  const [escapeMode, setEscapeMode] = useState(() => 
    localStorage.getItem('poke_escapeMode') || 'instant'
  );

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

  // 탭 버튼 컴포넌트
  const TabButton = ({ active, onClick, children, variant = 'default' }) => (
    <Button
      onClick={onClick}
      variant={active ? 'primary' : 'secondary'}
      size="md"
      className={`whitespace-nowrap ${variant === 'danger' && !active ? 'bg-red-100 text-red-600 hover:bg-red-200' : ''}`}
    >
      {children}
    </Button>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6">
       <MigrationTool />
      {/* 서브메뉴 탭 */}
      <Card className="p-2 flex gap-2 overflow-x-auto">
        <TabButton active={adminTab === 'members'} onClick={() => setAdminTab('members')}>
          👥 멤버 관리
        </TabButton>
        <TabButton active={adminTab === 'regions'} onClick={() => setAdminTab('regions')}>
          🗺️ 지역 설정
        </TabButton>
        <TabButton active={adminTab === 'loot'} onClick={() => setAdminTab('loot')}>
          🎁 탐험 보상
        </TabButton>
        <TabButton active={adminTab === 'pokedex'} onClick={() => setAdminTab('pokedex')}>
          📖 도감 관리
        </TabButton>
        <TabButton active={adminTab === 'shop'} onClick={() => setAdminTab('shop')}>
          🏪 상점 관리
        </TabButton>
        <TabButton active={adminTab === 'cooking'} onClick={() => setAdminTab('cooking')}>
          🍳 요리 시스템
        </TabButton>
        <TabButton active={adminTab === 'settings'} onClick={() => setAdminTab('settings')}>
          ⚙️ 시스템 설정
        </TabButton>
        {trainer.isSuperAdmin && (
          <TabButton 
            active={adminTab === 'danger'} 
            onClick={() => setAdminTab('danger')}
            variant="danger"
          >
            ⚠️ 위험 구역
          </TabButton>
        )}
      </Card>

      {/* 멤버 관리 탭 */}
      {adminTab === 'members' && (
        <Card className="p-6">
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
              <Button variant="primary" onClick={handleAddMember}>
                추가
              </Button>
            </div>
          </div>

          {/* 멤버 목록 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-gray-700">
                멤버 목록 ({Object.keys(members).length}명)
              </h4>
              <Button 
                variant="warning"
                size="sm"
                onClick={() => { 
                  if(window.confirm('⚠️ 모든 멤버의 탐험 횟수를 리셋하시겠습니까?')) { 
                    resetAllWalkCounts(); 
                    alert('리셋 완료!'); 
                  }
                }}
              >
                전체 탐험 횟수 리셋
              </Button>
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
                      {member.isSuperAdmin && (
                        <Badge variant="danger">슈퍼관리자</Badge>
                      )}
                      {member.isAdmin && !member.isSuperAdmin && (
                        <Badge variant="primary">관리자</Badge>
                      )}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      탐험: {member.dailyWalks}/{member.maxDailyWalks}회 | 포켓몬: {member.caughtPokemon.filter(p => p !== null).length}마리 | 소지금: {member.money?.toLocaleString() || 0}원
                    </div>
                  </div>
                </div>
                <ChevronRight className="text-gray-400" />
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* 시스템 설정 탭 */}
      {adminTab === 'settings' && (
        <>
          {/* 점검 모드 */}
          <Card className="p-6">
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
              <Button
                variant={maintenanceMode ? 'success' : 'warning'}
                size="md"
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
              >
                {maintenanceMode ? '점검 종료' : '점검 시작'}
              </Button>
            </div>
          </Card>

          {/* 커스텀 아이템 */}
          <Card className="p-6">
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
          </Card>

          {/* 탐험 횟수 설정 */}
          <Card className="p-6">
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
              <Button 
                variant="primary"
                onClick={() => { 
                  updateMaxDailyWalks(maxWalks); 
                  alert('설정 완료!'); 
                }}
              >
                적용
              </Button>
              <span className="text-sm text-gray-500 ml-4">현재: {trainer.maxDailyWalks}회</span>
            </div>
          </Card>

          {/* ⭐ 전체 유저 탐험횟수 일괄 수정 */}
          <Card className="p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">🚶 전체 유저 탐험횟수 수정</h3>
            <div className="space-y-4">
              <div className="bg-blue-50 rounded-lg p-4 border-2 border-blue-200">
                <div className="font-bold text-gray-800 mb-2">전체 유저 탐험횟수 일괄 수정</div>
                <div className="text-sm text-gray-600 mb-3">
                  모든 유저의 오늘의 탐험 횟수를 특정 값으로 설정합니다
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="0"
                    max="999"
                    value={bulkWalkCount}
                    onChange={(e) => setBulkWalkCount(parseInt(e.target.value) || 0)}
                    className="w-24 px-3 py-2 border border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-600">회</span>
                  <Button
                    variant="primary"
                    size="md"
                    onClick={() => {
                      if (window.confirm(`모든 유저의 탐험횟수를 ${bulkWalkCount}회로 설정하시겠습니까?`)) {
                        Object.keys(members).forEach(memberId => {
                          setMembers(prev => ({
                            ...prev,
                            [memberId]: { ...prev[memberId], dailyWalks: bulkWalkCount }
                          }));
                        });
                        if (trainer) {
                          updateCurrentUser({ dailyWalks: bulkWalkCount });
                        }
                        alert(`✅ 모든 유저의 탐험횟수가 ${bulkWalkCount}회로 설정되었습니다!`);
                      }
                    }}
                  >
                    전체 적용
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          {/* 도망 시스템 설정 */}
          <Card className="p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">🏃 포켓몬 도망 시스템</h3>
            
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg p-5 border-2 border-indigo-200">
              <div className="flex items-start justify-between gap-6">
                {/* 왼쪽: 설명 */}
                <div className="flex-1">
                  <div className="font-bold text-gray-800 mb-2">포획 실패 시 동작</div>
                  <div className="text-sm text-gray-600 leading-relaxed">
                    {escapeMode === 'none' && (
                      <>
                        <p className="font-semibold text-gray-700 mb-1">❌ 도망 안함 모드</p>
                        <p>포획에 실패해도 포켓몬이 계속 남아있어 무한으로 시도할 수 있습니다. 연습이나 테스트에 유용합니다.</p>
                      </>
                    )}
                    {escapeMode === 'instant' && (
                      <>
                        <p className="font-semibold text-gray-700 mb-1">⚡ 즉시 도망 모드 (기본)</p>
                        <p>포획에 실패하면 포켓몬이 즉시 도망갑니다. 원작 게임의 기본 동작입니다.</p>
                      </>
                    )}
                    {escapeMode === 'speed' && (
                      <>
                        <p className="font-semibold text-gray-700 mb-1">💨 스피드 기반 모드</p>
                        <p>파트너 포켓몬의 스피드와 야생 포켓몬의 스피드를 비교하여 확률적으로 도망갑니다. 포획 실패 횟수가 늘어날수록 도망갈 확률이 감소합니다.</p>
                      </>
                    )}
                  </div>
                </div>

                {/* 오른쪽: 컴팩트 스위치 */}
                <div className="flex-shrink-0">
                  <div className="relative bg-white rounded-full p-0.5 border-2 border-gray-300 flex items-center w-44">
                    {/* 슬라이딩 배경 */}
                    <div 
                      className="absolute top-0.5 bottom-0.5 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300 ease-in-out"
                      style={{
                        width: 'calc(33.333% - 0.125rem)',
                        left: escapeMode === 'none' ? '0.125rem' : 
                              escapeMode === 'instant' ? 'calc(33.333% + 0.0625rem)' : 
                              'calc(66.666% - 0.0625rem)'
                      }}
                    />
                    
                    {/* 버튼들 */}
                    <button
                      onClick={() => {
                        setEscapeMode('none');
                        localStorage.setItem('poke_escapeMode', 'none');
                      }}
                      className={`relative z-10 flex-1 py-1.5 rounded-full font-semibold transition-colors text-center ${
                        escapeMode === 'none' ? 'text-white' : 'text-gray-600 hover:text-gray-800'
                      }`}
                    >
                      <div className="text-base leading-none">❌</div>
                    </button>
                    
                    <button
                      onClick={() => {
                        setEscapeMode('instant');
                        localStorage.setItem('poke_escapeMode', 'instant');
                      }}
                      className={`relative z-10 flex-1 py-1.5 rounded-full font-semibold transition-colors text-center ${
                        escapeMode === 'instant' ? 'text-white' : 'text-gray-600 hover:text-gray-800'
                      }`}
                    >
                      <div className="text-base leading-none">⚡</div>
                    </button>
                    
                    <button
                      onClick={() => {
                        setEscapeMode('speed');
                        localStorage.setItem('poke_escapeMode', 'speed');
                      }}
                      className={`relative z-10 flex-1 py-1.5 rounded-full font-semibold transition-colors text-center ${
                        escapeMode === 'speed' ? 'text-white' : 'text-gray-600 hover:text-gray-800'
                      }`}
                    >
                      <div className="text-base leading-none">💨</div>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </>
      )}

      {/* 지역 설정 탭 */}
      {adminTab === 'regions' && (
        <Card className="p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">🗺️ 구역별 포켓몬 설정</h3>
          <div className="space-y-3">
            {regions.map((region) => (
              <div key={region.id} className="flex items-center justify-between bg-gray-50 p-4 rounded-lg border border-gray-200 hover:border-indigo-300 transition-colors">
                <div>
                  <span className="font-semibold text-lg">{region.name}</span>
                  <div className="text-sm text-gray-600 mt-1">등장 포켓몬: {region.pokemons.length}종</div>
                </div>
                <Button 
                  variant="secondary"
                  onClick={() => setEditingRegion(region)}
                >
                  편집
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 탐험 보상 탭 */}
      {adminTab === 'loot' && (
        <LootConfigPanel 
          regions={regions}
          allItems={allItems}
          onUpdateLootConfig={updateRegionLootConfig}
        />
      )}

      {/* 상점 관리 탭 */}
      {adminTab === 'shop' && (
        <ShopAdminPanel 
          shopData={shopData}
          allItems={allItems}
          onUpdateShop={updateShopData}
        />
      )}

      {/* 도감 관리 탭 */}
      {adminTab === 'pokedex' && (
        <Card className="p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">📖 게임 도감 포켓몬 설정</h3>
          <PokedexAdminPanel 
            allPokemonMaster={allPokemonMaster} 
            gamePokedex={gamePokedex} 
            updateGamePokedex={updateGamePokedex} 
          />
        </Card>
      )}

      {/* 요리 시스템 탭 */}
      {adminTab === 'cooking' && (
        <CookingAdminPanel 
          onCreateRecipe={createRecipe}
          onUpdateIngredientStats={updateIngredientStats}
        />
      )}

      {/* 위험 구역 탭 */}
      {adminTab === 'danger' && trainer.isSuperAdmin && (
        <Card className="p-6 bg-red-50 border-red-200">
          <h3 className="text-xl font-bold text-red-800 mb-4">⚠️ 위험 구역</h3>
          <p className="text-red-600 mb-4">모든 게임 데이터를 초기화합니다. 되돌릴 수 없습니다!</p>
          <Button 
            variant="danger"
            size="lg"
            onClick={resetGameData}
          >
            전체 데이터 초기화
          </Button>
        </Card>
      )}

      {/* 모달들 */}
      {editingRegion && (
        <RegionEditModal 
          region={editingRegion} 
          allPokemon={gamePokedex} 
          onClose={() => setEditingRegion(null)} 
          onSave={(id, ids, rates, encounterRate, minLevel, maxLevel) => {
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
          setMembers={setMembers}
          currentUser={trainer}
          updateCurrentUser={updateCurrentUser}
        />
      )}
    </div>
  );
}