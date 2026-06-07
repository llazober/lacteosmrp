import { useState } from 'react';
import { Box, Typography, IconButton, Paper, Collapse, Button } from '@mui/material';
import { SmartToy, Close, ExpandLess, ExpandMore } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';

// Renders AI explanations as a persistent floating panel that survives page navigation.
export default function FloatingAIPanel() {
  const aiExplanation = useAuthStore((state) => state.aiExplanation);
  const setAiExplanation = useAuthStore((state) => state.setAiExplanation);
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  if (!aiExplanation || !aiExplanation.activo) return null;

  const handleClose = () => setAiExplanation(null);

  const handleNextModule = () => {
    if (!aiExplanation.siguienteSeccion) return;
    // This triggers a new AI request from Asistente — navigate there with context
    navigate('/asistente', {
      state: { tourAction: `tour:siguiente:${aiExplanation.indiceActual}` },
    });
    setAiExplanation(null);
  };

  const progressPct = ((aiExplanation.indiceActual + 1) / aiExplanation.total) * 100;

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        width: { xs: 'calc(100vw - 48px)', sm: 380 },
        zIndex: 9999,
        pointerEvents: 'auto',
      }}
    >
      <Paper
        elevation={0}
        sx={{
          borderRadius: 3,
          border: '1px solid rgba(99,102,241,0.3)',
          backgroundColor: 'rgba(15, 17, 26, 0.97)',
          backdropFilter: 'blur(20px)',
          overflow: 'hidden',
          boxShadow: '0 8px 40px rgba(99,102,241,0.25), 0 2px 12px rgba(0,0,0,0.4)',
          animation: 'slideUp 0.3s ease',
          '@keyframes slideUp': {
            from: { opacity: 0, transform: 'translateY(20px)' },
            to: { opacity: 1, transform: 'translateY(0)' },
          },
        }}
      >
        {/* Header */}
        <Box
          sx={{
            px: 2,
            py: 1.25,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            background: 'linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(168,85,247,0.1) 100%)',
            borderBottom: '1px solid rgba(99,102,241,0.15)',
            cursor: 'pointer',
          }}
          onClick={() => setCollapsed((c) => !c)}
        >
          <Box
            sx={{
              width: 30,
              height: 30,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #6366f1, #a855f7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 0 10px rgba(99,102,241,0.4)',
            }}
          >
            <SmartToy sx={{ fontSize: '1rem', color: '#fff' }} />
          </Box>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="caption" sx={{ fontWeight: 800, color: 'primary.light', display: 'block', lineHeight: 1 }}>
              🤖 Vaquita AI — Explicando
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.68rem' }}>
              {aiExplanation.emoji} {aiExplanation.moduloNombre}
              {aiExplanation.tourActivo && ` · ${aiExplanation.indiceActual + 1}/${aiExplanation.total}`}
            </Typography>
          </Box>

          <IconButton size="small" onClick={(e) => { e.stopPropagation(); setCollapsed((c) => !c); }} sx={{ color: 'text.secondary', p: 0.5 }}>
            {collapsed ? <ExpandMore fontSize="small" /> : <ExpandLess fontSize="small" />}
          </IconButton>
          <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleClose(); }} sx={{ color: 'text.secondary', p: 0.5, '&:hover': { color: '#ef4444' } }}>
            <Close fontSize="small" />
          </IconButton>
        </Box>

        {/* Tour progress bar */}
        {aiExplanation.tourActivo && (
          <Box sx={{ height: 3, backgroundColor: 'rgba(255,255,255,0.06)' }}>
            <Box
              sx={{
                height: '100%',
                width: `${progressPct}%`,
                background: 'linear-gradient(90deg, #6366f1, #a855f7)',
                transition: 'width 0.4s ease',
              }}
            />
          </Box>
        )}

        {/* Explanation content */}
        <Collapse in={!collapsed}>
          <Box
            sx={{
              px: 2,
              py: 1.5,
              maxHeight: 320,
              overflowY: 'auto',
              '&::-webkit-scrollbar': { width: 4 },
              '&::-webkit-scrollbar-track': { background: 'transparent' },
              '&::-webkit-scrollbar-thumb': { background: 'rgba(99,102,241,0.3)', borderRadius: 2 },
            }}
          >
            <Typography
              variant="body2"
              sx={{
                color: '#e2e8f0',
                lineHeight: 1.65,
                fontSize: '0.82rem',
                whiteSpace: 'pre-wrap',
              }}
            >
              {aiExplanation.mensaje}
            </Typography>
          </Box>

          {/* Tour navigation buttons */}
          {aiExplanation.tourActivo && (
            <Box
              sx={{
                px: 2,
                pb: 1.5,
                pt: 0.5,
                display: 'flex',
                gap: 1,
                borderTop: '1px solid rgba(255,255,255,0.05)',
              }}
            >
              {aiExplanation.siguienteSeccion && (
                <Button
                  variant="contained"
                  size="small"
                  onClick={handleNextModule}
                  sx={{
                    flex: 1,
                    textTransform: 'none',
                    fontWeight: 700,
                    fontSize: '0.75rem',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                    '&:hover': { background: 'linear-gradient(135deg, #4f46e5 0%, #9333ea 100%)' },
                  }}
                >
                  Siguiente: {aiExplanation.siguienteNombre} →
                </Button>
              )}
              <Button
                variant="outlined"
                size="small"
                onClick={handleClose}
                sx={{
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '0.72rem',
                  borderRadius: '8px',
                  borderColor: 'rgba(239,68,68,0.3)',
                  color: '#ef4444',
                  '&:hover': { borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.08)' },
                }}
              >
                {aiExplanation.siguienteSeccion ? 'Finalizar' : '✓ Cerrar'}
              </Button>
            </Box>
          )}
        </Collapse>
      </Paper>
    </Box>
  );
}
