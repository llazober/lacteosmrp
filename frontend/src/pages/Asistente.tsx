import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  IconButton,
  Button,
  Avatar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
} from '@mui/material';
import { Send, SmartToy, Person } from '@mui/icons-material';
import { apiFetch, useAuthStore } from '../store/useAuthStore';

interface Mensaje {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function Asistente() {
  const usuario = useAuthStore((state) => state.usuario);
  const [historial, setHistorial] = useState<Mensaje[]>([
    {
      role: 'assistant',
      content: `¡Hola **${usuario?.nombre || 'Usuario'}**! Soy **ERP AI**, tu asistente inteligente para la gestión de "Lácteos ERP". 
      
Puedo ayudarte a consultar existencias, analizar ventas, revisar mermas y verificar alertas de cadena de frío en tiempo real. 

¿En qué puedo ayudarte hoy?`,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [cargando, setCargando] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [historial, cargando]);

  const handleEnviar = async (texto: string) => {
    if (!texto.trim() || cargando) return;

    const mensajeUsuario: Mensaje = {
      role: 'user',
      content: texto,
      timestamp: new Date(),
    };

    setHistorial((prev) => [...prev, mensajeUsuario]);
    setInput('');
    setCargando(true);

    try {
      // Prepare chat history for API (excluding system or formatting timestamps)
      const formattedHistory = historial.concat(mensajeUsuario).map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      const res = await apiFetch('/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ historial: formattedHistory }),
      });

      const mensajeAsistente: Mensaje = {
        role: 'assistant',
        content: res.respuesta,
        timestamp: new Date(),
      };

      setHistorial((prev) => [...prev, mensajeAsistente]);
    } catch (e: any) {
      const mensajeError: Mensaje = {
        role: 'assistant',
        content: `⚠️ **Ocurrió un error:** ${e.message || 'No se pudo obtener respuesta del asistente. Por favor, intente nuevamente.'}`,
        timestamp: new Date(),
      };
      setHistorial((prev) => [...prev, mensajeError]);
    } finally {
      setCargando(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleEnviar(input);
    }
  };

  // --- MARKDOWN RENDER SYSTEM ---

  const parseInlineMarkdown = (text: string) => {
    const regex = /(\*\*.*?\*\*|`.*?`)/g;
    const splits = text.split(regex);

    return splits.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index}>{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code
            key={index}
            style={{
              backgroundColor: 'rgba(0,0,0,0.3)',
              padding: '2px 6px',
              borderRadius: '4px',
              fontFamily: 'monospace',
              color: '#fcd34d',
            }}
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });
  };

  const renderTable = (headers: string[], rows: string[][], key: any) => {
    return (
      <TableContainer
        component={Paper}
        key={key}
        sx={{
          my: 2,
          backgroundColor: 'rgba(0,0,0,0.2)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '8px',
          overflow: 'hidden',
          maxWidth: '100%',
        }}
      >
        <Table size="small">
          <TableHead sx={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
            <TableRow>
              {headers.map((h, idx) => (
                <TableCell key={idx} sx={{ fontWeight: 'bold', color: 'primary.main', py: 1 }}>
                  {h}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row, rowIdx) => (
              <TableRow key={rowIdx} sx={{ '&:hover': { backgroundColor: 'rgba(255,255,255,0.02)' } }}>
                {row.map((cell, cellIdx) => (
                  <TableCell key={cellIdx} sx={{ py: 0.75, color: '#e5e7eb' }}>
                    {cell}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  const formatMessageContent = (content: string) => {
    const lines = content.split('\n');
    const result: React.ReactNode[] = [];

    let inTable = false;
    let tableRows: string[][] = [];
    let tableHeaders: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Table Row Detection
      if (line.startsWith('|') && line.endsWith('|')) {
        if (line.includes('---') || line.includes(':::')) {
          continue; // skip alignment lines
        }
        const cells = line
          .split('|')
          .map((c) => c.trim())
          .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);

        if (!inTable) {
          inTable = true;
          tableHeaders = cells;
          tableRows = [];
        } else {
          tableRows.push(cells);
        }
        continue;
      }

      // If table was active and the table ended
      if (inTable && (!line.startsWith('|') || !line.endsWith('|'))) {
        inTable = false;
        result.push(renderTable(tableHeaders, tableRows, `table-${i}`));
      }

      if (line === '') {
        result.push(<Box key={`empty-${i}`} sx={{ height: '8px' }} />);
        continue;
      }

      // Code Block Detection
      if (line.startsWith('```')) {
        let codeContent = '';
        i++;
        while (i < lines.length && !lines[i].trim().startsWith('```')) {
          codeContent += lines[i] + '\n';
          i++;
        }
        result.push(
          <Paper
            key={`code-${i}`}
            sx={{
              p: 2,
              fontFamily: 'monospace',
              fontSize: '0.85rem',
              backgroundColor: 'rgba(0,0,0,0.4)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: '#34d399',
              overflowX: 'auto',
              my: 1.5,
              borderRadius: '8px',
            }}
          >
            <pre style={{ margin: 0 }}>{codeContent}</pre>
          </Paper>,
        );
        continue;
      }

      // List Items (- or *)
      if (line.startsWith('- ') || line.startsWith('* ')) {
        result.push(
          <Box key={`list-${i}`} sx={{ display: 'flex', alignItems: 'flex-start', ml: 2, my: 0.5 }}>
            <Box
              sx={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: 'primary.main',
                mt: 1,
                mr: 1.5,
                flexShrink: 0,
              }}
            />
            <Typography variant="body2" sx={{ lineHeight: 1.6, color: '#e5e7eb' }}>
              {parseInlineMarkdown(line.substring(2))}
            </Typography>
          </Box>,
        );
      }
      // Ordered List Items (e.g. 1.)
      else if (/^\d+\.\s/.test(line)) {
        const match = line.match(/^(\d+)\.\s(.*)/);
        const num = match ? match[1] : '1';
        const text = match ? match[2] : line;
        result.push(
          <Box key={`olist-${i}`} sx={{ display: 'flex', alignItems: 'flex-start', ml: 2, my: 0.5 }}>
            <Typography
              variant="body2"
              sx={{ fontWeight: 'bold', color: 'primary.main', mr: 1.5, flexShrink: 0 }}
            >
              {num}.
            </Typography>
            <Typography variant="body2" sx={{ lineHeight: 1.6, color: '#e5e7eb' }}>
              {parseInlineMarkdown(text)}
            </Typography>
          </Box>,
        );
      }
      // Plain text line
      else {
        result.push(
          <Typography key={`text-${i}`} variant="body2" sx={{ my: 0.5, lineHeight: 1.6, color: '#e5e7eb' }}>
            {parseInlineMarkdown(line)}
          </Typography>,
        );
      }
    }

    if (inTable) {
      result.push(renderTable(tableHeaders, tableRows, 'table-end'));
    }

    return result;
  };

  const sugerencias = [
    { texto: '¿Qué productos están con stock crítico hoy?', titulo: 'Stock Crítico' },
    { texto: 'Resumen de ventas de la última semana', titulo: 'Resumen de Ventas' },
    { texto: '¿Hay alertas activas en la cadena de frío?', titulo: 'Cadena de Frío' },
    { texto: 'Listar las mermas registradas recientemente', titulo: 'Mermas y Pérdidas' },
  ];

  return (
    <Box sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Header */}
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5 }}>
          Asistente Operativo IA
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Resuelve dudas sobre stock, ventas, alertas de temperatura o mermas conversando con el asistente de Lácteos ERP.
        </Typography>
      </Box>

      {/* Main Grid */}
      <Box sx={{ display: 'flex', flex: 1, gap: 3, height: 'calc(100vh - 200px)', overflow: 'hidden' }}>
        {/* Left Suggestions Pane */}
        <Box
          sx={{
            width: '260px',
            display: { xs: 'none', md: 'flex' },
            flexDirection: 'column',
            gap: 2,
          }}
        >
          <Paper
            className="glass-panel"
            sx={{ p: 2.5, flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'primary.main', mb: 1 }}>
              💡 Consultas Sugeridas
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1 }}>
              Haz clic en cualquiera de estas sugerencias para consultar la información al instante:
            </Typography>
            {sugerencias.map((sug, idx) => (
              <Button
                key={idx}
                variant="outlined"
                color="inherit"
                onClick={() => handleEnviar(sug.texto)}
                disabled={cargando}
                sx={{
                  justifyContent: 'flex-start',
                  textAlign: 'left',
                  textTransform: 'none',
                  fontSize: '0.8rem',
                  py: 1.25,
                  px: 2,
                  borderColor: 'rgba(255,255,255,0.08)',
                  backgroundColor: 'rgba(255,255,255,0.01)',
                  borderRadius: '10px',
                  '&:hover': {
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    borderColor: 'primary.main',
                  },
                }}
              >
                {sug.titulo}
              </Button>
            ))}
          </Paper>
        </Box>

        {/* Chat window */}
        <Paper
          className="glass-panel"
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '16px',
            backgroundColor: 'rgba(15, 17, 26, 0.4)',
          }}
        >
          {/* Chat bubbles area */}
          <Box
            sx={{
              flex: 1,
              p: 3,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 2.5,
            }}
          >
            {historial.map((msg, index) => {
              const isUser = msg.role === 'user';
              return (
                <Box
                  key={index}
                  sx={{
                    display: 'flex',
                    alignSelf: isUser ? 'flex-end' : 'flex-start',
                    maxWidth: isUser ? '80%' : '90%',
                    gap: 1.5,
                  }}
                >
                  {!isUser && (
                    <Avatar
                      sx={{
                        background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                        width: 36,
                        height: 36,
                        boxShadow: '0 0 10px rgba(168, 85, 247, 0.4)',
                      }}
                    >
                      <SmartToy sx={{ fontSize: '1.2rem', color: '#fff' }} />
                    </Avatar>
                  )}

                  <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                    <Paper
                      sx={{
                        p: 2,
                        borderRadius: isUser ? '16px 16px 0px 16px' : '0px 16px 16px 16px',
                        backgroundColor: isUser ? 'primary.main' : 'rgba(255,255,255,0.04)',
                        border: isUser ? 'none' : '1px solid rgba(255,255,255,0.08)',
                        boxShadow: isUser ? '0 4px 15px rgba(99, 102, 241, 0.25)' : 'none',
                      }}
                    >
                      {formatMessageContent(msg.content)}
                    </Paper>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ mt: 0.5, px: 0.5, alignSelf: isUser ? 'flex-end' : 'flex-start' }}
                    >
                      {msg.timestamp.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                    </Typography>
                  </Box>

                  {isUser && (
                    <Avatar
                      sx={{
                        backgroundColor: '#6b7280',
                        width: 36,
                        height: 36,
                      }}
                    >
                      <Person sx={{ fontSize: '1.2rem', color: '#fff' }} />
                    </Avatar>
                  )}
                </Box>
              );
            })}

            {cargando && (
              <Box sx={{ display: 'flex', alignSelf: 'flex-start', gap: 1.5 }}>
                <Avatar
                  sx={{
                    background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                    width: 36,
                    height: 36,
                    animation: 'pulse 1.5s infinite ease-in-out',
                  }}
                >
                  <SmartToy sx={{ fontSize: '1.2rem', color: '#fff' }} />
                </Avatar>
                <Paper
                  sx={{
                    p: 2.5,
                    borderRadius: '0px 16px 16px 16px',
                    backgroundColor: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                  }}
                >
                  <CircularProgress size={16} color="primary" />
                  <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                    Consultando base de datos y consolidando métricas...
                  </Typography>
                </Paper>
              </Box>
            )}

            <div ref={scrollRef} />
          </Box>

          {/* Chat input form */}
          <Box
            sx={{
              p: 2,
              borderTop: '1px solid rgba(255,255,255,0.08)',
              backgroundColor: 'rgba(0, 0, 0, 0.2)',
              display: 'flex',
              gap: 1.5,
              alignItems: 'center',
            }}
          >
            <TextField
              fullWidth
              multiline
              maxRows={3}
              placeholder="Pregúntale al asistente... (ej. ¿cuánto vendió la sucursal Norte ayer?)"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              disabled={cargando}
              size="small"
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '12px',
                  backgroundColor: 'rgba(255,255,255,0.03)',
                },
              }}
            />
            <IconButton
              color="primary"
              onClick={() => handleEnviar(input)}
              disabled={!input.trim() || cargando}
              sx={{
                p: 1.5,
                background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                color: '#fff',
                '&:hover': {
                  background: 'linear-gradient(135deg, #4f46e5 0%, #9333ea 100%)',
                },
                '&.Mui-disabled': {
                  background: 'rgba(255,255,255,0.05)',
                  color: 'rgba(255,255,255,0.3)',
                },
              }}
            >
              <Send sx={{ fontSize: '1.1rem' }} />
            </IconButton>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
}
