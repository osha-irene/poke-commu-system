import { useState, useEffect } from 'react';
import { ref, get, onChildAdded, onChildChanged, onChildRemoved, onValue, set, update } from 'firebase/database';
import { database } from '../../firebase';

const DEFAULT_TEMPLATE = [
  { key: 'catchphrase', label: '한마디' },
  { key: 'personality', label: '성격' },
  { key: 'background',  label: '설정' },
  { key: 'extra',       label: '기타' },
];

const TEMPLATE_PATH = 'config/memberProfileTemplate';
const SECTIONS_PATH = (id) => `members/${id}/profileSections`;

export function useProfileTemplate() {
  const [template, setTemplate] = useState(DEFAULT_TEMPLATE);

  useEffect(() => {
    const r = ref(database, TEMPLATE_PATH);
    return onValue(r, snap => {
      const val = snap.val();
      if (Array.isArray(val) && val.length > 0) setTemplate(val);
    });
  }, []);

  const saveTemplate = (sections) => set(ref(database, TEMPLATE_PATH), sections);

  return { template, saveTemplate };
}

export function useMemberProfile(memberId) {
  const [sections, setSections] = useState({});

  useEffect(() => {
    if (!memberId) return;
    const r = ref(database, SECTIONS_PATH(memberId));
    let isInitialLoad = true;

    get(r)
      .then(snap => setSections(snap.val() || {}))
      .finally(() => {
        isInitialLoad = false;
      });

    const upsertSection = (snap) => {
      if (isInitialLoad) return;
      setSections(prev => ({
        ...prev,
        [snap.key]: snap.val()
      }));
    };

    const unsubAdded = onChildAdded(r, upsertSection);
    const unsubChanged = onChildChanged(r, upsertSection);
    const unsubRemoved = onChildRemoved(r, (snap) => {
      if (isInitialLoad) return;
      setSections(prev => {
        const next = { ...prev };
        delete next[snap.key];
        return next;
      });
    });

    return () => {
      unsubAdded();
      unsubChanged();
      unsubRemoved();
    };
  }, [memberId]);

  const saveSection = async (key, value) => {
    await update(ref(database, SECTIONS_PATH(memberId)), { [key]: value });
  };

  return { sections, saveSection };
}
