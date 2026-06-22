// src/components/views/admin/member/MemberInfoTab.jsx
import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Upload, Trash2, X } from 'lucide-react';

function ImageUploadSlot({ label, description, currentUrl, onUpload, onDelete, uploading }) {
  const inputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('이미지 파일만 업로드할 수 있습니다.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('파일 크기는 5MB 이하여야 합니다.');
      return;
    }
    onUpload(file);
    e.target.value = '';
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="text-xs font-bold text-gray-600 uppercase tracking-wide">{label}</div>
      <div className="text-xs text-gray-400">{description}</div>

      <div
        className="relative overflow-hidden rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 flex items-center justify-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-colors group"
        style={{ aspectRatio: label === '두상' ? '1/1' : '2/3', minHeight: label === '두상' ? 120 : 180 }}
        onClick={() => !uploading && inputRef.current?.click()}
      >
        {currentUrl ? (
          <>
            <img src={currentUrl} alt={label} className="w-full h-full object-cover object-top" />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
              <span className="text-white text-xs font-bold">클릭하여 교체</span>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 text-gray-300 p-4">
            {uploading ? (
              <div className="text-xs text-indigo-500 font-semibold">업로드 중...</div>
            ) : (
              <>
                <Upload size={22} />
                <span className="text-xs font-medium">클릭하여 업로드</span>
              </>
            )}
          </div>
        )}
      </div>

      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} disabled={uploading} />

      {currentUrl && (
        <button
          onClick={onDelete}
          disabled={uploading}
          className="flex items-center justify-center gap-1.5 text-xs text-red-500 hover:text-red-700 py-1 border border-red-200 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
        >
          <Trash2 size={12} />
          이미지 삭제
        </button>
      )}
    </div>
  );
}

function TitleManagePopup({ member, titles, onGrantTitle, onRevokeTitle, onClose }) {
  const [titleToGrant, setTitleToGrant] = useState('');
  const assignedTitles = member.assignedTitles || [];
  const availableToGrant = titles.filter(t => !assignedTitles.includes(t.id));

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold">🏅 {member.name}님 칭호 관리</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* 부여 드롭다운 */}
        <div className="flex gap-2 mb-4">
          <select
            value={titleToGrant}
            onChange={e => setTitleToGrant(e.target.value)}
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
          >
            <option value="">칭호 선택...</option>
            {availableToGrant.map(t => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>
          <button
            type="button"
            disabled={!titleToGrant}
            onClick={() => { onGrantTitle?.(member.id, titleToGrant); setTitleToGrant(''); }}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            부여
          </button>
        </div>

        {/* 보유 칭호 목록 */}
        <div className="min-h-[60px]">
          <p className="text-xs font-semibold text-gray-500 mb-2">보유 칭호</p>
          {assignedTitles.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {assignedTitles.map(tid => {
                const t = titles.find(x => x.id === tid);
                if (!t) return null;
                return (
                  <span key={tid} className="inline-flex items-center gap-1 bg-indigo-100 text-indigo-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                    {t.label}
                    <button
                      type="button"
                      onClick={() => onRevokeTitle?.(member.id, tid)}
                      className="ml-0.5 text-indigo-400 hover:text-red-600 transition-colors leading-none"
                      aria-label={`${t.label} 회수`}
                    >
                      ×
                    </button>
                  </span>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-gray-400">부여된 칭호가 없습니다.</p>
          )}
        </div>

        <button
          onClick={onClose}
          className="mt-5 w-full bg-gray-100 text-gray-700 py-2 rounded-lg hover:bg-gray-200 text-sm font-semibold transition-colors"
        >
          닫기
        </button>
      </div>
    </div>,
    document.body
  );
}

function MemberInfoTab({
  member,
  trainer,
  onResetWalk,
  onToggleAdmin,
  onUpdateMoney,
  onUpdateTrainerExp,
  onGrantTitle,
  onRevokeTitle,
  onUpdateWalkCount,
  onUpdateMaxWalkCount,
  onDeleteMember,
  onUploadImage,
  onDeleteImage,
  titles = [],
}) {
  const [moneyInput, setMoneyInput] = useState(member.money || 0);
  const [expInput, setExpInput] = useState(member.trainerExp || 0);
  const [editWalkCount, setEditWalkCount] = useState(member.dailyWalks);
  const [editMaxWalkCount, setEditMaxWalkCount] = useState(member.maxDailyWalks);
  const [uploading, setUploading] = useState({ face: false, body: false });
  const [titlePopupOpen, setTitlePopupOpen] = useState(false);

  const handleUpload = async (file, type) => {
    if (!onUploadImage) return;
    setUploading(prev => ({ ...prev, [type]: true }));
    try {
      await onUploadImage(member.id, file, type);
    } finally {
      setUploading(prev => ({ ...prev, [type]: false }));
    }
  };

  const handleDelete = async (type) => {
    if (!onDeleteImage) return;
    if (!window.confirm(`${type === 'face' ? '두상' : '전신'} 이미지를 삭제할까요?`)) return;
    await onDeleteImage(member.id, type);
  };

  const assignedTitles = member.assignedTitles || [];

  return (
    <>
      {titlePopupOpen && (
        <TitleManagePopup
          member={member}
          titles={titles}
          onGrantTitle={onGrantTitle}
          onRevokeTitle={onRevokeTitle}
          onClose={() => setTitlePopupOpen(false)}
        />
      )}

      <div className="grid grid-cols-2 gap-5">
        {/* 왼쪽: 기본 정보 + 프로필 이미지 */}
        <div className="space-y-3">
          {/* 기본 정보 */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-bold text-base mb-2">📋 기본 정보</h3>
            <div className="space-y-1.5 text-sm">
              <div><span className="text-gray-500">회원 ID:</span><span className="ml-2 font-medium">{member.id}</span></div>
              <div><span className="text-gray-500">이름:</span><span className="ml-2 font-medium">{member.name}</span></div>
              <div><span className="text-gray-500">포켓몬 수:</span><span className="ml-2 font-medium">{(member.caughtPokemon || []).filter(p => p !== null && p !== undefined).length}마리</span></div>
            </div>
          </div>

          {/* 프로필 이미지 */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-bold text-base mb-3">🖼️ 프로필 이미지</h3>
            <div className="grid grid-cols-2 gap-4">
              <ImageUploadSlot
                label="두상"
                description="증명사진 (정방형)"
                currentUrl={member.profileImage}
                onUpload={(file) => handleUpload(file, 'face')}
                onDelete={() => handleDelete('face')}
                uploading={uploading.face}
              />
              <ImageUploadSlot
                label="전신"
                description="전신샷 (세로형)"
                currentUrl={member.profileImageFull}
                onUpload={(file) => handleUpload(file, 'body')}
                onDelete={() => handleDelete('body')}
                uploading={uploading.body}
              />
            </div>
          </div>
        </div>

        {/* 오른쪽: 칭호 버튼 + 탐험 횟수 + 소지금 + 관리 */}
        <div className="space-y-3">
          {/* 칭호 */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-bold text-base">🏅 칭호</h3>
              <button
                type="button"
                onClick={() => setTitlePopupOpen(true)}
                className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 font-semibold transition-colors"
              >
                칭호 관리
              </button>
            </div>
            {assignedTitles.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {assignedTitles.map(tid => {
                  const t = titles.find(x => x.id === tid);
                  if (!t) return null;
                  return (
                    <span key={tid} className={`text-xs font-semibold px-2.5 py-1 rounded-full ${member.title === tid ? 'bg-indigo-600 text-white' : 'bg-indigo-100 text-indigo-700'}`}>
                      {t.label}
                    </span>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-gray-400 mt-1">부여된 칭호가 없습니다.</p>
            )}
          </div>

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
    </>
  );
}

export default MemberInfoTab;
