import { useState } from 'react';
import {
  Paper,
  Typography,
  Box,
  TextField,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Alert,
} from '@mui/material';
import {
  Search,
  LocalShipping,
  ShoppingCart,
  SwapHoriz,
  AddCircle,
  RemoveCircle,
  History,
} from '@mui/icons-material';
import { apiFetch, useAuthStore } from '../store/useAuthStore';

export default function Trazabilidad() {
  const systemTimezone = useAuthStore((state) => state.systemTimezone);
  const [numeroLote, setNumeroLote] = useState('LOT-BOG-001');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trazabilidad, setTrazabilidad] = useState<any>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!numeroLote.trim()) return;

    setLoading(true);
    setError(null);
    setTrazabilidad(null);

    try {
      const data = await apiFetch(`/lotes/trazabilidad/${numeroLote.trim()}`);
      setTrazabilidad(data);
    } catch (e: any) {
      setError(e.message || 'Lote no encontrado o error en la consulta.');
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (tipo: string) => {
    switch (tipo) {
      case 'RECEPCION':
        return <LocalShipping sx={{ color: '#0284c7' }} />;
      case 'ENTRADA':
        return <AddCircle sx={{ color: '#10b981' }} />;
      case 'SALIDA':
        return <RemoveCircle sx={{ color: '#f43f5e' }} />;
      case 'TRANSFERENCIA':
        return <SwapHoriz sx={{ color: '#f59e0b' }} />;
      case 'VENTA':
        return <ShoppingCart sx={{ color: '#06b6d4' }} />;
      default:
        return <History />;
    }
  };

  const getTipoColor = (tipo: string) => {
    switch (tipo) {
      case 'RECEPCION': return 'info';
      case 'ENTRADA': return 'success';
      case 'SALIDA': return 'error';
      case 'TRANSFERENCIA': return 'warning';
      case 'VENTA': return 'secondary';
      default: return 'default';
    }
  };

  return (
    <Box sx={{ p: 3, height: '100%', overflowY: 'auto' }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5 }}>
          Trazabilidad y Control de Lotes
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Rastree el ciclo de vida completo de un lote: desde su recepción, almacenamiento, transferencias internas y venta final.
        </Typography>
      </Box>

      {/* Search Input */}
      <Paper className="glass-panel" sx={{ p: 3, mb: 4 }}>
        <form onSubmit={handleSearch}>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <Box sx={{ flex: 1, minWidth: '250px' }}>
              <TextField
                fullWidth
                label="Código o Número de Lote (Ej: LOT-BOG-001)"
                variant="outlined"
                value={numeroLote}
                onChange={(e) => setNumeroLote(e.target.value)}
              />
            </Box>
            <Box sx={{ width: { xs: '100%', sm: 'auto' }, minWidth: '180px' }}>
              <Button
                fullWidth
                variant="contained"
                type="submit"
                size="large"
                disabled={loading}
                startIcon={<Search />}
                sx={{ py: 1.5, fontWeight: 700 }}
              >
                {loading ? 'Rastreando...' : 'Buscar Trazabilidad'}
              </Button>
            </Box>
          </Box>
        </form>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 4, borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      {trazabilidad && (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 2fr' }, gap: 4 }}>
          {/* Left Column: Lot details card */}
          <Box>
            <Card className="glass-card" sx={{ height: 'fit-content' }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h5" sx={{ fontWeight: 800, mb: 2 }}>
                  Ficha Técnica del Lote
                </Typography>
                <Divider sx={{ mb: 2 }} />

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>N° LOTE</Typography>
                    <Chip label={trazabilidad.lote.numeroLote} color="primary" sx={{ fontWeight: 700, mt: 0.5 }} />
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">PRODUCTO</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{trazabilidad.lote.producto}</Typography>
                    <Typography variant="caption" color="text.secondary">SKU: {trazabilidad.lote.sku}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">PROVEEDOR</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{trazabilidad.lote.proveedor}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">CANTIDAD REGISTRADA</Typography>
                    <Typography variant="body2">
                      Inicial: <strong>{trazabilidad.lote.cantidadInicial}</strong> | Disponible: <strong style={{ color: '#10b981' }}>{trazabilidad.lote.cantidadActual}</strong> {trazabilidad.lote.unidadMedida}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">FECHA PRODUCCIÓN</Typography>
                    <Typography variant="body2">{new Date(trazabilidad.lote.fechaProduccion).toLocaleDateString('es-CO', { timeZone: systemTimezone })}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">FECHA VENCIMIENTO</Typography>
                    <Typography variant="body2" color="error.main" sx={{ fontWeight: 700 }}>
                      {new Date(trazabilidad.lote.fechaVencimiento).toLocaleDateString('es-CO', { timeZone: systemTimezone })}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">ESTADO CALIDAD</Typography>
                    <Typography variant="body2">
                      <Chip label={trazabilidad.lote.estado} color={trazabilidad.lote.estado === 'APROBADO' ? 'success' : 'error'} size="small" sx={{ fontWeight: 700, mt: 0.5 }} />
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Box>

          {/* Right Column: Dynamic Timeline */}
          <Box>
            <Paper className="glass-panel" sx={{ p: 4 }}>
              <Typography variant="h5" sx={{ fontWeight: 800, mb: 3 }}>
                Línea de Tiempo del Lote (Kardex Completo)
              </Typography>
              <Divider sx={{ mb: 4 }} />

              <Box sx={{ position: 'relative', pl: 4, '&::before': { content: '""', position: 'absolute', left: '16px', top: '10px', bottom: '10px', width: '2px', backgroundColor: 'rgba(255,255,255,0.08)' } }}>
                {trazabilidad.timeline.map((event: any) => (
                  <Box key={event.id} sx={{ position: 'relative', mb: 4, '&:last-child': { mb: 0 } }}>
                    {/* Circle Node */}
                    <Box
                      sx={{
                        position: 'absolute',
                        left: '-36px',
                        top: '4px',
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        backgroundColor: '#111827',
                        border: '2px solid rgba(255, 255, 255, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 2,
                      }}
                    >
                      {getIcon(event.tipo)}
                    </Box>

                    {/* Content Panel */}
                    <Box sx={{ pl: 2 }}>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center', mb: 1 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                          {event.titulo}
                        </Typography>
                        <Chip
                          label={event.tipo}
                          color={getTipoColor(event.tipo) as any}
                          size="small"
                          sx={{ fontSize: '0.65rem', height: 18, fontWeight: 700 }}
                        />
                        <Typography variant="caption" color="text.secondary">
                          {new Date(event.fecha).toLocaleString('es-CO', { timeZone: systemTimezone })}
                        </Typography>
                      </Box>

                      <Typography variant="subtitle2" color="primary.light" sx={{ mb: 1, fontWeight: 600 }}>
                        Ubicación/Sucursal: {event.subtitulo}
                      </Typography>

                      <Typography variant="body2" color="text.secondary">
                        {event.descripcion}
                      </Typography>

                      {event.temperatura && (
                        <Box sx={{ mt: 1, p: 1, borderRadius: 1.5, backgroundColor: 'rgba(6, 182, 212, 0.08)', width: 'fit-content', border: '1px solid rgba(6, 182, 212, 0.15)' }}>
                          <Typography variant="caption" color="info.main" sx={{ fontWeight: 600 }}>
                            Monitoreo de Frío requerido en Recepción: {event.temperatura}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </Box>
                ))}
              </Box>
            </Paper>
          </Box>
        </Box>
      )}
    </Box>
  );
}
