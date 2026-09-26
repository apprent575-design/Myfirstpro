import React, { useEffect, useRef, useState } from 'react';

interface NumberInputProps {
  value: number;
  onChange: (value: number) => void;
  className?: string;
  placeholder?: string;
  dir?: 'ltr' | 'rtl';
  title?: string;
  disabled?: boolean;
  min?: number;
  max?: number;
  allowDecimal?: boolean;
  required?: boolean;
  /** قيمة تُعرض لما الخانة تكون فاضية (اختياري) */
  emptyLabel?: string;
}

const toEnglishDigits = (text: string) =>
  text.replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 0x0660)).replace(/[۰-۹]/g, d => String(d.charCodeAt(0) - 0x06f0));

/**
 * خانة أرقام: لو مسحتها تفضل فاضية (مش بترجع صفر لوحدها)، وأي رقم تكتبه يظهر زي ما هو
 * من غير ما يتحوّل لـ "05" أو يتشقلب مع كل حرف.
 */
export const NumberInput = ({
  value,
  onChange,
  className,
  placeholder,
  dir,
  title,
  disabled,
  min = 0,
  max,
  allowDecimal = true,
  required,
  emptyLabel,
}: NumberInputProps) => {
  const [text, setText] = useState<string>(value ? String(value) : '');
  const [focused, setFocused] = useState(false);
  const valueRef = useRef(value);
  valueRef.current = value;

  // أي تغيير جاي من برّه الموقع بيتحدّث في الخانة (إلا لو المستخدم بيكتب دلوقتي)
  useEffect(() => {
    if (focused) return;
    setText(value ? String(value) : '');
  }, [value, focused]);

  const parse = (raw: string): number | null => {
    const cleaned = toEnglishDigits(raw).replace(/[^\d.]/g, '');
    if (cleaned === '' || cleaned === '.') return null;
    const numeric = Number(cleaned);
    return isNaN(numeric) ? null : numeric;
  };

  const handleChange = (raw: string) => {
    const cleaned = toEnglishDigits(raw).replace(allowDecimal ? /[^\d.]/g : /[^\d]/g, '');
    // نقطة عشرية واحدة بس
    const parts = cleaned.split('.');
    const normalized = parts.length > 2 ? `${parts[0]}.${parts.slice(1).join('')}` : cleaned;
    setText(normalized);
    const numeric = parse(normalized);
    if (numeric === null) {
      onChange(0);
      return;
    }
    if (max !== undefined && numeric > max) {
      onChange(max);
      setText(String(max));
      return;
    }
    onChange(numeric);
  };

  const handleBlur = () => {
    setFocused(false);
    const numeric = parse(text);
    if (numeric === null) {
      setText('');
      onChange(0);
      return;
    }
    const clamped = min !== undefined && numeric < min ? min : max !== undefined && numeric > max ? max : numeric;
    if (clamped !== numeric) {
      setText(clamped ? String(clamped) : '');
      onChange(clamped);
      return;
    }
    setText(numeric ? String(numeric) : '');
  };

  return (
    <input
      type="text"
      inputMode={allowDecimal ? 'decimal' : 'numeric'}
      autoComplete="off"
      dir={dir}
      title={title}
      disabled={disabled}
      required={required}
      className={className}
      placeholder={value ? undefined : emptyLabel || placeholder}
      value={text}
      onFocus={() => setFocused(true)}
      onChange={e => handleChange(e.target.value)}
      onBlur={handleBlur}
    />
  );
};
