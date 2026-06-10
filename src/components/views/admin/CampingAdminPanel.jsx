import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle, Gift, HelpCircle, Tent, Trash2, Users } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';

const DEFAULT_STAGES = [
  { stage: 1, successRate: 100, friendshipBonus: 10, expBonus: 50, message: '캠핑을 시작했어요. [만족] 또는 [계속]을 선택해 주세요.' },
  { stage: 2, successRate: 80, friendshipBonus: 20, expBonus: 100, message: '캠핑이 조금 더 깊어졌어요. [만족] 또는 [계속]을 선택해 주세요.' },
  { stage: 3, successRate: 60, friendshipBonus: 30, expBonus: 150, message: '포켓몬들이 꽤 즐거워 보여요. [만족] 또는 [계속]을 선택해 주세요.' },
  { stage: 4, successRate: 40, friendshipBonus: 40, expBonus: 200, message: '캠핑 분위기가 무르익었어요. [만족] 또는 [계속]을 선택해 주세요.' },
  { stage: 5, successRate: 20, friendshipBonus: 50, expBonus: 300, message: '최고 단계까지 왔어요. 캠핑을 마무리합니다.' }
];

const DEFAULT_SETTINGS = {
  minCampingCount: 1,
  maxCampingCount: 5,
  duoSuccessBonus: 15,
  eggChance: 5,
  minFriendshipForBonus: 160,
  stages: DEFAULT_STAGES
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
  stages: DEFAULT_STAGES.map((defaultStage, index) => {
    const saved = settings.stages?.[index] || settings.stageRewards?.[index] || settings.cookingStages?.[index] || {};
    return {
      ...defaultStage,
      ...saved,
      successRate: normalizePercent(saved.successRate ?? defaultStage.successRate, defaultStage.successRate)
    };
  })
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
      onChange={(event) => onChange(event.target.value)}
      className="mt-1 w-full rounded border border-lime-300 bg-white px-3 py-2 text-sm focus:border-lime-500 focus:outline-none focus:ring-2 focus:ring-lime-200"
    />
  );
}

export default function CampingAdminPanel({
  campingSessions = [],
  systemSettings = {},
  onSaveSettings,
  onDeleteSession
}) {
  const [draft, setDraft] = useState(() => buildDraft(systemSettings.campingSettings || {}));

  useEffect(() => {
    setDraft(buildDraft(systemSettings.campingSettings || {}));
  }, [systemSettings.campingSettings]);

  const groupedSessions = useMemo(() => {
    const active = campingSessions.filter(session => !['completed', 'applied', 'failed'].includes(session.status));
    const finished = campingSessions.filter(session => ['completed', 'applied', 'failed'].includes(session.status));
    return { active, finished };
  }, [campingSessions]);

  const updateDraft = (key, value) => {
    setDraft(prev => ({ ...prev, [key]: value }));
  };

  const updateStage = (index, key, value) => {
    setDraft(prev => ({
      ...prev,
      stages: prev.stages.map((stage, stageIndex) =>
        stageIndex === index ? { ...stage, [key]: value } : stage
      )
    }));
  };

  const handleSave = async () => {
    const minCampingCount = Math.max(1, Number(draft.minCampingCount) || 1);
    const maxCampingCount = Math.max(minCampingCount, Number(draft.maxCampingCount) || minCampingCount);
    const nextCampingSettings = {
      minCampingCount,
      maxCampingCount,
      duoSuccessBonus: Math.max(0, Number(draft.duoSuccessBonus) || 0),
      eggChance: Math.max(0, Number(draft.eggChance) || 0),
      minFriendshipForBonus: Math.max(0, Number(draft.minFriendshipForBonus) || 0),
      stages: draft.stages.map((stage, index) => ({
        stage: index + 1,
        successRate: Math.max(0, Number(stage.successRate) || 0),
        friendshipBonus: Math.max(0, Number(stage.friendshipBonus) || 0),
        expBonus: Math.max(0, Number(stage.expBonus) || 0),
        message: stage.message || ''
      }))
    };

    await onSaveSettings?.({
      ...systemSettings,
      campingSettings: nextCampingSettings
    });
    alert('캠핑 설정을 저장했습니다.');
  };

  const SessionCard = ({ session }) => (
    <div className="rounded border border-lime-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 font-bold text-gray-800">
            {session.memberName || session.memberId}
            {session.isDuo && (
              <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-1 text-xs font-semibold text-purple-700">
                <Users size={12} />
                {session.partnerName || '듀오'}
              </span>
            )}
          </div>
          <div className="mt-1 text-sm text-gray-600">상태: {session.status} · 단계 {session.currentStage || 0}</div>
          <div className="mt-2 flex flex-wrap gap-1">
            {(session.entryPokemon || []).filter(Boolean).map((pokemon, index) => (
              <span key={`${pokemon.name}-${index}`} className="rounded bg-lime-50 px-2 py-1 text-xs text-green-800">
                {pokemon.name}
              </span>
            ))}
          </div>
        </div>
        {onDeleteSession && (
          <Button variant="danger" size="sm" onClick={() => onDeleteSession(session.firebaseKey)}>
            <Trash2 size={14} />
            삭제
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <Card className="border-2 border-lime-300 bg-white/70 p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-green-950">캠핑 시스템 설정</h2>
            <p className="mt-1 text-sm text-green-800">단계별 보상, 자동 메시지와 마스토돈 진행 횟수를 설정합니다.</p>
          </div>
          <Button variant="primary" size="sm" onClick={handleSave}>
            설정 저장
          </Button>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-5">
          <div>
            <InfoLabel>최소 캠핑 횟수</InfoLabel>
            <NumberInput value={draft.minCampingCount} onChange={(value) => updateDraft('minCampingCount', value)} min={1} />
          </div>
          <div>
            <InfoLabel>최대 캠핑 횟수</InfoLabel>
            <NumberInput value={draft.maxCampingCount} onChange={(value) => updateDraft('maxCampingCount', value)} min={1} />
          </div>
          <div>
            <InfoLabel tooltip="다른 연동 계정과 함께 캠핑할 때 단계 성공률에 더해지는 보너스입니다.">듀오 보너스 %</InfoLabel>
            <NumberInput value={draft.duoSuccessBonus} onChange={(value) => updateDraft('duoSuccessBonus', value)} />
          </div>
          <div>
            <InfoLabel tooltip="다른 사람과 함께 캠핑할 때 알이 생길 확률입니다.">알 확률 %</InfoLabel>
            <NumberInput value={draft.eggChance} onChange={(value) => updateDraft('eggChance', value)} />
          </div>
          <div>
            <InfoLabel tooltip="이 친밀도 이상인 포켓몬이 있으면 보너스 아이템 추첨 대상이 됩니다. 추가 친밀도 수치가 아닙니다.">보너스 아이템 기준 친밀도</InfoLabel>
            <NumberInput value={draft.minFriendshipForBonus} onChange={(value) => updateDraft('minFriendshipForBonus', value)} />
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="font-bold text-gray-800">단계별 보상 및 메시지</h3>
          {draft.stages.map((stage, index) => (
            <div key={index} className="grid grid-cols-12 items-end gap-2 rounded border border-lime-200 bg-lime-50/40 p-3">
              <div className="col-span-12 font-bold text-green-800 md:col-span-1">Lv.{index + 1}</div>
              <div className="col-span-4 md:col-span-2">
                <InfoLabel>성공률 %</InfoLabel>
                <NumberInput value={stage.successRate} onChange={(value) => updateStage(index, 'successRate', value)} />
              </div>
              <div className="col-span-4 md:col-span-2">
                <InfoLabel>친밀도</InfoLabel>
                <NumberInput value={stage.friendshipBonus} onChange={(value) => updateStage(index, 'friendshipBonus', value)} />
              </div>
              <div className="col-span-4 md:col-span-2">
                <InfoLabel>경험치</InfoLabel>
                <NumberInput value={stage.expBonus} onChange={(value) => updateStage(index, 'expBonus', value)} />
              </div>
              <div className="col-span-12 md:col-span-5">
                <InfoLabel>단계 메시지</InfoLabel>
                <input
                  value={stage.message}
                  onChange={(event) => updateStage(index, 'message', event.target.value)}
                  className="mt-1 w-full rounded border border-lime-300 bg-white px-3 py-2 text-sm focus:border-lime-500 focus:outline-none focus:ring-2 focus:ring-lime-200"
                />
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
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
          <div className="text-2xl font-bold text-amber-900">{campingSessions.filter(session => session.reward?.egg || session.eggObtained).length}</div>
          <div className="text-sm text-amber-700">알 획득</div>
        </Card>
      </div>

      {groupedSessions.active.length > 0 && (
        <Card className="p-6">
          <h3 className="mb-4 text-lg font-bold text-gray-800">진행 중인 세션</h3>
          <div className="space-y-3">
            {groupedSessions.active.map(session => <SessionCard key={session.firebaseKey || session.id} session={session} />)}
          </div>
        </Card>
      )}

      {groupedSessions.finished.length > 0 && (
        <Card className="p-6">
          <h3 className="mb-4 text-lg font-bold text-gray-800">완료된 세션</h3>
          <div className="space-y-3">
            {groupedSessions.finished.map(session => <SessionCard key={session.firebaseKey || session.id} session={session} />)}
          </div>
        </Card>
      )}
    </div>
  );
}
