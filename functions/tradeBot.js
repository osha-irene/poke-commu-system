const { accountMention } = require('./shared');

const TRADE_EXPIRATION_MS = 24 * 60 * 60 * 1000; // 1일 미진행 시 자동 만료

const TRADE_HELD_ITEM_MAP = {
  '왕의징표석': 'kings-rock', '금속코트': 'metal-coat', '프로텍터': 'protector',
  '용의비늘': 'dragon-scale', '에레키부스터': 'electirizer', '마그마부스터': 'magmarizer',
  '업그레이드': 'up-grade', '괴상한패치': 'dubious-disc', '영계의천': 'reaper-cloth',
  '심해의이빨': 'deep-sea-tooth', '심해의비늘': 'deep-sea-scale',
  '고운비늘': 'prism-scale', '향기주머니': 'sachet', '휘핑팝': 'whipped-dream', '복합금속': 'metal-alloy',
};

const getItemNameEn = name => TRADE_HELD_ITEM_MAP[name] || String(name || '').toLowerCase().replace(/\s+/g, '-');

const getTradeCommand = (content = '') => {
  const text = String(content || '');
  if (/\[\s*교환\s*신청\s*\]|\b교환\s*신청\b/i.test(text)) return 'request';
  if (/\[\s*교환\s*수락\s*\]|\b교환\s*수락\b/i.test(text)) return 'accept';
  if (/\[\s*교환\s*거절\s*\]|\b교환\s*거절\b/i.test(text)) return 'decline';
  if (/\[\s*교환\s*종료\s*\]|\b교환\s*종료\b/i.test(text)) return 'cancel';
  if (extractTradePokemonName(text)) return 'selectPokemon';
  const plain = text.replace(/<[^>]+>/g, '').replace(/@\S+/g, '').trim();
  if (/^\d+$/.test(plain)) return 'pickNumber';
  return null;
};

const extractTradePokemonName = (content = '') => {
  const text = String(content || '');
  const bracketMatch = text.match(/\[\s*교환\s*[:：]\s*([^\]]+)\]/i);
  if (bracketMatch) {
    const value = bracketMatch[1].trim();
    return /^(신청|수락|거절)$/i.test(value) ? null : value;
  }
  const looseMatch = text.match(/교환\s*[:：]\s*([^\n\r\[]+)/i);
  if (!looseMatch) return null;
  const value = looseMatch[1].replace(/@\S+/g, '').trim();
  return /^(신청|수락|거절)$/i.test(value) ? null : value;
};

const normalizePokemonSearchText = (value = '') =>
  String(value || '').toLowerCase().replace(/\s+/g, '').replace(/[()[\]{}'"`.,:;!?_\-]/g, '');

const tradePokemonLabel = p => p?.nickname || p?.name || p?.nameEn || `No.${p?.number || '?'}`;
const getTradePokemonKey = p => p?.uniqueId || p?.id || p?.pokemonId || `${p?.number}_${p?.name}`;
const getTradeSearchFields = p => [p?.nickname, p?.name, p?.nameEn, p?.species, p?.baseSpecies, p?.number ? `No.${p.number}` : '', p?.number ? String(p.number) : ''].filter(Boolean);

const createTradeBot = ({ db, pokemonData, findMemberByAccount, extractMentionAccounts, normalizeAccount, localUsername, botAccount }) => {
  let evolutionsData = [];
  try { evolutionsData = require('./data/evolutions.json').evolutions || []; } catch (_) {}

  const stripFormSuffix = (name = '') => name.replace(/\s*\([^)]*(?:의\s*모습|모드)[^)]*\)\s*$/, '').trim();

  const checkTradeEvolution = (pokemon) => {
    if (!pokemon) return null;
    const num = Number(pokemon.number || pokemon.originalNumber || pokemon.pokemonId);
    if (!num) return null;
    const evo = evolutionsData.find(e => {
      if (Number(e.from) !== num) return false;
      if (!e.condition || e.condition.type !== 'trade') return false;
      if (e.condition.heldItem) {
        const held = getItemNameEn(pokemon.heldItem);
        const required = e.condition.heldItem.toLowerCase().replace(/\s+/g, '-');
        if (held !== required) return false;
      }
      return true;
    });
    if (!evo) return null;
    const toNum = Number(evo.to);
    const template = pokemonData.find(p => Number(p.number) === toNum || Number(p.originalNumber) === toNum);
    return template ? { evo, template } : null;
  };

  const applyTradeEvolution = (pokemon, template) => {
    const isDefault = !pokemon.nickname || pokemon.nickname === pokemon.name || pokemon.nickname === stripFormSuffix(pokemon.name) || pokemon.nickname === pokemon.nameEn;
    const evolved = {
      ...pokemon,
      number: template.number, originalNumber: template.originalNumber || template.number,
      name: stripFormSuffix(template.name || pokemon.name), nameEn: template.nameEn || pokemon.nameEn,
      displayName: stripFormSuffix(template.name || pokemon.displayName),
      nickname: isDefault ? null : pokemon.nickname,
      type: template.type || pokemon.type, type2: template.type2 || null,
      imageUrl: template.imageUrl || template.spriteUrl || pokemon.imageUrl,
      spriteUrl: template.imageUrl || template.spriteUrl || pokemon.spriteUrl,
      heldItem: null, evolvedAt: new Date().toISOString(), evolvedFrom: pokemon.number || pokemon.originalNumber,
    };
    if (template.baseStats != null) evolved.baseStats = template.baseStats;
    Object.keys(evolved).forEach(k => { if (evolved[k] === undefined) delete evolved[k]; });
    return evolved;
  };

  const findOwnedPokemonForTrade = (member, query) => {
    const nq = normalizePokemonSearchText(query);
    if (!nq) return { error: '교환할 포켓몬 이름을 찾을 수 없어요. [교환: 피카츄]처럼 적어 주세요.' };
    const caught = Array.isArray(member?.caughtPokemon) ? member.caughtPokemon : [];
    const candidates = caught.map((p, i) => ({ pokemon: p, index: i })).filter(({ pokemon }) => pokemon && !pokemon.isPartner);
    const exact = candidates.filter(({ pokemon }) => getTradeSearchFields(pokemon).some(f => normalizePokemonSearchText(f) === nq));
    const matches = exact.length ? exact : candidates.filter(({ pokemon }) => getTradeSearchFields(pokemon).some(f => normalizePokemonSearchText(f).includes(nq)));
    if (!matches.length) return { error: `${query}을(를) 보유 포켓몬에서 찾을 수 없어요.` };
    if (matches.length > 1) {
      // 닉네임 정확 일치로 한 마리로 좁혀지면 자동 선택
      const byNickname = matches.filter(({ pokemon }) => normalizePokemonSearchText(pokemon.nickname || '') === nq);
      if (byNickname.length === 1) return byNickname[0];
      return { candidates: matches.slice(0, 9) };
    }
    return matches[0];
  };

  const findPendingTrade = async (targetId, requesterId = null) => {
    const snap = await db.ref('gameData/tradeRequests').once('value');
    const trades = snap.val() || {};
    const now = Date.now();
    const pending = Object.entries(trades)
      .filter(([, t]) => t.status === 'pending' && t.targetId === targetId && (!requesterId || t.requesterId === requesterId) && now - Number(t.createdAt || 0) <= TRADE_EXPIRATION_MS)
      .sort((a, b) => Number(b[1].createdAt || 0) - Number(a[1].createdAt || 0));
    return pending.length ? { tradeKey: pending[0][0], trade: pending[0][1] } : null;
  };

  const findActiveTrade = async (memberId, otherMemberId = null, inReplyToId = null) => {
    const snap = await db.ref('gameData/tradeRequests').once('value');
    const trades = snap.val() || {};
    const now = Date.now();
    const active = Object.entries(trades)
      .filter(([, t]) => {
        if (!['pending', 'accepted'].includes(t.status)) return false;
        if (now - Number(t.createdAt || 0) > TRADE_EXPIRATION_MS) return false;
        const isParticipant = t.requesterId === memberId || t.targetId === memberId;
        const matchesOther = !otherMemberId || t.requesterId === otherMemberId || t.targetId === otherMemberId;
        return isParticipant && matchesOther;
      })
      .sort((a, b) => Number(b[1].updatedAt || b[1].createdAt || 0) - Number(a[1].updatedAt || a[1].createdAt || 0));
    if (!active.length) return null;
    // 리플라이 스레드 ID로 어느 교환인지 우선 식별
    if (inReplyToId) {
      const byThread = active.find(([, t]) =>
        t.lastBotStatusId === inReplyToId || t.mastodonStatusId === inReplyToId
      );
      if (byThread) return { tradeKey: byThread[0], trade: byThread[1] };
    }
    return { tradeKey: active[0][0], trade: active[0][1] };
  };

  const completeTrade = async ({ tradeKey, trade }) => {
    const [rs, ts] = await Promise.all([
      db.ref(`members/${trade.requesterId}`).once('value'),
      db.ref(`members/${trade.targetId}`).once('value'),
    ]);
    if (!rs.exists() || !ts.exists()) {
      await db.ref(`gameData/tradeRequests/${tradeKey}`).update({ status: 'failed', failedReason: 'member_not_found', updatedAt: Date.now() });
      return '교환할 회원 정보를 찾을 수 없어서 신청을 취소했어요.';
    }
    const requester = rs.val();
    const target = ts.val();
    const rCaught = Array.isArray(requester.caughtPokemon) ? [...requester.caughtPokemon] : [];
    const tCaught = Array.isArray(target.caughtPokemon) ? [...target.caughtPokemon] : [];
    const rIdx = rCaught.findIndex(p => p && getTradePokemonKey(p) === trade.requesterPokemonKey);
    if (rIdx < 0) {
      await db.ref(`gameData/tradeRequests/${tradeKey}`).update({ status: 'failed', failedReason: 'requester_pokemon_missing', updatedAt: Date.now() });
      return `${trade.requesterPokemonName || '상대 포켓몬'}을(를) 더 이상 찾을 수 없어서 교환을 취소했어요.`;
    }
    const tIdx = tCaught.findIndex(p => p && getTradePokemonKey(p) === trade.targetPokemonKey);
    if (tIdx < 0) {
      await db.ref(`gameData/tradeRequests/${tradeKey}`).update({ status: 'failed', failedReason: 'target_pokemon_missing', updatedAt: Date.now() });
      return `${trade.targetPokemonName || '상대 포켓몬'}을(를) 더 이상 찾을 수 없어서 교환을 취소했어요.`;
    }
    const rPokemon = rCaught[rIdx];
    const tPokemon = tCaught[tIdx];
    const withOwner = (p, from, to) => ({ ...p, ownerId: to, ...(Object.prototype.hasOwnProperty.call(p || {}, 'memberId') ? { memberId: to } : {}), ...(Object.prototype.hasOwnProperty.call(p || {}, 'trainerId') ? { trainerId: to } : {}), isPartner: false, tradedAt: new Date().toISOString(), tradedFrom: from, tradedTo: to });
    let rReceived = withOwner(tPokemon, trade.targetId, trade.requesterId);
    let tReceived = withOwner(rPokemon, trade.requesterId, trade.targetId);
    const evoMessages = [];
    const makeEvoEntry = (pokemon, template, fromName) => ({
      id: `evolution_${pokemon.uniqueId || Date.now()}_${Date.now()}`,
      pokemonId: pokemon.uniqueId || null,
      fromName,
      toName: template.name,
      toNameEn: template.nameEn,
      toNumber: template.number,
      imageUrl: template.imageUrl || template.spriteUrl || null,
      evolvedAt: Date.now(),
    });

    const rEvo = checkTradeEvolution(rReceived);
    let rEvoEntry = null;
    if (rEvo) { const before = rReceived.displayName || rReceived.name; rReceived = applyTradeEvolution(rReceived, rEvo.template); rEvoEntry = makeEvoEntry(rReceived, rEvo.template, before); evoMessages.push(`${trade.requesterName || '신청자'}의 ${before}이(가) ${rEvo.template.name}(으)로 진화했어요! 🎉`); }
    const tEvo = checkTradeEvolution(tReceived);
    let tEvoEntry = null;
    if (tEvo) { const before = tReceived.displayName || tReceived.name; tReceived = applyTradeEvolution(tReceived, tEvo.template); tEvoEntry = makeEvoEntry(tReceived, tEvo.template, before); evoMessages.push(`${trade.targetName || '상대'}의 ${before}이(가) ${tEvo.template.name}(으)로 진화했어요! 🎉`); }
    rCaught[rIdx] = rReceived;
    tCaught[tIdx] = tReceived;

    const rUpdates = { caughtPokemon: rCaught };
    const tUpdates = { caughtPokemon: tCaught };
    if (rEvoEntry) {
      const rHistSnap = await db.ref(`members/${trade.requesterId}/evolutionHistory`).once('value');
      const rHist = Array.isArray(rHistSnap.val()) ? rHistSnap.val() : [];
      rUpdates.evolutionHistory = [rEvoEntry, ...rHist].slice(0, 10);
    }
    if (tEvoEntry) {
      const tHistSnap = await db.ref(`members/${trade.targetId}/evolutionHistory`).once('value');
      const tHist = Array.isArray(tHistSnap.val()) ? tHistSnap.val() : [];
      tUpdates.evolutionHistory = [tEvoEntry, ...tHist].slice(0, 10);
    }

    await Promise.all([
      db.ref(`members/${trade.requesterId}`).update(rUpdates),
      db.ref(`members/${trade.targetId}`).update(tUpdates),
      db.ref(`gameData/tradeRequests/${tradeKey}`).update({ status: 'completed', targetPokemonKey: getTradePokemonKey(tPokemon), targetPokemonName: tradePokemonLabel(tPokemon), completedAt: Date.now(), updatedAt: Date.now() }),
    ]);
    return [[accountMention(trade.requesterAccount), accountMention(trade.targetAccount)].filter(Boolean).join(' '), '교환 완료!', `${trade.requesterName || '신청자'}의 ${tradePokemonLabel(rPokemon)} ↔ ${trade.targetName || '상대'}의 ${tradePokemonLabel(tPokemon)}`, ...evoMessages].filter(Boolean).join('\n');
  };

  const tradeCandidateLabel = (p, i) => {
    const species = p.name || p.species || '';
    const nickname = (p.nickname || '').trim();
    const nameStr = nickname && nickname !== species ? `${nickname} (${species})` : species;
    const level = p.level ? `Lv.${p.level}` : '';
    const ability = p.ability || p.abilityName || '';
    const parts = [level, ability].filter(Boolean).join(' / ');
    return `${i + 1}. ${nameStr}${parts ? ` — ${parts}` : ''}`;
  };

  const saveTradePokemonSelection = async ({ tradeKey, trade, author, offeredName, pickIndex }) => {
    const isRequester = author.id === trade.requesterId;
    const isTarget = author.id === trade.targetId;
    if (!isRequester && !isTarget) return '이 교환의 참가자가 아니에요.';

    if (pickIndex != null) {
      const saved = isRequester ? trade.requesterCandidates : trade.targetCandidates;
      if (!Array.isArray(saved) || !saved.length) return '선택할 목록이 없어요. 먼저 [교환: 포켓몬이름]으로 포켓몬을 지정해 주세요.';
      const idx = pickIndex - 1;
      if (idx < 0 || idx >= saved.length) return `1~${saved.length} 사이의 번호를 골라 주세요.`;
      const caught = Array.isArray(author.member?.caughtPokemon) ? author.member.caughtPokemon : [];
      const pokemon = caught.find(p => p && getTradePokemonKey(p) === saved[idx]);
      if (!pokemon) return '해당 포켓몬을 찾을 수 없어요. 다시 시도해 주세요.';
      const clearKey = isRequester ? 'requesterCandidates' : 'targetCandidates';
      const updates = { status: 'accepted', updatedAt: Date.now(), [clearKey]: null };
      if (isRequester) { updates.requesterPokemonKey = getTradePokemonKey(pokemon); updates.requesterPokemonName = tradePokemonLabel(pokemon); }
      else { updates.targetPokemonKey = getTradePokemonKey(pokemon); updates.targetPokemonName = tradePokemonLabel(pokemon); }
      await db.ref(`gameData/tradeRequests/${tradeKey}`).update(updates);
      const updated = { ...trade, ...updates };
      if (updated.requesterPokemonKey && updated.targetPokemonKey) return completeTrade({ tradeKey, trade: updated });
      const waitFor = updated.requesterPokemonKey ? updated.targetAccount : updated.requesterAccount;
      return [accountMention(waitFor), `${tradePokemonLabel(pokemon)}을(를) 교환 포켓몬으로 선택했어요.`, '상대도 [교환: 포켓몬이름]을 보내면 교환이 완료돼요.'].filter(Boolean).join('\n');
    }

    const result = findOwnedPokemonForTrade(author.member, offeredName);
    if (result.error) return result.error;
    if (result.candidates) {
      const keys = result.candidates.map(({ pokemon }) => getTradePokemonKey(pokemon));
      const saveKey = isRequester ? 'requesterCandidates' : 'targetCandidates';
      await db.ref(`gameData/tradeRequests/${tradeKey}`).update({ [saveKey]: keys, updatedAt: Date.now() });
      const lines = result.candidates.map(({ pokemon }, i) => tradeCandidateLabel(pokemon, i));
      return [`${offeredName}에 해당하는 포켓몬이 여러 마리예요. 번호로 골라 주세요:`, ...lines, '[1번]같은 형식으로 보내주세요.'].join('\n');
    }

    const { pokemon } = result;
    const updates = { status: 'accepted', updatedAt: Date.now() };
    if (isRequester) { updates.requesterPokemonKey = getTradePokemonKey(pokemon); updates.requesterPokemonName = tradePokemonLabel(pokemon); }
    else { updates.targetPokemonKey = getTradePokemonKey(pokemon); updates.targetPokemonName = tradePokemonLabel(pokemon); }
    await db.ref(`gameData/tradeRequests/${tradeKey}`).update(updates);
    const updated = { ...trade, ...updates };
    if (updated.requesterPokemonKey && updated.targetPokemonKey) return completeTrade({ tradeKey, trade: updated });
    const waitFor = updated.requesterPokemonKey ? updated.targetAccount : updated.requesterAccount;
    return [accountMention(waitFor), `${tradePokemonLabel(pokemon)}을(를) 교환 포켓몬으로 선택했어요.`, '상대도 [교환: 포켓몬이름]을 보내면 교환이 완료돼요.'].filter(Boolean).join('\n');
  };

  return {
    getCommand: getTradeCommand,
    extractPokemonName: extractTradePokemonName,
    handle: async ({ status, content, members, author, authorAccount }) => {
      const tradeCommand = getTradeCommand(content);
      const offeredName = extractTradePokemonName(content);
      const authorNorm = normalizeAccount(authorAccount);
      const taggedAccount = extractMentionAccounts(status).map(normalizeAccount).find(a => localUsername(a) !== botAccount && a !== authorNorm);
      const taggedMember = taggedAccount ? findMemberByAccount(members, taggedAccount) : null;
      const inReplyToId = status.in_reply_to_id || null;

      if (tradeCommand === 'request') {
        if (!taggedMember) return '교환할 상대를 멘션으로 태그해 주세요. 예: @상대 [교환: 피카츄]';
        if (taggedMember.id === author.id) return '자기 자신과는 교환할 수 없어요.';
        const offeredResult = offeredName ? findOwnedPokemonForTrade(author.member, offeredName) : null;
        if (offeredResult?.error) return offeredResult.error;
        // 신청자가 참여한 기존 교환(pending/accepted) 전부 취소
        const snap = await db.ref('gameData/tradeRequests').once('value');
        const allTrades = snap.val() || {};
        const now0 = Date.now();
        const cancels = Object.entries(allTrades).filter(([, t]) =>
          ['pending', 'accepted'].includes(t.status) &&
          (t.requesterId === author.id || t.targetId === author.id) &&
          now0 - Number(t.createdAt || 0) <= TRADE_EXPIRATION_MS
        );
        await Promise.all(cancels.map(([key]) =>
          db.ref(`gameData/tradeRequests/${key}`).update({ status: 'cancelled', cancelledAt: now0, updatedAt: now0 })
        ));
        const offeredPokemon = offeredResult?.pokemon || null;
        const trade = {
          id: `trade_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`, status: 'pending',
          requesterId: author.id, requesterName: author.member.name || author.member.nickname || author.id,
          requesterAccount: normalizeAccount(authorAccount),
          requesterPokemonKey: offeredPokemon ? getTradePokemonKey(offeredPokemon) : null,
          requesterPokemonName: offeredPokemon ? tradePokemonLabel(offeredPokemon) : null,
          targetId: taggedMember.id, targetName: taggedMember.member.name || taggedMember.member.nickname || taggedMember.id,
          targetAccount: normalizeAccount(taggedAccount || taggedMember.member.mastodonAccount || ''),
          mastodonStatusId: status.id, createdAt: Date.now(), updatedAt: Date.now(),
        };
        await db.ref('gameData/tradeRequests').push().set(trade);
        return [accountMention(trade.targetAccount), `${trade.targetName}에게 교환을 신청했어요.`, trade.requesterPokemonName ? `${trade.requesterName}의 ${trade.requesterPokemonName}` : null, '두 사람 모두 [교환: 내보낼 포켓몬 이름]을 보내면 교환이 완료돼요.'].filter(Boolean).join('\n');
      }

      const active = await findActiveTrade(author.id, taggedMember?.id || null, inReplyToId);

      if (tradeCommand === 'decline') {
        if (!active) return '거절할 교환 신청이 없어요.';
        await db.ref(`gameData/tradeRequests/${active.tradeKey}`).update({ status: 'declined', declinedBy: author.id, updatedAt: Date.now() });
        return [[accountMention(active.trade.requesterAccount), accountMention(active.trade.targetAccount)].filter(Boolean).join(' '), '교환 신청을 거절했어요.'].filter(Boolean).join('\n');
      }

      if (tradeCommand === 'cancel') {
        if (!active) return '진행 중인 교환이 없어요.';
        await db.ref(`gameData/tradeRequests/${active.tradeKey}`).update({ status: 'cancelled', cancelledBy: author.id, cancelledAt: Date.now(), updatedAt: Date.now() });
        return [[accountMention(active.trade.requesterAccount), accountMention(active.trade.targetAccount)].filter(Boolean).join(' '), '교환을 종료했어요.'].filter(Boolean).join('\n');
      }

      if (tradeCommand === 'accept') {
        if (!active) return '수락할 교환 신청이 없어요.';
        await db.ref(`gameData/tradeRequests/${active.tradeKey}`).update({ status: 'accepted', acceptedAt: Date.now(), updatedAt: Date.now() });
        return [[accountMention(active.trade.requesterAccount), accountMention(active.trade.targetAccount)].filter(Boolean).join(' '), '교환을 수락했어요.', '두 사람 모두 [교환: 내보낼 포켓몬 이름]을 보내 주세요.'].filter(Boolean).join('\n');
      }

      const bracketMatch = (status?.content || '').replace(/<[^>]+>/g, '').match(/\[(\d+)번?\]/);
      const pickNumber = bracketMatch ? parseInt(bracketMatch[1], 10) : null;
      if (pickNumber != null && active) {
        const hasCandidates = (author.id === active.trade.requesterId && Array.isArray(active.trade.requesterCandidates)) || (author.id === active.trade.targetId && Array.isArray(active.trade.targetCandidates));
        if (hasCandidates) return saveTradePokemonSelection({ tradeKey: active.tradeKey, trade: active.trade, author, pickIndex: pickNumber });
      }
      if (pickNumber != null) return null; // 배틀봇으로 위임

      if (offeredName && active) return saveTradePokemonSelection({ tradeKey: active.tradeKey, trade: active.trade, author, offeredName });

      if (!taggedMember) return '받은 교환 신청이 없어요. 새로 신청하려면 @상대 [교환: 포켓몬이름]으로 보내 주세요.';
      return null;
    },
  };
};

module.exports = { createTradeBot, getTradeCommand, extractTradePokemonName };
