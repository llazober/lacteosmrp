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
  FormControl,
  Select,
  MenuItem,
} from '@mui/material';
import { Send, SmartToy, Person, Mic, MicOff } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { apiFetch, useAuthStore } from '../store/useAuthStore';

interface Mensaje {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function Asistente() {
  const usuario = useAuthStore((state) => state.usuario);
  const navigate = useNavigate();
  const userKey = usuario ? `lacteoserp_ai_history_${usuario.id}` : 'lacteoserp_ai_history_guest';

  const [historial, setHistorial] = useState<Mensaje[]>(() => {
    const saved = localStorage.getItem(userKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp),
          }));
        }
      } catch (e) {
        console.error('Error parsing AI history:', e);
      }
    }
    return [
      {
        role: 'assistant',
        content: `¡Hola **${usuario?.nombre || 'Usuario'}**! Soy **ERP AI**, tu asistente inteligente para la gestión de "Lácteos ERP". 
      
Puedo ayudarte a consultar existencias, analizar ventas, revisar mermas y verificar alertas de cadena de frío en tiempo real. 

¿En qué puedo ayudarte hoy?`,
        timestamp: new Date(),
      },
    ];
  });
  const [input, setInput] = useState('');
  const [cargando, setCargando] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [tourState, setTourState] = useState<{
    activo: boolean;
    moduloActual: string;
    emoji: string;
    indiceActual: number;
    total: number;
    siguienteSeccion: string | null;
    siguienteNombre: string | null;
  } | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const speakTimeoutRef = useRef<any>(null);

  // Voice States
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceURI, setVoiceURI] = useState<string>(() => {
    return localStorage.getItem('lacteoserp_preferred_voice') || '';
  });

  // Pre-load voices on component mount and filter Spanish ones
  useEffect(() => {
    if ('speechSynthesis' in window) {
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        const esVoices = voices.filter(v => v.lang.toLowerCase().startsWith('es'));
        setAvailableVoices(esVoices);
      };
      
      loadVoices();
      window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
      return () => {
        window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
        if (speakTimeoutRef.current) {
          clearTimeout(speakTimeoutRef.current);
        }
        window.speechSynthesis.cancel();
      };
    }
  }, []);

  const handleVoiceChange = (uri: string) => {
    setVoiceURI(uri);
    localStorage.setItem('lacteoserp_preferred_voice', uri);
    // Test the newly selected voice immediately
    if (uri && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const voices = window.speechSynthesis.getVoices();
      const selected = voices.find(v => v.voiceURI === uri);
      if (selected) {
        const utterance = new SpeechSynthesisUtterance("Hola, he cambiado a esta voz.");
        utterance.voice = selected;
        utterance.lang = selected.lang;
        window.speechSynthesis.speak(utterance);
      }
    }
  };

  // Clean and speak text out loud using Web Speech Synthesis
  const speakText = (text: string, onEndCallback?: () => void) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      if (speakTimeoutRef.current) {
        clearTimeout(speakTimeoutRef.current);
      }

      speakTimeoutRef.current = setTimeout(() => {
        // Format table lines to be read out loud naturally, skipping only the markdown separator lines
        const lines = text.split('\n');
        let currentHeaders: string[] = [];
        let inTable = false;

        const cleanLines = lines.map(line => {
          const trimmed = line.trim();
          
          if (trimmed.startsWith('|')) {
            // Check if separator
            if (trimmed.includes('---') || trimmed.includes('- | -') || trimmed.includes('-|-')) {
              return '';
            }
            
            const cols = trimmed.split('|').map(c => c.trim()).filter(Boolean);
            
            if (!inTable) {
              inTable = true;
              currentHeaders = cols;
              return ''; // Skip reading the header line itself
            } else {
              // Read data line mapped to headers
              const spokenParts: string[] = [];
              for (let i = 0; i < cols.length; i++) {
                const header = currentHeaders[i] || `Columna ${i + 1}`;
                let value = cols[i] || '';
                
                // Format dates YYYY-MM-DD naturally
                const dateRegex = /^(\d{4})-(\d{2})-(\d{2})$/;
                const match = value.match(dateRegex);
                if (match) {
                  const year = match[1];
                  const monthNum = parseInt(match[2], 10);
                  const day = parseInt(match[3], 10);
                  const months = [
                    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
                    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
                  ];
                  const monthName = months[monthNum - 1] || '';
                  value = `${day} de ${monthName} de ${year}`;
                }
                
                spokenParts.push(`${header}: ${value}`);
              }
              return spokenParts.join('. ') + '.';
            }
          } else {
            inTable = false;
            currentHeaders = [];
            
            let cleanLine = line;
            const trimmedClean = cleanLine.trim();
            if (trimmedClean.length > 0) {
              const lastChar = trimmedClean.slice(-1);
              if (!['.', ',', ';', ':', '?', '!'].includes(lastChar)) {
                cleanLine = trimmedClean + '.';
              }
            }
            return cleanLine;
          }
        });
        const textWithoutTables = cleanLines.filter(Boolean).join(' ');

        const clean = textWithoutTables
          .replace(/```[\s\S]*?```/g, '') // remove code blocks
          .replace(/\$\s*(\d+(?:,\d+)?(?:\.\d+)?)/g, '$1 dólares') // speak dollars naturally
          .replace(/[-+|#*`~&=_<>[\]{}()]/g, ' ') // remove special symbols, hashes, ampersands, dashes
          .replace(/\s+/g, ' ')           // normalize spaces
          .trim();

        if (!clean) {
          if (onEndCallback) onEndCallback();
          return;
        }

        const utterance = new SpeechSynthesisUtterance(clean);
        utterance.lang = 'es-CL';

        const voices = window.speechSynthesis.getVoices();
        let selectedVoice: SpeechSynthesisVoice | undefined;

        if (voiceURI) {
          selectedVoice = voices.find(v => v.voiceURI === voiceURI);
        }

        if (!selectedVoice) {
          const esVoices = voices.filter(v => v.lang.toLowerCase().startsWith('es'));
          const femaleKeywords = ['sabina', 'helena', 'laura', 'daria', 'paula', 'elena', 'maria', 'francisca', 'yolanda', 'google español', 'siri', 'female', 'mujer', 'zira', 'monica', 'paulina', 'ana'];
          selectedVoice = esVoices.find(v => 
            femaleKeywords.some(kw => v.name.toLowerCase().includes(kw))
          );
          if (!selectedVoice && esVoices.length > 0) {
            selectedVoice = esVoices[0];
          }
        }

        if (selectedVoice) {
          utterance.voice = selectedVoice;
          utterance.lang = selectedVoice.lang;
        }

        let callbackCalled = false;
        const triggerCallback = () => {
          if (!callbackCalled) {
            callbackCalled = true;
            if (onEndCallback) onEndCallback();
          }
        };

        utterance.onend = triggerCallback;
        utterance.onerror = triggerCallback;

        // Safety fallback timeout
        const fallbackMs = (clean.length / 10) * 1000 + 2000;
        const fallbackTimeout = setTimeout(triggerCallback, fallbackMs);

        // Clear fallback timeout if it ends normally
        const originalOnEnd = utterance.onend;
        utterance.onend = (e) => {
          clearTimeout(fallbackTimeout);
          if (originalOnEnd) originalOnEnd.call(utterance, e);
          triggerCallback();
        };

        utteranceRef.current = utterance; // Keep reference to prevent GC
        window.speechSynthesis.speak(utterance);
      }, 250);
    } else {
      if (onEndCallback) onEndCallback();
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      let mimeType = 'audio/webm';
      if (typeof MediaRecorder.isTypeSupported === 'function') {
        if (!MediaRecorder.isTypeSupported('audio/webm')) {
          mimeType = MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : '';
        }
      } else {
        mimeType = '';
      }

      const options: any = {
        audioBitsPerSecond: 16000,
      };
      if (mimeType) {
        options.mimeType = mimeType;
      }
      const recorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());

        const finalMime = mimeType || recorder.mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: finalMime });
        if (audioBlob.size > 0) {
          await enviarAudioWhisper(audioBlob);
        }
      };

      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }

      recorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Error starting audio recording:', err);
      alert('No se pudo acceder al micrófono. Por favor, asegúrate de otorgar permisos de micrófono en tu navegador.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const enviarAudioWhisper = async (blob: Blob) => {
    setCargando(true);
    setInput('Transcribiendo audio...');
    try {
      const formData = new FormData();
      const filename = blob.type.includes('mp4') ? 'audio.mp4' : 'audio.webm';
      formData.append('file', blob, filename);

      const res = await apiFetch('/ai/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (res && res.texto && res.texto.trim()) {
        setInput('');
        handleEnviar(res.texto, true);
      } else {
        setInput('');
        alert('No se detectó ninguna palabra. Intenta hablar más claro o más fuerte.');
      }
    } catch (e: any) {
      setInput('');
      console.error('Error al transcribir audio:', e);
      alert(`Error de transcripción: ${e.message || 'No se pudo conectar con el servicio Whisper.'}`);
    } finally {
      setCargando(false);
    }
  };

  const handleToggleListening = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  // Save history to localStorage when it changes
  useEffect(() => {
    if (historial.length > 0) {
      localStorage.setItem(userKey, JSON.stringify(historial));
    }
  }, [historial, userKey]);

  const handleLimpiarHistorial = () => {
    localStorage.removeItem(userKey);
    setHistorial([
      {
        role: 'assistant',
        content: `¡Hola **${usuario?.nombre || 'Usuario'}**! Soy **ERP AI**, tu asistente inteligente para la gestión de "Lácteos ERP". 
      
Puedo ayudarte a consultar existencias, analizar ventas, revisar mermas y verificar alertas de cadena de frío en tiempo real. 

¿En qué puedo ayudarte hoy?`,
        timestamp: new Date(),
      },
    ]);
  };

  // Auto-scroll to bottom on new message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [historial, cargando]);

  const handleEnviar = async (texto: string, isVoice = false) => {
    if (!texto.trim() || cargando) return;

    if (isRecording && mediaRecorderRef.current) {
      stopRecording();
    }

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
      // Handle tour state
      if (res.tour && res.tour.activo) {
        setTourState(res.tour);
      } else if (res.tour !== undefined) {
        setTourState(null);
      }
      if (res.navegacion) {
        if (isVoice) {
          speakText(res.respuesta, () => {
            setTimeout(() => {
              navigate(res.navegacion);
            }, 500);
          });
        } else {
          // Navigate immediately — explanation and navigation happen at the same time
          navigate(res.navegacion);
        }
      } else if (isVoice) {
        speakText(res.respuesta);
      }
    } catch (e: any) {
      const errorText = `Ocurrió un error: ${e.message || 'No se pudo obtener respuesta del asistente.'}`;
      const mensajeError: Mensaje = {
        role: 'assistant',
        content: `⚠️ **${errorText}**`,
        timestamp: new Date(),
      };
      setHistorial((prev) => [...prev, mensajeError]);
      if (isVoice) {
        speakText(errorText);
      }
    } finally {
      setCargando(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleEnviar(input, false);
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

  const handleIniciarTour = () => {
    handleEnviar('Inicia el tour del sistema', false);
  };

  const handleSiguienteModulo = () => {
    if (!tourState) return;
    handleEnviar(`tour:siguiente:${tourState.indiceActual}`, false);
  };

  const handleFinalizarTour = () => {
    setTourState(null);
  };

  return (
    <Box sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5 }}>
            Asistente Operativo IA
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Resuelve dudas sobre stock, ventas, alertas de temperatura o mermas conversando con el asistente de Lácteos ERP.
          </Typography>
        </Box>
        <Button
          variant="outlined"
          color="error"
          onClick={handleLimpiarHistorial}
          sx={{
            borderRadius: '10px',
            textTransform: 'none',
            fontWeight: 'bold',
            borderColor: 'rgba(239, 68, 68, 0.3)',
            backgroundColor: 'rgba(239, 68, 68, 0.05)',
            '&:hover': {
              borderColor: '#ef4444',
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
            },
          }}
        >
          Limpiar Historial
        </Button>
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
            sx={{ p: 2.5, flex: 1, display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}
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

            {/* Tour button */}
            <Box sx={{ mt: 'auto', pt: 2, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                🗺️ Tour Guiado
              </Typography>
              <Button
                fullWidth
                variant="contained"
                onClick={handleIniciarTour}
                disabled={cargando || !!tourState}
                sx={{
                  textTransform: 'none',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  borderRadius: '10px',
                  py: 1.2,
                  background: tourState ? 'rgba(99,102,241,0.2)' : 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                  '&:hover': { background: 'linear-gradient(135deg, #4f46e5 0%, #9333ea 100%)' },
                  '&.Mui-disabled': { background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.2)' },
                }}
              >
                {tourState ? `Módulo ${tourState.indiceActual + 1}/${tourState.total}` : '▶ Iniciar Tour del Sistema'}
              </Button>
            </Box>
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
              flexDirection: 'column',
              gap: 1.5,
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
              {isRecording ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 0.75, backgroundColor: 'rgba(239, 68, 68, 0.08)', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)', width: 'fit-content' }}>
                  <Box 
                    sx={{ 
                      width: 8, 
                      height: 8, 
                      borderRadius: '50%', 
                      backgroundColor: '#ef4444', 
                      animation: 'pulse-dot 1.2s infinite ease-in-out',
                      '@keyframes pulse-dot': {
                        '0%': { opacity: 0.4 },
                        '50%': { opacity: 1 },
                        '100%': { opacity: 0.4 },
                      }
                    }} 
                  />
                  <Typography variant="caption" sx={{ color: '#ef4444', fontWeight: 'bold' }}>
                    {input.trim() ? "🎙️ Transcribiendo..." : "🎙️ Escuchando... habla ahora"}
                  </Typography>
                </Box>
              ) : <div />}

              {'speechSynthesis' in window && availableVoices.length > 0 && (
                <FormControl size="small" sx={{ minWidth: 220 }}>
                  <Select
                    value={voiceURI}
                    onChange={(e) => handleVoiceChange(e.target.value)}
                    displayEmpty
                    sx={{
                      fontSize: '0.75rem',
                      height: 28,
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      borderRadius: '8px',
                      color: 'rgba(255, 255, 255, 0.7)',
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'rgba(255, 255, 255, 0.08)',
                      },
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'rgba(255, 255, 255, 0.15)',
                      },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'primary.main',
                      },
                    }}
                  >
                    <MenuItem value="">🗣️ Voz: Auto-Femenina</MenuItem>
                    {availableVoices.map((v) => (
                      <MenuItem key={v.voiceURI} value={v.voiceURI} sx={{ fontSize: '0.75rem' }}>
                        🗣️ {v.name.replace(/Microsoft |Google /g, '')}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            </Box>

            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', width: '100%' }}>
              <TextField
                fullWidth
                multiline
                maxRows={3}
                placeholder={isRecording ? "Escuchando... Habla ahora" : "Pregúntale al asistente... (ej. ¿cuánto vendió la sucursal Norte ayer?)"}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
                disabled={cargando}
                size="small"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '12px',
                    backgroundColor: isRecording ? 'rgba(239, 68, 68, 0.05)' : 'rgba(255,255,255,0.03)',
                    border: isRecording ? '1px solid rgba(239, 68, 68, 0.3)' : 'inherit',
                    transition: 'all 0.3s ease',
                  },
                }}
              />
              <IconButton
                onClick={handleToggleListening}
                disabled={cargando}
                sx={{
                  p: 1.5,
                  borderRadius: '50%',
                  backgroundColor: isRecording ? '#ef4444' : 'rgba(255,255,255,0.05)',
                  color: isRecording ? '#fff' : 'primary.main',
                  border: '1px solid',
                  borderColor: isRecording ? '#ef4444' : 'rgba(255,255,255,0.1)',
                  '&:hover': {
                    backgroundColor: isRecording ? '#dc2626' : 'rgba(255,255,255,0.1)',
                  },
                  ...(isRecording && {
                    animation: 'pulse-mic 1.5s infinite',
                    '@keyframes pulse-mic': {
                      '0%': { boxShadow: '0 0 0 0 rgba(239, 68, 68, 0.5)' },
                      '70%': { boxShadow: '0 0 0 10px rgba(239, 68, 68, 0)' },
                      '100%': { boxShadow: '0 0 0 0 rgba(239, 68, 68, 0)' }
                    }
                  })
                }}
              >
                {isRecording ? <MicOff sx={{ fontSize: '1.1rem' }} /> : <Mic sx={{ fontSize: '1.1rem' }} />}
              </IconButton>
              <IconButton
                color="primary"
                onClick={() => handleEnviar(input, false)}
                disabled={!input.trim() || cargando || isRecording}
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

            {/* Tour Navigation Panel */}
            {tourState && tourState.activo && (
              <Box
                sx={{
                  px: 2,
                  pb: 1.5,
                  pt: 0,
                  borderTop: '1px solid rgba(255,255,255,0.06)',
                  backgroundColor: 'rgba(99, 102, 241, 0.05)',
                }}
              >
                {/* Progress bar */}
                <Box sx={{ pt: 1.5, pb: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.75 }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: 'primary.light' }}>
                      🗺️ Tour — {tourState.emoji} {tourState.moduloActual}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {tourState.indiceActual + 1} / {tourState.total}
                    </Typography>
                  </Box>
                  <Box sx={{ height: 4, borderRadius: 99, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                    <Box
                      sx={{
                        height: '100%',
                        width: `${((tourState.indiceActual + 1) / tourState.total) * 100}%`,
                        background: 'linear-gradient(90deg, #6366f1, #a855f7)',
                        borderRadius: 99,
                        transition: 'width 0.4s ease',
                      }}
                    />
                  </Box>
                </Box>

                {/* Action buttons */}
                <Box sx={{ display: 'flex', gap: 1 }}>
                  {tourState.siguienteSeccion && (
                    <Button
                      variant="contained"
                      size="small"
                      onClick={handleSiguienteModulo}
                      disabled={cargando}
                      sx={{
                        flex: 1,
                        textTransform: 'none',
                        fontWeight: 700,
                        fontSize: '0.78rem',
                        borderRadius: '8px',
                        background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                        '&:hover': { background: 'linear-gradient(135deg, #4f46e5 0%, #9333ea 100%)' },
                        '&.Mui-disabled': { background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.2)' },
                      }}
                    >
                      {cargando ? '⏳ Cargando...' : `Siguiente: ${tourState.siguienteNombre} →`}
                    </Button>
                  )}
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={handleFinalizarTour}
                    sx={{
                      textTransform: 'none',
                      fontWeight: 600,
                      fontSize: '0.75rem',
                      borderRadius: '8px',
                      borderColor: 'rgba(239,68,68,0.3)',
                      color: '#ef4444',
                      '&:hover': { borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.08)' },
                    }}
                  >
                    Finalizar
                  </Button>
                </Box>
              </Box>
            )}
          </Box>
        </Paper>
      </Box>
    </Box>
  );
}
