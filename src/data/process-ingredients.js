const fs = require('fs');
const https = require('https');
const sharp = require('sharp');

class IngredientProcessor {
  constructor(options = {}) {
    this.outputDir = options.outputDir || './ingredient-sprites';
    this.size = options.size || 32;
    this.delay = options.delay || 500;
  }

  async init() {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  async downloadImage(url) {
    return new Promise((resolve, reject) => {
      https.get(url, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`HTTP ${response.statusCode}`));
          return;
        }
        const chunks = [];
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () => resolve(Buffer.concat(chunks)));
      }).on('error', reject);
    });
  }

  async resizeImage(buffer, size) {
    return sharp(buffer)
      .resize(size, size, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toBuffer();
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async processItems(inputFile = 'items.json') {
    await this.init();
    
    // JSON 파일 읽기
    const data = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
    
    // 배열인지 객체인지 확인
    let items;
    if (Array.isArray(data)) {
      items = data;
    } else if (typeof data === 'object') {
      // 객체인 경우, items 속성이 있는지 확인
      if (data.items && Array.isArray(data.items)) {
        items = data.items;
      } else {
        // 객체의 값들을 배열로 변환
        items = Object.values(data);
      }
    } else {
      throw new Error('Invalid JSON format');
    }

    console.log(`총 ${items.length}개 아이템 발견`);

    const stats = {
      total: 0,
      success: 0,
      failed: 0,
      skipped: 0
    };

    for (let item of items) {
      // 카레 또는 샌드위치 재료 확인
      const isCurryIngredient = 
        item.category === 'curry-ingredients' || 
        item.categories?.includes('curry-ingredients');
      
      const isSandwichIngredient = 
        item.category === 'sandwich-ingredients' || 
        item.categories?.includes('sandwich-ingredients');
      
      const isIngredient = isCurryIngredient || isSandwichIngredient;

      if (isIngredient && item.nameEn) {
        stats.total++;
        
        // 1. cooking 필드 업데이트
        if (!item.cooking) {
          item.cooking = {};
        }
        
        item.cooking.isIngredient = true;
        item.cooking.isCookable = true;
        
        // 기존 필드 유지
        item.cooking.resultItem = item.cooking.resultItem || null;
        item.cooking.requiredItems = item.cooking.requiredItems || [];
        item.cooking.cookingTime = item.cooking.cookingTime || 0;
        item.cooking.difficulty = item.cooking.difficulty || 'easy';
        item.cooking.quality = item.cooking.quality || 'normal';
        
        // 2. 이미지 처리
        const cleanName = item.nameEn.toLowerCase().replace(/-/g, '');
        const serebiiUrl = `https://www.serebii.net/itemdex/sprites/${cleanName}.png`;
        const localPath = `${this.outputDir}/${cleanName}.png`;
        const localUrl = `./${this.outputDir}/${cleanName}.png`;
        
        console.log(`처리 중: ${item.nameEn}...`);
        
        try {
          // 이미지 다운로드 및 리사이징
          const buffer = await this.downloadImage(serebiiUrl);
          const resized = await this.resizeImage(buffer, this.size);
          await fs.promises.writeFile(localPath, resized);
          
          // URL 업데이트
          item.spriteUrl = localUrl;
          item.imageUrl = localUrl;
          
          console.log(`✓ 완료: ${item.nameEn} (${this.size}x${this.size})`);
          stats.success++;
        } catch (error) {
          console.log(`✗ 이미지 실패: ${item.nameEn} - ${error.message}`);
          console.log(`  (cooking 필드는 업데이트됨)`);
          stats.failed++;
        }
        
        await this.sleep(this.delay);
      } else if (item.cooking) {
        stats.skipped++;
      }
    }

    // 결과 저장 (원래 구조 유지)
    let outputData;
    if (Array.isArray(data)) {
      outputData = items;
    } else if (data.items) {
      outputData = { ...data, items };
    } else {
      // 원래 키로 다시 매핑
      outputData = {};
      const originalKeys = Object.keys(data);
      items.forEach((item, index) => {
        if (index < originalKeys.length) {
          outputData[originalKeys[index]] = item;
        }
      });
    }

    fs.writeFileSync('items_updated.json', JSON.stringify(outputData, null, 2));
    
    console.log(`\n=== 처리 완료 ===`);
    console.log(`총 재료: ${stats.total}`);
    console.log(`성공: ${stats.success}`);
    console.log(`실패: ${stats.failed}`);
    console.log(`스킵: ${stats.skipped}`);
    
    return stats;
  }
}

// 실행
const processor = new IngredientProcessor({
  outputDir: './ingredient-sprites',
  size: 32,
  delay: 500
});

processor.processItems().catch(console.error);