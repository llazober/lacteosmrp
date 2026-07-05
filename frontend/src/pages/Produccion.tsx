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
  TablePagination,
} from '@mui/material';
import {
  Add,
  Close,
  Assignment,
  Delete,
  Visibility,
  Scale,
  Warehouse,
  Edit,
  ArrowUpward,
  ArrowDownward,
  RestartAlt,
  Settings,
  AccountTree,
  QrCode,
} from '@mui/icons-material';
import { apiFetch, useAuthStore } from '../store/useAuthStore';
import dayjs from 'dayjs';
// Work centers are now loaded dynamically from the backend

export default function Produccion() {
  const usuario = useAuthStore((state) => state.usuario);
  const canSeeAll = usuario?.rol === 'ADMINISTRADOR' || usuario?.rol === 'SUPERVISOR' || usuario?.permisos?.includes('VER_PRODUCCION');
  const canSeePickingOnly = !canSeeAll && usuario?.permisos?.includes('VER_PICKING');

  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(() => {
    const tabParam = new URLSearchParams(window.location.search).get('tab');
    if (tabParam) {
      const tabMap: Record<string, number> = {
        recetas: 0,
        ordenes: 1,
        picking: 2,
        mermas: 3,
        centros: 4,
      };
      if (tabMap[tabParam] !== undefined) {
        return tabMap[tabParam];
      }
    }
    // Fallback: if user only has picking permission, default to 2 (picking)
    const userState = useAuthStore.getState().usuario;
    const userCanSeeAll = userState?.rol === 'ADMINISTRADOR' || userState?.rol === 'SUPERVISOR' || userState?.permisos?.includes('VER_PRODUCCION');
    if (!userCanSeeAll && userState?.permisos?.includes('VER_PICKING')) {
      return 2;
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
        centros: 4,
      };
      if (tabMap[tabParam] !== undefined) {
        let targetTab = tabMap[tabParam];
        // Restrict if user only has picking permission
        if (canSeePickingOnly) {
          targetTab = 2;
        }
        if (targetTab !== activeTab) {
          setActiveTab(targetTab);
          setSelectedRowId(null);
        }
      }
    } else if (canSeePickingOnly && activeTab !== 2) {
      setActiveTab(2);
      setSelectedRowId(null);
    }
  }, [searchParams, canSeePickingOnly, activeTab]);

  const handleTabChange = (val: number) => {
    if (canSeePickingOnly) return;
    setActiveTab(val);
    setSelectedRowId(null);
    const tabNames = ['recetas', 'ordenes', 'picking', 'mermas', 'centros'];
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

  const getFormatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins < 60) return `${mins}m ${secs}s`;
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `${hrs}h ${remMins}m`;
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
    detalles: [] as { productoId: string; cantidadRequerida: string; sustitutoIds?: string[] }[],
  });

  const [openOrden, setOpenOrden] = useState(false);
  const [openConsumos, setOpenConsumos] = useState(false);
  const [selectedOrdenConsumos, setSelectedOrdenConsumos] = useState<any>(null);
  const [openReadOnlyPicking, setOpenReadOnlyPicking] = useState(false);
  const [readOnlyPickingData, setReadOnlyPickingData] = useState<any>(null);
  const [openRutaOrden, setOpenRutaOrden] = useState(false);
  const [selectedOrdenRuta, setSelectedOrdenRuta] = useState<any>(null);
  const [ordenForm, setOrdenForm] = useState({
    recetaId: '',
    sucursalId: '',
    cantidadPlanificada: '',
    responsableId: '',
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
    estado: '',
  });

  // Feedback
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [openBarcodeDialog, setOpenBarcodeDialog] = useState(false);
  const [barcodeDialogData, setBarcodeDialogData] = useState<any>(null);

  // Milk Mixing States
  const [openMixModal, setOpenMixModal] = useState(false);
  const [mixIngredientIndex, setMixIngredientIndex] = useState<number | null>(null);
  const [mixSelectedBinIds, setMixSelectedBinIds] = useState<string[]>([]);

  // Bill of Operations states
  const [openBoo, setOpenBoo] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [booOperations, setBooOperations] = useState<any[]>([]);

  // Centros de Trabajo states
  const [centrosTrabajo, setCentrosTrabajo] = useState<any[]>([]);
  const [openCentroTrabajo, setOpenCentroTrabajo] = useState(false);
  const [centroTrabajoForm, setCentroTrabajoForm] = useState({
    id: '',
    nombre: '',
    descripcion: '',
    duracionEstimada: '30',
    orden: '0',
    datosRequeridos: [] as { label: string; name: string; type: string; required: boolean; suffix?: string }[],
    isEditing: false,
  });

  // State variables for Production Orders search, filter and pagination
  const [searchOP, setSearchOP] = useState('');
  const [filtroEstadoOP, setFiltroEstadoOP] = useState('TODOS');
  const [pageOP, setPageOP] = useState(0);
  const [rowsPerPageOP, setRowsPerPageOP] = useState(25);

  const filteredOrdenes = ordenes.filter((op) => {
    const query = searchOP.toLowerCase();
    const matchesSearch =
      op.numeroOrden.toLowerCase().includes(query) ||
      op.receta.nombre.toLowerCase().includes(query) ||
      op.receta.productoFinal.descripcion.toLowerCase().includes(query);
    
    let matchesEstado = false;
    if (filtroEstadoOP === 'TODOS') {
      matchesEstado = true;
    } else if (filtroEstadoOP === 'EN_PROCESO') {
      matchesEstado = op.estado === 'EN_PROCESO' || (op.estado === 'PLANIFICADA' && op.pickingCompletado);
    } else if (filtroEstadoOP === 'PLANIFICADA') {
      matchesEstado = op.estado === 'PLANIFICADA' && !op.pickingCompletado;
    } else {
      matchesEstado = op.estado === filtroEstadoOP;
    }
    return matchesSearch && matchesEstado;
  });

  const handleConfigurarBoo = async (producto: any) => {
    try {
      setErrorMsg(null);
      setSelectedProduct(producto);
      const wcs = await apiFetch('/produccion/centros-trabajo');
      setCentrosTrabajo(wcs);
      const res = await apiFetch(`/produccion/bill-of-operations/${producto.id}`);
      const parsed = res.map((op: any) => ({
        ...op,
        datosRequeridos: typeof op.datosRequeridos === 'string'
          ? JSON.parse(op.datosRequeridos)
          : op.datosRequeridos || [],
      }));
      parsed.sort((a: any, b: any) => a.orden - b.orden);
      setBooOperations(parsed);
      setOpenBoo(true);
    } catch (e: any) {
      setErrorMsg(e.message || 'Error al obtener la hoja de ruta.');
    }
  };

  const handleGuardarBoo = async () => {
    try {
      setErrorMsg(null);
      const payload = {
        operations: booOperations.map((op, idx) => ({
          workCenter: op.workCenter,
          orden: idx + 1,
          duracionEstimada: parseInt(op.duracionEstimada) || 30,
          datosRequeridos: op.datosRequeridos,
        })),
      };

      await apiFetch(`/produccion/bill-of-operations/${selectedProduct.id}`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setSuccessMsg(`Hoja de Ruta (BOO) guardada con éxito para ${selectedProduct.descripcion}.`);
      setOpenBoo(false);
      cargarDatos();
    } catch (e: any) {
      setErrorMsg(e.message || 'Error al guardar la hoja de ruta.');
    }
  };

  const handleRestaurarDefectoBoo = async () => {
    if (!window.confirm('¿Está seguro de restaurar los valores por defecto para este producto? Se eliminará la configuración personalizada.')) return;
    try {
      setErrorMsg(null);
      await apiFetch(`/produccion/bill-of-operations/${selectedProduct.id}`, {
        method: 'DELETE',
      });
      setSuccessMsg(`Hoja de Ruta restablecida a los valores por defecto.`);
      setOpenBoo(false);
      cargarDatos();
    } catch (e: any) {
      setErrorMsg(e.message || 'Error al restaurar la hoja de ruta.');
    }
  };

  const handleAddBooStep = () => {
    const nextOrder = booOperations.length + 1;
    const defaultWc = centrosTrabajo.length > 0 ? centrosTrabajo[0].id : 'WC-PAST';
    setBooOperations([
      ...booOperations,
      {
        workCenter: defaultWc,
        orden: nextOrder,
        duracionEstimada: 30,
        datosRequeridos: [],
      },
    ]);
  };

  const handleRemoveBooStep = (index: number) => {
    const updated = [...booOperations];
    updated.splice(index, 1);
    const reordered = updated.map((op, idx) => ({ ...op, orden: idx + 1 }));
    setBooOperations(reordered);
  };

  const handleMoveStep = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === booOperations.length - 1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const updated = [...booOperations];
    
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;

    const reordered = updated.map((op, idx) => ({ ...op, orden: idx + 1 }));
    setBooOperations(reordered);
  };

  const handleStepChange = (index: number, field: string, value: any) => {
    const updated = [...booOperations];
    if (field === 'workCenter') {
      const selectedWc = centrosTrabajo.find((w) => w.id === value);
      updated[index] = {
        ...updated[index],
        workCenter: value,
        duracionEstimada: selectedWc ? selectedWc.duracionEstimada : 30,
        datosRequeridos: selectedWc && selectedWc.datosRequeridos 
          ? (typeof selectedWc.datosRequeridos === 'string' ? JSON.parse(selectedWc.datosRequeridos) : selectedWc.datosRequeridos)
          : [],
      };
    } else {
      updated[index] = {
        ...updated[index],
        [field]: value,
      };
    }
    setBooOperations(updated);
  };

  const handleAddBooParam = (stepIndex: number) => {
    const updated = [...booOperations];
    const params = updated[stepIndex].datosRequeridos || [];
    updated[stepIndex].datosRequeridos = [
      ...params,
      { label: 'Nuevo Parámetro', name: 'nuevo_parametro', type: 'number', required: true },
    ];
    setBooOperations(updated);
  };

  const handleRemoveBooParam = (stepIndex: number, paramIndex: number) => {
    const updated = [...booOperations];
    const params = [...(updated[stepIndex].datosRequeridos || [])];
    params.splice(paramIndex, 1);
    updated[stepIndex].datosRequeridos = params;
    setBooOperations(updated);
  };

  const handleParamChange = (stepIndex: number, paramIndex: number, field: string, value: any) => {
    const updated = [...booOperations];
    const params = [...(updated[stepIndex].datosRequeridos || [])];
    params[paramIndex] = {
      ...params[paramIndex],
      [field]: value,
    };
    updated[stepIndex].datosRequeridos = params;
    setBooOperations(updated);
  };

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
        const wcs = await apiFetch('/produccion/centros-trabajo');
        setCentrosTrabajo(wcs);
      } else if (activeTab === 1 || activeTab === 2) {
        const ord = await apiFetch('/produccion/ordenes');
        setOrdenes(ord);
        const rec = await apiFetch('/produccion/recetas');
        setRecetas(rec);
        const suc = await apiFetch('/sucursales');
        setSucursales(suc);
        const wcs = await apiFetch('/produccion/centros-trabajo');
        setCentrosTrabajo(wcs);
        
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
      } else if (activeTab === 4) {
        const wcs = await apiFetch('/produccion/centros-trabajo');
        setCentrosTrabajo(wcs);
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
      detalles: [...recetaForm.detalles, { productoId: '', cantidadRequerida: '', sustitutoIds: [] }],
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

      const finalProd = productos.find((p) => p.id === productoFinalId);
      if (finalProd && finalProd.unidadMedida?.toUpperCase() === 'UNIDAD') {
        if (parseFloat(cantidadEsperada) % 1 !== 0) {
          throw new Error(`Para recetas del producto final "${finalProd.descripcion}" (Unidades), el rendimiento estimado (cantidad esperada) debe ser un número entero.`);
        }
      }

      for (const d of detalles) {
        if (!d.productoId || !d.cantidadRequerida || parseFloat(d.cantidadRequerida) <= 0) {
          throw new Error('Todos los ingredientes deben tener un insumo y una cantidad mayor a 0.');
        }
        const ingProd = productos.find((p) => p.id === d.productoId);
        if (ingProd && ingProd.unidadMedida?.toUpperCase() === 'UNIDAD') {
          if (parseFloat(d.cantidadRequerida) % 1 !== 0) {
            throw new Error(`Para el ingrediente "${ingProd.descripcion}" (Unidades), la cantidad requerida debe ser un número entero.`);
          }
        }
      }

      const payload = {
        nombre,
        descripcion,
        productoFinalId,
        cantidadEsperada: parseFloat(cantidadEsperada),
        costoEstimado: parseFloat(costoEstimado),
        detalles: detalles.map((d) => ({
          productoId: d.productoId,
          cantidadRequerida: parseFloat(d.cantidadRequerida),
          sustitutoIds: d.sustitutoIds || [],
        })),
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
        sustitutoIds: d.sustitutos ? d.sustitutos.map((s: any) => s.productoId) : [],
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

      const receta = recetas.find((r) => r.id === recetaId);
      const prod = productos.find((p) => p.id === receta?.productoFinalId);
      if (prod && prod.unidadMedida?.toUpperCase() === 'UNIDAD') {
        if (parseFloat(cantidadPlanificada) % 1 !== 0) {
          throw new Error(`Para el producto "${prod.descripcion}" (Unidades), la cantidad planificada debe ser un número entero.`);
        }
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

  const handleOpenReadOnlyPicking = async (order: any) => {
    try {
      setErrorMsg(null);
      const data = await apiFetch(`/produccion/ordenes/${order.id}/picking`);
      setReadOnlyPickingData(data);
      setOpenReadOnlyPicking(true);
    } catch (e: any) {
      setErrorMsg(e.message || 'Error al obtener datos de picking.');
    }
  };

  const handleOpenPicking = async (order: any) => {
    try {
      setErrorMsg(null);
      setSelectedPickingOrder(order);
      const data = await apiFetch(`/produccion/ordenes/${order.id}/picking`);
      const ingredientes = data.ingredientes.map((i: any) => ({
        ...i,
        picked: false,
        selectedProductoId: i.productoId,
        binId: i.bin?.id || '',
        binIds: i.binIds || (i.bin ? [i.bin.id] : []),
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
      for (const ing of pickingData.ingredientes) {
        const actualProdId = ing.selectedProductoId || ing.productoId;
        const prod = productos.find((p) => p.id === actualProdId);
        if (prod && prod.unidadMedida?.toUpperCase() === 'UNIDAD') {
          if (parseFloat(ing.cantidadPicked) % 1 !== 0) {
            throw new Error(`Para el ingrediente "${prod.descripcion}" (Unidades), la cantidad de picking debe ser un número entero.`);
          }
        }
        if (ing.esBodegaLeche && ing.picked) {
          if (!ing.binIds || ing.binIds.length === 0) {
            throw new Error(`Debe seleccionar al menos un tanque en la Mezcla Proporcional para ${ing.descripcion}.`);
          }
        }
      }
      const res = await apiFetch(`/produccion/ordenes/${selectedPickingOrder.id}/picking`, {
        method: 'POST',
        body: JSON.stringify({
          detalles: pickingData.ingredientes.map((i: any) => ({
            reqProductoId: i.productoId,
            productoId: i.selectedProductoId || i.productoId,
            cantidadPicked: parseFloat(i.cantidadPicked),
            picked: i.picked,
            loteNumero: i.loteNumero || '',
            binId: i.binId || i.bin?.id || '',
            binIds: i.binIds || (i.binId ? [i.binId] : i.bin ? [i.bin.id] : []),
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

  const handlePrintBarcode = (data: any) => {
    if (!data) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const isPT = data.tipoProducto === 'PT' || data.tipoProducto === 'PRODUCTO_TERMINADO';
    const barcodeVal = isPT ? `${data.prodId}#${data.numeroLote}` : data.numeroLote;
    const barcodeUrl = `https://barcode.tec-it.com/barcode.ashx?data=${encodeURIComponent(
      barcodeVal
    )}&code=Code128`;
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Imprimir Lote - ${data.numeroLote}</title>
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
          <div class="title">${data.productoNombre}</div>
          <div class="subtitle">SKU: ${data.sku} | Lote: ${data.numeroLote}</div>
          <img class="barcode-img" src="${barcodeUrl}" alt="Barcode" />
          <div class="code-text">${barcodeVal}</div>
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

  const handleOpenBarcodePrint = (op: any) => {
    const cleanSku = op.receta.productoFinal.sku.replace('PROD-', '');
    const dateStr = dayjs(op.fechaInicio || op.createdAt || new Date()).format('YYYYMMDD');
    const generatedLote = op.lotesProducidos?.[0]?.numeroLote || `L-${cleanSku}-${dateStr}`;
    
    setBarcodeDialogData({
      productoNombre: op.receta.productoFinal.descripcion || op.receta.productoFinal.nombre,
      sku: op.receta.productoFinal.sku,
      numeroLote: generatedLote,
      tipoProducto: op.receta.productoFinal.tipoProducto,
      prodId: op.receta.productoFinal.prodId,
    });
    setOpenBarcodeDialog(true);
  };

  const handleOpenEditarOrden = (op: any) => {
    setEditarOrdenForm({
      id: op.id,
      numeroOrden: op.numeroOrden,
      recetaNombre: op.receta.nombre,
      cantidadPlanificada: op.cantidadPlanificada.toString(),
      responsableId: op.responsableId,
      estado: op.estado,
    });
    setOpenEditarOrden(true);
  };

  const handleGuardarEditarOrden = async () => {
    try {
      setErrorMsg(null);
      const orderObj = ordenes.find((o) => o.id === editarOrdenForm.id);
      const prod = productos.find((p) => p.id === orderObj?.receta?.productoFinalId);
      if (prod && prod.unidadMedida?.toUpperCase() === 'UNIDAD') {
        if (parseFloat(editarOrdenForm.cantidadPlanificada) % 1 !== 0) {
          throw new Error(`Para el producto "${prod.descripcion}" (Unidades), la cantidad planificada debe ser un número entero.`);
        }
      }
      await apiFetch(`/produccion/ordenes/${editarOrdenForm.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          cantidadPlanificada: parseFloat(editarOrdenForm.cantidadPlanificada),
          responsableId: editarOrdenForm.responsableId,
          estado: editarOrdenForm.estado,
        }),
      });
      setSuccessMsg(`Orden ${editarOrdenForm.numeroOrden} actualizada con éxito.`);
      setOpenEditarOrden(false);
      cargarDatos();
    } catch (e: any) {
      setErrorMsg(e.message || 'Error al actualizar la orden.');
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

      const prod = productos.find((p) => p.id === productoId);
      if (prod && prod.unidadMedida?.toUpperCase() === 'UNIDAD') {
        if (parseFloat(cantidad) % 1 !== 0) {
          throw new Error(`Para productos en Unidades (${prod.descripcion}), la cantidad de merma debe ser un número entero.`);
        }
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

  // --- HANDLERS CENTROS DE TRABAJO ---
  const handleGuardarCentroTrabajo = async () => {
    try {
      setErrorMsg(null);
      const { id, nombre, descripcion, duracionEstimada, orden, datosRequeridos, isEditing } = centroTrabajoForm;
      if (!nombre) throw new Error('El Nombre es obligatorio.');
      if (!isEditing && !id) throw new Error('El ID es obligatorio.');

      if (isEditing) {
        await apiFetch(`/produccion/centros-trabajo/${id}`, {
          method: 'PUT',
          body: JSON.stringify({ nombre, descripcion, duracionEstimada: parseInt(duracionEstimada), orden: parseInt(orden), datosRequeridos }),
        });
        setSuccessMsg(`Centro de trabajo "${nombre}" actualizado.`);
      } else {
        await apiFetch('/produccion/centros-trabajo', {
          method: 'POST',
          body: JSON.stringify({ id, nombre, descripcion, duracionEstimada: parseInt(duracionEstimada), orden: parseInt(orden), datosRequeridos }),
        });
        setSuccessMsg(`Centro de trabajo "${nombre}" creado.`);
      }
      setOpenCentroTrabajo(false);
      const wcs = await apiFetch('/produccion/centros-trabajo');
      setCentrosTrabajo(wcs);
    } catch (e: any) {
      setErrorMsg(e.message || 'Error al guardar el centro de trabajo.');
    }
  };

  const handleEliminarCentroTrabajo = async (id: string) => {
    if (!window.confirm(`¿Está seguro de eliminar el centro de trabajo "${id}"? Se eliminarán también sus referencias en hojas de ruta de productos.`)) return;
    try {
      setErrorMsg(null);
      await apiFetch(`/produccion/centros-trabajo/${id}`, { method: 'DELETE' });
      setSuccessMsg(`Centro de trabajo eliminado.`);
      const wcs = await apiFetch('/produccion/centros-trabajo');
      setCentrosTrabajo(wcs);
    } catch (e: any) {
      setErrorMsg(e.message || 'Error al eliminar el centro de trabajo.');
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
          {activeTab === 0 && !canSeePickingOnly && (usuario?.rol === 'ADMINISTRADOR' || usuario?.rol === 'SUPERVISOR' || usuario?.rol === 'ALMACEN') && (
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

          {activeTab === 1 && !canSeePickingOnly && (usuario?.rol === 'ADMINISTRADOR' || usuario?.rol === 'SUPERVISOR' || usuario?.rol === 'ALMACEN') && (
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

          {activeTab === 3 && !canSeePickingOnly && (usuario?.rol === 'ADMINISTRADOR' || usuario?.rol === 'SUPERVISOR' || usuario?.rol === 'ALMACEN') && (
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

          {activeTab === 4 && canSeeAll && (usuario?.rol === 'ADMINISTRADOR' || usuario?.rol === 'SUPERVISOR') && (usuario?.rol === 'ADMINISTRADOR' || usuario?.rol === 'SUPERVISOR') && (
            <Button
              variant="contained"
              color="primary"
              startIcon={<Add />}
              onClick={() => {
                setCentroTrabajoForm({
                  id: '',
                  nombre: '',
                  descripcion: '',
                  duracionEstimada: '30',
                  orden: String(centrosTrabajo.length + 1),
                  datosRequeridos: [],
                  isEditing: false,
                });
                setOpenCentroTrabajo(true);
              }}
            >
              Nuevo Centro de Trabajo
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
          value={canSeePickingOnly ? 'picking' : (() => {
            const tabNames = ['recetas', 'ordenes', 'picking', 'mermas', 'centros'];
            return tabNames[activeTab] || 'recetas';
          })()}
          onChange={(_, val) => {
            const tabMap: Record<string, number> = {
              recetas: 0,
              ordenes: 1,
              picking: 2,
              mermas: 3,
              centros: 4,
            };
            handleTabChange(tabMap[val]);
          }}
          textColor="primary"
          indicatorColor="primary"
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}
        >
          {!canSeePickingOnly && <Tab label="Recetario Maestro" value="recetas" />}
          {!canSeePickingOnly && <Tab label="Órdenes de Producción (OP)" value="ordenes" />}
          <Tab label="Listas de Selección (Pick Lists)" value="picking" />
          {!canSeePickingOnly && <Tab label="Control de Mermas (Desechos)" value="mermas" />}
          {canSeeAll && (usuario?.rol === 'ADMINISTRADOR' || usuario?.rol === 'SUPERVISOR') && (
            <Tab label="⚙ Centros de Trabajo" value="centros" />
          )}
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
                        <Box key={d.id} sx={{ py: 0.75, borderBottom: '1px solid rgba(255, 255, 255, 0.03)' }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>{d.producto.descripcion}</Typography>
                            <Typography variant="body2" color="primary.main" sx={{ fontWeight: 700 }}>
                              {d.cantidadRequerida} {d.producto.unidadMedida}
                            </Typography>
                          </Box>
                          {d.sustitutos && d.sustitutos.length > 0 && (
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25, pl: 1 }}>
                              Sustitutos: {d.sustitutos.map((s: any) => s.producto.descripcion).join(', ')}
                            </Typography>
                          )}
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
                  <CardActions sx={{ justifyContent: 'flex-end', p: 2, pt: 0, gap: 1 }}>
                    {(usuario?.rol === 'ADMINISTRADOR' || usuario?.rol === 'SUPERVISOR' || usuario?.rol === 'ALMACEN') && (
                      <>
                        <Button size="small" variant="outlined" color="primary" onClick={() => handleConfigurarBoo(r.productoFinal)}>
                          Ruta (BOO)
                        </Button>
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
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <TextField
              size="small"
              label="Buscar por Nro Orden, Receta o Producto"
              variant="outlined"
              value={searchOP}
              onChange={(e) => {
                setSearchOP(e.target.value);
                setPageOP(0);
              }}
              sx={{ width: 350, backgroundColor: 'rgba(255,255,255,0.03)' }}
            />
            <FormControl size="small" sx={{ width: 200 }}>
              <InputLabel>Estado</InputLabel>
              <Select
                value={filtroEstadoOP}
                label="Estado"
                onChange={(e) => {
                  setFiltroEstadoOP(e.target.value);
                  setPageOP(0);
                }}
                sx={{ backgroundColor: 'rgba(255,255,255,0.03)' }}
              >
                <MenuItem value="TODOS">Todos los Estados</MenuItem>
                <MenuItem value="BORRADOR">BORRADOR</MenuItem>
                <MenuItem value="PLANIFICADA">PLANIFICADA</MenuItem>
                <MenuItem value="EN_PROCESO">EN_PROCESO</MenuItem>
                <MenuItem value="COMPLETADA">COMPLETADA</MenuItem>
                <MenuItem value="FALTANTES">FALTANTES</MenuItem>
                <MenuItem value="CANCELADA">CANCELADA</MenuItem>
              </Select>
            </FormControl>
          </Box>

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
                {filteredOrdenes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} align="center">
                      No se encontraron órdenes de producción.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOrdenes
                    .slice(pageOP * rowsPerPageOP, pageOP * rowsPerPageOP + rowsPerPageOP)
                    .map((op) => {
                      const isSelected = selectedRowId === op.id;
                      const sortedOps = [...(op.operaciones || [])].sort((a: any, b: any) => a.orden - b.orden);
                      const activeOp = op.operaciones?.find((step: any) => step.estado === 'EN_PROCESO')
                        || (op.estado === 'EN_PROCESO' || (op.estado === 'PLANIFICADA' && op.pickingCompletado)
                            ? sortedOps.find((step: any) => step.estado === 'PENDIENTE')
                            : null);
                      const ctName = activeOp
                        ? (centrosTrabajo.find((w: any) => w.id === activeOp.workCenter)?.nombre || activeOp.workCenter)
                        : '';

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
                              label={(op.estado === 'PLANIFICADA' && op.pickingCompletado) ? 'EN_PROCESO' : op.estado}
                              size="small"
                              color={
                                op.estado === 'COMPLETADA'
                                  ? 'success'
                                  : (op.estado === 'EN_PROCESO' || (op.estado === 'PLANIFICADA' && op.pickingCompletado))
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
                            {((op.estado === 'EN_PROCESO' || (op.estado === 'PLANIFICADA' && op.pickingCompletado)) && ctName) && (
                              <Typography
                                variant="caption"
                                  sx={{ display: 'block', mt: 0.5, fontWeight: 600, color: 'primary.light' }}
                              >
                                📍 {ctName}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={op.pickingCompletado ? 'Completado' : 'Pendiente'}
                              size="small"
                              color={op.pickingCompletado ? 'success' : 'default'}
                            />
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
                              <Tooltip title="Ver Ruta de Operaciones">
                                <IconButton
                                  color="primary"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedOrdenRuta(op);
                                    setOpenRutaOrden(true);
                                  }}
                                  size="small"
                                >
                                  <Settings fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Imprimir Código de Barras">
                                <IconButton
                                  color="success"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenBarcodePrint(op);
                                  }}
                                  size="small"
                                >
                                  <QrCode fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Ver Pick List (Lectura)">
                                <IconButton color="secondary" onClick={(e) => { e.stopPropagation(); handleOpenReadOnlyPicking(op); }} size="small">
                                  <Assignment fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              {op.estado !== 'COMPLETADA' && op.estado !== 'CANCELADA' && (usuario?.rol === 'ADMINISTRADOR' || usuario?.rol === 'SUPERVISOR' || usuario?.rol === 'ALMACEN') && (
                                <>
                                  <Tooltip title="Editar Orden">
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
                              {op.estado === 'COMPLETADA' && (
                                <Tooltip title="Ver detalles de consumos">
                                  <IconButton color="info" onClick={(e) => { e.stopPropagation(); setSelectedOrdenConsumos(op); setOpenConsumos(true); }}>
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
            <TablePagination
              rowsPerPageOptions={[10, 25, 50, 100]}
              component="div"
              count={filteredOrdenes.length}
              rowsPerPage={rowsPerPageOP}
              page={pageOP}
              onPageChange={(_, newPage) => setPageOP(newPage)}
              onRowsPerPageChange={(e) => {
                setRowsPerPageOP(parseInt(e.target.value, 10));
                setPageOP(0);
              }}
              labelRowsPerPage="Órdenes por página:"
              sx={{
                borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                color: 'text.secondary',
              }}
            />
          </Paper>
        </Box>
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

      {/* --- TAB CENTROS DE TRABAJO --- */}
      {activeTab === 4 && (
        <Paper sx={{ backgroundColor: '#111827', borderRadius: 2, overflow: 'hidden' }}>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: 'rgba(255, 255, 255, 0.03)' }}>
                <TableCell sx={{ fontWeight: 700 }}>ID</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Nombre</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Descripción</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="center">Duración Est. (min)</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="center">Orden</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="center">Campos QA</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="center">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {centrosTrabajo.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    No hay centros de trabajo configurados. El sistema creará los predeterminados al reiniciar.
                  </TableCell>
                </TableRow>
              ) : (
                centrosTrabajo.map((ct) => (
                  <TableRow key={ct.id} hover sx={{ '&:hover': { backgroundColor: 'rgba(255,255,255,0.02)' } }}>
                    <TableCell>
                      <Chip label={ct.id} size="small" variant="outlined" sx={{ fontFamily: 'monospace', fontWeight: 700 }} />
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{ct.nombre}</TableCell>
                    <TableCell sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>{ct.descripcion}</TableCell>
                    <TableCell align="center">{ct.duracionEstimada} min</TableCell>
                    <TableCell align="center">
                      <Chip label={`#${ct.orden}`} size="small" color="primary" variant="outlined" />
                    </TableCell>
                    <TableCell align="center">
                      {ct.datosRequeridos ? (
                        <Chip
                          label={`${JSON.parse(ct.datosRequeridos).length} campos`}
                          size="small"
                          color="info"
                          variant="outlined"
                        />
                      ) : (
                        <Chip label="Sin campos" size="small" variant="outlined" />
                      )}
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                        <Tooltip title="Editar">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => {
                              const parsedFields = ct.datosRequeridos
                                ? (typeof ct.datosRequeridos === 'string' ? JSON.parse(ct.datosRequeridos) : ct.datosRequeridos)
                                : [];
                              setCentroTrabajoForm({
                                id: ct.id,
                                nombre: ct.nombre,
                                descripcion: ct.descripcion || '',
                                duracionEstimada: String(ct.duracionEstimada),
                                orden: String(ct.orden),
                                datosRequeridos: parsedFields,
                                isEditing: true,
                              });
                              setOpenCentroTrabajo(true);
                            }}
                          >
                            <Edit fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Eliminar">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleEliminarCentroTrabajo(ct.id)}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
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
                      .filter((p) => (p.tipoProducto === 'PRODUCTO_TERMINADO' || p.tipoProducto === 'PT') && p.esManufacturado)
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
              <Box key={index} sx={{ p: 2, border: '1px dashed rgba(255, 255, 255, 0.1)', borderRadius: 1, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Box sx={{ display: 'grid', gridTemplateColumns: '7fr 4fr 1fr', gap: 2, alignItems: 'center' }}>
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
                
                {d.productoId && (
                  <Box>
                    <FormControl fullWidth size="small">
                      <InputLabel>Productos Sustitutos Autorizados</InputLabel>
                      <Select
                        multiple
                        value={d.sustitutoIds || []}
                        label="Productos Sustitutos Autorizados"
                        onChange={(e) => {
                          const val = typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value;
                          const list = [...recetaForm.detalles];
                          list[index] = { ...list[index], sustitutoIds: val };
                          setRecetaForm({ ...recetaForm, detalles: list });
                        }}
                        renderValue={(selected) => (
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {(selected as string[]).map((value) => {
                              const prod = productos.find(p => p.id === value);
                              return (
                                <Chip key={value} label={prod ? prod.descripcion : value} size="small" />
                              );
                            })}
                          </Box>
                        )}
                      >
                        {productos
                          .filter((p) => (p.tipoProducto === 'MATERIA_PRIMA' || p.tipoProducto === 'MP' || p.tipoProducto === 'INSUMO' || p.tipoProducto === 'INS') && p.id !== d.productoId)
                          .map((p) => (
                            <MenuItem key={p.id} value={p.id}>
                              {p.descripcion} ({p.sku})
                            </MenuItem>
                          ))}
                      </Select>
                    </FormControl>
                  </Box>
                )}
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
      <Dialog open={openPicking} onClose={() => setOpenPicking(false)} maxWidth="lg" fullWidth>
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
                    <TableCell align="right">Ya Entregado</TableCell>
                    <TableCell align="right">Stock CD (Disponible)</TableCell>
                    <TableCell sx={{ width: 170, minWidth: 170 }}>Lote Escaneado / Seleccionado</TableCell>
                    <TableCell align="right" sx={{ width: 190, minWidth: 190 }}>Cant. Entregada (Issue Qty)</TableCell>
                    <TableCell align="right" sx={{ width: 140 }}>Faltante (Bal Required)</TableCell>
                    <TableCell align="center">¿Picked? (Recolectado)</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pickingData.ingredientes.map((ing: any, idx: number) => {
                    const selectedId = ing.selectedProductoId || ing.productoId;
                    const isSubstitute = selectedId !== ing.productoId;
                    const isRawMilk = !!ing.esBodegaLeche;

                    let currentStock = ing.stockDisponible;
                    if (isRawMilk) {
                      if (ing.binIds && ing.binIds.length > 0) {
                        currentStock = (ing.bins || [])
                          .filter((b: any) => ing.binIds.includes(b.id))
                          .reduce((sum: number, b: any) => sum + (b.existencia || 0), 0);
                      } else if (ing.binId) {
                        const selectedBin = (ing.bins || []).find((b: any) => b.id === ing.binId);
                        if (selectedBin) {
                          currentStock = selectedBin.existencia;
                        }
                      }
                    }
                    let currentLotes = ing.lotesDisponibles || [];
                    let currentUnit = ing.unidadMedida;
                    let currentBodega = ing.bodega;

                    if (isSubstitute) {
                      const sust = ing.sustitutos?.find((s: any) => s.productoId === selectedId);
                      if (sust) {
                        currentStock = sust.stockDisponible;
                        currentLotes = sust.lotesDisponibles || [];
                        currentUnit = sust.unidadMedida;
                        currentBodega = sust.bodega;
                      }
                    }

                    const qtyReq = parseFloat(ing.cantidadRequerida || 0);
                    const qtyYaEntregado = parseFloat(ing.yaEntregado || 0);
                    const qtyPicked = parseFloat(ing.cantidadPicked || 0) || 0;
                    const balRequired = Math.max(0, qtyReq - qtyYaEntregado - qtyPicked);
                    const isShortage = currentStock < qtyPicked;

                    return (
                      <TableRow key={ing.productoId} hover>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>{ing.descripcion}</Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{ing.sku}</Typography>
                          {currentBodega && (
                            <Chip
                              label={`Ubicación: ${currentBodega.nombre}`}
                              size="small"
                              variant="outlined"
                              sx={{
                                mt: 0.5,
                                fontSize: '0.68rem',
                                color: 'primary.light',
                                borderColor: 'rgba(144, 202, 249, 0.3)',
                                backgroundColor: 'rgba(144, 202, 249, 0.05)',
                                height: 20
                              }}
                            />
                          )}
                          {ing.sustitutos && ing.sustitutos.length > 0 && (
                            <Box sx={{ mt: 1, maxWidth: 220 }}>
                              <FormControl size="small" fullWidth>
                                <Select
                                  value={selectedId}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    const newIng = [...pickingData.ingredientes];
                                    newIng[idx].selectedProductoId = val;
                                    newIng[idx].loteNumero = ''; // reset selected lot
                                    setPickingData({ ...pickingData, ingredientes: newIng });
                                  }}
                                  sx={{ fontSize: '0.75rem', height: '28px' }}
                                >
                                  <MenuItem value={ing.productoId} sx={{ fontSize: '0.75rem' }}>
                                    {ing.descripcion} (Original)
                                  </MenuItem>
                                  {ing.sustitutos.map((s: any) => (
                                    <MenuItem key={s.productoId} value={s.productoId} sx={{ fontSize: '0.75rem' }}>
                                      {s.descripcion} (Sustituto)
                                    </MenuItem>
                                  ))}
                                </Select>
                              </FormControl>
                            </Box>
                          )}
                        </TableCell>
                        <TableCell align="right">
                          <Box>
                            {ing.cantidadRequerida} {ing.unidadMedida}
                          </Box>
                          {ing.unidadMedida?.toUpperCase() === 'KG' && (
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                              ({parseFloat(ing.cantidadRequerida || 0) * 1000} g)
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold', color: qtyYaEntregado > 0 ? '#10b981' : 'inherit' }}>
                          {qtyYaEntregado} {currentUnit}
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{
                            color: currentStock < (qtyReq - qtyYaEntregado) ? '#f87171' : 'inherit',
                            fontWeight: currentStock < (qtyReq - qtyYaEntregado) ? 700 : 'normal',
                          }}
                        >
                          {currentStock} {currentUnit}
                        </TableCell>
                        <TableCell>
                          {isRawMilk ? (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, width: 160, minWidth: 160 }}>
                              <Button
                                variant="contained"
                                color="info"
                                size="small"
                                onClick={() => {
                                  setMixIngredientIndex(idx);
                                  setMixSelectedBinIds(ing.binIds || []);
                                  setOpenMixModal(true);
                                }}
                                sx={{
                                  fontWeight: 700,
                                  background: 'linear-gradient(135deg, #0284c7 0%, #0ea5e9 100%)',
                                  color: 'white',
                                  textTransform: 'none',
                                }}
                              >
                                Seleccionar Tanques
                              </Button>

                              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                                {(!ing.binIds || ing.binIds.length === 0) ? (
                                  <Typography variant="caption" color="error" sx={{ fontWeight: 600 }}>
                                    Ninguno seleccionado
                                  </Typography>
                                ) : (() => {
                                  const selectedBins = (ing.bins || [])
                                    .filter((b: any) => ing.binIds.includes(b.id))
                                    .sort((a: any, b: any) => (a.codigo || '').localeCompare(b.codigo || ''));

                                  let remaining = parseFloat(ing.cantidadPicked || 0);
                                  return selectedBins.map((b: any) => {
                                    const consumed = Math.min(b.existencia || 0, remaining);
                                    remaining = Math.max(0, remaining - consumed);
                                    return (
                                      <Chip
                                        key={b.id}
                                        label={`${b.codigo} (${consumed.toLocaleString()} ${ing.unidadMedida || 'L'})`}
                                        size="small"
                                        variant="outlined"
                                        sx={{
                                          fontSize: '0.7rem',
                                          height: 20,
                                          borderColor: 'rgba(56, 189, 248, 0.4)',
                                          color: '#38bdf8',
                                          mr: 0.5,
                                          mb: 0.5
                                        }}
                                      />
                                    );
                                  });
                                })()}
                              </Box>
                            </Box>
                          ) : (
                            <>
                              <Autocomplete
                                freeSolo
                                sx={{ width: 150, minWidth: 150 }}
                                options={currentLotes ? currentLotes.map((l: any) => l.numeroLote) : []}
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
                              {currentLotes && currentLotes.length > 0 && (
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, fontSize: '0.75rem' }}>
                                  Sugeridos: {currentLotes.map((l: any) => `${l.numeroLote} (${l.cantidadActual} ${currentUnit})`).join(', ')}
                                </Typography>
                              )}
                            </>
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
                            slotProps={{ htmlInput: { step: "0.00001", style: { textAlign: 'right' } } }}
                            sx={{ width: 170 }}
                          />
                        </TableCell>
                        <TableCell align="right">
                          {balRequired > 0 ? (
                            <Box sx={{ display: 'inline-flex', alignItems: 'center', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#f87171', px: 1, py: 0.5, borderRadius: 1, fontWeight: 700 }}>
                              {parseFloat(balRequired.toFixed(8))} {ing.unidadMedida}
                            </Box>
                          ) : (
                            <span style={{ color: 'rgba(16, 185, 129, 0.2)', fontWeight: 'bold' }}>0 {ing.unidadMedida}</span>
                          )}
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
 
      {/* Dialog para seleccionar múltiples tanques para la mezcla proporcional */}
      <Dialog
        open={openMixModal}
        onClose={() => setOpenMixModal(false)}
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
        <DialogTitle sx={{ fontWeight: 800, pb: 1 }}>
          Selección de Tanques (Mezcla)
        </DialogTitle>
        <DialogContent>
          {mixIngredientIndex !== null && pickingData?.ingredientes[mixIngredientIndex] && (() => {
            const ing = pickingData.ingredientes[mixIngredientIndex];
            const bins = ing.bins || [];
            const qtyReq = parseFloat(ing.cantidadRequerida || 0);
            const qtyYaEntregado = parseFloat(ing.yaEntregado || 0);
            const remainingToPick = Math.max(0, qtyReq - qtyYaEntregado);

            const totalSelectedStock = bins
              .filter((b: any) => mixSelectedBinIds.includes(b.id))
              .reduce((sum: number, b: any) => sum + (b.existencia || 0), 0);

            const hasEnoughStock = totalSelectedStock >= remainingToPick;

            return (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1 }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Ingrediente:
                  </Typography>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'primary.light' }}>
                    {ing.descripcion} ({ing.sku})
                  </Typography>
                </Box>

                <Paper sx={{ p: 2, bgcolor: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="caption" color="text.secondary">Pendiente por Recibir:</Typography>
                    <Typography variant="caption" sx={{ fontWeight: 700 }}>
                      {remainingToPick.toFixed(2)} {ing.unidadMedida}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="caption" color="text.secondary">Stock Seleccionado:</Typography>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: hasEnoughStock ? 'success.light' : 'error.light' }}>
                      {totalSelectedStock.toFixed(2)} {ing.unidadMedida}
                    </Typography>
                  </Box>
                  <Divider sx={{ my: 1, borderColor: 'rgba(255,255,255,0.06)' }} />
                  <Alert severity={hasEnoughStock ? "success" : "warning"} sx={{ py: 0.5, px: 1.5, '& .MuiAlert-message': { fontSize: '0.75rem' } }}>
                    {hasEnoughStock
                      ? "Stock seleccionado suficiente para cubrir el picking."
                      : "El stock seleccionado es menor a la cantidad requerida."}
                  </Alert>
                </Paper>

                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  Tanques / Silos Disponibles:
                </Typography>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {bins.length === 0 ? (
                    <Typography variant="caption" color="text.secondary">
                      No hay tanques disponibles en esta bodega.
                    </Typography>
                  ) : (
                    bins.map((b: any) => {
                      const isChecked = mixSelectedBinIds.includes(b.id);
                      return (
                        <Paper
                          key={b.id}
                          onClick={() => {
                            if (isChecked) {
                              setMixSelectedBinIds(mixSelectedBinIds.filter(id => id !== b.id));
                            } else {
                              setMixSelectedBinIds([...mixSelectedBinIds, b.id]);
                            }
                          }}
                          sx={{
                            p: 1.5,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            cursor: 'pointer',
                            bgcolor: isChecked ? 'rgba(56, 189, 248, 0.08)' : 'rgba(255, 255, 255, 0.01)',
                            border: `1px solid ${isChecked ? '#38bdf8' : 'rgba(255, 255, 255, 0.05)'}`,
                            borderRadius: 2,
                            '&:hover': {
                              bgcolor: 'rgba(255, 255, 255, 0.03)',
                            },
                            transition: 'all 0.2s ease',
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Checkbox
                              checked={isChecked}
                              size="small"
                              sx={{ p: 0 }}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setMixSelectedBinIds([...mixSelectedBinIds, b.id]);
                                } else {
                                  setMixSelectedBinIds(mixSelectedBinIds.filter(id => id !== b.id));
                                }
                              }}
                            />
                            <Box sx={{ ml: 1 }}>
                              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                {b.codigo}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {b.nombre}
                              </Typography>
                            </Box>
                          </Box>
                          <Typography variant="body2" sx={{ fontWeight: 700, color: b.existencia > 0 ? 'text.primary' : 'text.secondary' }}>
                            {b.existencia} {ing.unidadMedida}
                          </Typography>
                        </Paper>
                      );
                    })
                  )}
                </Box>
              </Box>
            );
          })()}
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button variant="outlined" onClick={() => setOpenMixModal(false)}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={() => {
              if (mixIngredientIndex !== null) {
                const newIng = [...pickingData.ingredientes];
                const ing = newIng[mixIngredientIndex];
                ing.binIds = mixSelectedBinIds;
                ing.binId = mixSelectedBinIds.length > 0 ? mixSelectedBinIds[0] : '';
                setPickingData({ ...pickingData, ingredientes: newIng });
              }
              setOpenMixModal(false);
            }}
          >
            Confirmar Selección
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

            <FormControl fullWidth>
              <InputLabel>Estado</InputLabel>
              <Select
                value={editarOrdenForm.estado || ''}
                label="Estado"
                onChange={(e) => setEditarOrdenForm({ ...editarOrdenForm, estado: e.target.value })}
              >
                <MenuItem value="PLANIFICADA">PLANIFICADA</MenuItem>
                <MenuItem value="FALTANTES">FALTANTES</MenuItem>
                <MenuItem value="EN_PROCESO">EN_PROCESO</MenuItem>
                <MenuItem value="COMPLETADA">COMPLETADA</MenuItem>
                <MenuItem value="CANCELADA">CANCELADA</MenuItem>
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

      {/* Modal para configurar la Hoja de Ruta (Bill of Operations) */}
      <Dialog
        open={openBoo}
        onClose={() => setOpenBoo(false)}
        maxWidth="md"
        fullWidth
        sx={{
          '& .MuiDialog-paper': {
            bgcolor: '#111827',
            backgroundImage: 'none',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 3,
            maxHeight: '90vh',
          },
        }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 800 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              Configurar Hoja de Ruta (BOO)
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Producto: {selectedProduct?.descripcion} ({selectedProduct?.sku})
            </Typography>
          </Box>
          <IconButton onClick={() => setOpenBoo(false)} size="small">
            <Close />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers sx={{ borderColor: 'rgba(255, 255, 255, 0.08)', p: 3, display: 'flex', flexDirection: 'column', gap: 3 }}>
          {booOperations.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 2 }}>
              <Typography color="text.secondary">
                No hay operaciones configuradas para esta ruta. Agregue un paso para comenzar o guarde para usar el flujo estándar.
              </Typography>
            </Paper>
          ) : (
            booOperations.map((op, idx) => (
              <Paper
                key={idx}
                sx={{
                  p: 2.5,
                  backgroundColor: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  borderRadius: 2,
                  position: 'relative',
                }}
              >
                {/* Header del paso */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Chip label={`Paso ${idx + 1}`} color="primary" size="small" sx={{ fontWeight: 700 }} />
                    <FormControl size="small" sx={{ minWidth: 200 }}>
                      <InputLabel>Centro de Trabajo</InputLabel>
                      <Select
                        value={op.workCenter}
                        label="Centro de Trabajo"
                        onChange={(e) => handleStepChange(idx, 'workCenter', e.target.value)}
                      >
                        {centrosTrabajo.map((wc: any) => (
                          <MenuItem key={wc.id} value={wc.id}>
                            {wc.nombre} ({wc.id})
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TextField
                      size="small"
                      label="Duración (min)"
                      type="number"
                      value={op.duracionEstimada}
                      onChange={(e) => handleStepChange(idx, 'duracionEstimada', e.target.value)}
                      sx={{ width: 110 }}
                    />
                    <IconButton
                      size="small"
                      onClick={() => handleMoveStep(idx, 'up')}
                      disabled={idx === 0}
                      color="inherit"
                    >
                      <ArrowUpward fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleMoveStep(idx, 'down')}
                      disabled={idx === booOperations.length - 1}
                      color="inherit"
                    >
                      <ArrowDownward fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleRemoveBooStep(idx)}
                      color="error"
                    >
                      <Delete fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>

                <Divider sx={{ my: 1.5, borderColor: 'rgba(255,255,255,0.06)' }} />

                {/* Subsección Parámetros */}
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'primary.light' }}>
                      Campos de Control Requeridos
                    </Typography>
                    <Button
                      size="small"
                      startIcon={<Add />}
                      onClick={() => handleAddBooParam(idx)}
                      sx={{ fontSize: '0.75rem', py: 0.25 }}
                    >
                      Agregar Campo
                    </Button>
                  </Box>

                  {(!op.datosRequeridos || op.datosRequeridos.length === 0) ? (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', pl: 1 }}>
                      Sin parámetros de control requeridos para este paso.
                    </Typography>
                  ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                      {op.datosRequeridos.map((param: any, pIdx: number) => (
                        <Box
                          key={pIdx}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1.5,
                            flexWrap: 'wrap',
                            p: 1.5,
                            borderRadius: 1,
                            backgroundColor: 'rgba(0,0,0,0.2)',
                          }}
                        >
                          <TextField
                            size="small"
                            label="Etiqueta (Label)"
                            value={param.label || ''}
                            onChange={(e) => handleParamChange(idx, pIdx, 'label', e.target.value)}
                            sx={{ flexGrow: 1, minWidth: 150 }}
                          />
                          <TextField
                            size="small"
                            label="Nombre Campo (ID)"
                            value={param.name || ''}
                            onChange={(e) => handleParamChange(idx, pIdx, 'name', e.target.value)}
                            sx={{ width: 150 }}
                          />
                          <FormControl size="small" sx={{ width: 120 }}>
                            <InputLabel>Tipo</InputLabel>
                            <Select
                              value={param.type || 'number'}
                              label="Tipo"
                              onChange={(e) => handleParamChange(idx, pIdx, 'type', e.target.value)}
                            >
                              <MenuItem value="number">Número</MenuItem>
                              <MenuItem value="text">Texto</MenuItem>
                              <MenuItem value="date">Fecha</MenuItem>
                            </Select>
                          </FormControl>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Checkbox
                              checked={!!param.required}
                              onChange={(e) => handleParamChange(idx, pIdx, 'required', e.target.checked)}
                            />
                            <Typography variant="caption">Obligatorio</Typography>
                          </Box>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleRemoveBooParam(idx, pIdx)}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </Box>
                      ))}
                    </Box>
                  )}
                </Box>
              </Paper>
            ))
          )}

          <Button
            variant="outlined"
            startIcon={<Add />}
            onClick={handleAddBooStep}
            fullWidth
            sx={{ borderStyle: 'dashed', py: 1.5, borderRadius: 2 }}
          >
            Agregar Centro de Trabajo / Paso
          </Button>
        </DialogContent>

        <DialogActions sx={{ p: 2.5, justifyContent: 'space-between' }}>
          <Button
            variant="outlined"
            color="error"
            startIcon={<RestartAlt />}
            onClick={handleRestaurarDefectoBoo}
          >
            Restaurar Defecto
          </Button>
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <Button variant="outlined" onClick={() => setOpenBoo(false)}>
              Cancelar
            </Button>
            <Button variant="contained" color="success" onClick={handleGuardarBoo} sx={{ fontWeight: 700 }}>
              Guardar Hoja de Ruta
            </Button>
          </Box>
        </DialogActions>
      </Dialog>

      {/* Dialog para Ver Detalles de Consumo (Materias Primas y Mermas) */}
      <Dialog
        open={openConsumos}
        onClose={() => setOpenConsumos(false)}
        maxWidth="md"
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
          <Visibility sx={{ color: 'primary.main' }} /> Detalles de Consumo — {selectedOrdenConsumos?.numeroOrden}
        </DialogTitle>
        <DialogContent dividers sx={{ borderColor: 'rgba(255, 255, 255, 0.08)', p: 3 }}>
          {selectedOrdenConsumos && (
            <Box>
              {/* Información General */}
              <Paper sx={{ p: 2.5, mb: 3, backgroundColor: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'primary.light', mb: 1.5 }}>
                  INFORMACIÓN GENERAL DE LA ORDEN
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Producto Final:</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {selectedOrdenConsumos.receta?.productoFinal?.descripcion} ({selectedOrdenConsumos.receta?.productoFinal?.sku})
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Receta Utilizada:</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{selectedOrdenConsumos.receta?.nombre}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Cantidad Planificada vs. Producida:</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {selectedOrdenConsumos.cantidadPlanificada} vs. {selectedOrdenConsumos.cantidadProducida} {selectedOrdenConsumos.receta?.productoFinal?.unidadMedida}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Rendimiento Real / Variación:</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: selectedOrdenConsumos.rendimientoReal >= 100 ? 'success.light' : 'warning.light' }}>
                      {selectedOrdenConsumos.rendimientoReal?.toFixed(1)}% ({selectedOrdenConsumos.variacion >= 0 ? '+' : ''}{selectedOrdenConsumos.variacion} {selectedOrdenConsumos.receta?.productoFinal?.unidadMedida})
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Responsable de la Orden:</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{selectedOrdenConsumos.responsable?.nombre || 'No asignado'}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Fecha de Producción:</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {selectedOrdenConsumos.fechaFin ? new Date(selectedOrdenConsumos.fechaFin).toLocaleString() : 'N/A'}
                    </Typography>
                  </Box>
                </Box>
              </Paper>

              {/* Materias Primas Consumidas */}
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'text.primary', mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                📦 Materias Primas y Lotes Consumidos
              </Typography>
              {!selectedOrdenConsumos.detalles || selectedOrdenConsumos.detalles.length === 0 ? (
                <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
                  No se registraron consumos de materias primas o insumos específicos para esta orden.
                </Alert>
              ) : (
                <Table sx={{ mb: 3, border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: 2, overflow: 'hidden' }}>
                  <TableHead sx={{ backgroundColor: 'rgba(255, 255, 255, 0.02)' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Insumo / Materia Prima</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>SKU</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Lote Utilizado</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>Cantidad Consumida</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedOrdenConsumos.detalles.map((det: any) => (
                      <TableRow key={det.id} sx={{ '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.01)' } }}>
                        <TableCell sx={{ fontWeight: 600 }}>{det.producto?.descripcion}</TableCell>
                        <TableCell color="text.secondary">{det.producto?.sku}</TableCell>
                        <TableCell>
                          <Chip 
                            label={det.lote?.numeroLote || 'Sin Lote / Consumo Directo'} 
                            size="small" 
                            color={det.lote ? 'primary' : 'default'} 
                            variant="outlined" 
                            sx={{ fontWeight: 700 }}
                          />
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>
                          {det.cantidadConsumida} {det.producto?.unidadMedida}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {/* Mermas (Desechos) */}
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'text.primary', mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                ⚠️ Mermas y Desechos Registrados
              </Typography>
              {!selectedOrdenConsumos.mermas || selectedOrdenConsumos.mermas.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', pl: 1, mb: 1 }}>
                  Sin mermas registradas durante la producción de este lote.
                </Typography>
              ) : (
                <Table sx={{ border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: 2, overflow: 'hidden' }}>
                  <TableHead sx={{ backgroundColor: 'rgba(255, 255, 255, 0.02)' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Producto Merma</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>SKU</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Motivo de la Merma</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>Cantidad Merma</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedOrdenConsumos.mermas.map((mer: any) => (
                      <TableRow key={mer.id} sx={{ '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.01)' } }}>
                        <TableCell sx={{ fontWeight: 600 }}>{mer.producto?.descripcion}</TableCell>
                        <TableCell color="text.secondary">{mer.producto?.sku}</TableCell>
                        <TableCell>
                          <Chip 
                            label={mer.motivo || 'OTROS'} 
                            size="small" 
                            color="error" 
                            variant="outlined" 
                            sx={{ fontWeight: 800, fontSize: '0.68rem' }}
                          />
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, color: 'error.light' }}>
                          {mer.cantidad} {mer.producto?.unidadMedida}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button variant="contained" onClick={() => setOpenConsumos(false)} sx={{ fontWeight: 700 }}>
            Cerrar Detalles
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog para Ver Pick List (Materia Prima Entregada/Issued) en Modo Lectura */}
      <Dialog
        open={openReadOnlyPicking}
        onClose={() => setOpenReadOnlyPicking(false)}
        maxWidth="lg"
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
          <Assignment sx={{ color: 'secondary.main' }} /> Lista de Selección (Pick List) - Orden {readOnlyPickingData?.numeroOrden}
        </DialogTitle>
        <DialogContent dividers sx={{ borderColor: 'rgba(255, 255, 255, 0.08)', p: 3 }}>
          {readOnlyPickingData && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              <Alert severity="info" sx={{ borderRadius: 2 }}>
                Vista de lectura de materias primas e insumos de la orden de producción. Los valores muestran lo que fue entregado (Issued) y el estado general de recolección.
              </Alert>

              <Table>
                <TableHead sx={{ backgroundColor: 'rgba(255, 255, 255, 0.02)' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Insumo / Materia Prima</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="right">Requerido</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="right">Entregado (Issued)</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="right">Stock en Planta (CD)</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="center">Estado</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {readOnlyPickingData.ingredientes.map((ing: any) => {
                    const qtyReq = parseFloat(ing.cantidadRequerida || 0);
                    const qtyIssued = parseFloat(ing.yaEntregado || 0);
                    const isFullyIssued = qtyIssued >= qtyReq;

                    return (
                      <TableRow key={ing.productoId} hover sx={{ '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.01)' } }}>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>{ing.descripcion}</Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{ing.sku}</Typography>
                          {ing.bodega && (
                            <Chip
                              label={`Ubicación: ${ing.bodega.nombre}`}
                              size="small"
                              variant="outlined"
                              sx={{
                                mt: 0.5,
                                fontSize: '0.68rem',
                                color: 'primary.light',
                                borderColor: 'rgba(144, 202, 249, 0.3)',
                                                                backgroundColor: 'rgba(144, 202, 249, 0.05)',
                                height: 20
                              }}
                            />
                          )}
                          {ing.binsMezcla && ing.binsMezcla.length > 0 ? (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5, ml: 0.5 }}>
                              {ing.binsMezcla.map((b: any) => (
                                <Chip
                                  key={b.id}
                                  label={`🗂 Silo: ${b.codigo}${b.cantidadPicked !== undefined ? ` (${b.cantidadPicked.toLocaleString()} ${ing.unidadMedida || 'L'})` : ''}`}
                                  size="small"
                                  variant="outlined"
                                  sx={{
                                    fontSize: '0.68rem',
                                    fontWeight: 700,
                                    color: '#a5b4fc',
                                    borderColor: 'rgba(99,102,241,0.4)',
                                    backgroundColor: 'rgba(99,102,241,0.08)',
                                    height: 20
                                  }}
                                />
                              ))}
                            </Box>
                          ) : ing.bin ? (
                            <Chip
                              label={`🗂 Bin: ${ing.bin.codigo} — ${ing.bin.nombre}`}
                              size="small"
                              variant="outlined"
                              sx={{
                                mt: 0.5,
                                ml: 0.5,
                                fontSize: '0.68rem',
                                fontWeight: 700,
                                color: '#a5b4fc',
                                borderColor: 'rgba(99,102,241,0.4)',
                                backgroundColor: 'rgba(99,102,241,0.08)',
                                height: 20
                              }}
                            />
                          ) : null}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>
                          <Box>
                            {ing.cantidadRequerida} {ing.unidadMedida}
                          </Box>
                          {ing.unidadMedida?.toUpperCase() === 'KG' && (
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                              ({parseFloat(ing.cantidadRequerida || 0) * 1000} g)
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, color: isFullyIssued ? 'success.light' : qtyIssued > 0 ? 'warning.light' : 'text.secondary' }}>
                          {qtyIssued} {ing.unidadMedida}
                        </TableCell>
                        <TableCell align="right" color="text.secondary">
                          {ing.stockDisponible} {ing.unidadMedida}
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={isFullyIssued ? 'Totalmente Entregado' : qtyIssued > 0 ? 'Parcial' : 'Pendiente'}
                            size="small"
                            color={isFullyIssued ? 'success' : qtyIssued > 0 ? 'warning' : 'default'}
                            variant="outlined"
                            sx={{ fontWeight: 800, fontSize: '0.7rem' }}
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
          <Button variant="contained" onClick={() => setOpenReadOnlyPicking(false)} sx={{ fontWeight: 700 }}>
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>
      {/* --- DIALOG CREAR/EDITAR CENTRO DE TRABAJO --- */}
      <Dialog
        open={openCentroTrabajo}
        onClose={() => setOpenCentroTrabajo(false)}
        maxWidth="sm"
        fullWidth
        sx={{ '& .MuiDialog-paper': { bgcolor: '#111827', backgroundImage: 'none', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3 } }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 800 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Settings sx={{ color: 'primary.main' }} />
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              {centroTrabajoForm.isEditing ? 'Editar Centro de Trabajo' : 'Nuevo Centro de Trabajo'}
            </Typography>
          </Box>
          <IconButton onClick={() => setOpenCentroTrabajo(false)} size="small"><Close /></IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ borderColor: 'rgba(255,255,255,0.08)', p: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            {!centroTrabajoForm.isEditing && (
              <TextField
                label="ID del Centro (ej: WC-TOSTADO)"
                fullWidth
                value={centroTrabajoForm.id}
                onChange={(e) => setCentroTrabajoForm({ ...centroTrabajoForm, id: e.target.value.toUpperCase().replace(/\s/g, '-') })}
                helperText="Identificador único. No se puede cambiar después de crearlo."
                sx={{ '& input': { fontFamily: 'monospace' } }}
              />
            )}
            {centroTrabajoForm.isEditing && (
              <Box sx={{ p: 1.5, bgcolor: 'rgba(255,255,255,0.04)', borderRadius: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="caption" color="text.secondary">ID:</Typography>
                <Chip label={centroTrabajoForm.id} size="small" sx={{ fontFamily: 'monospace', fontWeight: 700 }} />
              </Box>
            )}
            <TextField
              label="Nombre del Centro"
              fullWidth
              value={centroTrabajoForm.nombre}
              onChange={(e) => setCentroTrabajoForm({ ...centroTrabajoForm, nombre: e.target.value })}
              placeholder="Ej: Pasteurización, Empaque, etc."
            />
            <TextField
              label="Descripción"
              fullWidth
              multiline
              rows={2}
              value={centroTrabajoForm.descripcion}
              onChange={(e) => setCentroTrabajoForm({ ...centroTrabajoForm, descripcion: e.target.value })}
              placeholder="Breve descripción de la operación"
            />
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField
                label="Duración Estimada (min)"
                type="number"
                fullWidth
                value={centroTrabajoForm.duracionEstimada}
                onChange={(e) => setCentroTrabajoForm({ ...centroTrabajoForm, duracionEstimada: e.target.value })}
              />
              <TextField
                label="Número de Orden (secuencia)"
                type="number"
                fullWidth
                value={centroTrabajoForm.orden}
                onChange={(e) => setCentroTrabajoForm({ ...centroTrabajoForm, orden: e.target.value })}
                helperText="Posición en la línea de producción"
              />
            </Box>

            {/* Campos QA dinámicos */}
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                  Campos de Control de Calidad ({centroTrabajoForm.datosRequeridos.length})
                </Typography>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<Add />}
                  onClick={() => setCentroTrabajoForm({
                    ...centroTrabajoForm,
                    datosRequeridos: [...centroTrabajoForm.datosRequeridos, { label: '', name: '', type: 'number', required: true, suffix: '' }],
                  })}
                >
                  Agregar Campo
                </Button>
              </Box>
              {centroTrabajoForm.datosRequeridos.length === 0 ? (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', py: 2, fontStyle: 'italic' }}>
                  Sin campos de QA configurados. Al iniciar una operación no se pedirán datos adicionales.
                </Typography>
              ) : (
                centroTrabajoForm.datosRequeridos.map((campo, idx) => (
                  <Paper key={idx} sx={{ p: 1.5, mb: 1, bgcolor: 'rgba(255,255,255,0.03)', borderRadius: 1.5 }}>
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 1, alignItems: 'center' }}>
                      <TextField
                        size="small"
                        label="Etiqueta"
                        value={campo.label}
                        onChange={(e) => {
                          const updated = [...centroTrabajoForm.datosRequeridos];
                          updated[idx] = { ...updated[idx], label: e.target.value, name: e.target.value.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') };
                          setCentroTrabajoForm({ ...centroTrabajoForm, datosRequeridos: updated });
                        }}
                        placeholder="Ej: Temperatura"
                      />
                      <FormControl size="small" fullWidth>
                        <InputLabel>Tipo</InputLabel>
                        <Select
                          value={campo.type}
                          label="Tipo"
                          onChange={(e) => {
                            const updated = [...centroTrabajoForm.datosRequeridos];
                            updated[idx] = { ...updated[idx], type: e.target.value };
                            setCentroTrabajoForm({ ...centroTrabajoForm, datosRequeridos: updated });
                          }}
                        >
                          <MenuItem value="number">Número</MenuItem>
                          <MenuItem value="text">Texto</MenuItem>
                          <MenuItem value="date">Fecha</MenuItem>
                        </Select>
                      </FormControl>
                      <IconButton size="small" color="error" onClick={() => {
                        const updated = [...centroTrabajoForm.datosRequeridos];
                        updated.splice(idx, 1);
                        setCentroTrabajoForm({ ...centroTrabajoForm, datosRequeridos: updated });
                      }}>
                        <Delete fontSize="small" />
                      </IconButton>
                    </Box>
                    <TextField
                      size="small"
                      label="Sufijo / Unidad (opcional)"
                      value={campo.suffix || ''}
                      onChange={(e) => {
                        const updated = [...centroTrabajoForm.datosRequeridos];
                        updated[idx] = { ...updated[idx], suffix: e.target.value };
                        setCentroTrabajoForm({ ...centroTrabajoForm, datosRequeridos: updated });
                      }}
                      placeholder="Ej: °C, kg, %"
                      sx={{ mt: 1, width: '50%' }}
                    />
                  </Paper>
                ))
              )}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, gap: 1 }}>
          <Button variant="outlined" onClick={() => setOpenCentroTrabajo(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleGuardarCentroTrabajo} sx={{ fontWeight: 700 }}>
            {centroTrabajoForm.isEditing ? 'Guardar Cambios' : 'Crear Centro'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog para Ver Ruta de Operaciones de la Orden */}
      <Dialog
        open={openRutaOrden}
        onClose={() => setOpenRutaOrden(false)}
        maxWidth="md"
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
          <AccountTree sx={{ color: 'primary.main' }} /> Hoja de Ruta / Operaciones de la Orden — {selectedOrdenRuta?.numeroOrden}
        </DialogTitle>
        <DialogContent dividers sx={{ borderColor: 'rgba(255, 255, 255, 0.08)', p: 3 }}>
          {selectedOrdenRuta && (
            <Box>
              <Paper sx={{ p: 2.5, mb: 3, backgroundColor: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'primary.light', mb: 1.5 }}>
                  INFORMACIÓN GENERAL DE LA ORDEN
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Producto Final:</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {selectedOrdenRuta.receta?.productoFinal?.descripcion} ({selectedOrdenRuta.receta?.productoFinal?.sku})
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Rendimiento Planificado:</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {selectedOrdenRuta.cantidadPlanificada} {selectedOrdenRuta.receta?.productoFinal?.unidadMedida}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Estado General:</Typography>
                    <Chip label={selectedOrdenRuta.estado} size="small" color={selectedOrdenRuta.estado === 'COMPLETADA' ? 'success' : 'primary'} sx={{ mt: 0.5 }} />
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Responsable:</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {selectedOrdenRuta.responsable?.nombre || 'No asignado'}
                    </Typography>
                  </Box>
                </Box>
              </Paper>

              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'text.primary', mb: 2 }}>
                Secuencia de Operaciones en Planta
              </Typography>

              {!selectedOrdenRuta.operaciones || selectedOrdenRuta.operaciones.length === 0 ? (
                <Alert severity="info" sx={{ borderRadius: 2 }}>
                  No hay operaciones inicializadas para esta orden de producción.
                </Alert>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {selectedOrdenRuta.operaciones.map((step: any) => {
                    const ct = centrosTrabajo.find((w) => w.id === step.workCenter);
                    const isCompleted = step.estado === 'COMPLETADA';
                    const isInProgress = step.estado === 'EN_PROCESO';

                    // Parse control fields values if completed
                    const detailsList: { label: string; value: any }[] = [];
                    if (step.datosJson) {
                      try {
                        const parsed = JSON.parse(step.datosJson);
                        const fields = step.datosRequeridos
                          ? (() => { try { return typeof step.datosRequeridos === 'string' ? JSON.parse(step.datosRequeridos) : step.datosRequeridos; } catch { return []; } })()
                          : (ct?.datosRequeridos ? (typeof ct.datosRequeridos === 'string' ? JSON.parse(ct.datosRequeridos) : ct.datosRequeridos) : []);
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

                    return (
                      <Box
                        key={step.id}
                        sx={{
                          p: 2,
                          borderRadius: 2,
                          backgroundColor: isCompleted
                            ? 'rgba(16, 185, 129, 0.03)'
                            : isInProgress
                            ? 'rgba(59, 130, 246, 0.05)'
                            : 'rgba(255, 255, 255, 0.01)',
                          border: '1px solid',
                          borderColor: isCompleted
                            ? 'rgba(16, 185, 129, 0.2)'
                            : isInProgress
                            ? 'rgba(59, 130, 246, 0.3)'
                            : 'rgba(255, 255, 255, 0.06)',
                        }}
                      >
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, flexWrap: 'wrap', gap: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Chip label={`Paso ${step.orden}`} size="small" variant="outlined" sx={{ fontWeight: 800 }} />
                            <Typography variant="body2" sx={{ fontWeight: 700 }}>
                              {ct?.nombre || step.workCenter} ({step.workCenter})
                            </Typography>
                          </Box>
                          <Chip
                            label={step.estado}
                            size="small"
                            color={isCompleted ? 'success' : isInProgress ? 'primary' : 'default'}
                            sx={{ fontWeight: 800, fontSize: '0.7rem' }}
                          />
                        </Box>

                        <Box sx={{ pl: 1, mt: 1 }}>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                            Duración Estimada: {step.duracionEstimada || ct?.duracionEstimada || 30} min
                            {step.duracionSegundos !== null && ` | Duración Real: ${getFormatDuration(step.duracionSegundos)}`}
                          </Typography>

                          {step.usuarioNombre && (
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                              👤 Operario: <span style={{ fontWeight: 600, color: '#e5e7eb' }}>{step.usuarioNombre}</span>
                            </Typography>
                          )}

                          {step.fechaInicio && (
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                              Inicio: {new Date(step.fechaInicio).toLocaleString('es-CL')}
                            </Typography>
                          )}
                          {step.fechaFin && (
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                              Fin: {new Date(step.fechaFin).toLocaleString('es-CL')}
                            </Typography>
                          )}

                          {detailsList.length > 0 && (
                            <Box sx={{ mt: 1.5, p: 1.5, borderRadius: 1.5, bgcolor: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.03)' }}>
                              <Typography variant="caption" sx={{ fontWeight: 800, color: 'success.light', display: 'block', mb: 0.5 }}>
                                Controles de Calidad Registrados:
                              </Typography>
                              {detailsList.map((d, idx) => (
                                <Typography key={idx} variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                                  • <strong>{d.label}:</strong> {d.value}
                                </Typography>
                              ))}
                            </Box>
                          )}

                          {step.notas && (
                            <Box sx={{ mt: 1, p: 1, borderRadius: 1, bgcolor: 'rgba(239,68,68,0.05)', border: '1px dashed rgba(239,68,68,0.2)' }}>
                              <Typography variant="caption" sx={{ fontWeight: 700, color: 'error.light', display: 'block' }}>
                                Notas / Desviaciones:
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {step.notas}
                              </Typography>
                            </Box>
                          )}
                        </Box>
                      </Box>
                    );
                  })}
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenRutaOrden(false)} variant="contained">
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>

      {/* DIALOG: VER CODIGO BARRAS COMBINADO */}
      <Dialog open={openBarcodeDialog} onClose={() => setOpenBarcodeDialog(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 800 }}>Código de Barras de Producción</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, pt: 2, pb: 3 }}>
          {barcodeDialogData && (() => {
            const isPT = barcodeDialogData.tipoProducto === 'PT' || barcodeDialogData.tipoProducto === 'PRODUCTO_TERMINADO';
            const barcodeVal = isPT ? `${barcodeDialogData.prodId}#${barcodeDialogData.numeroLote}` : barcodeDialogData.numeroLote;
            return (
              <>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, textAlign: 'center' }}>
                  {barcodeDialogData.productoNombre}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center', mb: 1 }}>
                  <Chip label={`SKU: ${barcodeDialogData.sku}`} size="small" />
                  <Chip label={`Lote: ${barcodeDialogData.numeroLote}`} size="small" color="primary" />
                </Box>

                <Box
                  sx={{
                    backgroundColor: '#ffffff',
                    p: 3,
                    borderRadius: 2,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    boxShadow: 'inset 0 0 10px rgba(0,0,0,0.1)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    width: '100%',
                    maxWidth: '300px',
                  }}
                >
                  <img
                    src={`https://barcode.tec-it.com/barcode.ashx?data=${encodeURIComponent(
                      barcodeVal
                    )}&code=Code128`}
                    alt="Código de Barras"
                    style={{ maxWidth: '100%', height: 'auto', display: 'block' }}
                  />
                </Box>

                <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 700, mt: 1, color: 'text.secondary' }}>
                  {barcodeVal}
                </Typography>

                <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', px: 2 }}>
                  {isPT
                    ? 'Este código contiene el código de barras del producto y el lote. Al ser escaneado en el Punto de Venta, seleccionará automáticamente este lote específico.'
                    : 'Este código contiene únicamente el número de lote para la identificación y trazabilidad de la materia prima / insumo.'}
                </Typography>
              </>
            );
          })()}
        </DialogContent>
        <DialogActions sx={{ p: 2, display: 'flex', gap: 1 }}>
          <Button onClick={() => setOpenBarcodeDialog(false)} variant="outlined" sx={{ flex: 1 }}>
            Cerrar
          </Button>
          <Button
            onClick={() => handlePrintBarcode(barcodeDialogData)}
            variant="contained"
            color="primary"
            sx={{ flex: 1 }}
          >
            Imprimir
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
