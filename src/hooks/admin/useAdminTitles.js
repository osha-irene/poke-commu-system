// src/hooks/admin/useAdminTitles.js
// Title definitions are managed as static JSON. Per-member title state stays in Firebase.

import { TITLES } from '../../data/titles';

export const useAdminTitles = () => {
  const titles = TITLES
    .filter(t => t.id !== 'none')
    .map(t => ({
      id: t.id,
      label: t.label,
      icon: t.icon || null,
      iconUrl: t.iconUrl || t.icon || null,
    }));

  return { titles };
};
