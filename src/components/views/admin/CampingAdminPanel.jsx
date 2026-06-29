import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle, Gift, HelpCircle, Plus, Tent, Trash2, Users, X } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import ItemSelectorModal from '../../modals/ItemSelectorModal';
import useMediaQuery from '../../../hooks/useMediaQuery';

const DEFAULT_STAGES = [
  { stage: 1, successRate: 100, friendshipMin: 10, friendshipMax: 10, expMin: 50,  expMax: 50,  message: '캠핑을 시작했어요. [만족] 또는 [계속]을 선택해 주세요.' },
  { stage: 2, successRate: 80,  friendshipMin: 20, friendshipMax: 20, expMin: 100, expMax: 100, message: '캠핑이 조금 더 깊어졌어요. [만족] 또는 [계속]을 선택해 주세요.' },
  { stage: 3, successRate: 60,  friendshipMin: 30, friendshipMax: 30, expMin: 150, expMax: 150, message: '포켓몬들이 꽤 즐거워 보여요. [만족] 또는 [계속]을 선택해 주세요.' },
  { stage: 4, successRate: 40,  friendshipMin: 40, friendshipMax: 40, expMin: 200, expMax: 200, message: '캠핑 분위기가 무르익었어요. [만족] 또는 [계속]을 선택해 주세요.' },
  { stage: 5, successRate: 20,  friendshipMin: 50, friendshipMax: 50, expMin: 300, expMax: 300, message: '최고 단계까지 왔어요. 캠핑을 마무리합니다.' },
];

const DEFAULT_SETTINGS = {
  minCampingCount: 1,
  maxCampingCount: 5,
  duoSuccessBonus: 15,
  eggChance: 5,
  minFriendshipForBonus: 160,
  bonusItems: [
    { itemId: 50, name: '이상한사탕', chance: 15 },
    { itemId: 92, name: '금구슬',    chance: 20 },
  ],
  failRewards: [],
  failFriendshipMin: 0,
  failFriendshipMax: 0,
  stages: DEFAULT_STAGES,
};

const CAMPING_DISH_CHOICES = [
  { type: 'spicy', label: '고추장' },
  { type: 'cream', label: '크림' },
  { type: 'soy', label: '궁중' },
];

const CAMPING_DISH_STAGE_SUFFIXES = [
  { stage: 1, label: '1단계', suffix: 'wobbuffet' },
  { stage: 2, label: '2단계', suffix: 'milcery' },
  { stage: 3, label: '3단계', suffix: 'wailord' },
  { stage: 4, label: '4단계', suffixByType: { spicy: 'charizard', cream: 'blastoise', soy: 'venusaur' } },
  { stage: 5, label: '5단계', suffix: 'yyn' },
];

const normalizePercent = (value, fallback) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return numeric <= 1 ? Math.round(numeric * 100) : numeric;
};

const buildDraft = (settings = {}) => ({
  ...DEFAULT_SETTINGS,
  ...settings,
  duoSuccessBonus: normalizePercent(settings.duoSuccessBonus, DEFAULT_SETTINGS.duoSuccessBonus),
  eggChance: normalizePercent(
    settings.eggChance ?? settings.mastodonTaggedEggChance ?? settings.eggChanceWithFriendship ?? settings.eggChanceBase,
    DEFAULT_SETTINGS.eggChance
  ),
  bonusItems: (Array.isArray(settings.bonusItems) ? settings.bonusItems : DEFAULT_SETTINGS.bonusItems).map(b => ({
    ...b,
    // 기존 weight 필드가 있으면 chance로 마이그레이션
    chance: b.chance ?? b.weight ?? 10,
  })),
  failRewards: Array.isArray(settings.failRewards) ? settings.failRewards : [],
  failFriendshipMin: Number(settings.failFriendshipMin ?? 0),
  failFriendshipMax: Number(settings.failFriendshipMax ?? 0),
  failExpMin: Number(settings.failExpMin ?? 0),
  failExpMax: Number(settings.failExpMax ?? 0),
  stages: DEFAULT_STAGES.map((defaultStage, index) => {
    const saved = settings.stages?.[index] || settings.stageRewards?.[index] || settings.cookingStages?.[index] || {};
    // 기존 단일값 → 범위로 마이그레이션
    const fMin = saved.friendshipMin ?? saved.friendshipBonus ?? defaultStage.friendshipMin;
    const fMax = saved.friendshipMax ?? saved.friendshipBonus ?? defaultStage.friendshipMax;
    const eMin = saved.expMin ?? saved.expBonus ?? defaultStage.expMin;
    const eMax = saved.expMax ?? saved.expBonus ?? defaultStage.expMax;
    return {
      ...defaultStage,
      ...saved,
      successRate: normalizePercent(saved.successRate ?? defaultStage.successRate, defaultStage.successRate),
      friendshipMin: Number(fMin),
      friendshipMax: Number(fMax),
      expMin: Number(eMin),
      expMax: Number(eMax),
      bonusItems: Array.isArray(saved.bonusItems) ? saved.bonusItems : [],
      minPick: Number(saved.minPick ?? 1),
      maxPick: Number(saved.maxPick ?? 1),
    };
  }),
});

function InfoLabel({ children, tooltip }) {
  return (
    <label className="flex items-center gap-1 text-base font-semibold text-gray-700">
      {children}
      {tooltip && (
        <span className="relative group">
          <HelpCircle size={15} className="text-gray-400" />
          <span className="pointer-events-none absolute left-1/2 top-5 z-30 hidden w-64 -translate-x-1/2 rounded bg-gray-900 px-3 py-2 text-sm font-normal leading-relaxed text-white shadow-lg group-hover:block">
            {tooltip}
          </span>
        </span>
      )}
    </label>
  );
}

function NumberInput({ value, onChange, min = 0 }) {
  return (
    <input
      type="number"
      min={min}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="mt-1 w-full rounded border border-lime-300 bg-white px-3 py-2 text-base focus:border-lime-500 focus:outline-none focus:ring-2 focus:ring-lime-200"
    />
  );
}

function BonusItemChancePanel({ bonusItems, onUpdate, onOpenPicker, label, hint, compact = false }) {
  const updateChance = (itemId, chance) =>
    onUpdate(bonusItems.map(b => String(b.itemId) === String(itemId) ? { ...b, chance: Math.min(100, Math.max(0, Number(chance) || 0)) } : b));
  const removeItem = (itemId) =>
    onUpdate(bonusItems.filter(b => String(b.itemId) !== String(itemId)));

  return (
    <div>
      <div className="flex items-center gap-3 mb-2">
        <div className="flex-1">
          {label && <span className={`font-semibold text-gray-700 ${compact ? 'text-sm' : 'text-base'}`}>{label}</span>}
          {hint && <span className="ml-2 text-sm text-gray-400">{hint}</span>}
        </div>
        <Button variant="ghost" size="sm" onClick={onOpenPicker}>
          <Plus size={13} /> 추가
        </Button>
      </div>
      {bonusItems.length === 0 ? (
        <p className={`text-gray-400 ${compact ? 'text-sm' : 'text-base'}`}>없음</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {bonusItems.map(b => (
            <div key={b.itemId} className="flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 pl-2 pr-1 py-1">
              {(b.imageUrl || b.spriteUrl) && <img src={b.imageUrl || b.spriteUrl} alt={b.name} className="w-6 h-6 object-contain shrink-0" />}
              <span className="text-sm font-medium text-amber-900">{b.name}</span>
              <input
                type="number" min={0} max={100} value={b.chance ?? 10}
                onChange={e => updateChance(b.itemId, e.target.value)}
                className="w-14 rounded border border-amber-200 bg-white px-1 py-0.5 text-sm text-center mx-1"
                title="획득 확률 (%)"
              />
              <span className="text-sm text-amber-600 mr-1">%</span>
              <button onClick={() => removeItem(b.itemId)} className="text-amber-400 hover:text-red-500"><X size={12} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FailRewardPanel({ failRewards, onUpdate, onOpenPicker, friendshipMin, friendshipMax, onFriendshipMinChange, onFriendshipMaxChange, expMin, expMax, onExpMinChange, onExpMaxChange }) {
  const updateCount = (itemId, count) =>
    onUpdate(failRewards.map(r => String(r.itemId) === String(itemId) ? { ...r, count: Math.max(1, Number(count) || 1) } : r));
  const removeItem = (itemId) =>
    onUpdate(failRewards.filter(r => String(r.itemId) !== String(itemId)));

  const rangeInputCls = "w-16 rounded border border-red-200 bg-white px-2 py-1 text-sm text-center";
  const rangeLabelCls = "text-sm text-gray-600 w-24 shrink-0";

  return (
    <div className="mb-5 rounded border border-red-100 bg-red-50/30 p-3">
      <div className="font-semibold text-red-800 text-base mb-3">실패 보상</div>

      {/* 실패 친밀도 + 경험치 범위 */}
      <div className="flex flex-wrap gap-x-6 gap-y-2 mb-3">
        <div className="flex items-center gap-2">
          <span className={rangeLabelCls}>친밀도 범위</span>
          <input type="number" min={0} value={friendshipMin} onChange={e => onFriendshipMinChange(e.target.value)} className={rangeInputCls} placeholder="min" />
          <span className="text-sm text-gray-400">~</span>
          <input type="number" min={0} value={friendshipMax} onChange={e => onFriendshipMaxChange(e.target.value)} className={rangeInputCls} placeholder="max" />
          <span className="text-sm text-gray-400">(0이면 없음)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={rangeLabelCls}>경험치 범위</span>
          <input type="number" min={0} value={expMin} onChange={e => onExpMinChange(e.target.value)} className={rangeInputCls} placeholder="min" />
          <span className="text-sm text-gray-400">~</span>
          <input type="number" min={0} value={expMax} onChange={e => onExpMaxChange(e.target.value)} className={rangeInputCls} placeholder="max" />
          <span className="text-sm text-gray-400">(0이면 없음)</span>
        </div>
      </div>

      {/* 실패 아이템 */}
      <div className="flex items-center gap-3 mb-2">
        <span className="text-sm text-gray-600 flex-1">위로 아이템</span>
        <Button variant="ghost" size="sm" onClick={onOpenPicker}>
          <Plus size={13} /> 추가
        </Button>
      </div>
      {failRewards.length === 0 ? (
        <p className="text-gray-400 text-sm">없음 (실패 시 아이템 보상 없음)</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {failRewards.map(r => (
            <div key={r.itemId} className="flex items-center gap-1 rounded-full border border-red-200 bg-white pl-2 pr-1 py-1">
              {(r.spriteUrl || r.imageUrl) && <img src={r.spriteUrl || r.imageUrl} alt={r.name} className="w-6 h-6 object-contain shrink-0" />}
              <span className="text-sm font-medium text-red-900">{r.name}</span>
              <span className="text-sm text-red-400 mx-1">×</span>
              <input
                type="number" min={1} value={r.count || 1}
                onChange={e => updateCount(r.itemId, e.target.value)}
                className="w-12 rounded border border-red-200 bg-white px-1 py-0.5 text-sm text-center"
                title="지급 개수"
              />
              <button onClick={() => removeItem(r.itemId)} className="text-red-400 hover:text-red-600 ml-1"><X size={12} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StageItemPoolPanel({ bonusItems, onUpdate, onOpenPicker, minPick, maxPick, onMinPickChange, onMaxPickChange }) {
  const removeItem = (itemId) => onUpdate(bonusItems.filter(b => String(b.itemId) !== String(itemId)));
  return (
    <div className="mt-2 rounded border border-sky-100 bg-sky-50/40 p-2">
      <div className="flex items-center gap-3 mb-2">
        <span className="text-sm font-semibold text-sky-800 flex-1">단계 아이템 풀</span>
        <div className="flex items-center gap-1 text-xs text-gray-500 shrink-0">
          획득 개수
          <input type="number" min={1} value={minPick}
            onChange={e => onMinPickChange(Math.max(1, Number(e.target.value) || 1))}
            className="w-10 rounded border border-sky-200 bg-white px-1 py-0.5 text-center text-xs mx-0.5" />
          ~
          <input type="number" min={1} value={maxPick}
            onChange={e => onMaxPickChange(Math.max(1, Number(e.target.value) || 1))}
            className="w-10 rounded border border-sky-200 bg-white px-1 py-0.5 text-center text-xs mx-0.5" />
          개
        </div>
        <Button variant="ghost" size="sm" onClick={onOpenPicker}><Plus size={12} /> 추가</Button>
      </div>
      {bonusItems.length === 0
        ? <p className="text-xs text-gray-400">없음 (단계 아이템 보상 없음)</p>
        : <div className="flex flex-wrap gap-1.5">
            {bonusItems.map(b => (
              <div key={b.itemId} className="flex items-center gap-1 rounded-full border border-sky-200 bg-white pl-1.5 pr-2 py-1">
                {(b.imageUrl || b.spriteUrl) && <img src={b.imageUrl || b.spriteUrl} alt={b.name} className="w-5 h-5 object-contain shrink-0" />}
                <span className="text-xs font-medium text-sky-900">{b.name}</span>
                <button onClick={() => removeItem(b.itemId)} className="text-sky-400 hover:text-red-500 ml-1"><X size={11} /></button>
              </div>
            ))}
          </div>
      }
      <p className="text-xs text-gray-400 mt-1.5">해당 단계에서 완료 시 풀에서 {minPick}~{maxPick}개를 랜덤 획득</p>
    </div>
  );
}

function CampingDishRewardPanel({ allItems = [] }) {
  const normalizeKeys = (item = {}) =>
    [item.id, item.itemId, item.nameEn, item.name]
      .map(value => String(value || '').trim().toLowerCase())
      .filter(Boolean);

  const findItem = (type, stageReward) => {
    const suffix = stageReward.suffixByType?.[type] || stageReward.suffix;
    const target = `${type}_${suffix}`;
    return allItems.find(item => {
      const keys = normalizeKeys(item);
      return keys.includes(target) || keys.some(key => key === target || key.endsWith(`/${target}`));
    }) || null;
  };

  return (
    <div className="mb-5 rounded border border-amber-200 bg-amber-50/40 p-3">
      <div className="mb-1 flex items-center gap-2 font-semibold text-amber-900 text-base">
        <Gift size={16} />
        떡볶이 단계 보상
      </div>
      <p className="mb-3 text-sm text-gray-500">
        캠핑 완료 단계에 따라 선택한 떡볶이 맛의 커스텀 아이템을 1개 지급합니다.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] border-separate border-spacing-y-1 text-sm">
          <thead>
            <tr className="text-left text-xs font-semibold text-gray-500">
              <th className="px-2 py-1">단계</th>
              {CAMPING_DISH_CHOICES.map(choice => (
                <th key={choice.type} className="px-2 py-1">{choice.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {CAMPING_DISH_STAGE_SUFFIXES.map(stageReward => (
              <tr key={stageReward.stage}>
                <td className="whitespace-nowrap rounded-l bg-white px-2 py-2 font-semibold text-gray-700">{stageReward.label}</td>
                {CAMPING_DISH_CHOICES.map(choice => {
                  const suffix = stageReward.suffixByType?.[choice.type] || stageReward.suffix;
                  const target = `${choice.type}_${suffix}`;
                  const item = findItem(choice.type, stageReward);
                  return (
                    <td key={choice.type} className="bg-white px-2 py-2 last:rounded-r">
                      <div className="flex items-center gap-2">
                        {(item?.spriteUrl || item?.imageUrl) && (
                          <img src={item.spriteUrl || item.imageUrl} alt={item.name || target} className="h-7 w-7 object-contain" />
                        )}
                        <div className="min-w-0">
                          <div className={`truncate font-semibold ${item ? 'text-amber-900' : 'text-red-500'}`}>
                            {item?.name || '미등록'}
                          </div>
                          <div className="truncate text-xs text-gray-400">{target}</div>
                        </div>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SessionCard({ session, onDelete }) {
  const isFinished = ['completed', 'applied', 'failed'].includes(session.status);
  const reward = session.reward;
  return (
    <div className="rounded border border-lime-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 font-bold text-gray-800">
            {session.memberName || session.memberId}
            {session.isDuo && (
              <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-1 text-xs font-semibold text-purple-700">
                <Users size={12} />{session.partnerName || '듀오'}
              </span>
            )}
            <span className={`ml-auto rounded-full px-2 py-0.5 text-xs font-semibold ${
              session.status === 'applied' ? 'bg-green-100 text-green-700' :
              session.status === 'failed'  ? 'bg-red-100 text-red-700' :
              'bg-blue-100 text-blue-700'
            }`}>{session.status}</span>
          </div>
          <div className="mt-1 text-sm text-gray-500">단계 {session.currentStage || 0}</div>
          {session.campingDishLabel && (
            <div className="mt-1 text-xs font-semibold text-amber-700">{session.campingDishLabel} 떡볶이</div>
          )}
          <div className="mt-2 flex flex-wrap gap-1">
            {(session.entryPokemon || []).filter(Boolean).map((p, i) => (
              <span key={i} className="rounded bg-lime-50 px-2 py-0.5 text-xs text-green-800">{p.name}</span>
            ))}
          </div>
          {isFinished && reward && (
            <div className="mt-2 text-xs text-gray-500 flex flex-wrap gap-3">
              {reward.friendshipBonus > 0 && <span>친밀도 +{reward.friendshipBonus}</span>}
              {reward.expBonus > 0 && <span>경험치 +{reward.expBonus}</span>}
              {reward.dishItem && <span className="inline-flex items-center gap-1 text-amber-600 font-semibold"><Gift size={12} />{reward.dishItem.name}</span>}
              {reward.bonusItem && <span className="inline-flex items-center gap-1 text-amber-600 font-semibold"><Gift size={12} />{reward.bonusItem.name}</span>}
              {reward.egg && <span className="text-purple-600 font-semibold">🥚 알 획득</span>}
            </div>
          )}
        </div>
        {onDelete && (
          <Button variant="danger" size="sm" onClick={() => onDelete(session.firebaseKey)}>
            <Trash2 size={14} />
          </Button>
        )}
      </div>
    </div>
  );
}

const TABS = [
  { id: 'settings', label: '⚙️ 설정' },
  { id: 'sessions', label: '📋 세션 기록' },
];

export default function CampingAdminPanel({
  campingSessions = [],
  systemSettings = {},
  onSaveSettings,
  onDeleteSession,
  allItems = [],
}) {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [activeTab, setActiveTab] = useState('settings');
  const [draft, setDraft] = useState(() => buildDraft(systemSettings.campingSettings || {}));
  const [itemModalTarget, setItemModalTarget] = useState(null); // null | 'global' | stageIndex(number)

  useEffect(() => {
    setDraft(buildDraft(systemSettings.campingSettings || {}));
  }, [systemSettings.campingSettings]);

  const groupedSessions = useMemo(() => ({
    active:   campingSessions.filter(s => !['completed', 'applied', 'failed'].includes(s.status)),
    finished: campingSessions.filter(s => ['completed', 'applied', 'failed'].includes(s.status)),
  }), [campingSessions]);

  const updateDraft = (key, value) => setDraft(prev => ({ ...prev, [key]: value }));
  const updateStage = (index, key, value) =>
    setDraft(prev => ({ ...prev, stages: prev.stages.map((s, i) => i === index ? { ...s, [key]: value } : s) }));

  const handleSave = async () => {
    const minCampingCount = Math.max(1, Number(draft.minCampingCount) || 1);
    const maxCampingCount = Math.max(minCampingCount, Number(draft.maxCampingCount) || minCampingCount);
    await onSaveSettings?.({
      ...systemSettings,
      campingSettings: {
        minCampingCount,
        maxCampingCount,
        duoSuccessBonus: Math.max(0, Number(draft.duoSuccessBonus) || 0),
        eggChance: Math.max(0, Number(draft.eggChance) || 0),
        minFriendshipForBonus: Math.max(0, Number(draft.minFriendshipForBonus) || 0),
        bonusItems: draft.bonusItems,
        failRewards: draft.failRewards,
        failFriendshipMin: Math.max(0, Number(draft.failFriendshipMin) || 0),
        failFriendshipMax: Math.max(0, Number(draft.failFriendshipMax) || 0),
        failExpMin: Math.max(0, Number(draft.failExpMin) || 0),
        failExpMax: Math.max(0, Number(draft.failExpMax) || 0),
        stages: draft.stages.map((s, i) => ({
          stage: i + 1,
          successRate: Math.max(0, Number(s.successRate) || 0),
          friendshipMin: Math.max(0, Number(s.friendshipMin) || 0),
          friendshipMax: Math.max(0, Number(s.friendshipMax) || 0),
          expMin: Math.max(0, Number(s.expMin) || 0),
          expMax: Math.max(0, Number(s.expMax) || 0),
          message: s.message || '',
          bonusItems: (s.bonusItems || []).map(({ chance, ...rest }) => rest), // chance 제거, 순수 풀
          minPick: Math.max(1, Number(s.minPick) || 1),
          maxPick: Math.max(1, Number(s.maxPick) || 1),
        })),
      },
    });
    alert('캠핑 설정을 저장했습니다.');
  };

  return (
    <div className="space-y-4">
      {/* 탭 */}
      <div className="flex gap-2 border-b border-lime-200 pb-0">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-semibold rounded-t transition ${
              activeTab === tab.id
                ? 'bg-white border border-b-white border-lime-200 text-green-800 -mb-px'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 설정 탭 */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          <Card className="border-2 border-lime-300 bg-white/70 p-6">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-green-950">캠핑 시스템 설정</h2>
                <p className="mt-1 text-base text-green-800">단계별 보상, 자동 메시지와 마스토돈 진행 횟수를 설정합니다.</p>
              </div>
              <Button variant="primary" size="sm" onClick={handleSave}>설정 저장</Button>
            </div>

            {/* 기본 설정 */}
            <div className={`mb-5 grid gap-3 ${isMobile ? 'grid-cols-2' : 'grid-cols-5'}`}>
              <div>
                <InfoLabel>최소 캠핑 횟수</InfoLabel>
                <NumberInput value={draft.minCampingCount} onChange={v => updateDraft('minCampingCount', v)} min={1} />
              </div>
              <div>
                <InfoLabel>최대 캠핑 횟수</InfoLabel>
                <NumberInput value={draft.maxCampingCount} onChange={v => updateDraft('maxCampingCount', v)} min={1} />
              </div>
              <div>
                <InfoLabel tooltip="듀오 캠핑 시 성공률에 더해지는 보너스 (%)">듀오 보너스 %</InfoLabel>
                <NumberInput value={draft.duoSuccessBonus} onChange={v => updateDraft('duoSuccessBonus', v)} />
              </div>
              <div>
                <InfoLabel tooltip="2인 캠핑 시 알이 생길 확률 (%)">알 확률 %</InfoLabel>
                <NumberInput value={draft.eggChance} onChange={v => updateDraft('eggChance', v)} />
              </div>
              <div>
                <InfoLabel tooltip="이 이상의 친밀도를 가진 포켓몬이 있으면 보너스 아이템 추첨 대상">보너스 친밀도 기준</InfoLabel>
                <NumberInput value={draft.minFriendshipForBonus} onChange={v => updateDraft('minFriendshipForBonus', v)} />
              </div>
            </div>

            {/* 보너스 아이템 */}
            <div className="mb-5 rounded border border-amber-100 bg-amber-50/30 p-3">
              <div className="font-semibold text-amber-800 text-base mb-1">보너스 아이템</div>
              <p className="text-sm text-gray-500 mb-3">친밀도 기준 이상의 포켓몬이 함께하면 각 아이템을 지정한 확률(%)로 독립적으로 획득합니다.</p>
              <BonusItemChancePanel
                bonusItems={draft.bonusItems}
                onUpdate={items => updateDraft('bonusItems', items)}
                onOpenPicker={() => setItemModalTarget('global')}
                label=""
                hint=""
              />
            </div>

            {/* 실패 보상 */}
            <CampingDishRewardPanel allItems={allItems} />

            <FailRewardPanel
              failRewards={draft.failRewards}
              onUpdate={items => updateDraft('failRewards', items)}
              onOpenPicker={() => setItemModalTarget('failReward')}
              friendshipMin={draft.failFriendshipMin}
              friendshipMax={draft.failFriendshipMax}
              onFriendshipMinChange={v => updateDraft('failFriendshipMin', Math.max(0, Number(v) || 0))}
              onFriendshipMaxChange={v => updateDraft('failFriendshipMax', Math.max(0, Number(v) || 0))}
              expMin={draft.failExpMin}
              expMax={draft.failExpMax}
              onExpMinChange={v => updateDraft('failExpMin', Math.max(0, Number(v) || 0))}
              onExpMaxChange={v => updateDraft('failExpMax', Math.max(0, Number(v) || 0))}
            />

            {/* 단계별 보상 */}
            <div className="space-y-3">
              <h3 className="font-bold text-gray-800 text-base">단계별 보상 및 메시지</h3>
              {draft.stages.map((stage, index) => (
                <div key={index} className="rounded border border-lime-200 bg-lime-50/40 p-3 space-y-3">
                  <div className="font-bold text-green-800 text-base">Lv.{index + 1}</div>
                  {/* 성공률 + 범위 입력 */}
                  <div className="flex flex-wrap items-end gap-3">
                    <div className="shrink-0">
                      <InfoLabel>성공률 %</InfoLabel>
                      <input type="number" min={0} value={stage.successRate}
                        onChange={e => updateStage(index, 'successRate', e.target.value)}
                        className="mt-1 w-20 rounded border border-lime-300 bg-white px-2 py-2 text-base text-center focus:border-lime-500 focus:outline-none focus:ring-2 focus:ring-lime-200" />
                    </div>
                    <div className="shrink-0">
                      <InfoLabel tooltip="친밀도 min ~ max 사이 랜덤 지급">친밀도 범위</InfoLabel>
                      <div className="flex items-center gap-1 mt-1">
                        <input type="number" min={0} value={stage.friendshipMin}
                          onChange={e => updateStage(index, 'friendshipMin', Number(e.target.value))}
                          className="w-16 rounded border border-lime-300 bg-white px-1 py-2 text-base text-center focus:border-lime-500 focus:outline-none" />
                        <span className="text-gray-400 text-sm shrink-0">~</span>
                        <input type="number" min={0} value={stage.friendshipMax}
                          onChange={e => updateStage(index, 'friendshipMax', Number(e.target.value))}
                          className="w-16 rounded border border-lime-300 bg-white px-1 py-2 text-base text-center focus:border-lime-500 focus:outline-none" />
                      </div>
                    </div>
                    <div className="shrink-0">
                      <InfoLabel tooltip="경험치 min ~ max 사이 랜덤 지급">경험치 범위</InfoLabel>
                      <div className="flex items-center gap-1 mt-1">
                        <input type="number" min={0} value={stage.expMin}
                          onChange={e => updateStage(index, 'expMin', Number(e.target.value))}
                          className="w-20 rounded border border-lime-300 bg-white px-1 py-2 text-base text-center focus:border-lime-500 focus:outline-none" />
                        <span className="text-gray-400 text-sm shrink-0">~</span>
                        <input type="number" min={0} value={stage.expMax}
                          onChange={e => updateStage(index, 'expMax', Number(e.target.value))}
                          className="w-20 rounded border border-lime-300 bg-white px-1 py-2 text-base text-center focus:border-lime-500 focus:outline-none" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-40">
                      <InfoLabel>단계 메시지</InfoLabel>
                      <input
                        value={stage.message}
                        onChange={e => updateStage(index, 'message', e.target.value)}
                        className="mt-1 w-full rounded border border-lime-300 bg-white px-3 py-2 text-base focus:border-lime-500 focus:outline-none focus:ring-2 focus:ring-lime-200"
                      />
                    </div>
                  </div>
                  <StageItemPoolPanel
                    bonusItems={stage.bonusItems || []}
                    onUpdate={items => updateStage(index, 'bonusItems', items)}
                    onOpenPicker={() => setItemModalTarget(index)}
                    minPick={stage.minPick ?? 1}
                    maxPick={stage.maxPick ?? 1}
                    onMinPickChange={v => updateStage(index, 'minPick', v)}
                    onMaxPickChange={v => updateStage(index, 'maxPick', v)}
                  />
                </div>
              ))}
            </div>
          </Card>

          {/* 통계 */}
          <div className={`grid gap-3 grid-cols-2 ${!isMobile ? 'md:grid-cols-4' : ''}`}>
            <Card className="border-lime-200 bg-lime-50 p-4 text-center">
              <Tent className="mx-auto mb-2 text-lime-700" size={24} />
              <div className="text-2xl font-bold text-green-900">{campingSessions.length}</div>
              <div className="text-sm text-green-700">전체 세션</div>
            </Card>
            <Card className="border-blue-200 bg-blue-50 p-4 text-center">
              <AlertCircle className="mx-auto mb-2 text-blue-700" size={24} />
              <div className="text-2xl font-bold text-blue-900">{groupedSessions.active.length}</div>
              <div className="text-sm text-blue-700">진행 중</div>
            </Card>
            <Card className="border-green-200 bg-green-50 p-4 text-center">
              <CheckCircle className="mx-auto mb-2 text-green-700" size={24} />
              <div className="text-2xl font-bold text-green-900">{groupedSessions.finished.length}</div>
              <div className="text-sm text-green-700">완료/반영</div>
            </Card>
            <Card className="border-amber-200 bg-amber-50 p-4 text-center">
              <Gift className="mx-auto mb-2 text-amber-700" size={24} />
              <div className="text-2xl font-bold text-amber-900">{campingSessions.filter(s => s.reward?.egg || s.eggObtained).length}</div>
              <div className="text-sm text-amber-700">알 획득</div>
            </Card>
          </div>
        </div>
      )}

      {/* 세션 기록 탭 */}
      {activeTab === 'sessions' && (
        <div className="space-y-4">
          {groupedSessions.active.length > 0 && (
            <Card className="p-6">
              <h3 className="mb-4 text-lg font-bold text-gray-800">진행 중인 세션 ({groupedSessions.active.length})</h3>
              <div className="space-y-3">
                {groupedSessions.active.map(s => <SessionCard key={s.firebaseKey || s.id} session={s} onDelete={onDeleteSession} />)}
              </div>
            </Card>
          )}
          {groupedSessions.finished.length > 0 && (
            <Card className="p-6">
              <h3 className="mb-4 text-lg font-bold text-gray-800">완료된 세션 ({groupedSessions.finished.length})</h3>
              <div className="space-y-3">
                {groupedSessions.finished.map(s => <SessionCard key={s.firebaseKey || s.id} session={s} onDelete={onDeleteSession} />)}
              </div>
            </Card>
          )}
          {campingSessions.length === 0 && (
            <Card className="p-12 text-center text-gray-400">세션이 없습니다.</Card>
          )}
        </div>
      )}

      {/* 아이템 선택 모달 */}
      <ItemSelectorModal
        show={itemModalTarget !== null}
        onClose={() => setItemModalTarget(null)}
        onSelect={item => {
          const newEntry = { itemId: item.id, name: item.name, weight: 10, imageUrl: item.spriteUrl || item.imageUrl || '' };
          if (itemModalTarget === 'failReward') {
            const failEntry = { itemId: item.id, name: item.name, count: 1, spriteUrl: item.spriteUrl || item.imageUrl || '' };
            if (!draft.failRewards.some(r => String(r.itemId) === String(item.id)))
              updateDraft('failRewards', [...draft.failRewards, failEntry]);
          } else if (itemModalTarget === 'global') {
            if (!draft.bonusItems.some(b => String(b.itemId) === String(item.id)))
              updateDraft('bonusItems', [...draft.bonusItems, newEntry]);
          } else if (typeof itemModalTarget === 'number') {
            const cur = draft.stages[itemModalTarget].bonusItems || [];
            if (!cur.some(b => String(b.itemId) === String(item.id)))
              updateStage(itemModalTarget, 'bonusItems', [...cur, newEntry]);
          }
          setItemModalTarget(null);
        }}
        items={allItems}
        title={itemModalTarget === 'failReward' ? '실패 보상 아이템 추가' : itemModalTarget === 'global' ? '기본 보너스 아이템 추가' : `Lv.${typeof itemModalTarget === 'number' ? itemModalTarget + 1 : ''} 아이템 추가`}
      />
    </div>
  );
}
