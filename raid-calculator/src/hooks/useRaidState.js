import { useCallback, useEffect, useState } from 'react';
import {
  createInitialBattleState,
  executeParticipantAction,
  executeBossAction,
  executeCheer,
  resetFieldBoosts,
  cureBossStatus,
} from '../engine/raidEngine.js';

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

  const startBattle = useCallback(() => {
    setBattle(createInitialBattleState({ boss, participants, maxRounds }));
  }, [boss, participants, maxRounds]);

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
    maxRounds,
    setMaxRounds,
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
