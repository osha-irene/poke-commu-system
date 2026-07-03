import React, { useState, useEffect, useRef, useCallback } from 'react';
import ballsImage from '../../assets/shop/balls.png';
import cramorantImage from '../../assets/shop/cramorant.png';
import contextImage from '../../assets/shop/context.png';
import skipImage from '../../assets/shop/skip.png';
import buyImage from '../../assets/shop/buy.png';
import buy2Image from '../../assets/shop/buy2.png';
import confirmImage from '../../assets/shop/confirm.png';
import specialImage from '../../assets/shop/special.png';
import specialActiveImage from '../../assets/shop/special2.png';
import dailyLimitedImage from '../../assets/shop/daily-limited.png';
import dailyLimitedActiveImage from '../../assets/shop/daily-limited2.png';
import apricornImage from '../../assets/shop/apricorn.png';
import apricornActiveImage from '../../assets/shop/apricorn2.png';
import randomImage from '../../assets/shop/random.png';
import randomActiveImage from '../../assets/shop/random2.png';
import { Coins, X } from 'lucide-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCalendarDays, faStore, faGift, faBoxOpen } from '@fortawesome/free-solid-svg-icons';
import { useGame } from '../../contexts/GameContext';
import { getItemPocket, POCKET_LABELS } from '../../utils/itemUtils';
import useMediaQuery from '../../hooks/useMediaQuery';

const P = {
  card:      'rgba(255,255,255,0.90)',
  cardSel:   'rgba(205,230,170,1)',
  border:    'rgba(0,0,0,0.10)',
  borderSel: 'rgba(80,150,20,0.8)',
  text:      '#1a2e10',
  muted:     '#5a7a40',
  accent:    '#4a9a08',
  accentBg:  'rgba(74,154,8,0.15)',
  price:     '#a05000',
  daily:     '#1050b8',
  dailyBg:   'rgba(255,255,255,0.90)',
  rare:      '#7010b0',
  rareBg:    'rgba(112,16,176,0.10)',
};

const getDailyGachaBalls = (balls) => {
  if (!balls || balls.length <= 2) return balls || [];
  const dateStr = new Date().toISOString().split('T')[0];
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = (hash * 31 + dateStr.charCodeAt(i)) & 0xffffffff;
  }
  const len = balls.length;
  const idx1 = Math.abs(hash) % len;
  const idx2Raw = Math.abs(hash >> 4) % (len - 1);
  const idx2 = idx2Raw >= idx1 ? idx2Raw + 1 : idx2Raw;
  return [balls[idx1], balls[idx2]];
};

const DEFAULT_GACHA_PRICE = 1000;

export default function ShopView() {
  const {
    currentUser: trainer,
    updateCurrentUser,
    allItems = [],
    shopData = {},
    handlePurchase: onPurchase
  } = useGame();

  const [selectedItem, setSelectedItem] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [isNavHidden, setIsNavHidden] = useState(false);
  const lastScrollYRef = useRef(0);

  useEffect(() => {
    lastScrollYRef.current = window.scrollY;
    const handleScroll = () => {
      const y = Math.max(0, window.scrollY);
      const d = y - lastScrollYRef.current;
      if (y < 24)      setIsNavHidden(false);
      else if (d > 8)  setIsNavHidden(true);
      else if (d < -8) setIsNavHidden(false);
      lastScrollYRef.current = y;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const today = new Date();
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayNamesKo = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
  const todayName = dayNames[today.getDay()];
  const todayNameKo = dayNamesKo[today.getDay()];
// ⭐ getItemDetails 함수를 먼저 선언
  const getItemDetails = (shopItem) => {
    const item = allItems.find(i => i.id === shopItem.itemId);
    return {
      ...item,
      ...shopItem,
      pocket: getItemPocket(item || shopItem)
    };
  };
  
  const POCKET_ORDER = ['pokeballs','medicine','vitamins','berries','evolution','held-items','machines','battle-items','key-items','ingredients','misc'];

  const getSortedItems = (items) => {
    return [...items].sort((a, b) => {
      const aItem = allItems.find(i => i.id === a.itemId);
      const bItem = allItems.find(i => i.id === b.itemId);
      const aPocket = getItemPocket(aItem || a);
      const bPocket = getItemPocket(bItem || b);
      const aPocketIdx = POCKET_ORDER.indexOf(aPocket);
      const bPocketIdx = POCKET_ORDER.indexOf(bPocket);
      const pocketDiff = (aPocketIdx === -1 ? 99 : aPocketIdx) - (bPocketIdx === -1 ? 99 : bPocketIdx);
      if (pocketDiff !== 0) return pocketDiff;
      // 같은 포켓이면 카테고리명 알파벳순
      const aCat = aItem?.category || '';
      const bCat = bItem?.category || '';
      return aCat.localeCompare(bCat);
    });
  };

  const handlePurchase = () => {
    if (!selectedItem) return;

    // 랜덤박스 구매
    if (selectedItem.type === 'randombox') {
      const totalPrice = (selectedItem.price || 0) * quantity;
      if (trainer.money < totalPrice) { alert('돈이 부족합니다!'); return; }
      const items = Array.isArray(selectedItem.items) ? selectedItem.items : [];
      if (items.length === 0) { alert('이 랜덤박스에는 아이템이 없습니다!'); return; }
      if (!window.confirm(`${selectedItem.name}을(를) ${totalPrice.toLocaleString()}원에 ${quantity}개 구매하시겠습니까?`)) return;
      const result = purchaseDesktopRandomBox(selectedItem, quantity);
      if (result?.success) alert(result.message);
      setSelectedItem(null);
      setQuantity(1);
      return;
    }

    // 규토리볼 가챠 구매
    if (selectedItem.type === 'gachaball') {
      const gachaPrice = selectedItem.price ?? shopData.gachaBall?.price ?? DEFAULT_GACHA_PRICE;
      if (trainer.money < gachaPrice) {
        alert('돈이 부족합니다!');
        return;
      }

      const gachaBalls = selectedItem.gachaBalls;
      const randomBall = gachaBalls[Math.floor(Math.random() * gachaBalls.length)];
      const wonItem = allItems.find(i => i.id === randomBall.itemId);
      
      if (!wonItem) {
        alert('아이템을 찾을 수 없습니다!');
        return;
      }

      const existingItem = trainer.inventory.find(
        i => i.itemId === wonItem.id || i.name === wonItem.name
      );

      const newInventory = existingItem
        ? trainer.inventory.map(i =>
            (i.itemId === wonItem.id || i.name === wonItem.name)
              ? { ...i, count: i.count + quantity }
              : i
          )
        : [
            ...trainer.inventory,
            {
              itemId: wonItem.id,
              name: wonItem.name,
              nameEn: wonItem.nameEn,
              count: quantity,
              imageUrl: wonItem.spriteUrl || wonItem.imageUrl,
              cost: wonItem.cost || 0,
              sellPrice: wonItem.sellPrice || 0,
              category: wonItem.category,
              pocket: wonItem.pocket
            }
          ];

      updateCurrentUser({
        money: trainer.money - (gachaPrice * quantity),
        inventory: newInventory
      });

      alert(`규토리볼 ${quantity}회 뽑기 완료!\n${wonItem.name} ${quantity}개를 획득했습니다!`);
      setSelectedItem(null);
      setQuantity(1);
      return;
    }
    
    const totalPrice = selectedItem.price * quantity;
    
    if (trainer.money < totalPrice) {
      alert('돈이 부족합니다!');
      return;
    }
    
    const success = onPurchase(selectedItem, quantity);
    if (success) {
      setSelectedItem(null);
      setQuantity(1);
    }
  };


  const sceneMessage = '당신을 빤히 바라보고 있다. 당신에게 흥미가 있는 듯 하다.';
  const listButtonMessage = '입에서 무언가 뱉어낼 듯하다.';
  const askingMessage = '어떤 아이템을 볼까?';
  // phase: 'intro' | 'asking' | 'shop'
  const [phase, setPhase] = useState('intro');
  const [visibleLength, setVisibleLength] = useState(0);
  const [askingLength, setAskingLength] = useState(0);
  const [selectedShopItem, setSelectedShopItem] = useState(null);
  const previousShopTextRef = useRef('');
  const isMessageComplete = visibleLength >= sceneMessage.length;
  const isAskingComplete = askingLength >= askingMessage.length;
  const scenePermanentItems = (shopData.permanentItems || [])
    .map((shopItem) => ({
      ...shopItem,
      item: allItems.find((item) => item.id === shopItem.itemId)
    }))
    .filter(({ item }) => Boolean(item));
  const desktopGachaBallsAll = shopData.gachaBall?.balls || [];
  const desktopGachaBalls = getDailyGachaBalls(desktopGachaBallsAll)
    .map((ballItem) => ({
      ...ballItem,
      item: allItems.find((item) => item.id === ballItem.itemId)
    }))
    .filter(({ item }) => Boolean(item));
  const hasDesktopGacha = Boolean(shopData.gachaBall?.enabled && desktopGachaBallsAll.length >= 2);
  const desktopRandomBoxes = (shopData.randomBoxes || []).filter((box) => box.enabled);

  // intro 메시지 타이핑
  useEffect(() => {
    setPhase('intro');
    setVisibleLength(0);
    setAskingLength(0);
    setSelectedShopItem(null);
    const timer = window.setInterval(() => {
      setVisibleLength((len) => {
        if (len >= sceneMessage.length) { window.clearInterval(timer); return len; }
        return len + 1;
      });
    }, 70);
    return () => window.clearInterval(timer);
  }, [sceneMessage]);

  // asking 메시지 타이핑
  useEffect(() => {
    if (phase !== 'asking') return undefined;
    setAskingLength(0);
    const timer = window.setInterval(() => {
      setAskingLength((len) => {
        if (len >= askingMessage.length) { window.clearInterval(timer); return len; }
        return len + 1;
      });
    }, 70);
    return () => window.clearInterval(timer);
  }, [phase]);

  const [showBuy2, setShowBuy2] = useState(false);
  const [buyConfirming, setBuyConfirming] = useState(false);
  const [shopListMode, setShopListMode] = useState('permanent');
  const buy2Ref = useRef(null);
  const skipNextSceneClickRef = useRef(false);
  const permanentListRef = useRef(null);
  const [permanentListScrollbar, setPermanentListScrollbar] = useState({ visible: false, height: 0, top: 0 });

  const updatePermanentListScrollbar = useCallback(() => {
    const el = permanentListRef.current;
    if (!el) return;

    const maxScroll = el.scrollHeight - el.clientHeight;
    if (maxScroll <= 1) {
      setPermanentListScrollbar({ visible: false, height: 0, top: 0 });
      return;
    }

    const trackHeight = Math.max(el.clientHeight - 16, 0);
    const thumbHeight = Math.max(36, Math.round((el.clientHeight / el.scrollHeight) * trackHeight));
    const thumbTravel = Math.max(trackHeight - thumbHeight, 1);
    const thumbTop = 8 + Math.round((el.scrollTop / maxScroll) * thumbTravel);
    setPermanentListScrollbar({ visible: true, height: thumbHeight, top: thumbTop });
  }, []);

  const handlePermanentScrollbarMouseDown = (e) => {
    const el = permanentListRef.current;
    if (!el || !permanentListScrollbar.visible) return;

    e.preventDefault();
    e.stopPropagation();

    const startY = e.clientY;
    const startScrollTop = el.scrollTop;
    const maxScroll = el.scrollHeight - el.clientHeight;
    const trackHeight = Math.max(el.clientHeight - 16, 0);
    const thumbTravel = Math.max(trackHeight - permanentListScrollbar.height, 1);

    const handleMove = (moveEvent) => {
      const delta = moveEvent.clientY - startY;
      el.scrollTop = startScrollTop + (delta / thumbTravel) * maxScroll;
      updatePermanentListScrollbar();
    };

    const handleUp = () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
  };

  useEffect(() => {
    updatePermanentListScrollbar();
    const el = permanentListRef.current;
    if (!el) return undefined;

    const resizeObserver = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(updatePermanentListScrollbar)
      : null;
    resizeObserver?.observe(el);
    window.addEventListener('resize', updatePermanentListScrollbar);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener('resize', updatePermanentListScrollbar);
    };
  }, [phase, scenePermanentItems.length, desktopGachaBalls.length, desktopRandomBoxes.length, shopListMode, updatePermanentListScrollbar]);

  useEffect(() => {
    if (!showBuy2) return;
    const handler = (e) => {
      if (buy2Ref.current && !buy2Ref.current.contains(e.target)) {
        skipNextSceneClickRef.current = true;
        setBuyConfirming(false);
        setShowBuy2(false);
        setQuantity(1);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showBuy2]);
  const [purchaseMsg, setPurchaseMsg] = useState('');
  const [shopTextLength, setShopTextLength] = useState(0);
  const [listMessage, setListMessage] = useState('');
  const [activeListButton, setActiveListButton] = useState(null);
  const [thrownItem, setThrownItem] = useState(null);
  const [thrownShopItem, setThrownShopItem] = useState(null);
  const [closedListButtons, setClosedListButtons] = useState({});
  const [pendingClosedMouth, setPendingClosedMouth] = useState(false);
  const [pressedListButton, setPressedListButton] = useState(null);
  const [gachaContextStep, setGachaContextStep] = useState(0);
  const [randomBoxIntroActive, setRandomBoxIntroActive] = useState(false);
  const [purchaseReturnMode, setPurchaseReturnMode] = useState(null);

  const getEulReul = (name) => {
    if (!name) return '을';
    const code = name.charCodeAt(name.length - 1);
    if (code < 0xAC00 || code > 0xD7A3) return '을';
    return (code - 0xAC00) % 28 === 0 ? '를' : '을';
  };

  const getIGa = (name) => {
    if (!name) return '이';
    const code = name.charCodeAt(name.length - 1);
    if (code < 0xAC00 || code > 0xD7A3) return '가';
    return (code - 0xAC00) % 28 === 0 ? '가' : '이';
  };

  const getWaGwa = (name) => {
    if (!name) return '과';
    const code = name.charCodeAt(name.length - 1);
    if (code < 0xAC00 || code > 0xD7A3) return '와';
    return (code - 0xAC00) % 28 === 0 ? '와' : '과';
  };

  const getDesktopGachaPrice = (shopItem = selectedShopItem) => Number(shopItem?.price ?? shopData.gachaBall?.price ?? DEFAULT_GACHA_PRICE);

  const formatGachaResults = (results) => {
    const parts = results.map(({ item, count }) => `${item.name} ${count}개`);
    if (parts.length <= 1) {
      const onlyItem = parts[0] || '';
      return `${onlyItem}${getEulReul(onlyItem)} 던졌다.`;
    }
    const lastItem = parts[parts.length - 1];
    return `${parts.slice(0, -1).join(', ')}${getWaGwa(parts[parts.length - 2])} ${lastItem}${getEulReul(lastItem)} 던졌다.`;
  };

  const purchaseDesktopGacha = (shopItem, count) => {
    if (!trainer || !shopItem?.gachaBalls?.length) return false;

    const price = getDesktopGachaPrice(shopItem);
    const totalPrice = price * count;
    if ((trainer.money || 0) < totalPrice) {
      alert('돈이 부족합니다!');
      return false;
    }

    const pickedItems = [];
    for (let i = 0; i < count; i += 1) {
      const randomBall = shopItem.gachaBalls[Math.floor(Math.random() * shopItem.gachaBalls.length)];
      const wonItem = allItems.find((item) => item.id === randomBall.itemId) || randomBall.item;
      if (wonItem) pickedItems.push(wonItem);
    }
    if (pickedItems.length === 0) {
      alert('아이템을 찾을 수 없습니다!');
      return false;
    }

    const resultMap = new Map();
    pickedItems.forEach((item) => {
      const key = item.id || item.itemId || item.name;
      const current = resultMap.get(key) || { item, count: 0 };
      current.count += 1;
      resultMap.set(key, current);
    });
    const results = Array.from(resultMap.values());

    const inventory = Array.isArray(trainer.inventory) ? trainer.inventory : [];
    const newInventory = [...inventory];
    results.forEach(({ item, count: itemCount }) => {
      const existingIndex = newInventory.findIndex((inventoryItem) => (
        inventoryItem.itemId === item.id || inventoryItem.name === item.name
      ));

      if (existingIndex >= 0) {
        newInventory[existingIndex] = {
          ...newInventory[existingIndex],
          count: (newInventory[existingIndex].count || 0) + itemCount
        };
        return;
      }

      newInventory.push({
        itemId: item.id,
        name: item.name,
        nameEn: item.nameEn,
        count: itemCount,
        imageUrl: item.spriteUrl || item.imageUrl,
        cost: item.cost || 0,
        sellPrice: item.sellPrice || 0,
        category: item.category,
        pocket: item.pocket || getItemPocket(item)
      });
    });

    updateCurrentUser({
      money: (trainer.money || 0) - totalPrice,
      inventory: newInventory
    });

    return {
      success: true,
      message: `윽우지가 ${formatGachaResults(results)}`
    };
  };

  const pickRandomBoxItem = (box) => {
    const items = Array.isArray(box?.items) ? box.items : [];
    if (items.length === 0) return null;

    const totalWeight = items.reduce((sum, item) => sum + (parseInt(item.weight, 10) || 0), 0);
    if (totalWeight <= 0) return null;

    let random = Math.random() * totalWeight;
    for (const item of items) {
      random -= parseInt(item.weight, 10) || 0;
      if (random <= 0) {
        const minCount = parseInt(item.minCount, 10) || 1;
        const maxCount = parseInt(item.maxCount, 10) || minCount;
        const itemCount = Math.floor(Math.random() * (maxCount - minCount + 1)) + minCount;
        const itemData = allItems.find((entry) => entry.id === item.itemId);
        return {
          itemId: item.itemId,
          name: item.name || itemData?.name || item.itemId,
          count: itemCount,
          itemData
        };
      }
    }

    return null;
  };

  const purchaseDesktopRandomBox = (box, count) => {
    if (!trainer) return false;

    const price = Number(box?.price || 0);
    const totalPrice = price * count;
    if ((trainer.money || 0) < totalPrice) {
      alert('돈이 부족합니다!');
      return false;
    }

    const resultsByItem = new Map();
    for (let i = 0; i < count; i += 1) {
      const result = pickRandomBoxItem(box);
      if (!result) {
        alert('아이템 추첨에 실패했습니다!');
        return false;
      }
      const key = result.itemId || result.name;
      const current = resultsByItem.get(key) || { ...result, count: 0 };
      current.count += result.count;
      resultsByItem.set(key, current);
    }

    const results = Array.from(resultsByItem.values());
    const inventory = Array.isArray(trainer.inventory) ? trainer.inventory : [];
    const newInventory = [...inventory];

    results.forEach((result) => {
      const itemData = result.itemData || allItems.find((item) => item.id === result.itemId);
      const existingIndex = newInventory.findIndex((inventoryItem) => (
        inventoryItem.itemId === result.itemId || inventoryItem.name === result.name
      ));

      if (existingIndex >= 0) {
        newInventory[existingIndex] = {
          ...newInventory[existingIndex],
          count: (newInventory[existingIndex].count || 0) + result.count
        };
        return;
      }

      newInventory.push({
        itemId: result.itemId,
        name: result.name,
        nameEn: itemData?.nameEn,
        count: result.count,
        imageUrl: itemData?.spriteUrl || itemData?.imageUrl,
        cost: itemData?.cost || 0,
        sellPrice: itemData?.sellPrice || 0,
        category: itemData?.category,
        pocket: itemData?.pocket || getItemPocket(itemData || result)
      });
    });

    updateCurrentUser({
      money: (trainer.money || 0) - totalPrice,
      inventory: newInventory
    });

    const resultText = results.map((result) => `${result.name} ${result.count}개`).join(', ');
    return {
      success: true,
      message: `${resultText}${getEulReul(resultText)} 얻었다!`
    };
  };

  const handleAdvance = (source = 'mouse') => {
    if (phase === 'intro') {
      if (!isMessageComplete) { setVisibleLength(sceneMessage.length); return; }
      setListMessage('');
      setActiveListButton(null);
      setThrownItem(null);
      setThrownShopItem(null);
      setAskingLength(0);
      setPhase('asking');
    } else if (phase === 'asking') {
      if (!isAskingComplete) { setAskingLength(askingMessage.length); return; }
      if (source !== 'keyboard') return;
      setListMessage('');
      setActiveListButton(null);
      setThrownItem(null);
      setThrownShopItem(null);
      // A 누르면 첫 번째 아이템 자동 선택
      if (source === 'keyboard' && scenePermanentItems.length > 0) {
        setSelectedShopItem(scenePermanentItems[0]);
      }
      setPhase('shop');
    }
  };

  // 키보드 A 키
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'a' || e.key === 'A') handleAdvance('keyboard'); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, isMessageComplete, isAskingComplete]);

  const getItemDetailText = (shopItem) => {
    if (!shopItem?.item) return '';

    const { item } = shopItem;
    const description = item.effect || item.description || '상세 설명이 없습니다.';

    return description;
  };

  const getRandomBoxContextText = (boxItem) => {
    const boxName = boxItem?.item?.name || boxItem?.name || '랜덤박스';
    const displayName = boxName.replace(/\s*박스$/, '') || boxName;
    return `랜덤한 ${displayName}${getIGa(displayName)} 들어있다.`;
  };

  const getListButtonShopItem = (kind) => {
    const rawShopItem = kind === 'special'
      ? shopData.rareDailyItem
      : (shopData.dailyItems?.[todayName] || [])[0];
    if (!rawShopItem?.itemId) return null;

    const item = getItemDetails(rawShopItem);
    if (!item?.id && !item?.itemId) return null;

    return {
      ...rawShopItem,
      type: kind === 'special' ? 'rare' : 'daily',
      price: rawShopItem.price ?? item.price ?? item.cost ?? 0,
      stock: rawShopItem.stock ?? (kind === 'special' ? 1 : 99),
      item
    };
  };

  const isListButtonSoldOut = (kind) => {
    const shopItem = getListButtonShopItem(kind);
    return Boolean(shopItem && shopItem.stock !== 99 && shopItem.stock != null && shopItem.stock <= 0);
  };

  const isListButtonClosed = (kind) => Boolean(closedListButtons[kind] || isListButtonSoldOut(kind));

  useEffect(() => {
    setClosedListButtons((prev) => {
      let changed = false;
      const next = { ...prev };

      for (const kind of ['special', 'daily']) {
        if (next[kind] && !isListButtonSoldOut(kind)) {
          delete next[kind];
          changed = true;
        }
      }

      return changed ? next : prev;
    });
  }, [shopData.rareDailyItem?.stock, shopData.dailyItems, todayName]);

  const throwListButtonItem = (kind) => {
    if (isListButtonClosed(kind)) {
      setThrownShopItem(null);
      setThrownItem(null);
      setSelectedShopItem(null);
      setShowBuy2(false);
      setBuyConfirming(false);
      setQuantity(1);
      setPurchaseMsg('');
      setListMessage('입을 다물고 있다.');
      return;
    }

    const shopItem = getListButtonShopItem(kind);
    setThrownShopItem(shopItem);
    setThrownItem(shopItem?.item || null);
    setSelectedShopItem(shopItem);
    setPhase('shop');
    setShowBuy2(false);
    setBuyConfirming(false);
    setQuantity(1);
    setPurchaseMsg('');
    setListMessage(shopItem?.item ? `당신에게 ${shopItem.item.name}${getEulReul(shopItem.item.name)} 던진다.` : '아무것도 나오지 않았다.');
  };

  const handleListButtonClick = (kind) => {
    setPressedListButton(kind);
    setShopListMode('permanent');
    setRandomBoxIntroActive(false);
    setPurchaseReturnMode(null);

    if (isListButtonClosed(kind)) {
      setActiveListButton(kind);
      setThrownItem(null);
      setThrownShopItem(null);
      setSelectedShopItem(null);
      setShowBuy2(false);
      setBuyConfirming(false);
      setQuantity(1);
      setGachaContextStep(0);
      setPurchaseMsg('');
      setPendingClosedMouth(false);
      setListMessage('입을 다물고 있다.');
      return;
    }

    const firstMessage = kind === 'special'
      ? '입에서 무언가 특별한 걸 뱉어낼 듯하다.'
      : listButtonMessage;

    if (activeListButton === kind && !thrownItem) {
      throwListButtonItem(kind);
      return;
    }

    setActiveListButton(kind);
    setGachaContextStep(0);
    setRandomBoxIntroActive(false);
    setThrownItem(null);
    setThrownShopItem(null);
    setSelectedShopItem(null);
    setShowBuy2(false);
    setBuyConfirming(false);
    setQuantity(1);
    setPurchaseMsg('');
    setPendingClosedMouth(false);
    setListMessage(firstMessage);
  };

  const handleShopListModeClick = (mode) => {
    setPressedListButton(mode);
    setShopListMode(mode);
    setGachaContextStep(0);
    setRandomBoxIntroActive(mode === 'random');
    setPurchaseReturnMode(null);
    if (mode === 'apricorn' && hasDesktopGacha) {
      setSelectedShopItem({
        type: 'gachaball',
        price: shopData.gachaBall?.price ?? DEFAULT_GACHA_PRICE,
        stock: 99,
        gachaBalls: desktopGachaBalls,
        item: {
          id: 'gachaball',
          name: '규토리볼 가챠',
          effect: '규토리볼 가챠'
        }
      });
    } else {
      setSelectedShopItem(null);
    }
    setShowBuy2(false);
    setBuyConfirming(false);
    setQuantity(1);
    setPurchaseMsg('');
    setListMessage(mode === 'random' ? '윽우지가 벽의 종이를 가리킨다.' : '');
    setActiveListButton(null);
    setThrownItem(null);
    setThrownShopItem(null);
    setPhase('shop');
    window.requestAnimationFrame(updatePermanentListScrollbar);
  };

  const handleAdvanceListMessage = () => {
    if (!activeListButton || thrownItem) return false;
    if (isListButtonClosed(activeListButton)) {
      setListMessage('입을 다물고 있다.');
      return true;
    }
    throwListButtonItem(activeListButton);
    return true;
  };

  const isListInteractionActive = Boolean(activeListButton || listMessage || thrownItem || thrownShopItem);
  const listButtonImageState = pressedListButton || (randomBoxIntroActive ? 'random' : isListInteractionActive ? activeListButton : shopListMode === 'permanent' ? null : shopListMode);

  const handleSceneAdvanceClick = () => {
    if (skipNextSceneClickRef.current) {
      skipNextSceneClickRef.current = false;
      return;
    }

    setPressedListButton(null);

    if (purchaseMsg) {
      if (!isShopTextComplete) {
        setShopTextLength(shopText.length);
        return;
      }

      const purchasedType = purchaseReturnMode || selectedShopItem?.type;
      setPurchaseMsg('');
      setPurchaseReturnMode(null);
      setPendingClosedMouth(false);
      setThrownItem(null);
      setThrownShopItem(null);
      setShowBuy2(false);
      setBuyConfirming(false);
      setQuantity(1);

      if (pendingClosedMouth) {
        setSelectedShopItem(null);
        setListMessage('입을 다물고 있다.');
        return;
      }

      if (purchasedType === 'gachaball') {
        setSelectedShopItem({
          type: 'gachaball',
          price: shopData.gachaBall?.price ?? DEFAULT_GACHA_PRICE,
          stock: 99,
          gachaBalls: desktopGachaBalls,
          item: {
            id: 'gachaball',
            name: '규토리볼 가챠',
            effect: '규토리볼 가챠'
          }
        });
        setShopListMode('apricorn');
        setPressedListButton('apricorn');
        setActiveListButton(null);
        setGachaContextStep(0);
        setRandomBoxIntroActive(false);
        setListMessage('');
        setPhase('shop');
        return;
      }

      if (purchasedType === 'randombox') {
        setSelectedShopItem(null);
        setShopListMode('random');
        setPressedListButton('random');
        setActiveListButton(null);
        setGachaContextStep(0);
        setRandomBoxIntroActive(true);
        setListMessage('윽우지가 벽의 종이를 가리킨다.');
        setPhase('shop');
        return;
      }

      setSelectedShopItem(null);
      setActiveListButton(null);
      setListMessage('');
      setAskingLength(0);
      setPhase('asking');
      return;
    }

    if (phase === 'shop' && selectedShopItem?.type === 'gachaball' && !showBuy2 && !buyConfirming) {
      if (shopText && !isShopTextComplete) {
        setShopTextLength(shopText.length);
        return;
      }
      if (gachaContextStep === 0) {
        setGachaContextStep(1);
        return;
      }
      return;
    }

    if (randomBoxIntroActive) {
      if (shopText && !isShopTextComplete) {
        setShopTextLength(shopText.length);
        return;
      }
      return;
    }

    if (shopListMode !== 'permanent' && !isListInteractionActive && !purchaseMsg) {
      setShopListMode('permanent');
      if (selectedShopItem?.type === 'gachaball' || selectedShopItem?.type === 'randombox') {
        setSelectedShopItem(null);
      }
      window.requestAnimationFrame(updatePermanentListScrollbar);
    }

    if (handleAdvanceListMessage()) return;
    if (isListInteractionActive) {
      if (shopText && !isShopTextComplete) {
        setShopTextLength(shopText.length);
      }
      return;
    }
    handleAdvance('mouse');
  };

  const shopText = purchaseMsg
    ? purchaseMsg
    : buyConfirming && selectedShopItem
      ? selectedShopItem.type === 'gachaball'
        ? `규토리볼 가챠를 ${quantity}번 돌릴까?`
        : `${selectedShopItem?.item?.name || ''}${getEulReul(selectedShopItem?.item?.name || '')} ${quantity}개 구매할까?`
      : thrownItem
        ? `당신에게 ${thrownItem.name}${getEulReul(thrownItem.name)} 던진다.`
        : listMessage || (
          phase === 'shop' && selectedShopItem
            ? selectedShopItem.type === 'gachaball'
              ? gachaContextStep === 0
                ? '윽우지가 벽의 종이를 가리킨다.'
                : `규토리볼 가챠 1회 ${getDesktopGachaPrice(selectedShopItem).toLocaleString()}원.`
              : selectedShopItem.type === 'randombox'
                ? getRandomBoxContextText(selectedShopItem)
              : getItemDetailText(selectedShopItem)
            : ''
  );
  const displayedShopTextLength = previousShopTextRef.current === shopText ? shopTextLength : 0;
  const isShopTextComplete = displayedShopTextLength >= shopText.length;
  const isThrownShopText = Boolean(thrownItem && !purchaseMsg && !buyConfirming);
  const isGachaContextActive = Boolean(
    phase === 'shop'
    && selectedShopItem?.type === 'gachaball'
    && !purchaseMsg
    && !showBuy2
    && !buyConfirming
  );

  const renderShopText = () => {
    if (!isThrownShopText) {
      return <span>{shopText.slice(0, displayedShopTextLength)}</span>;
    }

    const prefix = '당신에게 ';
    const itemName = thrownItem.name || '';
    const suffix = `${getEulReul(itemName)} 던진다.`;
    const prefixLength = prefix.length;
    const itemEnd = prefixLength + itemName.length;

    return (
      <>
        <span>{shopText.slice(0, Math.min(displayedShopTextLength, prefixLength))}</span>
        {displayedShopTextLength > prefixLength && (
          <span className="shop-scene__thrown-item-name">
            {itemName.slice(0, Math.min(displayedShopTextLength - prefixLength, itemName.length))}
          </span>
        )}
        {displayedShopTextLength > itemEnd && (
          <span>{suffix.slice(0, displayedShopTextLength - itemEnd)}</span>
        )}
      </>
    );
  };

  const renderThrownItemHover = () => {
    if (!isThrownShopText || !isShopTextComplete) return null;
    return (
      <span className="shop-scene__item-hover-proxy" aria-label={thrownItem.name}>
        <span className="shop-scene__item-hover-proxy-text" aria-hidden="true">
          {thrownItem.name}
        </span>
        <span className="shop-scene__item-tooltip" role="tooltip">
          <span className={`shop-scene__item-tooltip-pill shop-scene__item-tooltip-pill--${activeListButton === 'special' ? 'special' : 'daily'}`}>
            {activeListButton === 'special' ? '특별' : '한정'}
          </span>
          <span className="shop-scene__item-tooltip-icon">
            <img
              src={thrownItem.spriteUrl || thrownItem.imageUrl}
              alt=""
              aria-hidden="true"
            />
          </span>
          <span className="shop-scene__item-tooltip-body">
            <span className="shop-scene__item-tooltip-name">{thrownItem.name}</span>
            <span className="shop-scene__item-tooltip-desc">
              {thrownItem.effect || thrownItem.description || '상세 설명이 없습니다.'}
            </span>
          </span>
          <span className="shop-scene__item-tooltip-meta">
            <span>{Number(thrownShopItem?.price || 0).toLocaleString()}원</span>
            <span>{thrownShopItem?.stock === 99 ? '무제한' : `${thrownShopItem?.stock ?? 1}개`}</span>
          </span>
        </span>
      </span>
    );
  };

  useEffect(() => {
    if (!shopText) {
      previousShopTextRef.current = '';
      setShopTextLength(0);
      return undefined;
    }

    if (previousShopTextRef.current === shopText) {
      return undefined;
    }

    previousShopTextRef.current = shopText;
    setShopTextLength(0);
    const timer = window.setInterval(() => {
      setShopTextLength((len) => {
        if (len >= shopText.length) { window.clearInterval(timer); return len; }
        return len + 1;
      });
    }, 35);
    return () => window.clearInterval(timer);
  }, [shopText]);

  const isMobile = useMediaQuery('(max-width: 768px)');

  if (isMobile) {
    const getRareItem = () => {
      if (!shopData.rareItemConfig?.enabled || !shopData.rareDailyItem?.itemId) return null;
      const item = getItemDetails(shopData.rareDailyItem);
      if (!item) return null;
      const purchaseHistory = trainer?.purchaseHistory || {};
      const todayDate = new Date().toISOString().split('T')[0];
      const alreadyPurchased = ((purchaseHistory[todayDate] || {})[shopData.rareDailyItem.itemId] || 0) >= 1;
      return { item, alreadyPurchased };
    };
    const rareData = getRareItem();

    const todayDailyItems = getSortedItems(
      (shopData.dailyItems?.[todayName] || []).map(i => ({ ...i, type: 'daily' }))
    );
    const permanentItems = getSortedItems((shopData.permanentItems || []).map(i => ({ ...i, type: 'permanent' })));

    return (
      <div style={{ paddingTop: 56, paddingBottom: 80, minHeight: '100%', color: P.text }}>

        {/* 보유 금액 */}
        <div style={{ margin: '0 12px 14px', padding: '12px 16px', background: 'rgba(255,255,255,1)', border: `1px solid rgba(90,160,30,0.3)`, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 13, color: P.muted, fontWeight: 600 }}>보유 금액</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 20, fontWeight: 800, color: P.text }}>
            <Coins size={18} style={{ color: P.accent }} />
            {trainer.money?.toLocaleString() || 0}원
          </div>
        </div>

        {/* 한정 아이템 (1인 1개) */}
        {rareData && (
          <div style={{ margin: '0 12px 14px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 8, background: '#8020c0', borderRadius: 6, padding: '4px 10px' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>★ 한정 아이템</span>
            </div>
            <button
              onClick={() => { if (!rareData.alreadyPurchased) { setSelectedItem({ ...rareData.item, type: 'rare', price: shopData.rareDailyItem.price, stock: 1 }); setQuantity(1); }}}
              disabled={rareData.alreadyPurchased}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 14px', borderRadius: 12, border: `1px solid ${selectedItem?.itemId === shopData.rareDailyItem.itemId ? P.rare : 'rgba(180,120,230,0.35)'}`,
                background: selectedItem?.itemId === shopData.rareDailyItem.itemId ? 'rgba(200,178,225,0.97)' : 'rgba(248,244,255,0.97)',
                cursor: rareData.alreadyPurchased ? 'not-allowed' : 'pointer',
                opacity: rareData.alreadyPurchased ? 0.5 : 1, textAlign: 'left',
              }}
            >
              <div style={{ width: 48, height: 48, background: 'rgba(255,255,255,0.7)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <img src={rareData.item.spriteUrl} alt={rareData.item.name} style={{ width: 36, height: 36, imageRendering: 'pixelated', objectFit: 'contain' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2, color: P.text }}>{rareData.item.name}</div>
                <div style={{ fontSize: 11, color: P.muted, whiteSpace: 'normal', lineHeight: 1.4 }}>{rareData.item.effect?.replace(/\n/g, ' ')}</div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: P.price }}>{shopData.rareDailyItem.price?.toLocaleString()}원</div>
                <div style={{ fontSize: 10, color: rareData.alreadyPurchased ? 'rgba(220,80,80,0.9)' : P.muted }}>{rareData.alreadyPurchased ? '구매완료' : '1인 1개'}</div>
              </div>
            </button>
          </div>
        )}

        {/* 한정판매 (오늘 요일 한정) */}
        {todayDailyItems.length > 0 && (
          <div style={{ margin: '0 12px 14px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 8, background: P.daily, borderRadius: 6, padding: '4px 10px' }}>
              <FontAwesomeIcon icon={faCalendarDays} style={{ color: '#fff', fontSize: 11 }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>{todayNameKo} 한정판매</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {todayDailyItems.map(shopItem => {
                  const item = getItemDetails(shopItem);
                  if (!item) return null;
                  const isSoldOut = shopItem.stock !== 99 && shopItem.stock <= 0;
                  const isSelected = selectedItem?.itemId === shopItem.itemId && selectedItem?.type === 'daily';
                  return (
                    <React.Fragment key={`daily-${shopItem.itemId}`}>
                      <button
                        onClick={() => { if (!isSoldOut) { setSelectedItem({ ...item, type: 'daily' }); setQuantity(1); } }}
                        disabled={isSoldOut}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          padding: '11px 14px', borderRadius: 12,
                          border: `1px solid ${isSelected ? P.borderSel : 'rgba(16,80,184,0.2)'}`,
                          background: isSelected ? P.cardSel : P.dailyBg,
                          cursor: isSoldOut ? 'not-allowed' : 'pointer',
                          opacity: isSoldOut ? 0.45 : 1, textAlign: 'left',
                        }}
                      >
                        <div style={{ width: 48, height: 48, background: 'rgba(255,255,255,0.75)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <img src={item.spriteUrl} alt={item.name} style={{ width: 36, height: 36, imageRendering: 'pixelated', objectFit: 'contain' }} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: P.text, marginBottom: 2 }}>{item.name}</div>
                          <div style={{ fontSize: 11, color: P.muted, whiteSpace: 'normal', lineHeight: 1.4 }}>{item.effect?.replace(/\n/g, ' ')}</div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 800, color: P.price }}>{shopItem.price?.toLocaleString()}원</div>
                          <div style={{ fontSize: 10, color: isSoldOut ? 'rgba(220,80,80,0.9)' : P.muted }}>
                            {shopItem.stock === 99 ? '무제한' : isSoldOut ? '품절' : `${shopItem.stock}개`}
                          </div>
                        </div>
                      </button>
                    </React.Fragment>
                  );
                })}
            </div>
          </div>
        )}

        {/* 규토리볼 가챠 + 랜덤박스 2열 */}
        {(() => {
          const gachaEnabled = shopData.gachaBall?.enabled;
          const gachaBallsAll = shopData.gachaBall?.balls || [];
          const gachaBalls = getDailyGachaBalls(gachaBallsAll);
          const boxes = (shopData.randomBoxes || []).filter(b => b.enabled);
          const hasGacha = gachaEnabled && gachaBallsAll.length >= 2;
          if (!hasGacha && boxes.length === 0) return null;
          return (
            <div style={{ margin: '0 12px 14px', display: 'grid', gridTemplateColumns: hasGacha && boxes.length > 0 ? '1fr 1fr' : '1fr', gap: 10 }}>

              {/* 규토리볼 가챠 */}
              {hasGacha && (() => {
                const isSelected = selectedItem?.type === 'gachaball';
                return (
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'inline-flex', alignSelf: 'flex-start', alignItems: 'center', marginBottom: 6, background: '#b05510', borderRadius: 6, padding: '4px 10px' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>규토리볼 가챠</span>
                    </div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: isSelected ? 'rgba(220,185,150,0.97)' : 'rgba(255,250,244,0.97)', border: `2px solid ${isSelected ? '#b05510' : 'rgba(190,110,30,0.3)'}`, borderRadius: 12, padding: '10px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
                        {gachaBalls.map(ballItem => {
                          const item = allItems.find(i => i.id === ballItem.itemId);
                          if (!item) return null;
                          return (
                            <div key={ballItem.itemId} style={{ background: 'rgba(255,255,255,0.88)', borderRadius: 8, padding: '8px', display: 'flex', alignItems: 'center', gap: 8 }}>
                              <img src={item.imageUrl || item.spriteUrl} alt={item.name} style={{ width: 30, height: 30, imageRendering: 'pixelated', objectFit: 'contain', flexShrink: 0 }} />
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: '#3a2010' }}>{item.name}</div>
                                {item.description && <div style={{ fontSize: 10, color: '#7a5030', lineHeight: 1.3, marginTop: 2 }}>{item.description}</div>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <button
                        onClick={() => { setSelectedItem({ type: 'gachaball', name: '규토리볼 가챠', price: shopData.gachaBall?.price ?? DEFAULT_GACHA_PRICE, gachaBalls, stock: 99 }); setQuantity(1); }}
                        style={{ width: '100%', padding: '7px', borderRadius: 8, border: 'none', background: '#b05510', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                      >
                        {(shopData.gachaBall?.price ?? DEFAULT_GACHA_PRICE).toLocaleString()}원 뽑기
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* 랜덤박스 */}
              {boxes.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'inline-flex', alignSelf: 'flex-start', alignItems: 'center', marginBottom: 6, background: '#5828a0', borderRadius: 6, padding: '4px 10px' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>랜덤박스</span>
                  </div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {boxes.map(box => {
                      const isSelected = selectedItem?.type === 'randombox' && selectedItem?.id === box.id;
                      return (
                        <button
                          key={box.id}
                          onClick={() => { setSelectedItem({ ...box, type: 'randombox', stock: 99 }); setQuantity(1); }}
                          style={{ flex: 1, display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 12, border: `2px solid ${isSelected ? '#5828a0' : 'rgba(100,50,180,0.28)'}`, background: isSelected ? 'rgba(244,238,255,0.99)' : 'rgba(250,246,255,0.97)', cursor: 'pointer', textAlign: 'left', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', width: '100%' }}
                        >
                          <FontAwesomeIcon icon={faGift} style={{ color: '#7840c0', fontSize: 22, flexShrink: 0 }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: '#2a1040' }}>{box.name}</div>
                            <div style={{ fontSize: 10, color: '#6848a0', lineHeight: 1.4 }}>{box.description || `${box.items?.length || 0}종 랜덤`}</div>
                          </div>
                          <div style={{ fontSize: 11, fontWeight: 800, color: P.price, flexShrink: 0 }}>{box.price?.toLocaleString()}원</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* 상시 판매 */}
        {permanentItems.length > 0 && (
          <div style={{ margin: '0 12px 14px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 8, background: '#2a7a30', borderRadius: 6, padding: '4px 10px' }}>
              <FontAwesomeIcon icon={faStore} style={{ color: '#fff', fontSize: 11 }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>상시 판매</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {(() => {
                let lastPocket = null;
                return permanentItems.map(shopItem => {
                  const item = getItemDetails(shopItem);
                  if (!item) return null;
                  const pocket = getItemPocket(item);
                  const showHeader = pocket !== lastPocket;
                  lastPocket = pocket;
                  const isSoldOut = shopItem.stock !== 99 && shopItem.stock <= 0;
                  const isSelected = selectedItem?.itemId === shopItem.itemId && selectedItem?.type === 'permanent';
                  return (
                    <React.Fragment key={`perm-${shopItem.itemId}`}>
                      {showHeader && (
                        <div style={{ display: 'inline-flex', alignItems: 'center', marginTop: 6, marginBottom: 4 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#1a2e10', background: 'rgba(255,255,255,0.92)', borderRadius: 20, padding: '3px 10px', border: '1px solid rgba(90,160,30,0.25)' }}>
                            {POCKET_LABELS[pocket] || pocket}
                          </span>
                        </div>
                      )}
                      <button
                        onClick={() => { if (!isSoldOut) { setSelectedItem({ ...item, type: 'permanent' }); setQuantity(1); } }}
                        disabled={isSoldOut}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          padding: '11px 14px', borderRadius: 12,
                          border: `1px solid ${isSelected ? P.borderSel : P.border}`,
                          background: isSelected ? P.cardSel : P.card,
                          cursor: isSoldOut ? 'not-allowed' : 'pointer',
                          opacity: isSoldOut ? 0.45 : 1, textAlign: 'left',
                        }}
                      >
                        <div style={{ width: 48, height: 48, background: 'rgba(255,255,255,0.75)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <img src={item.spriteUrl} alt={item.name} style={{ width: 36, height: 36, imageRendering: 'pixelated', objectFit: 'contain' }} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: P.text, marginBottom: 2 }}>{item.name}</div>
                          <div style={{ fontSize: 11, color: P.muted, whiteSpace: 'normal', lineHeight: 1.4 }}>{item.effect?.replace(/\n/g, ' ')}</div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 800, color: P.price }}>{shopItem.price?.toLocaleString()}원</div>
                          <div style={{ fontSize: 10, color: isSoldOut ? 'rgba(220,80,80,0.9)' : P.muted }}>
                            {shopItem.stock === 99 ? '무제한' : isSoldOut ? '품절' : `${shopItem.stock}개`}
                          </div>
                        </div>
                      </button>
                    </React.Fragment>
                  );
                });
              })()}
            </div>
          </div>
        )}

        {/* 구매 바텀 시트 */}
        {selectedItem && (
          <div style={{
            position: 'fixed', bottom: isNavHidden ? 0 : 64, left: 0, right: 0, zIndex: 200,
            transition: 'bottom 0.28s ease',
            background: 'rgba(248,254,240,1)', backdropFilter: 'blur(12px)',
            borderTop: `1px solid rgba(90,160,30,0.2)`,
            padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 48, height: 48, background: 'rgba(255,255,255,0.75)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: selectedItem.type === 'randombox' ? 24 : 'unset' }}>
                {selectedItem.type === 'randombox'
                  ? <FontAwesomeIcon icon={faGift} style={{ color: '#7840c0', fontSize: 24 }} />
                  : selectedItem.type === 'gachaball'
                    ? <span style={{ fontSize: 22 }}>✦</span>
                    : <img src={selectedItem.spriteUrl} alt={selectedItem.name} style={{ width: 36, height: 36, imageRendering: 'pixelated', objectFit: 'contain' }} />
                }
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 2, color: P.text }}>{selectedItem.name}</div>
                <div style={{ fontSize: 13, color: P.price, fontWeight: 800 }}>
                  {(selectedItem.price * quantity).toLocaleString()}원
                  {quantity > 1 && <span style={{ fontSize: 11, color: P.muted, marginLeft: 4 }}>({selectedItem.price.toLocaleString()}원 × {quantity})</span>}
                </div>
              </div>
              <button onClick={() => setSelectedItem(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: P.muted, padding: 4 }}>
                <X size={20} />
              </button>
            </div>
            {selectedItem.type === 'randombox' && Array.isArray(selectedItem.items) && selectedItem.items.length > 0 && (
              <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2, scrollbarWidth: 'none' }}>
                {selectedItem.items.map((boxItem, idx) => {
                  const found = allItems.find(i => i.id === boxItem.itemId || i.nameEn === boxItem.itemId);
                  return (
                    <div key={idx} style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, background: 'rgba(255,255,255,0.85)', borderRadius: 8, padding: '6px 8px', minWidth: 52 }}>
                      {found ? (
                        <img src={found.imageUrl || found.spriteUrl} alt={found.name} style={{ width: 28, height: 28, imageRendering: 'pixelated', objectFit: 'contain' }} />
                      ) : (
                        <span style={{ fontSize: 20 }}>📦</span>
                      )}
                      <span style={{ fontSize: 9, color: P.muted, textAlign: 'center', lineHeight: 1.2 }}>{boxItem.name || found?.name || ''}</span>
                    </div>
                  );
                })}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', border: `1px solid ${P.border}`, borderRadius: 10, overflow: 'hidden' }}>
                <button onClick={() => setQuantity(q => Math.max(1, q - 1))} style={{ width: 36, height: 36, background: 'transparent', border: 'none', color: P.text, fontSize: 18, cursor: 'pointer' }}>−</button>
                <span style={{ width: 36, textAlign: 'center', fontSize: 15, fontWeight: 700, color: P.text }}>{quantity}</span>
                <button onClick={() => setQuantity(q => Math.min(selectedItem.stock === 99 ? 999 : selectedItem.stock, q + 1))} style={{ width: 36, height: 36, background: 'transparent', border: 'none', color: P.text, fontSize: 18, cursor: 'pointer' }}>+</button>
              </div>
              <button onClick={handlePurchase} style={{
                flex: 1, padding: '10px', borderRadius: 10, border: 'none',
                background: 'rgba(80,160,20,1)', color: '#fff',
                fontSize: 15, fontWeight: 800, cursor: 'pointer',
              }}>구매하기</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <section
      className="shop-scene"
      aria-label="상점"
      onClick={(e) => {
        if (purchaseMsg) { handleSceneAdvanceClick(); return; }
        if (phase === 'intro' || phase === 'asking') { handleSceneAdvanceClick(); return; }
        if (phase === 'shop' && showBuy2) { setBuyConfirming(false); setShowBuy2(false); setQuantity(1); return; }
        if (isGachaContextActive) { handleSceneAdvanceClick(); return; }
        if (isListInteractionActive) { handleSceneAdvanceClick(); return; }
        if (phase === 'shop' && shopText && !isShopTextComplete) { setShopTextLength(shopText.length); }
      }}
      style={(phase === 'intro' || phase === 'asking' || showBuy2 || purchaseMsg || isGachaContextActive || (phase === 'shop' && shopText && !isShopTextComplete)) ? { cursor: 'pointer' } : undefined}
    >
      <div className="shop-scene__dialogue">
        <img
          className="shop-scene__balls"
          src={ballsImage}
          alt=""
          aria-hidden="true"
        />
        <img
          className="shop-scene__context"
          src={contextImage}
          alt=""
          aria-hidden="true"
          onClick={phase !== 'shop' ? (e) => { e.stopPropagation(); handleSceneAdvanceClick(); } : showBuy2 ? (e) => { e.stopPropagation(); setBuyConfirming(false); setShowBuy2(false); setQuantity(1); } : (purchaseMsg || isListInteractionActive || isGachaContextActive) ? (e) => { e.stopPropagation(); handleSceneAdvanceClick(); } : undefined}
          style={(phase !== 'shop' || showBuy2 || purchaseMsg || isGachaContextActive) ? { cursor: 'pointer', pointerEvents: 'auto' } : undefined}
        />

        {/* intro: 기본 메시지 타이핑 */}
        {phase === 'intro' && (
          <div className="shop-scene__text-box" onClick={(e) => { e.stopPropagation(); handleSceneAdvanceClick(); }} style={{ cursor: 'pointer' }}>
            <span>{sceneMessage.slice(0, visibleLength)}</span>
            {isMessageComplete && (
              <img className="shop-scene__skip" src={skipImage} alt="" aria-hidden="true" />
            )}
          </div>
        )}

        {/* asking + shop: 아이템 목록 공통 */}
        {(phase === 'asking' || phase === 'shop') && (
          <div className="shop-scene__list-panel">
              <div className="shop-scene__list-badges">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleListButtonClick('special'); }}
                >
                  <img src={listButtonImageState === 'special' ? specialActiveImage : specialImage} alt="특별 아이템" />
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleListButtonClick('daily'); }}
                >
                  <img src={listButtonImageState === 'daily' ? dailyLimitedActiveImage : dailyLimitedImage} alt="기간 한정 아이템" />
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleShopListModeClick('apricorn'); }}
                >
                  <img src={listButtonImageState === 'apricorn' ? apricornActiveImage : apricornImage} alt="규토리볼" />
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleShopListModeClick('random'); }}
                >
                  <img src={listButtonImageState === 'random' ? randomActiveImage : randomImage} alt="랜덤" />
                </button>
              </div>
            <div
              ref={permanentListRef}
              className={`shop-scene__permanent-list ${shopListMode === 'random' ? 'shop-scene__permanent-list--single' : ''}`}
              onScroll={updatePermanentListScrollbar}
            >
              {shopListMode === 'apricorn' ? (
                hasDesktopGacha ? desktopGachaBalls.map((ballItem) => (
                  <button
                    className="shop-scene__shop-item shop-scene__shop-item--gacha"
                    key={`gacha-${ballItem.item.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setPressedListButton('apricorn');
                    }}
                    type="button"
                  >
                    <span className="shop-scene__shop-item-icon">
                      <img src={ballItem.item.spriteUrl || ballItem.item.imageUrl} alt="" aria-hidden="true" />
                    </span>
                    <span className="shop-scene__shop-item-body">
                      <span className="shop-scene__shop-item-name">{ballItem.item.name}</span>
                      <span className="shop-scene__shop-item-divider" aria-hidden="true" />
                      <span className="shop-scene__shop-item-desc">
                        {ballItem.item.effect || ballItem.item.description || '규토리로 만든 특별한 볼이다.'}
                      </span>
                    </span>
                  </button>
                )) : (
                  <div className="shop-scene__shop-empty">규토리볼 목록이 없습니다.</div>
                )
              ) : shopListMode === 'random' ? (
                desktopRandomBoxes.length > 0 ? desktopRandomBoxes.map((box) => (
                  <button
                    className={`shop-scene__shop-item ${selectedShopItem?.type === 'randombox' && selectedShopItem?.id === box.id ? 'is-selected' : ''}`}
                    key={`random-${box.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedShopItem({
                        ...box,
                        type: 'randombox',
                        stock: 99,
                        item: {
                          id: `randombox-${box.id}`,
                          name: box.name,
                          effect: box.description || `${box.items?.length || 0}종 랜덤`,
                          iconType: 'box'
                        }
                      });
                      setPhase('shop');
                      setPressedListButton('random');
                      setGachaContextStep(0);
                      setRandomBoxIntroActive(false);
                      setShowBuy2(false);
                      setBuyConfirming(false);
                      setQuantity(1);
                      setPurchaseMsg('');
                      setListMessage('');
                      setActiveListButton(null);
                      setThrownItem(null);
                      setThrownShopItem(null);
                    }}
                    type="button"
                  >
                    <span className="shop-scene__shop-item-icon">
                      <FontAwesomeIcon icon={faBoxOpen} aria-hidden="true" />
                    </span>
                    <span className="shop-scene__shop-item-body">
                      <span className="shop-scene__shop-item-name">{box.name}</span>
                      <span className="shop-scene__shop-item-meta">
                        {Number(box.price || 0).toLocaleString()}원 / {box.items?.length || 0}종 랜덤
                      </span>
                    </span>
                  </button>
                )) : (
                  <div className="shop-scene__shop-empty">랜덤박스가 없습니다.</div>
                )
              ) : scenePermanentItems.length > 0 ? (
                scenePermanentItems.map((shopItem) => (
                  <button
                    className={`shop-scene__shop-item ${selectedShopItem?.item?.id === shopItem.item.id ? 'is-selected' : ''}`}
                    key={shopItem.item.id}
                    onClick={(e) => { e.stopPropagation(); setPressedListButton(null); setGachaContextStep(0); setRandomBoxIntroActive(false); setPurchaseReturnMode(null); setSelectedShopItem(shopItem); setPhase('shop'); setShowBuy2(false); setBuyConfirming(false); setQuantity(1); setPurchaseMsg(''); setListMessage(''); setActiveListButton(null); setThrownItem(null); setThrownShopItem(null); }}
                    type="button"
                  >
                    <span className="shop-scene__shop-item-icon">
                      <img
                        src={shopItem.item.spriteUrl || shopItem.item.imageUrl}
                        alt=""
                        aria-hidden="true"
                      />
                    </span>
                    <span className="shop-scene__shop-item-body">
                      <span className="shop-scene__shop-item-name">{shopItem.item.name}</span>
                      <span className="shop-scene__shop-item-meta">
                        {Number(shopItem.price || 0).toLocaleString()}원
                        {shopItem.stock !== 99 && shopItem.stock != null ? ` / ${shopItem.stock}개 제한` : ''}
                      </span>
                    </span>
                  </button>
                ))
              ) : (
                <div className="shop-scene__shop-empty">상시판매 상품이 없습니다.</div>
              )}
            </div>
            {permanentListScrollbar.visible && (
              <div className="shop-scene__permanent-scrollbar" aria-hidden="true">
                <div
                  className="shop-scene__permanent-scrollbar-thumb"
                  onMouseDown={handlePermanentScrollbarMouseDown}
                  style={{
                    height: `${permanentListScrollbar.height}px`,
                    transform: `translateY(${permanentListScrollbar.top}px)`
                  }}
                />
              </div>
            )}
          </div>
        )}

        {/* asking: 텍스트 타이핑 */}
        {phase === 'asking' && !listMessage && (
          <div className="shop-scene__text-box" onClick={(e) => { e.stopPropagation(); handleSceneAdvanceClick(); }} style={{ cursor: 'pointer' }}>
            <span>{askingMessage.slice(0, askingLength)}</span>
            {isAskingComplete && (
              <img className="shop-scene__skip" src={skipImage} alt="" aria-hidden="true" />
            )}
          </div>
        )}

        {/* shop: 아이템 설명 / 구매확인 / 구매완료 텍스트 */}
        {(listMessage || (phase === 'shop' && selectedShopItem)) && (
          <div className="shop-scene__text-box" onClick={(e) => { e.stopPropagation(); handleSceneAdvanceClick(); }}>
            {renderShopText()}
            {renderThrownItemHover()}
            {isShopTextComplete && (
              <img className="shop-scene__skip" src={skipImage} alt="" aria-hidden="true" />
            )}
          </div>
        )}

      </div>

      {/* 확인 단계: 외부 클릭 감지 오버레이 (section 직속, dialogue 밖) */}
      {phase === 'shop' && showBuy2 && (
        <div
          onClick={(e) => { e.stopPropagation(); setBuyConfirming(false); setShowBuy2(false); setQuantity(1); }}
          style={{ position: 'absolute', inset: 0, zIndex: 30, cursor: 'pointer' }}
        />
      )}

      {/* BUY / BUY2 — section 직속, dialogue 밖 (구매완료 메시지 중엔 숨김) */}
      {phase === 'shop' && selectedShopItem && !purchaseMsg && (!thrownShopItem || isShopTextComplete || showBuy2) && (selectedShopItem.type !== 'gachaball' || showBuy2 || (gachaContextStep >= 1 && isShopTextComplete)) && (
        <div style={{
          position: 'absolute',
          right: '39%',
          bottom: 'calc(6% + 40px)',
          zIndex: 40,
          pointerEvents: 'auto',
        }}>
          {showBuy2 ? (
            <div ref={buy2Ref} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0, transform: 'translateY(-3px)' }}>
              {!buyConfirming && (
                <div style={{ position: 'relative', display: 'inline-block' }}>
                  <img src={buy2Image} alt="" aria-hidden="true" style={{ height: 56, display: 'block' }} />
                  <div style={{
                    position: 'absolute', inset: 0, paddingTop: 2,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                  }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); setQuantity(q => Math.max(1, q - 1)); }}
                      style={{ fontFamily: "'Mona12 Text KR','Mona12',monospace", color: '#fff', background: 'none', border: 'none', fontSize: 22, fontWeight: 700, cursor: 'pointer', lineHeight: 1, padding: '0 2px' }}
                    >−</button>
                    <span style={{ fontFamily: "'Mona12 Text KR','Mona12',monospace", color: '#fff', fontSize: 22, fontWeight: 700, minWidth: 28, textAlign: 'center', transform: quantity < 10 ? 'translateX(-2px)' : 'none' }}>{quantity}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); setQuantity(q => Math.min(selectedShopItem.stock === 99 ? 999 : selectedShopItem.stock, q + 1)); }}
                      style={{ fontFamily: "'Mona12 Text KR','Mona12',monospace", color: '#fff', background: 'none', border: 'none', fontSize: 22, fontWeight: 700, cursor: 'pointer', lineHeight: 1, padding: '0 2px' }}
                    >+</button>
                  </div>
                </div>
              )}
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (!buyConfirming) {
                      setBuyConfirming(true);
                    } else {
                      const itemName = selectedShopItem?.item?.name || '';
                      if (selectedShopItem.type === 'gachaball') {
                        const result = purchaseDesktopGacha(selectedShopItem, quantity);
                        if (result?.success) {
                          setShowBuy2(false);
                          setBuyConfirming(false);
                          setPurchaseReturnMode('gachaball');
                          setPurchaseMsg(result.message);
                          setPendingClosedMouth(false);
                          setQuantity(1);
                          setSelectedItem(null);
                          const aud = new Audio('/sound/purchase.mp3'); aud.currentTime = 0.4; aud.play().catch(() => {});
                        }
                        return;
                      }
                      if (selectedShopItem.type === 'randombox') {
                        const result = purchaseDesktopRandomBox(selectedShopItem, quantity);
                        if (result?.success) {
                          setShowBuy2(false);
                          setBuyConfirming(false);
                          setPurchaseReturnMode('randombox');
                          setPurchaseMsg(result.message);
                          setPendingClosedMouth(false);
                          setQuantity(1);
                          setSelectedItem(null);
                          const aud = new Audio('/sound/purchase.mp3'); aud.currentTime = 0.4; aud.play().catch(() => {});
                        }
                        return;
                      }
                      const shopItemForPurchase = {
                        ...selectedShopItem.item,
                        price: selectedShopItem.price,
                        itemId: selectedShopItem.itemId ?? selectedShopItem.item?.id,
                        stock: selectedShopItem.stock,
                        type: selectedShopItem.type,
                      };
                      const result = await onPurchase(shopItemForPurchase, quantity);
                      const ok = result === true || result?.success;
                      if (ok) {
                        const isSoldOutAfterPurchase = selectedShopItem.stock !== 99
                          && selectedShopItem.stock != null
                          && quantity >= selectedShopItem.stock;
                        setShowBuy2(false);
                        setBuyConfirming(false);
                        const baseMsg = `${itemName}${getEulReul(itemName)} ${quantity}개 구매하였다!`;
                        const premier = result?.premierMsg ? `\n${result.premierMsg}` : '';
                        setPurchaseMsg(baseMsg + premier);
                        setPendingClosedMouth(isSoldOutAfterPurchase);
                        if (isSoldOutAfterPurchase && activeListButton) {
                          setClosedListButtons((prev) => ({ ...prev, [activeListButton]: true }));
                        }
                        setQuantity(1);
                        setSelectedItem(null);
                        const aud = new Audio('/sound/purchase.mp3'); aud.currentTime = 0.4; aud.play().catch(() => {});
                      }
                    }
                  }}
                  style={{ position: 'relative', display: 'block', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                >
                  <img src={confirmImage} alt="확인" style={{ height: 56, display: 'block' }} />
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); setShowBuy2(true); setQuantity(1); }}
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
            >
              <img src={buyImage} alt="구매" style={{ height: 56, display: 'block' }} />
            </button>
          )}
        </div>
      )}

      <img
        className="shop-scene__cramorant"
        src={cramorantImage}
        alt="상점의 윽우지"
      />
    </section>
  );
}
