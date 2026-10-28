import React from "react";

export default ({ label, value, onChange }) => {
  return (
    <div>
      <label>{label}</label>
      <input
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
