import React, { useState } from 'react';
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
import EvolutionModal from './components/modals/EvolutionModal';  // ⭐ 추가
import useGameState from './hooks/useGameState';
import ShopView from './components/views/ShopView';
import MembersView from './components/views/MembersView';
import NPCsView from './components/views/NPCsView';
import QnABoard from './components/views/QnABoard';


// 로그인 화면 컴포넌트
function LoginScreen({ onLogin }) {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const success = onLogin(userId, password);
    if (!success) {
      alert('아이디 또는 비밀번호가 올바르지 않습니다.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">🾠포켓몬 탐험</h1>
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

        <div className="mt-6 p-4 bg-gray-50 rounded-lg text-sm text-gray-600">
          <p className="font-semibold mb-1">💡 최초 관리자 계정:</p>
          <p>아이디: <code className="bg-white px-2 py-1 rounded">admin</code></p>
          <p>비밀번호: <code className="bg-white px-2 py-1 rounded">admin123</code></p>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  // ⭐ Hooks들을 최상단에 선언
  const [qnaPosts, setQnaPosts] = useState(() => {
    const saved = localStorage.getItem('poke_qnaPosts');
    return saved ? JSON.parse(saved) : [];
  });

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
    onSetPartner,
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
    // ⭐ 진화 관련 추가
    evolutionModal,
    checkEvolution,
    checkEvolutionOnLevelUp,
    evolveWithItem,
    acceptEvolution,
    cancelEvolution,
    manualEvolve,
    getAllEvolvablePokemon
  } = useGameState();

  // 자동 저장
  React.useEffect(() => {
    localStorage.setItem('poke_qnaPosts', JSON.stringify(qnaPosts));
  }, [qnaPosts]);

  // 핸들러 함수들
  const handleCreatePost = (post) => {
    setQnaPosts([post, ...qnaPosts]);
  };

  const handleDeletePost = (postId) => {
    setQnaPosts(qnaPosts.filter(p => p.id !== postId));
  };

  const handleCreateComment = (postId, comment) => {
    setQnaPosts(qnaPosts.map(p => 
      p.id === postId 
        ? { ...p, comments: [...(p.comments || []), comment] }
        : p
    ));
  };

  const handleDeleteComment = (postId, commentId) => {
    setQnaPosts(qnaPosts.map(p =>
      p.id === postId
        ? { ...p, comments: p.comments.filter(c => c.id !== commentId) }
        : p
    ));
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
    <div className="h-screen flex bg-gray-50">
      <Sidebar 
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        isAdmin={isAdmin}
        trainer={trainer}
        onLogout={handleLogout}
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
              onMoveToParty={movePokemonToParty}
              onMoveToBox={movePokemonToBox}
              onReleasePokemon={releasePokemon}
              onUseRareCandy={useRareCandy}
              onUpdateNickname={updatePokemonNickname}
              allPokemonMaster={allPokemonMaster}
              onGiveItem={giveItemToPokemon}  
              onTakeItem={takeItemFromPokemon}
              onSetPartner={setPartnerPokemon}
              onForgetMove={forgetMove}  
              onLearnMove={learnMove}   
              isAdmin={currentUser?.isAdmin}   
              allMoves={allMoves}             
              pokemonLearnsets={pokemonLearnsets}
              onUseItemOnPokemon={useItemOnPokemon}
              // ⭐ 진화 관련 props 추가
              checkEvolution={checkEvolution}
              manualEvolve={manualEvolve}
            />
          )}
          
          {currentTab === 'items' && (
            <ItemsView 
              items={items}
              allItems={allItems}
              isSuperAdmin={trainer.isSuperAdmin}
              onSellItem={sellItem}
              trainer={currentUser}
            />
          )}
          
          {currentTab === 'shop' && (
            <ShopView 
              trainer={trainer}
              allItems={allItems}
              shopData={shopData}
              onPurchase={handlePurchase}
            />
          )}         

          {currentTab === 'profile' && (
            <ProfileView 
              trainer={trainer} 
              caughtCount={caughtPokemon.length} 
            />
          )}
          
          {currentTab === 'qna' && (
            <QnABoard
              currentUser={currentUser}
              posts={qnaPosts}
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
              updateMaxDailyWalks={updateMaxDailyWalks}
              regions={regions}
              allPokemon={allPokemon}
              allPokemonMaster={allPokemonMaster}
              gamePokedex={gamePokedex}
              updateRegionPokemon={updateRegionPokemon}
              updateGamePokedex={updateGamePokedex}
              addMember={addMember}
              toggleAdminStatus={toggleAdminStatus}
              resetMemberWalkCount={resetMemberWalkCount}
              resetAllWalkCounts={resetAllWalkCounts}
              resetGameData={resetGameData}
              allItems={allItems}
              addItemToSelf={addItemToSelf}
              giveItemToMember={giveItemToMember}
              toggleItemManagement={toggleItemManagement}
              givePokemonToMember={givePokemonToMember}
              addPokemonToSelf={addPokemonToSelf}
              createCustomItem={createCustomItem}
              shopData={shopData}  
              sellItem={sellItem}
              updateShopData={updateShopData}        
              updateMemberMoney={updateMemberMoney}         
              updateMemberRegionAccess={updateMemberRegionAccess}  
              maintenanceMode={maintenanceMode}            
              setMaintenanceMode={setMaintenanceMode}
              updateRegionLootConfig={updateRegionLootConfig}        
            />
          )}
        </main>
      </div>

      {/* 포켓몬 조우 모달 */}
      {encounterPokemon && (
        <EncounterModal
          pokemon={encounterPokemon}
          onClose={handleCloseEncounter}
          onCatchSuccess={handleCatchSuccess}
          items={items}
          sharedPokedexData={sharedPokedexData}
          caughtPokemon={caughtPokemon}
          onApplyLoot={applyLoot}
        />
      )}

      {/* 첫 포획 메모 모달 */}
      {firstCatchPokemon && (
        <FirstCatchMemoModal
          pokemon={firstCatchPokemon}
          onSave={(memo) => saveFirstCatchMemo(firstCatchPokemon.number, memo)}
          onSkip={() => skipFirstCatchMemo(firstCatchPokemon.number)}
        />
      )}

      {/* ⭐ 진화 모달 */}
      {evolutionModal && (
        <EvolutionModal
          pokemon={evolutionModal.pokemon}
          evolution={evolutionModal.evolution}
          allPokemonMaster={allPokemonMaster}
          onAccept={acceptEvolution}
          onCancel={cancelEvolution}
        />
      )}
    </div>
  );
}