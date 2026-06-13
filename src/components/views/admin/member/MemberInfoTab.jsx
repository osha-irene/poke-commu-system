// src/components/views/admin/member/MemberInfoTab.jsx
import React, { useState } from 'react';

function MemberInfoTab({
  member,
  trainer,
  onResetWalk,
  onToggleAdmin,
  onUpdateMoney,
  onUpdateWalkCount,
  onUpdateMaxWalkCount,
  onDeleteMember
}) {
  const [moneyInput, setMoneyInput] = useState(member.money || 0);
  const [editWalkCount, setEditWalkCount] = useState(member.dailyWalks);
  const [editMaxWalkCount, setEditMaxWalkCount] = useState(member.maxDailyWalks);

  return (
    <div className="grid grid-cols-2 gap-5">
      {/* 왼쪽: 기본 정보 + 탐험 횟수 */}
      <div className="space-y-4">
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-bold text-base mb-3">📋 기본 정보</h3>
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-gray-600">회원 ID:</span>
              <span className="ml-2 font-medium">{member.id}</span>
            </div>
            <div>
              <span className="text-gray-600">이름:</span>
              <span className="ml-2 font-medium">{member.name}</span>
            </div>
            <div>
              <span className="text-gray-600">포켓몬 수:</span>
              <span className="ml-2 font-medium">{(member.caughtPokemon || []).filter(p => p !== null && p !== undefined).length}마리</span>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
          <h3 className="font-bold text-base">🚶 탐험 횟수</h3>
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-gray-700">오늘의 탐험 횟수</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                max="999"
                value={editWalkCount}
                onChange={(e) => setEditWalkCount(parseInt(e.target.value) || 0)}
                className="w-20 px-2 py-1.5 border border-gray-300 rounded text-sm"
              />
              <span className="text-sm text-gray-600">/ {member.maxDailyWalks}회</span>
              <button
                onClick={() => {
                  if (onUpdateWalkCount) {
                    onUpdateWalkCount(member.id, editWalkCount);
                    alert(`${member.name}님의 탐험횟수가 ${editWalkCount}회로 변경되었습니다!`);
                  }
                }}
                className="bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 transition-colors text-sm font-semibold"
              >
                적용
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-gray-700">⚙️ 최대 탐험 횟수 (일일 제한)</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                max="999"
                value={editMaxWalkCount}
                onChange={(e) => setEditMaxWalkCount(parseInt(e.target.value) || 5)}
                className="w-20 px-2 py-1.5 border border-gray-300 rounded text-sm"
              />
              <span className="text-sm text-gray-600">회</span>
              <button
                onClick={() => {
                  if (onUpdateMaxWalkCount) {
                    onUpdateMaxWalkCount(member.id, editMaxWalkCount);
                    alert(`${member.name}님의 최대 탐험횟수가 ${editMaxWalkCount}회로 변경되었습니다!`);
                  }
                }}
                className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors text-sm font-semibold"
              >
                적용
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 오른쪽: 소지금액 + 관리 기능 */}
      <div className="space-y-4">
        <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4">
          <h3 className="font-bold text-base mb-3">💰 소지금액 관리</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                현재 금액: <span className="text-yellow-600 font-bold">{member.money?.toLocaleString() || 0}원</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={moneyInput}
                  onChange={(e) => setMoneyInput(parseInt(e.target.value) || 0)}
                  className="flex-1 px-3 py-1.5 border-2 border-gray-300 rounded-lg focus:border-yellow-500 focus:outline-none text-sm"
                  placeholder="금액 입력"
                  min="0"
                />
                <button
                  onClick={() => {
                    onUpdateMoney(member.id, moneyInput);
                    alert(`${member.name}님의 소지금액이 ${moneyInput.toLocaleString()}원으로 변경되었습니다!`);
                  }}
                  className="bg-yellow-600 text-white px-4 py-1.5 rounded-lg hover:bg-yellow-700 transition-colors font-medium text-sm"
                >
                  변경
                </button>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setMoneyInput(moneyInput + 1000)}
                className="flex-1 bg-gray-100 text-gray-700 px-2 py-1.5 rounded-lg hover:bg-gray-200 transition-colors text-sm"
              >
                +1,000
              </button>
              <button
                onClick={() => setMoneyInput(moneyInput + 10000)}
                className="flex-1 bg-gray-100 text-gray-700 px-2 py-1.5 rounded-lg hover:bg-gray-200 transition-colors text-sm"
              >
                +10,000
              </button>
              <button
                onClick={() => setMoneyInput(moneyInput + 100000)}
                className="flex-1 bg-gray-100 text-gray-700 px-2 py-1.5 rounded-lg hover:bg-gray-200 transition-colors text-sm"
              >
                +100,000
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="font-bold text-base">관리 기능</h3>
          <button
            onClick={() => onResetWalk(member.id, member.name)}
            className="w-full bg-green-100 text-green-700 py-2.5 rounded-lg hover:bg-green-200 font-semibold text-sm"
          >
            탐험 횟수 리셋
          </button>

          {trainer.isSuperAdmin && member.id !== 'admin' && (
            <button
              onClick={() => onToggleAdmin(member.id, member.name)}
              className={`w-full py-2.5 rounded-lg font-semibold text-sm ${
                member.isAdmin
                  ? 'bg-red-100 text-red-700 hover:bg-red-200'
                  : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
              }`}
            >
              {member.isAdmin ? '관리자 권한 제거' : '관리자 권한 부여'}
            </button>
          )}

          {trainer.isSuperAdmin && trainer.id !== member.id && !member.isSuperAdmin && (
            <button
              onClick={() => onDeleteMember?.(member.id, member.name)}
              className="w-full bg-red-600 text-white py-2.5 rounded-lg hover:bg-red-700 font-semibold text-sm"
            >
              회원 삭제
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default MemberInfoTab;
