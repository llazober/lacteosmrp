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
  InputAdornment,
  Checkbox,
  Grid,
  Card,
  CardContent,
  Collapse,
} from '@mui/material';
import {
  Add,
  ReceiptLong,
  Paid,
  Warning,
  AccountBalance,
  Visibility,
  Info,
  Search,
  CheckCircle,
  AccountTree,
  Settings,
  Assessment,
  CompareArrows,
  Edit,
  Delete,
  ExpandMore,
  ExpandLess,
  FilePresent,
  ListAlt,
} from '@mui/icons-material';
import { apiFetch, apiFetchContabilidad } from '../store/useAuthStore';

export default function CuentasPorPagar() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(() => {
    const tabParam = new URLSearchParams(window.location.search).get('tab');
    if (tabParam) {
      const tabMap: Record<string, number> = {
        facturas: 0,
        pagos: 1,
        notas: 2,
        conciliacion: 3,
        proveedores: 4,
        asientos: 5,
        catalogo: 6,
        reportes: 7,
      };
      if (tabMap[tabParam] !== undefined) {
        return tabMap[tabParam];
      }
    }
    return 0;
  });

  const [expandedAsiento, setExpandedAsiento] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Data states
  const [facturas, setFacturas] = useState<any[]>([]);
  const [proveedores, setProveedores] = useState<any[]>([]);
  const [ordenesCompra, setOrdenesCompra] = useState<any[]>([]);
  const [productos, setProductos] = useState<any[]>([]);
  const [recepciones, setRecepciones] = useState<any[]>([]);
  const [pagos, setPagos] = useState<any[]>([]);
  const [notas, setNotas] = useState<any[]>([]);
  const [conciliaciones, setConciliaciones] = useState<any[]>([]);
  const [cuentas, setCuentas] = useState<any[]>([]);
  const [asientos, setAsientos] = useState<any[]>([]);
  const [configContable, setConfigContable] = useState<Record<string, string>>({});

  // Report states
  const [agingData, setAgingData] = useState<any[]>([]);
  const [flujoCajaData, setFlujoCajaData] = useState<any>({});
  const [impuestosData, setImpuestosData] = useState<any>({});
  const [filtroFechaImpuestos, setFiltroFechaImpuestos] = useState({
    inicio: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    fin: new Date().toISOString().split('T')[0],
  });

  // Filters
  const [filtroEstado, setFiltroEstado] = useState<string>('TODAS');
  const [searchFactura, setSearchFactura] = useState('');
  const [searchPago, setSearchPago] = useState('');

  // Dialogs
  const [openCrearFactura, setOpenCrearFactura] = useState(false);
  const [openVerFactura, setOpenVerFactura] = useState(false);
  const [openRegistrarPago, setOpenRegistrarPago] = useState(false);
  const [openRegistrarNota, setOpenRegistrarNota] = useState(false);
  const [openEditarProveedor, setOpenEditarProveedor] = useState(false);
  const [openRegistrarCartola, setOpenRegistrarCartola] = useState(false);
  const [openConfigMap, setOpenConfigMap] = useState(false);
  const [openCrearCuenta, setOpenCrearCuenta] = useState(false);
  const [openEditarCuenta, setOpenEditarCuenta] = useState(false);
  const [openConfirmLimpiar, setOpenConfirmLimpiar] = useState(false);
  const [cuentaForm, setCuentaForm] = useState({
    id: '',
    codigo: '',
    nombre: '',
    tipo: 'ACTIVO',
    nivel: 4,
    estado: 'ACTIVO',
  });

  // Selected Entities
  const [selectedFactura, setSelectedFactura] = useState<any>(null);
  const [selectedProveedor, setSelectedProveedor] = useState<any>(null);

  // Form states
  const [facturaForm, setFacturaForm] = useState({
    numeroFactura: '',
    proveedorId: '',
    ordenCompraId: '',
    recepcionMaterialId: '',
    fechaEmision: new Date().toISOString().split('T')[0],
    subtotal: 0,
    iva: 0,
    total: 0,
    observaciones: '',
    retenerRenta: false,
  });

  const [detallesForm, setDetallesForm] = useState<any[]>([]);

  const [pagoForm, setPagoForm] = useState({
    facturaCompraId: '',
    monto: '',
    metodoPago: 'TRANSFERENCIA',
    referencia: '',
    chequeNumero: '',
    chequeBanco: '',
    chequeVence: '',
    transfeCuenta: '',
  });

  const [notaForm, setNotaForm] = useState({
    tipo: 'CREDITO',
    numeroNota: '',
    facturaCompraId: '',
    monto: '',
    concepto: 'DEVOLUCION',
    motivo: '',
  });

  const [proveedorForm, setProveedorForm] = useState({
    id: '',
    nombre: '',
    nit: '',
    nrc: '',
    tipoContribuyente: 'OTROS',
    limiteCredito: '',
    moneda: 'USD',
  });

  const [cartolaForm, setCartolaForm] = useState({
    referenciaBanco: '',
    monto: '',
    tipo: 'RETIRO',
    observaciones: '',
  });

  const [configForm, setConfigForm] = useState<Record<string, string>>({});

  // Conciliación matching state
  const [selectedCartolaId, setSelectedCartolaId] = useState<string | null>(null);
  const [selectedPagoId, setSelectedPagoId] = useState<string | null>(null);

  useEffect(() => {
    cargarDatos();
  }, [activeTab]);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      if (activeTab === 0) {
        // Facturas
        const [facts, provs, ocs, recs, prods] = await Promise.all([
          apiFetchContabilidad('/facturas-compra'),
          apiFetchContabilidad('/proveedores/detalles'),
          apiFetch('/compras'),
          apiFetch('/recepciones'),
          apiFetch('/productos'),
        ]);
        setFacturas(facts);
        setProveedores(provs);
        setOrdenesCompra(ocs);
        setRecepciones(recs || []);
        setProductos(prods);
      } else if (activeTab === 1) {
        // Pagos
        const [pags, facts] = await Promise.all([
          apiFetchContabilidad('/pagos'),
          apiFetchContabilidad('/facturas-compra'),
        ]);
        setPagos(pags);
        setFacturas(facts);
      } else if (activeTab === 2) {
        // Notas
        const [nts, facts] = await Promise.all([
          apiFetchContabilidad('/notas-credito-debito'),
          apiFetchContabilidad('/facturas-compra'),
        ]);
        setNotas(nts);
        setFacturas(facts);
      } else if (activeTab === 3) {
        // Conciliación
        const [concs, pags] = await Promise.all([
          apiFetchContabilidad('/pagos/conciliacion'),
          apiFetchContabilidad('/pagos'),
        ]);
        setConciliaciones(concs);
        setPagos(pags.filter((p: any) => p.estado === 'PENDIENTE_CONFIRMACION'));
      } else if (activeTab === 4) {
        // Proveedores
        const provs = await apiFetchContabilidad('/proveedores/detalles');
        setProveedores(provs);
      } else if (activeTab === 5) {
        // Asientos
        const asis = await apiFetchContabilidad('/contabilidad/asientos');
        setAsientos(asis);
      } else if (activeTab === 6) {
        // Catálogo
        const [cts, conf] = await Promise.all([
          apiFetchContabilidad('/contabilidad/cuentas'),
          apiFetchContabilidad('/contabilidad/configuracion'),
        ]);
        setCuentas(cts);
        setConfigContable(conf);
        setConfigForm(conf);
      } else if (activeTab === 7) {
        // Reportes
        const [aging, flujo, impuestos] = await Promise.all([
          apiFetchContabilidad('/reportes/aging'),
          apiFetchContabilidad('/reportes/flujo-caja'),
          apiFetchContabilidad(`/reportes/impuestos?fechaInicio=${filtroFechaImpuestos.inicio}&fechaFin=${filtroFechaImpuestos.fin}`),
        ]);
        setAgingData(aging);
        setFlujoCajaData(flujo);
        setImpuestosData(impuestos);
      }
    } catch (e: any) {
      setErrorMsg('Error al cargar información: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (val: number) => {
    setActiveTab(val);
    const tabNames = ['facturas', 'pagos', 'notas', 'conciliacion', 'proveedores', 'asientos', 'catalogo', 'reportes'];
    setSearchParams({ tab: tabNames[val] });
  };

  // Helper formats
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(val || 0);
  };

  // Calculadora de IVA y Retenciones local
  const calcularValoresFacturaForm = (sub: number, provId: string, retRenta: boolean) => {
    const prov = proveedores.find((p) => p.id === provId);
    let retIva = 0;
    if (prov && prov.tipoContribuyente !== 'GRAN_CONTRIBUYENTE' && sub >= 100.0) {
      retIva = Math.round(sub * 0.01 * 100) / 100;
    }
    const iva = Math.round(sub * 0.13 * 100) / 100;
    const retR = retRenta ? Math.round(sub * 0.10 * 100) / 100 : 0;
    const tot = Math.round((sub + iva - retIva - retR) * 100) / 100;

    setFacturaForm((prev) => ({
      ...prev,
      subtotal: sub,
      iva,
      total: tot,
    }));
  };

  useEffect(() => {
    const sub = detallesForm.reduce((acc, curr) => acc + curr.cantidad * curr.costoUnitario, 0);
    calcularValoresFacturaForm(sub, facturaForm.proveedorId, facturaForm.retenerRenta);
  }, [detallesForm, facturaForm.proveedorId, facturaForm.retenerRenta]);

  // Selección de PO / GRN
  const handleSelectRecepcion = (recId: string) => {
    if (!recId) {
      setFacturaForm((prev) => ({ ...prev, recepcionMaterialId: '' }));
      return;
    }
    const rec = recepciones.find((r) => r.id === recId);
    if (!rec) return;

    setFacturaForm((prev) => ({
      ...prev,
      recepcionMaterialId: recId,
      proveedorId: rec.proveedorId || '',
      ordenCompraId: rec.ordenCompraId || '',
      numeroFactura: rec.facturaNumero || prev.numeroFactura || '',
      observaciones: rec.observaciones || prev.observaciones || '',
    }));

    const mappedDetails = rec.detalles.map((d: any) => ({
      productoId: d.productoId,
      nombre: d.producto?.descripcion || 'Producto',
      cantidad: d.cantidad,
      costoUnitario: d.costoUnitario || d.producto?.costo || 0,
    }));
    setDetallesForm(mappedDetails);
  };

  // Submits
  const handleCrearFacturaSubmit = async () => {
    try {
      setErrorMsg(null);
      if (!facturaForm.numeroFactura.trim() || !facturaForm.proveedorId || detallesForm.length === 0) {
        throw new Error('Número de factura, proveedor y detalles son obligatorios.');
      }
      await apiFetchContabilidad('/facturas-compra', {
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
      setSuccessMsg('Factura de compra y asiento diario registrados con éxito.');
      setOpenCrearFactura(false);
      cargarDatos();
    } catch (e: any) {
      setErrorMsg(e.message);
    }
  };

  const handleMatchOverride = async (factId: string) => {
    try {
      setErrorMsg(null);
      await apiFetchContabilidad(`/facturas-compra/${factId}/match-override`, {
        method: 'POST',
      });
      setSuccessMsg('Factura autorizada y asiento contable publicado correctamente.');
      cargarDatos();
    } catch (e: any) {
      setErrorMsg(e.message);
    }
  };

  const handleRegistrarPagoSubmit = async () => {
    try {
      setErrorMsg(null);
      if (!pagoForm.facturaCompraId || !pagoForm.monto || Number(pagoForm.monto) <= 0) {
        throw new Error('La factura y el monto son obligatorios.');
      }
      await apiFetchContabilidad('/pagos', {
        method: 'POST',
        body: JSON.stringify({
          ...pagoForm,
          monto: Number(pagoForm.monto),
        }),
      });
      setSuccessMsg('Pago registrado y póliza de egresos publicada.');
      setOpenRegistrarPago(false);
      cargarDatos();
    } catch (e: any) {
      setErrorMsg(e.message);
    }
  };

  const handleRegistrarNotaSubmit = async () => {
    try {
      setErrorMsg(null);
      if (!notaForm.numeroNota || !notaForm.facturaCompraId || !notaForm.monto) {
        throw new Error('Todos los campos son requeridos.');
      }
      await apiFetchContabilidad('/notas-credito-debito', {
        method: 'POST',
        body: JSON.stringify({
          ...notaForm,
          monto: Number(notaForm.monto),
        }),
      });
      setSuccessMsg('Nota de ajuste contable y asiento diario guardados.');
      setOpenRegistrarNota(false);
      cargarDatos();
    } catch (e: any) {
      setErrorMsg(e.message);
    }
  };

  const handleActualizarProveedorSubmit = async () => {
    try {
      setErrorMsg(null);
      await apiFetchContabilidad(`/proveedores/${proveedorForm.id}/contabilidad`, {
        method: 'PUT',
        body: JSON.stringify({
          nit: proveedorForm.nit,
          nrc: proveedorForm.nrc,
          tipoContribuyente: proveedorForm.tipoContribuyente,
          limiteCredito: proveedorForm.limiteCredito ? Number(proveedorForm.limiteCredito) : null,
          moneda: proveedorForm.moneda,
        }),
      });
      setSuccessMsg('Datos fiscales del proveedor actualizados.');
      setOpenEditarProveedor(false);
      cargarDatos();
    } catch (e: any) {
      setErrorMsg(e.message);
    }
  };

  const handleCrearCartolaSubmit = async () => {
    try {
      setErrorMsg(null);
      await apiFetchContabilidad('/pagos/conciliacion/linea', {
        method: 'POST',
        body: JSON.stringify({
          ...cartolaForm,
          monto: Number(cartolaForm.monto),
        }),
      });
      setSuccessMsg('Línea de banco registrada para conciliación.');
      setOpenRegistrarCartola(false);
      cargarDatos();
    } catch (e: any) {
      setErrorMsg(e.message);
    }
  };

  const handleGuardarConfigSubmit = async () => {
    try {
      setErrorMsg(null);
      await apiFetchContabilidad('/contabilidad/configuracion', {
        method: 'POST',
        body: JSON.stringify(configForm),
      });
      setSuccessMsg('Configuración de cuentas enlazada con éxito.');
      setOpenConfigMap(false);
      cargarDatos();
    } catch (e: any) {
      setErrorMsg(e.message);
    }
  };

  const handleConciliarSubmit = async () => {
    try {
      setErrorMsg(null);
      if (!selectedCartolaId || !selectedPagoId) {
        throw new Error('Debe seleccionar una línea bancaria y un egreso contable.');
      }
      await apiFetchContabilidad('/pagos/conciliacion/conciliar', {
        method: 'POST',
        body: JSON.stringify({
          pagoId: selectedPagoId,
          lineaBancoId: selectedCartolaId,
        }),
      });
      setSuccessMsg('Conciliación completada con éxito.');
      setSelectedCartolaId(null);
      setSelectedPagoId(null);
      cargarDatos();
    } catch (e: any) {
      setErrorMsg(e.message);
    }
  };

  const handleCrearCuentaSubmit = async () => {
    try {
      setErrorMsg(null);
      if (!cuentaForm.codigo.trim() || !cuentaForm.nombre.trim()) {
        throw new Error('El código y el nombre de la cuenta son requeridos.');
      }
      await apiFetchContabilidad('/contabilidad/cuentas', {
        method: 'POST',
        body: JSON.stringify(cuentaForm),
      });
      setSuccessMsg('Cuenta contable agregada al catálogo con éxito.');
      setOpenCrearCuenta(false);
      cargarDatos();
    } catch (e: any) {
      setErrorMsg(e.message);
    }
  };

  const handleEditarCuentaSubmit = async () => {
    try {
      setErrorMsg(null);
      if (!cuentaForm.nombre.trim()) {
        throw new Error('El nombre de la cuenta es requerido.');
      }
      await apiFetchContabilidad(`/contabilidad/cuentas/${cuentaForm.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          nombre: cuentaForm.nombre,
          tipo: cuentaForm.tipo,
          estado: cuentaForm.estado,
        }),
      });
      setSuccessMsg('Cuenta contable actualizada con éxito.');
      setOpenEditarCuenta(false);
      cargarDatos();
    } catch (e: any) {
      setErrorMsg(e.message);
    }
  };

  const handleEliminarCuenta = async (id: string) => {
    if (!window.confirm('¿Está seguro de que desea eliminar esta cuenta contable del catálogo?')) {
      return;
    }
    try {
      setErrorMsg(null);
      await apiFetchContabilidad(`/contabilidad/cuentas/${id}`, {
        method: 'DELETE',
      });
      setSuccessMsg('Cuenta contable eliminada con éxito.');
      cargarDatos();
    } catch (e: any) {
      setErrorMsg(e.message);
    }
  };

  const executeLimpiarDatosPrueba = async () => {
    setOpenConfirmLimpiar(false);
    try {
      setErrorMsg(null);
      setLoading(true);
      await apiFetchContabilidad('/contabilidad/limpiar-pruebas', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      setSuccessMsg('Datos de prueba eliminados correctamente. El módulo contable ha sido restablecido a su estado inicial.');
      cargarDatos();
    } catch (e: any) {
      setErrorMsg(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3, height: '100%', overflowY: 'auto' }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 900, color: 'primary.main', mb: 0.5 }}>
            Contabilidad General y Cuentas por Pagar
          </Typography>
          <Typography variant="body2" color="text.secondary">
            ERP El Salvador — Módulo contable profesional con integración de IVA, Retenciones (1% / 10%), Pólizas automáticas y Three-Way Match.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button
            variant="outlined"
            color="error"
            startIcon={<Delete />}
            onClick={() => setOpenConfirmLimpiar(true)}
          >
            Limpiar Pruebas
          </Button>
          {activeTab === 6 && (
            <>
              <Button
                variant="outlined"
                color="primary"
                startIcon={<Settings />}
                onClick={() => {
                  setConfigForm(configContable);
                  setOpenConfigMap(true);
                }}
              >
                Mapeo de Cuentas
              </Button>
              <Button
                variant="contained"
                color="primary"
                startIcon={<Add />}
                onClick={() => {
                  setCuentaForm({
                    id: '',
                    codigo: '',
                    nombre: '',
                    tipo: 'ACTIVO',
                    nivel: 4,
                    estado: 'ACTIVO',
                  });
                  setOpenCrearCuenta(true);
                }}
              >
                Nueva Cuenta
              </Button>
            </>
          )}
          {activeTab === 0 && (
            <Button
              variant="contained"
              color="primary"
              startIcon={<Add />}
              onClick={() => {
                setFacturaForm({
                  numeroFactura: '',
                  proveedorId: '',
                  ordenCompraId: '',
                  recepcionMaterialId: '',
                  fechaEmision: new Date().toISOString().split('T')[0],
                  subtotal: 0,
                  iva: 0,
                  total: 0,
                  observaciones: '',
                  retenerRenta: false,
                });
                setDetallesForm([]);
                setOpenCrearFactura(true);
              }}
            >
              Registrar Factura
            </Button>
          )}
        </Box>
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

      {/* Tabs Menu */}
      <Tabs
        value={activeTab}
        onChange={(_, val) => handleTabChange(val)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}
      >
        <Tab label="Facturas de Compra" icon={<ReceiptLong />} iconPosition="start" />
        <Tab label="Egresos / Pagos" icon={<Paid />} iconPosition="start" />
        <Tab label="Notas Crédito/Débito" icon={<CompareArrows />} iconPosition="start" />
        <Tab label="Conciliación Bancaria" icon={<AccountBalance />} iconPosition="start" />
        <Tab label="Proveedores (Fiscal)" icon={<ListAlt />} iconPosition="start" />
        <Tab label="Asientos Contables" icon={<FilePresent />} iconPosition="start" />
        <Tab label="Catálogo de Cuentas" icon={<AccountTree />} iconPosition="start" />
        <Tab label="Reportes Financieros" icon={<Assessment />} iconPosition="start" />
      </Tabs>

      {loading && <LinearProgress sx={{ mb: 3 }} />}

      {/* ==================== TAB 0: FACTURAS ==================== */}
      {activeTab === 0 && (
        <Card sx={{ borderRadius: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, alignItems: 'center' }}>
              <TextField
                size="small"
                placeholder="Filtrar facturas..."
                value={searchFactura}
                onChange={(e) => setSearchFactura(e.target.value)}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search />
                      </InputAdornment>
                    ),
                  },
                }}
                sx={{ width: 300 }}
              />
              <FormControl size="small" sx={{ width: 180 }}>
                <InputLabel>Estado</InputLabel>
                <Select
                  value={filtroEstado}
                  label="Estado"
                  onChange={(e) => setFiltroEstado(e.target.value)}
                >
                  <MenuItem value="TODAS">Todas</MenuItem>
                  <MenuItem value="PENDIENTE">Pendientes</MenuItem>
                  <MenuItem value="APROBADA">Aprobadas para Pago</MenuItem>
                  <MenuItem value="BLOQUEADA_MATCH">Bloqueadas Match</MenuItem>
                  <MenuItem value="PAGADA">Pagadas</MenuItem>
                </Select>
              </FormControl>
            </Box>

            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Factura N°</TableCell>
                  <TableCell>Proveedor</TableCell>
                  <TableCell>Emisión / Vence</TableCell>
                  <TableCell align="right">Subtotal</TableCell>
                  <TableCell align="right">IVA (13%)</TableCell>
                  <TableCell align="right">Retenciones</TableCell>
                  <TableCell align="right">Total</TableCell>
                  <TableCell align="center">3-Way Match</TableCell>
                  <TableCell align="center">Estado</TableCell>
                  <TableCell align="right">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {facturas
                  .filter((f) => {
                    const matchText =
                      f.numeroFactura.toLowerCase().includes(searchFactura.toLowerCase()) ||
                      f.proveedor.nombre.toLowerCase().includes(searchFactura.toLowerCase());
                    const matchEst = filtroEstado === 'TODAS' || f.estado === filtroEstado;
                    return matchText && matchEst;
                  })
                  .map((f) => {
                    const retenciones = f.retencionIva + f.retencionRenta;
                    return (
                      <TableRow key={f.id} hover>
                        <TableCell sx={{ fontWeight: 'bold' }}>{f.numeroFactura}</TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {f.proveedor.nombre}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            NRC: {f.proveedor.nrc || 'No registrado'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {new Date(f.fechaEmision).toLocaleDateString()}
                          </Typography>
                          <Typography variant="caption" color="error">
                            {new Date(f.fechaVencimiento).toLocaleDateString()}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">{formatCurrency(f.subtotal)}</TableCell>
                        <TableCell align="right">{formatCurrency(f.iva)}</TableCell>
                        <TableCell align="right" sx={{ color: 'error.main' }}>
                          {retenciones > 0 ? `-${formatCurrency(retenciones)}` : '$0.00'}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                          {formatCurrency(f.total)}
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={f.matchStatus}
                            size="small"
                            color={
                              f.matchStatus === 'MATCH_OK'
                                ? 'success'
                                : f.matchStatus === 'MATCH_MISMATCH'
                                ? 'error'
                                : 'default'
                            }
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={f.estado}
                            size="small"
                            color={
                              f.estado === 'APROBADA' || f.estado === 'PAGADA'
                                ? 'success'
                                : f.estado === 'BLOQUEADA_MATCH'
                                ? 'error'
                                : 'warning'
                            }
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                            <Tooltip title="Ver detalles">
                              <IconButton
                                size="small"
                                onClick={() => {
                                  setSelectedFactura(f);
                                  setOpenVerFactura(true);
                                }}
                              >
                                <Visibility />
                              </IconButton>
                            </Tooltip>
                            {f.estado === 'BLOQUEADA_MATCH' && (
                              <Button
                                size="small"
                                variant="contained"
                                color="warning"
                                onClick={() => handleMatchOverride(f.id)}
                              >
                                Forzar Match
                              </Button>
                            )}
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* ==================== TAB 1: PAGOS ==================== */}
      {activeTab === 1 && (
        <Card sx={{ borderRadius: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
              <TextField
                size="small"
                placeholder="Buscar pagos..."
                value={searchPago}
                onChange={(e) => setSearchPago(e.target.value)}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search />
                      </InputAdornment>
                    ),
                  },
                }}
                sx={{ width: 300 }}
              />
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => {
                  setPagoForm({
                    facturaCompraId: '',
                    monto: '',
                    metodoPago: 'TRANSFERENCIA',
                    referencia: '',
                    chequeNumero: '',
                    chequeBanco: '',
                    chequeVence: '',
                    transfeCuenta: '',
                  });
                  setOpenRegistrarPago(true);
                }}
              >
                Registrar Pago
              </Button>
            </Box>

            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Fecha Pago</TableCell>
                  <TableCell>Factura</TableCell>
                  <TableCell>Proveedor</TableCell>
                  <TableCell>Método</TableCell>
                  <TableCell>Referencia</TableCell>
                  <TableCell align="right">Monto Pagado</TableCell>
                  <TableCell align="center">Conciliado</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {pagos
                  .filter((p) =>
                    p.facturaCompra.numeroFactura.toLowerCase().includes(searchPago.toLowerCase()) ||
                    p.facturaCompra.proveedor.nombre.toLowerCase().includes(searchPago.toLowerCase())
                  )
                  .map((p) => (
                    <TableRow key={p.id} hover>
                      <TableCell>{new Date(p.fechaPago).toLocaleDateString()}</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>{p.facturaCompra.numeroFactura}</TableCell>
                      <TableCell>{p.facturaCompra.proveedor.nombre}</TableCell>
                      <TableCell>{p.metodoPago}</TableCell>
                      <TableCell>{p.referencia || 'N/A'}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                        {formatCurrency(p.monto)}
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={p.estado}
                          size="small"
                          color={p.estado === 'CONCILIADO' ? 'success' : 'warning'}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* ==================== TAB 2: NOTAS AJUSTE ==================== */}
      {activeTab === 2 && (
        <Card sx={{ borderRadius: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => {
                  setNotaForm({
                    tipo: 'CREDITO',
                    numeroNota: '',
                    facturaCompraId: '',
                    monto: '',
                    concepto: 'DEVOLUCION',
                    motivo: '',
                  });
                  setOpenRegistrarNota(true);
                }}
              >
                Registrar Nota de Ajuste
              </Button>
            </Box>

            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Fecha</TableCell>
                  <TableCell>N° Nota</TableCell>
                  <TableCell>Tipo</TableCell>
                  <TableCell>Factura Relacionada</TableCell>
                  <TableCell>Proveedor</TableCell>
                  <TableCell>Concepto</TableCell>
                  <TableCell align="right">Monto</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {notas.map((n) => (
                  <TableRow key={n.id} hover>
                    <TableCell>{new Date(n.fecha).toLocaleDateString()}</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>{n.numeroNota}</TableCell>
                    <TableCell>
                      <Chip
                        label={n.tipo}
                        size="small"
                        color={n.tipo === 'CREDITO' ? 'info' : 'secondary'}
                      />
                    </TableCell>
                    <TableCell>{n.facturaCompra.numeroFactura}</TableCell>
                    <TableCell>{n.facturaCompra.proveedor.nombre}</TableCell>
                    <TableCell>{n.concepto}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold', color: n.tipo === 'CREDITO' ? 'info.main' : 'error.main' }}>
                      {formatCurrency(n.monto)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* ==================== TAB 3: CONCILIACIÓN BANCARIA ==================== */}
      {activeTab === 3 && (
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Card sx={{ borderRadius: 3, minHeight: 400 }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, alignItems: 'center' }}>
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    Cartola Bancaria (Estado de Cuenta)
                  </Typography>
                  <Button size="small" variant="outlined" onClick={() => setOpenRegistrarCartola(true)}>
                    Subir Movimiento Banco
                  </Button>
                </Box>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Fecha</TableCell>
                      <TableCell>Referencia</TableCell>
                      <TableCell align="right">Monto</TableCell>
                      <TableCell align="center">Sel</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {conciliaciones
                      .filter((c) => c.estado === 'PENDIENTE')
                      .map((c) => (
                        <TableRow
                          key={c.id}
                          hover
                          onClick={() => setSelectedCartolaId(c.id)}
                          selected={selectedCartolaId === c.id}
                          sx={{ cursor: 'pointer' }}
                        >
                          <TableCell>{new Date(c.fechaEjecucion).toLocaleDateString()}</TableCell>
                          <TableCell>{c.referenciaBanco}</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                            {formatCurrency(c.monto)}
                          </TableCell>
                          <TableCell align="center">
                            <Checkbox checked={selectedCartolaId === c.id} size="small" />
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Card sx={{ borderRadius: 3, minHeight: 400 }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
                  Egresos Contables Pendientes
                </Typography>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Fecha</TableCell>
                      <TableCell>Factura</TableCell>
                      <TableCell align="right">Monto</TableCell>
                      <TableCell align="center">Sel</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {pagos
                      .filter((p) => p.estado === 'PENDIENTE_CONFIRMACION')
                      .map((p) => (
                        <TableRow
                          key={p.id}
                          hover
                          onClick={() => setSelectedPagoId(p.id)}
                          selected={selectedPagoId === p.id}
                          sx={{ cursor: 'pointer' }}
                        >
                          <TableCell>{new Date(p.fechaPago).toLocaleDateString()}</TableCell>
                          <TableCell>{p.facturaCompra.numeroFactura}</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                            {formatCurrency(p.monto)}
                          </TableCell>
                          <TableCell align="center">
                            <Checkbox checked={selectedPagoId === p.id} size="small" />
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={12}>
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
              <Button
                variant="contained"
                color="success"
                size="large"
                startIcon={<CheckCircle />}
                disabled={!selectedCartolaId || !selectedPagoId}
                onClick={handleConciliarSubmit}
                sx={{ px: 4 }}
              >
                Ejecutar Conciliación de Partida
              </Button>
            </Box>
          </Grid>
        </Grid>
      )}

      {/* ==================== TAB 4: PROVEEDORES ==================== */}
      {activeTab === 4 && (
        <Card sx={{ borderRadius: 3 }}>
          <CardContent>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Código</TableCell>
                  <TableCell>Proveedor</TableCell>
                  <TableCell>NIT (Fiscal)</TableCell>
                  <TableCell>NRC</TableCell>
                  <TableCell>Contribuyente</TableCell>
                  <TableCell align="right">Límite Crédito</TableCell>
                  <TableCell align="center">Moneda</TableCell>
                  <TableCell align="right">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {proveedores.map((p) => (
                  <TableRow key={p.id} hover>
                    <TableCell>{p.codigo}</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>{p.nombre}</TableCell>
                    <TableCell>{p.nit || '—'}</TableCell>
                    <TableCell>{p.nrc || '—'}</TableCell>
                    <TableCell>
                      <Chip label={p.tipoContribuyente || 'OTROS'} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell align="right">
                      {p.limiteCredito ? formatCurrency(p.limiteCredito) : 'Ilimitado'}
                    </TableCell>
                    <TableCell align="center">{p.moneda || 'USD'}</TableCell>
                    <TableCell align="right">
                      <IconButton
                        color="primary"
                        onClick={() => {
                          setProveedorForm({
                            id: p.id,
                            nombre: p.nombre,
                            nit: p.nit || '',
                            nrc: p.nrc || '',
                            tipoContribuyente: p.tipoContribuyente || 'OTROS',
                            limiteCredito: p.limiteCredito ? String(p.limiteCredito) : '',
                            moneda: p.moneda || 'USD',
                          });
                          setOpenEditarProveedor(true);
                        }}
                      >
                        <Edit />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* ==================== TAB 5: ASIENTOS CONTABLES ==================== */}
      {activeTab === 5 && (
        <Card sx={{ borderRadius: 3 }}>
          <CardContent>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ width: 50 }} />
                  <TableCell>Número Póliza</TableCell>
                  <TableCell>Concepto</TableCell>
                  <TableCell>Fecha</TableCell>
                  <TableCell>Tipo</TableCell>
                  <TableCell align="center">Estado</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {asientos.map((a) => {
                  const isExpanded = expandedAsiento === a.id;
                  return (
                    <>
                      <TableRow key={a.id} hover sx={{ cursor: 'pointer' }} onClick={() => setExpandedAsiento(isExpanded ? null : a.id)}>
                        <TableCell>
                          {isExpanded ? <ExpandLess /> : <ExpandMore />}
                        </TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>{a.numero}</TableCell>
                        <TableCell>{a.concepto}</TableCell>
                        <TableCell>{new Date(a.fecha).toLocaleDateString()}</TableCell>
                        <TableCell>{a.tipoOrigen}</TableCell>
                        <TableCell align="center">
                          <Chip label={a.estado} size="small" color="success" />
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
                          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                            <Box sx={{ margin: 2, borderLeft: '4px solid #10b981', pl: 2 }}>
                              <Typography variant="subtitle2" gutterBottom component="div" sx={{ fontWeight: 'bold' }}>
                                Cuentas Contables Afectadas (Partida Doble)
                              </Typography>
                              <Table size="small">
                                <TableHead>
                                  <TableRow>
                                    <TableCell>Código Cuenta</TableCell>
                                    <TableCell>Nombre Cuenta</TableCell>
                                    <TableCell>Glosa / Explicación</TableCell>
                                    <TableCell align="right">Debe</TableCell>
                                    <TableCell align="right">Haber</TableCell>
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {a.lineas.map((line: any) => (
                                    <TableRow key={line.id}>
                                      <TableCell>{line.cuenta.codigo}</TableCell>
                                      <TableCell sx={{ fontWeight: line.debe > 0 ? 'bold' : 'normal' }}>
                                        {line.cuenta.nombre}
                                      </TableCell>
                                      <TableCell>{line.glosa || '—'}</TableCell>
                                      <TableCell align="right" sx={{ color: 'info.main', fontWeight: 'bold' }}>
                                        {line.debe > 0 ? formatCurrency(line.debe) : '—'}
                                      </TableCell>
                                      <TableCell align="right" sx={{ color: 'error.main', fontWeight: 'bold' }}>
                                        {line.haber > 0 ? formatCurrency(line.haber) : '—'}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </Box>
                          </Collapse>
                        </TableCell>
                      </TableRow>
                    </>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* ==================== TAB 6: CATALOGO ==================== */}
      {activeTab === 6 && (
        <Card sx={{ borderRadius: 3 }}>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
              Catálogo de Cuentas Autorizado para El Salvador
            </Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Código Cuenta</TableCell>
                  <TableCell>Nombre de la Cuenta</TableCell>
                  <TableCell>Tipo</TableCell>
                  <TableCell align="center">Nivel</TableCell>
                  <TableCell align="center">Estado</TableCell>
                  <TableCell align="right">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {cuentas.map((c) => {
                  const padding = (c.nivel - 1) * 30;
                  return (
                    <TableRow key={c.id} hover>
                      <TableCell sx={{ fontWeight: c.nivel <= 3 ? 'bold' : 'normal' }}>
                        {c.codigo}
                      </TableCell>
                      <TableCell style={{ paddingLeft: `${padding}px` }} sx={{ fontWeight: c.nivel <= 3 ? 'bold' : 'normal' }}>
                        {c.nombre}
                      </TableCell>
                      <TableCell>
                        <Chip label={c.tipo} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell align="center">{c.nivel}</TableCell>
                      <TableCell align="center">
                        <Chip label={c.estado} size="small" color={c.estado === 'ACTIVO' ? 'success' : 'default'} />
                      </TableCell>
                      <TableCell align="right">
                        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => {
                              setCuentaForm({
                                id: c.id,
                                codigo: c.codigo,
                                nombre: c.nombre,
                                tipo: c.tipo,
                                nivel: c.nivel,
                                estado: c.estado,
                              });
                              setOpenEditarCuenta(true);
                            }}
                          >
                            <Edit />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleEliminarCuenta(c.id)}
                          >
                            <Delete />
                          </IconButton>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* ==================== TAB 7: REPORTES ==================== */}
      {activeTab === 7 && (
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Card sx={{ borderRadius: 3 }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
                  Antigüedad de Saldos (Aging)
                </Typography>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Proveedor</TableCell>
                      <TableCell align="right">0-30 Días</TableCell>
                      <TableCell align="right">31-60 Días</TableCell>
                      <TableCell align="right">61-90 Días</TableCell>
                      <TableCell align="right">90+ Días</TableCell>
                      <TableCell align="right">Total</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {agingData.map((a) => (
                      <TableRow key={a.proveedorCodigo} hover>
                        <TableCell sx={{ fontWeight: 'bold' }}>{a.proveedorNombre}</TableCell>
                        <TableCell align="right">{formatCurrency(a.aging0a30)}</TableCell>
                        <TableCell align="right">{formatCurrency(a.aging31a60)}</TableCell>
                        <TableCell align="right">{formatCurrency(a.aging61a90)}</TableCell>
                        <TableCell align="right">{formatCurrency(a.agingMas90)}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                          {formatCurrency(a.totalPendiente)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Card sx={{ borderRadius: 3 }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
                  Demanda de Flujo de Caja Estimado
                </Typography>
                <Table size="small">
                  <TableBody>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold', color: 'error.main' }}>Vencido Pendiente</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold', color: 'error.main' }}>
                        {formatCurrency(flujoCajaData.vencido)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Próximos 7 Días</TableCell>
                      <TableCell align="right">{formatCurrency(flujoCajaData.proximos7Dias)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Próximos 15 Días</TableCell>
                      <TableCell align="right">{formatCurrency(flujoCajaData.proximos15Dias)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Próximos 30 Días</TableCell>
                      <TableCell align="right">{formatCurrency(flujoCajaData.proximos30Dias)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Próximos 60 Días</TableCell>
                      <TableCell align="right">{formatCurrency(flujoCajaData.proximos60Dias)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={12}>
            <Card sx={{ borderRadius: 3 }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, alignItems: 'center' }}>
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    Resumen Tributario de Impuestos (F987 / IVA / Renta)
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    <TextField
                      type="date"
                      label="Fecha Inicio"
                      value={filtroFechaImpuestos.inicio}
                      onChange={(e) => setFiltroFechaImpuestos({ ...filtroFechaImpuestos, inicio: e.target.value })}
                      size="small"
                      slotProps={{ inputLabel: { shrink: true } }}
                    />
                    <TextField
                      type="date"
                      label="Fecha Fin"
                      value={filtroFechaImpuestos.fin}
                      onChange={(e) => setFiltroFechaImpuestos({ ...filtroFechaImpuestos, fin: e.target.value })}
                      size="small"
                      slotProps={{ inputLabel: { shrink: true } }}
                    />
                    <Button variant="contained" onClick={cargarDatos}>
                      Aplicar
                    </Button>
                  </Box>
                </Box>

                <Grid container spacing={3}>
                  <Grid size={{ xs: 12, sm: 3 }}>
                    <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', borderRadius: 2 }}>
                      <Typography variant="caption" color="text.secondary">COMPRAS NETAS (SUBTOTAL)</Typography>
                      <Typography variant="h6" sx={{ fontWeight: 'bold', mt: 0.5 }}>
                        {formatCurrency(impuestosData.totalComprasNetas)}
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 3 }}>
                    <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', borderRadius: 2 }}>
                      <Typography variant="caption" color="text.secondary">13% IVA CRÉDITO FISCAL</Typography>
                      <Typography variant="h6" sx={{ fontWeight: 'bold', mt: 0.5, color: 'info.main' }}>
                        {formatCurrency(impuestosData.totalIvaCredito)}
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 3 }}>
                    <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', borderRadius: 2 }}>
                      <Typography variant="caption" color="text.secondary">1% RETENCIÓN IVA</Typography>
                      <Typography variant="h6" sx={{ fontWeight: 'bold', mt: 0.5, color: 'error.main' }}>
                        {formatCurrency(impuestosData.totalRetencionIva)}
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 3 }}>
                    <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', borderRadius: 2 }}>
                      <Typography variant="caption" color="text.secondary">10% RETENCIÓN RENTA (ISR)</Typography>
                      <Typography variant="h6" sx={{ fontWeight: 'bold', mt: 0.5, color: 'warning.main' }}>
                        {formatCurrency(impuestosData.totalRetencionRenta)}
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* ==================== DIALOGS ==================== */}

      {/* 1. Crear Factura */}
      <Dialog open={openCrearFactura} onClose={() => setOpenCrearFactura(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>Registrar Factura de Compra</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Número de Factura / CCF"
                  value={facturaForm.numeroFactura}
                  onChange={(e) => setFacturaForm({ ...facturaForm, numeroFactura: e.target.value })}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth>
                  <InputLabel>Proveedor</InputLabel>
                  <Select
                    value={facturaForm.proveedorId}
                    label="Proveedor"
                    onChange={(e) => setFacturaForm({ ...facturaForm, proveedorId: e.target.value })}
                  >
                    {proveedores.map((p) => (
                      <MenuItem key={p.id} value={p.id}>
                        {p.nombre} ({p.tipoContribuyente})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth>
                  <InputLabel>Recepción Material (GRN)</InputLabel>
                  <Select
                    value={facturaForm.recepcionMaterialId}
                    label="Recepción Material (GRN)"
                    onChange={(e) => handleSelectRecepcion(e.target.value)}
                  >
                    <MenuItem value="">— Sin Recepción Física (Compra Directa) —</MenuItem>
                    {recepciones.map((r) => (
                      <MenuItem key={r.id} value={r.id}>
                        Recibo: {r.numeroRecibo} ({r.facturaNumero || 'S/N'})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  type="date"
                  label="Fecha de Emisión"
                  value={facturaForm.fechaEmision}
                  onChange={(e) => setFacturaForm({ ...facturaForm, fechaEmision: e.target.value })}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Checkbox
                  checked={facturaForm.retenerRenta}
                  onChange={(e) => setFacturaForm({ ...facturaForm, retenerRenta: e.target.checked })}
                />
                <Typography variant="caption" color="text.secondary">
                  Aplicar 10% Retención sobre Renta (Honorarios / Servicios profesionales)
                </Typography>
              </Grid>
              <Grid size={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="Observaciones"
                  value={facturaForm.observaciones}
                  onChange={(e) => setFacturaForm({ ...facturaForm, observaciones: e.target.value })}
                />
              </Grid>
            </Grid>

            <Divider sx={{ my: 3 }} />

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, alignItems: 'center' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                Detalle de Líneas de Factura
              </Typography>
              <Button size="small" startIcon={<Add />} onClick={() => setDetallesForm([...detallesForm, { productoId: '', cantidad: 1, costoUnitario: 0 }])}>
                Agregar Fila
              </Button>
            </Box>

            {detallesForm.map((d, index) => (
              <Grid container spacing={2} key={index} sx={{ mb: 1, alignItems: 'center' }}>
                <Grid size={5}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Producto</InputLabel>
                    <Select
                      value={d.productoId}
                      label="Producto"
                      onChange={(e) => {
                        const next = [...detallesForm];
                        next[index].productoId = e.target.value;
                        const prod = productos.find((p) => p.id === e.target.value);
                        next[index].costoUnitario = prod ? prod.costo : 0;
                        setDetallesForm(next);
                      }}
                    >
                      {productos.map((p) => (
                        <MenuItem key={p.id} value={p.id}>
                          {p.descripcion}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={3}>
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    label="Cant"
                    value={d.cantidad}
                    onChange={(e) => {
                      const next = [...detallesForm];
                      next[index].cantidad = Number(e.target.value);
                      setDetallesForm(next);
                    }}
                  />
                </Grid>
                <Grid size={3}>
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    label="Costo"
                    value={d.costoUnitario}
                    onChange={(e) => {
                      const next = [...detallesForm];
                      next[index].costoUnitario = Number(e.target.value);
                      setDetallesForm(next);
                    }}
                  />
                </Grid>
                <Grid size={1}>
                  <IconButton color="error" onClick={() => setDetallesForm(detallesForm.filter((_, i) => i !== index))}>
                    <Delete />
                  </IconButton>
                </Grid>
              </Grid>
            ))}

            <Box sx={{ mt: 3, p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
              <Typography variant="body2">Subtotal Neto: <b>{formatCurrency(facturaForm.subtotal)}</b></Typography>
              <Typography variant="body2">13% IVA: <b>{formatCurrency(facturaForm.iva)}</b></Typography>
              <Typography variant="body2" color="error">
                Retenciones: <b>-{formatCurrency(facturaForm.total ? facturaForm.subtotal + facturaForm.iva - facturaForm.total : 0)}</b>
              </Typography>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mt: 1 }}>
                Líquido por Pagar: <span style={{ color: '#10b981' }}>{formatCurrency(facturaForm.total)}</span>
              </Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCrearFactura(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleCrearFacturaSubmit}>Registrar Factura</Button>
        </DialogActions>
      </Dialog>

      {/* 2. Registrar Pago */}
      <Dialog open={openRegistrarPago} onClose={() => setOpenRegistrarPago(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>Registrar Pago / Póliza de Egresos</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Factura</InputLabel>
              <Select
                value={pagoForm.facturaCompraId}
                label="Factura"
                onChange={(e) => {
                  const fact = facturas.find((f) => f.id === e.target.value);
                  setPagoForm({
                    ...pagoForm,
                    facturaCompraId: e.target.value,
                    monto: fact ? String(fact.total) : '',
                  });
                }}
              >
                {facturas
                  .filter((f) => f.estado === 'APROBADA' || f.estado === 'PAGADA_PARCIAL')
                  .map((f) => (
                    <MenuItem key={f.id} value={f.id}>
                      N°: {f.numeroFactura} — Total: {formatCurrency(f.total)} ({f.proveedor.nombre})
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              type="number"
              label="Monto del Pago"
              value={pagoForm.monto}
              onChange={(e) => setPagoForm({ ...pagoForm, monto: e.target.value })}
            />

            <FormControl fullWidth>
              <InputLabel>Método de Pago</InputLabel>
              <Select
                value={pagoForm.metodoPago}
                label="Método de Pago"
                onChange={(e) => setPagoForm({ ...pagoForm, metodoPago: e.target.value })}
              >
                <MenuItem value="TRANSFERENCIA">Transferencia Electrónica</MenuItem>
                <MenuItem value="CHEQUE">Cheque de Caja</MenuItem>
                <MenuItem value="DEPOSITO">Depósito Bancario</MenuItem>
                <MenuItem value="EFECTIVO">Efectivo (Caja Chica)</MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Referencia / N° Transacción"
              value={pagoForm.referencia}
              onChange={(e) => setPagoForm({ ...pagoForm, referencia: e.target.value })}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenRegistrarPago(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleRegistrarPagoSubmit}>Confirmar Pago</Button>
        </DialogActions>
      </Dialog>

      {/* 3. Registrar Nota de Ajuste */}
      <Dialog open={openRegistrarNota} onClose={() => setOpenRegistrarNota(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>Registrar Nota de Crédito / Débito</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Tipo de Ajuste</InputLabel>
              <Select
                value={notaForm.tipo}
                label="Tipo de Ajuste"
                onChange={(e) => setNotaForm({ ...notaForm, tipo: e.target.value })}
              >
                <MenuItem value="CREDITO">Nota de Crédito (Disminuye saldo por cobrar/pagar)</MenuItem>
                <MenuItem value="DEBITO">Nota de Débito (Aumenta saldo por cobrar/pagar)</MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Número de la Nota"
              value={notaForm.numeroNota}
              onChange={(e) => setNotaForm({ ...notaForm, numeroNota: e.target.value })}
            />

            <FormControl fullWidth>
              <InputLabel>Factura a Afectar</InputLabel>
              <Select
                value={notaForm.facturaCompraId}
                label="Factura a Afectar"
                onChange={(e) => setNotaForm({ ...notaForm, facturaCompraId: e.target.value })}
              >
                {facturas.map((f) => (
                  <MenuItem key={f.id} value={f.id}>
                    Factura: {f.numeroFactura} (Saldo actual: {formatCurrency(f.total)}) — {f.proveedor.nombre}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              type="number"
              label="Monto del Ajuste"
              value={notaForm.monto}
              onChange={(e) => setNotaForm({ ...notaForm, monto: e.target.value })}
            />

            <FormControl fullWidth>
              <InputLabel>Concepto</InputLabel>
              <Select
                value={notaForm.concepto}
                label="Concepto"
                onChange={(e) => setNotaForm({ ...notaForm, concepto: e.target.value })}
              >
                <MenuItem value="DEVOLUCION">Devolución de Producto</MenuItem>
                <MenuItem value="AJUSTE_PRECIO">Ajuste de Precio Acordado</MenuItem>
                <MenuItem value="DESCUENTO">Descuento Comercial Especial</MenuItem>
                <MenuItem value="CORRECCION">Corrección Administrativa de Error</MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              multiline
              rows={2}
              label="Motivo detallado"
              value={notaForm.motivo}
              onChange={(e) => setNotaForm({ ...notaForm, motivo: e.target.value })}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenRegistrarNota(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleRegistrarNotaSubmit}>Registrar Nota</Button>
        </DialogActions>
      </Dialog>

      {/* 4. Editar Proveedor */}
      <Dialog open={openEditarProveedor} onClose={() => setOpenEditarProveedor(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>Datos Fiscales de Proveedor</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
              Proveedor: {proveedorForm.nombre}
            </Typography>
            <TextField
              fullWidth
              label="NIT (Número de Identificación Tributaria)"
              value={proveedorForm.nit}
              onChange={(e) => setProveedorForm({ ...proveedorForm, nit: e.target.value })}
            />
            <TextField
              fullWidth
              label="NRC (Número de Registro de Contribuyente)"
              value={proveedorForm.nrc}
              onChange={(e) => setProveedorForm({ ...proveedorForm, nrc: e.target.value })}
            />
            <FormControl fullWidth>
              <InputLabel>Clasificación de Contribuyente</InputLabel>
              <Select
                value={proveedorForm.tipoContribuyente}
                label="Clasificación de Contribuyente"
                onChange={(e) => setProveedorForm({ ...proveedorForm, tipoContribuyente: e.target.value })}
              >
                <MenuItem value="GRAN_CONTRIBUYENTE">Gran Contribuyente (Exento de retención 1% de IVA)</MenuItem>
                <MenuItem value="MEDIANO">Mediano Contribuyente</MenuItem>
                <MenuItem value="PEQUENO">Pequeño Contribuyente</MenuItem>
                <MenuItem value="OTROS">Otros / Persona Natural</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              type="number"
              label="Límite de Crédito Autorizado"
              value={proveedorForm.limiteCredito}
              onChange={(e) => setProveedorForm({ ...proveedorForm, limiteCredito: e.target.value })}
            />
            <FormControl fullWidth>
              <InputLabel>Moneda Comercial</InputLabel>
              <Select
                value={proveedorForm.moneda}
                label="Moneda Comercial"
                onChange={(e) => setProveedorForm({ ...proveedorForm, moneda: e.target.value })}
              >
                <MenuItem value="USD">Dólar de los Estados Unidos (USD)</MenuItem>
                <MenuItem value="SVC">Colón Salvadoreño (SVC)</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEditarProveedor(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleActualizarProveedorSubmit}>Guardar Cambios</Button>
        </DialogActions>
      </Dialog>

      {/* 5. Subir Movimiento Banco */}
      <Dialog open={openRegistrarCartola} onClose={() => setOpenRegistrarCartola(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>Simular Movimiento de Cartola Bancaria</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label="Referencia Banco (N° de Depósito / Retiro)"
              value={cartolaForm.referenciaBanco}
              onChange={(e) => setCartolaForm({ ...cartolaForm, referenciaBanco: e.target.value })}
            />
            <TextField
              fullWidth
              type="number"
              label="Monto del Movimiento"
              value={cartolaForm.monto}
              onChange={(e) => setCartolaForm({ ...cartolaForm, monto: e.target.value })}
            />
            <FormControl fullWidth>
              <InputLabel>Tipo de Transacción</InputLabel>
              <Select
                value={cartolaForm.tipo}
                label="Tipo de Transacción"
                onChange={(e) => setCartolaForm({ ...cartolaForm, tipo: e.target.value })}
              >
                <MenuItem value="RETIRO">Retiro / Egreso (Pago / Transferencia)</MenuItem>
                <MenuItem value="DEPOSITO">Depósito / Ingreso</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              multiline
              rows={2}
              label="Observaciones"
              value={cartolaForm.observaciones}
              onChange={(e) => setCartolaForm({ ...cartolaForm, observaciones: e.target.value })}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenRegistrarCartola(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleCrearCartolaSubmit}>Registrar Línea</Button>
        </DialogActions>
      </Dialog>

      {/* 6. Mapeo de Cuentas */}
      <Dialog open={openConfigMap} onClose={() => setOpenConfigMap(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>Mapeo de Cuentas del Sistema</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {Object.keys(configForm).map((k) => (
              <TextField
                key={k}
                fullWidth
                label={`Código de cuenta para: ${k.replace(/_/g, ' ').toUpperCase()}`}
                value={configForm[k]}
                onChange={(e) => setConfigForm({ ...configForm, [k]: e.target.value })}
              />
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenConfigMap(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleGuardarConfigSubmit}>Guardar Configuración</Button>
        </DialogActions>
      </Dialog>

      {/* 7. Ver Factura Detalles */}
      <Dialog open={openVerFactura} onClose={() => setOpenVerFactura(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>Detalles de la Factura de Compra</DialogTitle>
        <DialogContent>
          {selectedFactura && (
            <Box sx={{ mt: 2 }}>
              <Grid container spacing={2}>
                <Grid size={6}>
                  <Typography variant="caption" color="text.secondary">Número de Factura</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 'bold' }}>{selectedFactura.numeroFactura}</Typography>
                </Grid>
                <Grid size={6}>
                  <Typography variant="caption" color="text.secondary">Proveedor</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 'bold' }}>{selectedFactura.proveedor.nombre}</Typography>
                </Grid>
                <Grid size={6}>
                  <Typography variant="caption" color="text.secondary">Fecha de Emisión</Typography>
                  <Typography variant="body1">{new Date(selectedFactura.fechaEmision).toLocaleDateString()}</Typography>
                </Grid>
                <Grid size={6}>
                  <Typography variant="caption" color="text.secondary">Fecha de Vencimiento</Typography>
                  <Typography variant="body1" color="error">{new Date(selectedFactura.fechaVencimiento).toLocaleDateString()}</Typography>
                </Grid>
                <Grid size={6}>
                  <Typography variant="caption" color="text.secondary">Estado de Match</Typography>
                  <Typography variant="body1">
                    <Chip label={selectedFactura.matchStatus} size="small" />
                  </Typography>
                </Grid>
                <Grid size={6}>
                  <Typography variant="caption" color="text.secondary">Asiento Contable Relacionado</Typography>
                  <Typography variant="body1" color="primary" sx={{ fontWeight: 'bold' }}>
                    {selectedFactura.asientoId || 'No Contabilizada'}
                  </Typography>
                </Grid>
              </Grid>

              <Divider sx={{ my: 3 }} />

              <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>Detalle de Líneas</Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Producto</TableCell>
                    <TableCell align="right">Cantidad</TableCell>
                    <TableCell align="right">Costo Unitario</TableCell>
                    <TableCell align="right">Total Línea</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {selectedFactura.detalles?.map((d: any) => (
                    <TableRow key={d.id}>
                      <TableCell>{d.producto?.descripcion}</TableCell>
                      <TableCell align="right">{d.cantidad}</TableCell>
                      <TableCell align="right">{formatCurrency(d.costoUnitario)}</TableCell>
                      <TableCell align="right">{formatCurrency(d.subtotal)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenVerFactura(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      {/* 8. Crear Cuenta Contable */}
      <Dialog open={openCrearCuenta} onClose={() => setOpenCrearCuenta(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>Crear Nueva Cuenta Contable</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label="Código de Cuenta (ej: 1.1.01.03)"
              value={cuentaForm.codigo}
              onChange={(e) => setCuentaForm({ ...cuentaForm, codigo: e.target.value })}
            />
            <TextField
              fullWidth
              label="Nombre de la Cuenta"
              value={cuentaForm.nombre}
              onChange={(e) => setCuentaForm({ ...cuentaForm, nombre: e.target.value })}
            />
            <FormControl fullWidth>
              <InputLabel>Tipo de Cuenta</InputLabel>
              <Select
                value={cuentaForm.tipo}
                label="Tipo de Cuenta"
                onChange={(e) => setCuentaForm({ ...cuentaForm, tipo: e.target.value })}
              >
                <MenuItem value="ACTIVO">ACTIVO</MenuItem>
                <MenuItem value="PASIVO">PASIVO</MenuItem>
                <MenuItem value="PATRIMONIO">PATRIMONIO</MenuItem>
                <MenuItem value="INGRESO">INGRESO</MenuItem>
                <MenuItem value="COSTO">COSTO</MenuItem>
                <MenuItem value="GASTO">GASTO</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              type="number"
              label="Nivel (1: Grupo, 2: Subgrupo, 3: Mayor, 4: Auxiliar/Detalle)"
              value={cuentaForm.nivel}
              onChange={(e) => setCuentaForm({ ...cuentaForm, nivel: Number(e.target.value) })}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCrearCuenta(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleCrearCuentaSubmit}>Crear Cuenta</Button>
        </DialogActions>
      </Dialog>

      {/* 9. Editar Cuenta Contable */}
      <Dialog open={openEditarCuenta} onClose={() => setOpenEditarCuenta(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>Editar Cuenta Contable</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Código de Cuenta: <strong>{cuentaForm.codigo}</strong>
            </Typography>
            <TextField
              fullWidth
              label="Nombre de la Cuenta"
              value={cuentaForm.nombre}
              onChange={(e) => setCuentaForm({ ...cuentaForm, nombre: e.target.value })}
            />
            <FormControl fullWidth>
              <InputLabel>Tipo de Cuenta</InputLabel>
              <Select
                value={cuentaForm.tipo}
                label="Tipo de Cuenta"
                onChange={(e) => setCuentaForm({ ...cuentaForm, tipo: e.target.value })}
              >
                <MenuItem value="ACTIVO">ACTIVO</MenuItem>
                <MenuItem value="PASIVO">PASIVO</MenuItem>
                <MenuItem value="PATRIMONIO">PATRIMONIO</MenuItem>
                <MenuItem value="INGRESO">INGRESO</MenuItem>
                <MenuItem value="COSTO">COSTO</MenuItem>
                <MenuItem value="GASTO">GASTO</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Estado</InputLabel>
              <Select
                value={cuentaForm.estado}
                label="Estado"
                onChange={(e) => setCuentaForm({ ...cuentaForm, estado: e.target.value })}
              >
                <MenuItem value="ACTIVO">ACTIVO</MenuItem>
                <MenuItem value="INACTIVO">INACTIVO</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEditarCuenta(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleEditarCuentaSubmit}>Guardar Cambios</Button>
        </DialogActions>
      </Dialog>

      {/* Confirmar Limpiar Pruebas */}
      <Dialog open={openConfirmLimpiar} onClose={() => setOpenConfirmLimpiar(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1, color: 'error.main' }}>
          <Warning color="error" /> ¿Confirmar Limpieza?
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mt: 1 }}>
            ¿Está absolutamente seguro de que desea eliminar todos los datos de prueba del módulo contable?
            <br /><br />
            Esta acción borrará:
            <ul>
              <li>Facturas de Compra</li>
              <li>Pagos y Egresos</li>
              <li>Notas de Crédito y Débito</li>
              <li>Asientos Contables</li>
              <li>Conciliaciones Bancarias</li>
            </ul>
            El catálogo de cuentas se restablecerá a su estado inicial.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenConfirmLimpiar(false)}>Cancelar</Button>
          <Button variant="contained" color="error" onClick={executeLimpiarDatosPrueba}>
            Sí, borrar todo
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
