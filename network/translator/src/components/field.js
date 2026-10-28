import React, { useEffect, useRef } from "react";

export default ({ label, value, onChange }) => {
  const inputRef = useRef(null);
  useEffect(() => {
    const timer = setInterval(() => {
      const input = inputRef.current;
      if (input && input.value !== value) onChange(input.value);
    }, 100);
    return () => clearInterval(timer);
  }, [value, onChange]);

  return (
    <div>
      <label>{label}</label>
      <input
        ref={inputRef}
        className="input"
        value={value}
        onInput={e => onChange(e.target.value)}
        onChange={e => {
          // Native input is handled above; keep the React change fallback without duplicates.
          if (e.nativeEvent.type !== 'input') onChange(e.target.value);
        }}
      />
    </div>
  );
};
