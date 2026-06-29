// scripts/addCookingRecipes.js
// 실행: node scripts/addCookingRecipes.js

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PROJECT = 'poke-commu-system';
const TMP = path.join(__dirname, '_tmp_recipes_write.json');

const IMG = (f) => `/img/items/foods/${f}`;
const RESULT_IMG = {
  '당근 케이크':               IMG('carrot-cake.png'),
  '당근 쿠키':                 IMG('carrot-cookie.png'),
  '두리안 치즈 피자':          IMG('durian-cheese-pizza.png'),
  '딸기 마카롱':               IMG('strawberry-macaron.png'),
  '초코 마카롱':               IMG('choco-macaron.png'),
  '베리 마카롱':               IMG('berry-macaron.png'),
  '딸기 초콜릿':               IMG('chocolate-strawberry.png'),
  '딸기 케이크':               IMG('strawberry_cake.png'),
  '딸기 타르트':               IMG('strawberry_cake.png'),
  '딸기잼':                    IMG('jam.png'),
  '딸기잼 쿠키':               IMG('cookie-jam.png'),
  '매쉬드 포테이토':           IMG('potato-mashed.png'),
  '밀크티':                    IMG('milktea.png'),
  '초코빵':                    IMG('choco-bread.png'),
  '브렉퍼스트':                IMG('breakfast.png'),
  '베리 케이크':               IMG('berry-cake.png'),
  '빵':                        IMG('bread.png'),
  '사과 파이':                 IMG('apple-pie.png'),
  '설탕 딸기':                 IMG('strawberry-sugar.png'),
  '아이스티':                  IMG('ice-tea.png'),
  '알리고':                    IMG('aligo.png'),
  '에그마요':                  IMG('egg-mayo.png'),
  '에그 타르트':               IMG('egg-tart.png'),
  '오렌지 주스':               IMG('orange-juice.png'),
  '오믈렛':                    IMG('omelet.png'),
  '옥수수 구이':               IMG('fried-corn.png'),
  '팝콘':                      IMG('popcorn.png'),
  '딸기잼 토스트':             IMG('toast-jam.png'),
  '토스트':                    IMG('toast.png'),
  '크림치즈 토스트':           IMG('toast-creamcheese.png'),
  '딸기젤리':                  IMG('strawberry-jelly.png'),
  '오렌지 젤리':               IMG('orange-jelly.png'),
  '버섯젤리':                  IMG('mushroom-jelly.png'),
  '파인애플 젤리':             IMG('pineapple-jelly.png'),
  '대파 꼬리훈제 젤리':        IMG('slowpoke-tail-jelly.png'),
  '차우더':                    IMG('chowder.png'),
  '초코 딸기':                 IMG('strawberry-choco.png'),
  '초코 케이크':               IMG('choco-bread.png'),
  '초코 토스트':               IMG('toast-choco.png'),
  '초코칩 쿠키':               IMG('choco-cookie.png'),
  '치즈 케이크':               IMG('cheese-cake.png'),
  '카프레제':                  IMG('caprese.png'),
  '쿠키':                      IMG('cookie.png'),
  '토마토 파스타':             IMG('tomato-pasta.png'),
  '알로라 피자':               IMG('pizza-alola.png'),
  '팬케이크':                  IMG('pancake.png'),
  '푸딩':                      IMG('pudding.png'),
  '피자':                      IMG('pizza.png'),
  '허니 토스트':               IMG('toast-honey.png'),
  '홍차 스프레드':             IMG('blacktea-paste.png'),
  '꼬리훈제 미역국':           IMG('slowpoke-tail-stew.png'),
  '버섯 채소 볶음':            IMG('fried-mushveg.png'),
  '부추파전':                  IMG('boochoopa.png'),
  '커피빙수':                  IMG('coffee-bingsu.png'),
  '복슝열매 빙수':             IMG('peach-bingsu.png'),
  '치즈케이크 빙수':           IMG('cheesecake-bingsu.png'),
  '아이스크림':                IMG('icecream.png'),
  '콩볶음':                    IMG('fried-beans.png'),
  '두부':                      IMG('tofu.png'),
  '된장찌개':                  IMG('soy-stew.png'),
  '샐러드':                    IMG('salad.png'),
  '콩고기':                    IMG('soymeat.png'),
  '콩고기 스테이크':           IMG('soymeat-steak.png'),
  '콩고기 핫도그':             IMG('soymeat-hotdog.png'),
  '비빔밥':                    IMG('t.png'),
  '카레라이스':                IMG('curry-rice.png'),
  '라떼':                      IMG('coffee.png'),
  '커피아이스크림':            IMG('coffe-icecream.png'),
  '김치':                      IMG('kimchi.png'),
  '떡볶이':                    IMG('tbk.png'),
  '궁중떡볶이':                IMG('tbk-soy.png'),
  '기름떡볶이':                IMG('tbk.png'),
  '가라르 떡볶이':             IMG('tbk-galar.png'),
  '팔데아식 떡볶이 샌드위치':  IMG('tbk-sandwich-paldea.png'),
  '크림떡볶이':                IMG('tbk-cream.png'),
  '로제떡볶이':                IMG('tbk-rose.png'),
  '먹물크림떡볶이':            IMG('tbk-black.png'),
  '치즈 떡볶이':               IMG('tbk-cheese.png'),
  '떡볶이 볶음밥':             IMG('tbk.png'),
  '불대문자 떡볶이':           IMG('tbk-fire.png'),
  '마라떡볶이':                IMG('tbk.png'),
  '케찹 떡볶이':               IMG('tbk.png'),
  '떡꼬치':                    IMG('tch.png'),
  '해물 떡볶이':               IMG('tbk-seafood.png'),
  '딸바떡볶이':                IMG('tbk-strawnana.png'),
  '샐러드 떡볶이':             IMG('tbk-salad.png'),
  '옹심이':                    IMG('ongsim.png'),
  '옹심이 떡볶이':             IMG('ongsim.png'),
  '알로라 떡볶이':             IMG('tbk-alola.png'),
  '민트초코 떡볶이':           IMG('tbk-mintchoco.png'),
  '냉떡볶이':                  IMG('tbk-cold.png'),
};

const RAW = [
  [['당근','빵','휘핑크림'], '당근 케이크'],
  [['쿠키','당근'], '당근 쿠키'],
  [['빵','두리안','튼튼치즈'], '두리안 치즈 피자'],
  [['딸기슬라이스','아몬드가루','설탕'], '딸기 마카롱'],
  [['초콜릿','아몬드가루','설탕'], '초코 마카롱'],
  [['베리잼','아몬드가루','설탕'], '베리 마카롱'],
  [['초콜릿','딸기슬라이스','신선한크림'], '딸기 초콜릿'],
  [['빵','딸기슬라이스','신선한크림'], '딸기 케이크'],
  [['딸기슬라이스','빵','빵'], '딸기 타르트'],
  [['딸기슬라이스','딸기슬라이스','설탕'], '딸기잼'],
  [['쿠키','딸기잼'], '딸기잼 쿠키'],
  [['포테이토팩','튼튼밀크','버터'], '매쉬드 포테이토'],
  [['홍차','설탕','튼튼밀크'], '밀크티'],
  [['초콜릿','밀가루','설탕'], '초코빵'],
  [['구운베이컨','럭키의 알','팬케이크'], '브렉퍼스트'],
  [['베리잼','휘핑크림','빵'], '베리 케이크'],
  [['밀가루','럭키의 알','버터'], '빵'],
  [['사과슬라이스','빵','설탕'], '사과 파이'],
  [['딸기슬라이스','설탕'], '설탕 딸기'],
  [['복슝열매','홍차','맛있는물'], '아이스티'],
  [['매쉬드 포테이토','튼튼치즈'], '알리고'],
  [['럭키의 알','마요네즈'], '에그마요'],
  [['럭키의 알','빵'], '에그 타르트'],
  [['오렌지','오렌지','맛있는물'], '오렌지 주스'],
  [['럭키의 알','럭키의 알','버터'], '오믈렛'],
  [['옥수수','버터'], '옥수수 구이'],
  [['옥수수','소금','올리브오일'], '팝콘'],
  [['딸기잼','식빵','버터'], '딸기잼 토스트'],
  [['버터','식빵'], '토스트'],
  [['버터','식빵','크림치즈'], '크림치즈 토스트'],
  [['젤라틴','딸기슬라이스'], '딸기젤리'],
  [['젤라틴','오렌지'], '오렌지 젤리'],
  [['젤라틴','버섯팩'], '버섯젤리'],
  [['젤라틴','파인애플슬라이스'], '파인애플 젤리'],
  [['젤라틴','꼬리훈제','굵은 대파'], '대파 꼬리훈제 젤리'],
  [['훈제토막','포테이토팩','구운베이컨'], '차우더'],
  [['초콜릿','딸기'], '초코 딸기'],
  [['초콜릿','빵','휘핑크림'], '초코 케이크'],
  [['초콜릿','식빵','버터'], '초코 토스트'],
  [['쿠키','초콜릿'], '초코칩 쿠키'],
  [['크림치즈','빵','휘핑크림'], '치즈 케이크'],
  [['토마토슬라이스','튼튼치즈','비니거'], '카프레제'],
  [['밀가루','설탕','버터'], '쿠키'],
  [['토마토슬라이스','튼튼치즈','파스타'], '토마토 파스타'],
  [['빵','케찹','파인애플 슬라이스'], '알로라 피자'],
  [['밀가루','럭키의 알','튼튼밀크'], '팬케이크'],
  [['설탕','튼튼밀크','럭키의 알'], '푸딩'],
  [['빵','케첩','튼튼치즈'], '피자'],
  [['꿀','식빵','버터'], '허니 토스트'],
  [['홍차','설탕','튼튼밀크'], '홍차 스프레드'],
  [['미역','꼬리훈제','맛있는물'], '꼬리훈제 미역국'],
  [['버섯팩','채소팩','올리브오일'], '버섯 채소 볶음'],
  [['부추','굵은대파','밀가루'], '부추파전'],
  [['커피','식용 얼음'], '커피빙수'],
  [['복슝열매','식용 얼음'], '복슝열매 빙수'],
  [['크림치즈','식용 얼음','치즈케이크'], '치즈케이크 빙수'],
  [['튼튼밀크','신선한크림','식용얼음'], '아이스크림'],
  [['콩통조림','올리브오일'], '콩볶음'],
  [['콩통조림','맛있는물','소금'], '두부'],
  [['두부','된장','맛있는물'], '된장찌개'],
  [['채소팩','비니거'], '샐러드'],
  [['콩통조림','콩통조림','밀가루'], '콩고기'],
  [['콩고기','버터'], '콩고기 스테이크'],
  [['빵','콩고기','케찹'], '콩고기 핫도그'],
  [['라이스','고추장','채소팩'], '비빔밥'],
  [['라이스','레토르트카레'], '카레라이스'],
  [['커피','튼튼밀크'], '라떼'],
  [['커피','아이스크림'], '커피아이스크림'],
  [['채소팩','소금','스파이스세트'], '김치'],
  [['떡','고추장'], '떡볶이'],
  [['떡','간장','꼬리훈제'], '궁중떡볶이'],
  [['떡','고추장','올리브오일'], '기름떡볶이'],
  [['떡','레토르트카레'], '가라르 떡볶이'],
  [['떡볶이','빵'], '팔데아식 떡볶이 샌드위치'],
  [['떡','신선한크림','버섯팩'], '크림떡볶이'],
  [['떡','토마토슬라이스','신선한크림'], '로제떡볶이'],
  [['떡','대포무노 먹물','신선한크림'], '먹물크림떡볶이'],
  [['떡','고추장','튼튼치즈'], '치즈 떡볶이'],
  [['떡볶이','라이스'], '떡볶이 볶음밥'],
  [['떡','고추장','스파이스세트'], '불대문자 떡볶이'],
  [['떡','고추장','마라소스'], '마라떡볶이'],
  [['떡','케찹'], '케찹 떡볶이'],
  [['떡','케찹','올리브오일'], '떡꼬치'],
  [['떡볶이','절벼게 맛살','훈제토막'], '해물 떡볶이'],
  [['떡볶이','바나나슬라이스','딸기슬라이스'], '딸바떡볶이'],
  [['떡','채소팩','비니거'], '샐러드 떡볶이'],
  [['감자','밀가루'], '옹심이'],
  [['옹심이','고추장'], '옹심이 떡볶이'],
  [['떡','고추장','파인애플 슬라이스'], '알로라 떡볶이'],
  [['떡','민트','초코'], '민트초코 떡볶이'],
  [['떡','고추장','녹지않는 식용 얼음'], '냉떡볶이'],
];

function toIngredients(arr) {
  const map = {};
  for (const name of arr) map[name] = (map[name] || 0) + 1;
  return Object.entries(map).map(([name, count]) => ({ name, count }));
}

function makeRecipe(raw, idx) {
  const [ingArr, resultName] = raw;
  const id = `recipe_food_${String(idx + 1).padStart(3, '0')}`;
  const spriteUrl = RESULT_IMG[resultName] || '';
  return {
    id, name: resultName, type: 'fixed', types: ['fixed'], category: '요리',
    description: `${resultName} 레시피`,
    ingredients: toIngredients(ingArr),
    requiredStats: {}, requiredEfforts: {},
    result: { name: resultName, pocket: 'misc', effect: resultName, spriteUrl,
      friendshipBoost: 0, conditionBoost: {}, effortBoost: {}, specialEffect: null, boostAmount: 0 },
    createdAt: new Date().toISOString(),
  };
}

function makeCustomItem(recipe) {
  return {
    id: `recipe_item_${recipe.id}`, name: recipe.result.name,
    effect: recipe.result.effect, spriteUrl: recipe.result.spriteUrl,
    pocket: 'misc', category: 'misc', isCustom: true, isRecipe: true,
    recipeId: recipe.id, specialEffect: null, boostAmount: 0,
    conditionBoost: {}, effortBoost: {}, friendshipBoost: 0,
    cost: 0, sellPrice: 0, canSell: false, createdAt: recipe.createdAt,
  };
}

// --- 현재 데이터 읽기 (REST) ---
function fetchJSON(url) {
  const raw = execSync(`curl -s "${url}"`).toString();
  return JSON.parse(raw);
}

function toArray(val) {
  if (!val) return [];
  return Array.isArray(val) ? val : Object.values(val);
}

const BASE = 'https://poke-commu-system-default-rtdb.firebaseio.com';

const existingRecipes  = toArray(fetchJSON(`${BASE}/gameData/recipes.json`));
const existingCustoms  = toArray(fetchJSON(`${BASE}/gameData/customItems.json`));

const newRecipes = RAW.map((r, i) => makeRecipe(r, i));
const newCustoms = newRecipes.map(makeCustomItem);

const existingRecipeIds = new Set(existingRecipes.map(r => r && r.id).filter(Boolean));
const existingCustomIds = new Set(existingCustoms.map(i => i && i.id).filter(Boolean));

const toAddRecipes = newRecipes.filter(r => !existingRecipeIds.has(r.id));
const toAddCustoms = newCustoms.filter(i => !existingCustomIds.has(i.id));

console.log(`기존 레시피 ${existingRecipes.length}개 + 추가 ${toAddRecipes.length}개`);
console.log(`기존 커스텀 아이템 ${existingCustoms.length}개 + 추가 ${toAddCustoms.length}개`);

const mergedRecipes = [...existingRecipes, ...toAddRecipes];
const mergedCustoms = [...existingCustoms, ...toAddCustoms];

const clean = v => JSON.parse(JSON.stringify(v, (k, val) => val === undefined ? null : val));

// 임시 JSON 파일에 쓰고 firebase CLI로 업로드
const payload = {
  '/gameData/recipes': clean(mergedRecipes),
  '/gameData/customItems': clean(mergedCustoms),
};

fs.writeFileSync(TMP, JSON.stringify(payload, null, 2));

// firebase database:set (각 경로 개별 업로드)
const recipesFile = path.join(__dirname, '_tmp_recipes.json');
const customsFile = path.join(__dirname, '_tmp_customs.json');
fs.writeFileSync(recipesFile, JSON.stringify(clean(mergedRecipes), null, 2));
fs.writeFileSync(customsFile, JSON.stringify(clean(mergedCustoms), null, 2));

console.log('Firebase CLI로 업로드 중...');
execSync(`firebase database:set /gameData/recipes "${recipesFile}" --project ${PROJECT} --force`, { stdio: 'inherit' });
execSync(`firebase database:set /gameData/customItems "${customsFile}" --project ${PROJECT} --force`, { stdio: 'inherit' });

// 임시 파일 정리
fs.unlinkSync(TMP);
fs.unlinkSync(recipesFile);
fs.unlinkSync(customsFile);

console.log('✅ 완료!');
