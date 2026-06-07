import { useState, useEffect, useRef } from 'react';
import {
  Paper,
  Typography,
  Box,
  TextField,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Chip,
  Divider,
  Alert,
} from '@mui/material';
import {
  Send as SendIcon,
  Forum as ForumIcon,
  Tag as TagIcon,
  Store as StoreIcon,
} from '@mui/icons-material';
import { io, Socket } from 'socket.io-client';
import { apiFetch, useAuthStore } from '../store/useAuthStore';

// Map roles to distinct colors
const getRoleColor = (rol: string) => {
  switch (rol) {
    case 'ADMINISTRADOR': return '#ef4444';
    case 'SUPERVISOR': return '#f97316';
    case 'GERENTE_TIENDA': return '#a855f7';
    case 'CAJERO': return '#3b82f6';
    case 'ALMACEN': return '#10b981';
    case 'CALIDAD': return '#84cc16';
    default: return '#94a3b8';
  }
};

export default function Chat() {
  const usuario = useAuthStore((state) => state.usuario);
  const [sucursales, setSucursales] = useState<any[]>([]);
  const [activeChannel, setActiveChannel] = useState<{ id: string; nombre: string }>({
    id: 'general',
    nombre: 'General (Global)',
  });
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const unreadChannels = useAuthStore((state) => state.unreadChannels);
  const addUnreadChannel = useAuthStore((state) => state.addUnreadChannel);
  const clearUnreadChannel = useAuthStore((state) => state.clearUnreadChannel);

  const socketRef = useRef<Socket | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const activeChannelRef = useRef(activeChannel);

  // Sync activeChannel ref
  useEffect(() => {
    activeChannelRef.current = activeChannel;
    clearUnreadChannel(activeChannel.id);
  }, [activeChannel, clearUnreadChannel]);

  // Load branches (sucursales)
  useEffect(() => {
    const cargarSucursales = async () => {
      try {
        const data = await apiFetch('/sucursales');
        setSucursales(data);
      } catch (e) {
        console.error('Error al cargar sucursales:', e);
      }
    };
    cargarSucursales();
  }, []);

  // Socket.io Real-time connection
  useEffect(() => {
    if (sucursales.length === 0) return;

    // Dynamic WebSocket URL resolution (replace /api with empty string)
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
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('WebSocket conectado para Chat');
      // Join general channel
      socket.emit('join-channel', { canalId: 'general' });

      // Join all accessible branch channels
      visibleBranchChannels.forEach((suc) => {
        socket.emit('join-channel', { canalId: suc.id });
      });
    });

    socket.on('nuevo-mensaje', (msg: any) => {
      const msgChannelId = msg.sucursalId === null ? 'general' : msg.sucursalId;
      const currentActiveId = activeChannelRef.current.id;

      if (msgChannelId === currentActiveId) {
        setMessages((prev) => {
          // Avoid duplicate messages in list
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      } else {
        // Mark channel as unread globally
        addUnreadChannel(msgChannelId);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [sucursales, addUnreadChannel]);

  // Load message history on channel change
  useEffect(() => {
    const cargarHistorial = async () => {
      try {
        setErrorMsg(null);
        const data = await apiFetch(`/chat/mensajes?canalId=${activeChannel.id}`);
        setMessages(data);
      } catch (e: any) {
        setErrorMsg(e.message || 'Error al cargar historial.');
      }
    };
    cargarHistorial();
  }, [activeChannel.id]);

  // Scroll to bottom when messages update
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;
    try {
      setErrorMsg(null);
      await apiFetch('/chat/mensajes', {
        method: 'POST',
        body: JSON.stringify({
          contenido: inputText.trim(),
          canalId: activeChannel.id,
        }),
      });
      setInputText('');
    } catch (e: any) {
      setErrorMsg(e.message || 'No se pudo enviar el mensaje.');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  // Filter channels based on role
  const isHQAdmin = usuario?.rol === 'ADMINISTRADOR' || usuario?.rol === 'SUPERVISOR';
  
  // Channels to render:
  // General is always visible.
  // Branch channels: HQ see all, branch staff see only their own.
  const visibleBranchChannels = sucursales.filter((suc) => {
    if (isHQAdmin) return true;
    return usuario?.sucursalId === suc.id;
  });

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Box sx={{ mb: { xs: 1.5, md: 3 } }}>
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5, display: 'flex', alignItems: 'center', gap: 1.5, fontSize: { xs: '1.4rem', md: '2.125rem' } }}>
          <ForumIcon color="primary" sx={{ fontSize: { xs: '1.8rem', md: '2.5rem' } }} /> Chat Operativo
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Comunicación instantánea entre sucursales y administración del sistema.
        </Typography>
      </Box>

      {errorMsg && (
        <Alert severity="error" onClose={() => setErrorMsg(null)} sx={{ mb: 2, borderRadius: 2 }}>
          {errorMsg}
        </Alert>
      )}

      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: { xs: 1, md: 3 }, flexGrow: 1, minHeight: 0, overflow: 'hidden' }}>
        {/* SIDEBAR: CHANNELS LIST */}
        <Paper
          className="glass-panel"
          sx={{
            p: { xs: 1, md: 2 },
            display: 'flex',
            flexDirection: { xs: 'row', md: 'column' },
            flexShrink: 0,
            width: { xs: '100%', md: '280px' },
            height: { xs: 'auto', md: '100%' },
            maxHeight: { xs: '56px', md: '100%' },
            overflowX: { xs: 'auto', md: 'hidden' },
            overflowY: { xs: 'hidden', md: 'auto' },
            border: '1px solid rgba(255,255,255,0.05)',
            backgroundColor: 'rgba(15, 23, 42, 0.4)',
            alignItems: { xs: 'center', md: 'stretch' },
            gap: { xs: 0.5, md: 0 },
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'primary.main', mb: 2, textTransform: 'uppercase', display: { xs: 'none', md: 'block' } }}>
            Canales Disponibles
          </Typography>

          <List sx={{ display: 'flex', flexDirection: { xs: 'row', md: 'column' }, gap: 0.5, p: 0, flexShrink: 0 }}>
            {/* General Channel */}
            <ListItem disablePadding>
              <ListItemButton
                selected={activeChannel.id === 'general'}
                onClick={() => {
                  if (activeChannel.id !== 'general') {
                    setActiveChannel({ id: 'general', nombre: 'General (Global)' });
                  }
                }}
                sx={{
                  borderRadius: 2,
                  backgroundColor: activeChannel.id === 'general' ? 'rgba(2, 132, 199, 0.1)' : 'transparent',
                  color: activeChannel.id === 'general' ? 'primary.main' : 'text.secondary',
                  '&.Mui-selected': {
                    backgroundColor: 'rgba(2, 132, 199, 0.15)',
                    color: 'primary.light',
                  },
                }}
              >
                <TagIcon sx={{ mr: 1, fontSize: '1.2rem' }} />
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                      <Typography sx={{ fontSize: '0.85rem', fontWeight: activeChannel.id === 'general' ? 700 : (unreadChannels['general'] ? 800 : 500), color: unreadChannels['general'] ? 'error.main' : 'inherit' }}>
                        # general
                      </Typography>
                      {unreadChannels['general'] && (
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
                  secondary={<Typography sx={{ fontSize: '0.7rem' }} color="text.secondary">Multiusuario global</Typography>}
                />
              </ListItemButton>
            </ListItem>

            {visibleBranchChannels.length > 0 && (
              <>
                <Divider orientation="vertical" flexItem sx={{ display: { xs: 'block', md: 'none' }, mx: 0.5, borderColor: 'rgba(255,255,255,0.05)' }} />
                <Divider sx={{ display: { xs: 'none', md: 'block' }, my: 1.5, borderColor: 'rgba(255,255,255,0.05)' }} />
                <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', mb: 1, pl: 1, display: { xs: 'none', md: 'block' }, textTransform: 'uppercase' }}>
                  Sucursales
                </Typography>
              </>
            )}

            {/* Branch Channels */}
            {visibleBranchChannels.map((suc) => {
              const isUnread = unreadChannels[suc.id];
              return (
                <ListItem key={suc.id} disablePadding>
                  <ListItemButton
                    selected={activeChannel.id === suc.id}
                    onClick={() => {
                      if (activeChannel.id !== suc.id) {
                        setActiveChannel({ id: suc.id, nombre: `Sucursal ${suc.nombre}` });
                      }
                    }}
                    sx={{
                      borderRadius: 2,
                      backgroundColor: activeChannel.id === suc.id ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
                      color: activeChannel.id === suc.id ? 'secondary.main' : 'text.secondary',
                      '&.Mui-selected': {
                        backgroundColor: 'rgba(16, 185, 129, 0.15)',
                        color: 'secondary.light',
                      },
                    }}
                  >
                    <StoreIcon sx={{ mr: 1, fontSize: '1.2rem' }} />
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                          <Typography sx={{ fontSize: '0.85rem', fontWeight: activeChannel.id === suc.id ? 700 : (isUnread ? 800 : 500), color: isUnread ? 'error.main' : 'inherit' }}>
                            # {suc.nombre.toLowerCase().replace(/\s+/g, '-')}
                          </Typography>
                          {isUnread && (
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
                      secondary={<Typography sx={{ fontSize: '0.7rem' }} color="text.secondary">Soporte sucursal</Typography>}
                    />
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>
        </Paper>

        {/* ACTIVE CHAT FEED */}
        <Paper
          className="glass-panel"
          sx={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            minHeight: 0,
            overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.05)',
            backgroundColor: 'rgba(15, 23, 42, 0.2)',
          }}
        >
          {/* Chat Header */}
          <Box sx={{ p: 2, borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: 1.5, backgroundColor: 'rgba(0,0,0,0.1)' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: '50%', backgroundColor: 'rgba(2, 132, 199, 0.1)', color: 'primary.main' }}>
              {activeChannel.id === 'general' ? <ForumIcon sx={{ fontSize: '1.2rem' }} /> : <StoreIcon sx={{ fontSize: '1.2rem' }} />}
            </Box>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                {activeChannel.nombre}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {activeChannel.id === 'general'
                  ? 'Canal corporativo abierto para todos los locales.'
                  : 'Canal operativo privado para comunicación directa con HQ.'}
              </Typography>
            </Box>
          </Box>

          {/* Messages Scroll Container */}
          <Box sx={{ flexGrow: 1, p: 3, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            {messages.length === 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', opacity: 0.4 }}>
                <ForumIcon sx={{ fontSize: '3rem', mb: 1, color: 'text.secondary' }} />
                <Typography variant="body2" color="text.secondary">
                  No hay mensajes en este canal. ¡Sé el primero en saludar!
                </Typography>
              </Box>
            ) : (
              messages.map((msg) => {
                const isSelf = msg.usuario.id === usuario?.id;
                const roleColor = getRoleColor(msg.usuario.rol);
                const senderName = msg.usuario.nombre;

                return (
                  <Box
                    key={msg.id}
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: isSelf ? 'flex-end' : 'flex-start',
                      width: '100%',
                    }}
                  >
                    {/* Sender details (only show if not self) */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, px: 0.5 }}>
                      <Typography variant="caption" sx={{ fontWeight: 800, color: roleColor }}>
                        {senderName}
                      </Typography>
                      <Chip
                        label={msg.usuario.rol.replace('_', ' ')}
                        size="small"
                        sx={{
                          height: 16,
                          fontSize: '0.6rem',
                          fontWeight: 700,
                          backgroundColor: 'rgba(255,255,255,0.05)',
                          color: roleColor,
                          border: `1px solid ${roleColor}30`,
                        }}
                      />
                      {activeChannel.id === 'general' && msg.usuario.sucursal && (
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                          ({msg.usuario.sucursal.nombre})
                        </Typography>
                      )}
                    </Box>

                    {/* Chat Bubble */}
                    <Box
                      sx={{
                        maxWidth: { xs: '85%', md: '65%' },
                        p: 1.5,
                        borderRadius: 3.5,
                        borderTopRightRadius: isSelf ? 2 : 14,
                        borderTopLeftRadius: isSelf ? 14 : 2,
                        backgroundColor: isSelf ? 'rgba(2, 132, 199, 0.25)' : 'rgba(255,255,255,0.04)',
                        border: isSelf ? '1px solid rgba(2, 132, 199, 0.3)' : '1px solid rgba(255,255,255,0.05)',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                      }}
                    >
                      <Typography variant="body2" sx={{ color: 'text.primary', whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.5 }}>
                        {msg.contenido}
                      </Typography>
                    </Box>

                    {/* Timestamp */}
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, px: 0.8, fontSize: '0.65rem' }}>
                      {new Date(msg.fecha).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                    </Typography>
                  </Box>
                );
              })
            )}
            <div ref={chatEndRef} />
          </Box>

          {/* Chat Input Area */}
          <Box sx={{ p: 2, borderTop: '1px solid rgba(255,255,255,0.05)', backgroundColor: 'rgba(0,0,0,0.15)' }}>
            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <TextField
                fullWidth
                placeholder="Escribe tu mensaje aquí..."
                size="small"
                variant="outlined"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={handleKeyPress}
                autoComplete="off"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 3,
                    backgroundColor: 'rgba(0,0,0,0.2)',
                  },
                }}
              />
              <IconButton
                color="primary"
                onClick={handleSendMessage}
                disabled={!inputText.trim()}
                sx={{
                  backgroundColor: 'rgba(2, 132, 199, 0.1)',
                  '&:hover': {
                    backgroundColor: 'rgba(2, 132, 199, 0.2)',
                  },
                  borderRadius: 3,
                  p: 1.2,
                }}
              >
                <SendIcon />
              </IconButton>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
}
