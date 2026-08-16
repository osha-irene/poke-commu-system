import { useEffect, useState } from 'react';
import { statsToText, textToStats } from '../lib/statText.js';

/**
 * "31,31,31,31,31,31" 형식의 6스탯 입력칸. 타이핑 중간에 콤마 6개짜리 완성된 값이 아니면
 * (지우는 중, 숫자 입력 중 등) 즉시 되돌리지 않고 화면에 그대로 둔다 — 유효한 값이 될 때만
 * 실제로 onChange를 올려보내고, 포커스를 벗어나면 마지막 유효값으로 정리한다.
 */
export default function StatTextInput({ value, onChange, disabled, className, title }) {
  const [text, setText] = useState(statsToText(value));

  useEffect(() => {
    setText(statsToText(value));
  }, [value]);

  function handleChange(e) {
    const nextText = e.target.value;
    setText(nextText);
    const parsed = textToStats(nextText, null);
    if (parsed) onChange(parsed);
  }

  function handleBlur() {
    setText(statsToText(value));
  }

  return (
    <input
      className={className}
      title={title}
      value={text}
      disabled={disabled}
      onChange={handleChange}
      onBlur={handleBlur}
    />
  );
}
