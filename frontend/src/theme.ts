import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#0284c7', // Sky Blue
      light: '#38bdf8',
      dark: '#0369a1',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#10b981', // Mint Green
      light: '#34d399',
      dark: '#047857',
      contrastText: '#ffffff',
    },
    background: {
      default: '#0b0f19', // Deep dark space-cadet blue
      paper: '#111827',   // Dark gray-blue
    },
    error: {
      main: '#f43f5e', // Coral Red
    },
    warning: {
      main: '#f59e0b', // Amber/Orange
    },
    info: {
      main: '#06b6d4', // Cyan
    },
    success: {
      main: '#10b981',
    },
    text: {
      primary: '#f1f5f9',
      secondary: '#94a3b8',
    },
    divider: 'rgba(255, 255, 255, 0.08)',
  },
  typography: {
    fontFamily: "'Outfit', 'Inter', sans-serif",
    h1: {
      fontWeight: 800,
      fontSize: '2.5rem',
      letterSpacing: '-0.02em',
    },
    h2: {
      fontWeight: 700,
      fontSize: '2rem',
      letterSpacing: '-0.01em',
    },
    h3: {
      fontWeight: 700,
      fontSize: '1.5rem',
    },
    h4: {
      fontWeight: 600,
      fontSize: '1.25rem',
    },
    h5: {
      fontWeight: 600,
      fontSize: '1.1rem',
    },
    h6: {
      fontWeight: 500,
      fontSize: '1rem',
    },
    button: {
      textTransform: 'none',
      fontWeight: 600,
      borderRadius: 8,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '8px 16px',
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          borderRadius: 12,
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          backgroundColor: '#111827',
          border: '1px solid rgba(255, 255, 255, 0.08)',
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          padding: '12px 16px',
        },
        head: {
          fontWeight: 600,
          backgroundColor: 'rgba(15, 23, 42, 0.4)',
        },
      },
    },
  },
});
