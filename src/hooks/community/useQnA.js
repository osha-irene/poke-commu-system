// src/hooks/community/useQnA.js
// Q&A 게시판 로직 훅

import { useState, useEffect } from 'react';
import { ref, get, set } from 'firebase/database';
import { database } from '../../firebase';

export function useQnA() {
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // 게시판 로드
  useEffect(() => {
    const loadPosts = async () => {
      try {
        const postsRef = ref(database, 'community/qnaPosts');
        const snapshot = await get(postsRef);
        
        if (snapshot.exists()) {
          setPosts(snapshot.val());
        }
      } catch (error) {
        console.error('게시판 로드 실패:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadPosts();
  }, []);

  // 게시판 저장
  useEffect(() => {
    const savePosts = async () => {
      if (isLoading || posts.length === 0) return;

      try {
        const postsRef = ref(database, 'community/qnaPosts');
        await set(postsRef, posts);
      } catch (error) {
        console.error('게시판 저장 실패:', error);
      }
    };

    savePosts();
  }, [posts, isLoading]);

  // 게시글 생성
  const createPost = (post) => {
    setPosts(prev => [post, ...prev]);
  };

  // 게시글 삭제
  const deletePost = (postId) => {
    setPosts(prev => prev.filter(p => p.id !== postId));
  };

  // 댓글 생성
  const createComment = (postId, comment) => {
    setPosts(prev => prev.map(p => 
      p.id === postId 
        ? { ...p, comments: [...(p.comments || []), comment] }
        : p
    ));
  };

  // 댓글 삭제
  const deleteComment = (postId, commentId) => {
    setPosts(prev => prev.map(p =>
      p.id === postId
        ? { ...p, comments: p.comments.filter(c => c.id !== commentId) }
        : p
    ));
  };

  return {
    posts,
    isLoading,
    createPost,
    deletePost,
    createComment,
    deleteComment
  };
}

export default useQnA;
