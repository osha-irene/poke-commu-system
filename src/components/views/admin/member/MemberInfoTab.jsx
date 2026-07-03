// src/components/views/admin/member/MemberInfoTab.jsx
import React, { useEffect, useState } from 'react';

function MemberInfoTab({
  member,
  trainer,
  onResetWalk,
  onToggleAdmin,
  onToggleNPC,
  onToggleHidden,
  onUpdateNpcSettings,
  onUpdateMoney,
  onUpdateTrainerExp,
  onUpdateWalkCount,
  onUpdateMaxWalkCount,
  onDeleteMember,
  onUpdateBadgePieces,
  onUpdateRibbonPieces,
  onUpdateRibbonTypes,
}) {
  const [moneyInput, setMoneyInput] = useState(member.money || 0);
  const [expInput, setExpInput] = useState(member.trainerExp || 0);
  const [editWalkCount, setEditWalkCount] = useState(member.dailyWalks);
  const [editMaxWalkCount, setEditMaxWalkCount] = useState(member.maxDailyWalks);
  const [npcOrderInput, setNpcOrderInput] = useState(member.npcOrder || '');
  const [badgePieces, setBadgePieces] = useState(() => member.badgePieces || Array(8).fill(false));
  const [ribbonPieces, setRibbonPieces] = useState(() => member.ribbonPieces || Array(8).fill(false));
  const [ribbonTypes, setRibbonTypes] = useState(() => member.ribbonTypes || Array(8).fill(null));

  useEffect(() => {
    setMoneyInput(Number(member.money) || 0);
    setExpInput(Number(member.trainerExp) || 0);
    setEditWalkCount(Number(member.dailyWalks) || 0);
    setEditMaxWalkCount(Number(member.maxDailyWalks) || 5);
  }, [member.id, member.money, member.trainerExp, member.dailyWalks, member.maxDailyWalks]);

  useEffect(() => {
    setBadgePieces(member.badgePieces || Array(8).fill(false));
    setRibbonPieces(member.ribbonPieces || Array(8).fill(false));
    setRibbonTypes(member.ribbonTypes || Array(8).fill(null));
  }, [member.id]);

  const RIBBON_TYPE_OPTIONS = [
    { value: 'cute',         label: '귀여움' },
    { value: 'intelligence', label: '슬기로움' },
    { value: 'powerful',     label: '강인함' },
    { value: 'cool',         label: '근사함' },
    { value: 'beauty',       label: '아름다움' },
  ];

  useEffect(() => {
    setNpcOrderInput(member.npcOrder || '');
  }, [member.id, member.npcOrder]);

  return (
    <div className="grid grid-cols-2 gap-5">
      {/* 왼쪽: 기본 정보 */}
      <div className="space-y-3">
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-bold text-base mb-2">📋 기본 정보</h3>
          <div className="space-y-1.5 text-sm">
            <div><span className="text-gray-500">회원 ID:</span><span className="ml-2 font-medium">{member.id}</span></div>
            <div><span className="text-gray-500">이름:</span><span className="ml-2 font-medium">{member.name}</span></div>
            <div><span className="text-gray-500">포켓몬 수:</span><span className="ml-2 font-medium">{(member.caughtPokemon || []).filter(p => p !== null && p !== undefined).length}마리</span></div>
            {trainer.isAdmin && (
              <div className="pt-1 space-y-1.5">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={!!member.isNPC}
                    onChange={() => onToggleNPC?.(member.id)}
                    className="w-4 h-4 rounded accent-indigo-600"
                  />
                  <span className="text-gray-700 font-medium">NPC 캐릭터</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={!!member.hidden}
                    onChange={() => onToggleHidden?.(member.id)}
                    className="w-4 h-4 rounded accent-red-600"
                  />
                  <span className="text-gray-700 font-medium">목록에서 숨김</span>
                </label>
              </div>
            )}
            {trainer.isAdmin && member.isNPC && (
              <div className="pt-3 space-y-3 border-t border-gray-200">
                {/* 순서/배지 */}
                <label className="block">
                  <span className="text-xs font-semibold text-gray-600 mb-1 block">NPC 나열 순서 / 배지 번호</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      value={npcOrderInput}
                      onChange={(e) => setNpcOrderInput(e.target.value)}
                      className="w-24 px-2 py-1.5 border border-gray-300 rounded text-sm"
                      placeholder="1"
                    />
                    <button
                      type="button"
                      onClick={() => onUpdateNpcSettings?.(member.id, { npcOrder: npcOrderInput })}
                      className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors text-sm font-semibold"
                    >저장</button>
                  </div>
                </label>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={!!member.npcPrivate}
                    onChange={(e) => onUpdateNpcSettings?.(member.id, { npcPrivate: e.target.checked })}
                    className="w-4 h-4 rounded accent-indigo-600"
                  />
                  <span className="text-gray-700 font-medium">비공개 배지 표시</span>
                </label>

              </div>
            )}
          </div>
        </div>

        {/* 뱃지 수집 현황 */}
        <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4">
          <h3 className="font-bold text-base mb-3">🏅 뱃지 수집 현황</h3>
          <div className="flex gap-2 flex-wrap">
            {badgePieces.map((checked, i) => (
              <button
                key={i}
                onClick={() => {
                  const next = [...badgePieces];
                  next[i] = !next[i];
                  setBadgePieces(next);
                  onUpdateBadgePieces?.(member.id, next);
                }}
                className={`w-10 h-10 rounded-lg border-2 font-bold text-sm transition-all ${
                  checked
                    ? 'bg-yellow-400 border-yellow-500 text-white'
                    : 'bg-white border-gray-300 text-gray-400 hover:border-yellow-400'
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-2">{badgePieces.filter(Boolean).length} / 8 수집</p>
        </div>

        {/* 리본 수집 현황 */}
        <div className="bg-pink-50 border-2 border-pink-200 rounded-xl p-4">
          <h3 className="font-bold text-base mb-3">🎀 리본 수집 현황</h3>
          <div className="grid grid-cols-2 gap-x-3 gap-y-2">
            {[0, 1].map(col => (
              <div key={col} className="space-y-2">
                {[0,1,2,3].map(row => {
                  const i = col * 4 + row;
                  return (
                    <div key={i} className="flex items-center gap-1.5">
                      <span className={`w-7 h-7 rounded-lg border-2 font-bold text-xs flex-shrink-0 flex items-center justify-center ${ribbonTypes[i] ? 'bg-pink-400 border-pink-500 text-white' : 'bg-white border-gray-200 text-gray-400'}`}>
                        {i + 1}
                      </span>
                      <select
                        value={ribbonTypes[i] || ''}
                        onChange={e => {
                          const next = [...ribbonTypes];
                          next[i] = e.target.value || null;
                          setRibbonTypes(next);
                          onUpdateRibbonTypes?.(member.id, next);
                        }}
                        className="flex-1 text-xs border border-gray-200 rounded-lg px-1.5 py-1 bg-white text-gray-700 focus:outline-none focus:border-pink-400 min-w-0"
                      >
                        <option value="">— 선택 —</option>
                        {RIBBON_TYPE_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-2">{ribbonPieces.filter(Boolean).length} / 8 수집</p>
        </div>
      </div>

      {/* 오른쪽: 탐험 횟수 + 소지금 + 관리 */}
      <div className="space-y-3">
        {/* 탐험 횟수 */}
        <div className="bg-gray-50 rounded-lg p-4 space-y-2.5">
          <h3 className="font-bold text-base">🚶 탐험 횟수</h3>
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">오늘의 탐험 횟수</label>
            <div className="flex items-center gap-2">
              <input type="number" min="0" max="999" value={editWalkCount}
                onChange={(e) => setEditWalkCount(parseInt(e.target.value) || 0)}
                className="w-20 px-2 py-1.5 border border-gray-300 rounded text-sm" />
              <span className="text-sm text-gray-500">/ {member.maxDailyWalks}회</span>
              <button onClick={() => { if (onUpdateWalkCount) { onUpdateWalkCount(member.id, editWalkCount); alert(`${member.name}님의 탐험횟수가 ${editWalkCount}회로 변경되었습니다!`); } }}
                className="bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 transition-colors text-sm font-semibold">적용</button>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">최대 탐험 횟수 (일일 제한)</label>
            <div className="flex items-center gap-2">
              <input type="number" min="1" max="999" value={editMaxWalkCount}
                onChange={(e) => setEditMaxWalkCount(parseInt(e.target.value) || 5)}
                className="w-20 px-2 py-1.5 border border-gray-300 rounded text-sm" />
              <span className="text-sm text-gray-500">회</span>
              <button onClick={() => { if (onUpdateMaxWalkCount) { onUpdateMaxWalkCount(member.id, editMaxWalkCount); alert(`${member.name}님의 최대 탐험횟수가 ${editMaxWalkCount}회로 변경되었습니다!`); } }}
                className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors text-sm font-semibold">적용</button>
            </div>
          </div>
        </div>

        {/* 소지금액 */}
        <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4">
          <h3 className="font-bold text-base mb-2">💰 소지금액 관리</h3>
          <label className="block text-sm text-gray-700 mb-1.5">
            현재 금액: <span className="text-yellow-600 font-bold">{member.money?.toLocaleString() || 0}원</span>
          </label>
          <div className="flex gap-2 mb-2">
            <input type="number" value={moneyInput} onChange={(e) => setMoneyInput(parseInt(e.target.value) || 0)}
              className="flex-1 px-3 py-1.5 border-2 border-gray-300 rounded-lg focus:border-yellow-500 focus:outline-none text-sm" placeholder="금액 입력" min="0" />
            <button onClick={() => { onUpdateMoney(member.id, moneyInput); alert(`${member.name}님의 소지금액이 ${moneyInput.toLocaleString()}원으로 변경되었습니다!`); }}
              className="bg-yellow-600 text-white px-4 py-1.5 rounded-lg hover:bg-yellow-700 transition-colors font-medium text-sm">변경</button>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setMoneyInput(moneyInput + 1000)} className="flex-1 bg-gray-100 text-gray-700 px-2 py-1 rounded-lg hover:bg-gray-200 transition-colors text-xs">+1,000</button>
            <button onClick={() => setMoneyInput(moneyInput + 10000)} className="flex-1 bg-gray-100 text-gray-700 px-2 py-1 rounded-lg hover:bg-gray-200 transition-colors text-xs">+10,000</button>
            <button onClick={() => setMoneyInput(moneyInput + 100000)} className="flex-1 bg-gray-100 text-gray-700 px-2 py-1 rounded-lg hover:bg-gray-200 transition-colors text-xs">+100,000</button>
          </div>
        </div>

        {/* 트레이너 경험치 */}
        <div className="bg-indigo-50 border-2 border-indigo-200 rounded-xl p-4">
          <h3 className="font-bold text-base mb-2">⭐ 트레이너 경험치 관리</h3>
          <label className="block text-sm text-gray-700 mb-1.5">
            현재 경험치: <span className="text-indigo-600 font-bold">{(member.trainerExp || 0).toLocaleString()}</span>
          </label>
          <div className="flex gap-2 mb-2">
            <input type="number" value={expInput} onChange={(e) => setExpInput(parseInt(e.target.value) || 0)}
              className="flex-1 px-3 py-1.5 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none text-sm" placeholder="경험치 입력" min="0" />
            <button onClick={() => { onUpdateTrainerExp(member.id, expInput); alert(`${member.name}님의 경험치가 ${expInput.toLocaleString()}으로 변경되었습니다!`); }}
              className="bg-indigo-600 text-white px-4 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors font-medium text-sm">변경</button>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setExpInput(expInput + 100)} className="flex-1 bg-gray-100 text-gray-700 px-2 py-1 rounded-lg hover:bg-gray-200 transition-colors text-xs">+100</button>
            <button onClick={() => setExpInput(expInput + 500)} className="flex-1 bg-gray-100 text-gray-700 px-2 py-1 rounded-lg hover:bg-gray-200 transition-colors text-xs">+500</button>
            <button onClick={() => setExpInput(expInput + 1000)} className="flex-1 bg-gray-100 text-gray-700 px-2 py-1 rounded-lg hover:bg-gray-200 transition-colors text-xs">+1,000</button>
          </div>
        </div>

        {/* 관리 기능 */}
        <div className="space-y-2">
          <h3 className="font-bold text-base">관리 기능</h3>
          <button onClick={() => onResetWalk(member.id, member.name)}
            className="w-full bg-green-100 text-green-700 py-2.5 rounded-lg hover:bg-green-200 font-semibold text-sm">탐험 횟수 리셋</button>
          {trainer.isSuperAdmin && member.id !== 'admin' && (
            <button onClick={() => onToggleAdmin(member.id, member.name)}
              className={`w-full py-2.5 rounded-lg font-semibold text-sm ${member.isAdmin ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'}`}>
              {member.isAdmin ? '관리자 권한 제거' : '관리자 권한 부여'}
            </button>
          )}
          {trainer.isSuperAdmin && trainer.id !== member.id && !member.isSuperAdmin && (
            <button onClick={() => onDeleteMember?.(member.id, member.name)}
              className="w-full bg-red-600 text-white py-2.5 rounded-lg hover:bg-red-700 font-semibold text-sm">회원 삭제</button>
          )}
        </div>
      </div>
    </div>
  );
}

export default MemberInfoTab;
