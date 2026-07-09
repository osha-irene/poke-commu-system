// src/hooks/community/useQnA.js
// Q&A board data helpers

import { useState, useEffect } from 'react';
import { ref, get, set, runTransaction } from 'firebase/database';
import { database } from '../../firebase';

export function useQnA() {
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadPosts = async () => {
      try {
        const postsRef = ref(database, 'community/qnaPosts');
        const snapshot = await get(postsRef);

        if (snapshot.exists()) {
          setPosts(snapshot.val());
        }
      } catch (error) {
        console.error('QnA posts load failed:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadPosts();
  }, []);

  const updatePosts = async (updater) => {
    try {
      const postsRef = ref(database, 'community/qnaPosts');
      const result = await runTransaction(postsRef, (currentPosts) => {
        const current = Array.isArray(currentPosts) ? currentPosts : [];
        return updater(current);
      });

      if (result.committed) {
        setPosts(result.snapshot.val() || []);
      }
    } catch (error) {
      console.error('QnA posts save failed:', error);
    }
  };

  const createPost = (post) => {
    updatePosts(prev => [post, ...prev]);
  };

  const deletePost = (postId) => {
    updatePosts(prev => prev.filter(p => p.id !== postId));
  };

  const createComment = (postId, comment) => {
    updatePosts(prev => prev.map(p =>
      p.id === postId
        ? { ...p, comments: [...(p.comments || []), comment] }
        : p
    ));
  };

  const deleteComment = (postId, commentId) => {
    updatePosts(prev => prev.map(p =>
      p.id === postId
        ? { ...p, comments: (p.comments || []).filter(c => c.id !== commentId) }
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
