// src/App.jsx - 리팩토링 버전
// 메인 앱 컴포넌트 - 라우팅과 레이아웃만 담당

import React, { useState } from 'react';
import useMediaQuery from './hooks/useMediaQuery';

// Layout
import MobileLayout from './components/layout/MobileLayout';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';

// Features - Auth
import { LoginScreen } from './components/features/auth';

// Views
import MapView from './components/views/MapView';
import PokedexView from './components/views/PokedexView';
import PokemonView from './components/views/PokemonView';
import ItemsView from './components/views/ItemsView';
import ProfileView from './components/views/ProfileView';
import AdminView from './components/views/AdminView';
import ShopView from './components/views/ShopView';
import MembersView from './components/views/MembersView';
import NPCsView from './components/views/NPCsView';
import CampingView from './components/views/CampingView';
import QnABoard from './components/views/QnABoard';
import CookingView from './components/views/CookingView';
import BattleView from './components/views/BattleView';

// Modals
import EncounterModal from './components/modals/EncounterModal';
import FirstCatchMemoModal from './components/modals/FirstCatchMemoModal';
import EvolutionModal from './components/modals/EvolutionModal';

// Contexts
import { PokemonProvider } from './contexts/PokemonContext';
import { GameProvider } from './contexts/GameContext';

// Hooks
import useGameState from './hooks/useGameState';
import useSound from './hooks/useSound';
import useQnA from './hooks/community/useQnA';
import useRegister from './hooks/auth/useRegister';

// ===== 로딩 화면 =====
function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="text-center">
        <div className="text-6xl mb-4 animate-bounce">⏳</div>
        <p className="text-xl text-gray-600">로딩 중...</p>
      </div>
    </div>
  );
}

// ===== 점검 화면 =====
function MaintenanceScreen({ onLogout }) {
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
          onClick={onLogout}
          className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 transition-colors"
        >
          로그아웃
        </button>
      </div>
    </div>
  );
}

// ===== 메인 콘텐츠 라우터 =====
function MainContent({ currentTab, gameState, qna, currentUser, members }) {
  const {
    regions,
    handleRegionClick,
    gamePokedex,
    allPokemonMaster,
    caughtPokemon,
    sharedPokedexData,
    updatePokedexMemo,
    updatePokedexRegions,
    items,
    camping,
  } = gameState;

  switch (currentTab) {
    case 'map':
      return <MapView regions={regions} onRegionClick={handleRegionClick} />;
    
    case 'pokedex':
      return (
        <PokedexView 
          pokedex={gamePokedex}
          allPokedex={allPokemonMaster} 
          caughtPokemon={caughtPokemon.filter(p => p !== null)}
          pokedexData={sharedPokedexData}
          regions={regions}
          currentUser={currentUser}
          onUpdateMemo={updatePokedexMemo}
          onUpdatePokedexRegions={updatePokedexRegions}
        />
      );
    
    case 'members':
      return <MembersView />;
    
    case 'npcs':
      return <NPCsView />;
    
    case 'pokemon':
      return <PokemonView />;
    
    case 'items':
      return <ItemsView />;
    
    case 'shop':
      return <ShopView />;
    
    case 'cooking':
      return <CookingView />;
    
    case 'camping':
      return (
        <CampingView
          trainer={currentUser}
          campingSessions={camping.campingSessions}
          userCampingData={camping.userCampingData}
          isLoading={camping.isLoading}
          onStartCamping={camping.startCamping}
          canCampToday={camping.canCampToday}
          isCampingDay={camping.isCampingDay}
          members={members}
        />
      );
    
    case 'profile':
      return (
        <ProfileView 
          trainer={currentUser}
          caughtPokemon={caughtPokemon}
          items={items}
        />
      );
    
    case 'qna':
      return (
        <QnABoard
          posts={qna.posts}
          currentUser={currentUser}
          onCreatePost={qna.createPost}
          onDeletePost={qna.deletePost}
          onCreateComment={qna.createComment}
          onDeleteComment={qna.deleteComment}
        />
      );
    
    case 'admin':
      return <AdminView />;
    
    case 'battle':
      return <BattleView />;
    
    default:
      return <MapView regions={regions} onRegionClick={handleRegionClick} />;
  }
}

// ===== 메인 앱 =====
export default function App() {
  const isMobile = useMediaQuery('(max-width: 768px)');
  
  // 게임 상태
  const gameState = useGameState();
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
    members,
    allPokemonMaster,
    allItems,
    sharedPokedexData,
    handleLogin,
    handleLogout,
    isAuthLoading,
    handleCloseEncounter,
    handleCatchSuccess,
    saveFirstCatchMemo,
    skipFirstCatchMemo,
    maintenanceMode,
    applyLoot,
    evolutionModal,
    acceptEvolution,
    cancelEvolution,
    setMembers,
  } = gameState;

  // 사운드
  const { soundEnabled, toggleSound } = useSound(currentUser);
  
  // 게시판
  const qna = useQnA();
  
  // 회원가입
  const { handleRegister } = useRegister(setMembers);

  // Pokemon Context 값
  const pokemonContextValue = {
    caughtPokemon,
    releasePokemon: gameState.releasePokemon,
    updatePokemonNickname: gameState.updatePokemonNickname,
    giveItemToPokemon: gameState.giveItemToPokemon,
    takeItemFromPokemon: gameState.takeItemFromPokemon,
    setPartnerPokemon: gameState.setPartnerPokemon,
    learnMove: gameState.learnMove,
    forgetMove: gameState.forgetMove,
    replaceMove: gameState.replaceMove,
    useRareCandy: gameState.useRareCandy,
    useItemOnPokemon: gameState.useItemOnPokemon,
    increaseEffort: gameState.increaseEffort,
    allPokemonMaster,
    allMoves: gameState.allMoves,
    pokemonLearnsets: gameState.pokemonLearnsets
  };

  // 로딩 중
  if (isAuthLoading) {
    return <LoadingScreen />;
  }

  // 로그인 필요
  if (!currentUser || !currentUser.id) {
    return <LoginScreen onLogin={handleLogin} onRegister={handleRegister} />;
  }

  // 점검 모드
  if (maintenanceMode && !isAdmin) {
    return <MaintenanceScreen onLogout={handleLogout} />;
  }

  // 메인 앱 렌더링
  return (
    <GameProvider value={gameState}>
      <PokemonProvider value={pokemonContextValue}>
        {isMobile ? (
          // 모바일 레이아웃
          <MobileLayout
            currentTab={currentTab}
            setCurrentTab={setCurrentTab}
            trainer={trainer}
            isAdmin={isAdmin}
            soundEnabled={soundEnabled}
            toggleSound={toggleSound}
            onLogout={handleLogout}
          >
            <MainContent 
              currentTab={currentTab}
              gameState={gameState}
              qna={qna}
              currentUser={currentUser}
              members={members}
            />
          </MobileLayout>
        ) : (
          // 데스크톱 레이아웃
          <div className="h-screen flex bg-gray-50">
            <Sidebar 
              currentTab={currentTab}
              setCurrentTab={setCurrentTab}
              isAdmin={isAdmin}
              trainer={trainer}
              onLogout={handleLogout}
              soundEnabled={soundEnabled}
              onToggleSound={toggleSound}
            />

            <div className="flex-1 flex flex-col">
              <Header currentTab={currentTab} trainer={trainer} />
              
              <main className="flex-1 overflow-auto p-8">
                <MainContent 
                  currentTab={currentTab}
                  gameState={gameState}
                  qna={qna}
                  currentUser={currentUser}
                  members={members}
                />
              </main>
            </div>
          </div>
        )}

        {/* 모달들 */}
        {encounterPokemon && (
          <EncounterModal
            pokemon={encounterPokemon}
            onClose={handleCloseEncounter}
            onCatchSuccess={handleCatchSuccess}  
            items={items}
            sharedPokedexData={sharedPokedexData} 
            caughtPokemon={caughtPokemon} 
            onApplyLoot={applyLoot} 
            isSuperAdmin={currentUser?.isSuperAdmin}
            allPokemonMaster={allPokemonMaster} 
          />
        )}

        {firstCatchPokemon && (
          <FirstCatchMemoModal
            pokemon={firstCatchPokemon}
            onSave={saveFirstCatchMemo}
            onSkip={skipFirstCatchMemo}
          />
        )}

        {evolutionModal && evolutionModal.show && (
          <EvolutionModal
            pokemon={evolutionModal.pokemon}
            evolution={evolutionModal.evolution}
            allPokemonMaster={allPokemonMaster}
            onAccept={acceptEvolution}
            onCancel={cancelEvolution}
          />
        )}
      </PokemonProvider>
    </GameProvider>
  );
}
