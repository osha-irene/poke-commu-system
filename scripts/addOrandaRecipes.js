// scripts/addOrandaRecipes.js
// 실행: node scripts/addOrandaRecipes.js
// src/data/recipes.json에 이미 들어있는 오란다(recipe_oranda_*) 레시피 중
// Firebase gameData/recipes에 아직 없는 것만 골라 추가한다.

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
const orandaRecipes = recipesData.recipes.filter((r) => r.id.startsWith('recipe_oranda_'));

const existingRecipes = toArray(fetchJSON(`${BASE}/gameData/recipes.json`));
const existingIds = new Set(existingRecipes.map((r) => r && r.id).filter(Boolean));

const toAdd = orandaRecipes.filter((r) => !existingIds.has(r.id));

console.log(`기존 레시피 ${existingRecipes.length}개 + 추가할 오란다 레시피 ${toAdd.length}개`);

if (toAdd.length === 0) {
  console.log('추가할 오란다 레시피가 없습니다 (이미 모두 등록됨).');
  process.exit(0);
}

const merged = [...existingRecipes, ...toAdd];
const clean = (v) => JSON.parse(JSON.stringify(v, (k, val) => (val === undefined ? null : val)));

const tmpFile = path.join(__dirname, '_tmp_oranda_recipes.json');
fs.writeFileSync(tmpFile, JSON.stringify(clean(merged), null, 2));

console.log('Firebase CLI로 업로드 중...');
execSync(`firebase database:set /gameData/recipes "${tmpFile}" --project ${PROJECT} --force`, { stdio: 'inherit' });

fs.unlinkSync(tmpFile);

console.log(`완료! 오란다 레시피 ${toAdd.length}개 추가됨.`);
