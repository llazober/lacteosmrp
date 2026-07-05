import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
  Divider,
  LinearProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  PlayArrow,
  CheckCircle,
  AccountTree,
  Timer,
  Biotech,
  Warehouse,
  History,
  Comment,
  ReportProblem,
  QrCode,
} from '@mui/icons-material';
import { apiFetch, useAuthStore } from '../store/useAuthStore';
import dayjs from 'dayjs';

// Work centers are now loaded dynamically from the backend

export default function RutaOperaciones() {
  const [activeTab, setActiveTab] = useState(0);
  const [ordenes, setOrdenes] = useState<any[]>([]);
  const [centrosTrabajo, setCentrosTrabajo] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Formulario de finalización
  const [openFinalizar, setOpenFinalizar] = useState(false);
  const [selectedOrden, setSelectedOrden] = useState<any>(null);
  const [currentWcId, setCurrentWcId] = useState<string>('');
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [currentFields, setCurrentFields] = useState<any[]>([]);
  
  // Modal de Historial de Ruta
  const [openHistorial, setOpenHistorial] = useState(false);
  const [historialOrden, setHistorialOrden] = useState<any>(null);
  
  // Campos finales para el último paso
  const [cantidadProducida, setCantidadProducida] = useState('');
  const [loteNumero, setLoteNumero] = useState('');

  // Modal Código de Barras
  const [openBarcodeModal, setOpenBarcodeModal] = useState(false);
  const [barcodeLabelQty, setBarcodeLabelQty] = useState(1);

  // Notas/Observaciones de Desviación
  const [openNotas, setOpenNotas] = useState(false);
  const [notasTexto, setNotasTexto] = useState('');
  const [notasWcId, setNotasWcId] = useState('');
  const [savingNotas, setSavingNotas] = useState(false);

  const [now, setNow] = useState(new Date());

  // Inicio de Operación / Asignación de Operario
  const [openComenzar, setOpenComenzar] = useState(false);
  const [comenzarOrdenId, setComenzarOrdenId] = useState('');
  const [comenzarWcId, setComenzarWcId] = useState('');
  const [operarioSeleccionado, setOperarioSeleccionado] = useState('');
  const [listaUsuarios, setListaUsuarios] = useState<any[]>([]);

  useEffect(() => {
    cargarCentrosTrabajo();
    cargarOrdenes();
    cargarUsuarios();
    const timer = setInterval(() => {
      setNow(new Date());
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const cargarCentrosTrabajo = async () => {
    try {
      const wcs = await apiFetch('/produccion/centros-trabajo');
      setCentrosTrabajo(wcs);
    } catch (e) {
      console.error('Error al cargar centros de trabajo', e);
    }
  };

  const cargarOrdenes = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await apiFetch('/produccion/operaciones/activas');
      setOrdenes(data);
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e.message || 'Error al cargar las órdenes activas.');
    } finally {
      setLoading(false);
    }
  };

  const cargarUsuarios = async () => {
    try {
      const users = await apiFetch('/usuarios');
      setListaUsuarios(users || []);
    } catch (e) {
      console.log('No se pudo cargar la lista de usuarios (falta de permisos), se usará texto manual.');
    }
  };

  const getActiveWorkCenter = (orden: any) => {
    let activeWc: string | null = null;

    if (!orden.operaciones || orden.operaciones.length === 0) {
      // Sin operaciones: el primer Centro de Trabajo activo es el primero de la lista global
      if ((orden.estado === 'PLANIFICADA' || orden.estado === 'FALTANTES') && centrosTrabajo.length > 0) {
        activeWc = centrosTrabajo[0].id;
      }
    } else {
      const inProgress = orden.operaciones.find((op: any) => op.estado === 'EN_PROCESO');
      if (inProgress) {
        activeWc = inProgress.workCenter;
      } else {
        // Ordenar por campo `orden` guardado en la operación
        const orderOps = [...orden.operaciones].sort((a, b) => a.orden - b.orden);
        const nextOp = orderOps.find((op: any) => op.estado === 'PENDIENTE');
        if (nextOp) activeWc = nextOp.workCenter;
      }
    }

    // Si el work center activo es el primero y el picking no está completado, ocultar
    const firstWc = centrosTrabajo.length > 0 ? centrosTrabajo[0].id : null;
    if (activeWc && activeWc === firstWc && !orden.pickingCompletado) {
      return null;
    }

    return activeWc;
  };

  const handleComenzar = async (ordenId: string, wcId: string, operatorName?: string) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await apiFetch(`/produccion/operaciones/${ordenId}/${wcId}/comenzar`, {
        method: 'POST',
        body: JSON.stringify({ usuarioNombre: operatorName }),
      });
      setSuccessMsg(`Operación iniciada con éxito.`);
      await cargarOrdenes();
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e.message || 'Error al iniciar la operación.');
    }
  };

  const handleOpenComenzar = (ordenId: string, wcId: string) => {
    const currentUser = useAuthStore.getState().usuario;
    setComenzarOrdenId(ordenId);
    setComenzarWcId(wcId);
    setOperarioSeleccionado(currentUser?.nombre || '');
    setOpenComenzar(true);
  };

  const handleConfirmarComenzar = async () => {
    setOpenComenzar(false);
    await handleComenzar(comenzarOrdenId, comenzarWcId, operarioSeleccionado);
  };

  const handleOpenFinalizar = (orden: any, wcId: string) => {
    setSelectedOrden(orden);
    setCurrentWcId(wcId);
    
    const operacion = orden.operaciones.find((o: any) => o.workCenter === wcId);
    setNotasTexto(operacion?.notas || '');

    // Obtener campos requeridos dinámicos desde la operación guardada en la orden
    let fields: any[] = [];
    if (operacion && operacion.datosRequeridos) {
      try {
        fields = typeof operacion.datosRequeridos === 'string'
          ? JSON.parse(operacion.datosRequeridos)
          : operacion.datosRequeridos;
      } catch (e) {
        console.error('Error parsing custom fields:', e);
      }
    }
    // Fallback: buscar en centrosTrabajo si la operación no tiene campos propios
    if (fields.length === 0) {
      const ct = centrosTrabajo.find((c: any) => c.id === wcId);
      if (ct && ct.datosRequeridos) {
        try {
          fields = typeof ct.datosRequeridos === 'string' ? JSON.parse(ct.datosRequeridos) : ct.datosRequeridos;
        } catch {}
      }
    }
    
    // Filtrar ubicacion_camara para Cámara Fría
    if (wcId === 'WC-CFRI') {
      fields = fields.filter((f: any) => f.name !== 'ubicacion_camara');
    }
    
    setCurrentFields(fields);

    // Inicializar inputs vacíos
    const initialData: Record<string, string> = {};
    fields.forEach((f: any) => {
      initialData[f.name] = '';
    });
    setFormData(initialData);

    // Si es Cámara Fría, sugerir lote y peso
    if (wcId === 'WC-CFRI') {
      const empaqueOp = orden.operaciones.find((o: any) => o.workCenter === 'WC-EMPA');
      let defaultQty = orden.cantidadPlanificada.toString();
      if (empaqueOp && empaqueOp.datosJson) {
        try {
          const parsed = JSON.parse(empaqueOp.datosJson);
          if (parsed.peso_neto_total) {
            defaultQty = parsed.peso_neto_total;
          }
        } catch (e) {
          console.error('Error parseando datos de empaque:', e);
        }
      }
      setCantidadProducida(defaultQty);
      
      const cleanSku = orden.receta.productoFinal.sku.replace('PROD-', '');
      const dateStr = dayjs().format('YYYYMMDD');
      setLoteNumero(`L-${cleanSku}-${dateStr}`);
    }

    setOpenFinalizar(true);
  };

  const handleFieldChange = (name: string, value: string) => {
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const printBarcode = (orden: any, loteNum: string, qty: number = 1) => {
    if (!orden) return;
    const prod = orden.receta.productoFinal;
    const isPT = prod.tipoProducto === 'PT' || prod.tipoProducto === 'PRODUCTO_TERMINADO';
    const barcodeData = isPT ? `${prod.prodId || ''}#${loteNum}` : loteNum;
    const barcodeUrl = `https://barcode.tec-it.com/barcode.ashx?data=${encodeURIComponent(
      barcodeData
    )}&code=Code128`;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    let labelsHtml = '';
    for (let i = 0; i < qty; i++) {
      labelsHtml += `
        <div class="label-container" style="${i > 0 ? 'page-break-before: always;' : ''}">
          <div class="title">${prod.descripcion || prod.nombre}</div>
          <div class="subtitle">SKU: ${prod.sku} | Lote: ${loteNum}</div>
          <img class="barcode-img" src="${barcodeUrl}" alt="Barcode" />
          <div class="code-text">${barcodeData}</div>
        </div>
      `;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Imprimir Lote - ${loteNum}</title>
          <style>
            @page {
              size: auto;
              margin: 0mm;
            }
            body {
              font-family: 'Courier New', Courier, monospace;
              text-align: center;
              margin: 0;
              padding: 20px;
            }
            .label-container {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 100%;
              box-sizing: border-box;
            }
            .title {
              font-size: 16px;
              font-weight: bold;
              margin-bottom: 2px;
            }
            .subtitle {
              font-size: 11px;
              margin-bottom: 10px;
              color: #555;
            }
            .barcode-img {
              max-width: 100%;
              height: 65px;
            }
            .code-text {
              font-size: 12px;
              margin-top: 5px;
              font-weight: bold;
              letter-spacing: 1px;
            }
          </style>
        </head>
        <body>
          ${labelsHtml}
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
                window.close();
              }, 600);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleOpenNotas = (orden: any, wcId: string) => {
    setSelectedOrden(orden);
    setNotasWcId(wcId);
    const operacion = orden.operaciones.find((o: any) => o.workCenter === wcId);
    setNotasTexto(operacion?.notas || '');
    setOpenNotas(true);
  };

  const handleSaveNotas = async () => {
    if (!selectedOrden) return;
    setSavingNotas(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await apiFetch(`/produccion/operaciones/${selectedOrden.id}/${notasWcId}/notas`, {
        method: 'PUT',
        body: JSON.stringify({ notas: notasTexto }),
      });
      setSuccessMsg('Notas/Desviación guardadas correctamente.');
      setOpenNotas(false);
      await cargarOrdenes();
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e.message || 'Error al guardar las notas.');
    } finally {
      setSavingNotas(false);
    }
  };

  const handleConfirmarFinalizar = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const payload: any = {
        datosJson: formData,
        notas: notasTexto,
      };

      if (currentWcId) {
        // Detectar el último paso de la orden seleccionada dinámicamente
        const opsSorted = selectedOrden?.operaciones
          ? [...selectedOrden.operaciones].sort((a: any, b: any) => a.orden - b.orden)
          : [];
        const lastWcId = opsSorted.length > 0 ? opsSorted[opsSorted.length - 1].workCenter : null;
        const isLastStep = lastWcId && currentWcId === lastWcId;

        if (isLastStep) {
          if (!cantidadProducida || !loteNumero) {
            throw new Error('La cantidad producida y el lote final son requeridos para completar el proceso.');
          }
          const prod = selectedOrden?.receta?.productoFinal;
          if (prod && prod.unidadMedida?.toUpperCase() === 'UNIDAD') {
            if (parseFloat(cantidadProducida) % 1 !== 0) {
              throw new Error(`Para el producto "${prod.descripcion}" (Unidades), la cantidad producida debe ser un número entero.`);
            }
          }
          payload.cantidadProducida = parseFloat(cantidadProducida);
          payload.loteNumero = loteNumero;
        }
      }

      await apiFetch(`/produccion/operaciones/${selectedOrden.id}/${currentWcId}/finalizar`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      const opsSortedMsg = selectedOrden?.operaciones
        ? [...selectedOrden.operaciones].sort((a: any, b: any) => a.orden - b.orden)
        : [];
      const lastWcIdMsg = opsSortedMsg.length > 0 ? opsSortedMsg[opsSortedMsg.length - 1].workCenter : null;
      setSuccessMsg(
        lastWcIdMsg && currentWcId === lastWcIdMsg
          ? `¡Lote de producción completado y registrado en el inventario con éxito!`
          : `Operación finalizada. La orden avanzó al siguiente paso.`
      );
      setOpenFinalizar(false);
      setSelectedOrden(null);
      await cargarOrdenes();
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e.message || 'Error al completar la operación.');
    }
  };

  // Calcular las pestañas visibles: sólo los centros de trabajo que tienen órdenes activas
  const activeWcIds = new Set(ordenes.map((o) => getActiveWorkCenter(o)).filter(Boolean));
  const visibleCentros = centrosTrabajo.filter((wc) => activeWcIds.has(wc.id));
  // Si no hay órdenes activas, mostrar todos los centros de trabajo
  const displayCentros = visibleCentros.length > 0 ? visibleCentros : centrosTrabajo;
  const targetWc = displayCentros[activeTab]?.id || '';
  const filteredOrdenes = ordenes.filter((o) => getActiveWorkCenter(o) === targetWc);

  const getFormatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins < 60) return `${mins}m ${secs}s`;
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `${hrs}h ${remMins}m`;
  };

  return (
    <Box sx={{ p: 3, height: '100%', overflowY: 'auto' }}>
      {/* Encabezado Principal */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <AccountTree sx={{ fontSize: 36, color: 'primary.main' }} /> Ruta de Operaciones Lácteas
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Tablero Kanban interactivo para registrar en tiempo real los controles de calidad e inventario por cada centro de trabajo.
          </Typography>
        </Box>
        <Button variant="outlined" onClick={cargarOrdenes} disabled={loading}>
          Actualizar Tablero
        </Button>
      </Box>

      {/* Alertas */}
      {successMsg && (
        <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setSuccessMsg(null)}>
          {successMsg}
        </Alert>
      )}
      {errorMsg && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setErrorMsg(null)}>
          {errorMsg}
        </Alert>
      )}

      {/* Pestañas de Navegación por Work Center */}
      <Paper sx={{ mb: 4, backgroundColor: '#111827', borderRadius: 2, overflow: 'hidden' }}>
        <Tabs
          value={Math.min(activeTab, displayCentros.length - 1)}
          onChange={(_, val) => setActiveTab(val)}
          textColor="primary"
          indicatorColor="primary"
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}
        >
          {displayCentros.map((wc: any) => {
            const count = ordenes.filter((o) => getActiveWorkCenter(o) === wc.id).length;
            return (
              <Tab
                key={wc.id}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography sx={{ fontSize: '0.85rem', fontWeight: 700 }}>{wc.nombre || wc.id}</Typography>
                    {count > 0 && (
                      <Chip
                        label={count}
                        size="small"
                        color="primary"
                        sx={{ height: 18, fontSize: '0.7rem', fontWeight: 800 }}
                      />
                    )}
                  </Box>
                }
              />
            );
          })}
        </Tabs>
        {displayCentros[activeTab] && (
          <Box sx={{ p: 2, bgcolor: 'rgba(255, 255, 255, 0.01)' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
              {displayCentros[activeTab].nombre}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {displayCentros[activeTab].descripcion}
            </Typography>
          </Box>
        )}
      </Paper>

      {/* Tablero Kanban */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Box>
          {filteredOrdenes.length === 0 ? (
            <Paper sx={{ p: 6, textAlign: 'center', backgroundColor: '#111827', borderRadius: 2 }}>
              <Typography color="text.secondary">No hay órdenes de producción activas en este centro de trabajo.</Typography>
            </Paper>
          ) : (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: '1fr 1fr', lg: '1fr 1fr 1fr' },
                gap: 3,
              }}
            >
              {filteredOrdenes.map((orden) => {
                const operacion = orden.operaciones.find((o: any) => o.workCenter === targetWc);
                const isStarted = operacion?.estado === 'EN_PROCESO';

                // Calcular si es horas extra (overtime)
                let isOvertimeCard = false;
                if (isStarted && operacion?.fechaInicio) {
                  const elapsedMinutes = (now.getTime() - new Date(operacion.fechaInicio).getTime()) / 60000;
                  const expectedMin = operacion.duracionEstimada || 30;
                  isOvertimeCard = elapsedMinutes > expectedMin;
                }

                // Buscar datos de pasos anteriores para mostrar como historial
                const completedSteps = orden.operaciones.filter((o: any) => o.estado === 'COMPLETADA');

                return (
                  <Box key={orden.id}>
                    <Card
                      sx={{
                        backgroundColor: '#111827',
                        borderRadius: 3,
                        border: '1px solid',
                        borderColor: isOvertimeCard 
                          ? 'error.main' 
                          : (isStarted ? 'primary.main' : 'rgba(255, 255, 255, 0.08)'),
                        boxShadow: isOvertimeCard
                          ? '0 0 15px rgba(239, 68, 68, 0.25)'
                          : (isStarted ? '0 0 15px rgba(2, 132, 199, 0.15)' : 'none'),
                        transition: 'all 0.3s ease',
                        position: 'relative',
                        overflow: 'hidden',
                        '&:hover': {
                          transform: 'translateY(-4px)',
                          boxShadow: isOvertimeCard
                            ? '0 6px 20px rgba(239, 68, 68, 0.4)'
                            : (isStarted
                              ? '0 6px 20px rgba(2, 132, 199, 0.25)'
                              : '0 4px 15px rgba(0, 0, 0, 0.4)'),
                        },
                        ...(isStarted && {
                          animation: isOvertimeCard 
                            ? 'pulseRed 1s infinite ease-in-out' 
                            : 'pulseGreen 2s infinite ease-in-out',
                          '@keyframes pulseGreen': {
                            '0%': { borderColor: 'rgba(2, 132, 199, 0.5)' },
                            '50%': { borderColor: 'rgba(16, 185, 129, 0.9)' },
                            '100%': { borderColor: 'rgba(2, 132, 199, 0.5)' },
                          },
                          '@keyframes pulseRed': {
                            '0%': { borderColor: 'rgba(239, 68, 68, 0.4)', boxShadow: '0 0 5px rgba(239, 68, 68, 0.2)' },
                            '50%': { borderColor: 'rgba(239, 68, 68, 1)', boxShadow: '0 0 20px rgba(239, 68, 68, 0.5)' },
                            '100%': { borderColor: 'rgba(239, 68, 68, 0.4)', boxShadow: '0 0 5px rgba(239, 68, 68, 0.2)' },
                          },
                        }),
                      }}
                    >
                      <CardContent sx={{ p: 3 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                          <Typography variant="h6" sx={{ fontWeight: 800, color: 'primary.light' }}>
                            {orden.numeroOrden}
                          </Typography>
                          <Chip
                            label={isStarted ? 'EN PROCESO' : 'PENDIENTE'}
                            size="small"
                            color={isStarted ? 'success' : 'default'}
                            sx={{ fontWeight: 800, fontSize: '0.75rem' }}
                          />
                        </Box>

                        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>
                          {orden.receta.nombre}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          {orden.receta.productoFinal.descripcion} ({orden.receta.productoFinal.sku})
                        </Typography>

                        <Divider sx={{ my: 1.5, borderColor: 'rgba(255, 255, 255, 0.06)' }} />

                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2 }}>
                          <Box>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                              Cant. Planificada:
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 700 }}>
                              {orden.cantidadPlanificada} {orden.receta.productoFinal.unidadMedida}
                            </Typography>
                          </Box>
                          <Box>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                              Responsable:
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 700 }}>
                              {orden.responsable?.nombre || 'No asignado'}
                            </Typography>
                          </Box>
                        </Box>

                        {operacion?.usuarioNombre && (
                          <Box sx={{ mb: 2, p: 1.5, borderRadius: 2, backgroundColor: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)', display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                              👤 Operario:
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 700, color: 'primary.light' }}>
                              {operacion.usuarioNombre}
                            </Typography>
                          </Box>
                        )}

                        {isStarted && operacion.fechaInicio && (() => {
                          const elapsedMinutes = Math.max(
                            0,
                            (now.getTime() - new Date(operacion.fechaInicio).getTime()) / 60000
                          );
                          const expectedMin = operacion.duracionEstimada || 30;
                          const progressPercent = Math.min(100, (elapsedMinutes / expectedMin) * 100);
                          const isOvertime = elapsedMinutes > expectedMin;

                          // Formatear transcurrido
                          let timeDisplay = `${Math.round(elapsedMinutes)} min`;
                          if (elapsedMinutes >= 60) {
                            const hrs = Math.floor(elapsedMinutes / 60);
                            const mins = Math.round(elapsedMinutes % 60);
                            timeDisplay = `${hrs}h ${mins}m`;
                          }

                          return (
                            <Box sx={{ mb: 2 }}>
                              <Box
                                sx={{
                                  p: 1.5,
                                  borderRadius: 2,
                                  backgroundColor: isOvertime
                                    ? 'rgba(239, 68, 68, 0.05)'
                                    : 'rgba(16, 185, 129, 0.05)',
                                  border: '1px solid',
                                  borderColor: isOvertime
                                    ? 'rgba(239, 68, 68, 0.2)'
                                    : 'rgba(16, 185, 129, 0.15)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 1,
                                  mb: 1,
                                }}
                              >
                                <Timer sx={{ color: isOvertime ? 'error.main' : 'success.main', fontSize: 18 }} />
                                <Box sx={{ flex: 1 }}>
                                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Typography variant="caption" color="text.secondary">
                                      Iniciado el:
                                    </Typography>
                                    {isOvertime && (
                                      <Chip
                                        label="Excedido"
                                        size="small"
                                        color="error"
                                        sx={{ height: 16, fontSize: '0.65rem', fontWeight: 800 }}
                                      />
                                    )}
                                  </Box>
                                  <Typography variant="body2" sx={{ fontWeight: 700, color: isOvertime ? 'error.light' : 'success.light' }}>
                                    {dayjs(operacion.fechaInicio).format('DD/MM HH:mm:ss')}
                                  </Typography>
                                </Box>
                              </Box>

                              <Box sx={{ px: 0.5 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                                  <Typography variant="caption" color="text.secondary">
                                    Transcurrido: <span style={{ fontWeight: 700, color: '#fff' }}>{timeDisplay}</span>
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    Meta: {expectedMin >= 60 ? `${(expectedMin / 60).toFixed(1)}h` : `${expectedMin}m`}
                                  </Typography>
                                </Box>
                                <LinearProgress
                                  variant="determinate"
                                  value={progressPercent}
                                  color={isOvertime ? 'error' : 'success'}
                                  sx={{ height: 6, borderRadius: 3 }}
                                />
                                {isOvertime && (
                                  <Box sx={{ mt: 1.5 }}>
                                    <Button
                                      fullWidth
                                      size="small"
                                      variant="outlined"
                                      color="error"
                                      startIcon={<ReportProblem />}
                                      onClick={() => handleOpenNotas(orden, targetWc)}
                                      sx={{
                                        textTransform: 'none',
                                        fontSize: '0.72rem',
                                        fontWeight: 800,
                                        borderRadius: 2,
                                        borderWidth: 2,
                                        borderColor: 'error.main',
                                        color: 'error.light',
                                        '&:hover': {
                                          borderWidth: 2,
                                          backgroundColor: 'rgba(239, 68, 68, 0.08)',
                                        }
                                      }}
                                    >
                                      Registrar Desviación de Tiempo
                                    </Button>
                                  </Box>
                                )}
                              </Box>
                            </Box>
                          );
                        })()}

                        <Box sx={{ mt: 2, display: 'flex', gap: 1.5, justifyContent: 'center', flexWrap: 'wrap' }}>
                          {completedSteps.length > 0 && (
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<History sx={{ fontSize: 16 }} />}
                              onClick={() => {
                                setHistorialOrden(orden);
                                setOpenHistorial(true);
                              }}
                              sx={{
                                textTransform: 'none',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                py: 0.5,
                                px: 1.5,
                                borderRadius: 2,
                                borderColor: 'rgba(255, 255, 255, 0.12)',
                                color: 'text.secondary',
                                '&:hover': {
                                  borderColor: 'primary.main',
                                  color: 'primary.light',
                                  backgroundColor: 'rgba(2, 132, 199, 0.08)',
                                },
                              }}
                            >
                              Historial ({completedSteps.length})
                            </Button>
                          )}

                          {isStarted && (
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<Comment sx={{ fontSize: 16 }} />}
                              onClick={() => handleOpenNotas(orden, targetWc)}
                              sx={{
                                textTransform: 'none',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                py: 0.5,
                                px: 1.5,
                                borderRadius: 2,
                                borderColor: operacion?.notas ? 'success.main' : 'rgba(255, 255, 255, 0.12)',
                                color: operacion?.notas ? 'success.light' : 'text.secondary',
                                '&:hover': {
                                  borderColor: 'primary.main',
                                  color: 'primary.light',
                                  backgroundColor: 'rgba(2, 132, 199, 0.08)',
                                },
                              }}
                            >
                              {operacion?.notas ? 'Editar Notas' : 'Notas/Desviación'}
                            </Button>
                          )}

                          {targetWc === 'WC-EMPA' && (
                            <Button
                              size="small"
                              variant="outlined"
                              color="primary"
                              startIcon={<QrCode sx={{ fontSize: 16 }} />}
                              onClick={() => {
                                const cleanSku = orden.receta.productoFinal.sku.replace('PROD-', '');
                                const dateStr = dayjs(orden.fechaInicio || new Date()).format('YYYYMMDD');
                                const loteNum = `L-${cleanSku}-${dateStr}`;
                                printBarcode(orden, loteNum);
                              }}
                              sx={{
                                textTransform: 'none',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                py: 0.5,
                                px: 1.5,
                                borderRadius: 2,
                                borderColor: 'primary.main',
                                color: 'primary.light',
                                '&:hover': {
                                  borderColor: 'primary.dark',
                                  backgroundColor: 'rgba(2, 132, 199, 0.08)',
                                },
                              }}
                            >
                              Imprimir Código
                            </Button>
                          )}
                        </Box>
                      </CardContent>

                      <CardActions sx={{ p: 3, pt: 0, justifyContent: 'flex-end' }}>
                        {!isStarted ? (
                          <Button
                            fullWidth
                            variant="contained"
                            color="primary"
                            startIcon={<PlayArrow />}
                            onClick={() => handleOpenComenzar(orden.id, targetWc)}
                            sx={{ fontWeight: 700 }}
                          >
                            Comenzar Operación
                          </Button>
                        ) : (
                          <Button
                            fullWidth
                            variant="contained"
                            color="success"
                            startIcon={<CheckCircle />}
                            onClick={() => handleOpenFinalizar(orden, targetWc)}
                            sx={{
                              fontWeight: 700,
                              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                              '&:hover': {
                                background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                              },
                            }}
                          >
                            Finalizar Operación
                          </Button>
                        )}
                      </CardActions>
                    </Card>
                  </Box>
                );
              })}
            </Box>
          )}
        </Box>
      )}

      {/* Modal de Finalización */}
      <Dialog
        open={openFinalizar}
        onClose={() => setOpenFinalizar(false)}
        maxWidth="sm"
        fullWidth
        sx={{
          '& .MuiDialog-paper': {
            bgcolor: '#111827',
            backgroundImage: 'none',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 3,
          },
        }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, fontWeight: 800 }}>
          <Biotech sx={{ color: 'success.main' }} /> Registrar Controles de Calidad
        </DialogTitle>
        <DialogContent dividers sx={{ borderColor: 'rgba(255, 255, 255, 0.08)' }}>
          {selectedOrden && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" color="primary.light" sx={{ fontWeight: 700 }}>
                {selectedOrden.numeroOrden} — {selectedOrden.receta.nombre}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Centro de Trabajo: {centrosTrabajo.find((w: any) => w.id === currentWcId)?.nombre} ({currentWcId})
              </Typography>
            </Box>
          )}

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
              gap: 2,
            }}
          >
            {currentFields.map((field) => (
              <Box key={field.name}>
                <TextField
                  fullWidth
                  label={field.label}
                  type={field.type as any}
                  required={field.required}
                  value={formData[field.name] || ''}
                  onChange={(e) => handleFieldChange(field.name, e.target.value)}
                  slotProps={{
                    inputLabel: field.type === 'date' ? { shrink: true } : undefined,
                    input: field.suffix ? {
                      endAdornment: (
                        <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                          {field.suffix}
                        </Typography>
                      )
                    } : undefined
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: 'rgba(255, 255, 255, 0.02)',
                    },
                  }}
                />
              </Box>
            ))}
          </Box>

          {/* Formulario Adicional para el último paso (Cámara Fría) */}
          {currentWcId === 'WC-CFRI' && (
            <>
              <Divider sx={{ my: 3, borderColor: 'rgba(255, 255, 255, 0.08)' }} />
              <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Warehouse sx={{ color: 'primary.main' }} /> Cierre de Lote e Ingreso a Inventario
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                <Box>
                  <TextField
                    fullWidth
                    label="Cantidad Real Producida (kg)"
                    type="number"
                    required
                    value={cantidadProducida}
                    onChange={(e) => setCantidadProducida(e.target.value)}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: 'rgba(255, 255, 255, 0.02)',
                      },
                    }}
                  />
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <TextField
                    fullWidth
                    label="Número de Lote Final"
                    type="text"
                    required
                    value={loteNumero}
                    onChange={(e) => setLoteNumero(e.target.value)}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: 'rgba(255, 255, 255, 0.02)',
                      },
                    }}
                  />
                  <Button
                    variant="outlined"
                    color="primary"
                    startIcon={<QrCode sx={{ fontSize: 16 }} />}
                    onClick={() => {
                      if (!loteNumero) {
                        alert('Por favor, ingrese un número de lote para imprimir el código.');
                        return;
                      }
                      setBarcodeLabelQty(1);
                      setOpenBarcodeModal(true);
                    }}
                    sx={{
                      textTransform: 'none',
                      fontWeight: 700,
                      mt: 1,
                      borderColor: 'primary.main',
                      color: 'primary.light',
                      '&:hover': {
                        borderColor: 'primary.dark',
                        backgroundColor: 'rgba(2, 132, 199, 0.08)',
                      },
                    }}
                  >
                    Imprimir Código de Barras
                  </Button>
                </Box>
              </Box>
            </>
          )}

          <Divider sx={{ my: 3, borderColor: 'rgba(255, 255, 255, 0.08)' }} />
          {(() => {
            const op = selectedOrden?.operaciones?.find((o: any) => o.workCenter === currentWcId);
            if (!op || !op.fechaInicio) return null;
            const elapsed = (new Date().getTime() - new Date(op.fechaInicio).getTime()) / 60000;
            const expected = op.duracionEstimada || 30;
            if (elapsed > expected) {
              return (
                <Alert severity="warning" sx={{ mb: 2.5, borderRadius: 2 }} icon={<ReportProblem />}>
                  <strong>Desviación de Tiempo Detectada:</strong> Se han registrado {Math.round(elapsed)} minutos transcurridos, superando la meta de {expected} minutos. Por favor documente la justificación en las Notas de abajo.
                </Alert>
              );
            }
            return null;
          })()}

          <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 800 }}>
            Notas y Justificación de Desviación
          </Typography>
          <TextField
            fullWidth
            label="Comentarios / Observaciones"
            placeholder="Documenta cualquier desviación del proceso normal, retraso, justificación, etc."
            multiline
            rows={3}
            value={notasTexto}
            onChange={(e) => setNotasTexto(e.target.value)}
            sx={{
              '& .MuiOutlinedInput-root': {
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
              },
            }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button variant="outlined" onClick={() => setOpenFinalizar(false)}>
            Cancelar
          </Button>
          <Button variant="contained" color="success" onClick={handleConfirmarFinalizar} sx={{ fontWeight: 700 }}>
            {currentWcId === 'WC-CFRI' ? 'Completar Orden' : 'Finalizar Paso'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal de Historial de Ruta */}
      <Dialog
        open={openHistorial}
        onClose={() => setOpenHistorial(false)}
        maxWidth="sm"
        fullWidth
        sx={{
          '& .MuiDialog-paper': {
            bgcolor: '#111827',
            backgroundImage: 'none',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 3,
          },
        }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, fontWeight: 800 }}>
          <History sx={{ color: 'primary.main' }} /> Historial de Ruta de Operaciones
        </DialogTitle>
        <DialogContent dividers sx={{ borderColor: 'rgba(255, 255, 255, 0.08)', p: 3 }}>
          {historialOrden && (
            <Box>
              <Typography variant="subtitle2" color="primary.light" sx={{ fontWeight: 800, mb: 0.5 }}>
                {historialOrden.numeroOrden}
              </Typography>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
                {historialOrden.receta.nombre}
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {historialOrden.operaciones
                  .filter((o: any) => o.estado === 'COMPLETADA')
                  .map((step: any) => {
                    const detailsList: { label: string; value: any }[] = [];
                    if (step.datosJson) {
                      try {
                        const parsed = JSON.parse(step.datosJson);
                        const fields = step.datosRequeridos
                          ? (() => { try { return typeof step.datosRequeridos === 'string' ? JSON.parse(step.datosRequeridos) : step.datosRequeridos; } catch { return []; } })()
                          : (centrosTrabajo.find((c: any) => c.id === step.workCenter)?.datosRequeridos
                              ? (() => { try { const ct = centrosTrabajo.find((c: any) => c.id === step.workCenter); return typeof ct.datosRequeridos === 'string' ? JSON.parse(ct.datosRequeridos) : ct.datosRequeridos; } catch { return []; } })()
                              : []);
                        fields.forEach((f: any) => {
                          if (parsed[f.name] !== undefined && parsed[f.name] !== '') {
                            detailsList.push({
                              label: f.label,
                              value: `${parsed[f.name]}${f.suffix ? ' ' + f.suffix : ''}`,
                            });
                          }
                        });
                      } catch {}
                    }

                    const wcInfo = centrosTrabajo.find((w: any) => w.id === step.workCenter);

                    return (
                      <Box
                        key={step.id}
                        sx={{
                          p: 2,
                          borderRadius: 2,
                          backgroundColor: 'rgba(255, 255, 255, 0.01)',
                          border: '1px solid rgba(255, 255, 255, 0.06)',
                        }}
                      >
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 700, color: 'success.light' }}>
                            ✓ {step.workCenter} — {wcInfo?.nombre || ''}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                            {getFormatDuration(step.duracionSegundos || 0)}
                          </Typography>
                        </Box>
                        {detailsList.length > 0 ? (
                          <Box sx={{ pl: 1.5, borderLeft: '2px solid rgba(16, 185, 129, 0.4)' }}>
                            {detailsList.map((d, idx) => (
                              <Typography key={idx} variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                                <span style={{ fontWeight: 600, color: '#9ca3af' }}>{d.label}:</span> {d.value}
                              </Typography>
                            ))}
                          </Box>
                        ) : (
                          <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic', pl: 1.5 }}>
                            Sin parámetros registrados
                          </Typography>
                        )}
                        {step.usuarioNombre && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, mb: 0.5 }}>
                            👤 <span style={{ fontWeight: 600, color: '#9ca3af' }}>Operario:</span> {step.usuarioNombre}
                          </Typography>
                        )}
                        {step.fechaFin && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, textAlign: 'right', fontSize: '0.68rem' }}>
                            Finalizado: {dayjs(step.fechaFin).format('DD/MM/YYYY HH:mm')}
                          </Typography>
                        )}
                        {step.notas && (
                          <Box sx={{ mt: 1.5, p: 1.5, borderRadius: 1.5, backgroundColor: 'rgba(239, 68, 68, 0.04)', borderLeft: '3px solid', borderColor: 'error.main' }}>
                            <Typography variant="caption" color="error.light" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontWeight: 700, mb: 0.5 }}>
                              <ReportProblem sx={{ fontSize: 14 }} /> Nota de Desviación / Observación:
                            </Typography>
                            <Typography variant="body2" sx={{ fontSize: '0.78rem', color: 'text.primary' }}>
                              {step.notas}
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    );
                  })}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setOpenHistorial(false)} variant="contained" fullWidth>
            Cerrar Historial
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal de Notas / Desviación */}
      <Dialog
        open={openNotas}
        onClose={() => setOpenNotas(false)}
        maxWidth="sm"
        fullWidth
        sx={{
          '& .MuiDialog-paper': {
            bgcolor: '#111827',
            backgroundImage: 'none',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 3,
          },
        }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, fontWeight: 800 }}>
          <Comment sx={{ color: 'primary.main' }} /> Notas / Desviación de Proceso
        </DialogTitle>
        <DialogContent dividers sx={{ borderColor: 'rgba(255, 255, 255, 0.08)' }}>
          {selectedOrden && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" color="primary.light" sx={{ fontWeight: 700 }}>
                {selectedOrden.numeroOrden} — {selectedOrden.receta.nombre}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Centro de Trabajo: {centrosTrabajo.find((w: any) => w.id === notasWcId)?.nombre} ({notasWcId})
              </Typography>
            </Box>
          )}

          {(() => {
            const op = selectedOrden?.operaciones?.find((o: any) => o.workCenter === notasWcId);
            if (!op || !op.fechaInicio) return null;
            const elapsed = (new Date().getTime() - new Date(op.fechaInicio).getTime()) / 60000;
            const expected = op.duracionEstimada || 30;
            if (elapsed > expected) {
              return (
                <Alert severity="warning" sx={{ mb: 2.5, borderRadius: 2 }} icon={<ReportProblem />}>
                  <strong>Desviación de Tiempo:</strong> Se han registrado {Math.round(elapsed)} minutos transcurridos (Meta: {expected} min). Por favor documente el motivo de esta desviación.
                </Alert>
              );
            }
            return null;
          })()}

          <TextField
            fullWidth
            label="Escribe aquí las observaciones o desviación"
            placeholder="Documenta cualquier desviación del proceso normal, retraso, justificación, etc."
            multiline
            rows={4}
            value={notasTexto}
            onChange={(e) => setNotasTexto(e.target.value)}
            sx={{
              '& .MuiOutlinedInput-root': {
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
              },
            }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button variant="outlined" onClick={() => setOpenNotas(false)}>
            Cancelar
          </Button>
          <Button variant="contained" color="primary" onClick={handleSaveNotas} disabled={savingNotas} sx={{ fontWeight: 700 }}>
            {savingNotas ? 'Guardando...' : 'Guardar Notas'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal de Confirmación para Iniciar Operación / Asignación de Operario */}
      <Dialog
        open={openComenzar}
        onClose={() => setOpenComenzar(false)}
        maxWidth="xs"
        fullWidth
        sx={{
          '& .MuiDialog-paper': {
            bgcolor: '#111827',
            backgroundImage: 'none',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 3,
          },
        }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, fontWeight: 800 }}>
          <PlayArrow sx={{ color: 'primary.main' }} /> Comenzar Operación
        </DialogTitle>
        <DialogContent dividers sx={{ borderColor: 'rgba(255, 255, 255, 0.08)', p: 3 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Selecciona o ingresa el nombre del operario responsable para iniciar esta operación:
          </Typography>

          {listaUsuarios.length > 0 && (
            <FormControl fullWidth sx={{ mb: 2.5 }}>
              <InputLabel id="select-operario-label">Seleccionar de la Lista</InputLabel>
              <Select
                labelId="select-operario-label"
                value={listaUsuarios.some(u => u.nombre === operarioSeleccionado) ? operarioSeleccionado : ''}
                label="Seleccionar de la Lista"
                onChange={(e) => setOperarioSeleccionado(e.target.value)}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: 'rgba(255, 255, 255, 0.02)',
                  },
                }}
              >
                <MenuItem value="">
                  <em>Ninguno - Escribir manualmente</em>
                </MenuItem>
                {listaUsuarios.map((u) => (
                  <MenuItem key={u.id} value={u.nombre}>
                    {u.nombre} ({u.rol})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          <TextField
            fullWidth
            label="Nombre del Operario Responsable"
            placeholder="Nombre del operario"
            value={operarioSeleccionado}
            onChange={(e) => setOperarioSeleccionado(e.target.value)}
            sx={{
              '& .MuiOutlinedInput-root': {
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
              },
            }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button variant="outlined" onClick={() => setOpenComenzar(false)}>
            Cancelar
          </Button>
          <Button variant="contained" color="primary" onClick={handleConfirmarComenzar} disabled={!operarioSeleccionado.trim()} sx={{ fontWeight: 700 }}>
            Iniciar Paso
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal Código de Barras del Lote */}
      <Dialog
        open={openBarcodeModal}
        onClose={() => setOpenBarcodeModal(false)}
        maxWidth="xs"
        fullWidth
        sx={{
          '& .MuiDialog-paper': {
            bgcolor: '#111827',
            backgroundImage: 'none',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 3,
          },
        }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, fontWeight: 800 }}>
          <QrCode sx={{ color: 'primary.main' }} /> Código de Barras del Lote
        </DialogTitle>
        <DialogContent dividers sx={{ borderColor: 'rgba(255, 255, 255, 0.08)', p: 3 }}>
          {selectedOrden && (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, textAlign: 'center' }}>
                {selectedOrden.receta.productoFinal.descripcion}
              </Typography>
              
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center' }}>
                <Chip
                  label={`SKU: ${selectedOrden.receta.productoFinal.sku}`}
                  size="small"
                  color="default"
                  sx={{ fontWeight: 700 }}
                />
                <Chip
                  label={`Lote: ${loteNumero}`}
                  size="small"
                  color="primary"
                  sx={{ fontWeight: 700 }}
                />
              </Box>

              {(() => {
                const prod = selectedOrden.receta.productoFinal;
                const isPT = prod.tipoProducto === 'PT' || prod.tipoProducto === 'PRODUCTO_TERMINADO';
                const barcodeData = isPT ? `${prod.prodId || ''}#${loteNumero}` : loteNumero;
                const barcodeUrl = `https://barcode.tec-it.com/barcode.ashx?data=${encodeURIComponent(
                  barcodeData
                )}&code=Code128`;
                const legendText = isPT 
                  ? "Este código contiene la identificación del producto y número de lote para identificación de Producto Terminado."
                  : "Este código contiene únicamente el número de lote para identificación de Materia Prima / Insumo.";
                
                return (
                  <>
                    <Box 
                      sx={{ 
                        p: 2, 
                        bgcolor: '#fff', 
                        borderRadius: 2, 
                        display: 'flex', 
                        justifyContent: 'center',
                        alignItems: 'center',
                        width: '100%',
                        maxHeight: 120,
                        overflow: 'hidden'
                      }}
                    >
                      <img 
                        src={barcodeUrl} 
                        alt="Código de Barras" 
                        style={{ maxWidth: '100%', height: 'auto', maxHeight: 80 }} 
                      />
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', px: 1 }}>
                      {legendText}
                    </Typography>
                  </>
                );
              })()}

              <TextField
                fullWidth
                label="Cantidad de etiquetas a imprimir"
                type="number"
                value={String(barcodeLabelQty)}
                onChange={(e) => setBarcodeLabelQty(Math.max(1, parseInt(e.target.value) || 1))}
                slotProps={{
                  htmlInput: { min: 1 }
                }}
                sx={{
                  mt: 1,
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: 'rgba(255, 255, 255, 0.02)',
                  },
                }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button variant="outlined" onClick={() => setOpenBarcodeModal(false)}>
            Cerrar
          </Button>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={() => {
              printBarcode(selectedOrden, loteNumero, barcodeLabelQty);
              setOpenBarcodeModal(false);
            }} 
            sx={{ fontWeight: 700 }}
          >
            Imprimir Código
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
