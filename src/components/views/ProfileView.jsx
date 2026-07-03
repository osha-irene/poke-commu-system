import React, { useState, useEffect } from 'react';
import { Link, Pencil, Check } from 'lucide-react';
import { getDatabase, ref, get, set } from 'firebase/database';
import { getPokemonLocalIconUrl } from '../../utils/pokemonIconUtils';
import CachedImage from '../common/CachedImage';
import {
  formatMastodonAccount,
  getMastodonProfileUrl,
  getMastodonUsername,
} from '../../config/mastodonDomain';

function VerticalBarcode({ text, width = 32, height = 180 }) {
  const bits = [1, 0, 1];
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    for (let b = 7; b >= 0; b--) bits.push((c >> b) & 1);
    bits.push(0);
  }
  bits.push(1, 0, 1, 1);

  const runs = [];
  let cur = bits[0], cnt = 1;
  for (let i = 1; i < bits.length; i++) {
    if (bits[i] === cur) cnt++;
    else { runs.push([cur === 1, cnt]); cur = bits[i]; cnt = 1; }
  }
  runs.push([cur === 1, cnt]);

  const total = runs.reduce((s, [, c]) => s + c, 0);
  const unitH = height / total;

  let y = 0;
  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      {runs.map(([black, cnt], i) => {
        const h = Math.max(cnt * unitH, 0.5);
        const el = black ? <rect key={i} x={0} y={y} width={width} height={h} fill="#1a1a2e" /> : null;
        y += cnt * unitH;
        return el;
      })}
    </svg>
  );
}

export default function ProfileView({ trainer, caughtPokemon, items, titles = [] }) {
  const [mastodonAccount, setMastodonAccount] = useState('');
  const [mastodonLoading, setMastodonLoading] = useState(false);
  const [mastodonSaved, setMastodonSaved] = useState(false);
  const [isEditingMastodon, setIsEditingMastodon] = useState(false);
  const [mastodonInput, setMastodonInput] = useState('');

  const todayWalksUsed = trainer.maxDailyWalks - trainer.dailyWalks;
  const trainerId = trainer.id
    ? String(trainer.id.split('').reduce((acc, c) => (acc * 31 + c.charCodeAt(0)) & 0xFFFFFF, 0)).padStart(6, '0').slice(-6)
    : '000000';
  const partnerPokemon = trainer.partnerPokemon || null;
  const partnerIcon = partnerPokemon ? getPokemonLocalIconUrl(partnerPokemon) : null;
  const currentTitle = trainer.title && trainer.title !== 'none'
    ? titles.find(t => t.id === trainer.title)?.label || ''
    : '';

  useEffect(() => {
    if (!trainer?.id) return;
    const db = getDatabase();
    get(ref(db, `members/${trainer.id}/mastodonAccount`)).then(snapshot => {
      if (snapshot.exists()) {
        const val = snapshot.val();
        const username = getMastodonUsername(val);
        setMastodonAccount(username);
        setMastodonInput(username);
      }
    }).catch(() => {});
  }, [trainer]);

  const saveMastodon = async () => {
    const username = getMastodonUsername(mastodonInput);
    if (!username) return;
    setMastodonLoading(true);
    try {
      const db = getDatabase();
      await set(ref(db, `members/${trainer.id}/mastodonAccount`), formatMastodonAccount(username));
      setMastodonAccount(username);
      setMastodonSaved(true);
      setIsEditingMastodon(false);
      setTimeout(() => setMastodonSaved(false), 2000);
    } catch {
    } finally {
      setMastodonLoading(false);
    }
  };

  const handleMastodonKeyDown = (e) => {
    if (e.key === 'Enter') saveMastodon();
    if (e.key === 'Escape') { setIsEditingMastodon(false); setMastodonInput(mastodonAccount); }
  };

  return (
    <div className="flex items-start justify-center w-full">
      <div className="rounded-xl  shadow-xl border-4 border-lime-600 ring-2 ring-white overflow-hidden" style={{ maxWidth: '50rem', width: '100%' }}>
        <div className="flex gap-0 ">

          {/* 좌측: 이미지 */}
          <div className="flex-shrink-0 w-80 relative self-stretch overflow-hidden" style={{ background: 'rgba(20,20,30,0.35)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
            {trainer.profileImage ? (
              <CachedImage
                src={trainer.profileImage}
                alt={trainer.name}
                className="absolute inset-0 w-full h-full object-cover object-top scale-[1] origin-top"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-28 h-28 rounded-full bg-white/20 border-4 border-white/40 flex items-center justify-center text-6xl shadow-inner">
                  {trainer.name?.charAt(0) || '👦'}
                </div>
              </div>
            )}
          </div>

          {/* 우측: 정보 */}
          <div className="flex-1 flex bg-white" style={{ minHeight: '400px' }}>

            {/* 콘텐츠 */}
            <div className="flex-1 px-6 flex flex-col gap-4" style={{ paddingTop: '35px', paddingBottom: '36px' }}>

              {/* ID */}
              <div className="text-gray-400 tracking-wider" style={{ paddingTop: '0px',paddingBottom: '8px', fontFamily: "'Aggravo', Georgia, serif", fontSize: '1rem' }}>
                ID. {trainerId}
              </div>

                 {/* 칭호 + 이름 + 파트너 아이콘 */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-col gap-1">
                <span className="text-sl text-gray-400 font-medium tracking-wide h-6">
                  {currentTitle}
                </span>
                  <div className="flex items-center gap-2 flex-wrap">  
                   <h3 className="text-3xl font-bold">{trainer.name}</h3>
                   {/*  {trainer.isSuperAdmin && (
                    <span className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full font-semibold">슈퍼관리자</span>
                  )}
                  {trainer.isAdmin && !trainer.isSuperAdmin && (
                    <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full font-semibold">관리자</span>
                  )}*/}
                </div>
                  {/*  <span className="text-gray-400 text-sm">포켓몬 트레이너</span>*/}
              </div>
            </div>

              {/* 스탯 */}
              <div className="flex flex-col gap-1.5 text-m text-gray-600">
                 {partnerPokemon && (
                  <div>파트너 <strong className="text-pink-400">{partnerPokemon.nickname || partnerPokemon.name}</strong></div>
                )}
                {trainer.hometown && <div>출신 지역 <strong className="text-gray-700">{trainer.hometown}</strong></div>}
                <div>여행을 시작한 날 <strong className="text-gray-700">7월 5일</strong></div>
                <br></br>
                <div>탐험 횟수 <strong className="text-gray-700">{todayWalksUsed}/{trainer.maxDailyWalks}회</strong></div>
                <div>경험치 <strong className="text-gray-700">{(trainer.trainerExp || 0).toLocaleString()}</strong></div>
                <div>보유 금액 <strong className="text-gray-700">{trainer.money?.toLocaleString() || 0}원</strong></div>

              </div>

              {/* 마스토돈 — 하단 */}
              <div className="mt-auto">
                {isEditingMastodon ? (
                  <div className="flex items-center gap-1.5">
                    <Link className="w-3 h-3 text-purple-400 flex-shrink-0" />
                    <input
                      autoFocus
                      type="text"
                      placeholder="username"
                      value={mastodonInput}
                      onChange={e => setMastodonInput(e.target.value)}
                      onKeyDown={handleMastodonKeyDown}
                      className="w-28 px-2 py-0.5 text-xs border border-purple-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-400 text-right"
                    />
                    <button
                      onClick={saveMastodon}
                      disabled={mastodonLoading}
                      className="p-1 bg-purple-500 hover:bg-purple-600 text-white rounded transition disabled:opacity-50"
                    >
                      <Check className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div
                    className="group flex items-center gap-1.5 cursor-pointer"
                    onClick={() => { setMastodonInput(mastodonAccount); setIsEditingMastodon(true); }}
                  >
                    <Link className="w-3 h-3 text-purple-300 flex-shrink-0" />
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      {mastodonAccount
                        ? formatMastodonAccount(mastodonAccount).toUpperCase()
                        : <span className="text-gray-300 font-normal">마스토돈 미연결</span>}
                    </span>
                    <Pencil className="w-3 h-3 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                    {mastodonSaved && <Check className="w-3 h-3 text-green-500" />}
                  </div>
                )}
              </div>

            </div>

            {/* 우측 스트립: 파트너 아이콘 + 바코드 */}
            <div className="flex flex-col items-center gap-3 py-5 px-4">

              {/* 파트너 포켓몬 */}
              {partnerIcon ? (
                <div
                  className="flex-shrink-0 rounded-full bg-gray-50 border-2 border-gray-100 shadow-sm"
                  title={partnerPokemon?.nickname || partnerPokemon?.name || ''}
                  style={{
                    width: 64, height: 64,
                    backgroundImage: `url(${partnerIcon})`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'left center',
                    backgroundSize: 'auto 100%',
                    imageRendering: 'pixelated',
                  }}
                />
              ) : (
                <div className="flex-shrink-0 rounded-full bg-gray-100 border-2 border-gray-200" style={{ width: 64, height: 64 }} />
              )}

              {/* 바코드 */}
              {mastodonAccount && (
                <a
                  href={getMastodonProfileUrl(mastodonAccount)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center opacity-100 hover:opacity-100 transition-opacity"
                >
                  <VerticalBarcode
                    text={getMastodonProfileUrl(mastodonAccount)}
                    width={60}
                    height={200}
                  />
                </a>
              )}

            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
