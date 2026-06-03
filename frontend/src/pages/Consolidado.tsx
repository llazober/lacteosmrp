import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  LinearProgress,
  Button,
  Chip,
  Divider,
} from '@mui/material';
import {
  TrendingUp,
  Inventory,
  AcUnit,
  ShoppingCart,
  Storefront,
  ArrowBack,
  Refresh,
} from '@mui/icons-material';
import { apiFetch } from '../store/useAuthStore';

export default function Consolidado() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchConsolidado();
  }, []);

  const fetchConsolidado = async () => {
    try {
      setLoading(true);
      const res = await apiFetch('/auth/dashboard-consolidado');
      setData(res);
    } catch (error) {
      console.error('Error fetching consolidated metrics', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val);
  };

  if (loading) {
    return (
      <Box sx={{ p: 4 }}>
        <Typography variant="h5" sx={{ mb: 2 }}>Cargando consolidado global...</Typography>
        <LinearProgress color="primary" />
      </Box>
    );
  }

  // Calculate global totals across all sucursales
  const totalVentasHoy = data.reduce((acc, item) => acc + item.ventas.hoy, 0);
  const totalVentasCantidad = data.reduce((acc, item) => acc + item.ventas.hoyCantidad, 0);
  const totalValorInventario = data.reduce((acc, item) => acc + item.inventario.valorTotal, 0);
  const totalProductosCriticos = data.reduce((acc, item) => acc + item.inventario.productosCriticos, 0);
  const totalFreezersFueraRango = data.reduce((acc, item) => acc + item.frio.freezersFueraRango, 0);
  const totalComprasPendientes = data.reduce((acc, item) => acc + item.compras.ordenesPendientes, 0);

  return (
    <Box sx={{ flexGrow: 1, p: 3, overflowY: 'auto', height: '100%' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, gap: 2, flexWrap: 'wrap' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button
            variant="outlined"
            onClick={() => navigate('/')}
            startIcon={<ArrowBack />}
            size="small"
            sx={{ borderRadius: 2 }}
          >
            Volver
          </Button>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Storefront color="primary" sx={{ fontSize: '2.3rem' }} /> Vista Consolidada Global
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Consolidación de métricas financieras, existencias y cadena de frío de todas las sucursales.
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button variant="outlined" startIcon={<Refresh />} size="small" onClick={fetchConsolidado} sx={{ borderRadius: 2 }}>
            Actualizar
          </Button>
        </Box>
      </Box>

      {/* Global Totals Banner */}
      <Paper className="glass-panel" sx={{ p: 3, mb: 4, border: '1px solid rgba(2, 132, 199, 0.2)' }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'primary.main', mb: 2, textTransform: 'uppercase', tracking: 1 }}>
          Totales Consolidados de la Red
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr 1fr' }, gap: 3 }}>
          <Box>
            <Typography variant="caption" color="text.secondary">VENTAS GENERALES HOY</Typography>
            <Typography variant="h5" sx={{ fontWeight: 800, color: 'primary.light', mt: 0.5 }}>
              {formatCurrency(totalVentasHoy)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {totalVentasCantidad} transacciones totales
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">VALOR TOTAL DE INVENTARIO</Typography>
            <Typography variant="h5" sx={{ fontWeight: 800, color: 'secondary.light', mt: 0.5 }}>
              {formatCurrency(totalValorInventario)}
            </Typography>
            <Typography variant="caption" color={totalProductosCriticos > 0 ? 'error.main' : 'text.secondary'} sx={{ fontWeight: 600 }}>
              {totalProductosCriticos} alertas de stock crítico
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">SITUACIÓN CADENA DE FRÍO</Typography>
            <Typography variant="h5" sx={{ fontWeight: 800, color: totalFreezersFueraRango > 0 ? 'error.main' : 'info.light', mt: 0.5 }}>
              {totalFreezersFueraRango > 0 ? `${totalFreezersFueraRango} Anomalías` : 'Normal'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Monitoreo continuo IoT activo
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">ORDENES DE COMPRA PENDIENTES</Typography>
            <Typography variant="h5" sx={{ fontWeight: 800, color: 'warning.light', mt: 0.5 }}>
              {totalComprasPendientes} OC
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Esperando abastecimiento
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* Grid of Sucursales */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
        {data.map((item) => {
          const tieneAlertaFrio = item.frio.freezersFueraRango > 0;
          return (
            <Card className="glass-card" sx={{ height: '100%' }} key={item.sucursal.id}>
              <CardContent sx={{ p: 3 }}>
                {/* Branch Title */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 800 }}>
                      {item.sucursal.nombre}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Código: {item.sucursal.codigo} | {item.sucursal.direccion}
                    </Typography>
                  </Box>
                  <Chip
                    label="ACTIVA"
                    color="success"
                    size="small"
                    sx={{ fontWeight: 700, fontSize: '0.65rem', height: 20 }}
                  />
                </Box>

                <Divider sx={{ my: 1.5, opacity: 0.3 }} />

                {/* Branch Metrics */}
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
                  {/* Ventas */}
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <TrendingUp sx={{ color: 'primary.main', fontSize: 18 }} />
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                        Ventas de Hoy
                      </Typography>
                    </Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, pl: 3.2 }}>
                      {formatCurrency(item.ventas.hoy)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ pl: 3.2, display: 'block' }}>
                      {item.ventas.hoyCantidad} transacciones
                    </Typography>
                  </Box>

                  {/* Inventario */}
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <Inventory sx={{ color: 'secondary.main', fontSize: 18 }} />
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                        Valor Inventario
                      </Typography>
                    </Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, pl: 3.2 }}>
                      {formatCurrency(item.inventario.valorTotal)}
                    </Typography>
                    <Typography
                      variant="caption"
                      color={item.inventario.productosCriticos > 0 ? 'error.main' : 'text.secondary'}
                      sx={{ pl: 3.2, display: 'block', fontWeight: 600 }}
                    >
                      {item.inventario.productosCriticos} stock crítico
                    </Typography>
                  </Box>

                  {/* Cadena de Frío */}
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <AcUnit sx={{ color: tieneAlertaFrio ? 'error.main' : 'info.main', fontSize: 18 }} />
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                        Cadena de Frío
                      </Typography>
                    </Box>
                    <Box sx={{ pl: 3.2, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography
                        variant="subtitle1"
                        sx={{ fontWeight: 800 }}
                        color={tieneAlertaFrio ? 'error.main' : 'info.main'}
                      >
                        {tieneAlertaFrio ? 'ANOMALÍA' : 'NORMAL'}
                      </Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ pl: 3.2, display: 'block' }}>
                      {item.frio.freezersFueraRango} de {item.frio.totalFreezers} fuera de rango
                    </Typography>
                  </Box>

                  {/* Compras Pendientes */}
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <ShoppingCart sx={{ color: 'warning.main', fontSize: 18 }} />
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                        Compras
                      </Typography>
                    </Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, pl: 3.2 }}>
                      {item.compras.ordenesPendientes} Pendientes
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ pl: 3.2, display: 'block' }}>
                      Órdenes de compra activas
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          );
        })}
      </Box>
    </Box>
  );
}
