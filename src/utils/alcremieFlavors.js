// 마빌크(밀크시) → 마휘핑(알크리미) 진화 시 선택 가능한 "맛"(크림) 목록.
// src/assets/pkm/alcremie 안의 파일명은 `{맛}_{장식}.png` 형태이지만,
// 바닐라 크림만 heart/star/clover 파일명에 번호가 붙어 있어 별도 매핑이 필요하다.
const alcremieImages = require.context('../assets/pkm/alcremie', false, /\.png$/);

export const ALCREMIE_FLAVORS = [
  { id: 'vanilla', label: '밀키바닐라' },
  { id: 'caramel', label: '캐러멜믹스' },
  { id: 'ruby', label: '밀키루비' },
  { id: 'rubyswirl', label: '루비믹스' },
  { id: 'matcha', label: '밀키말차' },
  { id: 'lemon', label: '밀키레몬' },
  { id: 'salt', label: '밀키솔트' },
  { id: 'mint', label: '밀키민트' },
  { id: 'rainbow', label: '트러플믹스' },
];

// 사탕공예 아이템(nameEn) → 장식(파일명 접미사)
export const ALCREMIE_SWEET_TO_SHAPE = {
  'strawberry-sweet': 'strawberry',
  'love-sweet': 'heart',
  'berry-sweet': 'berry',
  'clover-sweet': 'clover',
  'flower-sweet': 'flower',
  'star-sweet': 'star',
  'ribbon-sweet': 'ribbon',
};

// 어드민 강제 진화에서 사탕공예 종류를 먼저 고를 때 쓰는 목록 (items.json의 실제 아이템명 기준)
export const ALCREMIE_SHAPES = [
  { id: 'strawberry', label: '딸기사탕공예' },
  { id: 'heart', label: '하트사탕공예' },
  { id: 'berry', label: '베리사탕공예' },
  { id: 'clover', label: '네잎사탕공예' },
  { id: 'flower', label: '꽃사탕공예' },
  { id: 'star', label: '스타사탕공예' },
  { id: 'ribbon', label: '리본사탕공예' },
];

const VANILLA_SHAPE_FILENAMES = {
  heart: 'vanilla_003_heart.png',
  star: 'vanilla_004_star.png',
  clover: 'vanilla_005_clover.png',
};

export const DEFAULT_ALCREMIE_SHAPE = 'strawberry';

export function getAlcremieShapeForItem(itemNameEn) {
  return ALCREMIE_SWEET_TO_SHAPE[itemNameEn] || DEFAULT_ALCREMIE_SHAPE;
}

export function getAlcremieImage(flavorId, shapeId = DEFAULT_ALCREMIE_SHAPE) {
  const filename = flavorId === 'vanilla' && VANILLA_SHAPE_FILENAMES[shapeId]
    ? VANILLA_SHAPE_FILENAMES[shapeId]
    : `${flavorId}_${shapeId}.png`;

  try {
    return alcremieImages(`./${filename}`);
  } catch {
    return null;
  }
}
