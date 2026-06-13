import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle, Gift, HelpCircle, Plus, Tent, Trash2, Users, X } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import ItemSelectorModal from '../../modals/ItemSelectorModal';
import useMediaQuery from '../../../hooks/useMediaQuery';

const DEFAULT_STAGES = [
  { stage: 1, successRate: 100, friendshipBonus: 10, expBonus: 50, message: '캠핑을 시작했어요. [만족] 또는 [계속]을 선택해 주세요.' },
  { stage: 2, successRate: 80,  friendshipBonus: 20, expBonus: 100, message: '캠핑이 조금 더 깊어졌어요. [만족] 또는 [계속]을 선택해 주세요.' },
  { stage: 3, successRate: 60,  friendshipBonus: 30, expBonus: 150, message: '포켓몬들이 꽤 즐거워 보여요. [만족] 또는 [계속]을 선택해 주세요.' },
  { stage: 4, successRate: 40,  friendshipBonus: 40, expBonus: 200, message: '캠핑 분위기가 무르익었어요. [만족] 또는 [계속]을 선택해 주세요.' },
  { stage: 5, successRate: 20,  friendshipBonus: 50, expBonus: 300, message: '최고 단계까지 왔어요. 캠핑을 마무리합니다.' },
];

const DEFAULT_SETTINGS = {
  minCampingCount: 1,
  maxCampingCount: 5,
  duoSuccessBonus: 15,
  eggChance: 5,
  minFriendshipForBonus: 160,
  bonusItems: [
    { itemId: 50,  name: '이상한사탕', weight: 15 },
    { itemId: 92, name: '금구슬',    weight: 20 },
  ],
  stages: DEFAULT_STAGES,
};

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
  bonusItems: Array.isArray(settings.bonusItems) ? settings.bonusItems : DEFAULT_SETTINGS.bonusItems,
  stages: DEFAULT_STAGES.map((defaultStage, index) => {
    const saved = settings.stages?.[index] || settings.stageRewards?.[index] || settings.cookingStages?.[index] || {};
    return {
      ...defaultStage,
      ...saved,
      successRate: normalizePercent(saved.successRate ?? defaultStage.successRate, defaultStage.successRate),
    };
  }),
});

function InfoLabel({ children, tooltip }) {
  return (
    <label className="flex items-center gap-1 text-sm font-semibold text-gray-700">
      {children}
      {tooltip && (
        <span className="relative group">
          <HelpCircle size={14} className="text-gray-400" />
          <span className="pointer-events-none absolute left-1/2 top-5 z-30 hidden w-64 -translate-x-1/2 rounded bg-gray-900 px-3 py-2 text-xs font-normal leading-relaxed text-white shadow-lg group-hover:block">
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
      className="mt-1 w-full rounded border border-lime-300 bg-white px-3 py-2 text-sm focus:border-lime-500 focus:outline-none focus:ring-2 focus:ring-lime-200"
    />
  );
}

function BonusItemWeightPanel({ bonusItems, onUpdate, onOpenPicker, label, hint, compact = false }) {
  const updateWeight = (itemId, weight) =>
    onUpdate(bonusItems.map(b => String(b.itemId) === String(itemId) ? { ...b, weight: Number(weight) || 0 } : b));
  const removeItem = (itemId) =>
    onUpdate(bonusItems.filter(b => String(b.itemId) !== String(itemId)));

  return (
    <div>
      <div className="flex items-center gap-3 mb-2">
        <div className="flex-1">
          {label && <span className={`font-semibold text-gray-700 ${compact ? 'text-xs' : 'text-sm'}`}>{label}</span>}
          {hint && <span className="ml-2 text-xs text-gray-400">{hint}</span>}
        </div>
        <Button variant="ghost" size="sm" onClick={onOpenPicker}>
          <Plus size={12} /> 추가
        </Button>
      </div>
      {bonusItems.length === 0 ? (
        <p className={`text-gray-400 ${compact ? 'text-xs' : 'text-sm'}`}>없음 (기본 아이템 사용)</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {bonusItems.map(b => (
            <div key={b.itemId} className="flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 pl-3 pr-1 py-1">
              <span className="text-xs font-medium text-amber-900">{b.name}</span>
              <input
                type="number" min={1} value={b.weight}
                onChange={e => updateWeight(b.itemId, e.target.value)}
                className="w-10 rounded border border-amber-200 bg-white px-1 py-0.5 text-xs text-center mx-1"
                title="가중치"
              />
              <button onClick={() => removeItem(b.itemId)} className="text-amber-400 hover:text-red-500"><X size={11} /></button>
            </div>
          ))}
        </div>
      )}
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
          <div className="mt-2 flex flex-wrap gap-1">
            {(session.entryPokemon || []).filter(Boolean).map((p, i) => (
              <span key={i} className="rounded bg-lime-50 px-2 py-0.5 text-xs text-green-800">{p.name}</span>
            ))}
          </div>
          {isFinished && reward && (
            <div className="mt-2 text-xs text-gray-500 flex flex-wrap gap-3">
              {reward.friendshipBonus > 0 && <span>친밀도 +{reward.friendshipBonus}</span>}
              {reward.expBonus > 0 && <span>경험치 +{reward.expBonus}</span>}
              {reward.bonusItem && <span className="text-amber-600 font-semibold">🎁 {reward.bonusItem.name}</span>}
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
        stages: draft.stages.map((s, i) => ({
          stage: i + 1,
          successRate: Math.max(0, Number(s.successRate) || 0),
          friendshipBonus: Math.max(0, Number(s.friendshipBonus) || 0),
          expBonus: Math.max(0, Number(s.expBonus) || 0),
          message: s.message || '',
          bonusItems: s.bonusItems || [],
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
                <p className="mt-1 text-sm text-green-800">단계별 보상, 자동 메시지와 마스토돈 진행 횟수를 설정합니다.</p>
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

            {/* 글로벌 기본 보너스 아이템 */}
            <div className="mb-5">
              <BonusItemWeightPanel
                bonusItems={draft.bonusItems}
                allItems={allItems}
                onUpdate={items => updateDraft('bonusItems', items)}
                onOpenPicker={() => setItemModalTarget('global')}
                label="기본 보너스 아이템"
                hint="단계별 아이템이 없을 때 사용됩니다"
              />
            </div>

            {/* 단계별 보상 */}
            <div className="space-y-3">
              <h3 className="font-bold text-gray-800">단계별 보상 및 메시지</h3>
              {draft.stages.map((stage, index) => (
                <div key={index} className="rounded border border-lime-200 bg-lime-50/40 p-3 space-y-3">
                  <div className="font-bold text-green-800 text-sm">Lv.{index + 1}</div>
                  <div className={`grid gap-2 ${isMobile ? 'grid-cols-3' : 'grid-cols-12'} items-end`}>
                    <div className={isMobile ? 'col-span-1' : 'col-span-2'}>
                      <InfoLabel>성공률 %</InfoLabel>
                      <NumberInput value={stage.successRate} onChange={v => updateStage(index, 'successRate', v)} />
                    </div>
                    <div className={isMobile ? 'col-span-1' : 'col-span-2'}>
                      <InfoLabel>친밀도</InfoLabel>
                      <NumberInput value={stage.friendshipBonus} onChange={v => updateStage(index, 'friendshipBonus', v)} />
                    </div>
                    <div className={isMobile ? 'col-span-1' : 'col-span-2'}>
                      <InfoLabel>경험치</InfoLabel>
                      <NumberInput value={stage.expBonus} onChange={v => updateStage(index, 'expBonus', v)} />
                    </div>
                    {!isMobile && (
                      <div className="col-span-5">
                        <InfoLabel>단계 메시지</InfoLabel>
                        <input
                          value={stage.message}
                          onChange={e => updateStage(index, 'message', e.target.value)}
                          className="mt-1 w-full rounded border border-lime-300 bg-white px-3 py-2 text-sm focus:border-lime-500 focus:outline-none focus:ring-2 focus:ring-lime-200"
                        />
                      </div>
                    )}
                  </div>
                  {isMobile && (
                    <div>
                      <InfoLabel>단계 메시지</InfoLabel>
                      <input
                        value={stage.message}
                        onChange={e => updateStage(index, 'message', e.target.value)}
                        className="mt-1 w-full rounded border border-lime-300 bg-white px-3 py-2 text-sm focus:border-lime-500 focus:outline-none focus:ring-2 focus:ring-lime-200"
                      />
                    </div>
                  )}
                  <BonusItemWeightPanel
                    bonusItems={stage.bonusItems || []}
                    allItems={allItems}
                    onUpdate={items => updateStage(index, 'bonusItems', items)}
                    onOpenPicker={() => setItemModalTarget(index)}
                    label={`Lv.${index + 1} 전용 아이템`}
                    hint="설정 시 기본 아이템 대신 이 목록에서 추첨"
                    compact
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
          const newEntry = { itemId: item.id, name: item.name, weight: 10 };
          if (itemModalTarget === 'global') {
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
        title={itemModalTarget === 'global' ? '기본 보너스 아이템 추가' : `Lv.${typeof itemModalTarget === 'number' ? itemModalTarget + 1 : ''} 아이템 추가`}
      />
    </div>
  );
}
