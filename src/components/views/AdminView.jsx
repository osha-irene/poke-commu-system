// src/components/views/AdminView.jsx - 완전 수정 버전
import React, { useState, useEffect } from 'react';
import { useGame } from '../../contexts/GameContext';
import { ref as dbRef, get, set } from 'firebase/database';
import { database } from '../../firebase';
import { User, ChevronRight } from 'lucide-react';
import RegionEditModal from '../modals/RegionEditModal';
import PokedexAdminPanel from './admin/PokedexAdminPanel';
import ShopAdminPanel from '../admin/ShopAdminPanel';
import MemberDetailPanel from './admin/MemberDetailPanel';
import CustomItemCreator from './admin/CustomItemCreator';
import RegionExplorePanel from './admin/RegionExplorePanel';
import CookingAdminPanel from './admin/CookingAdminPanel';
import LevelRestrictionPanel from './admin/LevelRestrictionPanel';
import CampingAdminPanel from './admin/CampingAdminPanel';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';

export default function AdminView() {
  const gameContext = useGame();

  const {
    currentUser: trainer,
    members = {},
    regions = [],
    setRegions,    allPokemonMaster = [],
    allItems = [],
    gamePokedex = [],
    shopData = {},
    recipes = [],
    addDailyItem,
    removeDailyItem,
    toggleItemPersistent,
    maintenanceMode = false,
    createTown,
    updateTown,
    deleteTown,
    setMembers,
    updateCurrentUser,
    updateRegionPokemon,
    addRegion,
    deleteRegion,
    addMember,
    toggleAdminStatus,
    resetMemberWalkCount,
    resetAllWalkCounts,
    resetGameData,
    giveItemToMember,
    givePokemonToMember,
    createCustomItem,
    updateMemberMoney,
    updateMemberRegionAccess,
    editMemberPokemon,
    deleteMemberPokemon,
    updateShopData,
    setMaintenanceMode,
    updateRegionLootConfig,
    createRecipe,
    deleteRecipe,
    updateIngredientStats,
    updateGamePokedex,
	camping
  } = gameContext;

  const [adminTab, setAdminTab] = useState('members');
  const [maxWalks, setMaxWalks] = useState(trainer?.maxDailyWalks || 5);
  const [editingRegion, setEditingRegion] = useState(null);
  const [selectedMemberId, setSelectedMemberId] = useState(null);
  const [newMemberId, setNewMemberId] = useState('');
  const [newMemberPassword, setNewMemberPassword] = useState('');
  const [newMemberName, setNewMemberName] = useState('');
  const [escapeMode, setEscapeMode] = useState(() =>
    localStorage.getItem('poke_escapeMode') || 'none'
  );
  const [playlistTitle, setPlaylistTitle] = useState('Playlist');
  const [playlistInput, setPlaylistInput] = useState('');
  const [playlistSaving, setPlaylistSaving] = useState(false);

  const selectedMember = selectedMemberId && members ? members[selectedMemberId] : null;

  const getYouTubeEmbedTarget = (value = '') => {
    const trimmed = value.trim();
    if (!trimmed) return { kind: '', id: '' };

    try {
      const url = new URL(trimmed);
      const playlistId = url.searchParams.get('list');
      const videoId = url.hostname.includes('youtu.be')
        ? url.pathname.split('/').filter(Boolean)[0]
        : url.searchParams.get('v') || url.pathname.match(/\/embed\/([^/?#]+)/)?.[1];

      if (playlistId) return { kind: 'playlist', id: playlistId };
      if (videoId) return { kind: 'video', id: videoId };
    } catch {
      // Plain IDs are treated as playlist IDs for backward compatibility.
    }

    return { kind: 'playlist', id: trimmed };
  };

  useEffect(() => {
    const loadPlaylistSettings = async () => {
      try {
        const settingsRef = dbRef(database, 'gameData/playlistSettings');
        const snapshot = await get(settingsRef);

        if (snapshot.exists()) {
          const saved = snapshot.val() || {};
          setPlaylistTitle(saved.title || 'Playlist');
          setPlaylistInput(saved.url || saved.id || saved.playlistId || '');
        }
      } catch (error) {
        console.error('playlist settings load failed:', error);
      }
    };

    loadPlaylistSettings();
  }, []);

  const handleSavePlaylistSettings = async () => {
    const target = getYouTubeEmbedTarget(playlistInput);

    if (!target.id) {
      alert('YouTube 플레이리스트 URL 또는 ID를 입력해주세요.');
      return;
    }

    try {
      setPlaylistSaving(true);
      const settingsRef = dbRef(database, 'gameData/playlistSettings');
      await set(settingsRef, {
        title: playlistTitle || 'Playlist',
        kind: target.kind,
        id: target.id,
        playlistId: target.kind === 'playlist' ? target.id : '',
        url: playlistInput,
        updatedAt: Date.now()
      });
      alert('플레이리스트 설정이 저장되었습니다.');
    } catch (error) {
      console.error('playlist settings save failed:', error);
      alert('플레이리스트 설정 저장에 실패했습니다.');
    } finally {
      setPlaylistSaving(false);
    }
  };

  useEffect(() => {
    console.log('🔄 AdminView - members 변경됨:', Object.keys(members || {}).length);
    if (selectedMemberId) {
      console.log('📌 선택된 멤버 ID:', selectedMemberId);
      console.log('📌 최신 멤버 정보:', members?.[selectedMemberId]);
    }
  }, [members, selectedMemberId]);

  const handleAddMember = () => {
    if (!newMemberId || !newMemberPassword || !newMemberName) {
      alert('모든 정보를 입력해주세요.');
      return;
    }

    const success = addMember?.(newMemberId, newMemberPassword, newMemberName);
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
    const action = member?.isAdmin ? '제거' : '부여';
    if (window.confirm(`${memberName}님의 관리자 권한을 ${action}하시겠습니까?`)) {
      toggleAdminStatus?.(memberId);
    }
  };

  const handleResetMember = (memberId, memberName) => {
    if (window.confirm(`${memberName}님의 탐험 횟수를 리셋하시겠습니까?`)) {
      resetMemberWalkCount?.(memberId);
      alert(`${memberName}님의 탐험 횟수가 리셋되었습니다!`);
    }
  };


  // 전체 멤버 탐험 횟수 일괄 변경
  const handleUpdateAllMembersMaxWalks = async () => {
    if (!maxWalks || maxWalks < 1) {
      alert('1회 이상으로 설정해주세요!');
      return;
    }

    const confirmUpdate = window.confirm(
      `모든 회원의 최대 탐험 횟수를 ${maxWalks}회로 변경하시겠습니까?\n\n현재 ${Object.keys(members).length}명의 회원이 영향을 받습니다.`
    );

    if (!confirmUpdate) return;

    try {
      const memberIds = Object.keys(members);

      for (const memberId of memberIds) {
        const member = members[memberId];
        if (!member) continue;

        const updatedMember = {
          ...member,
          maxDailyWalks: maxWalks
        };

        // undefined를 null로 변환 (Firebase는 undefined 허용 안 함)
        const { id, ...dataToSave } = updatedMember;
        const cleanData = JSON.parse(
          JSON.stringify(dataToSave, (key, value) =>
            value === undefined ? null : value
          )
        );

        const memberRef = dbRef(database, `members/${memberId}`);
        await set(memberRef, cleanData);

        setMembers(prev => ({
          ...prev,
          [memberId]: updatedMember
        }));
      }

      alert(`✅ 모든 회원의 최대 탐험 횟수가 ${maxWalks}회로 변경되었습니다!`);
    } catch (error) {
      console.error('❌ 일괄 변경 실패:', error);
      alert('오류가 발생했습니다. 다시 시도해주세요.');
    }
  };

  const handleBulkResetWalks = () => {
    if (window.confirm('모든 회원의 탐험 횟수를 초기화하시겠습니까?')) {
      resetAllWalkCounts?.();
      alert('모든 회원의 탐험 횟수가 초기화되었습니다.');
    }
  };

  const handleToggleMaintenance = () => {
    const newMode = !maintenanceMode;
    if (newMode) {
      if (window.confirm('⚠️ 점검 모드를 활성화하시겠습니까?\n\n관리자를 제외한 모든 유저의 접근이 차단됩니다.')) {
        setMaintenanceMode?.(true);
        alert('✅ 점검 모드가 활성화되었습니다.');
      }
    } else {
      setMaintenanceMode?.(false);
      alert('✅ 점검 모드가 해제되었습니다.');
    }
  };

  const handleDeleteRecipe = (recipeId) => {
    deleteRecipe?.(recipeId);
  };

  const handleEscapeModeChange = (mode) => {
    setEscapeMode(mode);
    localStorage.setItem('poke_escapeMode', mode);
    const modeText = mode === 'none' ? '도망 안함' : mode === 'instant' ? '즉시 도망' : '스피드 기반';
    alert(`도망 모드가 "${modeText}"으로 변경되었습니다.`);
  };

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

  if (!trainer || !members) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-gray-600">관리자 패널 로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* 서브메뉴 탭 */}
      <Card className="p-2 flex gap-2 overflow-x-auto">
        <TabButton active={adminTab === 'members'} onClick={() => setAdminTab('members')}>
          👥 멤버 관리
        </TabButton>
        <TabButton active={adminTab === 'regions'} onClick={() => setAdminTab('regions')}>
          🗺️ 지역 설정
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
		<TabButton active={adminTab === 'camping'} onClick={() => setAdminTab('camping')}>
		  ⛺ 캠핑 관리
		</TabButton>
        <TabButton active={adminTab === 'settings'} onClick={() => setAdminTab('settings')}>
          ⚙️ 시스템 설정
        </TabButton>
        {trainer?.isSuperAdmin && (
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
                onClick={handleBulkResetWalks}
              >
                전체 탐험 횟수 리셋
              </Button>
            </div>

            {Object.values(members).map((member) => (
              <button
                key={member.id}
                onClick={() => setSelectedMemberId(member.id)}
                className="w-full flex items-center justify-between bg-gray-50 p-4 rounded-lg border border-gray-200 hover:border-indigo-400 hover:bg-indigo-50 transition-all text-left"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                    {member.name?.charAt(0) || '?'}
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
                      탐험: {member.dailyWalks}/{member.maxDailyWalks}회 | 포켓몬: {member.caughtPokemon?.filter(p => p !== null).length || 0}마리 | 소지금: {member.money?.toLocaleString() || 0}원
                    </div>
                  </div>
                </div>
                <ChevronRight className="text-gray-400" />
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* 지역 설정 탭 */}
      {adminTab === 'regions' && (
        <RegionExplorePanel
          regions={regions}
          allItems={allItems}
          onUpdateRegion={updateRegionPokemon}
          onUpdateRegionLootConfig={updateRegionLootConfig}
          onAddRegion={addRegion}
          onDeleteRegion={deleteRegion}
          onCreateTown={createTown}
          onUpdateTown={updateTown}
          onDeleteTown={deleteTown}
          setRegions={setRegions}
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

      {/* 상점 관리 탭 */}
      {adminTab === 'shop' && (
        <ShopAdminPanel
          shopData={shopData}
          allItems={allItems}
          onUpdateShop={updateShopData}
          onAddDailyItem={addDailyItem}
          onRemoveDailyItem={removeDailyItem}
          onTogglePersistent={toggleItemPersistent}
        />
      )}

      {/* 요리 시스템 탭 */}
      {adminTab === 'cooking' && (
        <CookingAdminPanel
          onCreateRecipe={createRecipe}
          onUpdateIngredientStats={updateIngredientStats}
          onDeleteRecipe={handleDeleteRecipe}
          allItems={allItems}
          recipes={recipes}
        />
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
                onClick={handleToggleMaintenance}
              >
                {maintenanceMode ? '점검 종료' : '점검 시작'}
              </Button>
            </div>
          </Card>
          <Card className="p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">YouTube 플레이리스트 설정</h3>
            <div className="grid gap-3">
              <label className="grid gap-1">
                <span className="text-sm font-semibold text-gray-700">표시 이름</span>
                <input
                  type="text"
                  value={playlistTitle}
                  onChange={(event) => setPlaylistTitle(event.target.value)}
                  className="border-2 border-gray-300 rounded-lg px-4 py-3 focus:border-indigo-500 focus:outline-none"
                  placeholder="Playlist"
                />
              </label>
              <label className="grid gap-1">
                <span className="text-sm font-semibold text-gray-700">YouTube 플레이리스트 URL 또는 ID</span>
                <input
                  type="text"
                  value={playlistInput}
                  onChange={(event) => setPlaylistInput(event.target.value)}
                  className="border-2 border-gray-300 rounded-lg px-4 py-3 focus:border-indigo-500 focus:outline-none"
                  placeholder="https://www.youtube.com/playlist?list=..."
                />
              </label>
              <div className="flex items-center justify-between gap-3 text-sm text-gray-600">
                <span>저장 후 오른쪽 하단 플레이리스트 버튼에 반영됩니다.</span>
                <Button variant="primary" onClick={handleSavePlaylistSettings} disabled={playlistSaving}>
                  {playlistSaving ? '저장 중...' : '저장'}
                </Button>
              </div>
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
              />
            </div>
          </Card>

          {/* 전체 멤버 탐험 횟수 일괄 설정 */}
          <Card className="p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">⚙️ 전체 멤버 탐험 횟수 일괄 설정</h3>
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-blue-800">
                💡 모든 회원의 최대 탐험 횟수를 동일하게 설정합니다. 개별 회원은 "멤버 관리"에서 수정할 수 있습니다.
              </p>
            </div>
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
                onClick={handleUpdateAllMembersMaxWalks}
              >
                전체 적용
              </Button>
            </div>
            <div className="mt-3 text-sm text-gray-600">
              현재 설정: 모든 회원 최대 <strong>{Object.values(members)[0]?.maxDailyWalks || 5}회</strong>
            </div>
          </Card>

          <LevelRestrictionPanel />

          {/* 도망 시스템 설정 */}
          <Card className="p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">🏃 포켓몬 도망 시스템</h3>

            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg p-5 border-2 border-indigo-200">
              <div className="flex items-start justify-between gap-6">
                <div className="flex-1">
                  <div className="font-bold text-gray-800 mb-2">포획 실패 시 동작</div>
                  <div className="text-sm text-gray-600 leading-relaxed">
                    {escapeMode === 'none' && (
                      <>
                        <p className="font-semibold text-gray-700 mb-1">❌ 도망 안함 모드 (기본)</p>
                        <p>포획에 실패해도 포켓몬이 계속 남아있어 무한으로 시도할 수 있습니다.</p>
                      </>
                    )}
                    {escapeMode === 'instant' && (
                      <>
                        <p className="font-semibold text-gray-700 mb-1">⚡ 즉시 도망 모드</p>
                        <p>포획에 실패하면 포켓몬이 즉시 도망갑니다.</p>
                      </>
                    )}
                    {escapeMode === 'speed' && (
                      <>
                        <p className="font-semibold text-gray-700 mb-1">💨 스피드 기반 모드</p>
                        <p>파트너 포켓몬의 스피드와 야생 포켓몬의 스피드를 비교하여 확률적으로 도망갑니다.</p>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex-shrink-0">
                  <div className="relative bg-white rounded-full p-0.5 border-2 border-gray-300 flex items-center w-44">
                    <div
                      className="absolute top-0.5 bottom-0.5 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300 ease-in-out"
                      style={{
                        width: 'calc(33.333% - 0.125rem)',
                        left: escapeMode === 'none' ? '0.125rem' :
                          escapeMode === 'instant' ? 'calc(33.333% + 0.0625rem)' :
                            'calc(66.666% - 0.0625rem)'
                      }}
                    />

                    <button
                      onClick={() => handleEscapeModeChange('none')}
                      className={`relative z-10 flex-1 py-1.5 rounded-full font-semibold transition-colors text-center ${escapeMode === 'none' ? 'text-white' : 'text-gray-600 hover:text-gray-800'
                        }`}
                    >
                      <div className="text-base leading-none">❌</div>
                    </button>

                    <button
                      onClick={() => handleEscapeModeChange('instant')}
                      className={`relative z-10 flex-1 py-1.5 rounded-full font-semibold transition-colors text-center ${escapeMode === 'instant' ? 'text-white' : 'text-gray-600 hover:text-gray-800'
                        }`}
                    >
                      <div className="text-base leading-none">⚡</div>
                    </button>

                    <button
                      onClick={() => handleEscapeModeChange('speed')}
                      className={`relative z-10 flex-1 py-1.5 rounded-full font-semibold transition-colors text-center ${escapeMode === 'speed' ? 'text-white' : 'text-gray-600 hover:text-gray-800'
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
		
		{adminTab === 'camping' && (
		  <CampingAdminPanel
			campingSessions={camping?.campingSessions || []}
			onProgressSession={camping.progressSession}
			onCompleteCooking={camping.completeCooking}
			onApplyResults={camping.applyResultsToMember}
			onDeleteSession={camping.deleteSession}
		  />
		)}

      {/* 위험 구역 탭 */}
      {adminTab === 'danger' && trainer?.isSuperAdmin && (
        <Card className="p-6 bg-red-50 border-red-200">
          <h3 className="text-xl font-bold text-red-800 mb-4">⚠️ 위험 구역</h3>
          <p className="text-red-600 mb-4">
            모든 게임 데이터를 초기화합니다. 이 작업은 되돌릴 수 없습니다!
          </p>
          <Button
            variant="danger"
            size="lg"
            onClick={() => {
              if (window.confirm('⚠️ 정말로 모든 데이터를 초기화하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다!')) {
                if (window.confirm('⚠️⚠️ 마지막 확인입니다. 정말 초기화하시겠습니까?')) {
                  resetGameData?.();
                }
              }
            }}
            className="w-full"
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
            updateRegionPokemon?.(id, ids, rates, encounterRate, minLevel, maxLevel);
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
          onClose={() => setSelectedMemberId(null)}
          onGiveItem={giveItemToMember}
          onGivePokemon={givePokemonToMember}
          onEditPokemon={editMemberPokemon}
          onDeletePokemon={deleteMemberPokemon}
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