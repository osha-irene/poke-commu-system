import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { ChevronLeft, ChevronRight, Image, Lock, MessageSquare, Pencil, Plus, Search, Send, Trash2, X } from 'lucide-react';


const CATEGORIES = ['질문', '정산', '아이템'];
// "아이템" 탭은 볼 변경 티켓/미용실 이용권을 사용했을 때만 QnaItemWriteModal로 작성되므로,
// 일반 글쓰기 모달의 카테고리 선택지에서는 제외한다.
const WRITE_CATEGORIES = CATEGORIES.filter(cat => cat !== '아이템');

const CATEGORY_STYLE = {
  '질문': { bg: 'rgba(80,130,200,0.55)', text: 'rgba(220,238,255,1)' },
  '정산': { bg: 'rgba(195,150,40,0.55)',  text: 'rgba(255,240,180,1)' },
  '아이템': { bg: 'rgba(150,90,190,0.55)', text: 'rgba(240,225,255,1)' },
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
  const [newPost, setNewPost] = useState({ title: '', content: '', isPrivate: false, category: '질문', images: [] });
  const [newImageUrl, setNewImageUrl] = useState('');
  const [commentText, setCommentText] = useState('');
  const [activeTab, setActiveTab] = useState('전체');
  const [editingPost, setEditingPost] = useState(null); // { title, content, category, isPrivate }
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const PAGE_SIZE = 10;

  const isAdmin = currentUser?.isAdmin || currentUser?.isSuperAdmin;

  const canViewPost = (post) => (
    !post.isPrivate || isAdmin || post.authorId === currentUser?.id
  );

  const allVisiblePosts = posts.filter(canViewPost)
    .filter(p => activeTab === '전체' || p.category === activeTab)
    .filter(p => {
      const q = search.trim();
      if (!q) return true;
      if (p.title.includes(q)) return true;
      if (!p.isPrivate && p.content.includes(q)) return true;
      return false;
    });
  const totalPages = Math.max(1, Math.ceil(allVisiblePosts.length / PAGE_SIZE));
  const visiblePosts = allVisiblePosts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
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
      images: newPost.images,
      createdAt: new Date().toISOString(),
      comments: [],
    });
    setNewPost({ title: '', content: '', isPrivate: false, category: '질문', images: [] });
    setNewImageUrl('');
    setShowWriteModal(false);
  };

  const handleSaveEdit = () => {
    if (!editingPost.title.trim() || !editingPost.content.trim()) return;
    if (!selectedPost || typeof onEditPost !== 'function') return;
    onEditPost(selectedPost.id, {
      title: editingPost.title.trim(),
      content: editingPost.content.trim(),
      category: editingPost.category,
      isPrivate: editingPost.isPrivate,
      images: editingPost.images || [],
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
      <header className="qna-header mb-5 border-b border-black/10 pb-4">
        <div className="qna-header__top flex items-center justify-between mb-3">
          <h1 className="qna-title text-2xl font-bold text-gray-800">Q&A</h1>
          <button
            type="button"
            onClick={() => setShowWriteModal(true)}
            className="qna-write-btn inline-flex h-10 items-center gap-2 rounded-md px-4 text-sm font-semibold transition"
            style={{background:'rgba(80, 120, 60, 0.85)', color:'rgba(230, 248, 220, 1)'}}
          >
            <Plus size={17} />
            질문 작성
          </button>
        </div>
        {/* 카테고리 탭 + 검색 */}
        <div className="qna-header__bottom relative flex items-center justify-between gap-2">
          <div className={`qna-cats flex gap-1 transition-all duration-250 ${searchOpen ? 'qna-cats--hidden' : ''}`}>
          {['전체', ...CATEGORIES].map(tab => {
            const isActive = activeTab === tab;
            const catStyle = CATEGORY_STYLE[tab];
            return (
              <button
                key={tab}
                type="button"
                onClick={() => { setActiveTab(tab); setPage(1); }}
                data-active={isActive ? 'true' : 'false'}
                className="rounded-full px-3 py-1 text-sm font-semibold transition"
                style={isActive
                  ? { background: catStyle ? catStyle.bg.replace('0.55','0.82') : 'rgba(255,255,255,0.4)', color: catStyle ? catStyle.text : '#fff', outline: '1px solid rgba(255,255,255,0.3)' }
                  : { background: 'rgba(0,0,0,0.07)', color: 'rgba(40,60,20,0.5)' }
                }
              >
                {tab}
              </button>
            );
          })}
          </div>
          <div className="flex items-center gap-1">
            <div
              className="qna-search relative shrink-0 flex items-center rounded-md overflow-hidden transition-all"
              style={{ background: 'rgba(0,0,0,0.08)', width: searchOpen ? '160px' : '32px', height: '32px', transition: 'width 0.28s ease' }}
            >
              <button
                type="button"
                onClick={() => setSearchOpen(v => !v)}
                className="flex items-center justify-center shrink-0"
                style={{ width: '32px', height: '32px' }}
              >
                <Search size={14} className="qna-search-icon text-gray-400" />
              </button>
              <input
                type="text"
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                placeholder="검색"
                className="h-full pr-2 text-sm outline-none bg-transparent"
                style={{ color: 'rgba(30,50,15,0.85)', minWidth: 0, flex: 1, opacity: searchOpen ? 1 : 0, transition: 'opacity 0.2s ease' }}
              />
            </div>
            <button
              type="button"
              onClick={() => setShowWriteModal(true)}
              className="qna-write-icon-btn flex items-center justify-center rounded-md shrink-0"
              style={{ width: '32px', height: '32px', background: 'rgba(80,120,60,0.85)', color: 'rgba(230,248,220,1)' }}
            >
              <Plus size={20} strokeWidth={3} />
            </button>
          </div>
        </div>
      </header>

      <section className="qna-list relative" style={{minHeight: '640px'}}>
        {visiblePosts.length === 0 ? (
          <div className="flex min-h-64 flex-col items-center justify-center px-6 text-center">
            <MessageSquare size={30} className="mb-3 text-gray-400/60" />
            <p className="text-sm font-semibold text-gray-600">등록된 질문이 없습니다.</p>
          </div>
        ) : (
          visiblePosts.map((post, index) => {
            const catStyle = CATEGORY_STYLE[post.category] || {};
            return (
              <button
                type="button"
                key={post.id}
                onClick={() => setSelectedPostId(post.id)}
                className={`qna-list-row flex w-full items-center gap-4 px-12 py-4 text-left transition rounded-xl ${index > 0 ? 'mt-1' : ''}`}
                style={{background: index % 2 === 0 ? 'rgba(200,218,178,0.75)' : 'rgba(188,208,165,0.62)'}}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(175,198,148,0.82)'}
                onMouseLeave={e => e.currentTarget.style.background = index % 2 === 0 ? 'rgba(200,218,178,0.75)' : 'rgba(188,208,165,0.62)'}
              >
                {/* 번호 열 */}
                <div className="shrink-0 w-10 text-center">
                  <span className="text-sm font-bold text-gray-700">{visiblePosts.length - index}</span>
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
                    {post.isPrivate && <Lock size={14} className="qna-list-icon shrink-0 text-gray-500" />}
                    <h2 className="truncate text-base font-bold text-gray-800 drop-shadow">{post.title}</h2>
                    {!!post.comments?.length && (
                      <span className="shrink-0 text-xs font-bold text-green-700">[{post.comments.length}]</span>
                    )}
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-gray-500 qna-meta">
                    <span className="font-semibold text-gray-800">{post.authorName}</span>
                    <span aria-hidden="true">·</span>
                    <time className="qna-time">{formatDate(post.createdAt)}</time>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </section>

      <div className="flex items-center justify-center gap-1 mt-4">
          <button type="button" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="qna-page-arrow qna-page-arrow--desktop rounded px-3 py-1.5 text-sm font-semibold transition disabled:opacity-30"
            style={{ background: 'rgba(80,120,60,0.6)', color: 'rgba(230,248,220,1)' }}
          ><ChevronLeft size={16} /></button>
          <button type="button" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="qna-page-arrow qna-page-arrow--mobile rounded px-2 py-1 transition"
            style={{ background: 'transparent' }}
          ><ChevronLeft size={22} color="#fff" strokeWidth={2.5} /></button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
            <button
              key={n}
              type="button"
              onClick={() => setPage(n)}
              className="rounded px-3 py-1.5 text-sm font-semibold transition"
              style={n === page
                ? { background: 'rgba(60,100,40,0.85)', color: 'rgba(230,248,220,1)' }
                : { background: 'rgba(80,120,60,0.35)', color: 'rgba(40,70,20,0.8)' }
              }
            >{n}</button>
          ))}
          <button type="button" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="qna-page-arrow qna-page-arrow--desktop rounded px-3 py-1.5 text-sm font-semibold transition disabled:opacity-30"
            style={{ background: 'rgba(80,120,60,0.6)', color: 'rgba(230,248,220,1)' }}
          ><ChevronRight size={16} /></button>
          <button type="button" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="qna-page-arrow qna-page-arrow--mobile rounded px-2 py-1 transition"
            style={{ background: 'transparent' }}
          ><ChevronRight size={22} color="#fff" strokeWidth={2.5} /></button>
        </div>

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
                  {WRITE_CATEGORIES.map(cat => (
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
              <div>
                <label className="mb-1.5 block text-xs font-semibold" style={{color:'rgba(60,80,40,0.6)'}}>
                  이미지 링크 <span style={{color:'rgba(60,80,40,0.4)'}}>({newPost.images.length}/10)</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newImageUrl}
                    onChange={e => setNewImageUrl(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const url = newImageUrl.trim();
                        if (url && newPost.images.length < 10 && !newPost.images.includes(url))
                          setNewPost(p => ({ ...p, images: [...p.images, url] }));
                        setNewImageUrl('');
                      }
                    }}
                    placeholder="이미지 URL 입력 후 Enter"
                    className="flex-1 rounded-lg px-3 py-2 text-sm outline-none"
                    style={{background:'rgba(0,0,0,0.05)', border:'1px solid rgba(80,120,60,0.25)', color:'rgba(25,40,15,1)'}}
                  />
                  <button type="button"
                    onClick={() => {
                      const url = newImageUrl.trim();
                      if (url && newPost.images.length < 10 && !newPost.images.includes(url))
                        setNewPost(p => ({ ...p, images: [...p.images, url] }));
                      setNewImageUrl('');
                    }}
                    className="rounded-lg px-3 py-2 text-sm font-semibold"
                    style={{background:'rgba(80,120,60,0.6)', color:'rgba(230,248,220,1)'}}
                  ><Image size={15} /></button>
                </div>
                {newPost.images.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {newPost.images.map((url, i) => (
                      <div key={i} className="relative group">
                        <img src={url} alt="" className="h-16 w-16 rounded object-cover" style={{border:'1px solid rgba(80,120,60,0.3)'}} />
                        <button type="button"
                          onClick={() => setNewPost(p => ({ ...p, images: p.images.filter((_, j) => j !== i) }))}
                          className="absolute -top-1.5 -right-1.5 rounded-full w-4 h-4 flex items-center justify-center text-xs"
                          style={{background:'rgba(180,40,40,0.85)', color:'#fff'}}
                        >×</button>
                      </div>
                    ))}
                  </div>
                )}
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

      {selectedPost && ReactDOM.createPortal(
        <div
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/35 p-4"
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
                      onClick={() => setEditingPost({ title: selectedPost.title, content: selectedPost.content, category: selectedPost.category || '질문', isPrivate: selectedPost.isPrivate, images: selectedPost.images || [], newImageUrl: '' })}
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
                  <div>
                    <p className="mb-1.5 text-xs font-semibold" style={{color:'rgba(60,80,40,0.6)'}}>이미지 링크 ({editingPost.images.length}/10)</p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={editingPost.newImageUrl}
                        onChange={e => setEditingPost(p => ({...p, newImageUrl: e.target.value}))}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const url = editingPost.newImageUrl.trim();
                            if (url && editingPost.images.length < 10 && !editingPost.images.includes(url))
                              setEditingPost(p => ({ ...p, images: [...p.images, url], newImageUrl: '' }));
                            else setEditingPost(p => ({...p, newImageUrl: ''}));
                          }
                        }}
                        placeholder="이미지 URL 입력 후 Enter"
                        className="flex-1 rounded-lg px-3 py-2 text-sm outline-none"
                        style={{background:'rgba(0,0,0,0.06)', border:'1px solid rgba(80,120,60,0.25)', color:'rgba(25,40,15,1)'}}
                      />
                      <button type="button"
                        onClick={() => {
                          const url = editingPost.newImageUrl.trim();
                          if (url && editingPost.images.length < 10 && !editingPost.images.includes(url))
                            setEditingPost(p => ({ ...p, images: [...p.images, url], newImageUrl: '' }));
                          else setEditingPost(p => ({...p, newImageUrl: ''}));
                        }}
                        className="rounded-lg px-3 py-2 text-sm font-semibold"
                        style={{background:'rgba(80,120,60,0.6)', color:'rgba(230,248,220,1)'}}
                      ><Image size={15} /></button>
                    </div>
                    {editingPost.images.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {editingPost.images.map((url, i) => (
                          <div key={i} className="relative">
                            <img src={url} alt="" className="h-16 w-16 rounded object-cover" style={{border:'1px solid rgba(80,120,60,0.3)'}} />
                            <button type="button"
                              onClick={() => setEditingPost(p => ({ ...p, images: p.images.filter((_, j) => j !== i) }))}
                              className="absolute -top-1.5 -right-1.5 rounded-full w-4 h-4 flex items-center justify-center text-xs"
                              style={{background:'rgba(180,40,40,0.85)', color:'#fff'}}
                            >×</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => setEditingPost(null)} className="rounded-lg px-4 py-2 text-sm font-semibold" style={{background:'rgba(0,0,0,0.07)', color:'rgba(60,80,40,0.6)'}}>취소</button>
                    <button type="button" onClick={handleSaveEdit} className="rounded-lg px-4 py-2 text-sm font-semibold" style={{background:'rgba(80,130,60,0.8)', color:'rgba(240,255,230,1)'}}>저장</button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="mt-6 whitespace-pre-wrap text-lg leading-7" style={{color:'rgba(30,50,15,0.85)'}}>
                    {selectedPost.content}
                  </p>
                  {selectedPost.images?.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {selectedPost.images.map((url, i) => (
                        <a key={i} href={url} target="_blank" rel="noreferrer">
                          <img src={url} alt="" className="rounded-lg object-cover max-h-48" style={{border:'1px solid rgba(80,120,60,0.25)'}} />
                        </a>
                      ))}
                    </div>
                  )}
                </>
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
        </div>,
        document.body
      )}
    </div>
  );
}

