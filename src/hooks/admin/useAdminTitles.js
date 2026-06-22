// src/hooks/admin/useAdminTitles.js
// Firebase 기반 동적 칭호 관리 훅

import { useState, useEffect, useRef } from 'react';
import { ref, set, onValue, remove, update } from 'firebase/database';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { database, storage } from '../../firebase';
import { TITLES } from '../../data/titles';

export const useAdminTitles = () => {
  const [titles, setTitles] = useState(TITLES.filter(t => t.id !== 'none'));
  const seededRef = useRef(false);

  useEffect(() => {
    const titlesRef = ref(database, 'titles');
    const unsub = onValue(titlesRef, (snap) => {
      if (snap.exists()) {
        const data = snap.val();
        const loaded = Object.values(data).map(t => ({
          id: t.id,
          label: t.label,
          iconUrl: t.iconUrl || null,
          icon: t.icon || null,
        }));
        setTitles(loaded);
      } else if (!seededRef.current) {
        // Firebase가 비어있으면 최초 1회만 정적 데이터를 seed
        seededRef.current = true;
        const seeds = TITLES.filter(t => t.id !== 'none');
        const seedData = {};
        seeds.forEach(t => {
          seedData[t.id] = { id: t.id, label: t.label, icon: t.icon || null, iconUrl: null };
        });
        set(ref(database, 'titles'), seedData);
      } else {
        // 모두 삭제된 경우 빈 목록으로 유지
        setTitles([]);
      }
    });
    return () => unsub();
  }, []);

  const addTitle = async (label) => {
    const trimmed = String(label || '').trim();
    if (!trimmed) return;
    const id = `title-${Date.now()}`;
    const titleRef = ref(database, `titles/${id}`);
    await set(titleRef, { id, label: trimmed, iconUrl: null });
  };

  const deleteTitle = async (id) => {
    if (!id) return;
    const titleRef = ref(database, `titles/${id}`);
    await remove(titleRef);
  };

  const renameTitle = async (id, label) => {
    const trimmed = String(label || '').trim();
    if (!id || !trimmed) return;
    const titleRef = ref(database, `titles/${id}`);
    await update(titleRef, { label: trimmed });
  };

  const uploadTitleIcon = async (id, file) => {
    if (!id || !file) return null;
    const ext = file.name.split('.').pop() || 'png';
    const path = `titles/${id}/icon.${ext}`;
    const sRef = storageRef(storage, path);
    try {
      await uploadBytes(sRef, file, { contentType: file.type });
      const url = await getDownloadURL(sRef);
      const titleRef = ref(database, `titles/${id}`);
      await update(titleRef, { iconUrl: url });
      return url;
    } catch (error) {
      console.error('❌ 칭호 아이콘 업로드 실패:', error);
      alert('아이콘 업로드에 실패했습니다: ' + error.message);
      return null;
    }
  };

  return {
    titles,
    addTitle,
    deleteTitle,
    renameTitle,
    uploadTitleIcon,
  };
};
