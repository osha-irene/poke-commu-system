import React from 'react';

/**
 * %% 커스텀 문법 핸들러 레지스트리
 * 나중에 여기에 핸들러 추가하면 자동으로 적용됨
 *
 * 등록 방법:
 *   registerHandler('type', ({ content, args }) => <JSX />)
 */
const handlers = {};

export function registerHandler(type, fn) {
  handlers[type] = fn;
}

/* 기본 핸들러 — 디자인 없는 플레이스홀더 */
registerHandler('icon', ({ content, args }) => (
  <span className="prf-icon-line">
    <span className="prf-icon">{args[0] || '•'}</span>
    <span>{content}</span>
  </span>
));

registerHandler('bg', ({ content, args }) => (
  <span className="prf-bg-line" data-bg={args[0] || ''}>
    {content}
  </span>
));

registerHandler('badge', ({ content, args }) => (
  <span className="prf-badge" data-type={args[0] || ''}>
    {content}
  </span>
));

/**
 * 단일 줄 파싱
 * %%type:arg1:arg2 내용  →  { type, args, content }
 * 그 외                  →  null (일반 텍스트)
 */
function parseLine(line) {
  const match = line.match(/^%%(\S+)\s*(.*)/);
  if (!match) return null;
  const [, typeRaw, content] = match;
  const [type, ...args] = typeRaw.split(':');
  return { type, args, content };
}

/**
 * 텍스트 블록 렌더러
 * - %%type … 줄: 등록된 핸들러로 렌더링
 * - 빈 줄: <br />
 * - 일반 텍스트: <span>
 */
export function renderProfileText(text) {
  if (!text) return null;
  return text.split('\n').map((line, i) => {
    const parsed = parseLine(line.trim());
    if (parsed) {
      const handler = handlers[parsed.type];
      if (handler) return <div key={i} className="prf-line">{handler(parsed)}</div>;
      return <div key={i} className="prf-line prf-unknown">{line}</div>;
    }
    if (!line.trim()) return <br key={i} />;
    return <div key={i} className="prf-line">{line}</div>;
  });
}

/**
 * ProfileSection — 섹션 하나 렌더 + 관리자 인라인 편집
 */
export function ProfileSection({ sectionKey, label, value, isAdmin, onSave }) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(value || '');
  const [saving, setSaving] = React.useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave(sectionKey, draft);
    setSaving(false);
    setEditing(false);
  };

  return (
    <div className="prf-section" data-key={sectionKey}>
      <div className="prf-section-header">
        <span className="prf-section-label">{label}</span>
        {isAdmin && !editing && (
          <button className="prf-edit-btn" onClick={() => { setDraft(value || ''); setEditing(true); }}>
            ✏️
          </button>
        )}
      </div>

      {editing ? (
        <div className="prf-editor">
          <textarea
            className="prf-textarea"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            rows={6}
            placeholder={`%%icon:⭐ 내용\n%%bg:forest 배경있는 텍스트\n일반 텍스트`}
          />
          <div className="prf-editor-actions">
            <button className="prf-save-btn" onClick={handleSave} disabled={saving}>
              {saving ? '저장 중…' : '저장'}
            </button>
            <button className="prf-cancel-btn" onClick={() => setEditing(false)}>취소</button>
          </div>
        </div>
      ) : (
        <div className="prf-content">
          {value ? renderProfileText(value) : <span className="prf-empty">—</span>}
        </div>
      )}
    </div>
  );
}
