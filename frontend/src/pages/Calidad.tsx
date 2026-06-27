import { useState, useEffect, useRef } from 'react';
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Card,
  CardContent,
  FormControlLabel,
  Checkbox,
  Divider,
} from '@mui/material';
import {
  Add,
  Warning,
  Brush,
  PhotoCamera,
} from '@mui/icons-material';
import { apiFetch, useAuthStore } from '../store/useAuthStore';

export default function Calidad() {
  const usuario = useAuthStore((state) => state.usuario);
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(() => {
    const tabParam = new URLSearchParams(window.location.search).get('tab');
    if (tabParam) {
      const tabMap: Record<string, number> = {
        recepcion: 0,
        auditorias: 1,
        incidencias: 2,
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
        recepcion: 0,
        auditorias: 1,
        incidencias: 2,
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
    const tabNames = ['recepcion', 'auditorias', 'incidencias'];
    setSearchParams({ tab: tabNames[val] });
  };

  // Datos
  const [controlesLeche, setControlesLeche] = useState<any[]>([]);
  const [inspecciones, setInspecciones] = useState<any[]>([]);
  const [noConformidades, setNoConformidades] = useState<any[]>([]);
  const [ordenes, setOrdenes] = useState<any[]>([]);
  const [lotes, setLotes] = useState<any[]>([]);
  const [personal, setPersonal] = useState<any[]>([]);

  // Modales
  const [openLeche, setOpenLeche] = useState(false);
  const [lecheForm, setLecheForm] = useState({
    loteId: '',
    temperatura: '',
    grasa: '',
    proteina: '',
    acidez: '',
    antibioticos: false,
    resultado: 'APROBADO',
    observaciones: '',
  });

  const [openInsumo, setOpenInsumo] = useState(false);
  const [insumoForm, setInsumoForm] = useState({
    loteId: '',
    temperatura: '',
    ph: '',
    parametrosCriticos: '',
    resultado: 'APROBADO',
    observaciones: '',
  });

  const [openInspeccion, setOpenInspeccion] = useState(false);
  const [inspeccionForm, setInspeccionForm] = useState({
    tipo: 'PROCESO',
    ordenProduccionId: '',
    loteId: '',
    temperatura: '',
    ph: '',
    parametrosCriticos: '',
    resultado: 'APROBADO',
    observaciones: '',
  });

  const [openNoConformidad, setOpenNoConformidad] = useState(false);
  const [ncForm, setNcForm] = useState({
    tipo: 'PRODUCCION',
    referenciaId: '',
    descripcion: '',
    evidenciaUrl: '',
    responsableId: '',
  });

  const [openResolverNC, setOpenResolverNC] = useState(false);
  const [selectedNC, setSelectedNC] = useState<any>(null);
  const [resolverForm, setResolverForm] = useState({
    estado: 'RESUELTA',
    accionesCorrectivas: '',
  });

  // Firma Digital Simulada
  const [firmaDigital, setFirmaDigital] = useState('');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const canvasInsumoRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Evidencia Imagen Simulada
  const [simulatedImage, setSimulatedImage] = useState<string | null>(null);

  // Feedback
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    cargarDatos();
  }, [activeTab]);

  const cargarDatos = async () => {
    try {
      if (activeTab === 0) {
        const leche = await apiFetch('/calidad/recepcion-leche');
        setControlesLeche(leche);
        const lot = await apiFetch('/lotes');
        setLotes(lot.filter((l: any) => {
          const sku = (l.producto.sku || '').toLowerCase();
          const desc = (l.producto.descripcion || '').toLowerCase();
          const cat = (l.producto.categoria || '').toLowerCase();
          return sku.includes('leche') || sku.includes('mp-') || sku.includes('ins-') || desc.includes('leche') || cat.includes('leche');
        }));
      } else if (activeTab === 1) {
        const insp = await apiFetch('/calidad/inspecciones');
        setInspecciones(insp);
        const ord = await apiFetch('/produccion/ordenes');
        setOrdenes(ord.filter((o: any) => o.estado === 'EN_PROCESO' || o.estado === 'COMPLETADA'));
        const lot = await apiFetch('/lotes');
        setLotes(lot);
      } else if (activeTab === 2) {
        const nc = await apiFetch('/calidad/no-conformidades');
        setNoConformidades(nc);
        
        try {
          const us = await apiFetch('/auth/usuarios');
          setPersonal(us);
        } catch {
          if (usuario) setPersonal([usuario]);
        }
      }
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e.message || 'Error al cargar datos.');
    }
  };

  // --- DRAWING CANVAS FOR DIGITAL SIGNATURE ---
  const getActiveCanvas = () => {
    if (openLeche) return canvasRef.current;
    if (openInsumo) return canvasInsumoRef.current;
    return null;
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = getActiveCanvas();
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = getActiveCanvas();
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 2.5;
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    saveSignature();
  };

  const clearCanvas = () => {
    const canvas = getActiveCanvas();
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setFirmaDigital('');
  };

  const saveSignature = () => {
    const canvas = getActiveCanvas();
    if (!canvas) return;
    setFirmaDigital(canvas.toDataURL());
  };

  // --- SIMULAR CAPTURA DE IMAGEN ---
  const handleSimularImagen = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 200;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 0, 300, 200);
      
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(150, 100, 45, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = '#0ea5e9';
      ctx.font = 'bold 13px sans-serif';
      ctx.fillText('MUESTRA LÁCTEA #402', 80, 170);

      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 3;
      ctx.strokeRect(10, 10, 280, 180);
      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 18px sans-serif';
      ctx.fillText('APROBADO QC', 20, 40);
    }
    const dataUrl = canvas.toDataURL();
    setSimulatedImage(dataUrl);
    setNcForm({ ...ncForm, evidenciaUrl: dataUrl });
  };

  // --- HANDLERS CONTROLES LECHE ---
  const handleRegistrarLeche = async () => {
    try {
      setErrorMsg(null);
      const { loteId, temperatura, grasa, proteina, acidez, antibioticos, resultado, observaciones } = lecheForm;

      if (!temperatura || !grasa || !proteina || !acidez) {
        throw new Error('Todos los parámetros fisicoquímicos son obligatorios.');
      }

      await apiFetch('/calidad/recepcion-leche', {
        method: 'POST',
        body: JSON.stringify({
          loteId: loteId || null,
          temperatura: parseFloat(temperatura),
          grasa: parseFloat(grasa),
          proteina: parseFloat(proteina),
          acidez: parseFloat(acidez),
          antibioticos,
          resultado,
          observaciones: observaciones + (firmaDigital ? ` | Firmado Digitalmente.` : ''),
        }),
      });

      setSuccessMsg('Control de calidad de recepción de leche registrado.');
      setOpenLeche(false);
      clearCanvas();
      cargarDatos();
    } catch (e: any) {
      setErrorMsg(e.message || 'Error al guardar control.');
    }
  };

  // --- HANDLERS CONTROLES INSUMOS ---
  const handleRegistrarInsumo = async () => {
    try {
      setErrorMsg(null);
      const { loteId, temperatura, ph, parametrosCriticos, resultado, observaciones } = insumoForm;

      if (!loteId) {
        throw new Error('Debe seleccionar un lote.');
      }
      if (!parametrosCriticos) {
        throw new Error('Los parámetros críticos evaluados son obligatorios.');
      }

      await apiFetch('/calidad/inspeccion', {
        method: 'POST',
        body: JSON.stringify({
          tipo: 'RECEPCION_INSUMO',
          ordenProduccionId: null,
          loteId,
          temperatura: temperatura ? parseFloat(temperatura) : null,
          ph: ph ? parseFloat(ph) : null,
          parametrosCriticos,
          resultado,
          observaciones: observaciones + (firmaDigital ? ` | Firmado Digitalmente.` : ''),
        }),
      });

      setSuccessMsg('Control de calidad de insumo registrado.');
      setOpenInsumo(false);
      clearCanvas();
      cargarDatos();
    } catch (e: any) {
      setErrorMsg(e.message || 'Error al guardar control de insumo.');
    }
  };

  // --- HANDLERS INSPECCIÓN GENERAL ---
  const handleRegistrarInspeccion = async () => {
    try {
      setErrorMsg(null);
      const { tipo, ordenProduccionId, loteId, temperatura, ph, parametrosCriticos, resultado, observaciones } = inspeccionForm;

      if (!parametrosCriticos) {
        throw new Error('Los parámetros críticos y checklist son obligatorios.');
      }

      await apiFetch('/calidad/inspeccion', {
        method: 'POST',
        body: JSON.stringify({
          tipo,
          ordenProduccionId: ordenProduccionId || null,
          loteId: loteId || null,
          temperatura: temperatura ? parseFloat(temperatura) : null,
          ph: ph ? parseFloat(ph) : null,
          parametrosCriticos,
          resultado,
          observaciones,
        }),
      });

      setSuccessMsg('Inspección de calidad registrada.');
      setOpenInspeccion(false);
      cargarDatos();
    } catch (e: any) {
      setErrorMsg(e.message || 'Error al guardar inspección.');
    }
  };

  // --- HANDLERS NO CONFORMIDADES ---
  const handleCrearNoConformidad = async () => {
    try {
      setErrorMsg(null);
      const { tipo, referenciaId, descripcion, evidenciaUrl, responsableId } = ncForm;

      if (!descripcion || !responsableId) {
        throw new Error('La descripción y el responsable son obligatorios.');
      }

      await apiFetch('/calidad/no-conformidades', {
        method: 'POST',
        body: JSON.stringify({
          tipo,
          referenciaId,
          descripcion,
          evidenciaUrl: evidenciaUrl || null,
          responsableId,
        }),
      });

      setSuccessMsg('No Conformidad levantada en el sistema.');
      setOpenNoConformidad(false);
      setSimulatedImage(null);
      cargarDatos();
    } catch (e: any) {
      setErrorMsg(e.message || 'Error al crear no conformidad.');
    }
  };

  const handleResolverNoConformidad = async () => {
    try {
      setErrorMsg(null);
      const { estado, accionesCorrectivas } = resolverForm;

      if (!accionesCorrectivas) {
        throw new Error('Las acciones correctivas aplicadas son obligatorias para cerrar la no conformidad.');
      }

      await apiFetch(`/calidad/no-conformidades/${selectedNC.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          estado,
          accionesCorrectivas,
        }),
      });

      setSuccessMsg('No conformidad resuelta con éxito.');
      setOpenResolverNC(false);
      setSelectedNC(null);
      cargarDatos();
    } catch (e: any) {
      setErrorMsg(e.message || 'Error al resolver no conformidad.');
    }
  };

  return (
    <Box sx={{ p: 3, height: '100%', overflowY: 'auto' }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5 }}>
            Control de Calidad y Cumplimiento
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Inspeccione materias primas, audite procesos y declare no conformidades bajo normas alimentarias.
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          {activeTab === 0 && (usuario?.rol === 'ADMINISTRADOR' || usuario?.rol === 'SUPERVISOR' || usuario?.rol === 'CALIDAD') && (
            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <Button
                variant="contained"
                color="success"
                startIcon={<Add />}
                onClick={() => {
                  setLecheForm({
                    loteId: '',
                    temperatura: '',
                    grasa: '',
                    proteina: '',
                    acidez: '',
                    antibioticos: false,
                    resultado: 'APROBADO',
                    observaciones: '',
                  });
                  setOpenLeche(true);
                }}
              >
                Auditar Recepción Leche
              </Button>
              <Button
                variant="contained"
                color="info"
                startIcon={<Add />}
                onClick={() => {
                  setInsumoForm({
                    loteId: '',
                    temperatura: '',
                    ph: '',
                    parametrosCriticos: '',
                    resultado: 'APROBADO',
                    observaciones: '',
                  });
                  setOpenInsumo(true);
                }}
              >
                Auditar Recepción Insumo
              </Button>
            </Box>
          )}

          {activeTab === 1 && (usuario?.rol === 'ADMINISTRADOR' || usuario?.rol === 'SUPERVISOR' || usuario?.rol === 'CALIDAD') && (
            <Button
              variant="contained"
              color="primary"
              startIcon={<Add />}
              onClick={() => {
                setInspeccionForm({
                  tipo: 'PROCESO',
                  ordenProduccionId: '',
                  loteId: '',
                  temperatura: '',
                  ph: '',
                  parametrosCriticos: '',
                  resultado: 'APROBADO',
                  observaciones: '',
                });
                setOpenInspeccion(true);
              }}
            >
              Registrar Auditoría Proceso
            </Button>
          )}

          {activeTab === 2 && (usuario?.rol === 'ADMINISTRADOR' || usuario?.rol === 'SUPERVISOR' || usuario?.rol === 'CALIDAD') && (
            <Button
              variant="contained"
              color="error"
              startIcon={<Warning />}
              onClick={() => {
                setNcForm({
                  tipo: 'PRODUCCION',
                  referenciaId: '',
                  descripcion: '',
                  evidenciaUrl: '',
                  responsableId: '',
                });
                setOpenNoConformidad(true);
              }}
            >
              Reportar No Conformidad (NC)
            </Button>
          )}
        </Box>
      </Box>

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

      <Paper sx={{ mb: 3, backgroundColor: '#111827', borderRadius: 2 }}>
        <Tabs
          value={activeTab}
          onChange={(_, val) => handleTabChange(val)}
          textColor="primary"
          indicatorColor="primary"
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}
        >
          <Tab label="Recepción e Insumos Lácteos" />
          <Tab label="Auditorías en Proceso y Lotes" />
          <Tab label="Incidencias y No Conformidades (NC)" />
        </Tabs>
      </Paper>

      {/* --- TAB RECEPCIÓN LECHE --- */}
      {activeTab === 0 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Lotes Pendientes de Aprobación */}
          <Paper className="glass-panel" sx={{ p: 3, backgroundColor: '#111827', borderRadius: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 800, mb: 2, display: 'flex', alignItems: 'center', gap: 1, color: 'warning.light' }}>
              <Warning color="warning" /> Lotes de Insumos Pendientes de Calidad
            </Typography>
            {lotes.filter((l: any) => l.estado === 'PENDIENTE').length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No hay lotes de materias primas o insumos pendientes de aprobación. ¡Todo al día!
              </Typography>
            ) : (
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' }, gap: 2 }}>
                {lotes.filter((l: any) => l.estado === 'PENDIENTE').map((lote: any) => (
                  <Card key={lote.id} sx={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 2 }}>
                    <CardContent sx={{ p: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'primary.light' }}>
                          Lote: {lote.numeroLote}
                        </Typography>
                        <Chip label="PENDIENTE" color="warning" size="small" sx={{ fontWeight: 700, fontSize: '0.65rem', height: 20 }} />
                      </Box>
                      <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                        {lote.producto.descripcion}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" component="div">
                        Cantidad: <strong>{lote.cantidadActual} {lote.producto.unidadMedida}</strong>
                      </Typography>
                      <Typography variant="caption" color="text.secondary" component="div">
                        Proveedor: {lote.proveedor.nombre}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" component="div">
                        Vence: {new Date(lote.fechaVencimiento).toLocaleDateString('es-CO')}
                      </Typography>
                      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                        <Button
                          variant="contained"
                          color="success"
                          size="small"
                          sx={{ fontSize: '0.75rem', py: 0.5 }}
                          onClick={() => {
                            const sku = (lote.producto.sku || '').toLowerCase();
                            const desc = (lote.producto.descripcion || '').toLowerCase();
                            const cat = (lote.producto.categoria || '').toLowerCase();
                            const esLeche = sku.includes('leche') || desc.includes('leche') || cat.includes('leche');
                            if (esLeche) {
                              setLecheForm({
                                loteId: lote.id,
                                temperatura: '',
                                grasa: '',
                                proteina: '',
                                acidez: '',
                                antibioticos: false,
                                resultado: 'APROBADO',
                                observaciones: '',
                              });
                              setOpenLeche(true);
                            } else {
                              setInsumoForm({
                                loteId: lote.id,
                                temperatura: '',
                                ph: '',
                                parametrosCriticos: '',
                                resultado: 'APROBADO',
                                observaciones: '',
                              });
                              setOpenInsumo(true);
                            }
                          }}
                        >
                          Auditar e Ingresar
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            )}
          </Paper>

          {/* Historial de Controles */}
          <Paper sx={{ backgroundColor: '#111827', borderRadius: 2, overflow: 'hidden' }}>
            <Box sx={{ p: 2, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>Historial de Controles de Recepción</Typography>
            </Box>
            <Box sx={{ overflowX: 'auto', width: '100%' }}>
            <Table sx={{ minWidth: 900 }}>
              <TableHead>
                <TableRow sx={{ backgroundColor: 'rgba(255, 255, 255, 0.03)' }}>
                  <TableCell>Fecha</TableCell>
                  <TableCell>Lote Leche</TableCell>
                  <TableCell>Temp (°C)</TableCell>
                  <TableCell>Grasa (%)</TableCell>
                  <TableCell>Proteína (%)</TableCell>
                  <TableCell>Acidez (°D)</TableCell>
                  <TableCell>Antibióticos</TableCell>
                  <TableCell>Resultado</TableCell>
                  <TableCell>Auditor / Inspector</TableCell>
                  <TableCell>Observaciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {controlesLeche.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} align="center">
                      No hay controles de recepción registrados.
                    </TableCell>
                  </TableRow>
                ) : (
                  controlesLeche.map((c) => {
                    const isSelected = selectedRowId === c.id;
                    return (
                      <TableRow
                        key={c.id}
                        hover
                        onClick={() => setSelectedRowId(isSelected ? null : c.id)}
                        sx={{
                          cursor: 'pointer',
                          bgcolor: isSelected ? 'rgba(59, 130, 246, 0.15)' : 'inherit',
                          '&:hover': {
                            bgcolor: isSelected ? 'rgba(59, 130, 246, 0.25) !important' : undefined,
                          },
                          transition: 'background-color 0.2s ease',
                        }}
                      >
                        <TableCell>{new Date(c.fecha).toLocaleString()}</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>{c.loteId || 'Leche Directa Silo'}</TableCell>
                        <TableCell sx={{ color: c.temperatura > 4.5 ? 'error.main' : 'inherit' }}>
                          {c.temperatura} °C
                        </TableCell>
                        <TableCell>{c.grasa}%</TableCell>
                        <TableCell>{c.proteina}%</TableCell>
                        <TableCell>{c.acidez} °D</TableCell>
                        <TableCell>
                          <Chip
                            label={c.antibioticos ? 'DETECTADO' : 'LIBRE'}
                            color={c.antibioticos ? 'error' : 'success'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={c.resultado}
                            color={c.resultado === 'APROBADO' ? 'success' : c.resultado === 'CUARENTENA' ? 'warning' : 'error'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>{c.inspector.nombre}</TableCell>
                        <TableCell>{c.observaciones || '-'}</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
            </Box>
          </Paper>
        </Box>
      )}

      {/* --- TAB AUDITORIAS Y LOTES --- */}
      {activeTab === 1 && (
        <Paper sx={{ backgroundColor: '#111827', borderRadius: 2, overflow: 'hidden' }}>
          <Box sx={{ overflowX: 'auto', width: '100%' }}>
          <Table sx={{ minWidth: 800 }}>
            <TableHead>
              <TableRow sx={{ backgroundColor: 'rgba(255, 255, 255, 0.03)' }}>
                <TableCell>Fecha</TableCell>
                <TableCell>Tipo Inspección</TableCell>
                <TableCell>Orden Producción / Lote</TableCell>
                <TableCell>Temp (°C)</TableCell>
                <TableCell>pH</TableCell>
                <TableCell>Checklist Parámetros Críticos</TableCell>
                <TableCell>Resultado</TableCell>
                <TableCell>Auditor / Inspector</TableCell>
                <TableCell>Observaciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {inspecciones.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center">
                    No se registran auditorías de producción en proceso.
                  </TableCell>
                </TableRow>
              ) : (
                inspecciones.map((i) => {
                  const isSelected = selectedRowId === i.id;
                  return (
                    <TableRow
                      key={i.id}
                      hover
                      onClick={() => setSelectedRowId(isSelected ? null : i.id)}
                      sx={{
                        cursor: 'pointer',
                        bgcolor: isSelected ? 'rgba(59, 130, 246, 0.15)' : 'inherit',
                        '&:hover': {
                          bgcolor: isSelected ? 'rgba(59, 130, 246, 0.25) !important' : undefined,
                        },
                        transition: 'background-color 0.2s ease',
                      }}
                    >
                      <TableCell>{new Date(i.fecha).toLocaleString()}</TableCell>
                      <TableCell>
                        <Chip label={i.tipo} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell>
                        {i.ordenProduccion ? `OP: ${i.ordenProduccion.numeroOrden}` : ''}
                        {i.loteId ? ` | Lote: ${i.loteId}` : ''}
                      </TableCell>
                      <TableCell>{i.temperatura != null ? `${i.temperatura} °C` : '-'}</TableCell>
                      <TableCell>{i.ph != null ? i.ph : '-'}</TableCell>
                      <TableCell sx={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {i.parametrosCriticos}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={i.resultado}
                          color={i.resultado === 'APROBADO' ? 'success' : i.resultado === 'CUARENTENA' ? 'warning' : 'error'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{i.inspector.nombre}</TableCell>
                      <TableCell>{i.observaciones || '-'}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
          </Box>
        </Paper>
      )}

      {/* --- TAB NO CONFORMIDADES --- */}
      {activeTab === 2 && (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
          {noConformidades.length === 0 ? (
            <Box sx={{ gridColumn: 'span 2' }}>
              <Paper sx={{ p: 4, textAlign: 'center', backgroundColor: '#111827' }}>
                <Typography color="text.secondary">No hay incidencias ni No Conformidades activas en planta.</Typography>
              </Paper>
            </Box>
          ) : (
            noConformidades.map((nc) => (
              <Box key={nc.id}>
                <Card sx={{ backgroundColor: '#111827', borderRadius: 2, height: '100%', borderLeft: `5px solid ${nc.estado === 'RESUELTA' ? '#22c55e' : '#ef4444'}` }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Box>
                        <Typography variant="subtitle2" sx={{ color: 'error.main', fontWeight: 700 }}>
                          NO CONFORMIDAD: {nc.tipo}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Fecha Reportada: {new Date(nc.fecha).toLocaleString()}
                        </Typography>
                      </Box>
                      <Chip
                        label={nc.estado}
                        size="small"
                        color={nc.estado === 'RESUELTA' ? 'success' : 'error'}
                      />
                    </Box>

                    <Typography variant="body2" sx={{ mb: 2, fontWeight: 500 }}>
                      {nc.descripcion}
                    </Typography>

                    {nc.evidenciaUrl && (
                      <Box sx={{ mb: 2, textAlign: 'center' }}>
                        <img
                          src={nc.evidenciaUrl}
                          alt="Evidencia No Conformidad"
                          style={{ maxWidth: '100%', maxHeight: 150, borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)' }}
                        />
                      </Box>
                    )}

                    <Divider sx={{ my: 1.5, borderColor: 'rgba(255, 255, 255, 0.08)' }} />
                    
                    <Typography variant="caption" component="div">
                      Inspector Responsable: {nc.responsable.nombre}
                    </Typography>

                    {nc.estado === 'RESUELTA' ? (
                      <Box sx={{ mt: 1.5, p: 1.5, backgroundColor: 'rgba(34, 197, 94, 0.05)', borderRadius: 1.5 }}>
                        <Typography variant="subtitle2" sx={{ color: 'success.main', fontWeight: 700, mb: 0.5 }}>
                          Acciones Correctivas Aplicadas:
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {nc.accionesCorrectivas}
                        </Typography>
                      </Box>
                    ) : (
                      <Box sx={{ mt: 2, textAlign: 'right' }}>
                        {(usuario?.rol === 'ADMINISTRADOR' || usuario?.rol === 'SUPERVISOR' || usuario?.rol === 'CALIDAD') && (
                          <Button
                            size="small"
                            variant="contained"
                            color="success"
                            onClick={() => {
                              setSelectedNC(nc);
                              setResolverForm({ estado: 'RESUELTA', accionesCorrectivas: '' });
                              setOpenResolverNC(true);
                            }}
                          >
                            Resolver NC
                          </Button>
                        )}
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Box>
            ))
          )}
        </Box>
      )}

      {/* --- DIALOG AUDITAR LECHE --- */}
      <Dialog open={openLeche} onClose={() => setOpenLeche(false)} maxWidth="md" fullWidth>
        <DialogTitle>Registrar Control de Calidad de Recepción de Leche</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1.5 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
              <Box sx={{ gridColumn: 'span 2' }}>
                <FormControl fullWidth>
                  <InputLabel>Lote de Leche Cruda</InputLabel>
                  <Select
                    value={lecheForm.loteId}
                    label="Lote de Leche Cruda"
                    onChange={(e) => setLecheForm({ ...lecheForm, loteId: e.target.value })}
                  >
                    {lotes.filter((l: any) => {
                      const sku = (l.producto.sku || '').toLowerCase();
                      const desc = (l.producto.descripcion || '').toLowerCase();
                      const cat = (l.producto.categoria || '').toLowerCase();
                      return sku.includes('leche') || desc.includes('leche') || cat.includes('leche');
                    }).map((l) => (
                      <MenuItem key={l.id} value={l.id}>
                        {l.numeroLote} - {l.producto.descripcion} ({l.cantidadActual} {l.producto.unidadMedida}){l.estado === 'PENDIENTE' ? ' - [PENDIENTE]' : ''}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
              <Box>
                <TextField
                  label="Temperatura en Recepción (°C)"
                  type="number"
                  fullWidth
                  value={lecheForm.temperatura}
                  onChange={(e) => setLecheForm({ ...lecheForm, temperatura: e.target.value })}
                  placeholder="Límite óptimo: <= 4.0 °C"
                />
              </Box>
              <Box>
                <TextField
                  label="Porcentaje de Grasa (%)"
                  type="number"
                  fullWidth
                  value={lecheForm.grasa}
                  onChange={(e) => setLecheForm({ ...lecheForm, grasa: e.target.value })}
                  placeholder="Ej: 3.5%"
                />
              </Box>
              <Box>
                <TextField
                  label="Porcentaje de Proteínas (%)"
                  type="number"
                  fullWidth
                  value={lecheForm.proteina}
                  onChange={(e) => setLecheForm({ ...lecheForm, proteina: e.target.value })}
                  placeholder="Ej: 3.2%"
                />
              </Box>
              <Box>
                <TextField
                  label="Acidez Láctea (°Dornic o pH)"
                  type="number"
                  fullWidth
                  value={lecheForm.acidez}
                  onChange={(e) => setLecheForm({ ...lecheForm, acidez: e.target.value })}
                  placeholder="Rango normal: 16 - 18 °D"
                />
              </Box>
              <Box sx={{ gridColumn: 'span 2' }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={lecheForm.antibioticos}
                      onChange={(e) => setLecheForm({ ...lecheForm, antibioticos: e.target.checked })}
                    />
                  }
                  label="¿Presencia de Antibióticos Detectada?"
                  sx={{ mt: 1 }}
                />
              </Box>
              <Box sx={{ gridColumn: 'span 2' }}>
                <FormControl fullWidth>
                  <InputLabel>Resultado de Control</InputLabel>
                  <Select
                    value={lecheForm.resultado}
                    label="Resultado de Control"
                    onChange={(e) => setLecheForm({ ...lecheForm, resultado: e.target.value })}
                  >
                    <MenuItem value="APROBADO">Aprobado (Ingreso a Silos)</MenuItem>
                    <MenuItem value="CUARENTENA">Retener en Cuarentena</MenuItem>
                    <MenuItem value="RECHAZADO">Rechazar Materia Prima</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              <Box sx={{ gridColumn: 'span 2' }}>
                <TextField
                  label="Observaciones Inspector"
                  fullWidth
                  multiline
                  rows={2}
                  value={lecheForm.observaciones}
                  onChange={(e) => setLecheForm({ ...lecheForm, observaciones: e.target.value })}
                />
              </Box>
            </Box>

            {/* --- FIRMA DIGITAL SIMULADA --- */}
            <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.08)' }} />
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Brush fontSize="small" color="primary" /> Firma Digital Autorizada Inspector Calidad:
              </Typography>
              <Box sx={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: 2, p: 1, textAlign: 'center', backgroundColor: '#090d16' }}>
                <canvas
                  ref={canvasRef}
                  width={400}
                  height={120}
                  style={{ cursor: 'crosshair', backgroundColor: '#090d16' }}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                />
                <Box sx={{ mt: 1, textAlign: 'right' }}>
                  <Button size="small" variant="text" color="error" onClick={clearCanvas}>
                    Limpiar Firma
                  </Button>
                </Box>
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenLeche(false)}>Cancelar</Button>
          <Button onClick={handleRegistrarLeche} variant="contained" color="success">
            Registrar e Ingresar
          </Button>
        </DialogActions>
      </Dialog>

      {/* --- DIALOG AUDITAR INSUMO --- */}
      <Dialog open={openInsumo} onClose={() => setOpenInsumo(false)} maxWidth="md" fullWidth>
        <DialogTitle>Registrar Control de Calidad de Insumo / Materia Prima</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1.5 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
              <Box sx={{ gridColumn: 'span 2' }}>
                <FormControl fullWidth>
                  <InputLabel>Lote de Insumo / Materia Prima</InputLabel>
                  <Select
                    value={insumoForm.loteId}
                    label="Lote de Insumo / Materia Prima"
                    onChange={(e) => setInsumoForm({ ...insumoForm, loteId: e.target.value })}
                  >
                    {lotes.filter((l: any) => {
                      const sku = (l.producto.sku || '').toLowerCase();
                      const desc = (l.producto.descripcion || '').toLowerCase();
                      const cat = (l.producto.categoria || '').toLowerCase();
                      return !(sku.includes('leche') || desc.includes('leche') || cat.includes('leche'));
                    }).map((l) => (
                      <MenuItem key={l.id} value={l.id}>
                        {l.numeroLote} - {l.producto.descripcion} ({l.cantidadActual} {l.producto.unidadMedida}){l.estado === 'PENDIENTE' ? ' - [PENDIENTE]' : ''}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
              <Box>
                <TextField
                  label="Temperatura Controlada (°C) (Opcional)"
                  type="number"
                  fullWidth
                  value={insumoForm.temperatura}
                  onChange={(e) => setInsumoForm({ ...insumoForm, temperatura: e.target.value })}
                  placeholder="Ej: 4.5 °C"
                />
              </Box>
              <Box>
                <TextField
                  label="Nivel de pH (Opcional)"
                  type="number"
                  fullWidth
                  value={insumoForm.ph}
                  onChange={(e) => setInsumoForm({ ...insumoForm, ph: e.target.value })}
                  placeholder="Ej: 6.5"
                />
              </Box>
              <Box sx={{ gridColumn: 'span 2' }}>
                <TextField
                  label="Checklist y Parámetros Críticos Evaluados"
                  fullWidth
                  multiline
                  rows={2}
                  value={insumoForm.parametrosCriticos}
                  onChange={(e) => setInsumoForm({ ...insumoForm, parametrosCriticos: e.target.value })}
                  placeholder="Ej: Aspecto visual óptimo, envase sellado herméticamente, fecha de vencimiento válida."
                />
              </Box>
              <Box sx={{ gridColumn: 'span 2' }}>
                <FormControl fullWidth>
                  <InputLabel>Resultado de Control</InputLabel>
                  <Select
                    value={insumoForm.resultado}
                    label="Resultado de Control"
                    onChange={(e) => setInsumoForm({ ...insumoForm, resultado: e.target.value })}
                  >
                    <MenuItem value="APROBADO">Aprobado (Ingreso a Almacén)</MenuItem>
                    <MenuItem value="CUARENTENA">Retener en Cuarentena</MenuItem>
                    <MenuItem value="RECHAZADO">Rechazar Insumo</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              <Box sx={{ gridColumn: 'span 2' }}>
                <TextField
                  label="Observaciones Inspector"
                  fullWidth
                  multiline
                  rows={2}
                  value={insumoForm.observaciones}
                  onChange={(e) => setInsumoForm({ ...insumoForm, observaciones: e.target.value })}
                />
              </Box>
            </Box>

            {/* --- FIRMA DIGITAL SIMULADA --- */}
            <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.08)' }} />
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Brush fontSize="small" color="primary" /> Firma Digital Autorizada Inspector Calidad:
              </Typography>
              <Box sx={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: 2, p: 1, textAlign: 'center', backgroundColor: '#090d16' }}>
                <canvas
                  ref={canvasInsumoRef}
                  width={400}
                  height={120}
                  style={{ cursor: 'crosshair', backgroundColor: '#090d16' }}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                />
                <Box sx={{ mt: 1, textAlign: 'right' }}>
                  <Button size="small" variant="text" color="error" onClick={clearCanvas}>
                    Limpiar Firma
                  </Button>
                </Box>
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenInsumo(false)}>Cancelar</Button>
          <Button onClick={handleRegistrarInsumo} variant="contained" color="success">
            Registrar e Ingresar
          </Button>
        </DialogActions>
      </Dialog>

      {/* --- DIALOG AUDITAR PROCESO --- */}
      <Dialog open={openInspeccion} onClose={() => setOpenInspeccion(false)} maxWidth="md" fullWidth>
        <DialogTitle>Registrar Auditoría e Inspección de Calidad</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1.5 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
              <Box>
                <FormControl fullWidth>
                  <InputLabel>Tipo de Inspección</InputLabel>
                  <Select
                    value={inspeccionForm.tipo}
                    label="Tipo de Inspección"
                    onChange={(e) => setInspeccionForm({ ...inspeccionForm, tipo: e.target.value })}
                  >
                    <MenuItem value="PROCESO">Inspección de Proceso (Línea)</MenuItem>
                    <MenuItem value="PRODUCTO_TERMINADO">Inspección de Producto Terminado</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              <Box>
                <FormControl fullWidth>
                  <InputLabel>Orden de Producción Asociada</InputLabel>
                  <Select
                    value={inspeccionForm.ordenProduccionId}
                    label="Orden de Producción Asociada"
                    onChange={(e) => setInspeccionForm({ ...inspeccionForm, ordenProduccionId: e.target.value })}
                  >
                    <MenuItem value="">Ninguna (Inspección General)</MenuItem>
                    {ordenes.map((o) => (
                      <MenuItem key={o.id} value={o.id}>
                        {o.numeroOrden} - {o.receta.nombre}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
              <Box>
                <TextField
                  label="Temperatura Controlada (°C)"
                  type="number"
                  fullWidth
                  value={inspeccionForm.temperatura}
                  onChange={(e) => setInspeccionForm({ ...inspeccionForm, temperatura: e.target.value })}
                />
              </Box>
              <Box>
                <TextField
                  label="Nivel de pH"
                  type="number"
                  fullWidth
                  value={inspeccionForm.ph}
                  onChange={(e) => setInspeccionForm({ ...inspeccionForm, ph: e.target.value })}
                />
              </Box>
              <Box sx={{ gridColumn: 'span 2' }}>
                <TextField
                  label="Checklist y Parámetros Críticos Evaluados"
                  fullWidth
                  multiline
                  rows={2}
                  value={inspeccionForm.parametrosCriticos}
                  onChange={(e) => setInspeccionForm({ ...inspeccionForm, parametrosCriticos: e.target.value })}
                  placeholder="Ej: pH: OK, Pasteurización: Cumplida, Envase sellado al vacío hermético."
                />
              </Box>
              <Box sx={{ gridColumn: 'span 2' }}>
                <FormControl fullWidth>
                  <InputLabel>Resultado de Inspección</InputLabel>
                  <Select
                    value={inspeccionForm.resultado}
                    label="Resultado de Inspección"
                    onChange={(e) => setInspeccionForm({ ...inspeccionForm, resultado: e.target.value })}
                  >
                    <MenuItem value="APROBADO">Aprobado / Liberado</MenuItem>
                    <MenuItem value="CUARENTENA">Retener en Cuarentena</MenuItem>
                    <MenuItem value="RECHAZADO">Rechazado</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              <Box sx={{ gridColumn: 'span 2' }}>
                <TextField
                  label="Observaciones / Notas"
                  fullWidth
                  multiline
                  rows={2}
                  value={inspeccionForm.observaciones}
                  onChange={(e) => setInspeccionForm({ ...inspeccionForm, observaciones: e.target.value })}
                />
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenInspeccion(false)}>Cancelar</Button>
          <Button onClick={handleRegistrarInspeccion} variant="contained" color="primary">
            Guardar Inspección
          </Button>
        </DialogActions>
      </Dialog>

      {/* --- DIALOG CREAR NO CONFORMIDAD --- */}
      <Dialog open={openNoConformidad} onClose={() => setOpenNoConformidad(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Levantar Informe de No Conformidad (NC)</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1.5 }}>
            <FormControl fullWidth>
              <InputLabel>Tipo de Incidencia</InputLabel>
              <Select
                value={ncForm.tipo}
                label="Tipo de Incidencia"
                onChange={(e) => setNcForm({ ...ncForm, tipo: e.target.value })}
              >
                <MenuItem value="RECEPCION">Recepción de Leche / Insumos</MenuItem>
                <MenuItem value="PRODUCCION">Proceso de Producción</MenuItem>
                <MenuItem value="PRODUCTO_TERMINADO">Producto Terminado / Envase</MenuItem>
                <MenuItem value="CADENA_FRIO">Cadena de Frío / Freezer</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="ID de Referencia (Orden / Freezer / Lote)"
              fullWidth
              value={ncForm.referenciaId}
              onChange={(e) => setNcForm({ ...ncForm, referenciaId: e.target.value })}
              placeholder="Ej: FREEZ-002 o OP-000001"
            />

            <TextField
              label="Descripción de la Desviación"
              fullWidth
              multiline
              rows={3}
              value={ncForm.descripcion}
              onChange={(e) => setNcForm({ ...ncForm, descripcion: e.target.value })}
              placeholder="Describa el hallazgo o desviación crítica respecto al estándar..."
            />

            <FormControl fullWidth>
              <InputLabel>Personal / Responsable de Acción Correctiva</InputLabel>
              <Select
                value={ncForm.responsableId}
                label="Personal / Responsable de Acción Correctiva"
                onChange={(e) => setNcForm({ ...ncForm, responsableId: e.target.value })}
              >
                {personal.map((p) => (
                  <MenuItem key={p.id} value={p.id}>
                    {p.nombre} ({p.rol})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* --- ADJUNTAR EVIDENCIA DE IMAGEN --- */}
            <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.08)' }} />
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                <PhotoCamera fontSize="small" color="primary" /> Evidencia Fotográfica / Muestras:
              </Typography>
              
              {simulatedImage ? (
                <Box sx={{ textAlign: 'center', p: 1, border: '1px solid rgba(255,255,255,0.08)', borderRadius: 2 }}>
                  <img src={simulatedImage} alt="Evidencia" style={{ maxWidth: '100%', height: 120, borderRadius: 4 }} />
                  <Box sx={{ mt: 1 }}>
                    <Button size="small" color="error" onClick={() => setSimulatedImage(null)}>
                      Eliminar Imagen
                    </Button>
                  </Box>
                </Box>
              ) : (
                <Button
                  variant="outlined"
                  color="info"
                  fullWidth
                  startIcon={<PhotoCamera />}
                  onClick={handleSimularImagen}
                >
                  Capturar Evidencia Digital (Muestra)
                </Button>
              )}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenNoConformidad(false)}>Cancelar</Button>
          <Button onClick={handleCrearNoConformidad} variant="contained" color="error">
            Registrar No Conformidad
          </Button>
        </DialogActions>
      </Dialog>

      {/* --- DIALOG RESOLVER NC --- */}
      <Dialog open={openResolverNC} onClose={() => setOpenResolverNC(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Cerrar e Informe de Cierre de No Conformidad</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1.5 }}>
            {selectedNC && (
              <>
                <Typography variant="body2" sx={{ p: 2, backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 2 }}>
                  <strong>Problema original:</strong> {selectedNC.descripcion}
                </Typography>
                <TextField
                  label="Acciones Correctivas Tomadas"
                  fullWidth
                  multiline
                  rows={4}
                  value={resolverForm.accionesCorrectivas}
                  onChange={(e) => setResolverForm({ ...resolverForm, accionesCorrectivas: e.target.value })}
                  placeholder="Detalle todas las acciones correctivas y preventivas tomadas..."
                />
              </>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenResolverNC(false)}>Cancelar</Button>
          <Button onClick={handleResolverNoConformidad} variant="contained" color="success">
            Aplicar Cierre y Resolver
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
