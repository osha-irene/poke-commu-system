// src/App.jsx - 湲곗〈 肄붾뱶??Context留?異붽?

import useMediaQuery from './hooks/useMediaQuery';
import MobileLayout from './components/layout/MobileLayout';
import './App.css';
import SakuraEffect from './effects/sakura';

import React, { useState, useEffect, useRef } from 'react';
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
import CampingView from './components/views/CampingView';
import QnABoard from './components/views/QnABoard';
import CookingView from './components/views/CookingView';
import { PokemonProvider } from './contexts/PokemonContext';
import { GameProvider } from './contexts/GameContext';
import BattleView from './components/views/BattleView';
import mainNewsButton from './assets/main_news.png';
import { User, Lock, LogOut, Music, X, Play, Pause, SkipBack, SkipForward, Volume2 } from 'lucide-react';

function HomeProfileCard({ trainer, isAdmin, soundEnabled, onToggleSound, onLogout, onPokemonClick }) {
  return (
    <section className="home-profile-card">
      <div className="home-profile-card__identity">
        <div className="home-profile-card__avatar">
          {trainer?.name?.charAt(0) || '?'}
        </div>
        <div>
          <div className="home-profile-card__name">{trainer?.name}</div>
          {isAdmin && (
            <div className="home-profile-card__badge">
              {trainer?.isSuperAdmin ? '?덊띁愿由ъ옄' : '愿由ъ옄'}
            </div>
          )}
        </div>
      </div>
      <div className="home-profile-card__details">
        <div className="home-profile-card__stats">
          <span>오늘의 모험</span>
          <strong>{trainer?.dailyWalks}/{trainer?.maxDailyWalks}</strong>
        </div>
        <div className="home-profile-card__stats">
          <span>소지금</span>
          <strong>{trainer?.money?.toLocaleString?.() || 0}원</strong>
        </div>
        <div className="home-profile-card__actions">
          <button type="button" onClick={onPokemonClick} className="home-profile-card__pokemon">
            ???ъ폆紐?
          </button>
          <button type="button" onClick={onToggleSound} className="home-profile-card__sound">
            {soundEnabled ? '?ъ슫??ON' : '?ъ슫??OFF'}
          </button>
          <button type="button" onClick={onLogout} className="home-profile-card__logout">
            로그아웃
          </button>
        </div>
      </div>
    </section>
  );
}

function getYouTubeEmbedTarget(value = '') {
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
}

function PlaylistWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [volume, setVolume] = useState(65);
  const [playlistSettings, setPlaylistSettings] = useState({
    title: 'Playlist',
    kind: '',
    id: ''
  });
  const playerRef = useRef(null);

  const sendPlayerCommand = (func, args = []) => {
    playerRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: 'command', func, args }),
      '*'
    );
  };

  useEffect(() => {
    let isMounted = true;

    const loadPlaylistSettings = async () => {
      try {
        const settingsRef = ref(database, 'gameData/playlistSettings');
        const snapshot = await get(settingsRef);

        if (snapshot.exists() && isMounted) {
          const saved = snapshot.val() || {};
          const target = saved.kind && saved.id
            ? { kind: saved.kind, id: saved.id }
            : getYouTubeEmbedTarget(saved.url || saved.playlistId || '');

          setPlaylistSettings({
            title: saved.title || 'Playlist',
            ...target
          });
        }
      } catch (error) {
        console.error('playlist settings load failed:', error);
      }
    };

    loadPlaylistSettings();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!playlistSettings.id) return;

    const timer = window.setTimeout(() => {
      sendPlayerCommand('setVolume', [volume]);
      sendPlayerCommand('playVideo');
      setIsPlaying(true);
    }, 800);

    return () => window.clearTimeout(timer);
  }, [playlistSettings.id]);

  const handlePlayPause = () => {
    const nextPlaying = !isPlaying;
    sendPlayerCommand(nextPlaying ? 'playVideo' : 'pauseVideo');
    setIsPlaying(nextPlaying);
  };

  const handleVolumeChange = (event) => {
    const nextVolume = Number(event.target.value);
    setVolume(nextVolume);
    sendPlayerCommand('setVolume', [nextVolume]);
  };

  const originParam = typeof window !== 'undefined'
    ? `&origin=${encodeURIComponent(window.location.origin)}`
    : '';
  const embedSrc = playlistSettings.id
    ? playlistSettings.kind === 'video'
      ? `https://www.youtube.com/embed/${encodeURIComponent(playlistSettings.id)}?enablejsapi=1&autoplay=1&loop=1&playlist=${encodeURIComponent(playlistSettings.id)}${originParam}`
      : `https://www.youtube.com/embed/videoseries?list=${encodeURIComponent(playlistSettings.id)}&enablejsapi=1&autoplay=1&loop=1${originParam}`
    : '';

  return (
    <div className={`playlist-widget ${isOpen ? 'is-open' : ''}`}>
      <section className="playlist-panel" aria-label="플레이리스트" aria-hidden={!isOpen}>
        <div className="playlist-panel__header">
          <span>{playlistSettings.title || 'Playlist'}</span>
          <button type="button" onClick={() => setIsOpen(false)} aria-label="플레이리스트 닫기">
            <X aria-hidden="true" />
          </button>
        </div>
        {embedSrc ? (
          <>
            <div className="playlist-panel__player">
              <iframe
                ref={playerRef}
                title="YouTube playlist player"
                src={embedSrc}
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
                onLoad={() => {
                  sendPlayerCommand('setVolume', [volume]);
                  sendPlayerCommand('playVideo');
                  setIsPlaying(true);
                }}
              />
            </div>
            <div className="playlist-panel__controls" aria-label="음악 컨트롤">
              <button type="button" onClick={() => sendPlayerCommand('previousVideo')} aria-label="이전 곡">
                <SkipBack aria-hidden="true" />
              </button>
              <button type="button" onClick={handlePlayPause} aria-label={isPlaying ? '멈춤' : '재생'}>
                {isPlaying ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
              </button>
              <button type="button" onClick={() => sendPlayerCommand('nextVideo')} aria-label="다음 곡">
                <SkipForward aria-hidden="true" />
              </button>
              <label className="playlist-panel__volume">
                <Volume2 aria-hidden="true" />
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={volume}
                  onChange={handleVolumeChange}
                  aria-label="볼륨"
                />
              </label>
            </div>
          </>
        ) : (
          <p className="playlist-panel__empty">플레이리스트가 설정되지 않았습니다.</p>
        )}
      </section>
      <button
        type="button"
        className="playlist-toggle"
        onClick={() => setIsOpen((current) => !current)}
        aria-label="플레이리스트 열기"
        aria-expanded={isOpen}
      >
        <Music aria-hidden="true" />
      </button>
    </div>
  );
}

function HomeDashboard({ showLogin = false, onLogin, trainer, onLogout }) {
  const [loginUserId, setLoginUserId] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const calendarDays = [
    { day: 31, muted: true },
    ...Array.from({ length: 30 }, (_, index) => ({ day: index + 1, muted: false })),
    ...Array.from({ length: 4 }, (_, index) => ({ day: index + 1, muted: true }))
  ];
  const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  const handleNewsClick = () => {
    const newsUrl = '';

    if (newsUrl) {
      window.location.href = newsUrl;
    }
  };

  const handleLoginSubmit = async (event) => {
    event.preventDefault();

    if (!onLogin) return;

    await onLogin(loginUserId, loginPassword);
  };

  return (
    <section className="home-dashboard" aria-label="main panels">
      {Array.from({ length: 4 }, (_, index) => (
        <article key={index} className="home-dashboard__panel">
          {index === 1 && showLogin && (
            <form className="home-login-panel" onSubmit={handleLoginSubmit}>
              <label className="home-login-field">
                <User aria-hidden="true" />
                <input
                  type="text"
                  value={loginUserId}
                  onChange={(event) => setLoginUserId(event.target.value)}
                  autoComplete="username"
                  aria-label="아이디"
                  required
                />
              </label>
              <label className="home-login-field">
                <Lock aria-hidden="true" />
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(event) => setLoginPassword(event.target.value)}
                  autoComplete="current-password"
                  aria-label="비밀번호"
                  required
                />
              </label>
              <button type="submit">LOGIN</button>
            </form>
          )}
          {index === 1 && !showLogin && onLogout && (
            <div className="home-session-panel">
              <span>{trainer?.name || 'Trainer'}</span>
              <button type="button" onClick={onLogout}>
                <LogOut aria-hidden="true" />
                로그아웃
              </button>
            </div>
          )}
          {index === 2 && (
            <div className="home-calendar" aria-label="June 2026 calendar">
              <div className="home-calendar__header">
                <span>Calendar</span>
                <strong>June 2026</strong>
              </div>
              <div className="home-calendar__weekdays">
                {weekDays.map((day, dayIndex) => (
                  <span key={`${day}-${dayIndex}`} className={dayIndex === 0 ? 'is-sunday' : dayIndex === 6 ? 'is-saturday' : ''}>{day}</span>
                ))}
              </div>
              <div className="home-calendar__grid">
                {calendarDays.map((day, dayIndex) => (
                  <span
                    key={`${day.muted ? 'muted' : 'current'}-${day.day}-${dayIndex}`}
                    className={[day.day === 7 && !day.muted ? 'is-today' : '', dayIndex % 7 === 0 ? 'is-sunday' : dayIndex % 7 === 6 ? 'is-saturday' : '', day.muted ? 'is-muted' : ''].filter(Boolean).join(' ')}
                  >
                    {day.day}
                  </span>
                ))}
              </div>
            </div>
          )}
        </article>
      ))}
      <button
        type="button"
        className="home-dashboard__news-button"
        aria-label="news"
        onClick={handleNewsClick}
      >
        <img src={mainNewsButton} alt="" aria-hidden="true" />
      </button>
    </section>
  );
}
function CommunityPlaceholder({ type, trainer, isAdmin, soundEnabled, onToggleSound, onLogout, onPokemonClick }) {
  if (type === 'notice') {
    return (
      <HomeDashboard
        trainer={trainer}
        isAdmin={isAdmin}
        soundEnabled={soundEnabled}
        onToggleSound={onToggleSound}
        onLogout={onLogout}
        onPokemonClick={onPokemonClick}
      />
    );
  }

  const content = {
    notice: {
      title: '공지사항',
      body: '운영 공지, 업데이트, 이벤트 안내가 들어갈 자리입니다.'
    },
    world: {
      title: '세계관',
      body: '지역 설정, 이야기, 커뮤니티 배경을 정리하는 페이지입니다.'
    },
    system: {
      title: '시스템',
      body: '모험, 탐험, 교감, 상점, 요리, 캠핑, 배틀 규칙을 안내하는 페이지입니다.'
    }
  };
  const selected = content[type] || content.notice;

  return (
    <section className="community-panel">
      <p className="community-panel__eyebrow">Poke Community</p>
      <h2>{selected.title}</h2>
      <p>{selected.body}</p>
    </section>
  );
}



export default function App() {
  const [qnaPosts, setQnaPosts] = useState([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);
  const isMobile = useMediaQuery('(max-width: 768px)');

  // ??useGameState ?몄텧 (湲곗〈怨??숈씪)
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
    isAuthLoading,
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
    setMembers,
    isMembersLoading,
    editMemberPokemon,
    deleteMemberPokemon,
	camping,
  } = gameState;
  const isFeaturePage = currentTab !== 'notice';

  // 寃뚯떆??濡쒕뱶
  useEffect(() => {
    const loadQnaPosts = async () => {
      try {
        const postsRef = ref(database, 'community/qnaPosts');
        const snapshot = await get(postsRef);
        
        if (snapshot.exists()) {
          setQnaPosts(snapshot.val());
        }
      } catch (error) {
        console.error('??寃뚯떆??濡쒕뱶 ?ㅽ뙣:', error);
      } finally {
        setIsLoadingPosts(false);
      }
    };

    loadQnaPosts();
  }, []);

  // ?ъ슫??濡쒕뱶
  useEffect(() => {
    const loadSoundSettings = async () => {
      if (!currentUser?.id) return;

      try {
        const soundRef = ref(database, `users/${currentUser.id}/settings/soundEnabled`);
        const snapshot = await get(soundRef);
        
        if (snapshot.exists()) {
          setSoundEnabled(snapshot.val());
        }
      } catch (error) {
        console.error('?ъ슫???ㅼ젙 濡쒕뱶 ?ㅽ뙣:', error);
      }
    };

    loadSoundSettings();
  }, [currentUser]);

  // 寃뚯떆?????
  useEffect(() => {
    const saveQnaPosts = async () => {
      if (isLoadingPosts || qnaPosts.length === 0) return;

      try {
        const postsRef = ref(database, 'community/qnaPosts');
        await set(postsRef, qnaPosts);
      } catch (error) {
        console.error('??寃뚯떆??????ㅽ뙣:', error);
      }
    };

    saveQnaPosts();
  }, [qnaPosts, isLoadingPosts]);

  // ?ъ슫?????
  useEffect(() => {
    const saveSoundSettings = async () => {
      if (!currentUser?.id) return;

      try {
        const soundRef = ref(database, `users/${currentUser.id}/settings/soundEnabled`);
        await set(soundRef, soundEnabled);
      } catch (error) {
        console.error('???ъ슫???ㅼ젙 ????ㅽ뙣:', error);
      }
    };

    saveSoundSettings();
  }, [soundEnabled, currentUser]);

  // ?대┃ ?ъ슫??
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
    increaseEffort,
    allPokemonMaster,
    allMoves,
    pokemonLearnsets
  };

 const handleRegister = async (userId, password, name) => {
    try {
      console.log('?뵍 ?뚯썝媛???쒖옉:', userId);
      
      const email = `${userId}@pokemon.com`;
      const { createUserWithEmailAndPassword } = await import('firebase/auth');
      const { auth, database } = await import('./firebase');
      const { ref, set } = await import('firebase/database');
      
      // 1截뤴깵 Firebase Auth??怨꾩젙 ?앹꽦
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUid = userCredential.user.uid;
      console.log('??Auth 怨꾩젙 ?앹꽦 ?꾨즺:', firebaseUid);
      
      // 2截뤴깵 Realtime Database???뚯썝 ?곗씠?????
      const memberRef = ref(database, `members/${firebaseUid}`);
      const newMemberData = {
        name: name,
        email: email,
        isAdmin: false,
        isSuperAdmin: false,
        canManageItems: false,
        dailyWalks: 10,
        maxDailyWalks: 10,
        money: 10000,
        accessibleRegions: [],
        caughtPokemon: [null, null, null, null, null, null],
        inventory: [
          {
            itemId: 4,
            name: '紐ъ뒪?곕낵',
            count: 15,
            imageUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png'
          }
        ],
        createdAt: new Date().toISOString()
      };
      
      await set(memberRef, newMemberData);
      console.log('??Database ????꾨즺:', firebaseUid);
      
      // 3截뤴깵 members state??異붽? (利됱떆 諛섏쁺)
      setMembers(prev => ({
        ...prev,
        [firebaseUid]: {
          ...newMemberData,
          id: firebaseUid
        }
      }));
      
      alert(`???뚯썝媛???꾨즺!\n\n?꾩씠?? ${userId}\n?대쫫: ${name}\n\n濡쒓렇?명빐二쇱꽭??`);
      return true;
      
    } catch (error) {
      console.error('???뚯썝媛???ㅻ쪟:', error);
      
      if (error.code === 'auth/email-already-in-use') {
        alert('?대? ?ъ슜 以묒씤 ?꾩씠?붿엯?덈떎.');
      } else if (error.code === 'auth/weak-password') {
        alert('鍮꾨?踰덊샇??6???댁긽?댁뼱???⑸땲??');
      } else if (error.code === 'auth/invalid-email') {
        alert('?좏슚?섏? ?딆? ?대찓???뺤떇?낅땲??');
      } else {
        alert(`?뚯썝媛??以??ㅻ쪟媛 諛쒖깮?덉뒿?덈떎.\n${error.message}`);
      }
      
      return false;
    }
  };
  if (isAuthLoading) {
    return (
      <div className="app-loading-screen">
        <div className="app-loading-indicator" aria-label="로딩 중">
          <span />
          <span />
          <span />
        </div>
      </div>
    );
  }

  if (!currentUser || !currentUser.id) {
    const handlePublicNavigation = (nextTab) => {
      if (nextTab !== 'notice') {
        alert('아직 접근할 수 없습니다.');
      }
    };

    return (
      <div className="main-shell main-shell--home">
        <SakuraEffect />
        <PlaylistWidget />
        <Header currentTab="notice" setCurrentTab={handlePublicNavigation} />
        <div className="main-layout main-layout--home">
          <Sidebar
            currentTab="notice"
            setCurrentTab={handlePublicNavigation}
            isAdmin={false}
          />
          <main className="content-stage content-stage--home">
            <HomeDashboard showLogin onLogin={handleLogin} />
          </main>
        </div>
      </div>
    );
  }

  if (maintenanceMode && !isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">점검</div>
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
  <GameProvider value={gameState}>
    <PokemonProvider value={pokemonValue}>
      {isMobile ? (
        <MobileLayout
          currentTab={currentTab}
          setCurrentTab={setCurrentTab}
          trainer={trainer}
          isAdmin={isAdmin}
          soundEnabled={soundEnabled}
          toggleSound={() => setSoundEnabled(!soundEnabled)}
          onLogout={handleLogout}
        >
          {currentTab === 'map' && (
            <MapView 
              regions={regions} 
              onRegionClick={handleRegionClick} 
            />
          )}
          
          {currentTab === 'pokedex' && (
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
          )}
          
          {currentTab === 'members' && <MembersView />}
          {currentTab === 'npcs' && <NPCsView />}
          {currentTab === 'pokemon' && <PokemonView />}
          {currentTab === 'items' && <ItemsView />}
          {currentTab === 'shop' && <ShopView />}
          {currentTab === 'cooking' && <CookingView />}
		  {currentTab === 'camping' && (
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
          
          {currentTab === 'admin' && isAdmin && <AdminView />}
          {currentTab === 'battle' && <BattleView />}
        </MobileLayout>
      ) : (
        <div className={`main-shell ${currentTab === 'notice' ? 'main-shell--home' : ''}`}>
          <SakuraEffect />
          <PlaylistWidget />
          <Header currentTab={currentTab} setCurrentTab={setCurrentTab} />

          <div className={`main-layout ${currentTab === 'notice' ? 'main-layout--home' : ''}`}>
          <Sidebar 
            currentTab={currentTab}
            setCurrentTab={setCurrentTab}
            isAdmin={isAdmin}
            trainer={trainer}
            onLogout={handleLogout}
            soundEnabled={soundEnabled}
            onToggleSound={() => setSoundEnabled(!soundEnabled)}
          />

		<main className={`content-stage ${currentTab === 'notice' ? 'content-stage--home' : 'content-stage--view'} ${isFeaturePage ? 'content-stage--feature' : ''}`}>
      {currentTab === 'notice' && (
        <CommunityPlaceholder
          type="notice"
          trainer={trainer}
          isAdmin={isAdmin}
          soundEnabled={soundEnabled}
            onToggleSound={() => setSoundEnabled(!soundEnabled)}
            onLogout={handleLogout}
            onPokemonClick={() => setCurrentTab('pokemon')}
        />
      )}
      {currentTab === 'world' && <CommunityPlaceholder type="world" trainer={trainer} />}
      {currentTab === 'system' && <CommunityPlaceholder type="system" trainer={trainer} />}

		  {currentTab === 'map' && (
			<MapView 
			  regions={regions} 
			  onRegionClick={handleRegionClick} 
			/>
		  )}
		  
		  {currentTab === 'pokedex' && (
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
		  )}
		  
		  {currentTab === 'members' && <MembersView />}
		  {currentTab === 'npcs' && <NPCsView />}
		  {currentTab === 'pokemon' && <PokemonView />}
		  {currentTab === 'items' && <ItemsView />}
		  {currentTab === 'shop' && <ShopView />}
		  {currentTab === 'cooking' && <CookingView />}
		  
		  {/* ???ш린??罹좏븨 ??異붽?! */}
		  {currentTab === 'camping' && (
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
		  
		  {currentTab === 'admin' && isAdmin && <AdminView />}
      {currentTab === 'battle' && <BattleView />} 
		</main>
          </div>
        </div>
      )}
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
