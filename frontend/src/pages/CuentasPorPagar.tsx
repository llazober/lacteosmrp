import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  Chip,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  IconButton,
  Tooltip,
  LinearProgress,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import {
  Add,
  ReceiptLong,
  Paid,
  Warning,
  AccountBalance,
  Delete,
  Visibility,
  Info,
} from '@mui/icons-material';
import { apiFetch } from '../store/useAuthStore';

export default function CuentasPorPagar() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(() => {
    const tabParam = new URLSearchParams(window.location.search).get('tab');
    if (tabParam) {
      const tabMap: Record<string, number> = {
        facturas: 0,
        pagos: 1,
      };
      if (tabMap[tabParam] !== undefined) {
        return tabMap[tabParam];
      }
    }
    return 0;
  });

  const [selectedRowId, setSelectedRowId] = useState<string | number | null>(null);

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam) {
      const tabMap: Record<string, number> = {
        facturas: 0,
        pagos: 1,
      };
      if (tabMap[tabParam] !== undefined && tabMap[tabParam] !== activeTab) {
        setActiveTab(tabMap[tabParam]);
        setSelectedRowId(null);
      }
    }
  }, [searchParams]);

  const handleTabChange = (val: number) => {
    setActiveTab(val);
    setSelectedRowId(null);
    const tabNames = ['facturas', 'pagos'];
    setSearchParams({ tab: tabNames[val] });
  };
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val);
  };

  // Data states
  const [facturas, setFacturas] = useState<any[]>([]);
  const [proveedores, setProveedores] = useState<any[]>([]);
  const [ordenesCompra, setOrdenesCompra] = useState<any[]>([]);
  const [productos, setProductos] = useState<any[]>([]);

  // Dialog states
  const [openCrearFactura, setOpenCrearFactura] = useState(false);
  const [openVerDetalles, setOpenVerDetalles] = useState(false);
  const [openRegistrarPago, setOpenRegistrarPago] = useState(false);
  const [selectedFactura, setSelectedFactura] = useState<any>(null);

  // Form states
  const [facturaForm, setFacturaForm] = useState({
    numeroFactura: '',
    proveedorId: '',
    ordenCompraId: '',
    fechaEmision: new Date().toISOString().split('T')[0],
    subtotal: 0,
    iva: 0,
    total: 0,
    observaciones: '',
  });

  const [detallesForm, setDetallesForm] = useState<any[]>([]);

  const [pagoForm, setPagoForm] = useState({
    monto: '',
    fechaPago: new Date().toISOString().split('T')[0],
    metodoPago: 'TRANSFERENCIA',
    referencia: '',
    chequeNumero: '',
    chequeBanco: '',
    chequeVence: '',
  });

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const [facts, provs, ocs, prods] = await Promise.all([
        apiFetch('/finanzas/facturas'),
        apiFetch('/proveedores'),
        apiFetch('/compras'),
        apiFetch('/productos'),
      ]);
      setFacturas(facts);
      setProveedores(provs.filter((p: any) => p.estado === 'ACTIVO'));
      setOrdenesCompra(ocs);
      setProductos(prods);
    } catch (e: any) {
      setErrorMsg('Error al cargar datos financieros: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  // Helper calculation for new invoice totals
  useEffect(() => {
    const sub = detallesForm.reduce((acc, curr) => acc + curr.cantidad * curr.costoUnitario, 0);
    const ivaCalc = Math.round(sub * 0.19);
    setFacturaForm((prev) => ({
      ...prev,
      subtotal: sub,
      iva: ivaCalc,
      total: sub + ivaCalc,
    }));
  }, [detallesForm]);

  // If a Purchase Order is selected, auto-fill supplier and items
  const handleSelectOrdenCompra = (ocId: string) => {
    const oc = ordenesCompra.find((o) => o.id === ocId);
    if (!oc) return;

    setFacturaForm((prev) => ({
      ...prev,
      ordenCompraId: ocId,
      proveedorId: oc.proveedorId,
    }));

    const mappedDetails = oc.detalles.map((d: any) => ({
      productoId: d.productoId,
      nombre: d.producto?.nombre || 'Producto',
      cantidad: d.cantidad,
      costoUnitario: d.costoUnitario,
    }));
    setDetallesForm(mappedDetails);
  };

  const handleAddDetalleRow = () => {
    setDetallesForm((prev) => [
      ...prev,
      { productoId: '', nombre: '', cantidad: 1, costoUnitario: 0 },
    ]);
  };

  const handleRemoveDetalleRow = (index: number) => {
    setDetallesForm((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDetalleChange = (index: number, field: string, val: any) => {
    setDetallesForm((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        if (field === 'productoId') {
          const prod = productos.find((p) => p.id === val);
          return {
            ...item,
            productoId: val,
            nombre: prod ? prod.nombre : '',
            costoUnitario: prod ? prod.costo || 0 : 0,
          };
        }
        return {
          ...item,
          [field]: val,
        };
      })
    );
  };

  const handleCrearFacturaSubmit = async () => {
    try {
      setErrorMsg(null);
      if (!facturaForm.numeroFactura.trim() || !facturaForm.proveedorId || detallesForm.length === 0) {
        throw new Error('El número de factura, proveedor y al menos un detalle son obligatorios.');
      }

      await apiFetch('/finanzas/facturas', {
        method: 'POST',
        body: JSON.stringify({
          ...facturaForm,
          detalles: detallesForm.map((d) => ({
            productoId: d.productoId,
            cantidad: Number(d.cantidad),
            costoUnitario: Number(d.costoUnitario),
          })),
        }),
      });

      setSuccessMsg('Factura registrada con éxito.');
      setOpenCrearFactura(false);
      cargarDatos();
    } catch (e: any) {
      setErrorMsg(e.message);
    }
  };

  const handleRegistrarPagoSubmit = async () => {
    try {
      setErrorMsg(null);
      if (!pagoForm.monto || Number(pagoForm.monto) <= 0) {
        throw new Error('El monto del pago debe ser mayor a cero.');
      }

      await apiFetch('/finanzas/pagos', {
        method: 'POST',
        body: JSON.stringify({
          facturaCompraId: selectedFactura.id,
          monto: Number(pagoForm.monto),
          fechaPago: pagoForm.fechaPago,
          metodoPago: pagoForm.metodoPago,
          referencia: pagoForm.referencia,
          chequeNumero: pagoForm.chequeNumero,
          chequeBanco: pagoForm.chequeBanco,
          chequeVence: pagoForm.chequeVence || null,
        }),
      });

      setSuccessMsg('Pago registrado con éxito.');
      setOpenRegistrarPago(false);
      setSelectedFactura(null);
      cargarDatos();
    } catch (e: any) {
      setErrorMsg(e.message);
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Typography variant="h5">Cargando cuentas por pagar...</Typography>
        <LinearProgress color="primary" />
      </Box>
    );
  }

  // KPIs
  const totalCuentasPorPagar = facturas
    .filter((f) => f.estado !== 'PAGADA')
    .reduce((sum, f) => {
      const pagado = f.pagos.reduce((s: number, p: any) => s + p.monto, 0);
      return sum + (f.total - pagado);
    }, 0);

  const totalVencido = facturas
    .filter((f) => f.estado !== 'PAGADA' && new Date(f.fechaVencimiento) < new Date())
    .reduce((sum, f) => {
      const pagado = f.pagos.reduce((s: number, p: any) => s + p.monto, 0);
      return sum + (f.total - pagado);
    }, 0);

  const totalPagadoHistorico = facturas.reduce((sum, f) => {
    return sum + f.pagos.reduce((s: number, p: any) => s + p.monto, 0);
  }, 0);

  return (
    <Box sx={{ p: 3, height: '100%', overflowY: 'auto' }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5 }}>
            Cuentas por Pagar (Ciclo de Pago)
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Administre la conciliación de facturas de proveedores, controle la antigüedad de su deuda y registre transferencias, cheques y depósitos.
          </Typography>
        </Box>
        <Button
          variant="contained"
          color="primary"
          startIcon={<Add />}
          onClick={() => {
            setFacturaForm({
              numeroFactura: '',
              proveedorId: '',
              ordenCompraId: '',
              fechaEmision: new Date().toISOString().split('T')[0],
              subtotal: 0,
              iva: 0,
              total: 0,
              observaciones: '',
            });
            setDetallesForm([]);
            setOpenCrearFactura(true);
          }}
        >
          Registrar Factura
        </Button>
      </Box>

      {errorMsg && (
        <Alert severity="error" onClose={() => setErrorMsg(null)} sx={{ mb: 3, borderRadius: 2 }}>
          {errorMsg}
        </Alert>
      )}

      {successMsg && (
        <Alert severity="success" onClose={() => setSuccessMsg(null)} sx={{ mb: 3, borderRadius: 2 }}>
          {successMsg}
        </Alert>
      )}

      {/* Tarjetas KPI */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 3, mb: 4 }}>
        <Paper className="glass-panel" sx={{ p: 3, background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.15) 0%, rgba(2, 132, 199, 0.05) 100%)', border: '1px solid rgba(2, 132, 199, 0.2)' }}>
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
            DEUDA TOTAL PENDIENTE
          </Typography>
          <Typography variant="h3" sx={{ fontWeight: 900, mt: 1, color: 'info.light' }}>
            {formatCurrency(totalCuentasPorPagar)}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            Facturas pendientes o pagadas parcialmente
          </Typography>
        </Paper>

        <Paper className="glass-panel" sx={{ p: 3, background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(239, 68, 68, 0.05) 100%)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
            DEUDA VENCIDA
          </Typography>
          <Typography variant="h3" sx={{ fontWeight: 900, mt: 1, color: 'error.light' }}>
            {formatCurrency(totalVencido)}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            Requiere atención inmediata (fecha de vencimiento superada)
          </Typography>
        </Paper>

        <Paper className="glass-panel" sx={{ p: 3, background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(16, 185, 129, 0.05) 100%)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
            PAGOS REALIZADOS (HISTÓRICO)
          </Typography>
          <Typography variant="h3" sx={{ fontWeight: 900, mt: 1, color: 'success.light' }}>
            {formatCurrency(totalPagadoHistorico)}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            Total abonado a proveedores
          </Typography>
        </Paper>
      </Box>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onChange={(_, val) => handleTabChange(val)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}
      >
        <Tab label="Facturas por Pagar" icon={<ReceiptLong />} iconPosition="start" />
        <Tab label="Historial de Pagos" icon={<Paid />} iconPosition="start" />
      </Tabs>

      {activeTab === 0 && (
        <Paper className="glass-panel" sx={{ p: 3 }}>
          <Box sx={{ overflowX: 'auto', width: '100%' }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>N° Factura</TableCell>
                  <TableCell>Proveedor</TableCell>
                  <TableCell>OC Asociada</TableCell>
                  <TableCell>Emisión</TableCell>
                  <TableCell>Vencimiento</TableCell>
                  <TableCell>Total Factura</TableCell>
                  <TableCell>Saldo Pendiente</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell align="right">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {facturas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center">
                      No se encontraron facturas registradas.
                    </TableCell>
                  </TableRow>
                ) : (
                  facturas.map((f) => {
                    const pagado = f.pagos.reduce((sum: number, p: any) => sum + p.monto, 0);
                    const saldo = f.total - pagado;
                    const esVencida = new Date(f.fechaVencimiento) < new Date() && f.estado !== 'PAGADA';
                    const isSelected = selectedRowId === f.id;

                    return (
                      <TableRow
                        key={f.id}
                        hover
                        onClick={() => setSelectedRowId(isSelected ? null : f.id)}
                        sx={{
                          cursor: 'pointer',
                          bgcolor: isSelected
                            ? 'rgba(59, 130, 246, 0.15)'
                            : esVencida
                            ? 'rgba(239, 68, 68, 0.03)'
                            : 'transparent',
                          '&:hover': {
                            bgcolor: isSelected ? 'rgba(59, 130, 246, 0.25) !important' : undefined,
                          },
                          transition: 'background-color 0.2s ease',
                        }}
                      >
                        <TableCell sx={{ fontWeight: 700 }}>{f.numeroFactura}</TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {f.proveedor?.nombre}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Rut/Código: {f.proveedor?.codigo}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {f.ordenCompra ? (
                            <Chip label={f.ordenCompra.numeroOrden} size="small" variant="outlined" color="primary" />
                          ) : (
                            <Typography variant="caption" color="text.secondary">Directa</Typography>
                          )}
                        </TableCell>
                        <TableCell>{new Date(f.fechaEmision).toLocaleDateString('es-CL')}</TableCell>
                        <TableCell>
                          <Typography variant="body2" color={esVencida ? 'error.main' : 'text.primary'} sx={{ fontWeight: esVencida ? 700 : 500, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            {new Date(f.fechaVencimiento).toLocaleDateString('es-CL')}
                            {esVencida && <Warning color="error" sx={{ fontSize: 16 }} />}
                          </Typography>
                        </TableCell>
                        <TableCell>{formatCurrency(f.total)}</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: saldo > 0 ? 'warning.main' : 'text.secondary' }}>
                          {formatCurrency(saldo)}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={f.estado}
                            size="small"
                            color={
                              f.estado === 'PAGADA'
                                ? 'success'
                                : f.estado === 'PAGADA_PARCIAL'
                                ? 'warning'
                                : 'default'
                            }
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                            <Tooltip title="Ver detalles y auditoría">
                              <IconButton
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedFactura(f);
                                  setOpenVerDetalles(true);
                                }}
                              >
                                <Visibility />
                              </IconButton>
                            </Tooltip>
                            {f.estado !== 'PAGADA' && (
                              <Button
                                variant="contained"
                                color="success"
                                size="small"
                                startIcon={<Paid />}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedFactura(f);
                                  setPagoForm({
                                    monto: String(saldo),
                                    fechaPago: new Date().toISOString().split('T')[0],
                                    metodoPago: 'TRANSFERENCIA',
                                    referencia: '',
                                    chequeNumero: '',
                                    chequeBanco: '',
                                    chequeVence: '',
                                  });
                                  setOpenRegistrarPago(true);
                                }}
                              >
                                Pagar
                              </Button>
                            )}
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </Box>
        </Paper>
      )}

      {activeTab === 1 && (
        <Paper className="glass-panel" sx={{ p: 3 }}>
          <Box sx={{ overflowX: 'auto', width: '100%' }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Fecha Pago</TableCell>
                  <TableCell>Factura N°</TableCell>
                  <TableCell>Proveedor</TableCell>
                  <TableCell>Método de Pago</TableCell>
                  <TableCell>Referencia / Detalle Cuenta</TableCell>
                  <TableCell>Monto Pagado</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {facturas.flatMap((f) => f.pagos || []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      No se han registrado pagos en el sistema.
                    </TableCell>
                  </TableRow>
                ) : (
                      facturas
                        .flatMap((f) => (f.pagos || []).map((p: any) => ({ ...p, factura: f })))
                        .sort((a, b) => new Date(b.fechaPago).getTime() - new Date(a.fechaPago).getTime())
                        .map((p) => {
                          const isSelected = selectedRowId === p.id;
                          return (
                            <TableRow
                              key={p.id}
                              hover
                              onClick={() => setSelectedRowId(isSelected ? null : p.id)}
                              sx={{
                                cursor: 'pointer',
                                bgcolor: isSelected ? 'rgba(59, 130, 246, 0.15)' : 'inherit',
                                '&:hover': {
                                  bgcolor: isSelected ? 'rgba(59, 130, 246, 0.25) !important' : undefined,
                                },
                                transition: 'background-color 0.2s ease',
                              }}
                            >
                              <TableCell>{new Date(p.fechaPago).toLocaleDateString('es-CL')}</TableCell>
                              <TableCell sx={{ fontWeight: 700 }}>{p.factura?.numeroFactura}</TableCell>
                              <TableCell>{p.factura?.proveedor?.nombre}</TableCell>
                              <TableCell>
                                <Chip label={p.metodoPago} size="small" color="primary" variant="outlined" />
                              </TableCell>
                              <TableCell>
                                {p.metodoPago === 'CHEQUE' && (
                                  <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
                                    Cheque N° {p.chequeNumero} - Banco: {p.chequeBanco}
                                  </Typography>
                                )}
                                {(p.metodoPago === 'TRANSFERENCIA' || p.metodoPago === 'DEPOSITO') && (
                                  <Typography variant="body2" sx={{ fontSize: '0.85rem', color: 'info.main' }}>
                                    {p.transfeCuenta || p.referencia || 'Transferencia'}
                                  </Typography>
                                )}
                                {p.metodoPago === 'EFECTIVO' && (
                                  <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
                                    Efectivo en Caja
                                  </Typography>
                                )}
                                {p.referencia && (
                                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                    Ref: {p.referencia}
                                  </Typography>
                                )}
                              </TableCell>
                              <TableCell sx={{ fontWeight: 700, color: 'success.main' }}>
                                {formatCurrency(p.monto)}
                              </TableCell>
                            </TableRow>
                          );
                        })
                )}
              </TableBody>
            </Table>
          </Box>
        </Paper>
      )}

      {/* DIALOG: REGISTRAR FACTURA DE COMPRA */}
      <Dialog open={openCrearFactura} onClose={() => setOpenCrearFactura(false)} fullWidth maxWidth="md">
        <DialogTitle sx={{ fontWeight: 800 }}>Registrar Factura de Proveedor</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 2 }}>
          
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Asociar Orden de Compra (Opcional)</InputLabel>
              <Select
                value={facturaForm.ordenCompraId}
                label="Asociar Orden de Compra (Opcional)"
                onChange={(e) => handleSelectOrdenCompra(e.target.value)}
              >
                <MenuItem value=""><em>Ninguna (Facturación Directa)</em></MenuItem>
                {ordenesCompra
                  .filter((oc) => oc.estado === 'RECIBIDA' || oc.estado === 'PARCIAL')
                  .map((oc) => (
                    <MenuItem key={oc.id} value={oc.id}>
                      {oc.numeroOrden} - {oc.proveedor?.nombre}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Número de Factura"
              placeholder="Ex: F-10293"
              size="small"
              value={facturaForm.numeroFactura}
              onChange={(e) => setFacturaForm({ ...facturaForm, numeroFactura: e.target.value })}
            />

            <FormControl fullWidth size="small" required>
              <InputLabel>Proveedor</InputLabel>
              <Select
                value={facturaForm.proveedorId}
                label="Proveedor"
                disabled={!!facturaForm.ordenCompraId}
                onChange={(e) => setFacturaForm({ ...facturaForm, proveedorId: e.target.value })}
              >
                {proveedores.map((p) => (
                  <MenuItem key={p.id} value={p.id}>
                    {p.nombre} {p.terminoPago ? `(${p.terminoPago.nombre})` : '(Contado)'}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Box sx={{ mt: 1 }}>
              <DatePicker
                label="Fecha de Emisión"
                value={facturaForm.fechaEmision ? dayjs(facturaForm.fechaEmision) : null}
                onChange={(newValue) => setFacturaForm({ ...facturaForm, fechaEmision: newValue ? newValue.format('YYYY-MM-DD') : '' })}
                slotProps={{ textField: { size: 'small', fullWidth: true } }}
              />
            </Box>
          </Box>

          <Divider />

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
              Detalles de la Factura (Productos)
            </Typography>
            <Button size="small" startIcon={<Add />} onClick={handleAddDetalleRow}>
              Agregar Línea
            </Button>
          </Box>

          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Producto</TableCell>
                <TableCell width={120}>Cantidad</TableCell>
                <TableCell width={150}>Costo Unitario</TableCell>
                <TableCell width={150}>Subtotal</TableCell>
                <TableCell width={50} align="right"></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {detallesForm.map((row, idx) => (
                <TableRow key={idx}>
                  <TableCell>
                    <FormControl fullWidth size="small">
                      <Select
                        value={row.productoId}
                        onChange={(e) => handleDetalleChange(idx, 'productoId', e.target.value)}
                      >
                        {productos.map((p) => (
                          <MenuItem key={p.id} value={p.id}>
                            {p.nombre} ({p.codigo})
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </TableCell>
                  <TableCell>
                    <TextField
                      type="number"
                      size="small"
                      value={row.cantidad}
                      onChange={(e) => handleDetalleChange(idx, 'cantidad', parseFloat(e.target.value) || 0)}
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      type="number"
                      size="small"
                      value={row.costoUnitario}
                      onChange={(e) => handleDetalleChange(idx, 'costoUnitario', parseFloat(e.target.value) || 0)}
                    />
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>
                    {formatCurrency(row.cantidad * row.costoUnitario)}
                  </TableCell>
                  <TableCell align="right">
                    <IconButton size="small" color="error" onClick={() => handleRemoveDetalleRow(idx)}>
                      <Delete />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {detallesForm.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ color: 'text.secondary', py: 2 }}>
                    Presione "Agregar Línea" para comenzar a agregar productos.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          <Box sx={{ alignSelf: 'flex-end', width: 300, display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" color="text.secondary">Neto/Subtotal:</Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>{formatCurrency(facturaForm.subtotal)}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" color="text.secondary">IVA (19%):</Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>{formatCurrency(facturaForm.iva)}</Typography>
            </Box>
            <Divider />
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>Total Factura:</Typography>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'primary.main' }}>
                {formatCurrency(facturaForm.total)}
              </Typography>
            </Box>
          </Box>

          <TextField
            fullWidth
            multiline
            rows={2}
            label="Observaciones"
            size="small"
            value={facturaForm.observaciones}
            onChange={(e) => setFacturaForm({ ...facturaForm, observaciones: e.target.value })}
          />

        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenCrearFactura(false)}>Cancelar</Button>
          <Button variant="contained" color="success" onClick={handleCrearFacturaSubmit}>Guardar Factura</Button>
        </DialogActions>
      </Dialog>

      {/* DIALOG: VER DETALLES FACTURA */}
      <Dialog open={openVerDetalles} onClose={() => setOpenVerDetalles(false)} fullWidth maxWidth="sm">
        {selectedFactura && (
          <>
            <DialogTitle sx={{ fontWeight: 800, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Detalles Factura N° {selectedFactura.numeroFactura}</span>
              <Chip label={selectedFactura.estado} size="small" color={selectedFactura.estado === 'PAGADA' ? 'success' : 'warning'} />
            </DialogTitle>
            <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 2 }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>PROVEEDOR</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>{selectedFactura.proveedor?.nombre}</Typography>
                  <Typography variant="caption" color="text.secondary">{selectedFactura.proveedor?.codigo}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>CONDICIÓN DE PAGO</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {selectedFactura.proveedor?.terminoPago?.nombre || 'Pago de Contado'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>FECHA EMISIÓN</Typography>
                  <Typography variant="body2">{new Date(selectedFactura.fechaEmision).toLocaleDateString('es-CL')}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>FECHA VENCIMIENTO</Typography>
                  <Typography variant="body2">{new Date(selectedFactura.fechaVencimiento).toLocaleDateString('es-CL')}</Typography>
                </Box>
              </Box>

              <Divider />

              <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Items Facturados</Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Producto</TableCell>
                    <TableCell align="right">Cant</TableCell>
                    <TableCell align="right">Costo</TableCell>
                    <TableCell align="right">Subtotal</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {selectedFactura.detalles?.map((d: any) => (
                    <TableRow key={d.id}>
                      <TableCell>{d.producto?.nombre}</TableCell>
                      <TableCell align="right">{d.cantidad}</TableCell>
                      <TableCell align="right">{formatCurrency(d.costoUnitario)}</TableCell>
                      <TableCell align="right">{formatCurrency(d.subtotal)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagos Realizados */}
              {selectedFactura.pagos && selectedFactura.pagos.length > 0 && (
                <>
                  <Divider />
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'success.main' }}>
                    Historial de Abonos / Pagos
                  </Typography>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Fecha</TableCell>
                        <TableCell>Método</TableCell>
                        <TableCell>Referencia</TableCell>
                        <TableCell align="right">Monto</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {selectedFactura.pagos.map((p: any) => (
                        <TableRow key={p.id}>
                          <TableCell>{new Date(p.fechaPago).toLocaleDateString('es-CL')}</TableCell>
                          <TableCell>{p.metodoPago}</TableCell>
                          <TableCell>{p.chequeNumero ? `Cheque N° ${p.chequeNumero}` : p.referencia || 'Abono'}</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700, color: 'success.main' }}>
                            {formatCurrency(p.monto)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </>
              )}
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
              <Button onClick={() => setOpenVerDetalles(false)}>Cerrar</Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* DIALOG: REGISTRAR PAGO (EGRESO) */}
      <Dialog open={openRegistrarPago} onClose={() => setOpenRegistrarPago(false)} fullWidth maxWidth="sm">
        {selectedFactura && (
          <>
            <DialogTitle sx={{ fontWeight: 800 }}>Registrar Pago a Proveedor</DialogTitle>
            <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 2 }}>
              <Box sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.03)', borderRadius: 2, border: '1px solid rgba(255,255,255,0.05)' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1, color: 'secondary.main', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <AccountBalance sx={{ fontSize: 18 }} /> Datos de Transferencia / Depósito del Proveedor
                </Typography>
                
                {selectedFactura.proveedor?.bancoNombre ? (
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">BANCO</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{selectedFactura.proveedor.bancoNombre}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">TIPO CUENTA</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{selectedFactura.proveedor.bancoTipoCuenta}</Typography>
                    </Box>
                    <Box sx={{ gridColumn: 'span 2' }}>
                      <Typography variant="caption" color="text.secondary">NÚMERO DE CUENTA</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: 'monospace' }}>
                        {selectedFactura.proveedor.bancoNroCuenta}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">RUT TITULAR</Typography>
                      <Typography variant="body2">{selectedFactura.proveedor.bancoRutTitular}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">TITULAR</Typography>
                      <Typography variant="body2">{selectedFactura.proveedor.bancoNomTitular}</Typography>
                    </Box>
                  </Box>
                ) : (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1, color: 'warning.main' }}>
                    <Info sx={{ fontSize: 20 }} />
                    <Typography variant="body2">
                      Este proveedor no posee datos bancarios configurados. Diríjase a <strong>Utilidades &gt; Proveedores</strong> para agregarlos.
                    </Typography>
                  </Box>
                )}
              </Box>

              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <TextField
                  fullWidth
                  type="number"
                  label="Monto del Pago ($)"
                  size="small"
                  value={pagoForm.monto}
                  onChange={(e) => setPagoForm({ ...pagoForm, monto: e.target.value })}
                />
                
                <Box sx={{ mt: 1 }}>
                  <DatePicker
                    label="Fecha de Pago"
                    value={pagoForm.fechaPago ? dayjs(pagoForm.fechaPago) : null}
                    onChange={(newValue) => setPagoForm({ ...pagoForm, fechaPago: newValue ? newValue.format('YYYY-MM-DD') : '' })}
                    slotProps={{ textField: { size: 'small', fullWidth: true } }}
                  />
                </Box>
                
                <Box sx={{ gridColumn: 'span 2' }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Método de Pago</InputLabel>
                    <Select
                      value={pagoForm.metodoPago}
                      label="Método de Pago"
                      onChange={(e) => setPagoForm({ ...pagoForm, metodoPago: e.target.value })}
                    >
                      <MenuItem value="TRANSFERENCIA">Transferencia Bancaria</MenuItem>
                      <MenuItem value="DEPOSITO">Depósito Bancario</MenuItem>
                      <MenuItem value="CHEQUE">Cheque</MenuItem>
                      <MenuItem value="EFECTIVO">Efectivo en Caja</MenuItem>
                    </Select>
                  </FormControl>
                </Box>

                {pagoForm.metodoPago === 'CHEQUE' && (
                  <>
                    <TextField
                      fullWidth
                      label="Número de Cheque"
                      size="small"
                      value={pagoForm.chequeNumero}
                      onChange={(e) => setPagoForm({ ...pagoForm, chequeNumero: e.target.value })}
                    />
                    <TextField
                      fullWidth
                      label="Banco Emisor"
                      placeholder="Banco Estado, Bci..."
                      size="small"
                      value={pagoForm.chequeBanco}
                      onChange={(e) => setPagoForm({ ...pagoForm, chequeBanco: e.target.value })}
                    />
                    <Box sx={{ gridColumn: 'span 2', mt: 1 }}>
                      <DatePicker
                        label="Fecha de Vencimiento / Cobro Cheque"
                        value={pagoForm.chequeVence ? dayjs(pagoForm.chequeVence) : null}
                        onChange={(newValue) => setPagoForm({ ...pagoForm, chequeVence: newValue ? newValue.format('YYYY-MM-DD') : '' })}
                        slotProps={{ textField: { size: 'small', fullWidth: true } }}
                      />
                    </Box>
                  </>
                )}

                {(pagoForm.metodoPago === 'TRANSFERENCIA' || pagoForm.metodoPago === 'DEPOSITO') && (
                  <Box sx={{ gridColumn: 'span 2' }}>
                    <TextField
                      fullWidth
                      label="Número de Operación / Código Referencia"
                      placeholder="Ex: N° Transacción 901239"
                      size="small"
                      value={pagoForm.referencia}
                      onChange={(e) => setPagoForm({ ...pagoForm, referencia: e.target.value })}
                    />
                  </Box>
                )}
              </Box>
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
              <Button onClick={() => setOpenRegistrarPago(false)}>Cancelar</Button>
              <Button variant="contained" color="success" onClick={handleRegistrarPagoSubmit}>Confirmar Pago</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
}
