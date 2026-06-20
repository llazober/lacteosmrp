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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  IconButton,
  Tooltip,
  Card,
  CardContent,
  CardActions,
  Divider,
  Checkbox,
  Autocomplete,
} from '@mui/material';
import {
  Add,
  PlayArrow,
  Check,
  Close,
  Assignment,
  Delete,
  Visibility,
  Scale,
  Warehouse,
  Edit,
} from '@mui/icons-material';
import { apiFetch, useAuthStore } from '../store/useAuthStore';

export default function Produccion() {
  const usuario = useAuthStore((state) => state.usuario);
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(() => {
    const tabParam = new URLSearchParams(window.location.search).get('tab');
    if (tabParam) {
      const tabMap: Record<string, number> = {
        recetas: 0,
        ordenes: 1,
        picking: 2,
        mermas: 3,
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
        recetas: 0,
        ordenes: 1,
        picking: 2,
        mermas: 3,
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
    const tabNames = ['recetas', 'ordenes', 'picking', 'mermas'];
    setSearchParams({ tab: tabNames[val] });
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val);
  };

  // Datos
  const [recetas, setRecetas] = useState<any[]>([]);
  const [ordenes, setOrdenes] = useState<any[]>([]);
  const [mermas, setMermas] = useState<any[]>([]);
  const [productos, setProductos] = useState<any[]>([]);
  const [sucursales, setSucursales] = useState<any[]>([]);
  const [usuarios, setUsuarios] = useState<any[]>([]);

  // Modales
  const [openReceta, setOpenReceta] = useState(false);
  const [recetaForm, setRecetaForm] = useState({
    id: '',
    nombre: '',
    descripcion: '',
    productoFinalId: '',
    cantidadEsperada: '100',
    costoEstimado: '0',
    detalles: [] as { productoId: string; cantidadRequerida: string }[],
  });

  const [openOrden, setOpenOrden] = useState(false);
  const [ordenForm, setOrdenForm] = useState({
    recetaId: '',
    sucursalId: '',
    cantidadPlanificada: '',
    responsableId: '',
  });

  const [openCompletar, setOpenCompletar] = useState(false);
  const [selectedOrden, setSelectedOrden] = useState<any>(null);
  const [completarForm, setCompletarForm] = useState({
    cantidadProducida: '',
    loteNumero: '',
    mermas: [] as { productoId: string; cantidad: string; motivo: string }[],
  });

  const [openMermaGeneral, setOpenMermaGeneral] = useState(false);
  const [mermaForm, setMermaForm] = useState({
    productoId: '',
    cantidad: '',
    motivo: 'EVAPORACION',
    sucursalId: '',
  });

  // Picking & Editing states
  const [openPicking, setOpenPicking] = useState(false);
  const [selectedPickingOrder, setSelectedPickingOrder] = useState<any>(null);
  const [pickingData, setPickingData] = useState<any>(null);

  const [openEditarOrden, setOpenEditarOrden] = useState(false);
  const [editarOrdenForm, setEditarOrdenForm] = useState({
    id: '',
    numeroOrden: '',
    recetaNombre: '',
    cantidadPlanificada: '',
    responsableId: '',
  });

  // Feedback
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    cargarDatos();
  }, [activeTab]);

  const cargarDatos = async () => {
    try {
      if (activeTab === 0) {
        const rec = await apiFetch('/produccion/recetas');
        setRecetas(rec);
        const prod = await apiFetch('/productos');
        setProductos(prod);
      } else if (activeTab === 1 || activeTab === 2) {
        const ord = await apiFetch('/produccion/ordenes');
        setOrdenes(ord);
        const rec = await apiFetch('/produccion/recetas');
        setRecetas(rec);
        const suc = await apiFetch('/sucursales');
        setSucursales(suc);
        
        try {
          const us = await apiFetch('/auth/usuarios');
          setUsuarios(us);
        } catch {
          if (usuario) setUsuarios([usuario]);
        }
      } else if (activeTab === 3) {
        const mer = await apiFetch('/produccion/mermas');
        setMermas(mer);
        const prod = await apiFetch('/productos');
        setProductos(prod);
        const suc = await apiFetch('/sucursales');
        setSucursales(suc);
      }
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e.message || 'Error al cargar datos.');
    }
  };

  // --- HANDLERS RECETAS ---
  const handleAgregarIngrediente = () => {
    setRecetaForm({
      ...recetaForm,
      detalles: [...recetaForm.detalles, { productoId: '', cantidadRequerida: '' }],
    });
  };

  const handleQuitarIngrediente = (index: number) => {
    const list = [...recetaForm.detalles];
    list.splice(index, 1);
    setRecetaForm({ ...recetaForm, detalles: list });
  };

  const handleIngredienteChange = (index: number, field: string, value: string) => {
    const list = [...recetaForm.detalles];
    list[index] = { ...list[index], [field]: value };
    setRecetaForm({ ...recetaForm, detalles: list });
  };

  const handleGuardarReceta = async () => {
    try {
      setErrorMsg(null);
      const { id, nombre, descripcion, productoFinalId, cantidadEsperada, costoEstimado, detalles } = recetaForm;

      if (!nombre || !productoFinalId || detalles.length === 0) {
        throw new Error('El nombre, producto final y al menos un ingrediente son obligatorios.');
      }

      for (const d of detalles) {
        if (!d.productoId || !d.cantidadRequerida || parseFloat(d.cantidadRequerida) <= 0) {
          throw new Error('Todos los ingredientes deben tener un insumo y una cantidad mayor a 0.');
        }
      }

      const payload = {
        nombre,
        descripcion,
        productoFinalId,
        cantidadEsperada: parseFloat(cantidadEsperada),
        costoEstimado: parseFloat(costoEstimado),
        detalles: detalles.map(d => ({
          productoId: d.productoId,
          cantidadRequerida: parseFloat(d.cantidadRequerida)
        }))
      };

      if (id) {
        await apiFetch(`/produccion/recetas/${id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        setSuccessMsg('Receta actualizada con éxito.');
      } else {
        await apiFetch('/produccion/recetas', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        setSuccessMsg('Receta creada con éxito.');
      }

      setOpenReceta(false);
      cargarDatos();
    } catch (e: any) {
      setErrorMsg(e.message || 'Error al guardar la receta.');
    }
  };

  const handleEliminarReceta = async (id: string) => {
    if (!window.confirm('¿Está seguro de eliminar esta receta?')) return;
    try {
      setErrorMsg(null);
      await apiFetch(`/produccion/recetas/${id}`, { method: 'DELETE' });
      setSuccessMsg('Receta eliminada.');
      cargarDatos();
    } catch (e: any) {
      setErrorMsg(e.message || 'Error al eliminar receta.');
    }
  };

  const handleEditarReceta = (r: any) => {
    setRecetaForm({
      id: r.id,
      nombre: r.nombre,
      descripcion: r.descripcion || '',
      productoFinalId: r.productoFinalId,
      cantidadEsperada: String(r.cantidadEsperada),
      costoEstimado: String(r.costoEstimado),
      detalles: r.detalles.map((d: any) => ({
        productoId: d.productoId,
        cantidadRequerida: String(d.cantidadRequerida),
      })),
    });
    setOpenReceta(true);
  };

  // --- HANDLERS ÓRDENES ---
  const handleCrearOrden = async () => {
    try {
      setErrorMsg(null);
      const { recetaId, sucursalId, cantidadPlanificada, responsableId } = ordenForm;

      const finalSucursalId = (usuario?.rol === 'ADMINISTRADOR' || usuario?.rol === 'SUPERVISOR') 
        ? sucursalId 
        : usuario?.sucursalId;

      if (!recetaId || !finalSucursalId || !cantidadPlanificada || !responsableId) {
        throw new Error('Todos los campos son obligatorios.');
      }

      await apiFetch('/produccion/ordenes', {
        method: 'POST',
        body: JSON.stringify({
          recetaId,
          sucursalId: finalSucursalId,
          cantidadPlanificada: parseFloat(cantidadPlanificada),
          responsableId,
        }),
      });

      setSuccessMsg('Orden de producción planificada con éxito.');
      setOpenOrden(false);
      cargarDatos();
    } catch (e: any) {
      setErrorMsg(e.message || 'Error al planificar orden.');
    }
  };

  const handleOpenPicking = async (order: any) => {
    try {
      setErrorMsg(null);
      setSelectedPickingOrder(order);
      const data = await apiFetch(`/produccion/ordenes/${order.id}/picking`);
      const ingredientes = data.ingredientes.map((i: any) => ({
        ...i,
        picked: i.picked || false,
      }));
      setPickingData({ ...data, ingredientes });
      setOpenPicking(true);
    } catch (e: any) {
      setErrorMsg(e.message || 'Error al obtener datos de picking.');
    }
  };

  const handleConfirmarPicking = async () => {
    try {
      setErrorMsg(null);
      const res = await apiFetch(`/produccion/ordenes/${selectedPickingOrder.id}/picking`, {
        method: 'POST',
        body: JSON.stringify({
          detalles: pickingData.ingredientes.map((i: any) => ({
            productoId: i.productoId,
            cantidadPicked: parseFloat(i.cantidadPicked),
            picked: i.picked,
            loteNumero: i.loteNumero || '',
          })),
        }),
      });

      if (res.tieneShortage) {
        setSuccessMsg(`Picking guardado con faltantes. La orden ${res.opUpdated.numeroOrden} ha sido marcada con FALTANTES.`);
      } else {
        setSuccessMsg(`Picking completado y confirmado con éxito para la orden ${res.opUpdated.numeroOrden}.`);
      }
      setOpenPicking(false);
      cargarDatos();
    } catch (e: any) {
      setErrorMsg(e.message || 'Error al confirmar el picking.');
    }
  };

  const handleLimpiarDatosPruebas = async () => {
    if (!window.confirm('¿Está seguro de que desea eliminar todas las transacciones (OPs, Ventas, Lotes) e inventarios para la categoría de Producto Terminado? Esta acción no se puede deshacer.')) {
      return;
    }
    try {
      setErrorMsg(null);
      await apiFetch('/produccion/limpiar-datos-pruebas', {
        method: 'POST',
      });
      setSuccessMsg('Se han limpiado todos los datos de pruebas de productos terminados correctamente.');
      cargarDatos();
    } catch (e: any) {
      setErrorMsg(e.message || 'Error al limpiar datos de pruebas.');
    }
  };

  const handleOpenEditarOrden = (op: any) => {
    setEditarOrdenForm({
      id: op.id,
      numeroOrden: op.numeroOrden,
      recetaNombre: op.receta.nombre,
      cantidadPlanificada: op.cantidadPlanificada.toString(),
      responsableId: op.responsableId,
    });
    setOpenEditarOrden(true);
  };

  const handleGuardarEditarOrden = async () => {
    try {
      setErrorMsg(null);
      await apiFetch(`/produccion/ordenes/${editarOrdenForm.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          cantidadPlanificada: parseFloat(editarOrdenForm.cantidadPlanificada),
          responsableId: editarOrdenForm.responsableId,
        }),
      });
      setSuccessMsg(`Orden ${editarOrdenForm.numeroOrden} actualizada con éxito.`);
      setOpenEditarOrden(false);
      cargarDatos();
    } catch (e: any) {
      setErrorMsg(e.message || 'Error al actualizar la orden.');
    }
  };

  const handleIniciarOrden = async (id: string) => {
    try {
      setErrorMsg(null);
      await apiFetch(`/produccion/ordenes/${id}/iniciar`, { method: 'POST' });
      setSuccessMsg('Orden de producción iniciada. En proceso...');
      cargarDatos();
    } catch (e: any) {
      setErrorMsg(e.message || 'Error al iniciar orden.');
    }
  };

  const handleCancelarOrden = async (id: string) => {
    if (!window.confirm('¿Está seguro de cancelar esta orden de producción?')) return;
    try {
      setErrorMsg(null);
      await apiFetch(`/produccion/ordenes/${id}/cancelar`, { method: 'POST' });
      setSuccessMsg('Orden de producción cancelada.');
      cargarDatos();
    } catch (e: any) {
      setErrorMsg(e.message || 'Error al cancelar orden.');
    }
  };

  const handleOpenCompletar = (op: any) => {
    setSelectedOrden(op);
    setCompletarForm({
      cantidadProducida: String(op.cantidadPlanificada),
      loteNumero: `L-${op.receta.productoFinal.sku.replace('PROD-', '')}-${new Date().toISOString().substring(0, 10).replace(/-/g, '')}`,
      mermas: [],
    });
    setOpenCompletar(true);
  };

  const handleAgregarMermaOrden = () => {
    setCompletarForm({
      ...completarForm,
      mermas: [...completarForm.mermas, { productoId: '', cantidad: '', motivo: 'DERRAME' }],
    });
  };

  const handleQuitarMermaOrden = (index: number) => {
    const list = [...completarForm.mermas];
    list.splice(index, 1);
    setCompletarForm({ ...completarForm, mermas: list });
  };

  const handleMermaOrdenChange = (index: number, field: string, value: string) => {
    const list = [...completarForm.mermas];
    list[index] = { ...list[index], [field]: value };
    setCompletarForm({ ...completarForm, mermas: list });
  };

  const handleCompletarOrden = async () => {
    try {
      setErrorMsg(null);
      const { cantidadProducida, loteNumero, mermas } = completarForm;

      if (!cantidadProducida || !loteNumero) {
        throw new Error('La cantidad real producida y el lote son obligatorios.');
      }

      await apiFetch(`/produccion/ordenes/${selectedOrden.id}/completar`, {
        method: 'POST',
        body: JSON.stringify({
          cantidadProducida: parseFloat(cantidadProducida),
          loteNumero,
          mermas: mermas.map(m => ({
            productoId: m.productoId,
            cantidad: parseFloat(m.cantidad),
            motivo: m.motivo,
          })),
        }),
      });

      setSuccessMsg('Orden de producción completada con éxito. Inventarios actualizados.');
      setOpenCompletar(false);
      setSelectedOrden(null);
      cargarDatos();
    } catch (e: any) {
      setErrorMsg(e.message || 'Error al completar orden.');
    }
  };

  // --- HANDLERS MERMAS GENERALES ---
  const handleRegistrarMermaGeneral = async () => {
    try {
      setErrorMsg(null);
      const { productoId, cantidad, motivo, sucursalId } = mermaForm;

      const finalSucursalId = (usuario?.rol === 'ADMINISTRADOR' || usuario?.rol === 'SUPERVISOR') 
        ? sucursalId 
        : usuario?.sucursalId;

      if (!productoId || !cantidad || !motivo || !finalSucursalId) {
        throw new Error('Todos los campos son obligatorios.');
      }

      await apiFetch('/produccion/mermas', {
        method: 'POST',
        body: JSON.stringify({
          productoId,
          cantidad: parseFloat(cantidad),
          motivo,
          sucursalId: finalSucursalId,
        }),
      });

      setSuccessMsg('Merma de producto registrada con éxito.');
      setOpenMermaGeneral(false);
      setMermaForm({ productoId: '', cantidad: '', motivo: 'EVAPORACION', sucursalId: '' });
      cargarDatos();
    } catch (e: any) {
      setErrorMsg(e.message || 'Error al registrar merma.');
    }
  };

  return (
    <Box sx={{ p: 3, height: '100%', overflowY: 'auto' }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5 }}>
            Módulo de Producción Láctea
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Administre recetas estándar, planifique lotes, declare rendimientos y controle las mermas.
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          {(usuario?.rol === 'ADMINISTRADOR' || usuario?.rol === 'SUPERVISOR') && (
            <Button
              variant="outlined"
              color="error"
              onClick={handleLimpiarDatosPruebas}
            >
              Limpiar Datos de Pruebas
            </Button>
          )}
          {activeTab === 0 && (usuario?.rol === 'ADMINISTRADOR' || usuario?.rol === 'SUPERVISOR' || usuario?.rol === 'ALMACEN') && (
            <Button
              variant="contained"
              color="success"
              startIcon={<Add />}
              onClick={() => {
                setRecetaForm({
                  id: '',
                  nombre: '',
                  descripcion: '',
                  productoFinalId: '',
                  cantidadEsperada: '100',
                  costoEstimado: '0',
                  detalles: [{ productoId: '', cantidadRequerida: '' }],
                });
                setOpenReceta(true);
              }}
            >
              Crear Receta
            </Button>
          )}

          {activeTab === 1 && (usuario?.rol === 'ADMINISTRADOR' || usuario?.rol === 'SUPERVISOR' || usuario?.rol === 'ALMACEN') && (
            <Button
              variant="contained"
              color="primary"
              startIcon={<Assignment />}
              onClick={() => {
                setOrdenForm({
                  recetaId: '',
                  sucursalId: usuario?.sucursalId || '',
                  cantidadPlanificada: '',
                  responsableId: '',
                });
                setOpenOrden(true);
              }}
            >
              Planificar Producción
            </Button>
          )}

          {activeTab === 3 && (usuario?.rol === 'ADMINISTRADOR' || usuario?.rol === 'SUPERVISOR' || usuario?.rol === 'ALMACEN') && (
            <Button
              variant="contained"
              color="warning"
              startIcon={<Scale />}
              onClick={() => {
                setMermaForm({
                  productoId: '',
                  cantidad: '',
                  motivo: 'EVAPORACION',
                  sucursalId: usuario?.sucursalId || '',
                });
                setOpenMermaGeneral(true);
              }}
            >
              Registrar Merma
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
          <Tab label="Recetario Maestro" />
          <Tab label="Órdenes de Producción (OP)" />
          <Tab label="Listas de Selección (Pick Lists)" />
          <Tab label="Control de Mermas (Desechos)" />
        </Tabs>
      </Paper>

      {/* --- TAB RECETAS --- */}
      {activeTab === 0 && (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
          {recetas.length === 0 ? (
            <Box sx={{ gridColumn: 'span 2' }}>
              <Paper sx={{ p: 4, textAlign: 'center', backgroundColor: '#111827' }}>
                <Typography color="text.secondary">No hay recetas registradas. ¡Cree su primera receta!</Typography>
              </Paper>
            </Box>
          ) : (
            recetas.map((r) => (
              <Box key={r.id}>
                <Card sx={{ backgroundColor: '#111827', borderRadius: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 700 }}>
                          {r.nombre}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Producto Final: {r.productoFinal.descripcion} ({r.productoFinal.sku})
                        </Typography>
                      </Box>
                      <Chip label={`Rendimiento: ${r.cantidadEsperada} ${r.productoFinal.unidadMedida}`} color="primary" size="small" />
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {r.descripcion || 'Sin descripción.'}
                    </Typography>

                    <Divider sx={{ my: 1.5, borderColor: 'rgba(255, 255, 255, 0.08)' }} />

                    <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Warehouse fontSize="small" color="primary" /> Ingredientes e Insumos:
                    </Typography>
                    <Box sx={{ pl: 1 }}>
                      {r.detalles.map((d: any) => (
                        <Box key={d.id} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                          <Typography variant="body2">{d.producto.descripcion}</Typography>
                          <Typography variant="body2" color="primary.main" sx={{ fontWeight: 600 }}>
                            {d.cantidadRequerida} {d.producto.unidadMedida}
                          </Typography>
                        </Box>
                      ))}
                    </Box>

                    <Divider sx={{ my: 1.5, borderColor: 'rgba(255, 255, 255, 0.08)' }} />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2" color="text.secondary">Costo Estimado Unitario:</Typography>
                      <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'success.main' }}>
                        {formatCurrency(r.costoEstimado)}
                      </Typography>
                    </Box>
                  </CardContent>
                  <CardActions sx={{ justifyContent: 'flex-end', p: 2, pt: 0 }}>
                    {(usuario?.rol === 'ADMINISTRADOR' || usuario?.rol === 'SUPERVISOR' || usuario?.rol === 'ALMACEN') && (
                      <>
                        <Button size="small" variant="outlined" onClick={() => handleEditarReceta(r)}>
                          Editar
                        </Button>
                        <Button size="small" variant="outlined" color="error" onClick={() => handleEliminarReceta(r.id)}>
                          Eliminar
                        </Button>
                      </>
                    )}
                  </CardActions>
                </Card>
              </Box>
            ))
          )}
        </Box>
      )}

      {/* --- TAB ÓRDENES DE PRODUCCIÓN --- */}
      {activeTab === 1 && (
        <Paper sx={{ backgroundColor: '#111827', borderRadius: 2, overflow: 'hidden' }}>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: 'rgba(255, 255, 255, 0.03)' }}>
                <TableCell>Nro Orden</TableCell>
                <TableCell>Receta</TableCell>
                <TableCell>Sucursal</TableCell>
                <TableCell>Responsable</TableCell>
                <TableCell>Planificado</TableCell>
                <TableCell>Producido</TableCell>
                <TableCell>Rendimiento</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell>Picking</TableCell>
                <TableCell>Fechas</TableCell>
                <TableCell align="right">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {ordenes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} align="center">
                    No hay órdenes de producción planificadas.
                  </TableCell>
                </TableRow>
              ) : (
                ordenes.map((op) => {
                  const isSelected = selectedRowId === op.id;
                  return (
                    <TableRow
                      key={op.id}
                      hover
                      onClick={() => setSelectedRowId(isSelected ? null : op.id)}
                      sx={{
                        cursor: 'pointer',
                        bgcolor: isSelected ? 'rgba(59, 130, 246, 0.15)' : 'inherit',
                        '&:hover': {
                          bgcolor: isSelected ? 'rgba(59, 130, 246, 0.25) !important' : undefined,
                        },
                        transition: 'background-color 0.2s ease',
                      }}
                    >
                      <TableCell sx={{ fontWeight: 700 }}>{op.numeroOrden}</TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{op.receta.nombre}</Typography>
                        <Typography variant="caption" color="text.secondary">{op.receta.productoFinal.descripcion}</Typography>
                      </TableCell>
                      <TableCell>{op.sucursal.nombre}</TableCell>
                      <TableCell>{op.responsable.nombre}</TableCell>
                      <TableCell>{op.cantidadPlanificada}</TableCell>
                      <TableCell>{op.cantidadProducida || '-'}</TableCell>
                      <TableCell>
                        {op.estado === 'COMPLETADA' ? (
                          <Chip
                            label={`${op.rendimientoReal.toFixed(1)}%`}
                            color={op.rendimientoReal >= 95 ? 'success' : 'warning'}
                            size="small"
                          />
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={op.estado}
                          size="small"
                          color={
                            op.estado === 'COMPLETADA'
                              ? 'success'
                              : op.estado === 'EN_PROCESO'
                              ? 'primary'
                              : op.estado === 'PLANIFICADA'
                              ? 'warning'
                              : op.estado === 'FALTANTES'
                              ? 'error'
                              : 'error'
                          }
                          sx={
                            op.estado === 'FALTANTES'
                              ? { backgroundColor: '#ef4444', color: '#fff', fontWeight: 'bold' }
                              : undefined
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Chip
                            label={op.pickingCompletado ? 'Completado' : 'Pendiente'}
                            size="small"
                            color={op.pickingCompletado ? 'success' : 'default'}
                          />
                          {(op.estado === 'PLANIFICADA' || op.estado === 'FALTANTES') && (usuario?.rol === 'ADMINISTRADOR' || usuario?.rol === 'SUPERVISOR' || usuario?.rol === 'ALMACEN') && (
                            <Tooltip title="Procesar Picking">
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenPicking(op);
                                }}
                              >
                                <Scale fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" component="div">
                          Plan: {new Date(op.createdAt).toLocaleDateString()}
                        </Typography>
                        {op.fechaInicio && (
                          <Typography variant="caption" component="div" color="text.secondary">
                            Inicio: {new Date(op.fechaInicio).toLocaleTimeString()}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                          {(op.estado === 'PLANIFICADA' || op.estado === 'FALTANTES') && (usuario?.rol === 'ADMINISTRADOR' || usuario?.rol === 'SUPERVISOR' || usuario?.rol === 'ALMACEN') && (
                            <>
                              <Tooltip title={op.estado === 'FALTANTES' ? 'No se puede iniciar por falta de materia prima' : 'Iniciar Producción'}>
                                <span>
                                  <IconButton
                                    color="primary"
                                    disabled={op.estado === 'FALTANTES'}
                                    onClick={(e) => { e.stopPropagation(); handleIniciarOrden(op.id); }}
                                  >
                                    <PlayArrow />
                                  </IconButton>
                                </span>
                              </Tooltip>
                              <Tooltip title="Editar Cantidad Planificada">
                                <IconButton
                                  color="info"
                                  onClick={(e) => { e.stopPropagation(); handleOpenEditarOrden(op); }}
                                >
                                  <Edit />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Cancelar Orden">
                                <IconButton color="error" onClick={(e) => { e.stopPropagation(); handleCancelarOrden(op.id); }}>
                                  <Close />
                                </IconButton>
                              </Tooltip>
                            </>
                          )}
                          {op.estado === 'EN_PROCESO' && (usuario?.rol === 'ADMINISTRADOR' || usuario?.rol === 'SUPERVISOR' || usuario?.rol === 'ALMACEN') && (
                            <>
                              <Tooltip title="Registrar Completada">
                                <Button
                                  size="small"
                                  variant="contained"
                                  color="success"
                                  startIcon={<Check />}
                                  onClick={(e) => { e.stopPropagation(); handleOpenCompletar(op); }}
                                >
                                  Completar
                                </Button>
                              </Tooltip>
                              <Tooltip title="Cancelar Orden">
                                <IconButton color="error" onClick={(e) => { e.stopPropagation(); handleCancelarOrden(op.id); }}>
                                  <Close />
                                </IconButton>
                              </Tooltip>
                            </>
                          )}
                          {op.estado === 'COMPLETADA' && (
                            <Tooltip title="Ver detalles de consumos">
                              <IconButton color="info" onClick={(e) => e.stopPropagation()}>
                                <Visibility />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </Paper>
      )}

      {/* --- TAB PICK LISTS --- */}
      {activeTab === 2 && (
        <Paper sx={{ backgroundColor: '#111827', borderRadius: 2, overflow: 'hidden' }}>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: 'rgba(255, 255, 255, 0.03)' }}>
                <TableCell>Nro Orden</TableCell>
                <TableCell>Receta</TableCell>
                <TableCell>Sucursal</TableCell>
                <TableCell>Cantidad Planificada</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell>Picking</TableCell>
                <TableCell align="right">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {ordenes.filter(op => op.estado === 'PLANIFICADA' || op.estado === 'FALTANTES').length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    No hay órdenes de producción planificadas o con faltantes que requieran picking.
                  </TableCell>
                </TableRow>
              ) : (
                ordenes
                  .filter(op => op.estado === 'PLANIFICADA' || op.estado === 'FALTANTES')
                  .map((op) => {
                    const isSelected = selectedRowId === op.id;
                    return (
                      <TableRow
                        key={op.id}
                        hover
                        onClick={() => setSelectedRowId(isSelected ? null : op.id)}
                        sx={{
                          cursor: 'pointer',
                          bgcolor: isSelected ? 'rgba(59, 130, 246, 0.15)' : 'inherit',
                          '&:hover': {
                            bgcolor: isSelected ? 'rgba(59, 130, 246, 0.25) !important' : undefined,
                          },
                          transition: 'background-color 0.2s ease',
                        }}
                      >
                        <TableCell sx={{ fontWeight: 700 }}>{op.numeroOrden}</TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>{op.receta.nombre}</Typography>
                          <Typography variant="caption" color="text.secondary">{op.receta.productoFinal.descripcion}</Typography>
                        </TableCell>
                        <TableCell>{op.sucursal.nombre}</TableCell>
                        <TableCell>{op.cantidadPlanificada}</TableCell>
                        <TableCell>
                          <Chip
                            label={op.estado}
                            size="small"
                            color={op.estado === 'FALTANTES' ? 'error' : 'warning'}
                            sx={
                              op.estado === 'FALTANTES'
                                ? { backgroundColor: '#ef4444', color: '#fff', fontWeight: 'bold' }
                                : undefined
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={op.pickingCompletado ? 'Completado' : 'Pendiente'}
                            size="small"
                            color={op.pickingCompletado ? 'success' : 'default'}
                          />
                        </TableCell>
                        <TableCell align="right">
                          {(usuario?.rol === 'ADMINISTRADOR' || usuario?.rol === 'SUPERVISOR' || usuario?.rol === 'ALMACEN') && (
                            <Button
                              size="small"
                              variant="contained"
                              color="primary"
                              startIcon={<Scale />}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenPicking(op);
                              }}
                            >
                              Ver / Procesar Picking
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
              )}
            </TableBody>
          </Table>
        </Paper>
      )}

      {/* --- TAB MERMAS --- */}
      {activeTab === 3 && (
        <Paper sx={{ backgroundColor: '#111827', borderRadius: 2, overflow: 'hidden' }}>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: 'rgba(255, 255, 255, 0.03)' }}>
                <TableCell>Fecha</TableCell>
                <TableCell>Producto</TableCell>
                <TableCell>Tipo</TableCell>
                <TableCell>Cantidad</TableCell>
                <TableCell>Motivo</TableCell>
                <TableCell>Responsable</TableCell>
                <TableCell>Orden Relacionada</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {mermas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    No se han registrado mermas en el sistema.
                  </TableCell>
                </TableRow>
              ) : (
                mermas.map((m) => {
                  const isSelected = selectedRowId === m.id;
                  return (
                    <TableRow
                      key={m.id}
                      hover
                      onClick={() => setSelectedRowId(isSelected ? null : m.id)}
                      sx={{
                        cursor: 'pointer',
                        bgcolor: isSelected ? 'rgba(59, 130, 246, 0.15)' : 'inherit',
                        '&:hover': {
                          bgcolor: isSelected ? 'rgba(59, 130, 246, 0.25) !important' : undefined,
                        },
                        transition: 'background-color 0.2s ease',
                      }}
                    >
                      <TableCell>{new Date(m.fecha).toLocaleString()}</TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{m.producto.descripcion}</Typography>
                        <Typography variant="caption" color="text.secondary">{m.producto.sku}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={m.producto.categoria === 'MATERIA_PRIMA' || m.producto.categoria === 'INSUMOS' ? 'Materia Prima' : 'Producto Terminado'}
                          color={m.producto.categoria === 'MATERIA_PRIMA' || m.producto.categoria === 'INSUMOS' ? 'warning' : 'success'}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700, color: 'error.main' }}>
                        -{m.cantidad} {m.producto.unidadMedida}
                      </TableCell>
                      <TableCell>
                        <Chip label={m.motivo} size="small" />
                      </TableCell>
                      <TableCell>{m.responsable.nombre}</TableCell>
                      <TableCell>{m.ordenProduccion ? m.ordenProduccion.numeroOrden : 'Registro Directo'}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </Paper>
      )}

      {/* --- DIALOG CREAR/EDITAR RECETA --- */}
      <Dialog open={openReceta} onClose={() => setOpenReceta(false)} maxWidth="md" fullWidth>
        <DialogTitle>{recetaForm.id ? 'Editar Receta' : 'Crear Receta Láctea'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
              <Box>
                <TextField
                  label="Nombre de la Receta"
                  fullWidth
                  value={recetaForm.nombre}
                  onChange={(e) => setRecetaForm({ ...recetaForm, nombre: e.target.value })}
                  placeholder="Ej: Yogurt de Fresa 1L Estándar"
                />
              </Box>
              <Box>
                <FormControl fullWidth>
                  <InputLabel>Producto Final Producido</InputLabel>
                  <Select
                    value={recetaForm.productoFinalId}
                    label="Producto Final Producido"
                    onChange={(e) => setRecetaForm({ ...recetaForm, productoFinalId: e.target.value })}
                  >
                    {productos
                      .filter((p) => p.tipoProducto === 'PRODUCTO_TERMINADO' || p.tipoProducto === 'PT')
                      .map((p) => (
                        <MenuItem key={p.id} value={p.id}>
                          {p.descripcion} ({p.sku})
                        </MenuItem>
                      ))}
                  </Select>
                </FormControl>
              </Box>
              <Box sx={{ gridColumn: { md: 'span 2' } }}>
                <TextField
                  label="Descripción / Procedimiento"
                  fullWidth
                  multiline
                  rows={2}
                  value={recetaForm.descripcion}
                  onChange={(e) => setRecetaForm({ ...recetaForm, descripcion: e.target.value })}
                />
              </Box>
              <Box>
                <TextField
                  label="Rendimiento Esperado (Cantidad)"
                  type="number"
                  fullWidth
                  value={recetaForm.cantidadEsperada}
                  onChange={(e) => setRecetaForm({ ...recetaForm, cantidadEsperada: e.target.value })}
                />
              </Box>
              <Box>
                <TextField
                  label="Costo Estimado Unitario (USD)"
                  type="number"
                  fullWidth
                  value={recetaForm.costoEstimado}
                  onChange={(e) => setRecetaForm({ ...recetaForm, costoEstimado: e.target.value })}
                />
              </Box>
            </Box>

            <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.08)' }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                Ingredientes y Dosificación
              </Typography>
              <Button size="small" variant="outlined" startIcon={<Add />} onClick={handleAgregarIngrediente}>
                Añadir Insumo
              </Button>
            </Box>

            {recetaForm.detalles.map((d, index) => (
              <Box key={index} sx={{ display: 'grid', gridTemplateColumns: '7fr 4fr 1fr', gap: 2, alignItems: 'center' }}>
                <Box>
                  <FormControl fullWidth size="small">
                    <InputLabel>Materia Prima / Insumo</InputLabel>
                    <Select
                      value={d.productoId}
                      label="Materia Prima / Insumo"
                      onChange={(e) => handleIngredienteChange(index, 'productoId', e.target.value)}
                    >
                      {productos
                        .filter((p) => p.tipoProducto === 'MATERIA_PRIMA' || p.tipoProducto === 'MP' || p.tipoProducto === 'INSUMO' || p.tipoProducto === 'INS')
                        .map((p) => (
                          <MenuItem key={p.id} value={p.id}>
                            {p.descripcion} ({p.sku})
                          </MenuItem>
                        ))}
                    </Select>
                  </FormControl>
                </Box>
                <Box>
                  <TextField
                    label={`Cantidad (${productos.find((p) => p.id === d.productoId)?.unidadMedida || ''})`}
                    type="number"
                    size="small"
                    fullWidth
                    value={d.cantidadRequerida}
                    onChange={(e) => handleIngredienteChange(index, 'cantidadRequerida', e.target.value)}
                  />
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                  <IconButton color="error" onClick={() => handleQuitarIngrediente(index)}>
                    <Delete />
                  </IconButton>
                </Box>
              </Box>
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenReceta(false)}>Cancelar</Button>
          <Button onClick={handleGuardarReceta} variant="contained" color="success">
            Guardar Receta
          </Button>
        </DialogActions>
      </Dialog>

      {/* --- DIALOG CREAR ORDEN --- */}
      <Dialog open={openOrden} onClose={() => setOpenOrden(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Planificar Nueva Orden de Producción</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1.5 }}>
            <FormControl fullWidth>
              <InputLabel>Receta a Utilizar</InputLabel>
              <Select
                value={ordenForm.recetaId}
                label="Receta a Utilizar"
                onChange={(e) => setOrdenForm({ ...ordenForm, recetaId: e.target.value })}
              >
                {recetas.map((r) => (
                  <MenuItem key={r.id} value={r.id}>
                    {r.nombre} (rinde: {r.cantidadEsperada} {r.productoFinal.unidadMedida})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {(usuario?.rol === 'ADMINISTRADOR' || usuario?.rol === 'SUPERVISOR') && (
              <FormControl fullWidth>
                <InputLabel>Planta / Sucursal</InputLabel>
                <Select
                  value={ordenForm.sucursalId}
                  label="Planta / Sucursal"
                  onChange={(e) => setOrdenForm({ ...ordenForm, sucursalId: e.target.value })}
                >
                  {sucursales.map((s) => (
                    <MenuItem key={s.id} value={s.id}>
                      {s.nombre}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            <TextField
              label={`Cantidad Planificada a Producir (${recetas.find(r => r.id === ordenForm.recetaId)?.productoFinal.unidadMedida || ''})`}
              type="number"
              fullWidth
              value={ordenForm.cantidadPlanificada}
              onChange={(e) => setOrdenForm({ ...ordenForm, cantidadPlanificada: e.target.value })}
            />

            <FormControl fullWidth>
              <InputLabel>Operador / Responsable de Lote</InputLabel>
              <Select
                value={ordenForm.responsableId}
                label="Operador / Responsable de Lote"
                onChange={(e) => setOrdenForm({ ...ordenForm, responsableId: e.target.value })}
              >
                {usuarios.map((u) => (
                  <MenuItem key={u.id} value={u.id}>
                    {u.nombre} ({u.rol})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenOrden(false)}>Cancelar</Button>
          <Button onClick={handleCrearOrden} variant="contained" color="primary">
            Planificar
          </Button>
        </DialogActions>
      </Dialog>

      {/* --- DIALOG COMPLETAR ORDEN CON CONSUMO/MERMAS --- */}
      <Dialog open={openCompletar} onClose={() => setOpenCompletar(false)} maxWidth="md" fullWidth>
        <DialogTitle>Finalizar Orden de Producción - Registro de Lote y Consumos</DialogTitle>
        <DialogContent>
          {selectedOrden && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1.5 }}>
              <Alert severity="info">
                Al finalizar esta orden, se descontará automáticamente el stock de materias primas según la receta (aplicando FEFO en lotes) y se cargará el producto terminado al inventario general.
              </Alert>

              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                <Box>
                  <TextField
                    label={`Cantidad Real Producida (${selectedOrden.receta.productoFinal.unidadMedida})`}
                    type="number"
                    fullWidth
                    value={completarForm.cantidadProducida}
                    onChange={(e) => setCompletarForm({ ...completarForm, cantidadProducida: e.target.value })}
                  />
                </Box>
                <Box>
                  <TextField
                    label="Número de Lote Generado"
                    fullWidth
                    value={completarForm.loteNumero}
                    onChange={(e) => setCompletarForm({ ...completarForm, loteNumero: e.target.value })}
                  />
                </Box>
              </Box>

              <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.08)' }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'warning.main' }}>
                  Declarar Mermas de Materia Prima en este lote (Opcional)
                </Typography>
                <Button size="small" variant="outlined" color="warning" startIcon={<Add />} onClick={handleAgregarMermaOrden}>
                  Añadir Merma de Insumo
                </Button>
              </Box>

              {completarForm.mermas.map((m, index) => (
                <Box key={index} sx={{ display: 'grid', gridTemplateColumns: '5fr 3fr 3fr 1fr', gap: 2, alignItems: 'center' }}>
                  <Box>
                    <FormControl fullWidth size="small">
                      <InputLabel>Materia Prima Perdida</InputLabel>
                      <Select
                        value={m.productoId}
                        label="Materia Prima Perdida"
                        onChange={(e) => handleMermaOrdenChange(index, 'productoId', e.target.value)}
                      >
                        {selectedOrden.receta.detalles.map((d: any) => (
                          <MenuItem key={d.producto.id} value={d.producto.id}>
                            {d.producto.descripcion}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Box>
                  <Box>
                    <TextField
                      label="Cantidad Perdida"
                      type="number"
                      size="small"
                      fullWidth
                      value={m.cantidad}
                      onChange={(e) => handleMermaOrdenChange(index, 'cantidad', e.target.value)}
                    />
                  </Box>
                  <Box>
                    <FormControl fullWidth size="small">
                      <InputLabel>Motivo</InputLabel>
                      <Select
                        value={m.motivo}
                        label="Motivo"
                        onChange={(e) => handleMermaOrdenChange(index, 'motivo', e.target.value)}
                      >
                        <MenuItem value="EVAPORACION">Evaporación</MenuItem>
                        <MenuItem value="DERRAME">Derrame / Vertido</MenuItem>
                        <MenuItem value="DEFECTO_EMPAQUE">Defecto de Empaque</MenuItem>
                        <MenuItem value="OTRO">Otro</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>
                  <Box sx={{ textAlign: 'center' }}>
                    <IconButton color="error" onClick={() => handleQuitarMermaOrden(index)}>
                      <Delete />
                    </IconButton>
                  </Box>
                </Box>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCompletar(false)}>Cancelar</Button>
          <Button onClick={handleCompletarOrden} variant="contained" color="success">
            Finalizar y Generar Lote
          </Button>
        </DialogActions>
      </Dialog>

      {/* --- DIALOG REGISTRAR MERMA GENERAL --- */}
      <Dialog open={openMermaGeneral} onClose={() => setOpenMermaGeneral(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Registrar Desecho / Merma de Producto</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1.5 }}>
            <FormControl fullWidth>
              <InputLabel>Producto / Insumo</InputLabel>
              <Select
                value={mermaForm.productoId}
                label="Producto / Insumo"
                onChange={(e) => setMermaForm({ ...mermaForm, productoId: e.target.value })}
              >
                {productos.map((p) => (
                  <MenuItem key={p.id} value={p.id}>
                    {p.descripcion} ({p.sku})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {(usuario?.rol === 'ADMINISTRADOR' || usuario?.rol === 'SUPERVISOR') && (
              <FormControl fullWidth>
                <InputLabel>Sucursal de Origen</InputLabel>
                <Select
                  value={mermaForm.sucursalId}
                  label="Sucursal de Origen"
                  onChange={(e) => setMermaForm({ ...mermaForm, sucursalId: e.target.value })}
                >
                  {sucursales.map((s) => (
                    <MenuItem key={s.id} value={s.id}>
                      {s.nombre}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            <TextField
              label={`Cantidad Desechada (${productos.find(p => p.id === mermaForm.productoId)?.unidadMedida || ''})`}
              type="number"
              fullWidth
              value={mermaForm.cantidad}
              onChange={(e) => setMermaForm({ ...mermaForm, cantidad: e.target.value })}
            />

            <FormControl fullWidth>
              <InputLabel>Motivo del Desecho</InputLabel>
              <Select
                value={mermaForm.motivo}
                label="Motivo del Desecho"
                onChange={(e) => setMermaForm({ ...mermaForm, motivo: e.target.value })}
              >
                <MenuItem value="EVAPORACION">Evaporación / Merma Natural</MenuItem>
                <MenuItem value="DERRAME">Derrame / Caída</MenuItem>
                <MenuItem value="DEFECTO_EMPAQUE">Defecto de Empaque</MenuItem>
                <MenuItem value="VENCIMIENTO">Vencimiento de Lote</MenuItem>
                <MenuItem value="RECHAZADO_CALIDAD">Rechazado por Calidad</MenuItem>
                <MenuItem value="OTRO">Otro Motivo</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenMermaGeneral(false)}>Cancelar</Button>
          <Button onClick={handleRegistrarMermaGeneral} variant="contained" color="warning">
            Registrar Merma
          </Button>
        </DialogActions>
      </Dialog>

      {/* --- DIALOG DE PICK LIST (PROCESAR SELECCION) --- */}
      <Dialog open={openPicking} onClose={() => setOpenPicking(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>
          Detalle de Selección de Materia Prima (Pick List) - Orden {pickingData?.numeroOrden}
        </DialogTitle>
        <DialogContent>
          {pickingData && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1.5 }}>
              <Alert severity="info" sx={{ borderRadius: 2 }}>
                Valores sugeridos corresponden a la cantidad teórica de la receta para {pickingData.cantidadPlanificada} unidades de producto terminado ({pickingData.recetaNombre}).
              </Alert>

              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: 'rgba(255, 255, 255, 0.03)' }}>
                    <TableCell>Insumo / Materia Prima</TableCell>
                    <TableCell align="right">Requerido</TableCell>
                    <TableCell align="right">Stock Disponible</TableCell>
                    <TableCell sx={{ minWidth: 220 }}>Lote Escaneado / Seleccionado</TableCell>
                    <TableCell align="right" sx={{ width: 130 }}>Cantidad Picked</TableCell>
                    <TableCell align="center">¿Picked? (Recolectado)</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pickingData.ingredientes.map((ing: any, idx: number) => {
                    const isShortage = ing.stockDisponible < parseFloat(ing.cantidadPicked || 0);
                    return (
                      <TableRow key={ing.productoId} hover>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>{ing.descripcion}</Typography>
                          <Typography variant="caption" color="text.secondary">{ing.sku}</Typography>
                        </TableCell>
                        <TableCell align="right">
                          {ing.cantidadRequerida} {ing.unidadMedida}
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{
                            color: ing.stockDisponible < ing.cantidadRequerida ? '#f87171' : 'inherit',
                            fontWeight: ing.stockDisponible < ing.cantidadRequerida ? 700 : 'normal',
                          }}
                        >
                          {ing.stockDisponible} {ing.unidadMedida}
                        </TableCell>
                        <TableCell>
                          <Autocomplete
                            freeSolo
                            options={ing.lotesDisponibles ? ing.lotesDisponibles.map((l: any) => l.numeroLote) : []}
                            value={ing.loteNumero || ''}
                            onChange={(_, newValue) => {
                              const newIng = [...pickingData.ingredientes];
                              newIng[idx].loteNumero = newValue || '';
                              setPickingData({ ...pickingData, ingredientes: newIng });
                            }}
                            onInputChange={(_, newInputValue) => {
                              const newIng = [...pickingData.ingredientes];
                              newIng[idx].loteNumero = newInputValue || '';
                              setPickingData({ ...pickingData, ingredientes: newIng });
                            }}
                            renderInput={(params) => (
                              <TextField
                                {...params}
                                size="small"
                                placeholder="Escribe o escanea lote"
                              />
                            )}
                          />
                          {ing.lotesDisponibles && ing.lotesDisponibles.length > 0 && (
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, fontSize: '0.75rem' }}>
                              Sugeridos: {ing.lotesDisponibles.map((l: any) => `${l.numeroLote} (${l.cantidadActual} ${ing.unidadMedida})`).join(', ')}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell align="right">
                          <TextField
                            type="number"
                            size="small"
                            value={ing.cantidadPicked}
                            onChange={(e) => {
                              const newIng = [...pickingData.ingredientes];
                              newIng[idx].cantidadPicked = e.target.value;
                              setPickingData({ ...pickingData, ingredientes: newIng });
                            }}
                            error={isShortage && ing.picked}
                            helperText={isShortage && ing.picked ? 'Excede stock disponible' : ''}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Checkbox
                            checked={ing.picked}
                            onChange={(e) => {
                              const newIng = [...pickingData.ingredientes];
                              newIng[idx].picked = e.target.checked;
                              setPickingData({ ...pickingData, ingredientes: newIng });
                            }}
                            color="success"
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setOpenPicking(false)} variant="outlined">Cancelar</Button>
          <Button onClick={handleConfirmarPicking} variant="contained" color="success">
            Confirmar y Registrar Selección
          </Button>
        </DialogActions>
      </Dialog>

      {/* --- DIALOG EDITAR ORDEN --- */}
      <Dialog open={openEditarOrden} onClose={() => setOpenEditarOrden(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>
          Editar Orden de Producción - {editarOrdenForm.numeroOrden}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1.5 }}>
            <TextField
              label="Receta"
              fullWidth
              disabled
              value={editarOrdenForm.recetaNombre}
            />

            <TextField
              label="Cantidad Planificada"
              type="number"
              fullWidth
              value={editarOrdenForm.cantidadPlanificada}
              onChange={(e) => setEditarOrdenForm({ ...editarOrdenForm, cantidadPlanificada: e.target.value })}
            />

            <FormControl fullWidth>
              <InputLabel>Operador / Responsable</InputLabel>
              <Select
                value={editarOrdenForm.responsableId}
                label="Operador / Responsable"
                onChange={(e) => setEditarOrdenForm({ ...editarOrdenForm, responsableId: e.target.value })}
              >
                {usuarios.map((u) => (
                  <MenuItem key={u.id} value={u.id}>
                    {u.nombre} ({u.rol})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setOpenEditarOrden(false)} variant="outlined">Cancelar</Button>
          <Button onClick={handleGuardarEditarOrden} variant="contained" color="primary">
            Guardar Cambios
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
