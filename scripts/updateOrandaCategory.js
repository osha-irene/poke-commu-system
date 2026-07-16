// scripts/updateOrandaCategory.js
// 실행: node scripts/updateOrandaCategory.js
// Firebase gameData/recipes에 이미 등록된 오란다(recipe_oranda_*, stat_recipe_oranda_*)
// 레시피의 result.pocket을 "berries"(나무열매) -> "vitamins"(영양)으로 일괄 변경한다.
// (완성된 요리 자체는 재료가 아니라 완제품이라, 커스텀 아이템 카테고리는 영양으로 분류)

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PROJECT = 'poke-commu-system';
const BASE = 'https://poke-commu-system-default-rtdb.firebaseio.com';

function fetchJSON(url) {
  const raw = execSync(`curl -s "${url}"`).toString();
  return JSON.parse(raw);
}

function toArray(val) {
  if (!val) return [];
  return Array.isArray(val) ? val : Object.values(val);
}

const existingRecipes = toArray(fetchJSON(`${BASE}/gameData/recipes.json`));

let changed = 0;
const updated = existingRecipes.map((r) => {
  if (!r || typeof r.id !== 'string') return r;
  const isOranda = r.id.startsWith('recipe_oranda_') || r.id.startsWith('stat_recipe_oranda_');
  if (!isOranda || !r.result || r.result.pocket !== 'berries') return r;
  changed += 1;
  return { ...r, result: { ...r.result, pocket: 'vitamins' } };
});

console.log(`기존 레시피 ${existingRecipes.length}개 중 오란다 레시피 ${changed}개의 카테고리를 영양으로 변경`);

if (changed === 0) {
  console.log('변경할 레시피가 없습니다 (이미 모두 영양 카테고리이거나 오란다 레시피가 없음).');
  process.exit(0);
}

const clean = (v) => JSON.parse(JSON.stringify(v, (k, val) => (val === undefined ? null : val)));

const tmpFile = path.join(__dirname, '_tmp_oranda_category_update.json');
fs.writeFileSync(tmpFile, JSON.stringify(clean(updated), null, 2));

console.log('Firebase CLI로 업로드 중...');
execSync(`firebase database:set /gameData/recipes "${tmpFile}" --project ${PROJECT} --force`, { stdio: 'inherit' });

fs.unlinkSync(tmpFile);

console.log(`완료! 오란다 레시피 ${changed}개 카테고리를 영양으로 변경했습니다.`);
