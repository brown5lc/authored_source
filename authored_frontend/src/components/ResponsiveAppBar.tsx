import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Box from '@mui/material/Box';
import Logo from '../assets/authored_logo.png';
import { useUser } from '../context/UserContext';
import { USERS } from '../data/users';
import type { User } from '../data/users';

const ROLE_LABELS = { student: 'Student', professor: 'Professor', ta: 'TA' };

function Avatar({ user, size = 34 }: { user: User; size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: user.color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.35,
        fontWeight: 700,
        color: 'white',
        flexShrink: 0,
      }}
    >
      {user.initials}
    </div>
  );
}

function ResponsiveAppBar() {
  const { currentUser, setCurrentUser } = useUser();
  const navigate = useNavigate();
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);

  function handleSelect(user: User) {
    setCurrentUser(user);
    setAnchor(null);
    navigate('/');
  }

  return (
    <AppBar
      position="static"
      elevation={0}
      sx={{
        background: '#111',
        borderBottom: '1px solid #1e1e1e',
      }}
    >
      <Toolbar sx={{ px: 0, minHeight: '56px !important' }}>
        {/* Logo column — same width as the sidebar */}
        <Box
          sx={{
            width: 220,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRight: '1px solid #1e1e1e',
            height: '56px',
          }}
        >
          <img src={Logo} width={32} height={32} />
        </Box>

        {/* Content column */}
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', px: 3 }}>
          <Typography
            variant="h6"
            noWrap
            sx={{
              fontFamily: 'monospace',
              fontWeight: 700,
              letterSpacing: '.3rem',
              color: 'inherit',
              flexGrow: 1,
            }}
          >
            AUTHORED
          </Typography>

          {/* User switcher */}
        <Box
          onClick={(e) => setAnchor(e.currentTarget)}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            cursor: 'pointer',
            padding: '6px 12px',
            borderRadius: 2,
            border: '1px solid rgba(255,255,255,0.15)',
            '&:hover': { background: 'rgba(255,255,255,0.08)' },
          }}
        >
          <Avatar user={currentUser} />
          <Box sx={{ ml: 0.5 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
              {currentUser.name}
            </Typography>
            <Typography variant="caption" sx={{ color: currentUser.color, lineHeight: 1 }}>
              {ROLE_LABELS[currentUser.role]}
            </Typography>
          </Box>
          <Typography sx={{ ml: 0.5, color: '#888', fontSize: 12 }}>▾</Typography>
        </Box>

        <Menu
          anchorEl={anchor}
          open={Boolean(anchor)}
          onClose={() => setAnchor(null)}
          sx={{ mt: 1 }}
          slotProps={{ paper: { sx: { background: '#1e1e1e', border: '1px solid #333', minWidth: 200 } } }}
        >
          {USERS.map((user) => (
            <MenuItem
              key={user.id}
              onClick={() => handleSelect(user)}
              selected={user.id === currentUser.id}
              sx={{
                gap: 1.5,
                '&.Mui-selected': { background: 'rgba(105,62,214,0.15)' },
                '&:hover': { background: '#2a2a2a' },
              }}
            >
              <Avatar user={user} size={30} />
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {user.name}
                </Typography>
                <Typography variant="caption" sx={{ color: user.color }}>
                  {ROLE_LABELS[user.role]}
                </Typography>
              </Box>
            </MenuItem>
          ))}
        </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
}

export default ResponsiveAppBar;
