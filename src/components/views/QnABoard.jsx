import React, { useState } from 'react';
import { Lock, MessageSquare, Plus, Send, Trash2, X } from 'lucide-react';

const inputClass =
  'w-full rounded-md border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none transition focus:border-gray-400 focus:ring-2 focus:ring-gray-100';

export default function QnABoard({
  currentUser,
  posts = [],
  onCreatePost,
  onDeletePost,
  onCreateComment,
  onDeleteComment,
}) {
  const [showWriteModal, setShowWriteModal] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState(null);
  const [newPost, setNewPost] = useState({ title: '', content: '', isPrivate: false });
  const [commentText, setCommentText] = useState('');

  const isAdmin = currentUser?.isAdmin || currentUser?.isSuperAdmin;

  const canViewPost = (post) => (
    !post.isPrivate || isAdmin || post.authorId === currentUser?.id
  );

  const visiblePosts = posts.filter(canViewPost);
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
    if (!newPost.title.trim()) {
      alert('제목을 입력해주세요.');
      return;
    }
    if (!newPost.content.trim()) {
      alert('내용을 입력해주세요.');
      return;
    }

    onCreatePost({
      id: Date.now(),
      authorId: currentUser.id,
      authorName: currentUser.name,
      title: newPost.title.trim(),
      content: newPost.content.trim(),
      isPrivate: newPost.isPrivate,
      createdAt: new Date().toISOString(),
      comments: [],
    });
    setNewPost({ title: '', content: '', isPrivate: false });
    setShowWriteModal(false);
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
      <header className="mb-5 flex items-end justify-between border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Q&A</h1>
          <p className="mt-1 text-sm text-gray-500">궁금한 내용을 남겨주세요.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowWriteModal(true)}
          className="inline-flex h-10 items-center gap-2 rounded-md bg-gray-900 px-4 text-sm font-semibold text-white transition hover:bg-gray-700"
        >
          <Plus size={17} />
          질문 작성
        </button>
      </header>

      <section className="overflow-hidden rounded-md border border-gray-200 bg-white">
        {visiblePosts.length === 0 ? (
          <div className="flex min-h-64 flex-col items-center justify-center px-6 text-center">
            <MessageSquare size={30} className="mb-3 text-gray-300" />
            <p className="text-sm font-semibold text-gray-600">등록된 질문이 없습니다.</p>
            <p className="mt-1 text-xs text-gray-400">첫 번째 질문을 작성해보세요.</p>
          </div>
        ) : (
          visiblePosts.map((post, index) => (
            <button
              type="button"
              key={post.id}
              onClick={() => setSelectedPostId(post.id)}
              className={`flex w-full items-center gap-4 px-5 py-4 text-left transition hover:bg-gray-50 ${
                index > 0 ? 'border-t border-gray-100' : ''
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  {post.isPrivate && <Lock size={14} className="shrink-0 text-gray-400" />}
                  <h2 className="truncate text-sm font-semibold text-gray-900">{post.title}</h2>
                  {!!post.comments?.length && (
                    <span className="shrink-0 text-xs font-semibold text-green-700">
                      {post.comments.length}
                    </span>
                  )}
                </div>
                <div className="mt-1.5 flex items-center gap-2 text-xs text-gray-400">
                  <span className="font-medium text-gray-500">{post.authorName}</span>
                  <span aria-hidden="true">·</span>
                  <time>{formatDate(post.createdAt)}</time>
                  {post.isPrivate && <span>비공개</span>}
                </div>
              </div>
              <MessageSquare size={17} className="shrink-0 text-gray-300" />
            </button>
          ))
        )}
      </section>

      {showWriteModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4"
          onClick={() => setShowWriteModal(false)}
        >
          <div
            className="w-full max-w-xl overflow-hidden rounded-md bg-white shadow-2xl"
            onClick={event => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <h2 className="text-lg font-bold text-gray-900">질문 작성</h2>
              <button
                type="button"
                onClick={() => setShowWriteModal(false)}
                className="p-1 text-gray-400 transition hover:text-gray-700"
                title="닫기"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 p-5">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-600">제목</label>
                <input
                  type="text"
                  value={newPost.title}
                  onChange={event => setNewPost({ ...newPost, title: event.target.value })}
                  placeholder="질문 제목"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-600">내용</label>
                <textarea
                  value={newPost.content}
                  onChange={event => setNewPost({ ...newPost, content: event.target.value })}
                  placeholder="궁금한 내용을 입력하세요."
                  rows={9}
                  className={`${inputClass} resize-none`}
                />
              </div>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={newPost.isPrivate}
                  onChange={event => setNewPost({ ...newPost, isPrivate: event.target.checked })}
                  className="h-4 w-4 accent-gray-800"
                />
                <Lock size={14} />
                관리자에게만 공개
              </label>
            </div>

            <div className="flex justify-end gap-2 border-t border-gray-100 px-5 py-4">
              <button
                type="button"
                onClick={() => setShowWriteModal(false)}
                className="rounded-md px-4 py-2 text-sm font-semibold text-gray-500 transition hover:bg-gray-100"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleCreatePost}
                className="rounded-md bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-700"
              >
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
            className="max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-md bg-white shadow-2xl"
            onClick={event => event.stopPropagation()}
          >
            <header className="border-b border-gray-100 px-6 py-5">
              <div className="flex items-start justify-between gap-5">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {selectedPost.isPrivate && <Lock size={16} className="text-gray-400" />}
                    <h2 className="text-xl font-bold text-gray-900">{selectedPost.title}</h2>
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-xs text-gray-400">
                    <span className="font-semibold text-gray-600">{selectedPost.authorName}</span>
                    <span aria-hidden="true">·</span>
                    <time>{formatDate(selectedPost.createdAt)}</time>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedPostId(null)}
                  className="shrink-0 p-1 text-gray-400 transition hover:text-gray-700"
                  title="닫기"
                >
                  <X size={20} />
                </button>
              </div>

              <p className="mt-6 whitespace-pre-wrap text-sm leading-7 text-gray-700">
                {selectedPost.content}
              </p>

              {(selectedPost.authorId === currentUser.id || isAdmin) && (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('질문을 삭제할까요?')) {
                      onDeletePost(selectedPost.id);
                      setSelectedPostId(null);
                    }
                  }}
                  className="mt-5 inline-flex items-center gap-1.5 text-xs font-semibold text-red-500 transition hover:text-red-700"
                >
                  <Trash2 size={14} />
                  삭제
                </button>
              )}
            </header>

            <section className="px-6 py-5">
              <div className="mb-4 flex items-center gap-2">
                <MessageSquare size={17} className="text-gray-400" />
                <h3 className="text-sm font-bold text-gray-800">
                  답변 {selectedPost.comments?.length || 0}
                </h3>
              </div>

              <div className="space-y-3">
                {selectedPost.comments?.map(comment => (
                  <div key={comment.id} className="rounded-md bg-gray-50 px-4 py-3">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-semibold text-gray-700">{comment.authorName}</span>
                        <time className="text-gray-400">{formatDate(comment.createdAt)}</time>
                      </div>
                      {(comment.authorId === currentUser.id || isAdmin) && (
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm('답변을 삭제할까요?')) {
                              onDeleteComment(selectedPost.id, comment.id);
                            }
                          }}
                          className="text-gray-300 transition hover:text-red-500"
                          title="답변 삭제"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                    <p className="whitespace-pre-wrap text-sm leading-6 text-gray-700">
                      {comment.content}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-5 border-t border-gray-100 pt-5">
                <textarea
                  value={commentText}
                  onChange={event => setCommentText(event.target.value)}
                  placeholder="답변을 입력하세요."
                  rows={3}
                  className={`${inputClass} resize-none`}
                />
                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={handleCreateComment}
                    className="inline-flex items-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-700"
                  >
                    <Send size={15} />
                    답변 등록
                  </button>
                </div>
              </div>
            </section>
          </article>
        </div>
      )}
    </div>
  );
}
