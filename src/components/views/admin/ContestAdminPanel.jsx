// src/components/views/admin/ContestAdminPanel.jsx
// 콘테스트 자동 판정 도구: 어필(♥)/방해(♡)/긴장/콤보 계산을 자동화하는 웹 시뮬레이터.
// 콤보는 Bulbapedia "Contest combination"(6세대) 조합표 기준으로 자동 판정된다.
import React, { useMemo, useState } from 'react';
import { Plus, X, Trophy, Sparkles, Link2 } from 'lucide-react';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { useGame } from '../../../contexts/GameContext';
import movesData from '../../../data/moves.json';
import {
  CONTEST_TYPES,
  CONDITION_KEY_BY_CONTEST_TYPE,
  calcNervousChance,
} from '../../../contest/contestRules';
import {
  createContestState,
  runFirstJudging,
  getCurrentActor,
  advanceTurn,
  getStandings,
  isContestDone,
  canUseMove,
  MAX_ROUND,
} from '../../../contest/ContestEngine';
import { isValidComboFollowUp } from '../../../contest/comboChart';
import { TARGETED_EFFECTS, DICE_EFFECTS } from '../../../contest/contestEffects';
import { getContestTypeColor, getContestEffectKo } from '../../../utils/contestMoveData';
import { formatOwnedPokemonName } from '../../../utils/ownedPokemonDisplay';

let uid = 0;
const nextId = () => `p${Date.now()}_${uid++}`;

function MoveBadge({ move, small }) {
  if (!move) return null;
  const colors = getContestTypeColor(move.contestType);
  return (
    <span
      className={`inline-flex items-center gap-1 rounded font-bold ${small ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-1'}`}
      style={{ backgroundColor: colors.bg, color: colors.text }}
    >
      {move.contestType}
    </span>
  );
}

const getPokemonKey = (pokemon, index) =>
  pokemon?.uniqueId || pokemon?.id || pokemon?.pokemonId || `${pokemon?.number || 'unknown'}_${pokemon?.name || index}`;

const getPokemonMoveId = (move) => move?.moveId ?? move?.id;

const getMemberPokemonOptions = (member = {}) => {
  if (!member) return [];
  const options = [];
  if (member.partnerPokemon) {
    options.push({ pokemon: member.partnerPokemon, key: getPokemonKey(member.partnerPokemon, 'partner'), labelPrefix: '파트너' });
  }
  const caughtList = Array.isArray(member.caughtPokemon)
    ? member.caughtPokemon
    : Object.values(member.caughtPokemon || {});
  caughtList.forEach((pokemon, index) => {
    if (!pokemon) return;
    const key = getPokemonKey(pokemon, index);
    if (options.some((option) => option.key === key)) return;
    options.push({ pokemon, key, labelPrefix: pokemon.isPartner ? '파트너' : '보유' });
  });
  return options;
};

function MemberParticipantBuilder({ members, contestType, contestMoves, onAdd }) {
  const [memberId, setMemberId] = useState('');
  const [pokemonKey, setPokemonKey] = useState('');

  const memberEntries = useMemo(() => (
    Object.entries(members || {})
      .filter(([, member]) => member && !member.hidden)
      .sort(([, a], [, b]) => String(a?.name || '').localeCompare(String(b?.name || ''), 'ko'))
  ), [members]);

  const selectedMember = memberId ? members?.[memberId] : null;
  const pokemonOptions = useMemo(() => getMemberPokemonOptions(selectedMember), [selectedMember]);
  const selectedPokemon = pokemonOptions.find((option) => option.key === pokemonKey)?.pokemon || null;
  const conditionKey = CONDITION_KEY_BY_CONTEST_TYPE[contestType];
  const conditionValue = Number(selectedPokemon?.condition?.[conditionKey] || 0);

  const selectedMoves = useMemo(() => {
    if (!selectedPokemon) return [];
    const moveIds = (Array.isArray(selectedPokemon.moves) ? selectedPokemon.moves : [])
      .map(getPokemonMoveId)
      .filter((id) => id !== undefined && id !== null);
    return moveIds
      .map((id) => contestMoves.find((move) => String(move.id) === String(id)))
      .filter(Boolean)
      .slice(0, 4);
  }, [contestMoves, selectedPokemon]);

  const handleMemberChange = (nextMemberId) => {
    setMemberId(nextMemberId);
    const nextOptions = getMemberPokemonOptions(members?.[nextMemberId]);
    setPokemonKey(nextOptions[0]?.key || '');
  };

  const handleAdd = () => {
    if (!selectedMember || !selectedPokemon || selectedMoves.length === 0) return;
    onAdd({
      id: nextId(),
      memberId,
      pokemonKey,
      name: selectedMember.name || selectedMember.nickname || memberId,
      pokemonName: formatOwnedPokemonName(selectedPokemon),
      conditionValue,
      moves: selectedMoves,
    });
    setMemberId('');
    setPokemonKey('');
  };

  return (
    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <select value={memberId} onChange={(e) => handleMemberChange(e.target.value)}
          className="border border-gray-300 rounded px-2 py-1.5 text-sm focus:border-indigo-500 focus:outline-none">
          <option value="">멤버 선택</option>
          {memberEntries.map(([id, member]) => (
            <option key={id} value={id}>{member.name || member.nickname || id}</option>
          ))}
        </select>
        <select value={pokemonKey} onChange={(e) => setPokemonKey(e.target.value)} disabled={!selectedMember}
          className="border border-gray-300 rounded px-2 py-1.5 text-sm focus:border-indigo-500 focus:outline-none disabled:bg-gray-100">
          <option value="">포켓몬 선택</option>
          {pokemonOptions.map(({ key, pokemon, labelPrefix }) => (
            <option key={key} value={key}>{labelPrefix} · {formatOwnedPokemonName(pokemon)}</option>
          ))}
        </select>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 whitespace-nowrap">일치 컨디션</span>
          <input type="number" min={0} max={255} value={conditionValue} readOnly
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm bg-white text-gray-700" />
        </div>
      </div>

      {selectedPokemon && selectedMoves.length === 0 && (
        <div className="text-xs text-red-500">이 포켓몬은 콘테스트 데이터가 있는 기술을 배우고 있지 않습니다.</div>
      )}

      {selectedMoves.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedMoves.map((m) => (
            <span key={m.id} className="flex items-center gap-1 bg-white border border-gray-200 rounded px-2 py-1 text-xs">
              {m.name} <MoveBadge move={m} small />
            </span>
          ))}
        </div>
      )}

      <Button variant="primary" size="sm" onClick={handleAdd} disabled={!selectedMember || !selectedPokemon || selectedMoves.length === 0}>
        <Plus size={14} className="mr-1" /> 참가자 추가
      </Button>
    </div>
  );
}

function LogLine({ entry, participantsById }) {
  const nameOf = (id) => participantsById[id]?.name || id;
  switch (entry.type) {
    case 'firstJudging':
      return <div className="text-gray-300">🎲 {nameOf(entry.participantId)}: 1차 심사 2d6 → <b>{entry.roll}</b></div>;
    case 'roundStart':
      return <div className="mt-2 font-bold text-indigo-300">— {entry.round}라운드 시작 (순서: {entry.order.map(nameOf).join(' → ')}) —</div>;
    case 'roundEnd':
      return <div className="text-gray-500 text-xs mb-1">{entry.round}라운드 종료</div>;
    case 'nervous':
      return <div className="text-orange-400">😳 {nameOf(entry.participantId)} 긴장{entry.forced ? '(강제)' : ` (확률 ${entry.chance}%)`}해서 행동 불가</div>;
    case 'skip':
      return <div className="text-gray-500">⏭ {nameOf(entry.participantId)} 이번 턴 행동 불가</div>;
    case 'appeal':
      return (
        <div className={entry.gainedAppeal > 0 ? 'text-pink-400' : 'text-gray-400'}>
          ✨ {nameOf(entry.participantId)}: {entry.moveName} 사용 → 어필 {entry.gainedAppeal >= 0 ? '+' : ''}{entry.gainedAppeal}
          {entry.isPenalty && <span className="text-red-400 text-xs ml-1">(패널티 타입 절반)</span>}
        </div>
      );
    case 'jam':
      return <div className="text-indigo-300">💥 {nameOf(entry.targetId)} 방해 -{entry.amount}</div>;
    case 'jamFail':
      return <div className="text-gray-500">⚔️ {nameOf(entry.participantId)}: {entry.moveName} 사용 → 앞 순서가 없어 방해에 실패했다!</div>;
    case 'liveAppeal':
      return <div className="text-yellow-400 font-bold">🌟 {nameOf(entry.participantId)} 라이브 어필 발동! +5</div>;
    case 'combo':
      return (
        <div className="text-purple-400 font-bold">
          🔗 {nameOf(entry.participantId)} 콤보 성공! 어필+{entry.bonus}
          {entry.bonusJam > 0 && <span className="text-indigo-300"> · 방해+{entry.bonusJam}</span>}
        </div>
      );
    default:
      return null;
  }
}

export default function ContestAdminPanel() {
  const { members = {}, allMoves = [] } = useGame();
  const [contestType, setContestType] = useState(CONTEST_TYPES[0]);
  const [draftParticipants, setDraftParticipants] = useState([]);
  const [state, setState] = useState(null);
  const [error, setError] = useState('');
  const [selectedTargetIds, setSelectedTargetIds] = useState([]);
  const [diceValueInput, setDiceValueInput] = useState('');
  const [firstJudgingRolls, setFirstJudgingRolls] = useState({});
  const [forceNervousResult, setForceNervousResult] = useState(undefined);
  const [selectedMoveId, setSelectedMoveId] = useState(null);

  const participantsById = useMemo(() => {
    const source = state ? state.participants : draftParticipants;
    return Object.fromEntries(source.map((p) => [p.id, p]));
  }, [state, draftParticipants]);

  const startContest = () => {
    if (draftParticipants.length < 2) return;
    const s0 = createContestState(contestType, draftParticipants);
    const rolls = Object.fromEntries(
      Object.entries(firstJudgingRolls)
        .map(([id, v]) => [id, Number(v)])
        .filter(([, v]) => Number.isInteger(v) && v >= 2 && v <= 12)
    );
    setState(runFirstJudging(s0, { rolls }));
  };

  const resetContest = () => {
    setState(null);
    setError('');
    setSelectedTargetIds([]);
    setDiceValueInput('');
    setFirstJudgingRolls({});
    setForceNervousResult(undefined);
    setSelectedMoveId(null);
  };

  const actor = state ? getCurrentActor(state) : null;

  const toggleTarget = (id) => {
    setSelectedTargetIds((prev) => (
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    ));
  };

  const handleUseMove = (move) => {
    if (!actor) return;
    setError('');
    try {
      const diceValue = Number(diceValueInput);
      const next = advanceTurn(state, {
        moveId: move.id,
        targetId: selectedTargetIds[0],
        targetIds: selectedTargetIds,
        diceValue: diceValueInput && diceValue >= 1 && diceValue <= 6 ? diceValue : undefined,
        forceNervousResult,
      });
      setState(next);
      setSelectedTargetIds([]);
      setDiceValueInput('');
      setForceNervousResult(undefined);
      setSelectedMoveId(null);
    } catch (e) {
      setError(e.message);
    }
  };

  const standings = state ? getStandings(state) : [];
  const done = state ? isContestDone(state) : false;
  const nervousChance = actor ? calcNervousChance({
    position: state.turnPointer,
    totalParticipants: state.order.length,
    conditionValue: actor.conditionValue,
    stars: actor.stars,
  }) : 0;
  const contestMoves = useMemo(() => (
    (allMoves.length ? allMoves : movesData.moves)
      .filter((m) => !!m.contestType && !!m.contestEffect)
  ), [allMoves]);

  return (
    <Card className="p-6">
      <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2 mb-4">
        <Trophy size={22} /> 콘테스트 자동 진행 도구
      </h3>

      {!state && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-gray-700">콘테스트 타입</span>
            <select value={contestType} onChange={(e) => setContestType(e.target.value)}
              className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none">
              {CONTEST_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <MemberParticipantBuilder
            members={members}
            contestType={contestType}
            contestMoves={contestMoves}
            onAdd={(p) => setDraftParticipants((prev) => [...prev, p])}
          />

          {draftParticipants.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-gray-700">참가자 ({draftParticipants.length}명)</h4>
              <p className="text-xs text-gray-500">
                1차 심사(2D6) 다이스 값 직접 입력 - 비워두면 무작위로 굴립니다
              </p>
              {draftParticipants.map((p) => (
                <div key={p.id} className="flex items-center justify-between bg-white border border-gray-200 rounded px-3 py-2 text-sm">
                  <span><b>{p.name}</b> {p.pokemonName && `(${p.pokemonName})`} · 컨디션 {p.conditionValue} · 기술 {p.moves.length}개</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">값:</span>
                    <input
                      type="number"
                      min={2}
                      max={12}
                      value={firstJudgingRolls[p.id] ?? ''}
                      onChange={(e) => setFirstJudgingRolls((prev) => ({ ...prev, [p.id]: e.target.value }))}
                      placeholder="2~12"
                      className="w-16 border border-gray-300 rounded px-2 py-1 text-xs focus:border-indigo-500 focus:outline-none"
                    />
                    <button onClick={() => setDraftParticipants((prev) => prev.filter((x) => x.id !== p.id))} className="text-gray-400 hover:text-red-500">
                      <X size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <Button variant="primary" onClick={startContest} disabled={draftParticipants.length < 2}>
            1차 심사 진행 (2명 이상 필요)
          </Button>
        </div>
      )}

      {state && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              콘테스트 타입 <MoveBadge move={{ contestType }} />
              {!done && <span className="ml-3 font-bold text-indigo-700">{state.round}/{MAX_ROUND} 라운드</span>}
            </div>
            <Button variant="secondary" size="sm" onClick={resetContest}>새로 시작</Button>
          </div>

          {/* 실시간 순위 */}
          <div className="grid gap-1">
            {standings.map((p) => (
              <div key={p.id} className={`flex items-center justify-between rounded px-3 py-1.5 text-sm ${done && p.rank === 1 ? 'bg-yellow-100 border border-yellow-300' : 'bg-gray-50'}`}>
                <span className="flex items-center gap-2">
                  <b>{p.rank}위</b> {p.name}
                  {p.stars > 0 && <span className="text-yellow-500">{'☆'.repeat(p.stars)}</span>}
                  {done && p.rank === 1 && <span className="flex items-center gap-1 text-yellow-700 font-bold"><Sparkles size={14} />리본 획득!</span>}
                </span>
                <span className="font-bold text-pink-600">어필 {p.totalAppeal}</span>
              </div>
            ))}
          </div>

          {!done && actor && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 space-y-3">
              <div className="font-bold text-indigo-800 flex items-center gap-2">
                {actor.name}의 차례 (기술을 선택하면 긴장/어필/방해/콤보가 자동 계산됩니다)
                {actor.comboWaiting && (
                  <span className="flex items-center gap-1 text-xs font-semibold text-purple-600 bg-purple-100 rounded-full px-2 py-0.5">
                    <Link2 size={12} /> 콤보 대기 중 ({actor.moves.find((m) => m.id === actor.comboWaiting.moveId)?.name || actor.comboWaiting.moveId})
                  </span>
                )}
              </div>

              <div className="space-y-1">
                <p className="text-xs font-semibold text-indigo-700">
                  긴장 판정 직접 지정 (현재 확률 {nervousChance}%, 자동으로 두면 이 확률로 무작위 판정)
                </p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: '자동', value: undefined },
                    { label: '긴장', value: true },
                    { label: '긴장 아님', value: false },
                  ].map(({ label, value }) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => setForceNervousResult(value)}
                      className={`rounded-full px-3 py-1 text-xs border ${
                        forceNervousResult === value
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white text-gray-600 border-gray-300'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {state.participants.length > 1 && (
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-indigo-700">
                    대상 지정 ("지정한 포켓몬" 효과나 콤보 방해에 사용, 필요 없는 기술이면 무시됩니다)
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {state.participants.filter((p) => p.id !== actor.id).map((p) => (
                      <label
                        key={p.id}
                        className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs border cursor-pointer ${
                          selectedTargetIds.includes(p.id)
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-white text-gray-600 border-gray-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="hidden"
                          checked={selectedTargetIds.includes(p.id)}
                          onChange={() => toggleTarget(p.id)}
                        />
                        {p.name}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <p className="text-xs font-semibold text-indigo-700">
                  다이스 값 직접 입력 ("무작위로 [1D6]하트가 추가" 효과에 사용, 비워두면 무작위로 굴립니다)
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">값:</span>
                  <input
                    type="number"
                    min={1}
                    max={6}
                    value={diceValueInput}
                    onChange={(e) => setDiceValueInput(e.target.value)}
                    placeholder="1~6"
                    className="w-20 border border-gray-300 rounded px-2 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {actor.moves.map((m) => {
                  const usable = canUseMove(state, actor.id, m.id, allMoves.length ? allMoves : movesData.moves);
                  const isComboFollowUp = actor.comboWaiting && isValidComboFollowUp(actor.comboWaiting.moveId, m.id);
                  const needsTarget = TARGETED_EFFECTS.has(m.contestEffect);
                  const needsDice = DICE_EFFECTS.has(m.contestEffect);
                  const isSelected = selectedMoveId === m.id;
                  return (
                    <button
                      key={m.id}
                      disabled={!usable}
                      onClick={() => setSelectedMoveId(m.id)}
                      className={`flex flex-col items-start gap-1 rounded-lg border-2 px-3 py-2 text-left text-xs transition-colors w-48 ${
                        !usable ? 'bg-gray-100 border-gray-200 text-gray-300 cursor-not-allowed' :
                        isSelected ? 'bg-indigo-50 border-indigo-500 ring-2 ring-indigo-300' :
                        isComboFollowUp ? 'bg-purple-50 border-purple-400 hover:border-purple-500' :
                        'bg-white border-gray-300 hover:border-indigo-400'
                      }`}
                    >
                      <span className="font-bold text-sm flex items-center gap-1">
                        {m.name}
                        {isComboFollowUp && <Link2 size={12} className="text-purple-500" />}
                        {needsTarget && (
                          <span
                            className={`text-[10px] font-semibold ${selectedTargetIds.length ? 'text-indigo-500' : 'text-red-400'}`}
                            title="대상 지정 필요"
                          >
                            🎯{selectedTargetIds.length ? '' : '!'}
                          </span>
                        )}
                        {needsDice && (
                          <span
                            className={`text-[10px] font-semibold ${diceValueInput ? 'text-indigo-500' : 'text-gray-400'}`}
                            title="다이스 값 직접 입력 가능 (비워두면 무작위)"
                          >
                            🎲{diceValueInput || ''}
                          </span>
                        )}
                      </span>
                      <span className="flex items-center gap-1"><MoveBadge move={m} small /> 어필{m.contestAppeals} 방해{m.contestJam}</span>
                      <span className="text-[10px] text-gray-500 whitespace-normal">{getContestEffectKo(m.contestEffect)}</span>
                    </button>
                  );
                })}
              </div>

              <Button
                variant="primary"
                onClick={() => {
                  const move = actor.moves.find((m) => m.id === selectedMoveId);
                  if (move) handleUseMove(move);
                }}
                disabled={!selectedMoveId}
              >
                확인
              </Button>

              {error && <div className="text-red-500 text-xs">{error}</div>}
            </div>
          )}

          {done && (
            <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4 text-center">
              <div className="text-lg font-bold text-yellow-800">🎀 우승: {standings[0]?.name} 🎀</div>
            </div>
          )}

          {/* 로그 */}
          <div className="bg-gray-900 text-gray-100 rounded-lg p-3 text-xs max-h-80 overflow-y-auto font-mono space-y-0.5">
            {state.log.map((entry, idx) => (
              <LogLine key={idx} entry={entry} participantsById={participantsById} />
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
