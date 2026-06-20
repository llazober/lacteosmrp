import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  CircularProgress,
  Alert,
  FormControlLabel,
  Switch,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Restore,
  CheckCircle,
  Warning,
  Error as ErrorIcon,
  Assignment,
  Factory,
} from '@mui/icons-material';
import { apiFetch } from '../store/useAuthStore';

export default function PlanificacionProduccion() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [propuestas, setPropuestas] = useState<any[]>([]);
  const [useSafetyStockMin, setUseSafetyStockMin] = useState(false);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);

  // Modal para mostrar el resultado del procesamiento
  const [openResultDialog, setOpenResultDialog] = useState(false);
  const [resultadoProcesamiento, setResultadoProcesamiento] = useState<any[]>([]);

  useEffect(() => {
    cargarDatosPlanificacion();
  }, []);

  const cargarDatosPlanificacion = async (useSafetyOverride?: boolean) => {
    setLoading(true);
    setError(null);
    try {
      const checkSafety = useSafetyOverride !== undefined ? useSafetyOverride : useSafetyStockMin;
      const data = await apiFetch(
        `/produccion/planificacion/calcular${checkSafety ? '?useSafetyStockMin=true' : ''}`
      );
      setPropuestas(data);
    } catch (e: any) {
      setError(e.message || 'Error al calcular la planificación de producción.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSafetyStock = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.checked;
    setUseSafetyStockMin(val);
    cargarDatosPlanificacion(val);
  };

  const handleProcesarPlanificacion = async () => {
    if (propuestas.length === 0) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await apiFetch('/produccion/planificacion/procesar', {
        method: 'POST',
        body: JSON.stringify({ propuestas }),
      });
      setResultadoProcesamiento(result);
      setOpenResultDialog(true);
      setSuccess(`Planificación completada con éxito. Se generaron las órdenes correspondientes.`);
      setPropuestas([]);
    } catch (e: any) {
      setError(e.message || 'Error al procesar la planificación de producción.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3, height: '100%', overflowY: 'auto' }}>
      {/* Encabezado Principal */}
      <Box
        sx={{
          mb: 4,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Factory sx={{ fontSize: 36, color: 'primary.main' }} /> Planificación de la Producción
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Calcule las necesidades sugeridas a producir por cada sucursal basado en stock actual, pronóstico de demanda y deducción automática de órdenes abiertas.
          </Typography>
        </Box>
        <Button
          variant="outlined"
          onClick={() => cargarDatosPlanificacion()}
          startIcon={<Restore />}
          disabled={loading}
        >
          Refrescar Datos
        </Button>
      </Box>

      {/* Alertas */}
      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 3, borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" onClose={() => setSuccess(null)} sx={{ mb: 3, borderRadius: 2 }}>
          {success}
        </Alert>
      )}

      {/* Panel Principal */}
      <Paper className="glass-panel" sx={{ p: 3, mb: 4 }}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 3,
            flexWrap: 'wrap',
            gap: 2,
          }}
        >
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              Sugerencias de Producción Consolidadas
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Las sugerencias consideran la demanda neta, sumando el stock en tránsito e inventario de la sucursal y deduciendo el stock virtual/producción pendiente.
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
            <FormControlLabel
              control={
                <Switch
                  checked={useSafetyStockMin}
                  onChange={handleToggleSafetyStock}
                  color="secondary"
                  disabled={loading}
                />
              }
              label={
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    Forzar Mínimo de Seguridad
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    Usar stock mínimo si supera estimación
                  </Typography>
                </Box>
              }
              sx={{ mr: 0 }}
            />

            <Button
              variant="contained"
              onClick={handleProcesarPlanificacion}
              disabled={propuestas.length === 0 || loading}
              size="large"
              startIcon={<CheckCircle />}
              sx={{
                background: 'linear-gradient(135deg, #0284c7 0%, #10b981 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #025a87 0%, #0c8f63 100%)',
                },
                fontWeight: 700,
              }}
            >
              Generar Órdenes de Trabajo
            </Button>
          </Box>
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : propuestas.length === 0 ? (
          <Alert severity="success">
            Todas las sucursales cuentan con stock suficiente y cobertura garantizada según demanda. No se sugiere producción adicional.
          </Alert>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Sucursal Destino</TableCell>
                  <TableCell>Producto</TableCell>
                  <TableCell align="right">Stock Disponible</TableCell>
                  <TableCell align="right">Venta Diaria Prom.</TableCell>
                  <TableCell align="right">Stock Objetivo</TableCell>
                  <TableCell align="right">Cant. Sugerida</TableCell>
                  <TableCell>Detalle / Razón</TableCell>
                  <TableCell align="center">Riesgo</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {propuestas.map((prop) => {
                  const rowId = `${prop.sucursalId}-${prop.productoId}`;
                  const isSelected = selectedRowId === rowId;
                  return (
                    <TableRow
                      key={rowId}
                      hover
                      onClick={() => setSelectedRowId(isSelected ? null : rowId)}
                      sx={{
                        cursor: 'pointer',
                        bgcolor: isSelected ? 'rgba(59, 130, 246, 0.15)' : 'inherit',
                        '&:hover': {
                          bgcolor: isSelected ? 'rgba(59, 130, 246, 0.25) !important' : undefined,
                        },
                        transition: 'background-color 0.2s ease',
                      }}
                    >
                      <TableCell sx={{ fontWeight: 700 }}>{prop.sucursalNombre}</TableCell>
                      <TableCell>
                        <strong>{prop.productoSku}</strong> - {prop.productoNombre}
                      </TableCell>
                      <TableCell align="right">
                        {prop.stockActual} 
                        {prop.stockEnTransito > 0 && ` (+${prop.stockEnTransito} trans)`}
                        {prop.openBranchQty > 0 && ` (+${prop.openBranchQty} op)`}
                      </TableCell>
                      <TableCell align="right">{prop.promedioVentasDiarias}</TableCell>
                      <TableCell align="right">{prop.stockObjetivo}</TableCell>
                      <TableCell align="right" sx={{ color: '#10b981', fontWeight: 800 }}>
                        +{prop.cantidadSugerida}
                      </TableCell>
                      <TableCell sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>
                        {prop.detalleRazon}
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          icon={prop.alertaRiesgo === 'CRITICO' ? <ErrorIcon /> : <Warning />}
                          label={prop.alertaRiesgo}
                          color={prop.alertaRiesgo === 'CRITICO' ? 'error' : 'warning'}
                          size="small"
                          sx={{ fontWeight: 700 }}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Dialogo modal de resultados del procesamiento */}
      <Dialog
        open={openResultDialog}
        onClose={() => setOpenResultDialog(false)}
        maxWidth="md"
        fullWidth
        sx={{
          '& .MuiDialog-paper': {
            bgcolor: '#111827',
            backgroundImage: 'none',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 3,
          },
        }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 800 }}>
          <Assignment sx={{ color: '#10b981' }} /> Órdenes de Trabajo Generadas
        </DialogTitle>
        <DialogContent dividers sx={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <Typography variant="body2" sx={{ mb: 3, color: 'text.secondary' }}>
            Se ha completado la consolidación de necesidades por producto y se crearon las siguientes órdenes en la Planta Principal:
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {resultadoProcesamiento.map((res, index) => (
              <Box
                key={index}
                sx={{
                  p: 2,
                  borderRadius: 2,
                  bgcolor: res.estado === 'OK' ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.05)',
                  border: `1px solid ${
                    res.estado === 'OK' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)'
                  }`,
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, flexWrap: 'wrap' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    {res.sku} - {res.nombre}
                  </Typography>
                  <Chip
                    label={res.estado}
                    color={res.estado === 'OK' ? 'success' : 'error'}
                    size="small"
                    sx={{ fontWeight: 700 }}
                  />
                </Box>
                {res.estado === 'OK' ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    <Typography variant="body2">
                      <strong>Orden de Producción:</strong> {res.numeroOrden}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Lote Automático (Cant: 0):</strong> {res.loteNumero}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Cantidad Planificada Total:</strong> {res.totalAProducir} unidades
                    </Typography>
                  </Box>
                ) : (
                  <Typography variant="body2" color="error">
                    {res.mensaje}
                  </Typography>
                )}
              </Box>
            ))}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            variant="contained"
            onClick={() => setOpenResultDialog(false)}
            sx={{ fontWeight: 700 }}
          >
            Cerrar Resumen
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
