// src/App.jsx - 湲곗〈 肄붾뱶??Context留?異붽?

import useMediaQuery from './hooks/useMediaQuery';
import MobileLayout from './components/layout/MobileLayout';
import './App.css';
import SakuraEffect from './effects/sakura';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
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
import MaintenanceScreen from './components/layout/MaintenanceScreen';
import mainNewsButton from './assets/main_news.png';
import doctorWpenImage from './assets/npc/doctor_wpen.png';
import pokemonIcon from './assets/pokemon-icon.svg';
import logoText from './assets/logo_text.png';
import logoCompass from './assets/logo_compass.png';
import forestBg from './assets/forest-bg.png';
import mainNpcPanel from './assets/main_npc.png';
import { User, Lock, LogOut, Music, X, Play, Pause, SkipBack, SkipForward, Volume2, Package, Gift, ChefHat, Sparkles } from 'lucide-react';
import { DAILY_ATTENDANCE_EXP, getKoreaDateKey } from './utils/experience';
import { getPokemonLocalIconUrl } from './utils/pokemonIconUtils';

const DAILY_ATTENDANCE_MONEY = 2000;

function useTwemoji() {
  useEffect(() => {
    let isParsing = false;
    let rafId = null;

    const parse = () => {
      rafId = null;
      if (typeof window.twemoji === 'undefined' || isParsing) return;
      isParsing = true;
      window.twemoji.parse(document.body, { folder: 'svg', ext: '.svg' });
      isParsing = false;
    };

    const scheduleparse = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(parse);
    };

    scheduleparse();

    const observer = new MutationObserver((mutations) => {
      if (isParsing) return;
      const hasNewContent = mutations.some((m) =>
        [...m.addedNodes].some((n) => {
          if (n.nodeType === Node.TEXT_NODE) return true;
          if (n.nodeType === Node.ELEMENT_NODE && !n.classList?.contains('emoji')) return true;
          return false;
        })
      );
      if (hasNewContent) scheduleparse();
    });

    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      observer.disconnect();
    };
  }, []);
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
  const [isMobileDevice] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 768);
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

  if (isMobileDevice) return null;

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

function toDateKey(y, m, d) {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function isColorLight(hex) {
  const c = hex.replace('#', '');
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 128;
}

function darkenHex(hex, amount = 40) {
  const c = hex.replace('#', '');
  const clamp = (v) => Math.max(0, Math.min(255, v));
  const r = clamp(parseInt(c.slice(0, 2), 16) - amount);
  const g = clamp(parseInt(c.slice(2, 4), 16) - amount);
  const b = clamp(parseInt(c.slice(4, 6), 16) - amount);
  return `rgb(${r},${g},${b})`;
}


function HomeCalendar({ koreaToday, calendarDays, calendarLabel, weekDays, scheduleEvents, tooltip, tooltipPos, tooltipTimer, setTooltip, setTooltipPos }) {
  const todayKey = toDateKey(koreaToday.year, koreaToday.month, koreaToday.day);
  const todayEvents = scheduleEvents.filter((e) => e.start === todayKey);
  const rows = [];
  for (let i = 0; i < calendarDays.length; i += 7) rows.push(calendarDays.slice(i, i + 7));

  const showTip = (e, evOrArr) => {
    clearTimeout(tooltipTimer.current);
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPos({ x: rect.left + rect.width / 2, y: rect.top });
    setTooltip(Array.isArray(evOrArr) ? evOrArr : [evOrArr]);
  };

  const hideTip = () => {
    tooltipTimer.current = setTimeout(() => setTooltip(null), 150);
  };

  return (
    <div className="home-calendar" aria-label="Korea time calendar">
      <div className="home-calendar__header">
        <span>Calendar</span>
        <strong>{calendarLabel}</strong>
      </div>
      <div className="home-calendar__weekdays">
        {weekDays.map((day, di) => (
          <span key={di} className={di === 0 ? 'is-sunday' : di === 6 ? 'is-saturday' : ''}>{day}</span>
        ))}
      </div>
      <div className="home-calendar__weeks">
        {rows.map((row, ri) => {
          return (
            <div key={ri} className="home-calendar__week">
              <div className="home-calendar__grid">
                {row.map((day, di) => {
                  const isToday = day.day === koreaToday.day && !day.muted;
                  const isPrevMonth = day.muted && ri === 0;
                  const isNextMonth = day.muted && ri > 0;
                  const dayMonth = isPrevMonth
                    ? (koreaToday.month === 1 ? 12 : koreaToday.month - 1)
                    : isNextMonth
                    ? (koreaToday.month === 12 ? 1 : koreaToday.month + 1)
                    : koreaToday.month;
                  const dayYear = isPrevMonth
                    ? (koreaToday.month === 1 ? koreaToday.year - 1 : koreaToday.year)
                    : isNextMonth
                    ? (koreaToday.month === 12 ? koreaToday.year + 1 : koreaToday.year)
                    : koreaToday.year;
                  const pts = scheduleEvents.filter((e) => e.start === toDateKey(dayYear, dayMonth, day.day));
                  const importantEv = pts.find((e) => e.important);
                  const dotPts = pts.filter((e) => !e.important);
                  const allPts = pts.filter(Boolean);
                  return (
                    <span
                      key={di}
                      className={[isToday ? 'is-today' : '', di === 0 ? 'is-sunday' : di === 6 ? 'is-saturday' : '', day.muted ? 'is-muted' : '', importantEv ? 'has-important' : ''].filter(Boolean).join(' ')}
                      style={{ ...(importantEv ? { '--important-color': importantEv.color } : {}), ...(day.muted && allPts.length > 0 ? { opacity: 0.45 } : {}) }}
                      onMouseEnter={allPts.length > 0 ? (e) => showTip(e, allPts) : undefined}
                      onMouseLeave={allPts.length > 0 ? hideTip : undefined}
                    >
                      {day.day}
                      {dotPts.length > 0 && (
                        <span className="home-cal-dots">
                          {dotPts.slice(0, 3).map((ev) => (
                            <span
                              key={ev.id}
                              className="home-cal-dot"
                              style={{ background: ev.color }}
                            />
                          ))}
                        </span>
                      )}
                    </span>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <div className="home-cal-today-events">
        <img src="/img/ui/main_event.png" alt="오늘의 이벤트" className="home-cal-today-events__img" />
        <div className="home-cal-today-events__list">
          {todayEvents.length === 0 ? (
            <span className="home-cal-today-events__empty">진행되는 이벤트가 없습니다.</span>
          ) : (
            todayEvents.map((ev) => (
              <div key={ev.id} className="home-cal-today-events__item">
                <span className="home-cal-today-events__title">{ev.title}</span>
                {ev.desc && <span className="home-cal-today-events__desc">{ev.desc}</span>}
              </div>
            ))
          )}
        </div>
      </div>
      {tooltip && createPortal(
        <div
          className="home-cal-tooltip"
          style={{
            left: tooltipPos.x,
            top: tooltipPos.y,
            '--tip-bg': tooltip[0]?.color ? darkenHex(tooltip[0].color, 45) : 'rgba(15,18,15,0.96)',
            '--tip-text': '#fff',
          }}
          onMouseEnter={() => clearTimeout(tooltipTimer.current)}
          onMouseLeave={hideTip}
        >
          {tooltip.map((ev, i) => (
            <div key={i} className="home-cal-tooltip__item">
              <strong>{ev.title}</strong>
              {ev.desc && <p>{ev.desc}</p>}
            </div>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
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

function getHomeFeeds(members = {}) {
  const todayKey = getKoreaDateKey();
  const getEventTime = (value, fallbackIndex = 0) => {
    const parsed = Date.parse(value || '');
    if (!Number.isNaN(parsed)) return parsed;

    const numeric = Number(value);
    return Number.isFinite(numeric) && numeric > 0 ? numeric : fallbackIndex;
  };
  const shouldFilterDeployedFeed = !isLocalRuntime();
  const isAllowedHomeFeedEntry = (entry) => (
    (!shouldFilterDeployedFeed || entry.eventTime >= DEPLOYED_HOME_FEED_START_TIME) &&
    getKoreaDateKey(new Date(entry.eventTime)) === todayKey
  );

  const cookingFeed = Object.values(members || {})
    .flatMap((member) => {
      const trainerName = member?.name || member?.nickname || '누군가';
      const historyEntries = (member?.cookingHistory || []).filter(Boolean).map((entry, index) => ({
        id: entry.id || `cooking-${member?.id || trainerName}-${index}`,
        trainerName,
        itemName: entry.itemName || entry.recipeName || '요리',
        image: entry.imageUrl || entry.image || '',
        eventTime: getEventTime(entry.cookedAt || entry.createdAt, index)
      }));

      if (historyEntries.length > 0) return historyEntries;

      return (member?.inventory || [])
        .filter((item) => item?.isCooked)
        .map((item, index) => ({
          id: item.itemId || `cooked-item-${member?.id || trainerName}-${index}`,
          trainerName,
          itemName: item.name || '요리',
          image: item.imageUrl || item.image || '',
          eventTime: getEventTime(String(item.itemId || '').replace('cooked_', ''), index)
        }));
    })
    .filter(isAllowedHomeFeedEntry)
    .sort((a, b) => b.eventTime - a.eventTime)
    .slice(0, 1);

  const evolutionFeed = Object.values(members || {})
    .flatMap((member) => {
      const trainerName = member?.name || member?.nickname || '누군가';
      return (member?.evolutionHistory || []).filter(Boolean).map((entry, index) => ({
        id: entry.id || `evolution-${member?.id || trainerName}-${index}`,
        trainerName,
        pokemonName: entry.toName || entry.pokemonName || '포켓몬',
        spriteUrl: getPokemonLocalIconUrl({ nameEn: entry.toNameEn }) || entry.imageUrl || '',
        eventTime: getEventTime(entry.evolvedAt || entry.createdAt, index)
      }));
    })
    .filter(isAllowedHomeFeedEntry)
    .sort((a, b) => b.eventTime - a.eventTime)
    .slice(0, 1);

  return { cookingFeed, evolutionFeed };
}

function HomeDashboard({
  showLogin = false,
  onLogin,
  trainer,
  onLogout,
  onPokemonClick,
  onItemsClick,
  onClaimAttendance,
  attendanceClaimed = false,
  isClaimingAttendance = false,
  members = {}
}) {
  const [loginUserId, setLoginUserId] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [koreaToday, setKoreaToday] = useState(() => getKoreaDateParts());
  const calendarDays = getCalendarDays(koreaToday.year, koreaToday.month);
  const calendarLabel = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul',
    month: 'long'
  }).format(new Date(Date.UTC(koreaToday.year, koreaToday.month - 1, 1)));
  const weekDays = ['\uC77C', '\uC6D4', '\uD654', '\uC218', '\uBAA9', '\uAE08', '\uD1A0'];

  const [scheduleEvents, setScheduleEvents] = useState([]);
  const [calTooltip, setCalTooltip] = useState(null);
  const [calTooltipPos, setCalTooltipPos] = useState({ x: 0, y: 0 });
  const calTooltipTimer = useRef(null);

  useEffect(() => {
    const updateKoreaToday = () => setKoreaToday(getKoreaDateParts());
    updateKoreaToday();
    const timer = window.setInterval(updateKoreaToday, 60 * 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    get(ref(database, 'gameData/scheduleEvents')).then((snap) => {
      if (snap.exists()) setScheduleEvents(Object.values(snap.val()));
    });
  }, []);

  const { cookingFeed, evolutionFeed } = getHomeFeeds(members);

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
              <button
                type="button"
                onClick={onClaimAttendance}
                disabled={attendanceClaimed || isClaimingAttendance}
                className="home-session-panel__attendance"
              >
                <Gift aria-hidden="true" />
                {attendanceClaimed
                  ? '\uCD9C\uC11D \uC644\uB8CC'
                  : isClaimingAttendance
                    ? '\uCC98\uB9AC \uC911...'
                    : '\uCD9C\uC11D \uBCF4\uC0C1'}
              </button>
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
                  <img src="/today-recipe.png" alt="오늘의 요리" />
                  <strong>COOK</strong>
                </div>
                {!cookingFeed.some((entry) => entry.image) && (
                  <img className="home-issue-board__pokeball" src="/pokeball.png" alt="" aria-hidden="true" />
                )}
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
                  <img src="/today-evolve.png" alt="오늘의 진화" />
                  <strong>EVOLVE</strong>
                </div>
                {!evolutionFeed.some((entry) => entry.spriteUrl) && (
                  <img className="home-issue-board__pokeball" src="/pokeball.png" alt="" aria-hidden="true" />
                )}
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
            <>
              <HomeCalendar
                koreaToday={koreaToday}
                calendarDays={calendarDays}
                calendarLabel={calendarLabel}
                weekDays={weekDays}
                scheduleEvents={scheduleEvents}
                tooltip={calTooltip}
                tooltipPos={calTooltipPos}
                tooltipTimer={calTooltipTimer}
                setTooltip={setCalTooltip}
                setTooltipPos={setCalTooltipPos}
              />
            </>
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

function MobileHomeDashboard({
  trainer,
  members = {},
  onCookingClick,
  onPokemonClick
}) {
  const [koreaToday, setKoreaToday] = useState(() => getKoreaDateParts());
  const calendarDays = getCalendarDays(koreaToday.year, koreaToday.month);
  const { cookingFeed, evolutionFeed } = getHomeFeeds(members);
  const calendarLabel = `${koreaToday.year}.${String(koreaToday.month).padStart(2, '0')}`;
  const weekDays = ['일', '월', '화', '수', '목', '금', '토'];

  useEffect(() => {
    const updateKoreaToday = () => setKoreaToday(getKoreaDateParts());
    updateKoreaToday();

    const timer = window.setInterval(updateKoreaToday, 60 * 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <section className="mobile-home" aria-label="모바일 메인">
      <div className="mobile-home__logo">
        <img className="mobile-home__logo-compass" src={logoCompass} alt="" aria-hidden="true" />
        <img src={logoText} alt="Origin Beyond" />
      </div>

      <div className="mobile-home__npc" aria-hidden="true">
        <img className="mobile-home__npc-panel-image" src={mainNpcPanel} alt="" aria-hidden="true" />
        <span className="mobile-home__npc-crop" aria-hidden="true">
          <img src={doctorWpenImage} alt="" />
        </span>
      </div>

      <section className="mobile-home__calendar" aria-label="캘린더">
        <div className="home-calendar mobile-home-calendar">
          <div className="home-calendar__header">
            <span>Calendar</span>
            <strong>{calendarLabel}</strong>
          </div>
          <div className="home-calendar__weekdays">
            {weekDays.map((day, index) => (
              <span key={day} className={index === 0 ? 'is-sunday' : index === 6 ? 'is-saturday' : ''}>
                {day}
              </span>
            ))}
          </div>
          <div className="home-calendar__grid">
            {calendarDays.map((day, index) => (
              <span
                key={`${day.muted ? 'muted' : 'current'}-${day.day}-${index}`}
                className={[
                  day.day === koreaToday.day && !day.muted ? 'is-today' : '',
                  index % 7 === 0 ? 'is-sunday' : index % 7 === 6 ? 'is-saturday' : '',
                  day.muted ? 'is-muted' : ''
                ].filter(Boolean).join(' ')}
              >
                {day.day}
              </span>
            ))}
          </div>
        </div>
      </section>

      <div className="mobile-home__feeds">
        <section className="mobile-home-feed">
          <div className="mobile-home__section-title">
            <Sparkles size={18} />
            <strong>오늘의 진화</strong>
          </div>
          {evolutionFeed.length > 0 ? (
            evolutionFeed.map((entry) => (
              <button key={entry.id} type="button" className="mobile-home-feed__item" onClick={onPokemonClick}>
                {entry.spriteUrl ? (
                  <span className="mobile-home-feed__pokemon" style={{ backgroundImage: `url(${entry.spriteUrl})` }} />
                ) : (
                  <span className="mobile-home-feed__fallback">P</span>
                )}
                <span>
                  <strong>{entry.pokemonName}</strong>
                  <small>{entry.trainerName}의 포켓몬이 진화했어요</small>
                </span>
              </button>
            ))
          ) : (
            <p className="mobile-home-feed__empty">아직 진화 소식이 없습니다.</p>
          )}
        </section>

        <section className="mobile-home-feed">
          <div className="mobile-home__section-title">
            <ChefHat size={18} />
            <strong>오늘의 요리</strong>
          </div>
          {cookingFeed.length > 0 ? (
            cookingFeed.map((entry) => (
              <button key={entry.id} type="button" className="mobile-home-feed__item" onClick={onCookingClick}>
                {entry.image ? (
                  <img src={entry.image} alt="" />
                ) : (
                  <span className="mobile-home-feed__fallback">C</span>
                )}
                <span>
                  <strong>{entry.itemName}</strong>
                  <small>{entry.trainerName}님이 만든 요리</small>
                </span>
              </button>
            ))
          ) : (
            <p className="mobile-home-feed__empty">아직 요리 소식이 없습니다.</p>
          )}
        </section>
      </div>
    </section>
  );
}

function MobileScrollIndicator() {
  const [indicator, setIndicator] = useState({
    canScroll: false,
    isVisible: false,
    top: 0,
    height: 48
  });

  useEffect(() => {
    let frameId = 0;
    let hideTimer = 0;

    const updateIndicator = (show = false) => {
      window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(() => {
        const doc = document.documentElement;
        const scrollableHeight = Math.max(0, doc.scrollHeight - window.innerHeight);
        const canScroll = scrollableHeight > 2;

        if (!canScroll) {
          setIndicator({ canScroll: false, isVisible: false, top: 0, height: 48 });
          return;
        }

        const trackInset = 14;
        const trackHeight = Math.max(1, window.innerHeight - trackInset * 2);
        const thumbHeight = Math.max(42, Math.min(trackHeight, (window.innerHeight / doc.scrollHeight) * trackHeight));
        const maxTravel = Math.max(0, trackHeight - thumbHeight);
        const progress = Math.min(1, Math.max(0, window.scrollY / scrollableHeight));

        setIndicator({
          canScroll: true,
          isVisible: show,
          top: trackInset + progress * maxTravel,
          height: thumbHeight
        });
      });
    };

    const revealIndicator = () => {
      updateIndicator(true);
      window.clearTimeout(hideTimer);
      hideTimer = window.setTimeout(() => updateIndicator(false), 850);
    };

    updateIndicator(false);
    window.addEventListener('scroll', revealIndicator, { passive: true });
    window.addEventListener('resize', revealIndicator);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(hideTimer);
      window.removeEventListener('scroll', revealIndicator);
      window.removeEventListener('resize', revealIndicator);
    };
  }, []);

  if (!indicator.canScroll) return null;

  return (
    <div className={`mobile-scroll-indicator ${indicator.isVisible ? 'is-visible' : ''}`} aria-hidden="true">
      <span style={{ height: `${indicator.height}px`, transform: `translateY(${indicator.top}px)` }} />
    </div>
  );
}

function MobilePublicHomeDashboard({ members = {}, onLogin }) {
  const [loginUserId, setLoginUserId] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    await onLogin?.(loginUserId, loginPassword);
  };

  return (
    <div className="mobile-public-home">
      <MobileHomeDashboard members={members} />
      <form className="mobile-home-login" onSubmit={handleSubmit}>
        <label>
          <User size={17} />
          <input
            type="text"
            value={loginUserId}
            onChange={(event) => setLoginUserId(event.target.value)}
            autoComplete="username"
            placeholder="아이디"
            required
          />
        </label>
        <label>
          <Lock size={17} />
          <input
            type="password"
            value={loginPassword}
            onChange={(event) => setLoginPassword(event.target.value)}
            autoComplete="current-password"
            placeholder="비밀번호"
            required
          />
        </label>
        <button type="submit">LOGIN</button>
      </form>
    </div>
  );
}

function ForcePasswordChangeModal({ onChangePassword }) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (newPassword.length < 6) {
      alert('새 비밀번호는 6자 이상으로 입력해주세요.');
      return;
    }

    if (newPassword !== confirmPassword) {
      alert('비밀번호 확인이 일치하지 않습니다.');
      return;
    }

    setIsSaving(true);
    try {
      const success = await onChangePassword?.(newPassword);
      if (success) {
        alert('비밀번호가 변경되었습니다.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/55 px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-2xl border-2 border-lime-300 bg-[#f4f8e8] p-6 shadow-2xl"
      >
        <h2 className="mb-2 text-2xl font-bold text-[#26351f]">비밀번호 변경</h2>
        <p className="mb-5 text-sm leading-relaxed text-[#5f7342]">
          임시 비밀번호로 로그인했습니다. 계속 이용하려면 새 비밀번호를 설정해주세요.
        </p>

        <label className="mb-3 block">
          <span className="mb-1 block text-sm font-semibold text-[#384b27]">새 비밀번호</span>
          <input
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            autoComplete="new-password"
            className="w-full rounded-lg border border-[#a7c86f] bg-white px-4 py-3 focus:border-[#7fa438] focus:outline-none"
            minLength={6}
            required
          />
        </label>

        <label className="mb-5 block">
          <span className="mb-1 block text-sm font-semibold text-[#384b27]">새 비밀번호 확인</span>
          <input
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            autoComplete="new-password"
            className="w-full rounded-lg border border-[#a7c86f] bg-white px-4 py-3 focus:border-[#7fa438] focus:outline-none"
            minLength={6}
            required
          />
        </label>

        <button
          type="submit"
          disabled={isSaving}
          className="w-full rounded-lg bg-[#4f741f] px-4 py-3 font-bold text-white transition-colors hover:bg-[#3f5f18] disabled:cursor-not-allowed disabled:bg-gray-400"
        >
          {isSaving ? '저장 중...' : '비밀번호 저장'}
        </button>
      </form>
    </div>
  );
}

function CommunityPlaceholder({ type }) {
  if (type === 'world') {
    return <WorldView zoomableImages />;
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

  useTwemoji();

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
  // 점검 상태 독립 fetch (비로그인 포함 모든 유저)
  const [publicMaintenanceMode, setPublicMaintenanceMode] = useState(false);
  const [publicMaintenanceScheduledAt, setPublicMaintenanceScheduledAt] = useState(null);
  useEffect(() => {
    const dbUrl = process.env.REACT_APP_FIREBASE_DATABASE_URL;
    if (!dbUrl) return;
    const base = dbUrl.replace(/\/$/, '');
    let cancelled = false;
    const poll = async () => {
      try {
        const [mRes, sRes] = await Promise.all([
          fetch(`${base}/gameData/maintenanceMode.json`),
          fetch(`${base}/gameData/maintenanceScheduledAt.json`),
        ]);
        const mVal = await mRes.json();
        const sVal = await sRes.json();
        if (!cancelled) {
          setPublicMaintenanceMode(!!mVal);
          setPublicMaintenanceScheduledAt(sVal || null);
        }
      } catch (_) {}
      if (!cancelled) setTimeout(poll, 10000);
    };
    poll();
    return () => { cancelled = true; };
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
    changeCurrentUserPassword,
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
    getPokemonFormCandidates,
    changePokemonForm,
    setPartnerPokemon,
    forgetMove,
    learnMove,
    replaceMove,
    allMoves,
    pokemonLearnsets,
    maintenanceMode,
    maintenanceScheduledAt,
    scheduleMaintenanceMode,
    cancelScheduledMaintenance,
    systemSettings,
    applyLoot,
    updateCurrentUser,
    updatePokedexRegions,
    useItemOnPokemon,
    evolutionModal,
    acceptEvolution,
    cancelEvolution,
    increaseEffort,
	camping,
  } = gameState;
  const isFeaturePage = currentTab !== 'home';
  const isMembersPage = currentTab === 'members';
  const isTopMenuPage = ['notice', 'world', 'system'].includes(currentTab);
  const hasContentSurface = isFeaturePage && !isMembersPage;
  const isCoreLoading = isAuthLoading || isMembersLoading;
  const [isInitialPageReady, setIsInitialPageReady] = useState(false);

  const [maintenanceCountdown, setMaintenanceCountdown] = useState(null);

  useEffect(() => {
    const scheduled = maintenanceScheduledAt || publicMaintenanceScheduledAt;
    if (!scheduled) {
      setMaintenanceCountdown(null);
      return;
    }
    const tick = () => {
      const remaining = Math.ceil((scheduled - Date.now()) / 1000);
      setMaintenanceCountdown(remaining <= 0 ? 0 : remaining);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [maintenanceScheduledAt, publicMaintenanceScheduledAt]);

  const effectiveMaintenanceMode = maintenanceMode || publicMaintenanceMode;
  const effectiveScheduledAt = maintenanceScheduledAt || publicMaintenanceScheduledAt;
  const isMaintenanceActive = effectiveMaintenanceMode || (effectiveScheduledAt && Date.now() >= effectiveScheduledAt);
  const [isLoadingOverlayVisible, setIsLoadingOverlayVisible] = useState(true);
  const [isLoadingOverlayFading, setIsLoadingOverlayFading] = useState(false);
  const [isClaimingAttendance, setIsClaimingAttendance] = useState(false);
  const [showAccessModal, setShowAccessModal] = useState(false);
  const getRandomAccessModalImg = () =>
    Math.random() < 0.5 ? '/pre-popup1.png' : '/pre-popup2.png';
  const [accessModalImg, setAccessModalImg] = useState(getRandomAccessModalImg);
  const todayAttendanceKey = getKoreaDateKey();
  const attendanceClaimed = currentUser?.lastAttendanceDate === todayAttendanceKey;

  useEffect(() => {
    if (!showAccessModal) return undefined;

    const handleAccessModalKeyDown = (event) => {
      const key = event.key.toLowerCase();

      if (key === 'a' || key === 'ㅁ' || event.code === 'KeyA') {
        setShowAccessModal(false);
      }
    };

    window.addEventListener('keydown', handleAccessModalKeyDown);
    return () => {
      window.removeEventListener('keydown', handleAccessModalKeyDown);
    };
  }, [showAccessModal]);

  const handleClaimAttendance = async () => {
    if (!currentUser?.id || isClaimingAttendance) return;

    const todayKey = getKoreaDateKey();
    if (currentUser.lastAttendanceDate === todayKey) {
      alert('오늘 출석 보상은 이미 받았습니다.');
      return;
    }

    setIsClaimingAttendance(true);
    try {
      await updateCurrentUser({
        money: (Number(currentUser.money) || 0) + DAILY_ATTENDANCE_MONEY,
        trainerExp: (Number(currentUser.trainerExp) || 0) + DAILY_ATTENDANCE_EXP,
        lastAttendanceDate: todayKey
      });
      alert(`출석 보상 지급 완료!\n${DAILY_ATTENDANCE_MONEY.toLocaleString()}원과 경험치 ${DAILY_ATTENDANCE_EXP}을 받았습니다.`);
    } finally {
      setIsClaimingAttendance(false);
    }
  };

  

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
    getPokemonFormCandidates,
    changePokemonForm,
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

  if (isMaintenanceActive && !isAdmin) {
    return <MaintenanceScreen onLogout={currentUser ? handleLogout : undefined} />;
  }

  if (isCoreLoading) {
    return <LoadingOverlay />;
  }

      const handlePublicNavigation = (nextTab) => {
      if (!['home', 'notice', 'world', 'system'].includes(nextTab)) {
        // 허용되지 않은 탭이면 모달 오픈
        setAccessModalImg(getRandomAccessModalImg());
        setShowAccessModal(true);
      } else {
        // 허용된 탭('home', 'notice', 'world', 'system')이면 실제로 탭 전환!
        setCurrentTab(nextTab);
      }
    };

if (!currentUser || !currentUser.id) {
    // ✅ 1. 비로그인 유저의 탭 이동 제어 함수 (이동 로직 추가)

    const MaintenanceCountdownBanner = maintenanceCountdown > 0 ? (
      // ... (기존 유지보수 배너 스타일 코드 그대로 유지) ...
      <div style={{
        position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
        zIndex: 9999, background: '#1e293b', color: '#fff',
        borderRadius: 12, padding: '14px 28px', boxShadow: '0 4px 24px rgba(0,0,0,0.35)',
        display: 'flex', alignItems: 'center', gap: 14, fontSize: 15, fontWeight: 600,
        whiteSpace: 'nowrap',
      }}>
        <span style={{ fontSize: 22 }}>🔧</span>
        <span>{Math.floor(maintenanceCountdown / 60)}분 {maintenanceCountdown % 60}초 후 점검이 시작됩니다</span>
      </div>
    ) : null;

    if (isMobile) {
      return (
        <div style={{
          position: 'fixed', inset: 0,
          backgroundImage: `url(${forestBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}>
          <div style={{
            position: 'absolute', inset: 0,
            backgroundColor: 'rgba(10,20,10,0.55)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
          }} />
          <img src={logoCompass} alt="" style={{
            position: 'absolute',
            width: 320, height: 320,
            top: 'calc(50% - 20px)', left: '50%',
            transform: 'translate(-50%, -62%)',
            mixBlendMode: 'overlay',
            pointerEvents: 'none',
          }} />
          <img src={logoText} alt="" style={{
            position: 'absolute',
            width: 340,
            top: 'calc(52.8% - 20px)', left: '49.4%',
            transform: 'translate(-50%, -90%)',
            objectFit: 'contain',
            pointerEvents: 'none',
          }} />
          <div style={{
            position: 'absolute',
            top: '50%', left: '50%',
            transform: 'translate(-50%, 110%)',
            textAlign: 'center',
          }}>
            <p style={{
              color: 'rgba(255,255,255,0.88)',
              fontSize: 18,
              lineHeight: 1.9,
              letterSpacing: '0.05em',
              margin: 0,
            }}>
              PC 환경에서 이용해주세요.<br />
              모바일은 지원하지 않습니다.
            </p>
          </div>
          {isLoadingOverlayVisible && <LoadingOverlay overlay fading={isLoadingOverlayFading} />}
        </div>
      );
    }

    return (
      <>
      <PlaylistWidget />
      <div className={`main-shell ${currentTab === 'home' ? 'main-shell--home' : ''}`}>
        <SakuraEffect />
        {/* ✅ 3. 현재 탭 상태(currentTab)를 고정이 아닌 state 기반으로 매핑 */}
        <Header currentTab={currentTab} setCurrentTab={handlePublicNavigation} />
        <div className={`main-layout ${currentTab === 'home' ? 'main-layout--home' : ''} ${isTopMenuPage ? 'main-layout--world' : ''}`}>
          <Sidebar
            currentTab={currentTab}
            setCurrentTab={handlePublicNavigation}
            isAdmin={false}
          />
          {hasContentSurface && <span className="content-stage__surface" aria-hidden="true" />}
          <main className={`content-stage ${currentTab === 'home' ? 'content-stage--home' : 'content-stage--view'} ${isFeaturePage ? 'content-stage--feature' : ''} ${isTopMenuPage ? 'content-stage--world' : ''}`}>
            {/* ✅ 4. 비로그인 유저라도 허용된 탭에 따라 화면을 다르게 보여주도록 스위칭 처리 */}
            {currentTab === 'home' && <HomeDashboard showLogin onLogin={handleLogin} members={members} />}
            {currentTab === 'notice' && <CommunityPlaceholder type="notice" trainer={trainer} />}
            {currentTab === 'world' && <CommunityPlaceholder type="world" trainer={trainer} />}
            {currentTab === 'system' && <CommunityPlaceholder type="system" trainer={trainer} />}
          </main>
        </div>
      </div>
      {showAccessModal && (
        <div className="access-modal-overlay">
          <div className="access-modal-popover" onClick={(e) => e.stopPropagation()}>
            <img
              src={accessModalImg}
              alt="접근 불가"
              className="access-modal-img"
            />
            <button
              type="button"
              className="access-modal-hitbox"
              aria-label="팝업 닫기"
              onClick={() => setShowAccessModal(false)}
            />
          </div>
        </div>
      )}
      {isLoadingOverlayVisible && <LoadingOverlay overlay fading={isLoadingOverlayFading} />}
      {MaintenanceCountdownBanner}
      </>
    );
  }

if (isMobile && !trainer.isAdmin && !trainer.isSuperAdmin) {
  return (
    <div style={{
      position: 'fixed', inset: 0,
      backgroundImage: `url(${forestBg})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        backgroundColor: 'rgba(10,20,10,0.55)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
      }} />
      <img src={logoCompass} alt="" style={{
        position: 'absolute',
        width: 320, height: 320,
        top: 'calc(50% - 20px)', left: '50%',
        transform: 'translate(-50%, -62%)',
        mixBlendMode: 'overlay',
        pointerEvents: 'none',
      }} />
      <img src={logoText} alt="" style={{
        position: 'absolute',
        width: 340,
        top: 'calc(52.8% - 20px)', left: '49.4%',
        transform: 'translate(-50%, -90%)',
        objectFit: 'contain',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute',
        top: '50%', left: '50%',
        transform: 'translate(-50%, 110%)',
        textAlign: 'center',
      }}>
        <p style={{
          color: 'rgba(255,255,255,0.88)',
          fontSize: 18,
          lineHeight: 1.9,
          letterSpacing: '0.05em',
          marginBottom: 28,
        }}>
          PC 환경에서 이용해주세요.<br />
          모바일은 지원하지 않습니다.
        </p>
        <button
          onClick={handleLogout}
          style={{
            background: 'rgba(255,255,255,0.12)',
            border: '1px solid rgba(255,255,255,0.3)',
            color: '#fff',
            borderRadius: 8,
            padding: '8px 24px',
            fontSize: 13,
            cursor: 'pointer',
            letterSpacing: '0.05em',
          }}
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
          {currentTab === 'home' && (
            <MobileHomeDashboard
              trainer={trainer}
              members={members}
              onCookingClick={() => setCurrentTab('cooking')}
              onPokemonClick={() => setCurrentTab('pokemon')}
            />
          )}

          {currentTab === 'map' && (
            <MapView 
              regions={regions} 
              onRegionClick={handleRegionClick} 
              gamePokedex={gamePokedex}
              allPokemonMaster={allPokemonMaster}
              pokedexData={sharedPokedexData}
              caughtPokemon={caughtPokemon.filter(p => p !== null)}
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
              isMobile
            />
          )}

          {currentTab === 'members' && <MembersView members={members} isLoading={isMembersLoading} />}
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
          {currentTab === 'battle' && isAdmin && <BattleView />}
        </MobileLayout>
      ) : (
        <div className={`main-shell ${currentTab === 'home' ? 'main-shell--home' : ''}`}>
          <SakuraEffect />
          <Header currentTab={currentTab} setCurrentTab={setCurrentTab} />

          <div className={`main-layout ${currentTab === 'home' ? 'main-layout--home' : ''} ${isTopMenuPage ? 'main-layout--world' : ''}`}>
          <Sidebar
            currentTab={currentTab}
            setCurrentTab={setCurrentTab}
            isAdmin={isAdmin}
            trainer={trainer}
            onLogout={handleLogout}
            soundEnabled={soundEnabled}
            onToggleSound={() => setSoundEnabled(!soundEnabled)}
          />

      {hasContentSurface && <span className="content-stage__surface" aria-hidden="true" />}

		<main className={`content-stage ${currentTab === 'home' ? 'content-stage--home' : 'content-stage--view'} ${isFeaturePage ? 'content-stage--feature' : ''} ${isTopMenuPage ? 'content-stage--world' : ''}`}>
      {currentTab === 'home' && (
        <HomeDashboard
          trainer={trainer}
          onLogout={handleLogout}
          onPokemonClick={() => setCurrentTab('pokemon')}
          onItemsClick={() => setCurrentTab('items')}
          onClaimAttendance={handleClaimAttendance}
          attendanceClaimed={attendanceClaimed}
          isClaimingAttendance={isClaimingAttendance}
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
			  gamePokedex={gamePokedex}
			  allPokemonMaster={allPokemonMaster}
			  pokedexData={sharedPokedexData}
			  caughtPokemon={caughtPokemon.filter(p => p !== null)}
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
		  
		  {currentTab === 'members' && <MembersView members={members} isLoading={isMembersLoading} />}
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
      {currentTab === 'battle' && isAdmin && <BattleView />} 
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
          maxNonPartnerPokemon={systemSettings?.maxNonPartnerPokemon || 18}
          escapeMode={systemSettings?.escapeMode || 'none'}
          isCave={encounterPokemon.isCave === true}
          isWaterside={encounterPokemon.isWaterside === true}
          isSafari={encounterPokemon.isSafari === true}
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
      {currentUser?.forcePasswordChange && (
        <ForcePasswordChangeModal onChangePassword={changeCurrentUserPassword} />
      )}
    </PokemonProvider>
  </GameProvider>
  {isLoadingOverlayVisible && <LoadingOverlay overlay fading={isLoadingOverlayFading} />}
  {maintenanceCountdown !== null && maintenanceCountdown > 0 && (
    <div style={{
      position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
      zIndex: 9999, background: '#1e293b', color: '#fff',
      borderRadius: 12, padding: '14px 28px', boxShadow: '0 4px 24px rgba(0,0,0,0.35)',
      display: 'flex', alignItems: 'center', gap: 14, fontSize: 15, fontWeight: 600,
      whiteSpace: 'nowrap',
    }}>
      <span style={{ fontSize: 22 }}>🔧</span>
      <span>
        {Math.floor(maintenanceCountdown / 60)}분 {maintenanceCountdown % 60}초 후 점검이 시작됩니다
      </span>
      {isAdmin && (
        <button
          onClick={cancelScheduledMaintenance}
          style={{ marginLeft: 8, background: '#ef4444', border: 'none', color: '#fff', borderRadius: 8, padding: '4px 12px', cursor: 'pointer', fontWeight: 700 }}
        >
          취소
        </button>
      )}
    </div>
  )}
  </>
);
}
