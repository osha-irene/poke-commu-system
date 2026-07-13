// src/App.jsx - 湲곗〈 肄붾뱶??Context留?異붽?

import useMediaQuery from './hooks/useMediaQuery';
import MobileLayout from './components/layout/MobileLayout';
import './App.css';
import SakuraEffect from './effects/sakura';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { ref, get, set, onChildAdded, onChildChanged, onChildRemoved, runTransaction } from 'firebase/database';
import { database } from './firebase';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import MapView from './components/views/MapView';
import MobileMapView from './components/views/_mobile/MobileMapView';
import MobileMembersView from './components/views/_mobile/MobileMembersView';
import MobileTrainerCard from './components/views/_mobile/MobileTrainerCard';
import PokedexView from './components/views/PokedexView';
import PokemonView from './components/views/PokemonView';
import ItemsView from './components/views/ItemsView';
import ProfileView from './components/views/ProfileView';
import AdminView from './components/views/AdminView';
import EncounterModal from './components/modals/EncounterModal';
import FirstCatchMemoModal from './components/modals/FirstCatchMemoModal';
import StatSelectModal from './components/modals/StatSelectModal';
import MoveChoiceModal from './components/views/pokemon/MoveChoiceModal';
import EvolutionModal from './components/modals/EvolutionModal';
import useGameState from './hooks/useGameState';
import useDeployRefresh from './hooks/useDeployRefresh';
import ShopView from './components/views/ShopView';
import NpcView from './components/views/NpcView';
import MembersView from './components/views/MembersView';
import CampingView from './components/views/CampingView';
import QnABoard from './components/views/QnABoard';
import CookingView from './components/views/CookingView';
import WorldView from './components/views/WorldView';
import { noticeContent, systemContent } from './data/communityContent';
import MOCK_MEMBERS from './data/mockMembers';
import { PokemonProvider } from './contexts/PokemonContext';
import { GameProvider } from './contexts/GameContext';
import BattleView from './components/views/BattleView';
import MaintenanceScreen from './components/layout/MaintenanceScreen';
import { mainNewsButton, doctorWpenImage, logoText, logoCompass, forestBgBlurred, mainNpcPanel, loginMemberImg, loginTitle, loginBag, loginEntry, loginReport, loginLogout, loginIcon1, loginIcon2, loginIcon3, loginIcon4 } from './assets/images';
import { getTitleById } from './data/titles';
import { User, Lock, Music, X, Play, Pause, SkipBack, SkipForward, Volume2, ChefHat, Sparkles } from 'lucide-react';
import { DAILY_ATTENDANCE_EXP, getKoreaDateKey } from './utils/experience';
import { getPokemonLocalIconUrl } from './utils/pokemonIconUtils';
import { getTitleDisplayStyle } from './utils/titleDisplay';
import CachedImage from './components/common/CachedImage';

const STATIC_TITLE_ICONS = { icon1: loginIcon1, icon2: loginIcon2, icon3: loginIcon3, icon4: loginIcon4 };
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

// 숨긴 멤버의 도감 기여를 제거하고 다음 가시적 멤버 데이터로 대체
function computeEffectivePokedexData(pokedexData, members) {
  const hiddenNames = new Set(
    Object.values(members)
      .filter(m => m?.hidden)
      .map(m => m.name)
      .filter(Boolean)
  );

  if (hiddenNames.size === 0) return pokedexData;

  // 포켓몬 번호별 → 해당 포켓몬을 보유한 가시적 멤버 이름 목록
  // caughtNumbers는 memberSummary에 미리 계산되어 들어있는 가벼운 필드라 caughtPokemon
  // 상세(스탯/기술 등)를 구독하지 않는 화면에서도 사용할 수 있다. 상세가 이미 로드된
  // 경우(멤버/NPC 탭)엔 caughtPokemon에서 직접 뽑아 최신 상태를 반영한다.
  const visibleCatchers = {};
  Object.values(members).forEach(member => {
    if (!member || member.hidden) return;
    const numbers = Array.isArray(member.caughtPokemon)
      ? member.caughtPokemon
          .filter(Boolean)
          .flatMap(pokemon => [pokemon.number, pokemon.originalNumber].filter(Boolean))
      : (member.caughtNumbers || []);
    numbers.forEach(num => {
      const key = String(num);
      if (!visibleCatchers[key]) visibleCatchers[key] = [];
      if (!visibleCatchers[key].includes(member.name)) {
        visibleCatchers[key].push(member.name);
      }
    });
  });

  const result = {};
  for (const [key, entry] of Object.entries(pokedexData)) {
    if (!entry) continue;

    const catcherHidden = entry.firstCatcher && hiddenNames.has(entry.firstCatcher);
    const encounterHidden = entry.firstEncounter && hiddenNames.has(entry.firstEncounter);

    if (!catcherHidden && !encounterHidden) {
      result[key] = entry;
      continue;
    }

    const nextVisible = (visibleCatchers[key] || [])[0] || null;

    if (catcherHidden) {
      if (nextVisible) {
        // 다음 가시적 포획자로 대체, 메모 초기화
        result[key] = {
          ...entry,
          firstCatcher: nextVisible,
          caughtBy: nextVisible,
          caughtAt: null,
          firstEncounter: encounterHidden ? nextVisible : entry.firstEncounter,
          encounteredAt: encounterHidden ? null : entry.encounteredAt,
          memo: null,
        };
      } else if (!encounterHidden) {
        // 가시적 포획자 없지만 조우자는 가시적 → 포획 정보만 제거
        result[key] = {
          ...entry,
          firstCatcher: null,
          caughtBy: null,
          caughtAt: null,
          memo: null,
        };
      }
      // 조우자도 숨겨지고 가시적 멤버 없으면 entry 제외 → 포켓몬 잠금 상태로
    } else {
      // firstEncounter만 숨겨진 경우
      if (entry.firstCatcher) {
        // firstCatcher는 가시적 → firstEncounter를 firstCatcher로 대체
        result[key] = { ...entry, firstEncounter: entry.firstCatcher, encounteredAt: null };
      } else if (nextVisible) {
        result[key] = { ...entry, firstEncounter: nextVisible, encounteredAt: null };
      }
      // 가시적 멤버 없으면 entry 제외
    }
  }

  return result;
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
    .filter((member) => !member?.hidden)
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
    .filter((member) => !member?.hidden)
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
  members = {},
  scheduleEvents = [],
  titles = [],
  onUpdateTitle,
  onProfileClick,
}) {
  const [loginUserId, setLoginUserId] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [titleOpen, setTitleOpen] = useState(false);
  const [koreaToday, setKoreaToday] = useState(() => getKoreaDateParts());
  const calendarDays = getCalendarDays(koreaToday.year, koreaToday.month);
  const calendarLabel = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul',
    month: 'long'
  }).format(new Date(Date.UTC(koreaToday.year, koreaToday.month - 1, 1)));
  const weekDays = ['\uC77C', '\uC6D4', '\uD654', '\uC218', '\uBAA9', '\uAE08', '\uD1A0'];

  const [calTooltip, setCalTooltip] = useState(null);
  const [calTooltipPos, setCalTooltipPos] = useState({ x: 0, y: 0 });
  const calTooltipTimer = useRef(null);

  useEffect(() => {
    const updateKoreaToday = () => setKoreaToday(getKoreaDateParts());
    updateKoreaToday();
    const timer = window.setInterval(updateKoreaToday, 60 * 1000);
    return () => window.clearInterval(timer);
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
              <div className="home-session-panel__top">
                <div
                  className="home-session-panel__member-img"
                  onClick={onProfileClick}
                  style={onProfileClick ? { cursor: 'pointer' } : undefined}
                  role={onProfileClick ? 'button' : undefined}
                  aria-label={onProfileClick ? '내 프로필 보기' : undefined}
                >
                  <div className="home-session-panel__member-clip">
                    {(trainer?.profileImageThumb || trainer?.profileImage) && (
                      <CachedImage
                        className="home-session-panel__member-face"
                        src={trainer.profileImageThumb || trainer.profileImage}
                        alt={trainer.name || ''}
                      />
                    )}
                  </div>
                  <img className="home-session-panel__member-frame" src={loginMemberImg} alt="" aria-hidden="true" />
                  {(() => {
                    if (!trainer?.title || trainer.title === 'none') return null;
                    const found = titles.find(t => t.id === trainer.title);
                    const iconUrl = found?.iconUrl
                      || (found?.icon ? STATIC_TITLE_ICONS[found.icon] : null)
                      || (() => { const s = getTitleById(trainer.title); return s?.icon ? STATIC_TITLE_ICONS[s.icon] : null; })();
                    if (!iconUrl) return null;
                    return (
                      <img
                        className="home-session-panel__title-icon"
                        src={iconUrl}
                        alt=""
                        aria-hidden="true"
                      />
                    );
                  })()}
                </div>
                <div className="home-session-panel__info">
                  {(() => {
                    const currentTitleLabel = (() => {
                      if (!trainer?.title || trainer.title === 'none') return null;
                      const found = titles.find(t => t.id === trainer.title);
                      if (found) return found.label;
                      // fallback to static data
                      const staticData = getTitleById(trainer.title);
                      return staticData && staticData.id !== 'none' ? staticData.label : null;
                    })();
                    return (
                      <div className="home-session-panel__title-wrap" style={{ position: 'relative' }}>
                        <img className="home-session-panel__title" src={loginTitle} alt="" aria-hidden="true" />
                        <button
                          className="home-session-panel__title-overlay"
                          onClick={() => setTitleOpen(v => !v)}
                          aria-label="칭호 선택"
                        >
                          <span
                            className="home-session-panel__title-text"
                            style={getTitleDisplayStyle(currentTitleLabel, { compactFontSize: 12 })}
                          >
                            {currentTitleLabel || ''}
                          </span>
                        </button>
                        {titleOpen && (
                          <div className="home-session-panel__title-dropdown">
                            <div onClick={() => { onUpdateTitle?.('none'); setTitleOpen(false); }}>
                              칭호 없음
                            </div>
                            {titles
                              .filter(t => (trainer.assignedTitles || []).includes(t.id))
                              .map(t => (
                                <div key={t.id} onClick={() => { onUpdateTitle?.(t.id); setTitleOpen(false); }}>
                                  {t.label}
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                  <span className="home-session-panel__name">{trainer?.name || 'Trainer'}</span>
                  <div className="home-session-panel__quick-actions" aria-label="\uBC14\uB85C\uAC00\uAE30">
                    <button type="button" onClick={onItemsClick} aria-label="\uAC00\uBC29">
                      <img src={loginBag} alt="\uAC00\uBC29" />
                    </button>
                    <button type="button" onClick={onPokemonClick} aria-label="\uC5D4\uD2B8\uB9AC">
                      <img src={loginEntry} alt="\uC5D4\uD2B8\uB9AC" />
                    </button>
                  </div>
                </div>
              </div>
              <div className="home-session-panel__bottom">
                <div
                  role="button"
                  tabIndex={attendanceClaimed || isClaimingAttendance ? -1 : 0}
                  onClick={!attendanceClaimed && !isClaimingAttendance ? onClaimAttendance : undefined}
                  className={`home-session-panel__report${attendanceClaimed || isClaimingAttendance ? ' is-disabled' : ''}`}
                  aria-label="\uB808\uD3EC\uD2B8 \uC791\uC131"
                  aria-disabled={attendanceClaimed || isClaimingAttendance}
                >
                  <img src={loginReport} alt="\uB808\uD3EC\uD2B8 \uC791\uC131" />
                </div>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={onLogout}
                  className="home-session-panel__logout"
                  aria-label="\uB85C\uADF8\uC544\uC6C3"
                >
                  <img src={loginLogout} alt="\uB85C\uADF8\uC544\uC6C3" />
                </div>
              </div>
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
  scheduleEvents = [],
  onCookingClick,
  onPokemonClick
}) {
  const [koreaToday, setKoreaToday] = useState(() => getKoreaDateParts());
  const [calPopup, setCalPopup] = useState(null); // { events, dateLabel }
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
            {calendarDays.map((day, index) => {
              const dayYear = day.muted
                ? (index < 7 ? (koreaToday.month === 1 ? koreaToday.year - 1 : koreaToday.year) : (koreaToday.month === 12 ? koreaToday.year + 1 : koreaToday.year))
                : koreaToday.year;
              const dayMonth = day.muted
                ? (index < 7 ? (koreaToday.month === 1 ? 12 : koreaToday.month - 1) : (koreaToday.month === 12 ? 1 : koreaToday.month + 1))
                : koreaToday.month;
              const dateKey = toDateKey(dayYear, dayMonth, day.day);
              const dayEvents = scheduleEvents.filter(e => e.start === dateKey);
              const importantEv = dayEvents.find(e => e.important);
              const dotEvents = dayEvents.filter(e => !e.important);
              const hasEvents = dayEvents.length > 0;

              return (
                <span
                  key={`${day.muted ? 'muted' : 'current'}-${day.day}-${index}`}
                  className={[
                    index % 7 === 0 ? 'is-sunday' : index % 7 === 6 ? 'is-saturday' : '',
                    day.muted ? 'is-muted' : '',
                    importantEv ? 'has-important' : '',
                  ].filter(Boolean).join(' ')}
                  style={{
                    position: 'relative',
                    cursor: hasEvents ? 'pointer' : undefined,
                    ...(importantEv ? { '--important-color': importantEv.color } : {}),
                  }}
                  onClick={hasEvents ? (e) => {
                    e.stopPropagation();
                    const rect = e.currentTarget.getBoundingClientRect();
                    setCalPopup({ events: dayEvents, dateLabel: `${dayMonth}/${day.day}`, anchorTop: rect.top, anchorLeft: rect.left + rect.width / 2 });
                  } : undefined}
                >
                  {day.day}
                  {dotEvents.length > 0 && (
                    <span style={{
                      position: 'absolute', bottom: 1, left: '50%', transform: 'translateX(-50%)',
                      display: 'flex', gap: 2,
                    }}>
                      {dotEvents.slice(0, 3).map((ev, i) => (
                        <span key={i} style={{ width: 4, height: 4, borderRadius: '50%', background: ev.color, display: 'inline-block' }} />
                      ))}
                    </span>
                  )}
                </span>
              );
            })}
          </div>

          {calPopup && createPortal(
            <div
              style={{ position: 'fixed', inset: 0, zIndex: 9999 }}
              onClick={() => setCalPopup(null)}
            >
              <div
                className="home-cal-tooltip"
                style={{
                  left: Math.min(Math.max(6, calPopup.anchorLeft), window.innerWidth - 6),
                  top: calPopup.anchorTop + 10,
                  '--tip-bg': calPopup.events[0]?.color ? darkenHex(calPopup.events[0].color, 45) : 'rgba(15,18,15,0.96)',
                  '--tip-text': '#fff',
                }}
                onClick={e => e.stopPropagation()}
              >
                {calPopup.events.map((ev, i) => (
                  <div key={i} className="home-cal-tooltip__item">
                    <strong>{ev.title}</strong>
                    {ev.desc && <p>{ev.desc}</p>}
                  </div>
                ))}
              </div>
            </div>,
            document.body
          )}
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



function DesktopLoginGate({ onLogin, banner }) {
  const [loginUserId, setLoginUserId] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!onLogin) return;
    await onLogin(loginUserId, loginPassword);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0,
      overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
    }}>
      {/* 미리 블러 처리해둔 배경 이미지 (런타임 blur 없이 바로 렌더링해 로딩/렌더 성능 확보) */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `url(${forestBgBlurred})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }} />

      {/* 어두운 오버레이 */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundColor: 'rgba(10, 20, 10, 0.55)',
      }} />

      <img src={logoCompass} alt="" style={{
        position: 'absolute',
        width: 360, height: 360,
        top: 'calc(50% - 84px)', left: '50%',
        transform: 'translate(-50%, -62%)',
        mixBlendMode: 'overlay',
        pointerEvents: 'none',
      }} />

      <img src={logoText} alt="사이트명" style={{
        position: 'absolute',
        width: 490,
        top: 'calc(52.8% - 70px)', left: '49.4%',
        transform: 'translate(-50%, -90%)',
        objectFit: 'contain',
        pointerEvents: 'none',
      }} />

      {/* 하단 로그인 폼 */}
      <form onSubmit={handleSubmit} className="desktop-login-gate-form" style={{
        position: 'absolute',
        top: 'calc(50% - 79px)', left: '50%',
        transform: 'translate(-50%, 90%)',
        width: 280,
        display: 'grid',
        gap: 12,
      }}>
        <label className="desktop-login-gate-field">
          <User size={16} aria-hidden="true" />
          <input
            type="text"
            value={loginUserId}
            onChange={(event) => setLoginUserId(event.target.value)}
            autoComplete="username"
            placeholder="아이디"
            required
          />
        </label>
        <label className="desktop-login-gate-field">
          <Lock size={16} aria-hidden="true" />
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

      {banner}
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
  const [scheduleEvents, setScheduleEvents] = useState([]);
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
    statSelectPending,
    handleStatSelectComplete,
    moveChoicePending,
    handleMoveChoiceComplete,
    consumeQnaItemPermit,
    regions,
    allPokemonMaster,
    members,
    memberViewMembers,
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
    updatePokemonMemo,
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
    cancelScheduledMaintenance,
    systemSettings,
    applyLoot,
    updateCurrentUser,
    updatePokedexRegions,
    resetPokedex,
    useItemOnPokemon,
    evolutionModal,
    acceptEvolution,
    cancelEvolution,
    increaseEffort,
    camping,
    titles,
    updateSelfTitle,
  } = gameState;
  useDeployRefresh({ defer: Boolean(encounterPokemon || firstCatchPokemon) });
  const isFeaturePage = currentTab !== 'home';
  const isMembersPage = currentTab === 'members';
  const isTopMenuPage = ['notice', 'world', 'system', 'qna'].includes(currentTab);
  const hasContentSurface = isFeaturePage && !isMembersPage && currentTab !== 'profile' && currentTab !== 'npcs' && currentTab !== 'map' && (isMobile || currentTab !== 'shop');
  const isCoreLoading = isAuthLoading || isMembersLoading;
  const displayMembers = process.env.NODE_ENV === 'development'
    ? { ...MOCK_MEMBERS, ...memberViewMembers }
    : memberViewMembers;
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

  const effectivePokedexData = useMemo(
    () => computeEffectivePokedexData(sharedPokedexData, displayMembers),
    [sharedPokedexData, displayMembers]
  );

  const effectiveMaintenanceMode = maintenanceMode || publicMaintenanceMode;
  const effectiveScheduledAt = maintenanceScheduledAt || publicMaintenanceScheduledAt;
  const isMaintenanceActive = effectiveMaintenanceMode || (effectiveScheduledAt && Date.now() >= effectiveScheduledAt);
  const [isLoadingOverlayVisible, setIsLoadingOverlayVisible] = useState(true);
  const [isLoadingOverlayFading, setIsLoadingOverlayFading] = useState(false);
  const [isClaimingAttendance, setIsClaimingAttendance] = useState(false);
  const [initialMemberId, setInitialMemberId] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('member') || null;
  });
  const [showAccessModal, setShowAccessModal] = useState(false);
  const getRandomAccessModalImg = () =>
    Math.random() < 0.5 ? '/pre-popup1.png' : '/pre-popup2.png';
  const [setAccessModalImg] = useState(getRandomAccessModalImg);
  const todayAttendanceKey = getKoreaDateKey();
  const attendanceClaimed = currentUser?.lastAttendanceDate === todayAttendanceKey;
  const attendanceLocked = todayAttendanceKey < '2026-07-06';

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
    if (todayKey < '2026-07-06') {
      alert('레포트 기능은 6일 00시부터 이용 가능합니다.');
      return;
    }
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

  // 게시판 실시간 로드
  useEffect(() => {
    const postsRef = ref(database, 'community/qnaPosts');
    let isInitialLoad = true;

    get(postsRef)
      .then((snapshot) => {
        setQnaPosts(snapshot.exists() ? snapshot.val() : []);
      })
      .catch((error) => {
        console.error('❌ 게시판 로드 실패:', error);
      })
      .finally(() => {
        isInitialLoad = false;
        setIsLoadingPosts(false);
      });

    const setPostChild = (snapshot) => {
      if (isInitialLoad) return;
      setQnaPosts(prev => {
        const next = Array.isArray(prev) ? [...prev] : [];
        next[Number(snapshot.key)] = snapshot.val();
        return next.filter(Boolean);
      });
    };

    const unsubAdded = onChildAdded(postsRef, setPostChild);
    const unsubChanged = onChildChanged(postsRef, setPostChild);
    const unsubRemoved = onChildRemoved(postsRef, (snapshot) => {
      if (isInitialLoad) return;
      setQnaPosts(prev => {
        const next = Array.isArray(prev) ? [...prev] : [];
        next.splice(Number(snapshot.key), 1);
        return next.filter(Boolean);
      });
    });

    return () => {
      unsubAdded();
      unsubChanged();
      unsubRemoved();
    };
  }, []);

  // 일정 실시간 로드 (App 레벨 — 모바일 공개홈에서도 사용)
  useEffect(() => {
    const eventsRef = ref(database, 'gameData/scheduleEvents');
    let isInitialLoad = true;

    get(eventsRef)
      .then((snap) => {
        setScheduleEvents(snap.exists()
          ? Object.entries(snap.val()).map(([key, value]) => ({ firebaseKey: key, ...value }))
          : []);
      })
      .catch((error) => {
        console.error('schedule events load failed:', error);
      })
      .finally(() => {
        isInitialLoad = false;
      });

    const upsertEvent = (snap) => {
      if (isInitialLoad || !snap.exists()) return;
      const nextEvent = { firebaseKey: snap.key, ...snap.val() };
      setScheduleEvents(prev => {
        const exists = prev.some(event => event.firebaseKey === snap.key);
        if (!exists) return [...prev, nextEvent];
        return prev.map(event => event.firebaseKey === snap.key ? nextEvent : event);
      });
    };

    const unsubAdded = onChildAdded(eventsRef, upsertEvent);
    const unsubChanged = onChildChanged(eventsRef, upsertEvent);
    const unsubRemoved = onChildRemoved(eventsRef, (snap) => {
      if (isInitialLoad) return;
      setScheduleEvents(prev => prev.filter(event => event.firebaseKey !== snap.key));
    });

    return () => {
      unsubAdded();
      unsubChanged();
      unsubRemoved();
    };
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
      if (window.innerWidth <= 768) return;
      audio.currentTime = 0;
      audio.play().catch(() => {});
    };

    document.addEventListener('click', handleGlobalClick);
    return () => document.removeEventListener('click', handleGlobalClick);
  }, [soundEnabled]);

  const saveQnaPosts = async (nextPostsOrUpdater) => {
    if (typeof nextPostsOrUpdater === 'function') {
      try {
        const postsRef = ref(database, 'community/qnaPosts');
        const result = await runTransaction(postsRef, (currentPosts) => {
          const posts = Array.isArray(currentPosts) ? currentPosts : [];
          return nextPostsOrUpdater(posts);
        });

        if (result.committed) {
          setQnaPosts(result.snapshot.val() || []);
          return true;
        }
        return false;
      } catch (error) {
        console.error('QnA posts save failed:', error);
        return false;
      }
    }

    const nextPosts = nextPostsOrUpdater;
    console.warn('QnA posts must be updated with a transaction updater.', nextPosts);
    void Promise.resolve().catch((error) => {
      console.error('❌ 게시판 저장 실패:', error);
    });
    return false;
  };

  // 볼 변경 티켓/미용실 이용권으로 받은 권한이 있어야만 "아이템" 탭에 글을 쓸 수 있다.
  // 아이템 소모는 글이 실제로 등록(committed)된 경우에만 진행한다.
  const canPostQnaItemTab = (currentUser?.qnaItemPermits?.length || 0) > 0;

  const handleCreatePost = async (post) => {
    if (post.category === '아이템' && !canPostQnaItemTab) {
      alert('볼 변경 티켓 또는 미용실 이용권을 사용해야 "아이템" 탭에 글을 쓸 수 있습니다.');
      return;
    }
    const success = await saveQnaPosts(posts => [post, ...posts]);
    if (success && post.category === '아이템') {
      consumeQnaItemPermit();
    }
  };

  const handleDeletePost = (postId) => {
    saveQnaPosts(posts => posts.filter(p => p.id !== postId));
  };

  const handleCreateComment = (postId, comment) => {
    saveQnaPosts(posts => posts.map(p =>
      p.id === postId
        ? { ...p, comments: [...(p.comments || []), comment] }
        : p
    ));
  };

  const handleEditPost = (postId, updates) => {
    saveQnaPosts(posts => posts.map(p => p.id === postId ? { ...p, ...updates } : p));
  };

  const handleDeleteComment = (postId, commentId) => {
    saveQnaPosts(posts => posts.map(p =>
      p.id === postId
        ? { ...p, comments: (p.comments || []).filter(c => c.id !== commentId) }
        : p
    ));
  };

  const pokemonValue = {
    caughtPokemon,
    releasePokemon,
    updatePokemonNickname,
    updatePokemonMemo,
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

if (!currentUser || !currentUser.id) {
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

    return (
      <DesktopLoginGate
        onLogin={handleLogin}
        banner={(
          <>
            {isLoadingOverlayVisible && <LoadingOverlay overlay fading={isLoadingOverlayFading} />}
            {MaintenanceCountdownBanner}
          </>
        )}
      />
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
          setCurrentTab={(tab) => {
            if (!isAdmin && (systemSettings?.hiddenMenus || []).includes(tab)) {
              setAccessModalImg(getRandomAccessModalImg());
              setShowAccessModal(true);
            } else {
              setCurrentTab(tab);
            }
          }}
          trainer={trainer}
          isAdmin={isAdmin}
          soundEnabled={soundEnabled}
          toggleSound={() => setSoundEnabled(!soundEnabled)}
          onLogout={handleLogout}
          onClaimAttendance={handleClaimAttendance}
          attendanceClaimed={attendanceClaimed || attendanceLocked}
          isClaimingAttendance={isClaimingAttendance}
          hideBottomNav={!!encounterPokemon}
        >
          {currentTab === 'home' && (
            <MobileHomeDashboard
              trainer={trainer}
              members={displayMembers}
              scheduleEvents={scheduleEvents}
              onCookingClick={() => setCurrentTab('cooking')}
              onPokemonClick={() => setCurrentTab('pokemon')}
            />
          )}

          {currentTab === 'map' && (
            <MobileMapView
              regions={regions}
              onRegionClick={handleRegionClick}
              gamePokedex={gamePokedex}
              allPokemonMaster={allPokemonMaster}
              pokedexData={effectivePokedexData}
              caughtPokemon={caughtPokemon.filter(p => p !== null)}
            />
          )}
          
          {currentTab === 'pokedex' && (
            <PokedexView
              pokedex={gamePokedex}
              allPokedex={allPokemonMaster}
              caughtPokemon={caughtPokemon.filter(p => p !== null)}
              pokedexData={effectivePokedexData}
              regions={regions}
              currentUser={currentUser}
              onUpdateMemo={updatePokedexMemo}
              onUpdatePokedexRegions={updatePokedexRegions}
              onResetPokedex={resetPokedex}
              pokedexActiveTowns={systemSettings?.pokedexActiveTowns || []}
              isMobile
            />
          )}

          {currentTab === 'members' && (
            <div key="members">
              <MobileMembersView
                members={displayMembers}
                titles={titles}
                initialMemberId={initialMemberId}
                onClearInitialMember={() => setInitialMemberId(null)}
              />
            </div>
          )}
          {currentTab === 'npcs' && <div key="npcs"><NpcView members={displayMembers} isLoading={isMembersLoading} isAdmin={isAdmin} npcOnly /></div>}
          {currentTab === 'pokemon' && <PokemonView />}
          {currentTab === 'items' && <ItemsView />}
          {currentTab === 'shop' && <ShopView />}
          {currentTab === 'cooking' && <CookingView />}
          {currentTab === 'camping' && (
            <CampingView
              trainer={currentUser}
              campingSessions={camping.campingSessions}
            />
          )}
					  
          {currentTab === 'profile' && (
            <div style={{ padding: '16px 16px 80px' }}>
              <MobileTrainerCard trainer={trainer} titles={titles || []} />
            </div>
          )}
          
          {currentTab === 'qna' && (
            <QnABoard
              posts={qnaPosts}
              currentUser={currentUser}
              onCreatePost={handleCreatePost}
              onDeletePost={handleDeletePost}
              onEditPost={handleEditPost}
              onCreateComment={handleCreateComment}
              onDeleteComment={handleDeleteComment}
              canPostItem={canPostQnaItemTab}
            />
          )}
          
          {currentTab === 'admin' && isAdmin && <AdminView />}
          {currentTab === 'battle' && isAdmin && <BattleView />}
        </MobileLayout>
      ) : (
        <div className={`main-shell app-shell-enter ${currentTab === 'home' ? 'main-shell--home' : ''} ${!isMobile && currentTab === 'shop' ? 'main-shell--shop' : ''}`}>
          <SakuraEffect />
          <Header currentTab={currentTab} setCurrentTab={setCurrentTab} />

          <div className={`main-layout ${currentTab === 'home' ? 'main-layout--home' : ''} ${!isMobile && currentTab === 'shop' ? 'main-layout--shop' : ''} ${isTopMenuPage ? 'main-layout--world' : ''}`}>
          <Sidebar
            currentTab={currentTab}
            setCurrentTab={(tab) => {
              if (!isAdmin && (systemSettings?.hiddenMenus || []).includes(tab)) {
                setAccessModalImg(getRandomAccessModalImg());
                setShowAccessModal(true);
              } else {
                setCurrentTab(tab);
              }
            }}
            isAdmin={isAdmin}
            hiddenMenus={[]}
            trainer={trainer}
            onLogout={handleLogout}
            soundEnabled={soundEnabled}
            onToggleSound={() => setSoundEnabled(!soundEnabled)}
          />

      {hasContentSurface && <span className={`content-stage__surface${currentTab === 'qna' ? ' content-stage__surface--light' : ''}`} aria-hidden="true" />}

		<main className={`content-stage ${currentTab === 'home' ? 'content-stage--home' : 'content-stage--view'} ${!isMobile && currentTab === 'shop' ? 'content-stage--shop' : ''} ${isFeaturePage ? 'content-stage--feature' : ''} ${isTopMenuPage ? 'content-stage--world' : ''}`}>
      {currentTab === 'home' && (
        <div key="home" className="tab-view-enter-home">
        <HomeDashboard
          trainer={trainer}
          onLogout={handleLogout}
          onPokemonClick={() => setCurrentTab('pokemon')}
          onItemsClick={() => setCurrentTab('items')}
          onClaimAttendance={handleClaimAttendance}
          attendanceClaimed={attendanceClaimed || attendanceLocked}
          isClaimingAttendance={isClaimingAttendance}
          members={displayMembers}
          scheduleEvents={scheduleEvents}
          titles={titles || []}
          onUpdateTitle={updateSelfTitle}
          onProfileClick={trainer?.id ? () => {
            const url = new URL(window.location.href);
            url.searchParams.set('tab', 'members');
            url.searchParams.set('member', trainer.id);
            window.history.pushState({ tab: 'members', member: trainer.id }, '', url.toString());
            setInitialMemberId(trainer.id);
            setCurrentTab('members');
          } : undefined}
        />
        </div>
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
            members={displayMembers}
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
			  pokedexData={effectivePokedexData}
			  caughtPokemon={caughtPokemon.filter(p => p !== null)}
			  dailyWalks={trainer?.dailyWalks ?? 0}
			  maxDailyWalks={trainer?.maxDailyWalks ?? 0}
			/>
		  )}
		  
		  {currentTab === 'pokedex' && (
			<PokedexView 
			  pokedex={gamePokedex}
			  allPokedex={allPokemonMaster} 
			  caughtPokemon={caughtPokemon.filter(p => p !== null)}
			  pokedexData={effectivePokedexData}
			  regions={regions}
			  currentUser={currentUser}
			  onUpdateMemo={updatePokedexMemo}
			  onUpdatePokedexRegions={updatePokedexRegions}
			  onResetPokedex={resetPokedex}
				  pokedexActiveTowns={systemSettings?.pokedexActiveTowns || []}
			/>
		  )}
		  
		  {currentTab === 'members' && <div key="members"><MembersView members={displayMembers} isLoading={isMembersLoading} currentUserId={currentUser?.id} isAdmin={isAdmin} titles={titles} onSwitchTab={setCurrentTab} initialMemberId={initialMemberId} onClearInitialMember={() => setInitialMemberId(null)} /></div>}
		  {currentTab === 'npcs' && <div key="npcs"><NpcView members={displayMembers} isLoading={isMembersLoading} isAdmin={isAdmin} npcOnly onSwitchTab={setCurrentTab} /></div>}
		  {currentTab === 'pokemon' && <PokemonView />}
		  {currentTab === 'items' && <ItemsView />}
		  {currentTab === 'shop' && <ShopView />}
		  {currentTab === 'cooking' && <CookingView />}
		  {currentTab === 'camping' && (
			<CampingView
			  trainer={currentUser}
			  campingSessions={camping.campingSessions}
			/>
		  )}
		  
		  {currentTab === 'profile' && (
			<ProfileView
			  trainer={trainer}
			  caughtPokemon={caughtPokemon}
			  items={items}
			  titles={titles || []}
			/>
		  )}
		  
		  {currentTab === 'qna' && (
			<QnABoard
			  posts={qnaPosts}
			  currentUser={currentUser}
			  onCreatePost={handleCreatePost}
			  onDeletePost={handleDeletePost}
			  onEditPost={handleEditPost}
			  onCreateComment={handleCreateComment}
			  onDeleteComment={handleDeleteComment}
			  canPostItem={canPostQnaItemTab}
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
          encounterBackground={encounterPokemon.background || null}
        />
      )}

      {firstCatchPokemon && (
        <FirstCatchMemoModal
          pokemon={firstCatchPokemon}
          onSave={saveFirstCatchMemo}
          onSkip={skipFirstCatchMemo}
        />
      )}

      {statSelectPending && (
        <StatSelectModal
          type={statSelectPending.type}
          amount={statSelectPending.amount}
          pokemonName={statSelectPending.pokemon?.nickname || statSelectPending.pokemon?.name}
          currentEffort={statSelectPending.pokemon?.effort || statSelectPending.pokemon?.effortValues}
          onSelect={handleStatSelectComplete}
          onClose={() => handleStatSelectComplete(null)}
        />
      )}

      {moveChoicePending && (
        <MoveChoiceModal
          pokemon={moveChoicePending.pokemon}
          kind={moveChoicePending.kind}
          options={moveChoicePending.options}
          currentMoves={moveChoicePending.pokemon?.moves || []}
          onConfirm={handleMoveChoiceComplete}
          onCancel={() => handleMoveChoiceComplete(null)}
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
