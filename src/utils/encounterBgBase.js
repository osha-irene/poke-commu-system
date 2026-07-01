import grassDay from '../assets/map/bg-base/grass-day.png';
import grassNight from '../assets/map/bg-base/grass-night.png';
import pathDay from '../assets/map/bg-base/path-day.png';
import pathNight from '../assets/map/bg-base/path-night.png';
import sandDay from '../assets/map/bg-base/sand-day.png';
import sandNight from '../assets/map/bg-base/sand-night.png';
import waterDay from '../assets/map/bg-base/water-day.png';
import waterNight from '../assets/map/bg-base/water-night.png';
import rockyDay from '../assets/map/bg-base/rocky-day.png';
import rockyNight from '../assets/map/bg-base/rocky-night.png';
import iceDay from '../assets/map/bg-base/ice-day.png';
import iceNight from '../assets/map/bg-base/ice-night.png';
import mudDay from '../assets/map/bg-base/mud-day.png';
import mudNight from '../assets/map/bg-base/mud-night.png';
import wetpathDay from '../assets/map/bg-base/wetpath-day.png';
import wetpathNight from '../assets/map/bg-base/wetpath-night.png';
import snowDay from '../assets/map/bg-base/snow-day.png';
import snowNight from '../assets/map/bg-base/snow-night.png';
import cave from '../assets/map/bg-base/cave.png';

const BG_BASE_MAP = {
  'BEACH':      { day: sandDay,  night: sandNight },
  'CAVE':       { day: cave,     night: cave },
  'DESERT':     { day: sandDay,  night: sandNight },
  'LAKE':       { day: waterDay, night: waterNight },
  'MOUNTAIN':   { day: rockyDay, night: rockyNight },
  'OCEAN':      { day: waterDay, night: waterNight },
  'PATH':       { day: pathDay,  night: pathNight },
  'SNOW':       { day: snowDay,  night: snowNight },
  'TALL GRASS': { day: grassDay, night: grassNight },
  'UNDERWATER': { day: waterDay, night: waterNight },
};

export function getEncounterBgBase(type) {
  if (!type || !BG_BASE_MAP[type]) return null;
  const hour = new Date().getHours();
  const isNight = hour < 6 || hour >= 18;
  const entry = BG_BASE_MAP[type];
  return isNight ? entry.night : entry.day;
}
