import { useEffect, useState } from 'react';

/**
 * 노력치 스탯 하나짜리 숫자 입력칸. 타이핑 중간(비어있음 등)에는 즉시 되돌리지 않고
 * 화면에 그대로 두다가, 유효한 숫자가 될 때만 onChange를 올려보낸다. 포커스를 벗어나면
 * 비어있거나 잘못된 값을 마지막 유효값으로 정리한다.
 */
export default function EvNumberInput({ value, onChange, disabled, className }) {
  const [text, setText] = useState(String(value ?? 0));

  useEffect(() => {
    setText(String(value ?? 0));
  }, [value]);

  function handleChange(e) {
    const next = e.target.value;
    setText(next);
    if (next === '') return;
    const num = Number(next);
    if (!Number.isNaN(num)) onChange(num);
  }

  function handleBlur() {
    if (text === '' || Number.isNaN(Number(text))) {
      setText(String(value ?? 0));
    }
  }

  return (
    <input
      className={className}
      type="text"
      inputMode="numeric"
      value={text}
      disabled={disabled}
      onChange={handleChange}
      onBlur={handleBlur}
    />
  );
}
