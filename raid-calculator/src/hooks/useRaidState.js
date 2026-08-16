import { useCallback, useEffect, useState } from 'react';
import {
  createInitialBattleState,
  executeParticipantAction,
  executeBossAction,
  executeCheer,
  resetFieldBoosts,
  cureBossStatus,
} from '../engine/raidEngine.js';
import { DEFAULT_ROSTER } from '../data/defaultRoster.js';

export const MAX_PARTICIPANTS = 24;
const STORAGE_KEY = 'raid-calculator-draft-v3';

const DEFAULT_IVS = { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 };
const DEFAULT_EVS = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
const DEFAULT_BASE_STATS = { hp: 100, atk: 100, def: 100, spa: 100, spd: 100, spe: 100 };

// 레벨 50 / 성격 하드(무보정) / 도구 없음 / 특성 없음 / 종족값 100 / 개체값 31로 고정
// (engine의 buildBattlePokemon에서 강제 적용됨). 노력치/타입/기술/포지션/성별은 직접 입력.
function emptyParticipant(id) {
  return {
    id,
    nickname: '',
    pokemon: '',
    position: '',
    gender: '',
    teraType: '',
    types: ['Normal'],
    evs: { ...DEFAULT_EVS },
    moves: ['', '', '', ''],
  };
}

function defaultBoss() {
  return {
    nickname: '보스',
    types: ['Normal'],
    baseStats: { ...DEFAULT_BASE_STATS },
    level: 50,
    nature: 'hardy',
    ability: '',
    item: '',
    gender: '',
    teraType: '',
    ivs: { ...DEFAULT_IVS },
    evs: { ...DEFAULT_EVS },
    hpMultiplier: 1,
    moves: ['', '', '', ''],
    actionsPerRound: 2,
  };
}

function loadDraft() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
}

export function useRaidState() {
  const draft = loadDraft();

  const [boss, setBoss] = useState(draft?.boss || defaultBoss());
  const [participants, setParticipants] = useState(
    draft?.participants && draft.participants.length === MAX_PARTICIPANTS
      ? draft.participants
      : Array.from({ length: MAX_PARTICIPANTS }, (_, i) => emptyParticipant(i))
  );
  const [maxRounds, setMaxRounds] = useState(draft?.maxRounds || 6);
  const [battle, setBattle] = useState(null);

  useEffect(() => {
    const payload = JSON.stringify({ boss, participants, maxRounds });
    localStorage.setItem(STORAGE_KEY, payload);
  }, [boss, participants, maxRounds]);

  const updateBoss = useCallback((patch) => {
    setBoss((prev) => ({ ...prev, ...patch }));
  }, []);

  const updateParticipant = useCallback((id, patch) => {
    setParticipants((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }, []);

  const clearParticipant = useCallback((id) => {
    setParticipants((prev) => prev.map((p) => (p.id === id ? emptyParticipant(id) : p)));
  }, []);

  // 포지션 조합대로 조 배정: 순서대로 자르는 게 아니라, 철벽1·도우미1·칼춤(teamSize-2)명 조합이 되도록
  // 철벽/칼춤/도우미 풀에서 각각 뽑아 조를 구성한다. 조를 못 채우고 남는 인원은 조 미배정으로 남는다.
  const autoAssignTeams = useCallback(
    (teamSize) => {
      const size = Math.max(3, Number(teamSize) || 5);
      const swordPerTeam = size - 2;

      const tankIds = participants.filter((p) => p.position === '철벽').map((p) => p.id);
      const healerIds = participants.filter((p) => p.position === '도우미').map((p) => p.id);
      const swordIds = participants.filter((p) => p.position === '칼춤').map((p) => p.id);

      const teamCount = Math.min(tankIds.length, healerIds.length, Math.floor(swordIds.length / swordPerTeam));

      const teamById = new Map();
      for (let t = 0; t < teamCount; t += 1) {
        const teamLabel = String(t + 1);
        teamById.set(tankIds[t], teamLabel);
        teamById.set(healerIds[t], teamLabel);
        for (let s = 0; s < swordPerTeam; s += 1) {
          teamById.set(swordIds[t * swordPerTeam + s], teamLabel);
        }
      }

      setParticipants((prev) => prev.map((p) => ({ ...p, team: teamById.get(p.id) || '' })));

      const usedCount = teamCount > 0 ? teamCount * (2 + swordPerTeam) : 0;
      const assignableCount = tankIds.length + healerIds.length + swordIds.length;
      return { teamCount, leftoverCount: assignableCount - usedCount };
    },
    [participants]
  );

  // 고정 명단(트레이너/포켓몬/타입) 불러오기 — 기존 입력을 전부 덮어쓴다
  const loadDefaultRoster = useCallback(() => {
    setParticipants(
      Array.from({ length: MAX_PARTICIPANTS }, (_, i) => {
        const entry = DEFAULT_ROSTER[i];
        return entry
          ? { ...emptyParticipant(i), nickname: entry.nickname, pokemon: entry.pokemon, position: entry.position, types: entry.types }
          : emptyParticipant(i);
      })
    );
  }, []);

  const startBattle = useCallback(() => {
    const battleParticipants = selectedTeam
      ? participants.filter((p) => String(p.team || '') === String(selectedTeam))
      : participants;
    setBattle(createInitialBattleState({ boss, participants: battleParticipants, maxRounds }));
  }, [boss, participants, maxRounds, selectedTeam]);

  const resetBattle = useCallback(() => {
    setBattle(null);
  }, []);

  const runParticipantAction = useCallback((participantId, moveId) => {
    setBattle((prev) => (prev ? executeParticipantAction(prev, participantId, moveId) : prev));
  }, []);

  const runBossAction = useCallback((moveId, targetId) => {
    setBattle((prev) => (prev ? executeBossAction(prev, moveId, targetId) : prev));
  }, []);

  const runCheer = useCallback((participantId, cheerId) => {
    setBattle((prev) => (prev ? executeCheer(prev, participantId, cheerId) : prev));
  }, []);

  const runResetFieldBoosts = useCallback(() => {
    setBattle((prev) => (prev ? resetFieldBoosts(prev) : prev));
  }, []);

  const runCureBossStatus = useCallback(() => {
    setBattle((prev) => (prev ? cureBossStatus(prev) : prev));
  }, []);

  const exportDraft = useCallback(() => {
    const payload = JSON.stringify({ boss, participants, maxRounds }, null, 2);
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `raid-setup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [boss, participants, maxRounds]);

  const importDraft = useCallback((jsonText) => {
    try {
      const parsed = JSON.parse(jsonText);
      if (parsed.boss) setBoss(parsed.boss);
      if (Array.isArray(parsed.participants) && parsed.participants.length === MAX_PARTICIPANTS) {
        setParticipants(parsed.participants);
      }
      if (parsed.maxRounds) setMaxRounds(parsed.maxRounds);
      setBattle(null);
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  }, []);

  return {
    boss,
    updateBoss,
    participants,
    updateParticipant,
    clearParticipant,
    autoAssignTeams,
    loadDefaultRoster,
    maxRounds,
    setMaxRounds,
    selectedTeam,
    setSelectedTeam,
    battle,
    startBattle,
    resetBattle,
    runParticipantAction,
    runBossAction,
    runCheer,
    runResetFieldBoosts,
    runCureBossStatus,
    exportDraft,
    importDraft,
  };
}
