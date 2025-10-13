import React, { useState } from 'react';
import { MessageSquare, Lock, Eye, Send, Trash2, Edit2, X } from 'lucide-react';

export default function QnABoard({ currentUser, posts = [], onCreatePost, onDeletePost, onCreateComment, onDeleteComment }) {
  const [showWriteModal, setShowWriteModal] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [newPost, setNewPost] = useState({
    title: '',
    content: '',
    isPrivate: false
  });
  const [commentText, setCommentText] = useState('');

  const isAdmin = currentUser?.isAdmin || currentUser?.isSuperAdmin;

  // 게시글 작성
  const handleCreatePost = () => {
    if (!newPost.title.trim()) {
      alert('제목을 입력해주세요!');
      return;
    }
    if (!newPost.content.trim()) {
      alert('내용을 입력해주세요!');
      return;
    }

    onCreatePost({
      id: Date.now(),
      authorId: currentUser.id,
      authorName: currentUser.name,
      title: newPost.title,
      content: newPost.content,
      isPrivate: newPost.isPrivate,
      createdAt: new Date().toISOString(),
      comments: []
    });

    setNewPost({ title: '', content: '', isPrivate: false });
    setShowWriteModal(false);
  };

  // 댓글 작성
  const handleCreateComment = () => {
    if (!commentText.trim()) {
      alert('댓글 내용을 입력해주세요!');
      return;
    }

    onCreateComment(selectedPost.id, {
      id: Date.now(),
      authorId: currentUser.id,
      authorName: currentUser.name,
      content: commentText,
      createdAt: new Date().toISOString()
    });

    setCommentText('');
  };

  // 게시글 볼 수 있는지 확인
  const canViewPost = (post) => {
    if (!post.isPrivate) return true;
    if (isAdmin) return true;
    if (post.authorId === currentUser.id) return true;
    return false;
  };

  // 표시할 게시글 필터링
  const visiblePosts = posts.filter(post => canViewPost(post));

  // 날짜 포맷
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '방금 전';
    if (minutes < 60) return `${minutes}분 전`;
    if (hours < 24) return `${hours}시간 전`;
    if (days < 7) return `${days}일 전`;
    return date.toLocaleDateString('ko-KR');
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* 헤더 */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg p-6 shadow-xl mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
              <MessageSquare size={32} />
              Q&A 게시판
            </h1>
            <p className="text-indigo-100">총괄에게 궁금한 점을 물어보세요!</p>
          </div>
          <button
            onClick={() => setShowWriteModal(true)}
            className="bg-white text-indigo-600 px-6 py-3 rounded-lg hover:bg-indigo-50 font-semibold transition-colors shadow-lg"
          >
            글쓰기
          </button>
        </div>
      </div>

      {/* 게시글 목록 */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-md">
        {visiblePosts.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <MessageSquare size={64} className="mx-auto mb-4 opacity-30" />
            <p className="text-lg">아직 작성된 글이 없습니다</p>
            <p className="text-sm mt-2">첫 번째 질문을 남겨보세요!</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {visiblePosts.map(post => (
              <div
                key={post.id}
                onClick={() => setSelectedPost(post)}
                className="p-5 hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {post.isPrivate && (
                        <Lock size={16} className="text-gray-400" />
                      )}
                      <h3 className="text-lg font-bold text-gray-800 hover:text-indigo-600">
                        {post.title}
                      </h3>
                      {post.comments?.length > 0 && (
                        <span className="text-sm text-indigo-600 font-semibold">
                          [{post.comments.length}]
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-500">
                      <span className="font-semibold">{post.authorName}</span>
                      <span>•</span>
                      <span>{formatDate(post.createdAt)}</span>
                      {post.isPrivate && (
                        <>
                          <span>•</span>
                          <span className="text-gray-400 flex items-center gap-1">
                            <Lock size={12} />
                            비공개
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-gray-400">
                    <Eye size={18} />
                    <MessageSquare size={18} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 글쓰기 모달 */}
      {showWriteModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowWriteModal(false)}
        >
          <div
            className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6">
              <h2 className="text-2xl font-bold">새 글쓰기</h2>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  제목
                </label>
                <input
                  type="text"
                  value={newPost.title}
                  onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                  placeholder="제목을 입력하세요"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  내용
                </label>
                <textarea
                  value={newPost.content}
                  onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                  placeholder="내용을 입력하세요"
                  rows="10"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:border-indigo-500 focus:outline-none resize-none"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newPost.isPrivate}
                    onChange={(e) => setNewPost({ ...newPost, isPrivate: e.target.checked })}
                    className="w-5 h-5 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500"
                  />
                  <Lock size={16} className="text-gray-600" />
                  <span className="text-sm font-semibold text-gray-700">
                    비공개 (나와 총괄만 볼 수 있습니다)
                  </span>
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowWriteModal(false)}
                  className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300 font-semibold transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={handleCreatePost}
                  className="flex-1 bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 font-semibold transition-colors"
                >
                  작성하기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 게시글 상세 모달 */}
      {selectedPost && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedPost(null)}
        >
          <div
            className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 헤더 */}
            <div className="border-b border-gray-200 p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {selectedPost.isPrivate && (
                      <Lock size={20} className="text-gray-400" />
                    )}
                    <h2 className="text-2xl font-bold text-gray-800">
                      {selectedPost.title}
                    </h2>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-500">
                    <span className="font-semibold">{selectedPost.authorName}</span>
                    <span>•</span>
                    <span>{formatDate(selectedPost.createdAt)}</span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedPost(null)}
                  className="text-gray-400 hover:text-gray-600 p-2"
                >
                  <X size={24} />
                </button>
              </div>

              {/* 내용 */}
              <div className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                {selectedPost.content}
              </div>

              {/* 작성자 또는 관리자만 삭제 가능 */}
              {(selectedPost.authorId === currentUser.id || isAdmin) && (
                <div className="flex gap-2 mt-4 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => {
                      if (window.confirm('정말 삭제하시겠습니까?')) {
                        onDeletePost(selectedPost.id);
                        setSelectedPost(null);
                      }
                    }}
                    className="text-red-600 hover:text-red-700 text-sm font-semibold flex items-center gap-1"
                  >
                    <Trash2 size={16} />
                    삭제
                  </button>
                </div>
              )}
            </div>

            {/* 댓글 섹션 */}
            <div className="p-6">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <MessageSquare size={20} />
                댓글 {selectedPost.comments?.length || 0}
              </h3>

              {/* 댓글 목록 */}
              <div className="space-y-3 mb-4">
                {selectedPost.comments?.map(comment => (
                  <div key={comment.id} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-800">{comment.authorName}</span>
                        <span className="text-sm text-gray-500">{formatDate(comment.createdAt)}</span>
                      </div>
                      {(comment.authorId === currentUser.id || isAdmin) && (
                        <button
                          onClick={() => {
                            if (window.confirm('댓글을 삭제하시겠습니까?')) {
                              onDeleteComment(selectedPost.id, comment.id);
                            }
                          }}
                          className="text-gray-400 hover:text-red-600"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                    <p className="text-gray-700 whitespace-pre-wrap">{comment.content}</p>
                  </div>
                ))}
              </div>

              {/* 댓글 작성 */}
              <div className="border-t border-gray-200 pt-4">
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="댓글을 입력하세요..."
                  rows="3"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:border-indigo-500 focus:outline-none resize-none mb-3"
                />
                <div className="flex justify-end">
                  <button
                    onClick={handleCreateComment}
                    className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 font-semibold transition-colors flex items-center gap-2"
                  >
                    <Send size={18} />
                    댓글 작성
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}