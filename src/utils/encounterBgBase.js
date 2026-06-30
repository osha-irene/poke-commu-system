import grassDay from '../assets/map/bg-base/grass-day.png';
import grassAfternoon from '../assets/map/bg-base/grass-afternoon.png';
import grassNight from '../assets/map/bg-base/grass-night.png';
import pathDay from '../assets/map/bg-base/path-day.png';
import pathAfternoon from '../assets/map/bg-base/path-afternoon.png';
import pathNight from '../assets/map/bg-base/path-night.png';
import sandDay from '../assets/map/bg-base/sand-day.png';
import sandAfternoon from '../assets/map/bg-base/sand-afternoon.png';
import sandNight from '../assets/map/bg-base/sand-night.png';
import waterDay from '../assets/map/bg-base/water-day.png';
import waterAfternoon from '../assets/map/bg-base/water-afternoon.png';
import waterNight from '../assets/map/bg-base/water-night.png';
import rockyDay from '../assets/map/bg-base/rocky-day.png';
import rockyAfternoon from '../assets/map/bg-base/rocky-afternoon.png';
import rockyNight from '../assets/map/bg-base/rocky-night.png';
import iceDay from '../assets/map/bg-base/ice-day.png';
import iceAfternoon from '../assets/map/bg-base/ice-afternoon.png';
import iceNight from '../assets/map/bg-base/ice-night.png';
import mudDay from '../assets/map/bg-base/mud-day.png';
import mudAfternoon from '../assets/map/bg-base/mud-afternoon.png';
import mudNight from '../assets/map/bg-base/mud-night.png';
import wetpathDay from '../assets/map/bg-base/wetpath-day.png';
import wetpathAfternoon from '../assets/map/bg-base/wetpath-afternoon.png';
import wetpathNight from '../assets/map/bg-base/wetpath-night.png';
import snowAfternoon from '../assets/map/bg-base/snow-afternoon.png';
import snowNight from '../assets/map/bg-base/snow-night.png';
import cave from '../assets/map/bg-base/cave.png';

const BG_BASE_MAP = {
  'BEACH':      { day: sandDay,      afternoon: sandAfternoon,      night: sandNight },
  'CAVE':       { day: cave,         afternoon: cave,               night: cave },
  'DESERT':     { day: sandDay,      afternoon: sandAfternoon,      night: sandNight },
  'LAKE':       { day: waterDay,     afternoon: waterAfternoon,     night: waterNight },
  'MOUNTAIN':   { day: rockyDay,     afternoon: rockyAfternoon,     night: rockyNight },
  'OCEAN':      { day: waterDay,     afternoon: waterAfternoon,     night: waterNight },
  'PATH':       { day: pathDay,      afternoon: pathAfternoon,      night: pathNight },
  'SNOW':       { day: snowAfternoon,afternoon: snowAfternoon,      night: snowNight },
  'TALL GRASS': { day: grassDay,     afternoon: grassAfternoon,     night: grassNight },
  'UNDERWATER': { day: waterDay,     afternoon: waterAfternoon,     night: waterNight },
};

export function getEncounterBgBase(type) {
  if (!type || !BG_BASE_MAP[type]) return null;
  const hour = new Date().getHours();
  const isNight = hour < 6 || hour >= 18;
  const isAfternoon = hour >= 12 && hour < 18;
  const entry = BG_BASE_MAP[type];
  return isNight ? entry.night : isAfternoon ? entry.afternoon : entry.day;
}
