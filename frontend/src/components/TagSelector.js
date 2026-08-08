import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import FormGroup from "@mui/material/FormGroup";
import FormControlLabel from "@mui/material/FormControlLabel";
import Checkbox from "@mui/material/Checkbox";
import TextField from "@mui/material/TextField";

function TagSelector({ tags, selected, onChange }) {
  const [filter, setFilter] = useState("");
  const location = useLocation();
  const navigate = useNavigate();

  const toggle = (tag) => {
    if (selected.includes(tag)) {
      onChange(selected.filter((t) => t !== tag));
    } else {
      onChange([...selected, tag]);
    }
    if (location.pathname !== "/") {
      navigate("/");
    }
  };

  const filtered = tags.filter((t) => t.toLowerCase().includes(filter.toLowerCase()));

  return (
    <>
      <TextField
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="search tags"
        size="small"
        sx={{ mb: 1 }}
      />
      <FormGroup row sx={{ mb: 2 }}>
        {filtered.map((tag) => (
          <FormControlLabel
            key={tag}
            control={<Checkbox checked={selected.includes(tag)} onChange={() => toggle(tag)} />}
            label={tag}
          />
        ))}
      </FormGroup>
    </>
  );
}

export default TagSelector;
