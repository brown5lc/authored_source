import { NavLink } from 'react-router-dom';

const NAV_ITEMS = [
  { to: '/',          label: 'Dashboard' },
  { to: '/grades',    label: 'Grades'    },
  { to: '/agenda',    label: 'Agenda'    },
  { to: '/free-code', label: 'Free Code' },
];

export default function Drawer() {
  return (
    <nav
      style={{
        width: 220,
        minHeight: '100vh',
        backgroundColor: '#111',
        borderRight: '1px solid #1e1e1e',
        padding: '24px 12px',
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}
    >
      {NAV_ITEMS.map(({ to, label }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          style={({ isActive }) => ({
            display: 'block',
            padding: '9px 14px',
            borderRadius: 8,
            fontSize: 14,
            fontWeight: isActive ? 600 : 400,
            color: isActive ? '#c4a9f7' : '#888',
            background: isActive ? 'rgba(105,62,214,0.15)' : 'transparent',
            textDecoration: 'none',
            transition: 'background 0.15s, color 0.15s',
          })}
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLAnchorElement;
            if (!el.classList.contains('active')) el.style.background = '#1a1a1a';
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLAnchorElement;
            if (!el.classList.contains('active')) el.style.background = 'transparent';
          }}
        >
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
