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
} from '@mui/material';
import {
  PlayArrow,
  CheckCircle,
  AccountTree,
  Timer,
  Biotech,
  Warehouse,
  History,
} from '@mui/icons-material';
import { apiFetch } from '../store/useAuthStore';
import dayjs from 'dayjs';

const WORK_CENTERS = [
  { id: 'WC-PAST', name: 'Pasteurización', desc: 'Pasteurizar y enfriar la leche' },
  { id: 'WC-CUAJ', name: 'Cuajado', desc: 'Agregar cultivo, cuajo y reposo' },
  { id: 'WC-CORTE', name: 'Corte de Cuajada', desc: 'Corte y agitación de la cuajada' },
  { id: 'WC-COCC', name: 'Cocción', desc: 'Cocción controlada de la mezcla' },
  { id: 'WC-DESU', name: 'Desuerado', desc: 'Separación del suero de la leche' },
  { id: 'WC-MOLD', name: 'Moldeado', desc: 'Llenado de moldes con cuajada' },
  { id: 'WC-PREN', name: 'Prensado', desc: 'Aplicar presión para compactar' },
  { id: 'WC-SALA', name: 'Salado', desc: 'Inmersión en tina de salmuera' },
  { id: 'WC-MADU', name: 'Maduración', desc: 'Control de temperatura y humedad en cámara' },
  { id: 'WC-EMPA', name: 'Empaque', desc: 'Empaque, etiquetado y pesaje de quesos' },
  { id: 'WC-CFRI', name: 'Cámara Fría', desc: 'Almacenamiento y despacho del producto terminado' },
];

const WORK_CENTER_FIELDS: Record<
  string,
  { label: string; name: string; type: 'number' | 'text' | 'date'; required: boolean; suffix?: string }[]
> = {
  'WC-PAST': [
    { label: 'Temperatura Pasteurización', name: 'temp_pasteurizacion', type: 'number', required: true, suffix: '°C' },
    { label: 'pH Pasteurización', name: 'ph_pasteurizacion', type: 'number', required: true },
    { label: 'Temperatura Enfriamiento', name: 'temp_enfriamiento', type: 'number', required: true, suffix: '°C' },
  ],
  'WC-CUAJ': [
    { label: 'Lote de Cultivo', name: 'lote_cultivo', type: 'text', required: true },
    { label: 'Dosis de Cultivo', name: 'dosis_cultivo', type: 'number', required: true, suffix: 'g/L' },
    { label: 'Lote de Cuajo', name: 'lote_cuajo', type: 'text', required: true },
    { label: 'Dosis de Cuajo', name: 'dosis_cuajo', type: 'number', required: true, suffix: 'mL/L' },
    { label: 'Temperatura Cuajado', name: 'temp_cuajado', type: 'number', required: true, suffix: '°C' },
    { label: 'Tiempo de Reposo', name: 'tiempo_reposo', type: 'number', required: true, suffix: 'min' },
  ],
  'WC-CORTE': [
    { label: 'Tamaño de Grano', name: 'tamano_grano', type: 'text', required: true, suffix: 'mm' },
    { label: 'Tiempo de Agitación', name: 'tiempo_agitacion', type: 'number', required: true, suffix: 'min' },
    { label: 'Velocidad de Agitación', name: 'velocidad_agitacion', type: 'number', required: true, suffix: 'RPM' },
  ],
  'WC-COCC': [
    { label: 'Temperatura Cocción', name: 'temp_coccion', type: 'number', required: true, suffix: '°C' },
    { label: 'pH Final Cocción', name: 'ph_coccion', type: 'number', required: true },
  ],
  'WC-DESU': [
    { label: 'Volumen Suero Obtenido', name: 'volumen_suero', type: 'number', required: true, suffix: 'L' },
    { label: 'pH Suero', name: 'ph_suero', type: 'number', required: true },
  ],
  'WC-MOLD': [
    { label: 'Cantidad de Moldes Llenados', name: 'cantidad_moldes', type: 'number', required: true, suffix: 'uds' },
    { label: 'Tipo de Molde', name: 'tipo_molde', type: 'text', required: true },
  ],
  'WC-PREN': [
    { label: 'Presión Aplicada', name: 'presion_applied', type: 'number', required: true, suffix: 'PSI' },
    { label: 'Tiempo de Prensa', name: 'tiempo_prensa', type: 'number', required: true, suffix: 'horas' },
  ],
  'WC-SALA': [
    { label: 'Concentración Salmuera', name: 'concentracion_salmuera', type: 'number', required: true, suffix: '% o °Baumé' },
    { label: 'Temperatura Salmuera', name: 'temp_salmuera', type: 'number', required: true, suffix: '°C' },
    { label: 'pH Salmuera', name: 'ph_salmuera', type: 'number', required: true },
  ],
  'WC-MADU': [
    { label: 'Temperatura Cámara', name: 'temp_camara', type: 'number', required: true, suffix: '°C' },
    { label: 'Humedad Relativa', name: 'humedad_relativa', type: 'number', required: true, suffix: '%' },
    { label: 'Tiempo Maduración Planificado', name: 'tiempo_maduracion_dias', type: 'number', required: true, suffix: 'días' },
  ],
  'WC-EMPA': [
    { label: 'Unidades Empacadas', name: 'unidades_empacadas', type: 'number', required: true, suffix: 'uds' },
    { label: 'Lote Bolsa/Empaque', name: 'lote_empaque', type: 'text', required: true },
    { label: 'Peso Neto Total', name: 'peso_neto_total', type: 'number', required: true, suffix: 'kg' },
  ],
  'WC-CFRI': [
    { label: 'Temperatura Almacenamiento', name: 'temp_almacenamiento', type: 'number', required: true, suffix: '°C' },
    { label: 'Ubicación/Estante en Cámara', name: 'ubicacion_camara', type: 'text', required: true },
    { label: 'Fecha Estimada Despacho', name: 'fecha_despacho_estimada', type: 'date', required: true },
  ],
};

const EXPECTED_DURATIONS: Record<string, number> = {
  'WC-PAST': 45,   // 45 min
  'WC-CUAJ': 40,   // 40 min
  'WC-CORTE': 15,  // 15 min
  'WC-COCC': 30,   // 30 min
  'WC-DESU': 20,   // 20 min
  'WC-MOLD': 25,   // 25 min
  'WC-PREN': 120,  // 2 horas (120 min)
  'WC-SALA': 60,   // 1 hora (60 min)
  'WC-MADU': 1440, // 24 horas (1440 min)
  'WC-EMPA': 30,   // 30 min
  'WC-CFRI': 60,   // 1 hora (60 min)
};

export default function RutaOperaciones() {
  const [activeTab, setActiveTab] = useState(0);
  const [ordenes, setOrdenes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Formulario de finalización
  const [openFinalizar, setOpenFinalizar] = useState(false);
  const [selectedOrden, setSelectedOrden] = useState<any>(null);
  const [currentWcId, setCurrentWcId] = useState<string>('');
  const [formData, setFormData] = useState<Record<string, string>>({});
  
  // Campos finales para el último paso (Cámara Fría)
  const [cantidadProducida, setCantidadProducida] = useState('');
  const [loteNumero, setLoteNumero] = useState('');

  const [now, setNow] = useState(new Date());

  useEffect(() => {
    cargarOrdenes();
    const timer = setInterval(() => {
      setNow(new Date());
    }, 5000);
    return () => clearInterval(timer);
  }, []);

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

  const getActiveWorkCenter = (orden: any) => {
    if (!orden.operaciones || orden.operaciones.length === 0) {
      if (orden.estado === 'PLANIFICADA') return 'WC-PAST';
      return null;
    }

    const inProgress = orden.operaciones.find((op: any) => op.estado === 'EN_PROCESO');
    if (inProgress) return inProgress.workCenter;

    for (let i = 0; i < WORK_CENTERS.length; i++) {
      const currentWc = WORK_CENTERS[i].id;
      const op = orden.operaciones.find((o: any) => o.workCenter === currentWc);
      const opEstado = op ? op.estado : 'PENDIENTE';

      if (opEstado === 'PENDIENTE') {
        if (i === 0) return currentWc;
        const prevWc = WORK_CENTERS[i - 1].id;
        const prevOp = orden.operaciones.find((o: any) => o.workCenter === prevWc);
        if (prevOp && prevOp.estado === 'COMPLETADA') {
          return currentWc;
        }
        break;
      }
    }
    return null;
  };

  const handleComenzar = async (ordenId: string, wcId: string) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await apiFetch(`/produccion/operaciones/${ordenId}/${wcId}/comenzar`, {
        method: 'POST',
      });
      setSuccessMsg(`Operación iniciada con éxito.`);
      await cargarOrdenes();
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e.message || 'Error al iniciar la operación.');
    }
  };

  const handleOpenFinalizar = (orden: any, wcId: string) => {
    setSelectedOrden(orden);
    setCurrentWcId(wcId);
    
    // Calcular tiempo transcurrido en segundos
    const operacion = orden.operaciones.find((o: any) => o.workCenter === wcId);
    let elapsedSeconds = 0;
    if (operacion && operacion.fechaInicio) {
      elapsedSeconds = Math.round((new Date().getTime() - new Date(operacion.fechaInicio).getTime()) / 1000);
    }

    // Inicializar inputs
    const initialData: Record<string, string> = {};
    const fields = WORK_CENTER_FIELDS[wcId] || [];
    fields.forEach((f) => {
      const nameLower = f.name.toLowerCase();
      const labelLower = f.label.toLowerCase();
      const isDurationField = nameLower.startsWith('tiempo_') || 
                              nameLower.includes('duracion') || 
                              labelLower.includes('tiempo') || 
                              labelLower.includes('duración');

      if (isDurationField) {
        if (f.suffix === 'min') {
          initialData[f.name] = Math.round(elapsedSeconds / 60).toString();
        } else if (f.suffix === 'horas') {
          initialData[f.name] = (elapsedSeconds / 3600).toFixed(1);
        } else {
          initialData[f.name] = elapsedSeconds.toString();
        }
      } else {
        initialData[f.name] = '';
      }
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

  const printBarcode = (orden: any, loteNum: string) => {
    if (!orden) return;
    const prod = orden.receta.productoFinal;
    const barcodeData = `${prod.codigoBarras || ''}#${loteNum}`;
    const barcodeUrl = `https://barcode.tec-it.com/barcode.ashx?data=${encodeURIComponent(
      barcodeData
    )}&code=Code128`;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

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
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
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
          <div class="title">${prod.descripcion || prod.nombre}</div>
          <div class="subtitle">SKU: ${prod.sku} | Lote: ${loteNum}</div>
          <img class="barcode-img" src="${barcodeUrl}" alt="Barcode" />
          <div class="code-text">${barcodeData}</div>
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

  const handleConfirmarFinalizar = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const payload: any = {
        datosJson: formData,
      };

      if (currentWcId === 'WC-CFRI') {
        if (!cantidadProducida || !loteNumero) {
          throw new Error('La cantidad producida y el lote final son requeridos para completar el proceso.');
        }
        payload.cantidadProducida = parseFloat(cantidadProducida);
        payload.loteNumero = loteNumero;
      }

      await apiFetch(`/produccion/operaciones/${selectedOrden.id}/${currentWcId}/finalizar`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      // Imprimir etiqueta de código de barras al finalizar y mover a bodega (WC-CFRI)
      if (currentWcId === 'WC-CFRI') {
        printBarcode(selectedOrden, loteNumero);
      }

      setSuccessMsg(
        currentWcId === 'WC-CFRI'
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

  // Filtrar órdenes para el Work Center activo
  const targetWc = WORK_CENTERS[activeTab].id;
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
          value={activeTab}
          onChange={(_, val) => setActiveTab(val)}
          textColor="primary"
          indicatorColor="primary"
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}
        >
          {WORK_CENTERS.map((wc) => {
            const count = ordenes.filter((o) => getActiveWorkCenter(o) === wc.id).length;
            return (
              <Tab
                key={wc.id}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography sx={{ fontSize: '0.85rem', fontWeight: 700 }}>{wc.id}</Typography>
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
        <Box sx={{ p: 2, bgcolor: 'rgba(255, 255, 255, 0.01)' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
            {WORK_CENTERS[activeTab].name}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {WORK_CENTERS[activeTab].desc}
          </Typography>
        </Box>
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

                // Buscar datos de pasos anteriores para mostrar como historial
                const completedSteps = orden.operaciones.filter((o: any) => o.estado === 'COMPLETADA');

                return (
                  <Box key={orden.id}>
                    <Card
                      sx={{
                        backgroundColor: '#111827',
                        borderRadius: 3,
                        border: '1px solid',
                        borderColor: isStarted ? 'primary.main' : 'rgba(255, 255, 255, 0.08)',
                        boxShadow: isStarted ? '0 0 15px rgba(2, 132, 199, 0.15)' : 'none',
                        transition: 'all 0.3s ease',
                        position: 'relative',
                        overflow: 'hidden',
                        '&:hover': {
                          transform: 'translateY(-4px)',
                          boxShadow: isStarted
                            ? '0 6px 20px rgba(2, 132, 199, 0.25)'
                            : '0 4px 15px rgba(0, 0, 0, 0.4)',
                        },
                        ...(isStarted && {
                          animation: 'pulseGreen 2s infinite ease-in-out',
                          '@keyframes pulseGreen': {
                            '0%': { borderColor: 'rgba(2, 132, 199, 0.5)' },
                            '50%': { borderColor: 'rgba(16, 185, 129, 0.9)' },
                            '100%': { borderColor: 'rgba(2, 132, 199, 0.5)' },
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

                        {isStarted && operacion.fechaInicio && (() => {
                          const elapsedMinutes = Math.max(
                            0,
                            (now.getTime() - new Date(operacion.fechaInicio).getTime()) / 60000
                          );
                          const expectedMin = EXPECTED_DURATIONS[targetWc] || 30;
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
                              </Box>
                            </Box>
                          );
                        })()}

                        {/* Historial de pasos completados */}
                        {completedSteps.length > 0 && (
                          <Box sx={{ mt: 2 }}>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontWeight: 700, mb: 1 }}
                            >
                              <History sx={{ fontSize: 14 }} /> Historial de Ruta:
                            </Typography>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, pl: 1 }}>
                              {completedSteps.map((step: any) => {
                                let labelInfo = '';
                                if (step.datosJson) {
                                  try {
                                    const parsed = JSON.parse(step.datosJson);
                                    if (step.workCenter === 'WC-PAST') {
                                      labelInfo = `${parsed.temp_pasteurizacion || '-'}°C`;
                                    } else if (step.workCenter === 'WC-CUAJ') {
                                      labelInfo = `${parsed.temp_cuajado || '-'}°C`;
                                    } else if (step.workCenter === 'WC-COCC') {
                                      labelInfo = `${parsed.temp_coccion || '-'}°C`;
                                    } else if (step.workCenter === 'WC-DESU') {
                                      labelInfo = `pH: ${parsed.ph_suero || '-'}`;
                                    } else if (step.workCenter === 'WC-EMPA') {
                                      labelInfo = `${parsed.peso_neto_total || '-'} kg`;
                                    }
                                  } catch {}
                                }
                                return (
                                  <Box
                                    key={step.id}
                                    sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                                  >
                                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                      ✓ {step.workCenter}
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: 'primary.light', fontWeight: 600 }}>
                                      {labelInfo} ({getFormatDuration(step.duracionSegundos || 0)})
                                    </Typography>
                                  </Box>
                                );
                              })}
                            </Box>
                          </Box>
                        )}
                      </CardContent>

                      <CardActions sx={{ p: 3, pt: 0, justifyContent: 'flex-end' }}>
                        {!isStarted ? (
                          <Button
                            fullWidth
                            variant="contained"
                            color="primary"
                            startIcon={<PlayArrow />}
                            onClick={() => handleComenzar(orden.id, targetWc)}
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
                Centro de Trabajo: {WORK_CENTERS.find((w) => w.id === currentWcId)?.name} ({currentWcId})
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
            {(WORK_CENTER_FIELDS[currentWcId] || []).map((field) => (
              <Box key={field.name}>
                <TextField
                  fullWidth
                  label={field.label}
                  type={field.type as any}
                  required={field.required}
                  value={formData[field.name] || ''}
                  onChange={(e) => handleFieldChange(field.name, e.target.value)}
                  {...(field.suffix ? {
                    InputProps: {
                      endAdornment: (
                        <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                          {field.suffix}
                        </Typography>
                      )
                    }
                  } : {})}
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
                <Box>
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
                </Box>
              </Box>
            </>
          )}
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
    </Box>
  );
}
