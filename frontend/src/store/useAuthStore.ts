import { create } from 'zustand';

interface Usuario {
  id: string;
  email: string;
  nombre: string;
  rol: string;
  sucursalId: string | null;
  sucursalNombre: string;
}

interface AuthState {
  token: string | null;
  usuario: Usuario | null;
  unreadChannels: Record<string, boolean>;
  systemTimezone: string;
  login: (token: string, usuario: Usuario) => void;
  logout: () => void;
  addUnreadChannel: (channelId: string) => void;
  clearUnreadChannel: (channelId: string) => void;
  clearAllUnread: () => void;
  setSystemTimezone: (timezone: string) => void;
}

export const useAuthStore = create<AuthState>((set) => {
  // Inicializar desde localStorage
  const savedToken = localStorage.getItem('lacteosmrp_token');
  const savedUsuario = localStorage.getItem('lacteosmrp_usuario');
  const savedTimezone = localStorage.getItem('lacteosmrp_timezone') || 'America/El_Salvador';

  return {
    token: savedToken,
    usuario: savedUsuario ? JSON.parse(savedUsuario) : null,
    unreadChannels: {},
    systemTimezone: savedTimezone,
    login: (token, usuario) => {
      localStorage.setItem('lacteosmrp_token', token);
      localStorage.setItem('lacteosmrp_usuario', JSON.stringify(usuario));
      set({ token, usuario });
    },
    logout: () => {
      localStorage.removeItem('lacteosmrp_token');
      localStorage.removeItem('lacteosmrp_usuario');
      localStorage.removeItem('lacteosmrp_timezone');
      set({ token: null, usuario: null, unreadChannels: {}, systemTimezone: 'America/El_Salvador' });
    },
    addUnreadChannel: (channelId) => {
      set((state) => ({
        unreadChannels: {
          ...state.unreadChannels,
          [channelId]: true,
        },
      }));
    },
    clearUnreadChannel: (channelId) => {
      set((state) => ({
        unreadChannels: {
          ...state.unreadChannels,
          [channelId]: false,
        },
      }));
    },
    clearAllUnread: () => {
      set({ unreadChannels: {} });
    },
    setSystemTimezone: (timezone) => {
      localStorage.setItem('lacteosmrp_timezone', timezone);
      set({ systemTimezone: timezone });
    },
  };
});

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export async function apiFetch(path: string, options: RequestInit = {}) {
  const token = useAuthStore.getState().token;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 401 || response.status === 419) {
    useAuthStore.getState().logout();
    throw new Error('Sesión vencida. Ingrese nuevamente.');
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Error en la petición.');
  }

  return data;
}
