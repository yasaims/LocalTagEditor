import React from 'react';
import FormGroup from '@mui/material/FormGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';

function TagSelector({ tags, selected, onChange }) {
  const toggle = (tag) => {
    if (selected.includes(tag)) {
      onChange(selected.filter(t => t !== tag));
    } else {
      onChange([...selected, tag]);
    }
  };

  return (
    <FormGroup row sx={{ mb: 2 }}>
      {tags.map(tag => (
        <FormControlLabel
          key={tag}
          control={
            <Checkbox
              checked={selected.includes(tag)}
              onChange={() => toggle(tag)}
            />
          }
          label={tag}
        />
      ))}
    </FormGroup>
  );
}

export default TagSelector;
