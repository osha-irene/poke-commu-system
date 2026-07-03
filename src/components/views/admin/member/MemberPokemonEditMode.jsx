import React from 'react';
import {
  X, Save, Sparkles, Award,
  Plus, Trash2, ChevronsUp,
} from 'lucide-react';
import { POKEBALL_LIST } from '../../../../styles/theme';
import { getPokemonGenderOptions } from '../../../../utils/pokemonGender';
import { getPokemonDisplayParts } from '../../../../utils/pokemonDisplayName';
import { getAbilityKoreanName } from '../../../../utils/abilityUtils';

const STAT_FIELDS = [
  { key: 'hp', label: 'HP' },
  { key: 'attack', label: '공격' },
  { key: 'defense', label: '방어' },
  { key: 'specialAttack', label: '특공' },
  { key: 'specialDefense', label: '특방' },
  { key: 'speed', label: '스피드' },
];

const CONDITION_FIELDS = [
  { key: 'elegance', label: '근사함' },
  { key: 'beauty', label: '아름다움' },
  { key: 'cuteness', label: '귀여움' },
  { key: 'intelligence', label: '슬기로움' },
  { key: 'strength', label: '강인함' },
];

const SIZE_RANKS = ['XXXS', 'XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];

function SectionHeader({ children }) {
  return (
    <div className="text-[10px] font-bold tracking-widest text-gray-400 uppercase mb-2 pb-1 border-b border-gray-100">
      {children}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-500 mb-1">{label}</label>
      {children}
    </div>
  );
}

const inputCls = "w-full px-2.5 py-1.5 border border-gray-200 rounded-md text-base focus:outline-none focus:ring-1 focus:ring-indigo-400";

const normalizeAbilityValue = (value) => String(value || '').trim().toLowerCase();

function buildAbilityOptions(pokemonTemplate, currentAbility) {
  const hiddenAbility = pokemonTemplate?.hiddenAbilityEn || '';
  const hiddenAbilityKey = normalizeAbilityValue(hiddenAbility);
  const seen = new Set();
  const options = [];

  const addOption = (value) => {
    const key = normalizeAbilityValue(value);
    if (!key || key === hiddenAbilityKey || seen.has(key)) return;
    seen.add(key);
    options.push(value);
  };

  (pokemonTemplate?.abilitiesEn || []).forEach(addOption);
  addOption(currentAbility);

  return options;
}

export default function MemberPokemonEditMode({
  pokemon,
  pokemonTemplate,
  editData,
  setEditData,
  allMoves,
  onSave,
  onCancel,
  onDelete,
  onOpenItemModal,
  onOpenMoveModal,
  evolutionCandidates = [],
  onAdminEvolve,
  allPokemonMaster = [],
}) {
  const genderOptions = getPokemonGenderOptions(pokemonTemplate || pokemon);
  const isGenderless = genderOptions.length === 1 && genderOptions[0] === 'none';
  const genderValue = genderOptions.includes(editData.gender) ? editData.gender : 'random';

  const hiddenAbility = pokemonTemplate?.hiddenAbilityEn || '';
  const abilityOptions = buildAbilityOptions(pokemonTemplate, editData.ability);

  const displayName = getPokemonDisplayParts(pokemon).name;
  const spriteUrl = editData.spriteUrl || `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.number}.png`;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">

      {/* ── 헤더: 현재 포켓몬 좌측 + 진화 루트 우측 ── */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200 gap-3">
        {/* 좌: 현재 포켓몬 */}
        <div className="flex items-center gap-3 min-w-0">
          <img
            src={spriteUrl}
            alt={displayName}
            className="w-12 h-12 object-contain flex-shrink-0"
            style={{ imageRendering: 'pixelated' }}
            onError={e => { e.currentTarget.style.display = 'none'; }}
          />
          <div className="min-w-0">
            <p className="text-sm text-gray-400">편집 중</p>
            <p className="font-bold text-gray-800 leading-tight truncate">{displayName}</p>
          </div>
        </div>

        {/* 우: 진화 루트 */}
        <div className="flex items-center gap-2 ml-auto">
          {evolutionCandidates.length > 0 && evolutionCandidates.map((evo) => {
            const toTemplate = allPokemonMaster.find(p =>
              Number(p.number) === Number(evo.to) ||
              Number(p.originalNumber) === Number(evo.to)
            );
            const toName = toTemplate ? getPokemonDisplayParts(toTemplate).name : evo.toName;
            const toSprite = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${evo.to}.png`;
            return (
              <button
                key={evo.to}
                type="button"
                onClick={() => onAdminEvolve(evo)}
                title={`→ ${toName}으로 진화 (조건 무시)`}
                className="flex flex-col items-center gap-0.5 group"
              >
                <span className="text-[10px] font-bold text-purple-600 bg-purple-100 border border-purple-200 rounded-full px-2 py-0.5 group-hover:bg-purple-200 transition-colors flex items-center gap-1">
                  <ChevronsUp size={10} />
                  {toName}
                </span>
                <img
                  src={toSprite}
                  alt={toName}
                  className="w-10 h-10 object-contain"
                  style={{ imageRendering: 'pixelated' }}
                  onError={e => { e.currentTarget.style.display = 'none'; }}
                />
              </button>
            );
          })}
          <button onClick={onCancel} className="p-1 rounded hover:bg-gray-200 text-gray-500 flex-shrink-0 ml-1">
            <X size={18} />
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4">

        {/* ── 2열 그리드 ── */}
        <div className="grid grid-cols-2 gap-4">

          {/* 1열: 기본 정보 + 속성 + 기술 */}
          <div className="space-y-3">
            <SectionHeader>기본 정보</SectionHeader>

            <div className="grid grid-cols-2 gap-2">
              <Field label="레벨">
                <input
                  type="number" min="1" max="100"
                  value={editData.level}
                  onChange={e => setEditData(p => ({ ...p, level: e.target.value }))}
                  className={inputCls}
                />
              </Field>
              <Field label="성별">
                <select
                  value={isGenderless ? 'none' : genderValue}
                  onChange={e => setEditData(p => ({ ...p, gender: e.target.value }))}
                  className={inputCls}
                  disabled={isGenderless}
                >
                  {!isGenderless && <option value="random">랜덤</option>}
                  {genderOptions.includes('male') && <option value="male">♂ 수컷</option>}
                  {genderOptions.includes('female') && <option value="female">♀ 암컷</option>}
                  {isGenderless && <option value="none">무성</option>}
                </select>
              </Field>
            </div>

            <Field label="닉네임">
              <input
                type="text"
                value={editData.nickname}
                onChange={e => setEditData(p => ({ ...p, nickname: e.target.value }))}
                className={inputCls}
                placeholder="없으면 종족명 표시"
              />
            </Field>

            <div className="grid grid-cols-2 gap-2">
              <Field label="특성">
                <select
                  value={editData.ability || abilityOptions[0] || ''}
                  onChange={e => {
                    const v = e.target.value;
                    setEditData(p => ({
                      ...p,
                      ability: v,
                      isHiddenAbility: Boolean(hiddenAbility && v === hiddenAbility),
                    }));
                  }}
                  className={inputCls}
                >
                  {abilityOptions.length === 0 && <option value="">특성 없음</option>}
                  {abilityOptions.map((a, i) => (
                    <option key={`${a}-${i}`} value={a}>{getAbilityKoreanName(a) || a}</option>
                  ))}
                  {hiddenAbility && (
                    <option value={hiddenAbility}>{getAbilityKoreanName(hiddenAbility) || hiddenAbility} (숨특)</option>
                  )}
                </select>
              </Field>
              <Field label="지닌 물건">
                {editData.heldItem ? (
                  <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-md px-2.5 py-1.5">
                    <span className="text-base text-gray-700 truncate">{editData.heldItem}</span>
                    <button onClick={() => setEditData(p => ({ ...p, heldItem: null }))} className="text-red-400 hover:text-red-600 ml-1 flex-shrink-0">
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={onOpenItemModal}
                    className="w-full text-base text-gray-400 border border-dashed border-gray-300 rounded-md py-1.5 hover:border-indigo-400 hover:text-indigo-600 transition-colors"
                  >
                    <Plus size={13} className="inline mr-1" />
                    아이템
                  </button>
                )}
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Field label="포획볼">
                <select
                  value={editData.caughtWithBall || '몬스터볼'}
                  onChange={e => setEditData(p => ({ ...p, caughtWithBall: e.target.value }))}
                  className={inputCls}
                >
                  {POKEBALL_LIST.map(ball => (
                    <option key={ball.nameEn} value={ball.name}>{ball.name}</option>
                  ))}
                  <option value="기타">기타</option>
                </select>
              </Field>
              <Field label="친밀도">
                <input
                  type="number" min="0" max="255"
                  value={editData.friendship || 0}
                  onChange={e => setEditData(p => ({
                    ...p, friendship: Math.min(255, Math.max(0, parseInt(e.target.value) || 0))
                  }))}
                  className={inputCls}
                />
              </Field>
            </div>

            {editData.caughtWithBall === '기타' && (
              <Field label="볼 이미지 URL">
                <input
                  type="text"
                  value={editData.customBallImage || ''}
                  onChange={e => setEditData(p => ({ ...p, customBallImage: e.target.value }))}
                  className={inputCls}
                  placeholder="https://..."
                />
              </Field>
            )}

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={editData.isShiny}
                onChange={e => setEditData(p => ({ ...p, isShiny: e.target.checked }))}
                className="accent-yellow-500"
              />
              <span className="text-base font-semibold text-gray-700 flex items-center gap-1">
                <Sparkles size={13} className="text-yellow-500" />
                이로치
              </span>
            </label>

            <Field label="체구">
              <div className="flex flex-wrap gap-1">
                {SIZE_RANKS.map(size => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setEditData(p => ({ ...p, sizeRank: size }))}
                    className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${
                      editData.sizeRank === size
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}
                  >
                    {size}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setEditData(p => ({ ...p, sizeRank: SIZE_RANKS[Math.floor(Math.random() * SIZE_RANKS.length)] }))}
                  className="px-2 py-1 rounded text-[10px] font-bold bg-amber-100 text-amber-600 hover:bg-amber-200 transition-all"
                >
                  랜덤
                </button>
              </div>
            </Field>

            <div className="grid grid-cols-2 gap-2">
              <Field label="스프라이트 URL">
                <input
                  type="text"
                  value={editData.spriteUrl}
                  onChange={e => setEditData(p => ({ ...p, spriteUrl: e.target.value }))}
                  className={`${inputCls} text-sm`}
                  placeholder="https://..."
                />
              </Field>
              <Field label="이미지 크기 (%)">
                <input
                  type="number" min="10" max="200"
                  value={editData.spriteSize ?? ''}
                  onChange={e => setEditData(p => ({ ...p, spriteSize: e.target.value ? Number(e.target.value) : null }))}
                  className={inputCls}
                  placeholder="기본 75"
                />
              </Field>
            </div>

          </div>

          {/* 2열: 기술 + 스탯 상세 */}
          <div className="space-y-3">

            {/* 기술 */}
            <div>
              <SectionHeader>기술 ({editData.moves.length}/4)</SectionHeader>
              <div className="space-y-1.5">
                {editData.moves.map((move, index) => {
                  const moveData = allMoves.find(m => m.id === move.moveId);
                  return (
                    <div key={index} className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-md px-2.5 py-1.5">
                      <div className="flex-1 min-w-0">
                        <p className="text-base font-semibold text-gray-800 truncate">{moveData?.name || '???'}</p>
                        <p className="text-sm text-gray-400">PP {move.currentPp}/{moveData?.pp || 0}</p>
                      </div>
                      <button
                        onClick={e => {
                          e.preventDefault();
                          setEditData(p => ({ ...p, moves: p.moves.filter((_, i) => i !== index) }));
                        }}
                        className="text-red-400 hover:text-red-600 flex-shrink-0"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                })}
                {editData.moves.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-2">기술 없음</p>
                )}
              </div>
              {editData.moves.length < 4 && (
                <button
                  type="button"
                  onClick={onOpenMoveModal}
                  className="mt-1.5 w-full text-base text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-md py-1.5 hover:bg-indigo-100 font-semibold transition-colors"
                >
                  <Plus size={13} className="inline mr-1" />
                  기술 추가
                </button>
              )}
            </div>

            {/* 스탯 상세: IVs / EVs / 컨디션 — 각각 세로 1줄 */}
            <SectionHeader>
              <span className="flex items-center gap-1.5"><Award size={12} />스탯 상세</span>
            </SectionHeader>

            {/* 개체값 | 노력치 | 컨디션 — 3열, 각 열이 세로 한 줄 */}
            <div className="grid grid-cols-3 gap-2">
              {/* IVs */}
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">개체값 (0–31)</p>
                <div className="space-y-1">
                  {STAT_FIELDS.map(({ key, label }) => (
                    <div key={key} className="flex items-center gap-1">
                      <span className="text-[11px] text-gray-400 w-7 flex-shrink-0">{label}</span>
                      <input
                        type="number" min="0" max="31"
                        value={editData.ivs[key]}
                        onChange={e => setEditData(p => ({ ...p, ivs: { ...p.ivs, [key]: parseInt(e.target.value) || 0 } }))}
                        className="w-full px-1 py-1 border border-gray-200 rounded text-sm text-center focus:outline-none focus:ring-1 focus:ring-indigo-400"
                      />
                    </div>
                  ))}
                </div>
              </div>
              {/* EVs */}
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">노력치 (0–252)</p>
                <div className="space-y-1">
                  {STAT_FIELDS.map(({ key, label }) => (
                    <div key={key} className="flex items-center gap-1">
                      <span className="text-[11px] text-gray-400 w-7 flex-shrink-0">{label}</span>
                      <input
                        type="number" min="0" max="252"
                        value={editData.effort[key]}
                        onChange={e => setEditData(p => ({ ...p, effort: { ...p.effort, [key]: parseInt(e.target.value) || 0 } }))}
                        className="w-full px-1 py-1 border border-gray-200 rounded text-sm text-center focus:outline-none focus:ring-1 focus:ring-indigo-400"
                      />
                    </div>
                  ))}
                </div>
              </div>
              {/* 컨디션 */}
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">컨디션 (0–255)</p>
                <div className="space-y-1">
                  {CONDITION_FIELDS.map(({ key, label }) => (
                    <div key={key} className="flex items-center gap-1">
                      <span className="text-[11px] text-gray-400 w-7 flex-shrink-0">{label}</span>
                      <input
                        type="number" min="0" max="255"
                        value={editData.condition[key]}
                        onChange={e => setEditData(p => ({ ...p, condition: { ...p.condition, [key]: parseInt(e.target.value) || 0 } }))}
                        className="w-full px-1 py-1 border border-gray-200 rounded text-sm text-center focus:outline-none focus:ring-1 focus:ring-indigo-400"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── 액션 버튼 ── */}
        <div className="flex gap-2 pt-1 border-t border-gray-100">
          <button
            onClick={onSave}
            className="flex-1 flex items-center justify-center gap-1.5 bg-indigo-600 text-white px-4 py-2 rounded-lg font-semibold text-base hover:bg-indigo-700 transition-colors"
          >
            <Save size={15} />
            저장
          </button>
          <button
            onClick={onCancel}
            className="flex-1 flex items-center justify-center gap-1.5 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-semibold text-base hover:bg-gray-200 transition-colors"
          >
            <X size={15} />
            취소
          </button>
          <button
            onClick={() => {
              if (window.confirm(`정말 ${pokemon.nickname || pokemon.name}을(를) 삭제하시겠습니까?`)) {
                onDelete?.(pokemon.uniqueId);
              }
            }}
            className="flex items-center justify-center gap-1.5 bg-red-50 text-red-600 px-4 py-2 rounded-lg font-semibold text-base hover:bg-red-100 border border-red-200 transition-colors"
          >
            <Trash2 size={15} />
            삭제
          </button>
        </div>
      </div>
    </div>
  );
}

