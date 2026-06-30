// 인카운터 배경 이미지 유틸
import BEACH from '../assets/map/background/BEACH.png';
import BEACH_2 from '../assets/map/background/BEACH 2.png';
import BEACH_NIGHT from '../assets/map/background/BEACH NIGHT.png';
import CAVE from '../assets/map/background/CAVE.png';
import CAVE_2 from '../assets/map/background/CAVE 2.png';
import CAVE_NIGHT from '../assets/map/background/CAVE NIGHT.png';
import DESERT from '../assets/map/background/DESERT.png';
import DESERT_NIGHT from '../assets/map/background/DESERT NIGHT.png';
import LAKE from '../assets/map/background/LAKE.png';
import LAKE_NIGHT from '../assets/map/background/LAKE NIGHT.png';
import MOUNTAIN from '../assets/map/background/MOUNTAIN.png';
import MOUNTAIN_2 from '../assets/map/background/MOUNTAIN 2.png';
import MOUNTAIN_NIGHT from '../assets/map/background/MOUNTAIN NIGHT.png';
import OCEAN from '../assets/map/background/OCEAN.png';
import OCEAN_NIGHT from '../assets/map/background/OCEAN NIGHT.png';
import PATH from '../assets/map/background/PATH.png';
import PATH_2 from '../assets/map/background/PATH 2.png';
import PATH_NIGHT from '../assets/map/background/PATH NIGHT.png';
import SNOW from '../assets/map/background/SNOW.png';
import SNOW_NIGHT from '../assets/map/background/SNOW NIGHT.png';
import TALL_GRASS from '../assets/map/background/TALL GRASS.png';
import TALL_GRASS_NIGHT from '../assets/map/background/TALL GRASS NIGHT.png';
import UNDERWATER from '../assets/map/background/UNDERWATER.png';

export const BACKGROUND_TYPES = [
  { key: 'BEACH',      label: '해변' },
  { key: 'CAVE',       label: '동굴' },
  { key: 'DESERT',     label: '사막' },
  { key: 'LAKE',       label: '호수' },
  { key: 'MOUNTAIN',   label: '산' },
  { key: 'OCEAN',      label: '바다' },
  { key: 'PATH',       label: '길' },
  { key: 'SNOW',       label: '설원' },
  { key: 'TALL GRASS', label: '풀숲' },
  { key: 'UNDERWATER', label: '수중' },
];

const BG_MAP = {
  'BEACH':      { day: [BEACH, BEACH_2],           night: [BEACH_NIGHT] },
  'CAVE':       { day: [CAVE, CAVE_2],             night: [CAVE_NIGHT] },
  'DESERT':     { day: [DESERT],                   night: [DESERT_NIGHT] },
  'LAKE':       { day: [LAKE],                     night: [LAKE_NIGHT] },
  'MOUNTAIN':   { day: [MOUNTAIN, MOUNTAIN_2],     night: [MOUNTAIN_NIGHT] },
  'OCEAN':      { day: [OCEAN],                    night: [OCEAN_NIGHT] },
  'PATH':       { day: [PATH, PATH_2],             night: [PATH_NIGHT] },
  'SNOW':       { day: [SNOW],                     night: [SNOW_NIGHT] },
  'TALL GRASS': { day: [TALL_GRASS],               night: [TALL_GRASS_NIGHT] },
  'UNDERWATER': { day: [UNDERWATER],               night: [UNDERWATER] },
};

export function getEncounterBackground(type) {
  if (!type || !BG_MAP[type]) return null;
  const hour = new Date().getHours();
  const isNight = hour < 6 || hour >= 18;
  const pool = isNight ? BG_MAP[type].night : BG_MAP[type].day;
  return pool[Math.floor(Math.random() * pool.length)];
}

export function getPreviewBackground(type) {
  if (!type || !BG_MAP[type]) return null;
  return BG_MAP[type].day[0];
}
