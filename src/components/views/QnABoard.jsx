import React, { useState } from 'react';
import { Lock, MessageSquare, Pencil, Plus, Send, Trash2, X } from 'lucide-react';

const inputClass =
  'w-full rounded-md border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none transition focus:border-gray-400 focus:ring-2 focus:ring-gray-100';

const CATEGORIES = ['질문', '정산', '휴식'];

const CATEGORY_STYLE = {
  '질문': { bg: 'rgba(100,160,220,0.25)', text: 'rgba(180,220,255,1)' },
  '정산': { bg: 'rgba(220,180,80,0.25)',  text: 'rgba(255,235,150,1)' },
  '휴식': { bg: 'rgba(120,200,140,0.25)', text: 'rgba(180,255,200,1)' },
};

export default function QnABoard({
  currentUser,
  posts = [],
  onCreatePost,
  onDeletePost,
  onEditPost,
  onCreateComment,
  onDeleteComment,
}) {
  const [showWriteModal, setShowWriteModal] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState(null);
  const [newPost, setNewPost] = useState({ title: '', content: '', isPrivate: false, category: '질문' });
  const [commentText, setCommentText] = useState('');
  const [activeTab, setActiveTab] = useState('전체');
  const [editingPost, setEditingPost] = useState(null); // { title, content, category, isPrivate }

  const isAdmin = currentUser?.isAdmin || currentUser?.isSuperAdmin;

  const canViewPost = (post) => (
    !post.isPrivate || isAdmin || post.authorId === currentUser?.id
  );

  const visiblePosts = posts.filter(canViewPost).filter(p => activeTab === '전체' || p.category === activeTab);
  const selectedPost = posts.find(post => post.id === selectedPostId) || null;

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const diff = Date.now() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '방금 전';
    if (minutes < 60) return `${minutes}분 전`;
    if (hours < 24) return `${hours}시간 전`;
    if (days < 7) return `${days}일 전`;
    return date.toLocaleDateString('ko-KR');
  };

  const handleCreatePost = () => {
    if (!newPost.title.trim()) { alert('제목을 입력해주세요.'); return; }
    if (!newPost.content.trim()) { alert('내용을 입력해주세요.'); return; }

    onCreatePost({
      id: Date.now(),
      authorId: currentUser.id,
      authorName: currentUser.name,
      title: newPost.title.trim(),
      content: newPost.content.trim(),
      isPrivate: newPost.isPrivate,
      category: newPost.category,
      createdAt: new Date().toISOString(),
      comments: [],
    });
    setNewPost({ title: '', content: '', isPrivate: false, category: '질문' });
    setShowWriteModal(false);
  };

  const handleSaveEdit = () => {
    if (!editingPost.title.trim() || !editingPost.content.trim()) return;
    onEditPost(selectedPost.id, {
      title: editingPost.title.trim(),
      content: editingPost.content.trim(),
      category: editingPost.category,
      isPrivate: editingPost.isPrivate,
    });
    setEditingPost(null);
  };

  const handleCreateComment = () => {
    if (!selectedPost || !commentText.trim()) return;
    onCreateComment(selectedPost.id, {
      id: Date.now(),
      authorId: currentUser.id,
      authorName: currentUser.name,
      content: commentText.trim(),
      createdAt: new Date().toISOString(),
    });
    setCommentText('');
  };

  return (
    <div className="mx-auto w-full max-w-5xl">
      <header className="mb-5 border-b border-white/20 pb-4">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-2xl font-bold text-white">Q&A</h1>
          <button
            type="button"
            onClick={() => setShowWriteModal(true)}
            className="inline-flex h-10 items-center gap-2 rounded-md px-4 text-sm font-semibold transition"
            style={{background:'rgba(100, 140, 85, 0.65)', color:'rgba(230, 248, 220, 1)'}}
          >
            <Plus size={17} />
            질문 작성
          </button>
        </div>
        {/* 카테고리 탭 */}
        <div className="flex gap-1">
          {['전체', ...CATEGORIES].map(tab => {
            const isActive = activeTab === tab;
            const catStyle = CATEGORY_STYLE[tab];
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className="rounded-full px-3 py-1 text-sm font-semibold transition"
                style={isActive
                  ? { background: catStyle ? catStyle.bg.replace('0.25','0.6') : 'rgba(255,255,255,0.25)', color: catStyle ? catStyle.text : '#fff', outline: '1px solid rgba(255,255,255,0.3)' }
                  : { background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }
                }
              >
                {tab}
              </button>
            );
          })}
        </div>
      </header>

      <section className="relative" style={{maskImage:'linear-gradient(to right, transparent 0%, black 6%, black 94%, transparent 100%)', WebkitMaskImage:'linear-gradient(to right, transparent 0%, black 6%, black 94%, transparent 100%)'}}>
        {visiblePosts.length === 0 ? (
          <div className="flex min-h-64 flex-col items-center justify-center px-6 text-center">
            <MessageSquare size={30} className="mb-3 text-white/30" />
            <p className="text-sm font-semibold text-white/60">등록된 질문이 없습니다.</p>
          </div>
        ) : (
          visiblePosts.map((post, index) => {
            const catStyle = CATEGORY_STYLE[post.category] || {};
            return (
              <button
                type="button"
                key={post.id}
                onClick={() => setSelectedPostId(post.id)}
                className={`flex w-full items-center gap-4 px-12 py-4 text-left transition ${index > 0 ? 'border-t border-white/20' : ''}`}
                style={{background: index % 2 === 0 ? 'rgba(160, 175, 145, 0.65)' : 'rgba(145, 160, 130, 0.52)'}}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(100, 115, 85, 0.75)'}
                onMouseLeave={e => e.currentTarget.style.background = index % 2 === 0 ? 'rgba(160, 175, 145, 0.65)' : 'rgba(145, 160, 130, 0.52)'}
              >
                {/* 번호 열 */}
                <div className="shrink-0 w-10 text-center">
                  <span className="text-sm font-bold text-white/80">#{visiblePosts.length - index}</span>
                </div>
                {/* 카테고리 열 */}
                <div className="shrink-0 w-14 text-center">
                  {post.category && (
                    <span className="rounded px-2 py-1 text-xs font-bold" style={{background: catStyle.bg, color: catStyle.text}}>
                      {post.category}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {post.isPrivate && <Lock size={14} className="shrink-0 text-white/70" />}
                    <h2 className="truncate text-base font-bold text-white drop-shadow">{post.title}</h2>
                    {!!post.comments?.length && (
                      <span className="shrink-0 text-xs font-bold text-green-300">[{post.comments.length}]</span>
                    )}
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-white/70">
                    <span className="font-semibold text-white/90">{post.authorName}</span>
                    <span aria-hidden="true">·</span>
                    <time>{formatDate(post.createdAt)}</time>
                    {post.isPrivate && <span className="text-white/50">비공개</span>}
                  </div>
                </div>
                <MessageSquare size={16} className="shrink-0 text-white/50" />
              </button>
            );
          })
        )}
      </section>

      {showWriteModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowWriteModal(false)}
        >
          <div
            className="w-full max-w-xl overflow-hidden rounded-xl shadow-2xl"
            style={{background:'rgba(245,250,240,0.98)', color:'rgba(40,50,30,1)', border:'1px solid rgba(180,210,150,0.6)', boxShadow:'0 0 0 1px rgba(0,0,0,0.15), 0 24px 48px rgba(0,0,0,0.4)'}}
            onClick={event => event.stopPropagation()}
          >
            <div className="flex justify-end px-4 pt-3">
              <button type="button" onClick={() => setShowWriteModal(false)} className="p-1 transition" style={{color:'rgba(40,60,25,0.4)'}}>
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 p-5">
              <div>
                <label className="mb-1.5 block text-xs font-semibold" style={{color:'rgba(60,80,40,0.6)'}}>카테고리</label>
                <div className="flex gap-2">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setNewPost({ ...newPost, category: cat })}
                      className="rounded-md px-4 py-1.5 text-sm font-semibold transition"
                      style={newPost.category === cat
                        ? {background:'rgba(50,70,35,0.85)', color:'rgba(240,255,225,1)', outline:'none'}
                        : {background:'rgba(0,0,0,0.06)', color:'rgba(60,80,40,0.55)', border:'1px solid rgba(80,120,60,0.2)'}}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold" style={{color:'rgba(60,80,40,0.6)'}}>제목</label>
                <input
                  type="text"
                  value={newPost.title}
                  onChange={event => setNewPost({ ...newPost, title: event.target.value })}
                  placeholder="질문 제목"
                  className="w-full rounded-lg px-3 py-2.5 text-sm outline-none transition"
                  style={{background:'rgba(0,0,0,0.05)', border:'1px solid rgba(80,120,60,0.25)', color:'rgba(25,40,15,1)'}}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold" style={{color:'rgba(60,80,40,0.6)'}}>내용</label>
                <textarea
                  value={newPost.content}
                  onChange={event => setNewPost({ ...newPost, content: event.target.value })}
                  placeholder="내용을 입력하세요."
                  rows={8}
                  className="w-full rounded-lg px-3 py-2.5 text-sm outline-none resize-none transition"
                  style={{background:'rgba(0,0,0,0.05)', border:'1px solid rgba(80,120,60,0.25)', color:'rgba(30,50,15,0.9)'}}
                />
              </div>
              <label className="flex cursor-pointer items-center gap-2 text-sm" style={{color:'rgba(60,80,40,0.65)'}}>
                <input
                  type="checkbox"
                  checked={newPost.isPrivate}
                  onChange={event => setNewPost({ ...newPost, isPrivate: event.target.checked })}
                  className="h-4 w-4 accent-green-700"
                />
                <Lock size={14} />
                관리자에게만 공개
              </label>
            </div>

            <div className="flex justify-end gap-2 px-5 py-4" style={{borderTop:'1px solid rgba(80,120,60,0.2)'}}>
              <button type="button" onClick={() => setShowWriteModal(false)} className="rounded-md px-4 py-2 text-sm font-semibold transition" style={{background:'rgba(0,0,0,0.06)', color:'rgba(60,80,40,0.6)'}}>
                취소
              </button>
              <button type="button" onClick={handleCreatePost} className="rounded-md px-4 py-2 text-sm font-semibold transition" style={{background:'rgba(80,130,60,0.85)', color:'rgba(240,255,230,1)'}}>
                등록
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedPost && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4"
          onClick={() => setSelectedPostId(null)}
        >
          <article
            className="max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-xl shadow-2xl"
            style={{background:'rgba(245,250,240,0.98)', color:'rgba(40,50,30,1)', border:'1px solid rgba(180,210,150,0.6)', boxShadow:'0 0 0 1px rgba(0,0,0,0.15), 0 24px 48px rgba(0,0,0,0.4)'}}
            onClick={event => event.stopPropagation()}
          >
            <header className="px-6 py-5" style={{borderBottom:'1px solid rgba(255,255,255,0.1)'}}>
              <div className="flex items-start justify-between gap-5">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {selectedPost.category && (
                      <span className="rounded px-2 py-0.5 text-sm font-bold" style={{background:'rgba(50,70,35,0.85)', color:'rgba(240,255,225,1)'}}>{selectedPost.category}</span>
                    )}
                    {selectedPost.isPrivate && <Lock size={16} style={{color:'rgba(80,100,60,0.5)'}} />}
                    <h2 className="text-2xl font-bold" style={{color:'rgba(25,40,15,1)'}}>{selectedPost.title}</h2>
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-sm" style={{color:'rgba(60,80,40,0.55)'}}>
                    <span className="font-semibold" style={{color:'rgba(40,60,25,0.8)'}}>{selectedPost.authorName}</span>
                    <span>·</span>
                    <time>{formatDate(selectedPost.createdAt)}</time>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {(selectedPost.authorId === currentUser.id || isAdmin) && !editingPost && (
                    <button
                      type="button"
                      onClick={() => setEditingPost({ title: selectedPost.title, content: selectedPost.content, category: selectedPost.category || '질문', isPrivate: selectedPost.isPrivate })}
                      className="inline-flex items-center transition"
                      style={{color:'rgba(60,120,200,0.7)'}}
                    >
                      <Pencil size={15} />
                    </button>
                  )}
                  {(selectedPost.authorId === currentUser.id || isAdmin) && (
                    <button
                      type="button"
                      onClick={() => { if (window.confirm('질문을 삭제할까요?')) { onDeletePost(selectedPost.id); setSelectedPostId(null); } }}
                      className="inline-flex items-center transition"
                      style={{color:'rgba(200,60,60,0.7)'}}
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                  <button type="button" onClick={() => { setSelectedPostId(null); setEditingPost(null); }} className="p-1 transition" style={{color:'rgba(40,60,25,0.4)'}}>
                    <X size={20} />
                  </button>
                </div>
              </div>

              {editingPost ? (
                <div className="mt-5 space-y-3">
                  <div className="flex gap-2">
                    {CATEGORIES.map(cat => (
                      <button key={cat} type="button" onClick={() => setEditingPost(e => ({...e, category: cat}))}
                        className="rounded px-3 py-1 text-sm font-semibold transition"
                        style={editingPost.category === cat
                          ? {background:'rgba(80,120,60,0.2)', color:'rgba(40,80,20,1)', outline:'1px solid rgba(80,120,60,0.4)'}
                          : {background:'rgba(0,0,0,0.06)', color:'rgba(60,80,40,0.5)'}}>
                        {cat}
                      </button>
                    ))}
                    <label className="flex items-center gap-1.5 ml-2 text-sm cursor-pointer" style={{color:'rgba(60,80,40,0.6)'}}>
                      <input type="checkbox" checked={editingPost.isPrivate} onChange={e => setEditingPost(p => ({...p, isPrivate: e.target.checked}))} className="accent-green-600" />
                      <Lock size={13} /> 비공개
                    </label>
                  </div>
                  <input
                    type="text" value={editingPost.title}
                    onChange={e => setEditingPost(p => ({...p, title: e.target.value}))}
                    className="w-full rounded-lg px-3 py-2 text-base font-bold outline-none"
                    style={{background:'rgba(0,0,0,0.06)', border:'1px solid rgba(80,120,60,0.25)', color:'rgba(25,40,15,1)'}}
                  />
                  <textarea
                    rows={6} value={editingPost.content}
                    onChange={e => setEditingPost(p => ({...p, content: e.target.value}))}
                    className="w-full rounded-lg px-3 py-2.5 text-base outline-none resize-none"
                    style={{background:'rgba(0,0,0,0.06)', border:'1px solid rgba(80,120,60,0.25)', color:'rgba(30,50,15,0.9)'}}
                  />
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => setEditingPost(null)} className="rounded-lg px-4 py-2 text-sm font-semibold" style={{background:'rgba(0,0,0,0.07)', color:'rgba(60,80,40,0.6)'}}>취소</button>
                    <button type="button" onClick={handleSaveEdit} className="rounded-lg px-4 py-2 text-sm font-semibold" style={{background:'rgba(80,130,60,0.8)', color:'rgba(240,255,230,1)'}}>저장</button>
                  </div>
                </div>
              ) : (
                <p className="mt-6 whitespace-pre-wrap text-lg leading-7" style={{color:'rgba(30,50,15,0.85)'}}>
                  {selectedPost.content}
                </p>
              )}
            </header>

            {!editingPost && <section className="px-6 py-5">
              <div className="mb-4 flex items-center gap-2">
                <MessageSquare size={17} style={{color:'rgba(60,80,40,0.4)'}} />
                <h3 className="text-base font-bold" style={{color:'rgba(40,60,25,0.65)'}}>답변 {selectedPost.comments?.length || 0}</h3>
              </div>

              <div className="space-y-3">
                {selectedPost.comments?.map(comment => (
                  <div key={comment.id} className="rounded-lg px-4 py-3" style={{background:'rgba(0,0,0,0.05)'}}>
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-semibold" style={{color:'rgba(40,60,25,0.8)'}}>{comment.authorName}</span>
                        <time style={{color:'rgba(60,80,40,0.45)'}}>{formatDate(comment.createdAt)}</time>
                      </div>
                      {(comment.authorId === currentUser.id || isAdmin) && (
                        <button type="button" onClick={() => { if (window.confirm('답변을 삭제할까요?')) onDeleteComment(selectedPost.id, comment.id); }} style={{color:'rgba(180,60,60,0.45)'}}>
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                    <p className="whitespace-pre-wrap text-base leading-6" style={{color:'rgba(30,50,15,0.8)'}}>{comment.content}</p>
                  </div>
                ))}
              </div>

              <div className="mt-5 pt-5" style={{borderTop:'1px solid rgba(80,120,60,0.2)'}}>
                <textarea
                  value={commentText}
                  onChange={event => setCommentText(event.target.value)}
                  placeholder="답변을 입력하세요."
                  rows={3}
                  className="w-full rounded-lg px-3 py-2.5 text-base outline-none resize-none transition"
                  style={{background:'rgba(0,0,0,0.05)', border:'1px solid rgba(80,120,60,0.2)', color:'rgba(30,50,15,0.9)'}}
                />
                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={handleCreateComment}
                    className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-base font-semibold transition"
                    style={{background:'rgba(80,130,60,0.8)', color:'rgba(240,255,230,1)'}}
                  >
                    <Send size={15} />
                    답변 등록
                  </button>
                </div>
              </div>
            </section>}
          </article>
        </div>
      )}
    </div>
  );
}

