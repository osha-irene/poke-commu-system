// scripts/migrate-structure.js
// 프로젝트 구조 마이그레이션 스크립트
// 실행: node scripts/migrate-structure.js

const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, '..', 'src');

// import 경로 교체 맵
const IMPORT_REPLACEMENTS = [
  // UI 컴포넌트 경로 변경 (1단계 상대경로)
  { from: /from\s+['"]\.\.\/ui\/Button['"]/g, to: "from '../common/Button'" },
  { from: /from\s+['"]\.\.\/ui\/Card['"]/g, to: "from '../common/Card'" },
  { from: /from\s+['"]\.\.\/ui\/Badge['"]/g, to: "from '../common/Badge'" },
  { from: /from\s+['"]\.\.\/ui\/Modal['"]/g, to: "from '../common/Modal'" },
  { from: /from\s+['"]\.\.\/ui\/Input['"]/g, to: "from '../common/Input'" },
  { from: /from\s+['"]\.\.\/ui\/TypeBadge['"]/g, to: "from '../common/TypeBadge'" },
  { from: /from\s+['"]\.\.\/ui['"]/g, to: "from '../common'" },
  
  // 상대 경로 2단계
  { from: /from\s+['"]\.\.\/\.\.\/ui\/Button['"]/g, to: "from '../../common/Button'" },
  { from: /from\s+['"]\.\.\/\.\.\/ui\/Card['"]/g, to: "from '../../common/Card'" },
  { from: /from\s+['"]\.\.\/\.\.\/ui\/Badge['"]/g, to: "from '../../common/Badge'" },
  { from: /from\s+['"]\.\.\/\.\.\/ui\/Modal['"]/g, to: "from '../../common/Modal'" },
  { from: /from\s+['"]\.\.\/\.\.\/ui\/Input['"]/g, to: "from '../../common/Input'" },
  { from: /from\s+['"]\.\.\/\.\.\/ui\/TypeBadge['"]/g, to: "from '../../common/TypeBadge'" },
  { from: /from\s+['"]\.\.\/\.\.\/ui['"]/g, to: "from '../../common'" },
  
  // 상대 경로 3단계
  { from: /from\s+['"]\.\.\/\.\.\/\.\.\/ui\/Button['"]/g, to: "from '../../../common/Button'" },
  { from: /from\s+['"]\.\.\/\.\.\/\.\.\/ui\/Card['"]/g, to: "from '../../../common/Card'" },
  { from: /from\s+['"]\.\.\/\.\.\/\.\.\/ui\/Badge['"]/g, to: "from '../../../common/Badge'" },
  { from: /from\s+['"]\.\.\/\.\.\/\.\.\/ui\/Modal['"]/g, to: "from '../../../common/Modal'" },
  { from: /from\s+['"]\.\.\/\.\.\/\.\.\/ui\/Input['"]/g, to: "from '../../../common/Input'" },
  { from: /from\s+['"]\.\.\/\.\.\/\.\.\/ui\/TypeBadge['"]/g, to: "from '../../../common/TypeBadge'" },
  { from: /from\s+['"]\.\.\/\.\.\/\.\.\/ui['"]/g, to: "from '../../../common'" },
  
  // 컴포넌트 내부 경로
  { from: /from\s+['"]\.\/ui\//g, to: "from './common/" },
  { from: /from\s+['"]\.\.\/components\/ui\//g, to: "from '../components/common/" },
];

// 파일 내용에서 import 경로 교체
function replaceImports(content) {
  let result = content;
  
  for (const replacement of IMPORT_REPLACEMENTS) {
    result = result.replace(replacement.from, replacement.to);
  }
  
  return result;
}

// 디렉토리 재귀 탐색
function walkDir(dir, callback) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      // node_modules, _old, _backup, _archive 제외
      if (!['node_modules', '_old', '_backup', '_archive', '.git'].includes(file)) {
        walkDir(filePath, callback);
      }
    } else if (file.endsWith('.js') || file.endsWith('.jsx')) {
      callback(filePath);
    }
  }
}

// 메인 실행
function main() {
  console.log('========================================');
  console.log('Import Path Migration');
  console.log('========================================');
  console.log('');
  
  let modifiedCount = 0;
  
  walkDir(SRC_DIR, (filePath) => {
    const content = fs.readFileSync(filePath, 'utf8');
    const newContent = replaceImports(content);
    
    if (content !== newContent) {
      fs.writeFileSync(filePath, newContent, 'utf8');
      console.log('Modified: ' + path.relative(SRC_DIR, filePath));
      modifiedCount++;
    }
  });
  
  console.log('');
  console.log('========================================');
  console.log('Done! ' + modifiedCount + ' files modified');
  console.log('========================================');
}

main();
