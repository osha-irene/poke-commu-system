import { useState, useEffect } from 'react';
import { ref, onValue, set, update } from 'firebase/database';
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
    return onValue(r, snap => setSections(snap.val() || {}));
  }, [memberId]);

  const saveSection = async (key, value) => {
    await update(ref(database, SECTIONS_PATH(memberId)), { [key]: value });
  };

  return { sections, saveSection };
}
