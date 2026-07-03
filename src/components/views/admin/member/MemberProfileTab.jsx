import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Upload, Trash2, X } from 'lucide-react';
import { getDatabase, ref, update } from 'firebase/database';
import CachedImage from '../../../common/CachedImage';

const RIGHT_GRADIENT_TAB_OPTIONS = [
  { key: 'main', label: '메인' },
  { key: 'text', label: '설정' },
  { key: 'entry', label: '엔트리' },
  { key: 'relation', label: '관계' },
];
const DEFAULT_RIGHT_GRADIENT_TABS = {
  main: false,
  text: true,
  entry: false,
  relation: true,
};

function getInitialRightGradientTabs(member) {
  if (member?.rightGradientEnabled === false) {
    return Object.fromEntries(RIGHT_GRADIENT_TAB_OPTIONS.map(({ key }) => [key, false]));
  }
  return {
    ...DEFAULT_RIGHT_GRADIENT_TABS,
    ...(member?.rightGradientTabs || {}),
  };
}

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
            <CachedImage src={currentUrl} alt={label} className="w-full h-full object-cover object-top" />
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
  const [keywords, setKeywords] = useState(() => {
    const k = member.keywords || [];
    return [k[0] || '', k[1] || '', k[2] || ''];
  });
  const [age, setAge] = useState(member.age || '');
  const [height, setHeight] = useState(member.height || '');
  const [weight, setWeight] = useState(member.weight || '');
  const [hometown, setHometown] = useState(member.hometown || '');
  // NPC 전용 필드
  const [npcQuote, setNpcQuote] = useState(member.npcQuote || '');
  const [npcAge, setNpcAge] = useState(member.npcAge || '');
  const [npcOccupation, setNpcOccupation] = useState(member.npcOccupation || '');
  const [npcBio, setNpcBio] = useState(member.npcBio || '');
  const [catchphrase, setCatchphrase] = useState(member.catchphrase || '');
  const [charImageLeft, setCharImageLeft] = useState(member.charImageLeft ?? '');
  const [charImageTop, setCharImageTop] = useState(member.charImageTop ?? '');
  const [charImageWidth, setCharImageWidth] = useState(member.charImageWidth ?? '');
  const [charImageScrollEnabled, setCharImageScrollEnabled] = useState(Boolean(member.charImageScrollEnabled));
  const [accentColor, setAccentColor] = useState(member.accentColor || '');
  const [rightGradientTabs, setRightGradientTabs] = useState(() => getInitialRightGradientTabs(member));
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
      const updates = member.isNPC ? {
        catchphrase: catchphrase.trim() || null,
        npcQuote: npcQuote.trim() || null,
        npcAge: npcAge.trim() || null,
        npcOccupation: npcOccupation.trim() || null,
        npcBio: npcBio.trim() || null,
      } : {
        bio: bio.trim(),
        catchphrase: catchphrase.trim(),
        keywords: keywords.map(k => k.trim()),
        age: age.trim() || null,
        height: height.trim() || null,
        weight: weight.trim() || null,
        hometown: hometown.trim() || null,
      };
      if (charImageLeft.trim()) updates.charImageLeft = charImageLeft.trim(); else updates.charImageLeft = null;
      if (charImageTop.trim()) updates.charImageTop = charImageTop.trim(); else updates.charImageTop = null;
      if (charImageWidth.trim()) updates.charImageWidth = charImageWidth.trim(); else updates.charImageWidth = null;
      updates.charImageScrollEnabled = charImageScrollEnabled;
      updates.accentColor = accentColor || null;
      updates.rightGradientTabs = rightGradientTabs;
      updates.rightGradientEnabled = Object.values(rightGradientTabs).some(Boolean);
      await update(ref(db, `members/${member.id}`), updates);
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
        {/* 왼쪽: 프로필 이미지 + 칭호 */}
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

          {/* 테마 색상 */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-bold text-base mb-2">🎨 테마 색상</h3>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={accentColor || '#6688cc'}
                onChange={e => canEdit && setAccentColor(e.target.value)}
                disabled={!canEdit}
                className="w-10 h-9 rounded border border-gray-300 cursor-pointer disabled:cursor-not-allowed p-0.5"
              />
              <input
                type="text"
                value={accentColor}
                onChange={e => canEdit && setAccentColor(e.target.value)}
                placeholder="#rrggbb (비우면 자동 추출)"
                disabled={!canEdit}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:border-indigo-500 focus:outline-none disabled:bg-gray-100 disabled:text-gray-400"
              />
              {accentColor && canEdit && (
                <button onClick={() => setAccentColor('')} className="text-xs text-gray-400 hover:text-red-500 shrink-0">초기화</button>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-1.5">비워두면 이미지에서 자동 추출.</p>
            <div className="mt-3">
              <p className="text-xs font-semibold text-gray-600 mb-2">멤버뷰 우측 그라데이션 표시 탭</p>
              <div className="grid grid-cols-2 gap-2">
                {RIGHT_GRADIENT_TAB_OPTIONS.map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(rightGradientTabs[key])}
                      onChange={e => canEdit && setRightGradientTabs(prev => ({ ...prev, [key]: e.target.checked }))}
                      disabled={!canEdit}
                      className="w-4 h-4 accent-indigo-600 disabled:cursor-not-allowed"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 오른쪽: 프로필 텍스트 */}
        <div className="space-y-3">
          <div className="bg-gray-50 rounded-lg p-4 space-y-4">
            <h3 className="font-bold text-base">✏️ {member.isNPC ? 'NPC 프로필' : '프로필 텍스트'}</h3>

            {member.isNPC ? (
              /* ── NPC 전용 필드 ── */
              <>
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">캐치프레이즈 <span className="text-gray-400 font-normal">(오버레이 인트로 문구)</span></label>
                  <input
                    type="text"
                    value={catchphrase}
                    onChange={e => canEdit && setCatchphrase(e.target.value)}
                    placeholder="등장 시 표시되는 문구..."
                    disabled={!canEdit}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-indigo-500 focus:outline-none disabled:bg-gray-100 disabled:text-gray-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">한마디</label>
                  <input
                    type="text"
                    value={npcQuote}
                    onChange={e => canEdit && setNpcQuote(e.target.value)}
                    placeholder="NPC의 한마디..."
                    disabled={!canEdit}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-indigo-500 focus:outline-none disabled:bg-gray-100 disabled:text-gray-400"
                  />
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-xs font-semibold text-gray-600 block mb-1">나이</label>
                    <input
                      type="text"
                      value={npcAge}
                      onChange={e => canEdit && setNpcAge(e.target.value)}
                      placeholder="예: 28"
                      disabled={!canEdit}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-indigo-500 focus:outline-none disabled:bg-gray-100 disabled:text-gray-400"
                    />
                  </div>
                  <div className="flex-[2]">
                    <label className="text-xs font-semibold text-gray-600 block mb-1">직업</label>
                    <input
                      type="text"
                      value={npcOccupation}
                      onChange={e => canEdit && setNpcOccupation(e.target.value)}
                      placeholder="예: 포켓몬 박사"
                      disabled={!canEdit}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-indigo-500 focus:outline-none disabled:bg-gray-100 disabled:text-gray-400"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">소개</label>
                  <textarea
                    rows={5}
                    value={npcBio}
                    onChange={e => canEdit && setNpcBio(e.target.value)}
                    placeholder="NPC 소개 문구..."
                    disabled={!canEdit}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-indigo-500 focus:outline-none resize-none disabled:bg-gray-100 disabled:text-gray-400"
                  />
                </div>
              </>
            ) : (
              /* ── 일반 멤버 필드 ── */
              <>
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-2">📋 기본 정보</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: '나이', value: age, set: setAge, placeholder: '예: 22살' },
                      { label: '키', value: height, set: setHeight, placeholder: '예: 175cm' },
                      { label: '몸무게', value: weight, set: setWeight, placeholder: '예: 65kg' },
                      { label: '출신지역', value: hometown, set: setHometown, placeholder: '예: 음현시티' },
                    ].map(({ label, value, set, placeholder }) => (
                      <div key={label}>
                        <label className="text-xs text-gray-500 block mb-1">{label}</label>
                        <input
                          type="text"
                          value={value}
                          onChange={e => canEdit && set(e.target.value)}
                          placeholder={placeholder}
                          disabled={!canEdit}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-indigo-500 focus:outline-none disabled:bg-gray-100 disabled:text-gray-400"
                        />
                      </div>
                    ))}
                  </div>
                </div>
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
              </>
            )}

            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-2">🎭 캐릭터 이미지 위치</label>
              <div className="flex flex-col gap-2">
                {[
                  { label: '좌우 위치 (left)', value: charImageLeft, set: setCharImageLeft, placeholder: member.isNPC ? 'auto' : '9vw' },
                  { label: '상하 위치 (top)', value: charImageTop, set: setCharImageTop, placeholder: '0' },
                  { label: '크기 (width)', value: charImageWidth, set: setCharImageWidth, placeholder: member.isNPC ? 'auto' : '70vh' },
                ].map(({ label, value, set, placeholder }) => (
                  <div key={label} className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 w-28 shrink-0">{label}</span>
                    <input
                      type="text"
                      value={value}
                      onChange={e => canEdit && set(e.target.value)}
                      placeholder={placeholder}
                      disabled={!canEdit}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-indigo-500 focus:outline-none disabled:bg-gray-100 disabled:text-gray-400 font-mono"
                    />
                  </div>
                ))}
              </div>
              <label className="mt-3 flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={charImageScrollEnabled}
                  onChange={e => canEdit && setCharImageScrollEnabled(e.target.checked)}
                  disabled={!canEdit}
                  className="w-4 h-4 accent-indigo-600 disabled:cursor-not-allowed"
                />
                캐릭터 이미지 스크롤 허용
              </label>
              <p className="text-xs text-gray-400 mt-1.5">CSS 값 사용 (예: <code>5vw</code>, <code>-30px</code>, <code>80vh</code>). 비우면 기본값 적용.</p>
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
