import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  Navigate,
  useLocation,
} from 'react-router-dom';
import {
  ThemeProvider,
  CssBaseline,
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Button,
  Divider,
  Avatar,
  IconButton,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  PointOfSale as PosIcon,
  AcUnit as FrioIcon,
  History as TrazabilidadIcon,
  Inventory as InventarioIcon,
  ShoppingCart as ComprasIcon,
  AdminPanelSettings as AuditoriaIcon,
  Logout as LogoutIcon,
  Storefront,
  Menu as MenuIcon,
  Build as UtilidadesIcon,
  Forum as ChatIcon,
  SmartToy as SmartToyIcon,
  Payments as FinanzasIcon,
  Assessment as VentasIcon,
  Factory as ProduccionIcon,
  Biotech as CalidadIcon,
} from '@mui/icons-material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { theme } from './theme';
import { useAuthStore, apiFetch } from './store/useAuthStore';

// Páginas
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import POS from './pages/POS';
import Frio from './pages/Frio';
import Trazabilidad from './pages/Trazabilidad';
import Inventario from './pages/Inventario';
import Compras from './pages/Compras';
import Auditoria from './pages/Auditoria';
import Utilidades from './pages/Utilidades';
import Chat from './pages/Chat';
import Consolidado from './pages/Consolidado';
import Asistente from './pages/Asistente';
import CuentasPorPagar from './pages/CuentasPorPagar';
import Ventas from './pages/Ventas';
import Produccion from './pages/Produccion';
import Calidad from './pages/Calidad';

const DRAWER_WIDTH = 280;
const queryClient = new QueryClient();

function MainLayout() {
  const usuario = useAuthStore((state) => state.usuario);
  const logout = useAuthStore((state) => state.logout);
  const setSystemTimezone = useAuthStore((state) => state.setSystemTimezone);
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const unreadChannels = useAuthStore((state) => state.unreadChannels);
  const addUnreadChannel = useAuthStore((state) => state.addUnreadChannel);

  const [sucursales, setSucursales] = useState<any[]>([]);

  // Sync System Timezone from backend
  useEffect(() => {
    const fetchTimezone = async () => {
      try {
        const data = await apiFetch('/auth/system-timezone');
        if (data && data.timezone) {
          setSystemTimezone(data.timezone);
        }
      } catch (e) {
        console.error('Error al cargar zona horaria del sistema:', e);
      }
    };
    fetchTimezone();
  }, [setSystemTimezone]);

  // Compute unread sources dynamically from loaded sucursales
  const unreadKeys = Object.keys(unreadChannels).filter((key) => unreadChannels[key]);
  const hasUnreadChat = unreadKeys.length > 0;

  const unreadSources = unreadKeys.map((key) => {
    if (key === 'general') return 'General';
    const found = sucursales.find((s) => s.id === key);
    return found ? found.nombre.replace('Sucursal ', '') : 'Sucursal';
  });

  useEffect(() => {
    if (!usuario) return;
    const loadSucursales = async () => {
      try {
        const data = await apiFetch('/sucursales');
        setSucursales(data);
      } catch (e) {
        console.error('Error al cargar sucursales en App:', e);
      }
    };
    loadSucursales();
  }, [usuario]);

  useEffect(() => {
    if (!usuario) return;

    const getSocketUrl = () => {
      const apiUrl = (window as any)._env_?.VITE_API_URL || import.meta.env.VITE_API_URL;
      if (apiUrl) {
        return apiUrl.replace('/api', '');
      }
      const protocol = window.location.protocol;
      const hostname = window.location.hostname || 'localhost';
      return `${protocol}//${hostname}:3000`;
    };
    const socketUrl = getSocketUrl();

    const socket = io(socketUrl);

    socket.on('connect', () => {
      console.log('Global Layout Socket.io conectado');
      // Join general channel
      socket.emit('join-channel', { canalId: 'general' });

      // Join branch channels
      const isHQ = usuario.rol === 'ADMINISTRADOR' || usuario.rol === 'SUPERVISOR';
      if (isHQ) {
        sucursales.forEach((suc) => {
          socket.emit('join-channel', { canalId: suc.id });
        });
      } else if (usuario.sucursalId) {
        socket.emit('join-channel', { canalId: usuario.sucursalId });
      }
    });

    socket.on('nuevo-mensaje', (msg: any) => {
      if (window.location.pathname === '/chat') return;

      const isGeneral = msg.sucursalId === null;
      const isMyBranch = msg.sucursalId === usuario.sucursalId;
      const isHQ = usuario.rol === 'ADMINISTRADOR' || usuario.rol === 'SUPERVISOR';

      if (isGeneral || isMyBranch || isHQ) {
        const msgChannelId = msg.sucursalId === null ? 'general' : msg.sucursalId;
        addUnreadChannel(msgChannelId);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [usuario, sucursales]);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleMenuItemClick = () => {
    if (mobileOpen) {
      setMobileOpen(false);
    }
  };

  const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/', roles: [] },
    { text: 'Punto de Venta (POS)', icon: <PosIcon />, path: '/pos', roles: [] },
    { text: 'Ventas', icon: <VentasIcon />, path: '/ventas', roles: [] },
    { text: 'Cadena de Frío IoT', icon: <FrioIcon />, path: '/frio', roles: [] },
    { text: 'Trazabilidad de Lotes', icon: <TrazabilidadIcon />, path: '/trazabilidad', roles: [] },
    { text: 'Inventarios', icon: <InventarioIcon />, path: '/inventario', roles: [] },
    { text: 'Producción', icon: <ProduccionIcon />, path: '/produccion', roles: ['ADMINISTRADOR', 'SUPERVISOR', 'ALMACEN'] },
    { text: 'Control de Calidad', icon: <CalidadIcon />, path: '/calidad', roles: ['ADMINISTRADOR', 'SUPERVISOR', 'CALIDAD'] },
    { text: 'Compras / OC', icon: <ComprasIcon />, path: '/compras', roles: [] },
    { text: 'Cuentas por Pagar', icon: <FinanzasIcon />, path: '/finanzas', roles: ['ADMINISTRADOR', 'SUPERVISOR'] },
    { text: 'Auditoría y Personal', icon: <AuditoriaIcon />, path: '/auditoria', roles: ['ADMINISTRADOR', 'SUPERVISOR'] },
    { text: 'Chat Operativo', icon: <ChatIcon />, path: '/chat', roles: [] },
    { text: 'Asistente AI', icon: <SmartToyIcon />, path: '/asistente', roles: [] },
    { text: 'Utilidades', icon: <UtilidadesIcon />, path: '/utilidades', roles: [] },
  ];

  // Filtrar ítems de menú por rol de usuario
  const filteredMenuItems = menuItems.filter(
    (item) => item.roles.length === 0 || (usuario && item.roles.includes(usuario.rol))
  );

  const drawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Branding header */}
      <Box sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(2, 132, 199, 0.15)',
            color: 'primary.main',
            p: 1,
            borderRadius: 2,
          }}
        >
          <Storefront sx={{ fontSize: 28 }} />
        </Box>
        <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: '-0.02em', background: 'linear-gradient(135deg, #0284c7 0%, #10b981 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Lácteos ERP
        </Typography>
      </Box>

      <Divider sx={{ opacity: 0.5 }} />

      {/* Menu list */}
      <List sx={{ px: 2, py: 2, flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        {filteredMenuItems.map((item) => {
          const active = location.pathname === item.path;
          const isChat = item.path === '/chat';
          const shouldHighlight = isChat && hasUnreadChat;

          return (
            <ListItem key={item.text} disablePadding>
              <ListItemButton
                component={Link}
                to={item.path}
                selected={active}
                onClick={handleMenuItemClick}
                sx={{
                  borderRadius: 2,
                  py: 1.2,
                  backgroundColor: active
                    ? 'rgba(2, 132, 199, 0.08)'
                    : shouldHighlight
                      ? 'rgba(239, 68, 68, 0.08)'
                      : 'transparent',
                  color: active
                    ? 'primary.main'
                    : shouldHighlight
                      ? 'error.main'
                      : 'text.secondary',
                  '&.Mui-selected': {
                    backgroundColor: 'rgba(2, 132, 199, 0.12)',
                    color: 'primary.light',
                    '&:hover': {
                      backgroundColor: 'rgba(2, 132, 199, 0.16)',
                    },
                  },
                  '&:hover': {
                    backgroundColor: shouldHighlight ? 'rgba(239, 68, 68, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                    color: shouldHighlight ? 'error.light' : 'text.primary',
                  },
                  ...(shouldHighlight && {
                    animation: 'chatPulse 2.5s infinite',
                    '@keyframes chatPulse': {
                      '0%': { boxShadow: '0 0 0 0 rgba(239, 68, 68, 0.2)' },
                      '70%': { boxShadow: '0 0 0 6px rgba(239, 68, 68, 0)' },
                      '100%': { boxShadow: '0 0 0 0 rgba(239, 68, 68, 0)' }
                    }
                  })
                }}
              >
                <ListItemIcon sx={{
                  color: active
                    ? 'primary.main'
                    : shouldHighlight
                      ? 'error.main'
                      : 'text.secondary',
                  minWidth: 40
                }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                      <Typography sx={{ fontSize: '0.9rem', fontWeight: (active || shouldHighlight) ? 700 : 500 }}>
                        {item.text}
                      </Typography>
                      {shouldHighlight && (
                        <Box
                          sx={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            bgcolor: 'error.main',
                            mr: 1,
                            animation: 'dotPulse 1.5s infinite',
                            '@keyframes dotPulse': {
                              '0%': { transform: 'scale(0.8)', opacity: 0.5 },
                              '50%': { transform: 'scale(1.2)', opacity: 1 },
                              '100%': { transform: 'scale(0.8)', opacity: 0.5 }
                            }
                          }}
                        />
                      )}
                    </Box>
                  }
                  secondary={
                    shouldHighlight && unreadSources.length > 0 ? (
                      <Typography variant="caption" sx={{ color: 'error.light', fontSize: '0.7rem', display: 'block', mt: 0.2, fontWeight: 600 }}>
                        Nuevo de: {unreadSources.join(', ')}
                      </Typography>
                    ) : null
                  }
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>

      <Divider sx={{ opacity: 0.5 }} />

      {/* User profile section at the bottom */}
      {usuario && (
        <Box sx={{ p: 3, backgroundColor: 'rgba(15, 23, 42, 0.2)' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Avatar sx={{ bgcolor: 'primary.main', fontWeight: 700 }}>
              {usuario.nombre.substring(0, 2).toUpperCase()}
            </Avatar>
            <Box sx={{ overflow: 'hidden' }}>
              <Typography variant="subtitle2" noWrap sx={{ fontWeight: 700, textOverflow: 'ellipsis', overflow: 'hidden' }}>
                {usuario.nombre}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                {usuario.rol}
              </Typography>
            </Box>
          </Box>

          <Button
            fullWidth
            variant="outlined"
            color="error"
            size="small"
            startIcon={<LogoutIcon />}
            onClick={logout}
            sx={{ py: 1 }}
          >
            Cerrar Sesión
          </Button>
        </Box>
      )}
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, height: '100vh', width: '100vw', overflow: 'hidden' }}>
      {/* Mobile Top Bar (Header) */}
      <Box sx={{
        display: { xs: 'flex', md: 'none' },
        alignItems: 'center',
        justifyContent: 'space-between',
        px: 2,
        py: 1.5,
        backgroundColor: '#111827',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        height: 56,
        zIndex: 1100,
        width: '100%',
      }}>
        <IconButton
          color="inherit"
          aria-label="open drawer"
          edge="start"
          onClick={handleDrawerToggle}
          sx={{ mr: 2 }}
        >
          <MenuIcon />
        </IconButton>
        <Typography variant="h6" sx={{ fontWeight: 800, flexGrow: 1, letterSpacing: '-0.02em', background: 'linear-gradient(135deg, #0284c7 0%, #10b981 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Lácteos ERP
        </Typography>
        {usuario && (
          <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32, fontSize: '0.85rem', fontWeight: 700 }}>
            {usuario.nombre.substring(0, 2).toUpperCase()}
          </Avatar>
        )}
      </Box>

      {/* Temporary Drawer for mobile */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true, // Better open performance on mobile.
        }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: DRAWER_WIDTH,
            backgroundColor: '#111827',
            borderRight: '1px solid rgba(255, 255, 255, 0.08)',
          },
        }}
      >
        {drawerContent}
      </Drawer>

      {/* Permanent Drawer for desktop */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          width: DRAWER_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
            backgroundColor: '#111827',
            borderRight: '1px solid rgba(255, 255, 255, 0.08)',
          },
        }}
        open
      >
        {drawerContent}
      </Drawer>

      {/* Main Content Area */}
      <Box component="main" sx={{ flexGrow: 1, height: { xs: 'calc(100vh - 56px)', md: '100vh' }, overflow: 'hidden', backgroundColor: '#0b0f19' }}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/pos" element={<POS />} />
          <Route path="/ventas" element={<Ventas />} />
          <Route path="/frio" element={<Frio />} />
          <Route path="/trazabilidad" element={<Trazabilidad />} />
          <Route path="/inventario" element={<Inventario />} />
          {usuario?.rol === 'ADMINISTRADOR' || usuario?.rol === 'SUPERVISOR' || usuario?.rol === 'ALMACEN' ? (
            <Route path="/produccion" element={<Produccion />} />
          ) : (
            <Route path="/produccion" element={<Navigate to="/" />} />
          )}
          {usuario?.rol === 'ADMINISTRADOR' || usuario?.rol === 'SUPERVISOR' || usuario?.rol === 'CALIDAD' ? (
            <Route path="/calidad" element={<Calidad />} />
          ) : (
            <Route path="/calidad" element={<Navigate to="/" />} />
          )}
          <Route path="/compras" element={<Compras />} />
          {usuario?.rol === 'ADMINISTRADOR' || usuario?.rol === 'SUPERVISOR' ? (
            <Route path="/finanzas" element={<CuentasPorPagar />} />
          ) : (
            <Route path="/finanzas" element={<Navigate to="/" />} />
          )}
          {usuario?.rol === 'ADMINISTRADOR' || usuario?.rol === 'SUPERVISOR' ? (
            <Route path="/auditoria" element={<Auditoria />} />
          ) : (
            <Route path="/auditoria" element={<Navigate to="/" />} />
          )}
          <Route path="/chat" element={<Chat />} />
          {usuario?.rol === 'ADMINISTRADOR' || usuario?.rol === 'SUPERVISOR' ? (
            <Route path="/consolidado" element={<Consolidado />} />
          ) : (
            <Route path="/consolidado" element={<Navigate to="/" />} />
          )}
          <Route path="/utilidades" element={<Utilidades />} />
          <Route path="/asistente" element={<Asistente />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Box>
    </Box>
  );
}

export default function App() {
  const token = useAuthStore((state) => state.token);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Router>
          {token ? <MainLayout /> : <Login />}
        </Router>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
