import React from 'react';

function TagSelector({ tags, selected, onChange }) {
  const toggle = (tag) => {
    if (selected.includes(tag)) {
      onChange(selected.filter(t => t !== tag));
    } else {
      onChange([...selected, tag]);
    }
  };

  return (
    <div style={{ marginBottom: '1rem' }}>
      {tags.map(tag => (
        <label key={tag} style={{ marginRight: '0.5rem' }}>
          <input
            type="checkbox"
            checked={selected.includes(tag)}
            onChange={() => toggle(tag)}
          />
          {tag}
        </label>
      ))}
    </div>
  );
}

export default TagSelector;
