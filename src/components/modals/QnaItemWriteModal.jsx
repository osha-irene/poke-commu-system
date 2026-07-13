import React, { useState } from 'react';
import { Image, Lock, X } from 'lucide-react';

export default function QnaItemWriteModal({ item, onSubmit, onCancel }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [images, setImages] = useState([]);
  const [newImageUrl, setNewImageUrl] = useState('');

  const addImage = () => {
    const url = newImageUrl.trim();
    if (url && images.length < 10 && !images.includes(url)) {
      setImages(prev => [...prev, url]);
    }
    setNewImageUrl('');
  };

  const handleSubmit = () => {
    if (!title.trim()) { alert('제목을 입력해주세요.'); return; }
    if (!content.trim()) { alert('내용을 입력해주세요.'); return; }
    onSubmit({ title: title.trim(), content: content.trim(), isPrivate, images });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-xl shadow-2xl"
        style={{ background: 'rgba(245,250,240,0.98)', color: 'rgba(40,50,30,1)', border: '1px solid rgba(180,210,150,0.6)', boxShadow: '0 0 0 1px rgba(0,0,0,0.15), 0 24px 48px rgba(0,0,0,0.4)' }}
        onClick={event => event.stopPropagation()}
      >
        <div className="flex items-start justify-between px-5 pt-4">
          <div>
            <span className="inline-block rounded px-2 py-0.5 text-xs font-bold" style={{ background: 'rgba(150,90,190,0.55)', color: 'rgba(240,225,255,1)' }}>
              아이템
            </span>
            <p className="mt-1 text-xs" style={{ color: 'rgba(60,80,40,0.6)' }}>
              {item?.name || '아이템'}을(를) 사용해서 작성하는 글입니다.
            </p>
          </div>
          <button type="button" onClick={onCancel} className="p-1 transition" style={{ color: 'rgba(40,60,25,0.4)' }}>
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4 p-5 pt-3">
          <div>
            <label className="mb-1.5 block text-xs font-semibold" style={{ color: 'rgba(60,80,40,0.6)' }}>제목</label>
            <input
              type="text"
              value={title}
              onChange={event => setTitle(event.target.value)}
              placeholder="제목"
              className="w-full rounded-lg px-3 py-2.5 text-sm outline-none transition"
              style={{ background: 'rgba(0,0,0,0.05)', border: '1px solid rgba(80,120,60,0.25)', color: 'rgba(25,40,15,1)' }}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold" style={{ color: 'rgba(60,80,40,0.6)' }}>내용</label>
            <textarea
              value={content}
              onChange={event => setContent(event.target.value)}
              placeholder="내용을 입력하세요."
              rows={8}
              className="w-full rounded-lg px-3 py-2.5 text-sm outline-none resize-none transition"
              style={{ background: 'rgba(0,0,0,0.05)', border: '1px solid rgba(80,120,60,0.25)', color: 'rgba(30,50,15,0.9)' }}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold" style={{ color: 'rgba(60,80,40,0.6)' }}>
              이미지 링크 <span style={{ color: 'rgba(60,80,40,0.4)' }}>({images.length}/10)</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newImageUrl}
                onChange={e => setNewImageUrl(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addImage();
                  }
                }}
                placeholder="이미지 URL 입력 후 Enter"
                className="flex-1 rounded-lg px-3 py-2 text-sm outline-none"
                style={{ background: 'rgba(0,0,0,0.05)', border: '1px solid rgba(80,120,60,0.25)', color: 'rgba(25,40,15,1)' }}
              />
              <button
                type="button"
                onClick={addImage}
                className="rounded-lg px-3 py-2 text-sm font-semibold"
                style={{ background: 'rgba(80,120,60,0.6)', color: 'rgba(230,248,220,1)' }}
              ><Image size={15} /></button>
            </div>
            {images.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {images.map((url, i) => (
                  <div key={i} className="relative group">
                    <img src={url} alt="" className="h-16 w-16 rounded object-cover" style={{ border: '1px solid rgba(80,120,60,0.3)' }} />
                    <button
                      type="button"
                      onClick={() => setImages(prev => prev.filter((_, j) => j !== i))}
                      className="absolute -top-1.5 -right-1.5 rounded-full w-4 h-4 flex items-center justify-center text-xs"
                      style={{ background: 'rgba(180,40,40,0.85)', color: '#fff' }}
                    >×</button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm" style={{ color: 'rgba(60,80,40,0.65)' }}>
            <input
              type="checkbox"
              checked={isPrivate}
              onChange={event => setIsPrivate(event.target.checked)}
              className="h-4 w-4 accent-green-700"
            />
            <Lock size={14} />
            관리자에게만 공개
          </label>
        </div>

        <div className="flex justify-end gap-2 px-5 py-4" style={{ borderTop: '1px solid rgba(80,120,60,0.2)' }}>
          <button type="button" onClick={onCancel} className="rounded-md px-4 py-2 text-sm font-semibold transition" style={{ background: 'rgba(0,0,0,0.06)', color: 'rgba(60,80,40,0.6)' }}>
            취소
          </button>
          <button type="button" onClick={handleSubmit} className="rounded-md px-4 py-2 text-sm font-semibold transition" style={{ background: 'rgba(50,70,35,0.85)', color: 'rgba(240,255,225,1)' }}>
            등록
          </button>
        </div>
      </div>
    </div>
  );
}
