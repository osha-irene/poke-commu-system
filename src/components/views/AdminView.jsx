// src/components/views/AdminView.jsx - 완전 수정 버전
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useGame } from '../../contexts/GameContext';
import { ref as dbRef, get, set, update } from 'firebase/database';
import { database } from '../../firebase';
import { User, ChevronRight, X, Users, Map, BookOpen, ShoppingBag, UtensilsCrossed, Tent, Calendar, Settings, AlertTriangle, Medal, Wrench, Info, Trash2, Zap, Wind, Ban, Bot } from 'lucide-react';
import useMediaQuery from '../../hooks/useMediaQuery';
import RegionEditModal from '../modals/RegionEditModal';
import PokedexAdminPanel from './admin/PokedexAdminPanel';
import ShopAdminPanel from './admin/ShopAdminPanel';
import MemberDetailPanel from './admin/MemberDetailPanel';
import BulkMemberActionsModal from './admin/BulkMemberActionsModal';
import CustomItemCreator, { CustomItemModal } from './admin/CustomItemCreator';
import RegionExplorePanel from './admin/RegionExplorePanel';
import CookingAdminPanel from './admin/CookingAdminPanel';
import LevelRestrictionPanel from './admin/LevelRestrictionPanel';
import CampingAdminPanel from './admin/CampingAdminPanel';
import ScheduleAdminPanel from './admin/ScheduleAdminPanel';
import MapEditorPanel from './admin/MapEditorPanel';
import ContestAdminPanel from './admin/ContestAdminPanel';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { getItemEffectBadges } from '../../utils/itemEffectBadges';

function CustomItemManageModal({ items, onUpdate, onDelete, onClose }) {
  const [editingItem, setEditingItem] = useState(null);
  const [filter, setFilter] = useState('all'); // all | custom | recipe

  const filtered = items.filter(i => {
    if (filter === 'custom') return !i.isRecipe;
    if (filter === 'recipe') return !!i.isRecipe;
    return true;
  });

  const effectTag = (item) => {
    const tags = getItemEffectBadges(item);
    if (item.isRecipe) tags.push({ label: '레시피 아이템', cls: 'bg-amber-50 text-amber-700' });
    return tags;
  };

  return (
    <>
    {createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-xl font-bold text-gray-900">✨ 커스텀 아이템 관리</h2>
            <p className="text-sm text-gray-500 mt-0.5">커스텀 생성 및 레시피 결과 아이템을 수정·삭제합니다</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 p-1 rounded"><X size={20} /></button>
        </div>

        {/* 필터 탭 */}
        <div className="flex gap-2 px-6 pt-3">
          {[['all','전체'], ['custom','커스텀'], ['recipe','레시피']].map(([v, label]) => (
            <button key={v} onClick={() => setFilter(v)}
              className={`px-3 py-1 rounded-full text-sm font-semibold transition ${filter === v ? 'bg-lime-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {label} ({items.filter(i => v === 'all' ? true : v === 'recipe' ? i.isRecipe : !i.isRecipe).length})
            </button>
          ))}
        </div>

        {/* 목록 */}
        <div className="overflow-y-auto flex-1 px-6 py-3 space-y-2">
          {filtered.length === 0 && <p className="text-center text-gray-400 py-8">아이템이 없습니다</p>}
          {filtered.map(item => (
            <div key={item.id} className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 hover:bg-white transition cursor-pointer group"
              onClick={() => setEditingItem(item)}>
              {item.spriteUrl
                ? <img src={item.spriteUrl} alt="" className="custom-item-image-32 shrink-0" style={{imageRendering:'pixelated'}} />
                : <div className="w-8 h-8 rounded bg-gray-200 shrink-0" />}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm text-gray-800">{item.name}</span>
                  {effectTag(item).map((t, i) => (
                    <span key={i} title={t.title || t.label} className={`item-effect-pill item-effect-pill--${t.tone || 'default'}`}>{t.label}</span>
                  ))}
                </div>
                {item.effect && <p className="text-xs text-gray-400 truncate mt-0.5">{item.effect}</p>}
              </div>
              <div className="flex gap-1 shrink-0">
                <button className="text-blue-500 text-xs px-2 py-1 rounded hover:bg-blue-50"
                  onClick={e => { e.stopPropagation(); setEditingItem(item); }}>수정</button>
                <button className="text-red-500 text-xs px-2 py-1 rounded hover:bg-red-50"
                  onClick={async e => {
                    e.stopPropagation();
                    const confirmMsg = item.isRecipe
                      ? `"${item.name}"은(는) 레시피 결과 아이템입니다. 삭제하면 연결된 레시피 자체가 삭제됩니다. 계속하시겠습니까?`
                      : `"${item.name}" 아이템을 삭제하시겠습니까?`;
                    if (!window.confirm(confirmMsg)) return;
                    const ok = await onDelete(item.id);
                    if (ok) alert(`"${item.name}" 삭제 완료.`);
                  }}>삭제</button>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>,
    document.body
    )}
    {editingItem && createPortal(
      <CustomItemModal
        editItem={editingItem}
        onSubmit={async (payload) => {
          const { id, isCustom, isRecipe, createdBy, createdAt, recipeId, __customItemSource, ...fields } = payload;
          const ok = await onUpdate(editingItem.id, fields);
          if (ok) alert(`"${fields.name}" 수정 완료.`);
          return ok;
        }}
        onClose={() => setEditingItem(null)}
      />,
      document.body
    )}
    </>
  );
}

function TitleManagerPanel({ titles = [] }) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ minWidth: 0 }}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm font-semibold px-3 py-1.5 rounded-lg border border-indigo-300 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors"
      >
        <span className="flex items-center gap-1.5"><Medal size={14} strokeWidth={2.5} /> 칭호 목록</span>
      </button>
      {open && createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 flex flex-col" style={{ maxHeight: '80vh' }}>
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-bold flex items-center gap-1.5"><Medal size={16} strokeWidth={2.5} /> 칭호 목록</h2>
                <p className="mt-1 text-xs text-gray-500">칭호 정의는 src/data/titles.json에서 관리합니다.</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto mb-4 min-h-0 divide-y divide-gray-100">
              {titles.length === 0 && (
                <p className="text-xs text-gray-400 py-2">등록된 칭호가 없습니다.</p>
              )}
              {titles.map(t => (
                <div key={t.id} className="flex items-center gap-2 py-2">
                  {(t.iconUrl || t.icon) && (
                    <img src={t.iconUrl || t.icon} alt="" className="w-5 h-5 object-contain flex-shrink-0" />
                  )}
                  <span className="flex-1 text-sm font-medium text-gray-800">{t.label}</span>
                  <code className="text-[11px] text-gray-400 bg-gray-50 rounded px-1.5 py-0.5">{t.id}</code>
                </div>
              ))}
            </div>

            <p className="pt-3 border-t border-gray-100 text-xs text-gray-500">
              멤버별 보유/장착 상태만 Firebase에 저장됩니다.
            </p>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

export default function AdminView() {
  const gameContext = useGame();

  const {
    currentUser: trainer,
    members = {},
    regions = [],
    setRegions,
    allPokemonMaster = [],
    allItems = [],
    gamePokedex = [],
    shopData = {},
    recipes = [],
    addDailyItem,
    removeDailyItem,
    toggleItemPersistent,
    maintenanceMode = false,
    maintenanceScheduledAt = null,
    scheduleMaintenanceMode,
    cancelScheduledMaintenance,
    systemSettings = { maxNonPartnerPokemon: 18, escapeMode: 'none' },
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
    bulkAdjustPartnerLevel,
    bulkIncreaseFriendship,
    bulkGiveItem,
    bulkGiveMoney,
    bulkAddWalks,
    bulkGrantTitle,
    resetGameData,
    giveItemToMember,
    givePokemonToMember,
    createCustomItem,
    updateCustomItem,
    deleteCustomItem,
    updateMemberMoney,
    editMemberPokemon,
    deleteMemberPokemon,
    updateShopData,
    setMaintenanceMode,
    updateSystemSettings,
    updateRegionLootConfig,
    createRecipe,
    updateRecipe,
    deleteRecipe,
    updateIngredientStats,
    updateGamePokedex,
    resetPokedex,
    toggleMemberHidden,
	camping,
    titles = [],
  } = gameContext;

  const isMobile = useMediaQuery('(max-width: 768px)');
  const [adminTab, setAdminTab] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('admin-tab') || 'members';
  });
  const [showCustomItemManage, setShowCustomItemManage] = useState(false);
  const [maxWalks, setMaxWalks] = useState(trainer?.maxDailyWalks || 5);
  const [maxNonPartnerPokemon, setMaxNonPartnerPokemon] = useState(systemSettings.maxNonPartnerPokemon || 18);
  const [conditionMax, setConditionMax] = useState(systemSettings.conditionMax || 100);
  const [editingRegion, setEditingRegion] = useState(null);
  const [selectedMemberId, setSelectedMemberId] = useState(null);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [newMemberId, setNewMemberId] = useState('');
  const [newMemberPassword, setNewMemberPassword] = useState('');
  const [newMemberName, setNewMemberName] = useState('');
  const [escapeMode, setEscapeMode] = useState(systemSettings.escapeMode || 'none');
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
    setMaxNonPartnerPokemon(systemSettings.maxNonPartnerPokemon || 18);
  }, [systemSettings.maxNonPartnerPokemon]);

  useEffect(() => {
    setConditionMax(systemSettings.conditionMax || 100);
  }, [systemSettings.conditionMax]);

  useEffect(() => {
    setEscapeMode(systemSettings.escapeMode || 'none');
  }, [systemSettings.escapeMode]);

  const handleAddMember = async () => {
    if (!newMemberId || !newMemberPassword || !newMemberName) {
      alert('모든 정보를 입력해주세요.');
      return;
    }

    const success = await addMember?.(newMemberId, newMemberPassword, newMemberName);
    if (success) {
      alert(`${newMemberName}님이 추가되었습니다!`);
      setNewMemberId('');
      setNewMemberPassword('');
      setNewMemberName('');
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
        await update(memberRef, { maxDailyWalks: cleanData.maxDailyWalks });

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

  const handleSavePokemonLimit = async () => {
    const nextLimit = Number(maxNonPartnerPokemon);
    if (!Number.isFinite(nextLimit) || nextLimit < 1) {
      alert('1마리 이상으로 설정해주세요.');
      return;
    }

    try {
      await updateSystemSettings?.({
        ...systemSettings,
        maxNonPartnerPokemon: Math.floor(nextLimit)
      });
      alert(`회원당 포켓몬 보유 제한이 ${Math.floor(nextLimit)}마리로 저장되었습니다.`);
    } catch (error) {
      console.error('포켓몬 보유 제한 저장 실패:', error);
      alert('포켓몬 보유 제한 저장 중 오류가 발생했습니다.');
    }
  };

  const handleToggleMaintenance = () => {
    if (maintenanceMode) {
      setMaintenanceMode?.(false);
      cancelScheduledMaintenance?.();
    } else if (maintenanceScheduledAt) {
      cancelScheduledMaintenance?.();
    } else {
      if (window.confirm('5분 후 점검 모드를 시작하시겠습니까?\n\n모든 유저에게 카운트다운이 표시됩니다.')) {
        scheduleMaintenanceMode?.();
      }
    }
  };

  const handleEmergencyMaintenance = () => {
    if (window.confirm('긴급 점검을 시작하시겠습니까?\n\n카운트다운 없이 즉시 모든 유저의 접근이 차단됩니다.')) {
      cancelScheduledMaintenance?.();
      setMaintenanceMode?.(true);
    }
  };

  const handleDeleteRecipe = (recipeId) => {
    deleteRecipe?.(recipeId);
  };

  // 커스텀 아이템 관리 모달에서는 레시피 결과 아이템도 함께 보여준다.
  // 레시피 결과 아이템은 recipes 쪽 데이터에서 파생되므로(customItems에 별도 저장 X),
  // 수정/삭제 요청은 customItems가 아니라 연결된 레시피 쪽으로 라우팅한다.
  const handleUpdateManagedItem = async (itemId, fields) => {
    const target = allItems.find(i => i.id === itemId);
    if (target?.isRecipe && target.recipeId) {
      const recipe = recipes.find(r => r.id === target.recipeId);
      if (!recipe) return false;
      return updateRecipe?.(target.recipeId, { result: { ...recipe.result, ...fields } });
    }
    return updateCustomItem(itemId, fields);
  };

  const handleDeleteManagedItem = async (itemId) => {
    const target = allItems.find(i => i.id === itemId);
    if (target?.isRecipe && target.recipeId) {
      return deleteRecipe?.(target.recipeId);
    }
    return deleteCustomItem(itemId);
  };

  const handleEscapeModeChange = async (mode) => {
    const nextMode = ['none', 'instant', 'speed'].includes(mode) ? mode : 'none';
    setEscapeMode(nextMode);
    try {
      await updateSystemSettings?.({
        ...systemSettings,
        escapeMode: nextMode
      });
      const modeText = nextMode === 'none' ? '도망 안함' : nextMode === 'instant' ? '즉시 도망' : '스피드 기반';
      alert(`도망 모드가 "${modeText}"으로 변경되었습니다.`);
    } catch (error) {
      console.error('도망 모드 저장 실패:', error);
      alert('도망 모드 저장 중 오류가 발생했습니다.');
    }
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

  const ADMIN_TABS = [
    { id: 'members',  label: '멤버',  icon: Users },
    { id: 'npc',      label: 'NPC',   icon: Bot },
    { id: 'regions',  label: '지역',  icon: Map },
    { id: 'map-editor', label: '지도 편집', icon: Map },
    { id: 'pokedex',  label: '도감',  icon: BookOpen },
    { id: 'shop',     label: '상점',  icon: ShoppingBag },
    { id: 'cooking',  label: '요리',  icon: UtensilsCrossed },
    { id: 'camping',  label: '캠핑',  icon: Tent },
    { id: 'contest',  label: '콘테스트', icon: Medal },
    { id: 'schedule', label: '일정',  icon: Calendar },
    { id: 'settings', label: '시스템', icon: Settings },
    ...(trainer?.isSuperAdmin ? [{ id: 'danger', label: '위험', icon: AlertTriangle, variant: 'danger' }] : []),
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-4" style={isMobile ? { padding: '72px 10px 80px' } : {}}>
      {/* 서브메뉴 탭 */}
      {isMobile ? (
        <div style={{
          display: 'flex', gap: 6, overflowX: 'auto', flexWrap: 'nowrap',
          padding: '6px 2px', scrollbarWidth: 'none',
        }}>
          {ADMIN_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setAdminTab(tab.id)}
              style={{
                flexShrink: 0,
                padding: '7px 13px',
                borderRadius: 20,
                border: 'none',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                background: adminTab === tab.id
                  ? (tab.variant === 'danger' ? '#dc2626' : '#4a9a08')
                  : 'rgba(255,255,255,0.85)',
                color: adminTab === tab.id
                  ? '#fff'
                  : (tab.variant === 'danger' ? '#dc2626' : '#3a5a20'),
                boxShadow: adminTab === tab.id ? '0 2px 8px rgba(0,0,0,0.15)' : 'none',
                backdropFilter: 'blur(8px)',
              }}
            >
              <span className="flex items-center gap-1">
                {tab.icon && <tab.icon size={13} strokeWidth={2.5} />}
                {tab.label}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <Card className="p-2 flex gap-2 overflow-x-auto flex-nowrap admin-tab-bar">
          {ADMIN_TABS.map(tab => (
            <TabButton
              key={tab.id}
              active={adminTab === tab.id}
              onClick={() => setAdminTab(tab.id)}
              variant={tab.variant}
            >
              <span className="flex items-center gap-1.5">
                {tab.icon && <tab.icon size={14} strokeWidth={2.5} />}
                {tab.label}
              </span>
            </TabButton>
          ))}
        </Card>
      )}

      {/* 멤버 관리 탭 */}
      {adminTab === 'members' && (
        <Card className="p-6">
          <div className="flex items-start justify-between mb-4">
            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <User size={24} /> 멤버 관리
            </h3>
            {/* 칭호 관리 패널 - 우상단 */}
            <TitleManagerPanel titles={titles} />
          </div>

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
                멤버 목록 ({Object.values(members).filter(m => !m.isNPC).length}명)
              </h4>
              <div className="flex gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setShowBulkActions(true)}
                >
                  일괄 작업
                </Button>
                <Button
                  variant="warning"
                  size="sm"
                  onClick={handleBulkResetWalks}
                >
                  전체 탐험 횟수 리셋
                </Button>
              </div>
            </div>

            {Object.values(members).filter(m => !m.isNPC).map((member) => (
              <div
                key={member.id}
                className={`flex items-center justify-between p-4 rounded-lg border transition-all ${member.hidden ? 'bg-gray-100 border-gray-300 opacity-60' : 'bg-gray-50 border-gray-200'}`}
              >
                <button
                  onClick={() => setSelectedMemberId(member.id)}
                  className="flex items-center gap-4 flex-1 text-left hover:opacity-80"
                >
                  {member.profileImageThumb || member.profileImage ? (
                    <img
                      src={member.profileImageThumb || member.profileImage}
                      alt={member.name}
                      className="w-12 h-12 rounded-full object-cover object-top flex-shrink-0"
                    />
                  ) : (
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0 ${member.hidden ? 'bg-gray-400' : 'bg-indigo-500'}`}>
                      {member.name?.charAt(0) || '?'}
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-lg">{member.name}</span>
                      <span className="text-sm text-gray-500">({member.id})</span>
                      {member.isSuperAdmin && <Badge variant="danger">슈퍼관리자</Badge>}
                      {member.isAdmin && !member.isSuperAdmin && <Badge variant="primary">관리자</Badge>}
                      {member.hidden && <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">숨김</span>}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      탐험: {member.dailyWalks}/{member.maxDailyWalks}회 | 포켓몬: {member.caughtPokemon?.filter(p => p !== null).length || 0}마리 | 소지금: {member.money?.toLocaleString() || 0}원
                    </div>
                  </div>
                </button>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleMemberHidden?.(member.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${member.hidden ? 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-100'}`}
                  >
                    {member.hidden ? '표시' : '숨김'}
                  </button>
                  <ChevronRight className="text-gray-400" />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* NPC 탭 */}
      {adminTab === 'npc' && (
        <Card className="p-6">
          <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2 mb-4">
            <Bot size={24} /> NPC 관리
          </h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-gray-700">
                NPC 목록 ({Object.values(members).filter(m => m.isNPC).length}명)
              </h4>
            </div>
            {Object.values(members).filter(m => m.isNPC).length === 0 ? (
              <p className="text-gray-400 text-sm py-4 text-center">NPC로 설정된 멤버가 없습니다.</p>
            ) : (
              Object.values(members).filter(m => m.isNPC).map((member) => (
                <div
                  key={member.id}
                  className={`flex items-center justify-between p-4 rounded-lg border transition-all ${member.hidden ? 'bg-gray-100 border-gray-300 opacity-60' : 'bg-purple-50 border-purple-200'}`}
                >
                  <button
                    onClick={() => setSelectedMemberId(member.id)}
                    className="flex items-center gap-4 flex-1 text-left hover:opacity-80"
                  >
                    {member.profileImageThumb || member.profileImage ? (
                      <img
                        src={member.profileImageThumb || member.profileImage}
                        alt={member.name}
                        className="w-12 h-12 rounded-full object-cover object-top flex-shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0 bg-purple-500">
                        {member.name?.charAt(0) || '?'}
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-lg">{member.name}</span>
                        <span className="text-sm text-gray-500">({member.id})</span>
                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-semibold">NPC</span>
                        {member.hidden && <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">숨김</span>}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        포켓몬: {member.caughtPokemon?.filter(p => p !== null).length || 0}마리 | 소지금: {member.money?.toLocaleString() || 0}원
                      </div>
                    </div>
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleMemberHidden?.(member.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${member.hidden ? 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-100'}`}
                    >
                      {member.hidden ? '표시' : '숨김'}
                    </button>
                    <ChevronRight className="text-gray-400" />
                  </div>
                </div>
              ))
            )}
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
          onOpenRegionEdit={(region) => setEditingRegion(region)}
        />
      )}

      {/* 지도 편집 탭 */}
      {adminTab === 'map-editor' && (
        <MapEditorPanel
          regions={regions}
          onUpdateTown={updateTown}
        />
      )}

      {/* 도감 관리 탭 */}
      {adminTab === 'pokedex' && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2"><BookOpen size={20} strokeWidth={2.5} /> 영운 도감 포켓몬 설정</h3>
            <button
              onClick={() => {
                if (window.confirm('도감 기록을 전부 삭제하시겠습니까?\n(조우, 포획, 메모, 지역 정보가 모두 초기화됩니다)')) {
                  resetPokedex?.();
                }
              }}
              className="rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-100 transition-colors"
            >
              <span className="flex items-center gap-1.5"><Trash2 size={14} strokeWidth={2.5} /> 도감 기록 리셋</span>
            </button>
          </div>
          <PokedexAdminPanel
            allPokemonMaster={allPokemonMaster}
            gamePokedex={gamePokedex}
            updateGamePokedex={updateGamePokedex}
            regions={regions}
            systemSettings={systemSettings}
            updateSystemSettings={updateSystemSettings}
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
          onUpdateRecipe={updateRecipe}
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
                <Wrench size={24} strokeWidth={2} className="text-yellow-600 flex-shrink-0" />
                <div>
                  <div className="font-bold text-gray-800">시스템 점검 모드</div>
                  <div className="text-sm text-gray-600">
                    {maintenanceMode
                      ? '점검 중 - 일반 유저 접근 차단됨'
                      : maintenanceScheduledAt
                      ? `점검 예약됨 - ${Math.max(0, Math.ceil((maintenanceScheduledAt - Date.now()) / 60000))}분 후 시작`
                      : '정상 운영 중'}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                {!maintenanceMode && (
                  <Button
                    variant="danger"
                    size="md"
                    onClick={handleEmergencyMaintenance}
                  >
                    긴급 점검
                  </Button>
                )}
                <Button
                  variant={maintenanceMode || maintenanceScheduledAt ? 'success' : 'warning'}
                  size="md"
                  onClick={handleToggleMaintenance}
                >
                  {maintenanceMode ? '점검 종료' : maintenanceScheduledAt ? '점검 예약 취소' : '점검 시작'}
                </Button>
              </div>
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
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-xl font-bold text-gray-800">✨ 커스텀 아이템</h3>
                <p className="text-sm text-gray-600 mt-1">직접 제작한 아이템과 레시피 결과물을 관리합니다</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowCustomItemManage(true)}
                  className="flex items-center gap-1.5 border border-gray-300 bg-white text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-50 font-semibold text-sm transition"
                >
                  관리 ({allItems.filter(i => i.__customItemSource === 'database' || i.__customItemSource === 'recipe').length})
                </button>
                <CustomItemCreator
                  onCreateItem={async (data) => {
                    const ok = await createCustomItem(data);
                    return ok;
                  }}
                />
              </div>
            </div>
          </Card>
          {showCustomItemManage && (
            <CustomItemManageModal
              items={allItems.filter(i => i.__customItemSource === 'database' || i.__customItemSource === 'recipe')}
              onUpdate={handleUpdateManagedItem}
              onDelete={handleDeleteManagedItem}
              onClose={() => setShowCustomItemManage(false)}
            />
          )}

          <Card className="p-6 space-y-6">
            <div>
              <h3 className="text-xl font-bold text-gray-800">시스템 설정</h3>
              <p className="text-sm text-gray-600 mt-1">탐험, 보유 제한, 레벨 제한, 도망 시스템을 한 곳에서 관리합니다.</p>
            </div>

            <section className="rounded-lg border border-lime-200 bg-white/40 p-5">
            <h4 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2"><Settings size={18} strokeWidth={2.5} /> 전체 멤버 탐험 횟수 일괄 설정</h4>
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-blue-800 flex items-center gap-1.5">
                <Info size={14} strokeWidth={2.5} className="flex-shrink-0" /> 모든 회원의 최대 탐험 횟수를 동일하게 설정합니다. 개별 회원은 "멤버 관리"에서 수정할 수 있습니다.
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
            </section>

            <section className="rounded-lg border border-lime-200 bg-white/40 p-5">
            <h4 className="text-lg font-bold text-gray-800 mb-4">포켓몬 보유 제한</h4>
            <div className="bg-lime-50 border-2 border-lime-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-lime-900">
                회원 1명이 보유할 수 있는 포켓몬 수를 설정합니다. 파트너 포켓몬은 이 제한에 포함되지 않고, 엔트리와 박스의 포켓몬을 합산합니다.
              </p>
            </div>
            <div className="flex items-center gap-4">
              <input
                type="number"
                value={maxNonPartnerPokemon}
                onChange={(event) => setMaxNonPartnerPokemon(parseInt(event.target.value, 10) || 0)}
                min="1"
                max="999"
                className="border-2 border-gray-300 rounded-lg px-4 py-3 w-32 text-lg font-semibold focus:border-indigo-500 focus:outline-none"
              />
              <span className="text-gray-600 font-semibold">마리</span>
              <Button
                variant="primary"
                onClick={handleSavePokemonLimit}
              >
                저장
              </Button>
            </div>
            <div className="mt-3 text-sm text-gray-600">
              현재 설정: 파트너 제외 최대 <strong>{systemSettings.maxNonPartnerPokemon || 18}마리</strong>
            </div>
            </section>

            <section className="rounded-lg border border-lime-200 bg-white/40 p-5">
            <h4 className="text-lg font-bold text-gray-800 mb-4">컨디션 제한치</h4>
            <div className="bg-lime-50 border-2 border-lime-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-lime-900">
                아이템으로 올릴 수 있는 컨디션 항목별 상한선입니다. 절대 최대치는 100입니다.
              </p>
            </div>
            <div className="flex items-center gap-4">
              <input
                type="number"
                value={conditionMax}
                onChange={(e) => setConditionMax(parseInt(e.target.value, 10) || 0)}
                min="1"
                max="100"
                className="border-2 border-gray-300 rounded-lg px-4 py-3 w-32 text-lg font-semibold focus:border-indigo-500 focus:outline-none"
              />
              <span className="text-gray-500 font-semibold">/ 100</span>
              <Button
                variant="primary"
                onClick={async () => {
                  const val = Math.min(100, Math.max(1, Math.floor(conditionMax)));
                  await updateSystemSettings?.({ ...systemSettings, conditionMax: val });

                  // 모든 멤버 포켓몬 컨디션 clamp
                  const COND_KEYS = ['elegance', 'beauty', 'cuteness', 'intelligence', 'strength'];
                  const memberEntries = Object.entries(members);
                  let clampedCount = 0;
                  await Promise.all(memberEntries.map(async ([memberId, member]) => {
                    const pokemon = member.caughtPokemon;
                    if (!Array.isArray(pokemon)) return;
                    let changed = false;
                    const updated = pokemon.map(p => {
                      if (!p?.condition) return p;
                      const newCond = { ...p.condition };
                      COND_KEYS.forEach(k => {
                        if (Number(newCond[k] || 0) > val) {
                          newCond[k] = val;
                          changed = true;
                        }
                      });
                      return changed ? { ...p, condition: newCond } : p;
                    });
                    if (changed) {
                      clampedCount++;
                      await set(dbRef(database, `members/${memberId}/caughtPokemon`), updated);
                    }
                  }));

                  alert(`컨디션 제한치가 ${val}로 저장됐습니다.${clampedCount > 0 ? `\n초과 데이터 ${clampedCount}명 포켓몬 정리 완료.` : ''}`);
                }}
              >
                저장
              </Button>
            </div>
            <div className="mt-3 text-sm text-gray-600">
              현재 제한치: <strong>{systemSettings.conditionMax || 100}</strong> / 100
            </div>
            </section>

            <LevelRestrictionPanel embedded />

          {/* 도망 시스템 설정 */}
            <section className="rounded-lg border border-lime-200 bg-white/40 p-5">
            <h4 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2"><Wind size={18} strokeWidth={2.5} /> 포켓몬 도망 시스템</h4>

            <div className="rounded-lg p-5 border border-lime-200 bg-white/40">
              <div className="flex items-start justify-between gap-6">
                <div className="flex-1">
                  <div className="font-bold text-gray-800 mb-2">포획 실패 시 동작</div>
                  <div className="text-sm text-gray-600 leading-relaxed">
                    {escapeMode === 'none' && (
                      <>
                        <p className="font-semibold text-gray-700 mb-1 flex items-center gap-1"><Ban size={14} strokeWidth={2.5} /> 도망 안함 모드 (기본)</p>
                        <p>포획에 실패해도 포켓몬이 계속 남아있어 무한으로 시도할 수 있습니다.</p>
                      </>
                    )}
                    {escapeMode === 'instant' && (
                      <>
                        <p className="font-semibold text-gray-700 mb-1 flex items-center gap-1"><Zap size={14} strokeWidth={2.5} /> 즉시 도망 모드</p>
                        <p>포획에 실패하면 포켓몬이 즉시 도망갑니다.</p>
                      </>
                    )}
                    {escapeMode === 'speed' && (
                      <>
                        <p className="font-semibold text-gray-700 mb-1 flex items-center gap-1"><Wind size={14} strokeWidth={2.5} /> 스피드 기반 모드</p>
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
                      <div className="flex justify-center"><Ban size={15} strokeWidth={2.5} /></div>
                    </button>

                    <button
                      onClick={() => handleEscapeModeChange('instant')}
                      className={`relative z-10 flex-1 py-1.5 rounded-full font-semibold transition-colors text-center ${escapeMode === 'instant' ? 'text-white' : 'text-gray-600 hover:text-gray-800'
                        }`}
                    >
                      <div className="flex justify-center"><Zap size={15} strokeWidth={2.5} /></div>
                    </button>

                    <button
                      onClick={() => handleEscapeModeChange('speed')}
                      className={`relative z-10 flex-1 py-1.5 rounded-full font-semibold transition-colors text-center ${escapeMode === 'speed' ? 'text-white' : 'text-gray-600 hover:text-gray-800'
                        }`}
                    >
                      <div className="flex justify-center"><Wind size={15} strokeWidth={2.5} /></div>
                    </button>
                  </div>
                </div>
              </div>
            </div>
            </section>

            {/* 메뉴 접근 관리 */}
            <section className="rounded-lg border border-lime-200 bg-white/40 p-5">
              <h4 className="text-lg font-bold text-gray-800 mb-1 flex items-center gap-2">
                <Settings size={18} strokeWidth={2.5} /> 메뉴 접근 관리
              </h4>
              <p className="text-sm text-gray-500 mb-4">일반 멤버에게 표시할 메뉴를 설정합니다. 비활성화하면 관리자에게만 보입니다.</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'pokedex', label: '도감' },
                  { id: 'map', label: '지도/포켓몬' },
                  { id: 'camping', label: '캠핑' },
                  { id: 'cooking', label: '요리' },
                  { id: 'shop', label: '상점' },
                  { id: 'pokemon', label: '엔트리' },
                  { id: 'items', label: '가방' },
                  { id: 'qna', label: 'Q&A' },
                ].map(({ id, label }) => {
                  const hidden = systemSettings?.hiddenMenus?.includes(id);
                  return (
                    <button
                      key={id}
                      onClick={async () => {
                        const current = systemSettings?.hiddenMenus || [];
                        const next = hidden
                          ? current.filter(m => m !== id)
                          : [...current, id];
                        await updateSystemSettings?.({ ...systemSettings, hiddenMenus: next });
                      }}
                      className={`flex items-center justify-between px-4 py-2.5 rounded-lg border-2 font-semibold text-sm transition-all ${
                        hidden
                          ? 'border-gray-300 bg-gray-100 text-gray-400'
                          : 'border-lime-300 bg-lime-50 text-lime-800'
                      }`}
                    >
                      <span>{label}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${hidden ? 'bg-gray-200 text-gray-500' : 'bg-lime-200 text-lime-700'}`}>
                        {hidden ? '숨김' : '표시'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          </Card>
        </>
      )}

		{adminTab === 'camping' && (
		  <CampingAdminPanel
			campingSessions={camping?.campingSessions || []}
			systemSettings={systemSettings}
			onSaveSettings={updateSystemSettings}
			onProgressSession={camping.progressSession}
			onCompleteCooking={camping.completeCooking}
			onApplyResults={camping.applyResultsToMember}
			onDeleteSession={camping.deleteSession}
			allItems={allItems}
		  />
		)}

      {adminTab === 'contest' && <ContestAdminPanel />}

      {adminTab === 'schedule' && <ScheduleAdminPanel />}

      {/* 위험 구역 탭 */}
      {adminTab === 'danger' && trainer?.isSuperAdmin && (
        <Card className="p-6 bg-red-50 border-red-200">
          <h3 className="text-xl font-bold text-red-800 mb-4 flex items-center gap-2"><AlertTriangle size={20} strokeWidth={2.5} /> 위험 구역</h3>
          <p className="text-red-600 mb-4">
            모든 게임 데이터를 초기화합니다. 이 작업은 되돌릴 수 없습니다!
          </p>
          <Button
            variant="danger"
            size="lg"
            onClick={() => {
              if (window.confirm('정말로 모든 데이터를 초기화하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다!')) {
                if (window.confirm('마지막 확인입니다. 정말 초기화하시겠습니까?')) {
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
          onSave={(id, ids, rates, encounterRate, minLevel, maxLevel, background) => {
            updateRegionPokemon?.(id, ids, rates, encounterRate, minLevel, maxLevel, background);
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
          setMembers={setMembers}
          currentUser={trainer}
          updateCurrentUser={updateCurrentUser}
        />
      )}

      <BulkMemberActionsModal
        show={showBulkActions}
        onClose={() => setShowBulkActions(false)}
        members={members}
        allItems={allItems}
        titles={titles}
        onBulkAdjustPartnerLevel={bulkAdjustPartnerLevel}
        onBulkIncreaseFriendship={bulkIncreaseFriendship}
        onBulkGiveItem={bulkGiveItem}
        onBulkGiveMoney={bulkGiveMoney}
        onBulkAddWalks={bulkAddWalks}
        onBulkGrantTitle={bulkGrantTitle}
      />
    </div>
  );
}
