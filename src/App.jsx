// src/App.jsx - 湲곗〈 肄붾뱶??Context留?異붽?

import useMediaQuery from './hooks/useMediaQuery';
import MobileLayout from './components/layout/MobileLayout';
import './App.css';
import SakuraEffect from './effects/sakura';

import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import WorldView from './components/views/WorldView';
import { noticeContent, systemContent } from './data/communityContent';
import { PokemonProvider } from './contexts/PokemonContext';
import { GameProvider } from './contexts/GameContext';
import BattleView from './components/views/BattleView';
import mainNewsButton from './assets/main_news.png';
import doctorWpenImage from './assets/npc/doctor_wpen.png';
import pokemonIcon from './assets/pokemon-icon.svg';
import { User, Lock, LogOut, Music, X, Play, Pause, SkipBack, SkipForward, Volume2, Package } from 'lucide-react';

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
  const hasUnlockedPlaybackRef = useRef(false);

  const sendPlayerCommand = useCallback((func, args = []) => {
    playerRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: 'command', func, args }),
      '*'
    );
  }, []);

  const startPlayback = useCallback(() => {
    sendPlayerCommand('setVolume', [volume]);
    sendPlayerCommand('playVideo');
    setIsPlaying(true);
  }, [sendPlayerCommand, volume]);

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
      startPlayback();
    }, 800);

    return () => window.clearTimeout(timer);
  }, [playlistSettings.id, startPlayback]);

  useEffect(() => {
    if (!playlistSettings.id || typeof window === 'undefined') return;

    const unlockPlayback = () => {
      if (hasUnlockedPlaybackRef.current) return;
      hasUnlockedPlaybackRef.current = true;
      startPlayback();
      window.removeEventListener('pointerdown', unlockPlayback);
      window.removeEventListener('touchstart', unlockPlayback);
      window.removeEventListener('keydown', unlockPlayback);
    };

    window.addEventListener('pointerdown', unlockPlayback, { passive: true });
    window.addEventListener('touchstart', unlockPlayback, { passive: true });
    window.addEventListener('keydown', unlockPlayback);

    return () => {
      window.removeEventListener('pointerdown', unlockPlayback);
      window.removeEventListener('touchstart', unlockPlayback);
      window.removeEventListener('keydown', unlockPlayback);
    };
  }, [playlistSettings.id, startPlayback]);

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
                  startPlayback();
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

function getPokemonLocalIconUrl(pokemon = {}) {
  const rawName = pokemon.nameEn || pokemon.nameEnglish || pokemon.speciesNameEn || '';
  if (!rawName) return '';

  const fileName = rawName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[.'?]/g, '')
    .replace(/\s+/g, '-')
    .toUpperCase();

  return fileName ? '/img/icons/' + fileName + '.png' : '';
}

function getKoreaDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric'
  }).formatToParts(date);

  return {
    year: Number(parts.find((part) => part.type === 'year')?.value),
    month: Number(parts.find((part) => part.type === 'month')?.value),
    day: Number(parts.find((part) => part.type === 'day')?.value)
  };
}

function getCalendarDays(year, month) {
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const previousMonthDays = new Date(Date.UTC(year, month - 1, 0)).getUTCDate();
  const firstDayIndex = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const totalSlots = Math.ceil((firstDayIndex + daysInMonth) / 7) * 7;

  return Array.from({ length: totalSlots }, (_, index) => {
    const dayOffset = index - firstDayIndex + 1;

    if (dayOffset < 1) {
      return { day: previousMonthDays + dayOffset, muted: true };
    }

    if (dayOffset > daysInMonth) {
      return { day: dayOffset - daysInMonth, muted: true };
    }

    return { day: dayOffset, muted: false };
  });
}

const DEPLOYED_HOME_FEED_START_TIME = Date.parse('2026-07-04T00:00:00+09:00');

function isLocalRuntime() {
  if (typeof window === 'undefined') return true;

  const hostname = window.location.hostname;
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '::1' ||
    hostname === ''
  );
}

function HomeDashboard({ showLogin = false, onLogin, trainer, onLogout, onPokemonClick, onItemsClick, members = {} }) {
  const [loginUserId, setLoginUserId] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [koreaToday, setKoreaToday] = useState(() => getKoreaDateParts());
  const calendarDays = getCalendarDays(koreaToday.year, koreaToday.month);
  const calendarLabel = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul',
    month: 'long'
  }).format(new Date(Date.UTC(koreaToday.year, koreaToday.month - 1, 1)));
  const weekDays = ['\uC77C', '\uC6D4', '\uD654', '\uC218', '\uBAA9', '\uAE08', '\uD1A0'];

  useEffect(() => {
    const updateKoreaToday = () => setKoreaToday(getKoreaDateParts());
    updateKoreaToday();

    const timer = window.setInterval(updateKoreaToday, 60 * 1000);
    return () => window.clearInterval(timer);
  }, []);

  const getEventTime = (value, fallbackIndex = 0) => {
    const parsed = Date.parse(value || '');
    if (!Number.isNaN(parsed)) return parsed;

    const numeric = Number(value);
    return Number.isFinite(numeric) && numeric > 0 ? numeric : fallbackIndex;
  };
  const shouldFilterDeployedFeed = !isLocalRuntime();
  const isAllowedHomeFeedEntry = (entry) => (
    !shouldFilterDeployedFeed || entry.eventTime >= DEPLOYED_HOME_FEED_START_TIME
  );

  const cookingFeed = Object.values(members || {})
    .flatMap((member) => {
      const trainerName = member?.name || member?.nickname || '\uB204\uAD70\uAC00';
      const historyEntries = (member?.cookingHistory || []).filter(Boolean).map((entry, index) => ({
        id: entry.id || `cooking-${member?.id || trainerName}-${index}`,
        trainerName,
        itemName: entry.itemName || entry.recipeName || '\uC694\uB9AC',
        image: entry.imageUrl || entry.image || '',
        eventTime: getEventTime(entry.cookedAt || entry.createdAt, index)
      }));

      if (historyEntries.length > 0) return historyEntries;

      return (member?.inventory || [])
        .filter((item) => item?.isCooked)
        .map((item, index) => ({
          id: item.itemId || `cooked-item-${member?.id || trainerName}-${index}`,
          trainerName,
          itemName: item.name || '\uC694\uB9AC',
          image: item.imageUrl || item.image || '',
          eventTime: getEventTime(String(item.itemId || '').replace('cooked_', ''), index)
        }));
    })
    .filter(isAllowedHomeFeedEntry)
    .sort((a, b) => b.eventTime - a.eventTime)
    .slice(0, 1);

  const evolutionFeed = Object.values(members || {})
    .flatMap((member) => {
      const trainerName = member?.name || member?.nickname || '\uB204\uAD70\uAC00';
      return (member?.evolutionHistory || []).filter(Boolean).map((entry, index) => ({
        id: entry.id || `evolution-${member?.id || trainerName}-${index}`,
        trainerName,
        pokemonName: entry.toName || entry.pokemonName || '\uD3EC\uCF13\uBAAC',
        spriteUrl: getPokemonLocalIconUrl({ nameEn: entry.toNameEn }) || entry.imageUrl || '',
        eventTime: getEventTime(entry.evolvedAt || entry.createdAt, index)
      }));
    })
    .filter(isAllowedHomeFeedEntry)
    .sort((a, b) => b.eventTime - a.eventTime)
    .slice(0, 1);

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
          {index === 0 && (
            <div className="home-doctor-crop" aria-hidden="true">
              <img src={doctorWpenImage} alt="" />
            </div>
          )}
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
              <div className="home-session-panel__quick-actions" aria-label="temporary shortcuts">
                <button type="button" onClick={onPokemonClick}>
                  <img className="home-session-panel__pokemon-icon" src={pokemonIcon} alt="" aria-hidden="true" />
                  {'\uD3EC\uCF13\uBAAC'}
                </button>
                <button type="button" onClick={onItemsClick}>
                  <Package aria-hidden="true" />
                  {'\uAC00\uBC29'}
                </button>
              </div>
              <button type="button" onClick={onLogout}>
                <LogOut aria-hidden="true" />
                {'\uB85C\uADF8\uC544\uC6C3'}
              </button>
            </div>
          )}
          {index === 3 && (
            <div className="home-issue-board" aria-label="home issue feed">
              <section className="home-issue-board__section" aria-label="cooking news">
                <div className="home-issue-board__heading">
                  <span>{'\uC624\uB298\uC758 \uC694\uB9AC'}</span>
                  <strong>COOK</strong>
                </div>
                {cookingFeed.length > 0 ? (
                  <ul className="home-issue-list">
                    {cookingFeed.map((entry) => (
                      <li key={entry.id} className="home-issue-item home-issue-item--item">
                        {entry.image ? <img src={entry.image} alt="" /> : <span className="home-issue-item__fallback home-issue-item__fallback--item" aria-hidden="true">I</span>}
                        <span className="home-issue-item__text">
                          <span>{entry.trainerName}{'\uAC00'}</span>
                          <span>{entry.itemName}{'\uC744(\uB97C)'}</span>
                          <span>{'\uB9CC\uB4E4\uC5C8\uB2E4'}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="home-issue-empty">{'\uC544\uC9C1 \uC694\uB9AC \uC18C\uC2DD\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.'}</p>
                )}
              </section>
              <section className="home-issue-board__section" aria-label="evolution news">
                <div className="home-issue-board__heading">
                  <span>{'\uC624\uB298\uC758 \uC9C4\uD654'}</span>
                  <strong>EVOLVE</strong>
                </div>
                {evolutionFeed.length > 0 ? (
                  <ul className="home-issue-list">
                    {evolutionFeed.map((entry) => (
                      <li key={entry.id} className="home-issue-item home-issue-item--catch">
                        {entry.spriteUrl ? (
                          <span
                            className="home-issue-pokemon-icon-crop"
                            style={{ backgroundImage: `url(${entry.spriteUrl})` }}
                            aria-hidden="true"
                          />
                        ) : <span className="home-issue-item__fallback home-issue-item__fallback--catch" aria-hidden="true">P</span>}
                        <span className="home-issue-item__text">
                          <span>{entry.trainerName}{'\uC758'}</span>
                          <span>{entry.pokemonName}{'\uC774(\uAC00)'}</span>
                          <span>{'\uC9C4\uD654\uD588\uB2E4'}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="home-issue-empty">{'\uC544\uC9C1 \uC9C4\uD654 \uC18C\uC2DD\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.'}</p>
                )}
              </section>
            </div>
          )}
          {index === 2 && (
            <div className="home-calendar" aria-label="Korea time calendar">
              <div className="home-calendar__header">
                <span>Calendar</span>
                <strong>{calendarLabel}</strong>
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
                    className={[day.day === koreaToday.day && !day.muted ? 'is-today' : '', dayIndex % 7 === 0 ? 'is-sunday' : dayIndex % 7 === 6 ? 'is-saturday' : '', day.muted ? 'is-muted' : ''].filter(Boolean).join(' ')}
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
function CommunityPlaceholder({ type }) {
  if (type === 'world') {
    return <WorldView />;
  }

  const content = type === 'system' ? systemContent : noticeContent;
  const tocLabel = type === 'system' ? '시스템 섹션' : '공지사항 섹션';

  return <WorldView content={content} tocLabel={tocLabel} hiddenSectionTitles={[]} />;
}

function LoadingOverlay({ overlay = false, fading = false }) {
  return (
    <div className={`app-loading-screen ${overlay ? 'app-loading-screen--overlay' : ''} ${fading ? 'is-fading-out' : ''}`}>
      <div className="app-loading-indicator" aria-label="로딩 중">
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}



export default function App() {
  const [qnaPosts, setQnaPosts] = useState([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);
  const isMobile = useMediaQuery('(max-width: 768px)');

  useEffect(() => {
    const updateSiteScale = () => {
      const root = document.documentElement;
      const width = window.innerWidth || 1548;
      const height = window.innerHeight || 960;
      const designWidth = 1548;
      const designHeight = 930;
      const widthScale = (width - 24) / designWidth;
      const heightScale = (height - 8) / designHeight;
      const nextScale = Math.min(0.95, widthScale, heightScale);
      root.style.setProperty('--site-scale', Math.max(0.34, nextScale).toFixed(4));
    };

    updateSiteScale();
    window.addEventListener('resize', updateSiteScale);
    window.addEventListener('orientationchange', updateSiteScale);

    return () => {
      window.removeEventListener('resize', updateSiteScale);
      window.removeEventListener('orientationchange', updateSiteScale);
    };
  }, []);
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
    allPokemonMaster,
    members,
    gamePokedex,
    sharedPokedexData,
    handleLogin,
    handleLogout,
    isAuthLoading,
    isMembersLoading,
    handleRegionClick,
    handleCloseEncounter,
    handleCatchSuccess,
    saveFirstCatchMemo,
    skipFirstCatchMemo,
    releasePokemon,
    useRareCandy,
    updatePokemonNickname,
    updatePokedexMemo,
    giveItemToPokemon,
    takeItemFromPokemon,
    setPartnerPokemon,
    forgetMove,
    learnMove,
    replaceMove,
    allMoves,
    pokemonLearnsets,
    maintenanceMode,
    applyLoot,
    updatePokedexRegions,
    useItemOnPokemon,
    evolutionModal,
    acceptEvolution,
    cancelEvolution,
    increaseEffort,
	camping,
  } = gameState;
  const isFeaturePage = currentTab !== 'home';
  const isCoreLoading = isAuthLoading || isMembersLoading;
  const [isInitialPageReady, setIsInitialPageReady] = useState(false);
  const [isLoadingOverlayVisible, setIsLoadingOverlayVisible] = useState(true);
  const [isLoadingOverlayFading, setIsLoadingOverlayFading] = useState(false);

  useEffect(() => {
    let isCancelled = false;

    if (isCoreLoading) {
      setIsInitialPageReady(false);
      return () => {
        isCancelled = true;
      };
    }

    const waitForWindowLoad = new Promise((resolve) => {
      if (document.readyState === 'complete') {
        resolve();
        return;
      }

      window.addEventListener('load', resolve, { once: true });
    });

    const waitForFonts = document.fonts?.ready?.catch?.(() => undefined) || Promise.resolve();
    const waitForFrames = new Promise((resolve) => {
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(resolve);
      });
    });
    const waitForSettling = new Promise((resolve) => window.setTimeout(resolve, 650));

    Promise.all([waitForWindowLoad, waitForFonts, waitForFrames, waitForSettling]).then(() => {
      if (!isCancelled) {
        setIsInitialPageReady(true);
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [isCoreLoading, currentUser?.id]);

  useEffect(() => {
    if (isCoreLoading || !isInitialPageReady) {
      setIsLoadingOverlayVisible(true);
      setIsLoadingOverlayFading(false);
      return undefined;
    }

    setIsLoadingOverlayVisible(true);
    setIsLoadingOverlayFading(true);

    const timer = window.setTimeout(() => {
      setIsLoadingOverlayVisible(false);
      setIsLoadingOverlayFading(false);
    }, 560);

    return () => window.clearTimeout(timer);
  }, [isCoreLoading, isInitialPageReady]);

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

  if (isCoreLoading) {
    return <LoadingOverlay />;
  }

  if (false && isCoreLoading) {
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
      if (nextTab !== 'home') {
        alert('아직 접근할 수 없습니다.');
      }
    };

    return (
      <>
      <PlaylistWidget />
      <div className="main-shell main-shell--home">
        <SakuraEffect />
        <Header currentTab="notice" setCurrentTab={handlePublicNavigation} />
        <div className="main-layout main-layout--home">
          <Sidebar
            currentTab="notice"
            setCurrentTab={handlePublicNavigation}
            isAdmin={false}
          />
          <main className="content-stage content-stage--home">
            <HomeDashboard showLogin onLogin={handleLogin} members={members} />
          </main>
        </div>
      </div>
      {isLoadingOverlayVisible && <LoadingOverlay overlay fading={isLoadingOverlayFading} />}
      </>
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
  <>
  <PlaylistWidget />
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
        <div className={`main-shell ${currentTab === 'home' ? 'main-shell--home' : ''}`}>
          <SakuraEffect />
          <Header currentTab={currentTab} setCurrentTab={setCurrentTab} />

          <div className={`main-layout ${currentTab === 'home' ? 'main-layout--home' : ''} ${['notice', 'world', 'system'].includes(currentTab) ? 'main-layout--world' : ''}`}>
          <Sidebar 
            currentTab={currentTab}
            setCurrentTab={setCurrentTab}
            isAdmin={isAdmin}
            trainer={trainer}
            onLogout={handleLogout}
            soundEnabled={soundEnabled}
            onToggleSound={() => setSoundEnabled(!soundEnabled)}
          />

      {isFeaturePage && <span className="content-stage__surface" aria-hidden="true" />}

		<main className={`content-stage ${currentTab === 'home' ? 'content-stage--home' : 'content-stage--view'} ${isFeaturePage ? 'content-stage--feature' : ''} ${['notice', 'world', 'system'].includes(currentTab) ? 'content-stage--world' : ''}`}>
      {currentTab === 'home' && (
        <HomeDashboard
          trainer={trainer}
          onLogout={handleLogout}
          onPokemonClick={() => setCurrentTab('pokemon')}
          onItemsClick={() => setCurrentTab('items')}
          members={members}
        />
      )}
      {currentTab === 'notice' && (
        <CommunityPlaceholder
          type="notice"
          trainer={trainer}
          isAdmin={isAdmin}
          soundEnabled={soundEnabled}
            onToggleSound={() => setSoundEnabled(!soundEnabled)}
            onLogout={handleLogout}
            onPokemonClick={() => setCurrentTab('pokemon')}
            onItemsClick={() => setCurrentTab('items')}
            members={members}
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
  {isLoadingOverlayVisible && <LoadingOverlay overlay fading={isLoadingOverlayFading} />}
  </>
);
}
