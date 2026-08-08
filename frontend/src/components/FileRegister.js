import React, { useState } from 'react';
import Button from '@mui/material/Button';
import ButtonGroup from '@mui/material/ButtonGroup';
import CircularProgress from '@mui/material/CircularProgress';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';

// Backend base URL; override with REACT_APP_API_URL for remote access. Read at
// module scope since it is baked in at build time (see App.js).
const api = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// Achromatic fill kept local to this component: a global MuiButton override
// would also repaint the Tags button, the delete button and TagSelector.
// Dark mode inverts to a light fill with dark text, the same direction MUI's
// own contained buttons take, so the button sits at the screen's contrast.
const neutralGroupSx = (theme) => {
  const dark = theme.palette.mode === 'dark';
  return {
    '& .MuiButtonGroup-grouped': {
      bgcolor: dark ? 'grey.300' : 'grey.800',
      color: dark ? 'grey.900' : 'common.white',
      borderColor: dark ? 'grey.500' : 'grey.600',
      '&:hover': { bgcolor: dark ? 'grey.100' : 'grey.900' },
      // Our bgcolor would otherwise win over MUI's disabled styling.
      '&.Mui-disabled': {
        bgcolor: 'action.disabledBackground',
        color: 'action.disabled',
        borderColor: 'transparent',
      },
    },
  };
};

function FileRegister({ onRegistered }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [menuAnchor, setMenuAnchor] = useState(null);

  // Picking and registering are one action: the picker hands back an absolute
  // path that the user has already confirmed, so there is nothing left to edit.
  const pickAndRegister = async (kind) => {
    setMenuAnchor(null);
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      // The picker opens on the backend's machine and blocks until the user
      // confirms or cancels, so this request stays open for that whole time.
      const res = await fetch(`${api}/files/browse?kind=${kind}`);
      if (!res.ok) throw new Error('browse failed');
      const { path } = await res.json();
      if (!path) return; // cancelled
      const saved = await fetch(`${api}/files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path })
      });
      if (!saved.ok) throw new Error('register failed');
      onRegistered();
    } catch {
      setError('Could not register the selected item.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Stack direction="row" spacing={1} alignItems="center">
      <ButtonGroup variant="contained" disableElevation disabled={busy} sx={neutralGroupSx}>
        <Button
          onClick={() => pickAndRegister('file')}
          startIcon={busy ? <CircularProgress size={16} color="inherit" /> : null}
        >
          Register
        </Button>
        <Button
          size="small"
          aria-label="registration options"
          onClick={(e) => setMenuAnchor(e.currentTarget)}
        >
          <ArrowDropDownIcon />
        </Button>
      </ButtonGroup>
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
      >
        <MenuItem onClick={() => pickAndRegister('file')}>Register file…</MenuItem>
        <MenuItem onClick={() => pickAndRegister('folder')}>Register folder…</MenuItem>
      </Menu>
      {error && (
        <Typography variant="body2" color="error">
          {error}
        </Typography>
      )}
    </Stack>
  );
}

export default FileRegister;
