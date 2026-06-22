import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Upload, Trash2, X } from 'lucide-react';
import { getDatabase, ref, update } from 'firebase/database';

function ImageUploadSlot({ label, description, currentUrl, onUpload, onDelete, uploading }) {
  const inputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { alert('이미지 파일만 업로드할 수 있습니다.'); return; }
    if (file.size > 5 * 1024 * 1024) { alert('파일 크기는 5MB 이하여야 합니다.'); return; }
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
            {uploading
              ? <div className="text-xs text-indigo-500 font-semibold">업로드 중...</div>
              : <><Upload size={22} /><span className="text-xs font-medium">클릭하여 업로드</span></>
            }
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
          <Trash2 size={12} />이미지 삭제
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
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors"><X size={20} /></button>
        </div>
        <div className="flex gap-2 mb-4">
          <select
            value={titleToGrant}
            onChange={e => setTitleToGrant(e.target.value)}
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
          >
            <option value="">칭호 선택...</option>
            {availableToGrant.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
          <button
            type="button"
            disabled={!titleToGrant}
            onClick={() => { onGrantTitle?.(member.id, titleToGrant); setTitleToGrant(''); }}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >부여</button>
        </div>
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
                    >×</button>
                  </span>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-gray-400">부여된 칭호가 없습니다.</p>
          )}
        </div>
        <button onClick={onClose} className="mt-5 w-full bg-gray-100 text-gray-700 py-2 rounded-lg hover:bg-gray-200 text-sm font-semibold transition-colors">닫기</button>
      </div>
    </div>,
    document.body
  );
}

function MemberProfileTab({ member, titles = [], onGrantTitle, onRevokeTitle, onUploadImage, onDeleteImage, canEdit = false }) {
  const [uploading, setUploading] = useState({ face: false, body: false });
  const [titlePopupOpen, setTitlePopupOpen] = useState(false);

  const [bio, setBio] = useState(member.bio || '');
  const [catchphrase, setCatchphrase] = useState(member.catchphrase || '');
  const [keywords, setKeywords] = useState(() => {
    const k = member.keywords || [];
    return [k[0] || '', k[1] || '', k[2] || ''];
  });
  const [saving, setSaving] = useState(false);

  const assignedTitles = member.assignedTitles || [];

  const handleUpload = async (file, type) => {
    if (!onUploadImage) return;
    setUploading(prev => ({ ...prev, [type]: true }));
    try { await onUploadImage(member.id, file, type); }
    finally { setUploading(prev => ({ ...prev, [type]: false })); }
  };

  const handleDelete = async (type) => {
    if (!onDeleteImage) return;
    if (!window.confirm(`${type === 'face' ? '두상' : '전신'} 이미지를 삭제할까요?`)) return;
    await onDeleteImage(member.id, type);
  };

  const handleSaveText = async () => {
    setSaving(true);
    try {
      const db = getDatabase();
      await update(ref(db, `members/${member.id}`), {
        bio: bio.trim(),
        catchphrase: catchphrase.trim(),
        keywords: keywords.map(k => k.trim()),
      });
    } finally {
      setSaving(false);
    }
  };

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
        {/* 왼쪽: 프로필 이미지 */}
        <div className="space-y-3">
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

        {/* 오른쪽: 칭호 + 한마디 / 캐치프레이즈 / 키워드 */}
        <div className="space-y-3">
          {/* 칭호 */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-bold text-base">🏅 칭호</h3>
              <button
                type="button"
                onClick={() => setTitlePopupOpen(true)}
                className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 font-semibold transition-colors"
              >칭호 관리</button>
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
          <div className="bg-gray-50 rounded-lg p-4 space-y-4">
            <h3 className="font-bold text-base">✏️ 프로필 텍스트</h3>

            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">한마디</label>
              <input
                type="text"
                value={bio}
                onChange={e => canEdit && setBio(e.target.value)}
                placeholder="한 줄 소개..."
                disabled={!canEdit}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-indigo-500 focus:outline-none disabled:bg-gray-100 disabled:text-gray-400"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">캐치프레이즈</label>
              <textarea
                rows={3}
                value={catchphrase}
                onChange={e => canEdit && setCatchphrase(e.target.value)}
                placeholder="캐치프레이즈..."
                disabled={!canEdit}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-indigo-500 focus:outline-none resize-none disabled:bg-gray-100 disabled:text-gray-400"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-2">키워드 (최대 3개)</label>
              <div className="flex flex-col gap-2">
                {keywords.map((kw, i) => (
                  <input
                    key={i}
                    type="text"
                    value={kw}
                    onChange={e => canEdit && setKeywords(prev => prev.map((v, j) => j === i ? e.target.value : v))}
                    placeholder={`키워드 ${i + 1}`}
                    disabled={!canEdit}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-indigo-500 focus:outline-none disabled:bg-gray-100 disabled:text-gray-400"
                  />
                ))}
              </div>
            </div>

            {canEdit && (
              <button
                onClick={handleSaveText}
                disabled={saving}
                className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 font-semibold text-sm transition-colors disabled:opacity-50"
              >
                {saving ? '저장 중...' : '저장'}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default MemberProfileTab;
