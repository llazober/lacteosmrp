import { create } from 'zustand';

interface Usuario {
  id: string;
  email: string;
  nombre: string;
  rol: string;
  sucursalId: string | null;
  sucursalNombre: string;
  permisos?: string[];
}

interface AiExplanation {
  activo: boolean;
  moduloNombre: string;
  emoji: string;
  mensaje: string;
  tourActivo: boolean;
  indiceActual: number;
  total: number;
  siguienteNombre: string | null;
  siguienteSeccion: string | null;
}

interface AuthState {
  token: string | null;
  usuario: Usuario | null;
  unreadChannels: Record<string, boolean>;
  systemTimezone: string;
  aiExplanation: AiExplanation | null;
  login: (token: string, usuario: Usuario) => void;
  logout: () => void;
  addUnreadChannel: (channelId: string) => void;
  clearUnreadChannel: (channelId: string) => void;
  clearAllUnread: () => void;
  setSystemTimezone: (timezone: string) => void;
  setAiExplanation: (explanation: AiExplanation | null) => void;
}

export const useAuthStore = create<AuthState>((set) => {
  // Inicializar desde localStorage
  const savedToken = localStorage.getItem('lacteoserp_token');
  const savedUsuario = localStorage.getItem('lacteoserp_usuario');
  const savedTimezone = localStorage.getItem('lacteoserp_timezone') || 'America/El_Salvador';

  return {
    token: savedToken,
    usuario: savedUsuario ? JSON.parse(savedUsuario) : null,
    unreadChannels: {},
    systemTimezone: savedTimezone,
    aiExplanation: null,
    login: (token, usuario) => {
      localStorage.setItem('lacteoserp_token', token);
      localStorage.setItem('lacteoserp_usuario', JSON.stringify(usuario));
      set({ token, usuario });
    },
    logout: () => {
      localStorage.removeItem('lacteoserp_token');
      localStorage.removeItem('lacteoserp_usuario');
      localStorage.removeItem('lacteoserp_timezone');
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
      localStorage.setItem('lacteoserp_timezone', timezone);
      set({ systemTimezone: timezone });
    },
    setAiExplanation: (explanation) => {
      set({ aiExplanation: explanation });
    },
  };
});

const getApiBaseUrl = () => {
  if ((window as any)._env_?.VITE_API_URL) {
    return (window as any)._env_.VITE_API_URL;
  }
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  const protocol = window.location.protocol;
  const hostname = window.location.hostname || 'localhost';
  return `${protocol}//${hostname}:3000/api`;
};

const API_BASE_URL = getApiBaseUrl();

export async function apiFetch(path: string, options: RequestInit = {}) {
  const token = useAuthStore.getState().token;

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  };

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if ((response.status === 401 || response.status === 419) && !path.includes('/auth/login')) {
    useAuthStore.getState().logout();
    throw new Error('Sesión vencida. Ingrese nuevamente.');
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Error en la petición.');
  }

  return data;
}
