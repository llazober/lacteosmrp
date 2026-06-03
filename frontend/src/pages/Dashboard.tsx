import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Chip,
  LinearProgress,
  Button,
  Divider,
} from '@mui/material';
import {
  TrendingUp,
  Inventory,
  AcUnit,
  ShoppingCart,
  NotificationsActive,
  CalendarToday,
  Assessment,
} from '@mui/icons-material';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { apiFetch, useAuthStore } from '../store/useAuthStore';

export default function Dashboard() {
  const usuario = useAuthStore((state) => state.usuario);
  const [metrics, setMetrics] = useState<any>(null);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
    // Refrescar cada 30 segundos
    const timer = setInterval(fetchMetrics, 30000);
    return () => clearInterval(timer);
  }, []);

  const fetchMetrics = async () => {
    try {
      const data = await apiFetch('/auth/dashboard-metrics');
      setMetrics(data);
    } catch (error) {
      console.error('Error fetching dashboard metrics', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !metrics) {
    return (
      <Box sx={{ p: 4 }}>
        <Typography variant="h5" sx={{ mb: 2 }}>Cargando dashboard...</Typography>
        <LinearProgress color="primary" />
      </Box>
    );
  }

  // Formateadores
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val);
  };

  return (
    <Box sx={{ flexGrow: 1, p: 3, overflowY: 'auto', height: '100%' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5 }}>
            Dashboard Ejecutivo
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Sucursal: <strong style={{ color: '#0284c7' }}>{usuario?.sucursalNombre}</strong> | Rol: <strong>{usuario?.rol}</strong>
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          {(usuario?.rol === 'ADMINISTRADOR' || usuario?.rol === 'SUPERVISOR') && (
            <Button
              variant="contained"
              color="primary"
              startIcon={<Assessment />}
              size="small"
              onClick={() => navigate('/consolidado')}
              sx={{ borderRadius: 2 }}
            >
              Consolidado Global
            </Button>
          )}
          <Button variant="outlined" startIcon={<CalendarToday />} size="small" onClick={fetchMetrics} sx={{ borderRadius: 2 }}>
            Actualizar
          </Button>
        </Box>
      </Box>

      {/* KPI Cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr 1fr' }, gap: 3, mb: 4 }}>
        {/* Ventas */}
        <Box>
          <Card className="glass-card">
            <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 3 }}>
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                  VENTAS DE HOY
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 800, my: 1 }}>
                  {formatCurrency(metrics.ventas.hoy)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {metrics.ventas.hoyCantidad} transacciones
                </Typography>
              </Box>
              <Box sx={{ backgroundColor: 'rgba(2, 132, 199, 0.12)', color: 'primary.main', p: 1.5, borderRadius: 3 }}>
                <TrendingUp sx={{ fontSize: 32 }} />
              </Box>
            </CardContent>
          </Card>
        </Box>

        {/* Inventario */}
        <Box>
          <Card className="glass-card">
            <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 3 }}>
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                  VALOR DE INVENTARIO
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 800, my: 1 }}>
                  {formatCurrency(metrics.inventario.valorTotal)}
                </Typography>
                <Typography variant="caption" color={metrics.inventario.productosCriticos > 0 ? 'error.main' : 'text.secondary'} sx={{ fontWeight: 600 }}>
                  {metrics.inventario.productosCriticos} productos con stock crítico
                </Typography>
              </Box>
              <Box sx={{ backgroundColor: 'rgba(16, 185, 129, 0.12)', color: 'secondary.main', p: 1.5, borderRadius: 3 }}>
                <Inventory sx={{ fontSize: 32 }} />
              </Box>
            </CardContent>
          </Card>
        </Box>

        {/* Cold Chain IoT */}
        <Box>
          <Card className="glass-card">
            <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 3 }}>
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                  CADENA DE FRÍO IoT
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 800, my: 1 }} color={metrics.frio.freezersFueraRango > 0 ? 'error.main' : 'inherit'}>
                  {metrics.frio.freezersFueraRango > 0 ? 'ANOMALÍA' : 'NORMAL'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {metrics.frio.freezersFueraRango} de {metrics.frio.totalFreezers} freezers fuera de rango
                </Typography>
              </Box>
              <Box sx={{
                backgroundColor: metrics.frio.freezersFueraRango > 0 ? 'rgba(244, 63, 94, 0.12)' : 'rgba(6, 182, 212, 0.12)',
                color: metrics.frio.freezersFueraRango > 0 ? 'error.main' : 'info.main',
                p: 1.5,
                borderRadius: 3
              }}>
                <AcUnit sx={{ fontSize: 32 }} />
              </Box>
            </CardContent>
          </Card>
        </Box>

        {/* Compras Pendientes */}
        <Box>
          <Card className="glass-card">
            <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 3 }}>
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                  COMPRAS PENDIENTES
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 800, my: 1 }}>
                  {metrics.compras.ordenesPendientes}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Órdenes por recibir/aprobar
                </Typography>
              </Box>
              <Box sx={{ backgroundColor: 'rgba(245, 158, 11, 0.12)', color: 'warning.main', p: 1.5, borderRadius: 3 }}>
                <ShoppingCart sx={{ fontSize: 32 }} />
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' }, gap: 3, mb: 3 }}>
        {/* Chart */}
        <Box>
          <Paper className="glass-panel" sx={{ p: 3, height: '400px', display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h5" sx={{ mb: 2, fontWeight: 700 }}>
              Historial de Ventas (Últimos 7 días)
            </Typography>
            <Box sx={{ width: '100%', height: '100%', flexGrow: 1 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={metrics.salesChartData}
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0284c7" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#0284c7" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" tickFormatter={(v) => `$${v / 1000}k`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#111827', borderColor: 'rgba(255,255,255,0.1)', borderRadius: 8 }}
                    formatter={(value: any) => [formatCurrency(value), 'Ventas']}
                  />
                  <Area type="monotone" dataKey="ventas" stroke="#0284c7" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
                </AreaChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Box>

        {/* Cold Chain Panel */}
        <Box>
          <Paper className="glass-panel" sx={{ p: 3, height: '400px', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <NotificationsActive color="error" sx={{ mr: 1 }} />
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                Alertas Activas ({metrics.frio.alertasActivas})
              </Typography>
            </Box>
            <Divider sx={{ mb: 2 }} />

            {metrics.frio.alertasActivas === 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexGrow: 1 }}>
                <AcUnit color="secondary" sx={{ fontSize: 60, opacity: 0.3, mb: 1 }} />
                <Typography color="text.secondary">Cadena de frío en rangos seguros.</Typography>
                <Typography variant="caption" color="text.secondary">Sin alertas de temperatura activas.</Typography>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {(metrics.frio.alertasList || []).map((alert: any) => (
                  <Box
                    key={alert.id}
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      backgroundColor: 'rgba(244, 63, 94, 0.1)',
                      borderLeft: '4px solid #f43f5e',
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="subtitle2" color="error" sx={{ fontWeight: 700 }}>
                        {alert.tipo === 'FREEZER_DESCONECTADO' ? 'Equipo Desconectado' : 'Fallo Térmico'}
                      </Typography>
                      <Chip label="CRÍTICO" color="error" size="small" sx={{ fontSize: '0.65rem', height: 18 }} />
                    </Box>
                    <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
                      {alert.mensaje}
                    </Typography>
                  </Box>
                ))}
              </Box>
            )}
          </Paper>
        </Box>
      </Box>

      {/* Lotes Próximos a Vencer */}
      <Box sx={{ mt: 3 }}>
        <Paper className="glass-panel" sx={{ p: 3 }}>
            <Typography variant="h5" sx={{ mb: 2, fontWeight: 700 }}>
              Control de Vencimiento de Lotes (Próximos a vencer)
            </Typography>
            <Box sx={{ overflowX: 'auto', width: '100%' }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>SKU</TableCell>
                    <TableCell>Producto</TableCell>
                    <TableCell>N° Lote</TableCell>
                    <TableCell>Fecha Vencimiento</TableCell>
                    <TableCell>Stock Disponible</TableCell>
                    <TableCell>Días Restantes</TableCell>
                    <TableCell>Acción Sugerida</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {metrics.lotesProxVencer.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        <Typography color="text.secondary" sx={{ py: 2 }}>No hay lotes próximos a vencer en los siguientes 7 días.</Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    metrics.lotesProxVencer.map((lote: any) => {
                      const progress = Math.max(0, Math.min(100, (lote.diasRestantes / 7) * 100));
                      const color: any = lote.diasRestantes <= 2 ? 'error' : lote.diasRestantes <= 5 ? 'warning' : 'success';

                      return (
                        <TableRow key={lote.lote}>
                          <TableCell sx={{ fontWeight: 600 }}>{lote.sku}</TableCell>
                          <TableCell>{lote.descripcion}</TableCell>
                          <TableCell><Chip label={lote.lote} size="small" variant="outlined" /></TableCell>
                          <TableCell>{new Date(lote.fechaVencimiento).toLocaleDateString('es-CO')}</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>{lote.cantidad} U</TableCell>
                          <TableCell sx={{ width: '200px' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Box sx={{ flexGrow: 1 }}>
                                <LinearProgress variant="determinate" value={progress} color={color} sx={{ borderRadius: 2, height: 6 }} />
                              </Box>
                              <Typography variant="body2" sx={{ fontWeight: 600, minWidth: 40 }} color={`${color}.main`}>
                                {lote.diasRestantes}d
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            {lote.diasRestantes <= 2 ? (
                              <Chip label="Descuento 50% / POS" color="error" size="small" />
                            ) : (
                              <Chip label="Priorizar Salida FEFO" color="warning" size="small" />
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </Box>
          </Paper>
        </Box>
      </Box>
  );
}
