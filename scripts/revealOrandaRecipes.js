// scripts/revealOrandaRecipes.js
// 실행: node scripts/revealOrandaRecipes.js
// 오란다 고정 레시피(recipe_oranda_*) 36개를 gameData/discoveredRecipes에 추가해
// 레시피북에서 "발견됨" 상태(재료 공개)로 보이게 만든다.

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

const recipesData = require('../src/data/recipes.json');
const orandaIds = recipesData.recipes
  .filter((r) => r.id.startsWith('recipe_oranda_'))
  .map((r) => r.id);

const existingDiscovered = toArray(fetchJSON(`${BASE}/gameData/discoveredRecipes.json`));
const existingSet = new Set(existingDiscovered.filter(Boolean));

const toAdd = orandaIds.filter((id) => !existingSet.has(id));

console.log(`기존 발견 레시피 ${existingDiscovered.length}개 + 새로 공개할 오란다 ${toAdd.length}개`);

if (toAdd.length === 0) {
  console.log('이미 모두 공개되어 있습니다.');
  process.exit(0);
}

const merged = [...existingDiscovered, ...toAdd];

const tmpFile = path.join(__dirname, '_tmp_discovered_recipes.json');
fs.writeFileSync(tmpFile, JSON.stringify(merged, null, 2));

console.log('Firebase CLI로 업로드 중...');
execSync(`firebase database:set /gameData/discoveredRecipes "${tmpFile}" --project ${PROJECT} --force`, { stdio: 'inherit' });

fs.unlinkSync(tmpFile);

console.log(`완료! 오란다 레시피 ${toAdd.length}개를 레시피북에 공개 처리했습니다.`);
