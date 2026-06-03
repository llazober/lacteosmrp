import { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Box,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  IconButton,
  Divider,
  Chip,
} from '@mui/material';
import {
  TrendingUp,
  Receipt,
  Search,
  Visibility,
  Storefront,
  CalendarMonth,
  CreditCard,
  Block,
} from '@mui/icons-material';
import { apiFetch, useAuthStore } from '../store/useAuthStore';

// Utility helper to format values as USD currency with 2 decimals
const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val);
};

export default function Ventas() {
  const usuario = useAuthStore((state) => state.usuario);
  const systemTimezone = useAuthStore((state) => state.systemTimezone);

  // States for voiding sales
  const [openAnular, setOpenAnular] = useState(false);
  const [ventaAAnular, setVentaAAnular] = useState<any>(null);
  const [anulando, setAnulando] = useState(false);

  const handleOpenAnular = (venta: any) => {
    setVentaAAnular(venta);
    setOpenAnular(true);
  };

  const handleAnularSubmit = async () => {
    if (!ventaAAnular) return;
    setAnulando(true);
    try {
      await apiFetch(`/pos/venta/${ventaAAnular.id}/anular`, {
        method: 'POST',
      });
      setOpenAnular(false);
      setVentaAAnular(null);
      cargarVentas();
    } catch (e: any) {
      alert(e.message || 'Error al anular la venta.');
    } finally {
      setAnulando(false);
    }
  };

  // Filters State
  const [fechaInicio, setFechaInicio] = useState(() => {
    const d = new Date();
    // Default to the first day of the current month
    const firstDay = new Date(d.getFullYear(), d.getMonth(), 1);
    return firstDay.toISOString().split('T')[0];
  });
  const [fechaFin, setFechaFin] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [sucursalId, setSucursalId] = useState('');

  // Data State
  const [ventas, setVentas] = useState<any[]>([]);
  const [sucursales, setSucursales] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Detail Modal State
  const [selectedVenta, setSelectedVenta] = useState<any>(null);
  const [openDetail, setOpenDetail] = useState(false);

  // Roles Check
  const isHQ = usuario?.rol === 'ADMINISTRADOR' || usuario?.rol === 'SUPERVISOR';

  useEffect(() => {
    cargarSucursales();
  }, []);

  useEffect(() => {
    cargarVentas();
  }, [fechaInicio, fechaFin, sucursalId]);

  const cargarSucursales = async () => {
    if (!isHQ) return;
    try {
      const data = await apiFetch('/sucursales');
      setSucursales(data);
    } catch (e) {
      console.error('Error al cargar sucursales en Ventas:', e);
    }
  };

  const cargarVentas = async () => {
    setLoading(true);
    try {
      let query = `?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`;
      if (isHQ && sucursalId) {
        query += `&sucursalId=${sucursalId}`;
      }
      const data = await apiFetch(`/pos/ventas${query}`);
      setVentas(data);
    } catch (e) {
      console.error('Error al cargar historial de ventas:', e);
    } finally {
      setLoading(false);
    }
  };

  // Calculations for KPIs
  const ventasActivas = ventas.filter((v) => v.estado !== 'ANULADA');
  const totalVentasMonto = ventasActivas.reduce((acc, v) => acc + v.total, 0);
  const totalTickets = ventasActivas.length;
  const ticketPromedio = totalTickets > 0 ? totalVentasMonto / totalTickets : 0;

  const handleOpenDetail = (venta: any) => {
    setSelectedVenta(venta);
    setOpenDetail(true);
  };

  return (
    <Box sx={{ p: 4, height: '100%', overflowY: 'auto' }}>
      {/* Title */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: '-0.02em', background: 'linear-gradient(135deg, #0284c7 0%, #10b981 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', mb: 1 }}>
          Historial de Ventas
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Consulte y audite los registros de facturación por caja, controle ingresos y realice análisis de ticket promedio.
        </Typography>
      </Box>

      {/* Filters Panel */}
      <Paper className="glass-panel" sx={{ p: 3, mb: 4 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: isHQ ? '2fr 2fr 3fr 2fr' : '3fr 3fr 2fr' }, gap: 2, alignItems: 'center' }}>
          <Box>
            <TextField
              fullWidth
              label="Fecha de Inicio"
              type="date"
              size="small"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
            />
          </Box>
          <Box>
            <TextField
              fullWidth
              label="Fecha Final"
              type="date"
              size="small"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
            />
          </Box>
          {isHQ && (
            <Box>
              <FormControl fullWidth size="small">
                <InputLabel>Filtrar por Sucursal</InputLabel>
                <Select
                  value={sucursalId}
                  label="Filtrar por Sucursal"
                  onChange={(e) => setSucursalId(e.target.value)}
                >
                  <MenuItem value=""><em>Todas las Sucursales</em></MenuItem>
                  {sucursales.map((s) => (
                    <MenuItem key={s.id} value={s.id}>{s.nombre}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          )}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              color="primary"
              startIcon={<Search />}
              onClick={cargarVentas}
              fullWidth
              sx={{ py: 1, fontWeight: 700 }}
            >
              Filtrar
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* KPI Cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 3, mb: 4 }}>
        <Card className="glass-panel" sx={{ position: 'relative', overflow: 'hidden' }}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
                Ventas Totales (Periodo)
              </Typography>
              <TrendingUp color="primary" sx={{ fontSize: 28 }} />
            </Box>
            <Typography variant="h3" sx={{ fontWeight: 900 }}>
              {formatCurrency(totalVentasMonto)}
            </Typography>
          </CardContent>
        </Card>

        <Card className="glass-panel" sx={{ position: 'relative', overflow: 'hidden' }}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
                Total Transacciones
              </Typography>
              <Receipt color="secondary" sx={{ fontSize: 28 }} />
            </Box>
            <Typography variant="h3" sx={{ fontWeight: 900 }}>
              {totalTickets}
            </Typography>
          </CardContent>
        </Card>

        <Card className="glass-panel" sx={{ position: 'relative', overflow: 'hidden' }}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
                Ticket Promedio
              </Typography>
              <CreditCard color="success" sx={{ fontSize: 28 }} />
            </Box>
            <Typography variant="h3" sx={{ fontWeight: 900 }}>
              {formatCurrency(ticketPromedio)}
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Main Table */}
      <Paper className="glass-panel" sx={{ p: 3 }}>
        <Box sx={{ overflowX: 'auto', width: '100%' }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Sucursal</TableCell>
                <TableCell>Producto</TableCell>
                <TableCell align="right">Cantidad</TableCell>
                <TableCell align="right">Costo</TableCell>
                <TableCell>Fecha y Hora</TableCell>
                <TableCell>Método de Pago</TableCell>
                <TableCell align="center">Estado</TableCell>
                <TableCell align="right">Total</TableCell>
                <TableCell align="center">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} align="center">Cargando transacciones...</TableCell>
                </TableRow>
              ) : ventas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center">No se encontraron ventas para los filtros seleccionados.</TableCell>
                </TableRow>
              ) : (
                ventas.map((v) => (
                  <TableRow
                    key={v.id}
                    sx={{
                      opacity: v.estado === 'ANULADA' ? 0.6 : 1,
                      backgroundColor: v.estado === 'ANULADA' ? 'rgba(239, 68, 68, 0.03)' : 'inherit',
                    }}
                  >
                    <TableCell sx={{ fontWeight: 700 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Storefront sx={{ fontSize: 16, color: 'text.secondary' }} />
                        {v.sucursal.nombre}
                      </Box>
                    </TableCell>
                    <TableCell>
                      {v.detalles.map((det: any) => (
                        <div key={det.id} style={{ fontWeight: 600 }}>
                          {det.producto.descripcion}
                        </div>
                      ))}
                    </TableCell>
                    <TableCell align="right">
                      {v.detalles.map((det: any) => (
                        <div key={det.id}>
                          {det.cantidad}
                        </div>
                      ))}
                    </TableCell>
                    <TableCell align="right">
                      {v.detalles.map((det: any) => (
                        <div key={det.id}>
                          {formatCurrency(det.precioUnitario)}
                        </div>
                      ))}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CalendarMonth sx={{ fontSize: 16, color: 'text.secondary' }} />
                        {new Date(v.fecha).toLocaleString('es-CO', { timeZone: systemTimezone })}
                      </Box>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{v.metodoPago}</TableCell>
                    <TableCell align="center">
                      <Chip
                        label={v.estado === 'ANULADA' ? 'Anulada' : 'Completada'}
                        color={v.estado === 'ANULADA' ? 'error' : 'success'}
                        size="small"
                        sx={{ fontWeight: 700 }}
                      />
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800 }}>{formatCurrency(v.total)}</TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => handleOpenDetail(v)}
                        >
                          <Visibility fontSize="small" />
                        </IconButton>
                        {(usuario?.rol === 'ADMINISTRADOR' || usuario?.rol === 'SUPERVISOR' || usuario?.rol === 'GERENTE_TIENDA') && (
                          <IconButton
                            size="small"
                            color="error"
                            disabled={v.estado === 'ANULADA'}
                            onClick={() => handleOpenAnular(v)}
                            title="Anular Venta"
                          >
                            <Block fontSize="small" />
                          </IconButton>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Box>
      </Paper>

      {/* DETAIL MODAL */}
      <Dialog open={openDetail} onClose={() => { setOpenDetail(false); setSelectedVenta(null); }} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 800 }}>Detalle de Ticket - {selectedVenta?.ticketNumero}</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {selectedVenta && (
            <Box>
              {/* Header Info */}
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 2, mb: 3 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">Fecha</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {new Date(selectedVenta.fecha).toLocaleString('es-CO', { timeZone: systemTimezone })}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Sucursal</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {selectedVenta.sucursal.nombre}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Estado</Typography>
                  <Box sx={{ mt: 0.5 }}>
                    <Chip
                      label={selectedVenta.estado === 'ANULADA' ? 'Anulada' : 'Completada'}
                      color={selectedVenta.estado === 'ANULADA' ? 'error' : 'success'}
                      size="small"
                      sx={{ fontWeight: 700 }}
                    />
                  </Box>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Cajero</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {selectedVenta.cajero?.nombre || 'S/D'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Método de Pago</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {selectedVenta.metodoPago}
                  </Typography>
                </Box>
                <Box sx={{ gridColumn: { xs: 'span 1', sm: 'span 3' } }}>
                  <Typography variant="caption" color="text.secondary">Cliente</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {selectedVenta.clienteNombre} ({selectedVenta.clienteDocumento || 'S/D'})
                  </Typography>
                </Box>
              </Box>

              <Divider sx={{ my: 2 }} />

              {/* Items Table */}
              <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5, color: 'primary.main' }}>
                Artículos Vendidos
              </Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Producto</TableCell>
                    <TableCell>Lote</TableCell>
                    <TableCell align="right">Cant</TableCell>
                    <TableCell align="right">P. Unit</TableCell>
                    <TableCell align="right">Total</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {selectedVenta.detalles.map((det: any) => (
                    <TableRow key={det.id}>
                      <TableCell sx={{ fontWeight: 600 }}>{det.producto.descripcion}</TableCell>
                      <TableCell>{det.lote?.numeroLote || 'N/A'}</TableCell>
                      <TableCell align="right">{det.cantidad}</TableCell>
                      <TableCell align="right">{formatCurrency(det.precioUnitario)}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>{formatCurrency(det.total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Financial Summary */}
              <Box sx={{ mt: 3, display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'flex-end' }}>
                <Box sx={{ display: 'flex', gap: 4 }}>
                  <Typography variant="body2" color="text.secondary">Subtotal:</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, minWidth: 100, textAlign: 'right' }}>
                    {formatCurrency(selectedVenta.subtotal)}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 4 }}>
                  <Typography variant="body2" color="text.secondary">IVA (19%):</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, minWidth: 100, textAlign: 'right' }}>
                    {formatCurrency(selectedVenta.iva)}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 4 }}>
                  <Typography variant="h6" color="primary.main">Total:</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 800, minWidth: 100, textAlign: 'right' }}>
                    {formatCurrency(selectedVenta.total)}
                  </Typography>
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button variant="contained" onClick={() => { setOpenDetail(false); setSelectedVenta(null); }}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      {/* CONFIRM ANULAR DIALOG */}
      <Dialog open={openAnular} onClose={() => { if (!anulando) { setOpenAnular(false); setVentaAAnular(null); } }} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 800 }}>Confirmar Anulación</DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            ¿Está seguro de que desea anular la venta <strong>{ventaAAnular?.ticketNumero}</strong> por un total de <strong>{ventaAAnular && formatCurrency(ventaAAnular.total)}</strong>?
          </Typography>
          <Typography variant="body2" color="error" sx={{ fontWeight: 600 }}>
            Esta acción restaurará el stock de los productos vendidos a su inventario y lotes correspondientes, y registrará los movimientos de entrada. Esta operación es irreversible.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button variant="outlined" disabled={anulando} onClick={() => { setOpenAnular(false); setVentaAAnular(null); }}>
            Cancelar
          </Button>
          <Button variant="contained" color="error" disabled={anulando} onClick={handleAnularSubmit}>
            {anulando ? 'Anulando...' : 'Sí, Anular Venta'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
