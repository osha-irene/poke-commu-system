import titles from './titles.json';

export const TITLES = titles;

export const getTitleById = (id) => TITLES.find(t => t.id === id) || null;
