// src/App.jsx - Firebase 완전 버전

import React, { useState, useEffect } from 'react';
import { ref, get, set } from 'firebase/database';
import { database } from './firebase';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import MapView from './components/views/MapView';
import PokedexView from './components/views/PokedexView';
import PokemonView from './components/views/PokemonView';
import ItemsView from './components/views/ItemsView';
import ProfileView from './components/views/ProfileView';
import AdminView from './components/views/AdminView';
import EncounterModal from './components/modals/EncounterModal';
import FirstCatchMemoModal from './components/modals/FirstCatchMemoModal';
import EvolutionModal from './components/modals/EvolutionModal';
import useGameState from './hooks/useGameState';
import ShopView from './components/views/ShopView';
import MembersView from './components/views/MembersView';
import NPCsView from './components/views/NPCsView';
import QnABoard from './components/views/QnABoard';
import CookingView from './components/views/CookingView';
import { PokemonProvider } from './contexts/PokemonContext';

// 로그인 화면 컴포넌트
function LoginScreen({ onLogin }) {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const success = await onLogin(userId, password);
    if (!success) {
      alert('아이디 또는 비밀번호가 올바르지 않습니다.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">🐾 포켓몬 탐험</h1>
          <p className="text-gray-600">커뮤니티 시스템</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              아이디
            </label>
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="아이디를 입력하세요"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              비밀번호
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="비밀번호를 입력하세요"
              required
            />
          </div>
          
          <button
            type="submit"
            className="w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 font-semibold transition-colors"
          >
            로그인
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-600">
          <p>기본 계정:</p>
          <p>관리자 - admin / admin123</p>
          <p>일반유저 - user1 / 1234</p>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  // 🔥 Firebase 연동 - 게시판 데이터
  const [qnaPosts, setQnaPosts] = useState([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);

  const {
    currentTab,
    setCurrentTab,
    currentUser,
    isAdmin,
    trainer,
    caughtPokemon,
    items,
    encounterPokemon,
    firstCatchPokemon,
    regions,
    allPokemon,
    allPokemonMaster,
    allItems,
    members,
    gamePokedex,
    sharedPokedexData,
    shopData,
    updateShopData,
    handleLogin,
    handleLogout,
    handleRegionClick,
    handleCloseEncounter,
    handleCatchSuccess,
    saveFirstCatchMemo,
    skipFirstCatchMemo,
    updateMaxDailyWalks,
    updateRegionPokemon,
    addMember,
    toggleAdminStatus,
    resetMemberWalkCount,
    resetAllWalkCounts,
    resetGameData,
    movePokemonToParty,
    movePokemonToBox,
    releasePokemon,
    useRareCandy,
    updatePokemonNickname,
    updatePokedexMemo,
    updateGamePokedex,
    addItemToSelf,
    giveItemToMember,
    toggleItemManagement,
    givePokemonToMember,
    addPokemonToSelf,
    giveItemToPokemon,
    takeItemFromPokemon,
    handlePurchase,
    setPartnerPokemon,
    forgetMove,
    learnMove,
    replaceMove,
    giveMoveToPokemon,
    allMoves,
    pokemonLearnsets,
    sellItem,
    createCustomItem,
    updateMemberMoney,
    updateMemberRegionAccess,
    maintenanceMode,
    setMaintenanceMode,
    applyLoot,
    updateRegionLootConfig,
    updatePokedexRegions,
    useItemOnPokemon,
    evolutionModal,
    acceptEvolution,
    cancelEvolution,
    increaseEffort,
    recipes,
    createRecipe,
    discoveredRecipes,
    cookRecipe,
    updateIngredientStats,
    updateCurrentUser,
    setMembers
  } = useGameState();

  // 🔥 Firebase에서 게시판 데이터 로드
  useEffect(() => {
    const loadQnaPosts = async () => {
      try {
        const postsRef = ref(database, 'community/qnaPosts');
        const snapshot = await get(postsRef);
        
        if (snapshot.exists()) {
          setQnaPosts(snapshot.val());
          console.log('📝 게시판 데이터 로드:', snapshot.val().length, '개 게시물');
        } else {
          console.log('ℹ️ 게시판 데이터 없음 (정상)');
        }
      } catch (error) {
        console.error('❌ 게시판 로드 실패:', error);
      } finally {
        setIsLoadingPosts(false);
      }
    };

    loadQnaPosts();
  }, []);

  // 🔥 사운드 설정 로드
  useEffect(() => {
    const loadSoundSettings = async () => {
      if (!currentUser?.id) return;

      try {
        const soundRef = ref(database, `users/${currentUser.id}/settings/soundEnabled`);
        const snapshot = await get(soundRef);
        
        if (snapshot.exists()) {
          setSoundEnabled(snapshot.val());
          console.log('🔊 사운드 설정 로드:', snapshot.val());
        }
      } catch (error) {
        console.error('사운드 설정 로드 실패:', error);
      }
    };

    loadSoundSettings();
  }, [currentUser]);

  // 🔥 게시판 데이터 자동 저장
  useEffect(() => {
    const saveQnaPosts = async () => {
      if (isLoadingPosts || qnaPosts.length === 0) return;

      try {
        const postsRef = ref(database, 'community/qnaPosts');
        await set(postsRef, qnaPosts);
        console.log('💾 게시판 데이터 저장:', qnaPosts.length, '개 게시물');
      } catch (error) {
        console.error('❌ 게시판 저장 실패:', error);
      }
    };

    saveQnaPosts();
  }, [qnaPosts, isLoadingPosts]);

  // 🔥 사운드 설정 자동 저장
  useEffect(() => {
    const saveSoundSettings = async () => {
      if (!currentUser?.id) return;

      try {
        const soundRef = ref(database, `users/${currentUser.id}/settings/soundEnabled`);
        await set(soundRef, soundEnabled);
        console.log('💾 사운드 설정 저장:', soundEnabled);
      } catch (error) {
        console.error('❌ 사운드 설정 저장 실패:', error);
      }
    };

    saveSoundSettings();
  }, [soundEnabled, currentUser]);

  // ⭐ 전역 클릭 사운드
  useEffect(() => {
    const basePath = window.location.pathname.includes('/poke-commu-system') 
      ? '/poke-commu-system' 
      : '';
    
    const audioPath = `${basePath}/sound/A-button.mp3`;
    const audio = new Audio(audioPath);
    audio.preload = 'auto';
    audio.volume = 0.5;

    const handleGlobalClick = () => {
      if (!soundEnabled) return;
      audio.currentTime = 0;
      audio.play().catch(() => {});
    };

    document.addEventListener('click', handleGlobalClick);
    return () => document.removeEventListener('click', handleGlobalClick);
  }, [soundEnabled]);

  // 게시글 작성
  const handleCreatePost = (post) => {
    setQnaPosts([post, ...qnaPosts]);
  };

  // 게시글 삭제
  const handleDeletePost = (postId) => {
    setQnaPosts(qnaPosts.filter(p => p.id !== postId));
  };

  // 댓글 작성
  const handleCreateComment = (postId, comment) => {
    setQnaPosts(qnaPosts.map(p => 
      p.id === postId 
        ? { ...p, comments: [...(p.comments || []), comment] }
        : p
    ));
  };

  // 댓글 삭제
  const handleDeleteComment = (postId, commentId) => {
    setQnaPosts(qnaPosts.map(p =>
      p.id === postId
        ? { ...p, comments: p.comments.filter(c => c.id !== commentId) }
        : p
    ));
  };

  // PokemonContext value
  const pokemonValue = {
    caughtPokemon,
    releasePokemon,
    updatePokemonNickname,
    giveItemToPokemon,
    takeItemFromPokemon,
    setPartnerPokemon,
    learnMove,
    forgetMove,
    replaceMove,
    useRareCandy,
    useItemOnPokemon,
    increaseEffort
  };

  // 로그인하지 않은 경우 로그인 화면 표시
  if (!currentUser || !currentUser.id) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  // 점검 모드 - 관리자가 아닌 경우 접근 차단
  if (maintenanceMode && !isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">🔧</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">시스템 점검 중</h2>
          <p className="text-gray-600 mb-6">
            현재 시스템 점검이 진행 중입니다.<br />
            잠시 후 다시 접속해주세요.
          </p>
          <button
            onClick={handleLogout}
            className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            로그아웃
          </button>
        </div>
      </div>
    );
  }

  return (
    <PokemonProvider value={pokemonValue}>
      <div className="h-screen flex bg-gray-50">
        <Sidebar 
          currentTab={currentTab}
          setCurrentTab={setCurrentTab}
          isAdmin={isAdmin}
          trainer={trainer}
          onLogout={handleLogout}
          soundEnabled={soundEnabled}
          onToggleSound={() => setSoundEnabled(!soundEnabled)}
        />

        <div className="flex-1 flex flex-col">
          <Header currentTab={currentTab} trainer={trainer} />

          <main className="flex-1 overflow-auto p-8">
            {currentTab === 'map' && (
              <MapView 
                regions={regions} 
                onRegionClick={handleRegionClick} 
              />
            )}
            
            {currentTab === 'pokedex' && (
              <PokedexView 
                pokedex={gamePokedex}
                caughtPokemon={caughtPokemon.filter(p => p !== null)}
                pokedexData={sharedPokedexData}
                regions={regions}
                currentUser={currentUser}
                onUpdateMemo={updatePokedexMemo}
                onUpdatePokedexRegions={updatePokedexRegions}
              />
            )}
            
            {currentTab === 'members' && <MembersView />}
            {currentTab === 'npcs' && <NPCsView />}

            {currentTab === 'pokemon' && (
              <PokemonView
                caughtPokemon={caughtPokemon}
                items={items}
                allItems={allItems}
                gamePokedex={gamePokedex}
                allMoves={allMoves}
                pokemonLearnsets={pokemonLearnsets}
              />
            )}
            
            {currentTab === 'items' && (
              <ItemsView 
                items={items}
                caughtPokemon={caughtPokemon}
                sellItem={sellItem}
                useItemOnPokemon={useItemOnPokemon}
              />
            )}
            
            {currentTab === 'shop' && (
              <ShopView
                shopData={shopData}
                updateShopData={updateShopData}
                allItems={allItems}
                currentUser={currentUser}
                handlePurchase={handlePurchase}
                isAdmin={isAdmin}
              />
            )}
            
            {currentTab === 'cooking' && (
              <CookingView
                currentUser={currentUser}
                recipes={recipes}
                discoveredRecipes={discoveredRecipes}
                cookRecipe={cookRecipe}
                createRecipe={createRecipe}
                updateIngredientStats={updateIngredientStats}
                isAdmin={isAdmin}
              />
            )}
            
            {currentTab === 'profile' && (
              <ProfileView 
                trainer={trainer}
                caughtPokemon={caughtPokemon}
                items={items}
              />
            )}
            
            {currentTab === 'qna' && (
              <QnABoard
                posts={qnaPosts}
                currentUser={currentUser}
                onCreatePost={handleCreatePost}
                onDeletePost={handleDeletePost}
                onCreateComment={handleCreateComment}
                onDeleteComment={handleDeleteComment}
              />
            )}
            
            {currentTab === 'admin' && isAdmin && (
              <AdminView
                trainer={trainer}
                members={members}
                setMembers={setMembers}
                updateCurrentUser={updateCurrentUser}
                updateMaxDailyWalks={updateMaxDailyWalks}
                regions={regions}
                allPokemon={allPokemon}
                allPokemonMaster={allPokemonMaster}
                allItems={allItems}
                addItemToSelf={addItemToSelf}
                giveItemToMember={giveItemToMember}
                toggleItemManagement={toggleItemManagement}
                givePokemonToMember={givePokemonToMember}
                addPokemonToSelf={addPokemonToSelf}
                gamePokedex={gamePokedex}
                updateRegionPokemon={updateRegionPokemon}
                updateGamePokedex={updateGamePokedex}
                addMember={addMember}
                toggleAdminStatus={toggleAdminStatus}
                resetMemberWalkCount={resetMemberWalkCount}
                resetAllWalkCounts={resetAllWalkCounts}
                resetGameData={resetGameData}
                shopData={shopData}
                updateShopData={updateShopData}
                createCustomItem={createCustomItem}
                editMemberPokemon={(memberId, pokemonUniqueId, updates) => {
                  // editMemberPokemon 구현
                }}
                updateMemberMoney={updateMemberMoney}
                updateMemberRegionAccess={updateMemberRegionAccess}
                maintenanceMode={maintenanceMode}
                setMaintenanceMode={setMaintenanceMode}
                updateRegionLootConfig={updateRegionLootConfig}
                createRecipe={createRecipe}
                updateIngredientStats={updateIngredientStats}
              />
            )}
          </main>
        </div>

        {/* 모달들 */}
        {encounterPokemon && (
          <EncounterModal
            pokemon={encounterPokemon}
            onClose={handleCloseEncounter}
            onCatch={handleCatchSuccess}
            items={items}
            applyLoot={applyLoot}
            isSuperAdmin={currentUser?.isSuperAdmin}
          />
        )}

        {firstCatchPokemon && (
          <FirstCatchMemoModal
            pokemon={firstCatchPokemon}
            onSave={saveFirstCatchMemo}
            onSkip={skipFirstCatchMemo}
          />
        )}

        {evolutionModal && (
          <EvolutionModal
            evolutionData={evolutionModal}
            onAccept={acceptEvolution}
            onCancel={cancelEvolution}
          />
        )}
      </div>
    </PokemonProvider>
  );
}