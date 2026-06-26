import { useState, useEffect, useRef } from 'react';
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
  InputAdornment,
  TablePagination,
  List,
  ListItem,
  ListItemText,
  Checkbox,
  FormControlLabel,
  Switch,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import {
  Inventory,
  CompareArrows,
  LocalShipping,
  CheckCircle,
  Add,
  Edit,
  Delete,
  QrCode,
  Store,
} from '@mui/icons-material';
import { apiFetch, useAuthStore } from '../store/useAuthStore';
import { useSearchParams } from 'react-router-dom';

export default function Inventario() {
  const usuario = useAuthStore((state) => state.usuario);
  const systemTimezone = useAuthStore((state) => state.systemTimezone);
  const [searchParams, setSearchParams] = useSearchParams();
  const tienePermisoTraslados =
    usuario?.rol === 'ADMINISTRADOR' ||
    usuario?.rol === 'SUPERVISOR' ||
    usuario?.permisos?.includes('VER_TRASLADO_INTERSUCURSALES');
  const tienePermisoInventario =
    usuario?.rol === 'ADMINISTRADOR' ||
    usuario?.rol === 'SUPERVISOR' ||
    usuario?.permisos?.includes('VER_INVENTARIO');
  const [activeTab, setActiveTab] = useState(() => {
    const tabParam = new URLSearchParams(window.location.search).get('tab');
    if (tabParam) {
      const tabMap: Record<string, number> = {
        stock: 0,
        movimientos: 1,
        kardex: 1,
        traslados: 2,
        productos: 3,
        lotes: 4,
        mermas: 5,
      };
      if (tabMap[tabParam] !== undefined) {
        return tabMap[tabParam];
      }
    }
    if (!tienePermisoInventario && tienePermisoTraslados) {
      return 2;
    }
    return 0;
  });

  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam) {
      const tabMap: Record<string, number> = {
        stock: 0,
        movimientos: 1,
        kardex: 1,
        traslados: 2,
        productos: 3,
        lotes: 4,
        mermas: 5,
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
    const tabNames = ['stock', 'movimientos', 'traslados', 'productos', 'lotes', 'mermas'];
    setSearchParams({ tab: tabNames[val] });
  };

  // Pagination states
  const [pageStock, setPageStock] = useState(0);
  const [rowsPerPageStock, setRowsPerPageStock] = useState(50);

  const [pageMov, setPageMov] = useState(0);
  const [rowsPerPageMov, setRowsPerPageMov] = useState(50);
  const [searchMovProd, setSearchMovProd] = useState('');
  const [searchMovLote, setSearchMovLote] = useState('');

  const [pageCat, setPageCat] = useState(0);
  const [rowsPerPageCat, setRowsPerPageCat] = useState(50);
  const [searchCatSKU, setSearchCatSKU] = useState('');
  const [searchCatDesc, setSearchCatDesc] = useState('');

  const [pageLote, setPageLote] = useState(0);
  const [rowsPerPageLote, setRowsPerPageLote] = useState(50);

  // Datos
  const [inventario, setInventario] = useState<any[]>([]);
  const [filterSucursalId, setFilterSucursalId] = useState('');
  const [searchStockProduct, setSearchStockProduct] = useState('');

  useEffect(() => {
    setPageStock(0);
  }, [searchStockProduct, filterSucursalId]);
  const [movimientos, setMovimientos] = useState<any[]>([]);
  const [transferencias, setTransferencias] = useState<any[]>([]);
  const [sucursales, setSucursales] = useState<any[]>([]);
  const [productos, setProductos] = useState<any[]>([]);
  const [lotes, setLotes] = useState<any[]>([]);

  // Modales
  const [openAjuste, setOpenAjuste] = useState(false);
  const [ajusteForm, setAjusteForm] = useState({
    productoId: '',
    sucursalId: '',
    loteId: '',
    cantidad: '',
    tipo: 'ENTRADA',
    motivo: '',
  });

  const [openTransfer, setOpenTransfer] = useState(false);
  const [transferForm, setTransferForm] = useState({
    origenId: '',
    destinoId: '',
    productoId: '',
    loteId: '',
    cantidad: '',
  });
  const [transferItems, setTransferItems] = useState<any[]>([]);

  // Recepción Grupal Modales & Estados
  const [openRecepcionGrupal, setOpenRecepcionGrupal] = useState(false);
  const [recepcionDestinoId, setRecepcionDestinoId] = useState('');
  const [recepcionDestinoNombre, setRecepcionDestinoNombre] = useState('');
  const [recepcionTransIds, setRecepcionTransIds] = useState<string[]>([]);
  const [recepcionNombre, setRecepcionNombre] = useState('');
  const [recepcionPin, setRecepcionPin] = useState('');

  // CRUD Inventario Modales
  const [openAsociar, setOpenAsociar] = useState(false);
  const [asociarForm, setAsociarForm] = useState({
    productoId: '',
    sucursalId: '',
    existencia: '0',
    existMin: '10',
    existMax: '100',
  });

  const [openEdit, setOpenEdit] = useState(false);
  const [selectedInv, setSelectedInv] = useState<any>(null);
  const [editForm, setEditForm] = useState({
    existencia: '0',
    existMin: '10',
    existMax: '100',
  });

  const [openDelete, setOpenDelete] = useState(false);

  // Catálogo de Productos y Lotes
  const [todosProductos, setTodosProductos] = useState<any[]>([]);
  const [todosLotes, setTodosLotes] = useState<any[]>([]);
  const [todosProveedores, setTodosProveedores] = useState<any[]>([]);

  // Categorías
  const [categorias, setCategorias] = useState<any[]>([]);

  // Unidades de Medida
  const [unidadesMedida, setUnidadesMedida] = useState<any[]>([]);

  // Tipos de Producto
  const [tiposProducto, setTiposProducto] = useState<any[]>([]);

  // Mermas y Pérdidas
  const [openMerma, setOpenMerma] = useState(false);
  const [mermaForm, setMermaForm] = useState({
    sucursalId: '',
    productoId: '',
    loteId: '',
    cantidad: '',
    tipoMerma: 'VENCIMIENTO',
    motivo: '',
  });

  // Dialogs de Producto
  const [openCrearProducto, setOpenCrearProducto] = useState(false);

  // Dialogs de Proveedores Asociados
  const [openAsociarProveedores, setOpenAsociarProveedores] = useState(false);
  const [asociacionesProveedor, setAsociacionesProveedor] = useState<any[]>([]);
  const [asociacionForm, setAsociacionForm] = useState({
    proveedorId: '',
    costoProveedor: '',
    codigoProveedor: '',
    esPredeterminado: false,
  });

  // Dialog de Código de Barras Combinado (Producto + Lote)
  const [openBarcodeDialog, setOpenBarcodeDialog] = useState(false);
  const [barcodeDialogData, setBarcodeDialogData] = useState<any>(null);
  const [productoForm, setProductoForm] = useState({
    sku: '',
    codigoBarras: '',
    descripcion: '',
    categoria: 'LECHE',
    tipoProducto: 'PRODUCTO_TERMINADO',
    marca: '',
    unidadMedida: 'UNIDAD',
    costo: '0',
    precioVenta: '0',
    iva: '0.0',
    temperaturaMin: '2.0',
    temperaturaMax: '6.0',
    vidaUtilDias: '30',
    leadTime: '0',
    esManufacturado: true,
  });

  const [openEditarProducto, setOpenEditarProducto] = useState(false);
  const [openEliminarProducto, setOpenEliminarProducto] = useState(false);
  const [selectedProducto, setSelectedProducto] = useState<any>(null);
  const [editarProductoForm, setEditarProductoForm] = useState({
    sku: '',
    descripcion: '',
    categoria: 'LECHE',
    tipoProducto: 'PRODUCTO_TERMINADO',
    marca: '',
    unidadMedida: 'UNIDAD',
    costo: '0',
    precioVenta: '0',
    iva: '0.0',
    temperaturaMin: '2.0',
    temperaturaMax: '6.0',
    vidaUtilDias: '30',
    leadTime: '0',
    estado: 'ACTIVO',
    esManufacturado: true,
  });

  // Dialog de Lote
  const [openRegistrarLote, setOpenRegistrarLote] = useState(false);
  const [loteForm, setLoteForm] = useState({
    numeroLote: '',
    productoId: '',
    fechaProduccion: new Date().toISOString().substring(0, 10),
    fechaVencimiento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10),
    proveedorId: '',
    certificadoUrl: '',
    temperaturaRequeridaMin: '2.0',
    temperaturaRequeridaMax: '6.0',
    cantidadInicial: '0',
  });

  const [openEditarLote, setOpenEditarLote] = useState(false);
  const [selectedLote, setSelectedLote] = useState<any>(null);
  const [editarLoteForm, setEditarLoteForm] = useState({
    numeroLote: '',
    productoId: '',
    fechaProduccion: '',
    fechaVencimiento: '',
    proveedorId: '',
    certificadoUrl: '',
    temperaturaRequeridaMin: '2.0',
    temperaturaRequeridaMax: '6.0',
    cantidadInicial: '0',
    cantidadActual: '0',
    estado: 'APROBADO',
  });
  const [openEliminarLote, setOpenEliminarLote] = useState(false);


  // Notificaciones/Errores
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    cargarDatos();
  }, [activeTab]);

  const cargarDatos = async () => {
    try {
      if (activeTab === 0) {
        const inv = await apiFetch('/inventario');
        setInventario(inv);
        const suc = await apiFetch('/sucursales');
        setSucursales(suc);
        const prod = await apiFetch('/productos');
        setProductos(prod.filter((p: any) => p.estado === 'ACTIVO'));
      } else if (activeTab === 1) {
        const mov = await apiFetch('/inventario/movimientos');
        setMovimientos(mov);
      } else if (activeTab === 2) {
        const tr = await apiFetch('/inventario/transferencias');
        setTransferencias(tr);

        // Cargar auxiliares para formularios
        const suc = await apiFetch('/sucursales');
        setSucursales(suc);
        const prod = await apiFetch('/productos');
        setProductos(prod.filter((p: any) => p.estado === 'ACTIVO'));
        const lot = await apiFetch('/lotes');
        setLotes(lot.filter((l: any) => l.estado === 'APROBADO'));
      } else if (activeTab === 3) {
        const prod = await apiFetch('/productos');
        setTodosProductos(prod);
        await cargarCategorias();
        await cargarUnidadesMedida();
        await cargarTiposProducto();
        const provs = await apiFetch('/proveedores');
        setTodosProveedores(provs.filter((p: any) => p.estado === 'ACTIVO'));
      } else if (activeTab === 4) {
        const lotesAll = await apiFetch('/lotes');
        setTodosLotes(lotesAll);
        const prod = await apiFetch('/productos');
        setProductos(prod.filter((p: any) => p.estado === 'ACTIVO'));
        const provs = await apiFetch('/proveedores');
        setTodosProveedores(provs.filter((p: any) => p.estado === 'ACTIVO'));
      } else if (activeTab === 5) {
        const mov = await apiFetch('/inventario/movimientos');
        setMovimientos(mov);
        const suc = await apiFetch('/sucursales');
        setSucursales(suc);
        const prod = await apiFetch('/productos');
        setProductos(prod.filter((p: any) => p.estado === 'ACTIVO'));
        const lot = await apiFetch('/lotes');
        setLotes(lot.filter((l: any) => l.estado === 'APROBADO' && l.cantidadActual > 0));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const cargarCategorias = async () => {
    try {
      const cats = await apiFetch('/categorias');
      setCategorias(cats);
    } catch (e) {
      console.error(e);
    }
  };

  const cargarUnidadesMedida = async () => {
    try {
      const units = await apiFetch('/productos/unidades-medida');
      setUnidadesMedida(units);
    } catch (e) {
      console.error(e);
    }
  };

  const cargarTiposProducto = async () => {
    try {
      const types = await apiFetch('/productos/tipos');
      setTiposProducto(types);
    } catch (e) {
      console.error(e);
    }
  };

  // Removed unit management handlers (moved to Utilidades page)

  // Removed category create handler (moved to Utilidades page)

  const handleRegistrarMerma = async () => {
    try {
      setErrorMsg(null);
      const { sucursalId, productoId, loteId, cantidad, tipoMerma, motivo } = mermaForm;

      const finalSucursalId = (usuario?.rol === 'ADMINISTRADOR' || usuario?.rol === 'SUPERVISOR') 
        ? sucursalId 
        : usuario?.sucursalId;

      if (!finalSucursalId || !productoId || !cantidad || !tipoMerma || !motivo.trim()) {
        throw new Error('Todos los campos son obligatorios.');
      }

      const prod = productos.find((p) => p.id === productoId);
      if (prod && prod.unidadMedida?.toUpperCase() === 'UNIDAD') {
        if (parseFloat(cantidad) % 1 !== 0) {
          throw new Error(`Para productos en Unidades (${prod.descripcion}), la cantidad de merma debe ser un número entero.`);
        }
      }

      const response = await apiFetch('/inventario/merma', {
        method: 'POST',
        body: JSON.stringify({
          sucursalId: finalSucursalId,
          productoId,
          loteId: loteId || null,
          cantidad: parseFloat(cantidad),
          tipoMerma,
          motivo,
        }),
      });

      setSuccessMsg(response.message || 'Merma registrada con éxito.');
      setOpenMerma(false);
      setMermaForm({
        sucursalId: '',
        productoId: '',
        loteId: '',
        cantidad: '',
        tipoMerma: 'VENCIMIENTO',
        motivo: '',
      });
      cargarDatos();
    } catch (e: any) {
      setErrorMsg(e.message || 'Error al registrar la merma.');
    }
  };

  // Removed category edit/delete handlers (moved to Utilidades page)

  const handleAsociarSubmit = async () => {
    try {
      setErrorMsg(null);
      const prod = productos.find((p) => p.id === asociarForm.productoId);
      if (prod && prod.unidadMedida?.toUpperCase() === 'UNIDAD') {
        if (parseFloat(asociarForm.existencia) % 1 !== 0) {
          throw new Error(`Para productos en Unidades (${prod.descripcion}), la existencia inicial debe ser un número entero.`);
        }
      }
      await apiFetch('/inventario', {
        method: 'POST',
        body: JSON.stringify({
          productoId: asociarForm.productoId,
          sucursalId: asociarForm.sucursalId,
          existencia: parseFloat(asociarForm.existencia),
          existMin: parseFloat(asociarForm.existMin),
          existMax: parseFloat(asociarForm.existMax),
        }),
      });
      setSuccessMsg('Producto asociado al inventario de la sucursal con éxito.');
      setOpenAsociar(false);
      cargarDatos();
    } catch (e: any) {
      setErrorMsg(e.message);
    }
  };

  const handleEditSubmit = async () => {
    try {
      setErrorMsg(null);
      if (selectedInv?.producto && selectedInv.producto.unidadMedida?.toUpperCase() === 'UNIDAD') {
        if (parseFloat(editForm.existencia) % 1 !== 0) {
          throw new Error(`Para productos en Unidades (${selectedInv.producto.descripcion}), la existencia debe ser un número entero.`);
        }
      }
      await apiFetch(`/inventario/${selectedInv.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          existencia: parseFloat(editForm.existencia),
          existMin: parseFloat(editForm.existMin),
          existMax: parseFloat(editForm.existMax),
        }),
      });
      setSuccessMsg('Registro de inventario actualizado con éxito.');
      setOpenEdit(false);
      setSelectedInv(null);
      cargarDatos();
    } catch (e: any) {
      setErrorMsg(e.message);
    }
  };

  const handleDeleteSubmit = async () => {
    try {
      setErrorMsg(null);
      await apiFetch(`/inventario/${selectedInv.id}`, {
        method: 'DELETE',
      });
      setSuccessMsg('Registro de inventario eliminado con éxito.');
      setOpenDelete(false);
      setSelectedInv(null);
      cargarDatos();
    } catch (e: any) {
      setErrorMsg(e.message);
    }
  };

  const handleCrearProductoSubmit = async () => {
    try {
      setErrorMsg(null);
      await apiFetch('/productos', {
        method: 'POST',
        body: JSON.stringify({
          ...productoForm,
          costo: parseFloat(productoForm.costo),
          precioVenta: parseFloat(productoForm.precioVenta),
          iva: 0.0,
          temperaturaMin: parseFloat(productoForm.temperaturaMin),
          temperaturaMax: parseFloat(productoForm.temperaturaMax),
          vidaUtilDias: parseInt(productoForm.vidaUtilDias),
          leadTime: parseInt(productoForm.leadTime || '0'),
        }),
      });
      setSuccessMsg('Producto creado exitosamente en el catálogo.');
      setOpenCrearProducto(false);
      cargarDatos();
    } catch (e: any) {
      setErrorMsg(e.message);
    }
  };

  const handleEditarProductoSubmit = async () => {
    try {
      setErrorMsg(null);
      await apiFetch(`/productos/${selectedProducto.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          ...editarProductoForm,
          costo: parseFloat(editarProductoForm.costo),
          precioVenta: parseFloat(editarProductoForm.precioVenta),
          iva: 0.0,
          temperaturaMin: parseFloat(editarProductoForm.temperaturaMin),
          temperaturaMax: parseFloat(editarProductoForm.temperaturaMax),
          vidaUtilDias: parseInt(editarProductoForm.vidaUtilDias),
          leadTime: parseInt(editarProductoForm.leadTime || '0'),
        }),
      });
      setSuccessMsg('Producto actualizado en el catálogo.');
      setOpenEditarProducto(false);
      setSelectedProducto(null);
      cargarDatos();
    } catch (e: any) {
      setErrorMsg(e.message);
    }
  };

  const handleEliminarProductoSubmit = async () => {
    try {
      setErrorMsg(null);
      await apiFetch(`/productos/${selectedProducto.id}`, {
        method: 'DELETE',
      });
      setSuccessMsg('Producto eliminado del catálogo con éxito.');
      setOpenEliminarProducto(false);
      setSelectedProducto(null);
      cargarDatos();
    } catch (e: any) {
      setErrorMsg(e.message);
      setOpenEliminarProducto(false);
      setSelectedProducto(null);
    }
  };

  // --- ASOCIACIÓN DE PROVEEDORES ---
  const handleOpenAsociarProveedores = (producto: any) => {
    setSelectedProducto(producto);
    setAsociacionesProveedor(producto.proveedoresAsociados || []);
    setAsociacionForm({
      proveedorId: '',
      costoProveedor: '',
      codigoProveedor: '',
      esPredeterminado: false,
    });
    setOpenAsociarProveedores(true);
  };

  const handleAsociarProveedorSubmit = async () => {
    try {
      setErrorMsg(null);
      setSuccessMsg(null);
      if (!asociacionForm.proveedorId) {
        throw new Error('Debe seleccionar un proveedor.');
      }
      await apiFetch(`/productos/${selectedProducto.id}/proveedores`, {
        method: 'POST',
        body: JSON.stringify({
          proveedorId: asociacionForm.proveedorId,
          costoProveedor: asociacionForm.costoProveedor ? parseFloat(asociacionForm.costoProveedor) : null,
          codigoProveedor: asociacionForm.codigoProveedor || null,
          esPredeterminado: asociacionForm.esPredeterminado,
        }),
      });

      // Recargar producto y sus asociaciones
      const updatedProductos = await apiFetch('/productos');
      setTodosProductos(updatedProductos);
      
      const updatedSelected = updatedProductos.find((p: any) => p.id === selectedProducto.id);
      if (updatedSelected) {
        setSelectedProducto(updatedSelected);
        setAsociacionesProveedor(updatedSelected.proveedoresAsociados || []);
      }

      setAsociacionForm({
        proveedorId: '',
        costoProveedor: '',
        codigoProveedor: '',
        esPredeterminado: false,
      });
      setSuccessMsg('Proveedor asociado con éxito.');
    } catch (e: any) {
      setErrorMsg(e.message);
    }
  };

  const handleEliminarAsociacion = async (proveedorId: string) => {
    try {
      setErrorMsg(null);
      setSuccessMsg(null);
      await apiFetch(`/productos/${selectedProducto.id}/proveedores/${proveedorId}`, {
        method: 'DELETE',
      });

      // Recargar producto y sus asociaciones
      const updatedProductos = await apiFetch('/productos');
      setTodosProductos(updatedProductos);

      const updatedSelected = updatedProductos.find((p: any) => p.id === selectedProducto.id);
      if (updatedSelected) {
        setSelectedProducto(updatedSelected);
        setAsociacionesProveedor(updatedSelected.proveedoresAsociados || []);
      }

      setSuccessMsg('Asociación eliminada con éxito.');
    } catch (e: any) {
      setErrorMsg(e.message);
    }
  };

  const handleRegistrarLoteSubmit = async () => {
    try {
      setErrorMsg(null);
      const prod = productos.find((p) => p.id === loteForm.productoId);
      if (prod && prod.unidadMedida?.toUpperCase() === 'UNIDAD') {
        if (parseFloat(loteForm.cantidadInicial) % 1 !== 0) {
          throw new Error(`Para productos en Unidades (${prod.descripcion}), la cantidad inicial del lote debe ser un número entero.`);
        }
      }
      await apiFetch('/lotes', {
        method: 'POST',
        body: JSON.stringify({
          ...loteForm,
          temperaturaRequeridaMin: parseFloat(loteForm.temperaturaRequeridaMin),
          temperaturaRequeridaMax: parseFloat(loteForm.temperaturaRequeridaMax),
          cantidadInicial: parseFloat(loteForm.cantidadInicial),
        }),
      });
      setSuccessMsg('Lote registrado exitosamente.');
      setOpenRegistrarLote(false);
      cargarDatos();
    } catch (e: any) {
      setErrorMsg(e.message);
    }
  };

  const handleCambiarEstadoLote = async (id: string, nuevoEstado: string) => {
    try {
      setErrorMsg(null);
      await apiFetch(`/lotes/${id}/estado`, {
        method: 'PUT',
        body: JSON.stringify({ estado: nuevoEstado }),
      });
      setSuccessMsg(`Estado del lote actualizado a: ${nuevoEstado}`);
      cargarDatos();
    } catch (e: any) {
      setErrorMsg(e.message);
    }
  };

  const handleOpenEditarLote = (l: any) => {
    setSelectedLote(l);
    setEditarLoteForm({
      numeroLote: l.numeroLote,
      productoId: l.productoId,
      fechaProduccion: new Date(l.fechaProduccion).toISOString().substring(0, 10),
      fechaVencimiento: new Date(l.fechaVencimiento).toISOString().substring(0, 10),
      proveedorId: l.proveedorId,
      certificadoUrl: l.certificadoUrl || '',
      temperaturaRequeridaMin: String(l.temperaturaRequeridaMin),
      temperaturaRequeridaMax: String(l.temperaturaRequeridaMax),
      cantidadInicial: String(l.cantidadInicial),
      cantidadActual: String(l.cantidadActual),
      estado: l.estado,
    });
    setOpenEditarLote(true);
  };

  const handleEditarLoteSubmit = async () => {
    try {
      setErrorMsg(null);
      const prod = productos.find((p) => p.id === editarLoteForm.productoId);
      if (prod && prod.unidadMedida?.toUpperCase() === 'UNIDAD') {
        if (
          (editarLoteForm.cantidadInicial !== undefined && parseFloat(editarLoteForm.cantidadInicial) % 1 !== 0) ||
          (editarLoteForm.cantidadActual !== undefined && parseFloat(editarLoteForm.cantidadActual) % 1 !== 0)
        ) {
          throw new Error(`Para productos en Unidades (${prod.descripcion}), las cantidades inicial y actual del lote deben ser números enteros.`);
        }
      }
      await apiFetch(`/lotes/${selectedLote.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          ...editarLoteForm,
          temperaturaRequeridaMin: parseFloat(editarLoteForm.temperaturaRequeridaMin),
          temperaturaRequeridaMax: parseFloat(editarLoteForm.temperaturaRequeridaMax),
          cantidadInicial: parseFloat(editarLoteForm.cantidadInicial),
          cantidadActual: parseFloat(editarLoteForm.cantidadActual),
        }),
      });
      setSuccessMsg('Lote actualizado exitosamente.');
      setOpenEditarLote(false);
      setSelectedLote(null);
      cargarDatos();
    } catch (e: any) {
      setErrorMsg(e.message);
    }
  };

  const handleOpenEliminarLote = (l: any) => {
    setSelectedLote(l);
    setOpenEliminarLote(true);
  };

  const handleEliminarLoteSubmit = async () => {
    try {
      setErrorMsg(null);
      const res = await apiFetch(`/lotes/${selectedLote.id}`, {
        method: 'DELETE',
      });
      setSuccessMsg(res.message || 'Lote eliminado exitosamente.');
      setOpenEliminarLote(false);
      setSelectedLote(null);
      cargarDatos();
    } catch (e: any) {
      setErrorMsg(e.message);
    }
  };

  const handlePrintBarcode = (data: any) => {
    if (!data) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const barcodeUrl = `https://barcode.tec-it.com/barcode.ashx?data=${encodeURIComponent(
      `${data.prodId}#${data.numeroLote}`
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
          <div class="code-text">${data.prodId}#${data.numeroLote}</div>
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

  const generateInternalBarcode = () => {
    // Generar un número de 12 dígitos que comience con 200 (prefijo estándar para códigos internos)
    const prefix = '200';
    let randomDigits = '';
    for (let i = 0; i < 9; i++) {
      randomDigits += Math.floor(Math.random() * 10);
    }
    const full12 = prefix + randomDigits;
    
    // Calcular el dígito de control EAN-13:
    // Las posiciones impares se multiplican por 1, las pares por 3
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      const digit = parseInt(full12[i]);
      if (i % 2 === 0) {
        sum += digit * 1;
      } else {
        sum += digit * 3;
      }
    }
    const checkDigit = (10 - (sum % 10)) % 10;
    
    return full12 + checkDigit;
  };

  // Genera SKU automático: AbrevTipo-3LetrasCat-InicialesNombre
  const generarSKU = (tipoProducto: string, categoria: string, descripcion: string): string => {
    // Parte 1: Usar el código del Tipo de Producto directamente (MP, PT, MNA, etc.)
    // Si es un nombre largo legacy como "PRODUCTO_TERMINADO", derivar iniciales como fallback
    const tipoAbrev = tipoProducto.includes('_') && tipoProducto.length > 5
      ? tipoProducto.split(/[_\s]+/).filter(Boolean).map((w) => w[0]).join('').toUpperCase()
      : tipoProducto.trim().toUpperCase();

    // Parte 2: Primeras 3 letras de la Categoría
    const catAbrev = categoria
      .replace(/[^a-zA-ZáéíóúÁÉÍÓÚüÜñÑ]/g, '')
      .substring(0, 3)
      .toUpperCase();

    // Parte 3: Iniciales de cada palabra de la Descripción
    const descAbrev = descripcion
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w.replace(/[^a-zA-ZáéíóúÁÉÍÓÚüÜñÑ0-9]/g, '')[0] || '')
      .join('')
      .toUpperCase();

    const parts = [tipoAbrev, catAbrev, descAbrev].filter(Boolean);
    return parts.join('-');
  };

  // Auto-actualizar SKU cuando cambian tipo, categoría o descripción
  useEffect(() => {
    if (openCrearProducto) {
      const sku = generarSKU(productoForm.tipoProducto, productoForm.categoria, productoForm.descripcion);
      if (sku) {
        setProductoForm((prev) => ({ ...prev, sku }));
      }
    }
  }, [productoForm.tipoProducto, productoForm.categoria, productoForm.descripcion, openCrearProducto]);

  const handleAjusteSubmit = async () => {
    try {
      setErrorMsg(null);
      const prod = productos.find((p) => p.id === ajusteForm.productoId);
      if (prod && prod.unidadMedida?.toUpperCase() === 'UNIDAD') {
        if (parseFloat(ajusteForm.cantidad) % 1 !== 0) {
          throw new Error(`Para productos en Unidades (${prod.descripcion}), la cantidad de ajuste debe ser un número entero.`);
        }
      }
      await apiFetch('/inventario/ajuste', {
        method: 'POST',
        body: JSON.stringify(ajusteForm),
      });
      setSuccessMsg('Ajuste de inventario aplicado con éxito.');
      setOpenAjuste(false);
      cargarDatos();
    } catch (e: any) {
      setErrorMsg(e.message);
    }
  };

  const handleTransferSubmit = async () => {
    try {
      setErrorMsg(null);
      
      let finalProductos = [...transferItems];
      if (finalProductos.length === 0 && transferForm.productoId && transferForm.loteId && transferForm.cantidad) {
        finalProductos.push({
          productoId: transferForm.productoId,
          loteId: transferForm.loteId,
          cantidad: transferForm.cantidad,
        });
      }

      if (finalProductos.length === 0) {
        throw new Error('Debe agregar al menos un producto con su lote y cantidad al traslado.');
      }

      const body = {
        origenId: transferForm.origenId,
        destinoId: transferForm.destinoId,
        productos: finalProductos.map(item => ({
          productoId: item.productoId,
          loteId: item.loteId,
          cantidad: parseFloat(item.cantidad),
        })),
      };

      await apiFetch('/inventario/transferencias', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      setSuccessMsg('Solicitud de transferencia registrada.');
      setOpenTransfer(false);
      setTransferItems([]);
      cargarDatos();
    } catch (e: any) {
      setErrorMsg(e.message);
    }
  };

  const handleProcesarTransferencia = async (id: string, nuevoEstado: string) => {
    try {
      setErrorMsg(null);
      await apiFetch(`/inventario/transferencias/${id}/estado`, {
        method: 'PUT',
        body: JSON.stringify({ estado: nuevoEstado }),
      });
      setSuccessMsg(`Transferencia actualizada a estado: ${nuevoEstado}`);
      cargarDatos();
    } catch (e: any) {
      setErrorMsg(e.message);
    }
  };

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawing = useRef(false);

  const handleOpenRecepcionGrupal = (destinoId: string, destinoNombre: string) => {
    const pendingForDest = transferencias.filter(
      (tr) => tr.destinoId === destinoId && (tr.estado === 'PENDIENTE' || tr.estado === 'EN_TRANSITO')
    );
    setRecepcionDestinoId(destinoId);
    setRecepcionDestinoNombre(destinoNombre);
    setRecepcionTransIds(pendingForDest.map((t) => t.id));
    setRecepcionNombre(usuario?.nombre || '');
    setRecepcionPin('');
    setOpenRecepcionGrupal(true);
  };

  const handleRecepcionGrupalSubmit = async () => {
    try {
      setErrorMsg(null);
      if (recepcionTransIds.length === 0) {
        throw new Error('Debe seleccionar al menos una transferencia para recibir.');
      }
      if (!recepcionNombre.trim()) {
        throw new Error('El nombre de quien recibe es obligatorio.');
      }
      if (!recepcionPin || recepcionPin.length !== 4) {
        throw new Error('Debe ingresar su PIN de autorización de 4 dígitos.');
      }

      const canvas = canvasRef.current;
      let firmaBase64 = '';
      if (canvas) {
        firmaBase64 = canvas.toDataURL('image/png');
      }

      const body = {
        transferenciaIds: recepcionTransIds,
        recibidoPorNombre: recepcionNombre,
        firmaBase64,
        pin: recepcionPin,
      };

      await apiFetch('/inventario/transferencias/recepcion-grupal', {
        method: 'POST',
        body: JSON.stringify(body),
      });

      setSuccessMsg('Recepción grupal registrada con éxito.');
      setOpenRecepcionGrupal(false);
      cargarDatos();
    } catch (e: any) {
      setErrorMsg(e.message);
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    isDrawing.current = true;
    const rect = canvas.getBoundingClientRect();

    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = (clientX - rect.left) * (canvas.width / rect.width);
    const y = (clientY - rect.top) * (canvas.height / rect.height);

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#000000';
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();

    let clientX, clientY;
    if ('touches' in e) {
      if (e.cancelable) e.preventDefault();
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = (clientX - rect.left) * (canvas.width / rect.width);
    const y = (clientY - rect.top) * (canvas.height / rect.height);

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    isDrawing.current = false;
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val);
  };

  const filteredInventario = inventario.filter((inv) => {
    if (filterSucursalId && inv.sucursalId !== filterSucursalId) {
      return false;
    }
    if (searchStockProduct) {
      const q = searchStockProduct.toLowerCase();
      const descMatch = inv.producto?.descripcion?.toLowerCase().includes(q);
      const skuMatch = inv.producto?.sku?.toLowerCase().includes(q);
      return descMatch || skuMatch;
    }
    return true;
  });

  const paginatedInventario = filteredInventario.slice(
    pageStock * rowsPerPageStock,
    pageStock * rowsPerPageStock + rowsPerPageStock
  );

  const filteredMovimientos = movimientos.filter((mov) => {
    const prodMatch = !searchMovProd || 
      mov.producto?.descripcion.toLowerCase().includes(searchMovProd.toLowerCase()) ||
      mov.producto?.sku.toLowerCase().includes(searchMovProd.toLowerCase());
    const loteMatch = !searchMovLote ||
      (mov.lote && mov.lote.numeroLote.toLowerCase().includes(searchMovLote.toLowerCase()));
    return prodMatch && loteMatch;
  });

  const paginatedMovimientos = filteredMovimientos.slice(
    pageMov * rowsPerPageMov,
    pageMov * rowsPerPageMov + rowsPerPageMov
  );

  const filteredTodosProductos = todosProductos.filter((p) => {
    const skuMatch = !searchCatSKU || p.sku.toLowerCase().includes(searchCatSKU.toLowerCase());
    const descMatch = !searchCatDesc || p.descripcion.toLowerCase().includes(searchCatDesc.toLowerCase());
    return skuMatch && descMatch;
  });

  const paginatedTodosProductos = filteredTodosProductos.slice(
    pageCat * rowsPerPageCat,
    pageCat * rowsPerPageCat + rowsPerPageCat
  );

  const sortedLotes = [...todosLotes].sort((a, b) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const paginatedTodosLotes = sortedLotes.slice(
    pageLote * rowsPerPageLote,
    pageLote * rowsPerPageLote + rowsPerPageLote
  );

  const mermasMovimientos = movimientos
    .filter((m) => m.tipo === 'MERMA')
    .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

  return (
    <Box sx={{ p: 3, height: '100%', overflowY: 'auto' }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 2, flexWrap: 'wrap' }}>
            <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5 }}>
              Gestión de Inventario
            </Typography>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 700,
                background: 'linear-gradient(90deg, #3b82f6 0%, #10b981 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                display: 'inline-block',
              }}
            >
              Powered by Inteligencia Artificial
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary">
            Administre stocks por tienda, realice ajustes y autorice traslados inter-sucursales.
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          {activeTab === 0 && (usuario?.rol === 'ADMINISTRADOR' || usuario?.rol === 'SUPERVISOR' || usuario?.rol === 'ALMACEN') && (
            <Button
              variant="contained"
              color="success"
              startIcon={<Add />}
              onClick={() => {
                setAsociarForm({
                  productoId: '',
                  sucursalId: usuario?.sucursalId || '',
                  existencia: '0',
                  existMin: '10',
                  existMax: '100',
                });
                setOpenAsociar(true);
              }}
            >
              Agregar a Inventario
            </Button>
          )}

          {activeTab === 3 && (usuario?.rol === 'ADMINISTRADOR' || usuario?.rol === 'SUPERVISOR' || usuario?.rol === 'ALMACEN') && (
            <Button
              variant="contained"
              color="success"
              startIcon={<Add />}
              onClick={() => {
                setProductoForm({
                  sku: '',
                  codigoBarras: '',
                  descripcion: '',
                  categoria: 'LECHE',
                  tipoProducto: 'PRODUCTO_TERMINADO',
                  marca: '',
                  unidadMedida: 'UNIDAD',
                  costo: '0',
                  precioVenta: '0',
                  iva: '0.0',
                  temperaturaMin: '2.0',
                  temperaturaMax: '6.0',
                  vidaUtilDias: '30',
                  leadTime: '0',
                  esManufacturado: true,
                });
                setOpenCrearProducto(true);
              }}
            >
              Crear Producto
            </Button>
          )}

          {activeTab === 4 && (usuario?.rol === 'ADMINISTRADOR' || usuario?.rol === 'SUPERVISOR' || usuario?.rol === 'ALMACEN') && (
            <Button
              variant="contained"
              color="success"
              startIcon={<Add />}
              onClick={() => {
                setLoteForm({
                  numeroLote: '',
                  productoId: '',
                  fechaProduccion: new Date().toISOString().substring(0, 10),
                  fechaVencimiento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10),
                  proveedorId: '',
                  certificadoUrl: '',
                  temperaturaRequeridaMin: '2.0',
                  temperaturaRequeridaMax: '6.0',
                  cantidadInicial: '0',
                });
                setOpenRegistrarLote(true);
              }}
            >
              Registrar Lote
            </Button>
          )}

          {(activeTab === 0 || activeTab === 1) && (
            <Button
              variant="outlined"
              startIcon={<Inventory />}
              onClick={() => {
                setAjusteForm({
                  productoId: '',
                  sucursalId: usuario?.sucursalId || '',
                  loteId: '',
                  cantidad: '',
                  tipo: 'ENTRADA',
                  motivo: '',
                });
                setOpenAjuste(true);
              }}
            >
              Ajustar Stock Manual
            </Button>
          )}

          {(activeTab === 0 || activeTab === 2) && tienePermisoTraslados && (
            <Button
              variant="contained"
              color="primary"
              startIcon={<CompareArrows />}
              onClick={() => {
                setTransferForm({
                  origenId: usuario?.sucursalId || '',
                  destinoId: '',
                  productoId: '',
                  loteId: '',
                  cantidad: '',
                });
                setTransferItems([]);
                setOpenTransfer(true);
              }}
            >
              Solicitar Traslado
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

      <Tabs
        value={activeTab}
        onChange={(_, val) => handleTabChange(val)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          borderBottom: 1,
          borderColor: 'divider',
          mb: 3,
          '& .MuiTab-root': { fontWeight: 700 },
        }}
      >
        {tienePermisoInventario && <Tab label="Stock Actual por Sucursal" value={0} />}
        {tienePermisoInventario && <Tab label="Historial de Movimientos (Kardex)" value={1} />}
        {tienePermisoTraslados && <Tab label="Traslados Inter-Sucursales" value={2} />}
        {tienePermisoInventario && <Tab label="Catálogo de Productos" value={3} />}
        {tienePermisoInventario && <Tab label="Gestión de Lotes" value={4} />}
        {tienePermisoInventario && <Tab label="Mermas y Pérdidas" value={5} />}
      </Tabs>

      {/* TAB 0: EXISTENCIAS */}
      {activeTab === 0 && tienePermisoInventario && (
        <Paper className="glass-panel" sx={{ p: 3 }}>
          <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <TextField
              size="small"
              placeholder="Buscar por producto o SKU..."
              value={searchStockProduct}
              onChange={(e) => setSearchStockProduct(e.target.value)}
              sx={{
                minWidth: 280,
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  '& fieldset': {
                    borderColor: 'rgba(255, 255, 255, 0.15)',
                  },
                  '&:hover fieldset': {
                    borderColor: 'primary.main',
                  },
                },
              }}
            />

            {(usuario?.rol === 'ADMINISTRADOR' || usuario?.rol === 'SUPERVISOR') && (
              <FormControl sx={{ minWidth: 240 }} size="small">
                <InputLabel id="sucursal-filter-label" sx={{ color: 'text.secondary' }}>
                  Filtrar por Sucursal
                </InputLabel>
                <Select
                  labelId="sucursal-filter-label"
                  value={filterSucursalId}
                  label="Filtrar por Sucursal"
                  onChange={(e) => setFilterSucursalId(e.target.value)}
                  sx={{
                    borderRadius: 2,
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'rgba(255, 255, 255, 0.15)',
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'primary.main',
                    },
                  }}
                >
                  <MenuItem value="">
                    <em>Todas las Sucursales</em>
                  </MenuItem>
                  {sucursales.map((suc) => (
                    <MenuItem key={suc.id} value={suc.id}>
                      {suc.nombre}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            {filterSucursalId && (
              <Button
                size="small"
                variant="text"
                onClick={() => setFilterSucursalId('')}
                sx={{ textTransform: 'none' }}
              >
                Limpiar Sucursal
              </Button>
            )}

            {searchStockProduct && (
              <Button
                size="small"
                variant="text"
                onClick={() => setSearchStockProduct('')}
                sx={{ textTransform: 'none' }}
              >
                Limpiar Búsqueda
              </Button>
            )}
          </Box>

          <Box sx={{ overflowX: 'auto', width: '100%' }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Sucursal</TableCell>
                  <TableCell>SKU</TableCell>
                  <TableCell>Producto</TableCell>
                  <TableCell>Categoría</TableCell>
                  <TableCell>Costo</TableCell>
                  <TableCell>Existencia</TableCell>
                  <TableCell>Stock Mínimo</TableCell>
                  <TableCell>Estatus</TableCell>
                  <TableCell align="right">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedInventario.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center">No hay productos en inventario.</TableCell>
                  </TableRow>
                ) : (
                  paginatedInventario.map((inv) => {
                    const isLow = inv.existencia < inv.existMin;
                    const isSelected = selectedRowId === inv.id;
                    return (
                      <TableRow
                        key={inv.id}
                        hover
                        onClick={() => setSelectedRowId(isSelected ? null : inv.id)}
                        sx={{
                          cursor: 'pointer',
                          bgcolor: isSelected ? 'rgba(59, 130, 246, 0.15)' : 'inherit',
                          '&:hover': {
                            bgcolor: isSelected ? 'rgba(59, 130, 246, 0.25)' : 'rgba(255, 255, 255, 0.04)',
                          },
                          transition: 'background-color 0.2s ease',
                        }}
                      >
                        <TableCell sx={{ fontWeight: 700 }}>{inv.sucursal.nombre}</TableCell>
                        <TableCell>{inv.producto.sku}</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>{inv.producto.descripcion}</TableCell>
                        <TableCell>{inv.producto.categoria}</TableCell>
                        <TableCell>{formatCurrency(inv.producto.costo)}</TableCell>
                        <TableCell sx={{ fontWeight: 800 }} color={isLow ? 'error.main' : 'inherit'}>
                          {inv.existencia} {inv.producto.unidadMedida}
                        </TableCell>
                        <TableCell>{inv.existMin} {inv.producto.unidadMedida}</TableCell>
                        <TableCell>
                          <Chip
                            label={isLow ? 'STOCK CRÍTICO' : 'SEGURO'}
                            color={isLow ? 'error' : 'success'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="right">
                          {(usuario?.rol === 'ADMINISTRADOR' || usuario?.rol === 'SUPERVISOR' || usuario?.rol === 'ALMACEN') && (
                            <Tooltip title="Editar Stock y Límites">
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedInv(inv);
                                  setEditForm({
                                    existencia: String(inv.existencia),
                                    existMin: String(inv.existMin),
                                    existMax: String(inv.existMax),
                                  });
                                  setOpenEdit(true);
                                }}
                              >
                                <Edit fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                          {(usuario?.rol === 'ADMINISTRADOR' || usuario?.rol === 'SUPERVISOR') && (
                            <Tooltip title="Eliminar Registro de Inventario">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedInv(inv);
                                  setOpenDelete(true);
                                }}
                              >
                                <Delete fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
            <TablePagination
              component="div"
              count={filteredInventario.length}
              page={pageStock}
              onPageChange={(_, newPage) => setPageStock(newPage)}
              rowsPerPage={rowsPerPageStock}
              onRowsPerPageChange={(e) => {
                setRowsPerPageStock(parseInt(e.target.value, 10));
                setPageStock(0);
              }}
              rowsPerPageOptions={[10, 25, 50, 100]}
              labelRowsPerPage="Registros por página:"
            />
          </Box>
        </Paper>
      )}

      {/* TAB 1: KARDEX */}
      {activeTab === 1 && tienePermisoInventario && (
        <Paper className="glass-panel" sx={{ p: 3 }}>
          <Box sx={{ mb: 2, display: 'flex', gap: 2 }}>
            <TextField
              size="small"
              label="Buscar por Producto"
              value={searchMovProd}
              onChange={(e) => { setSearchMovProd(e.target.value); setPageMov(0); }}
            />
            <TextField
              size="small"
              label="Buscar por Lote"
              value={searchMovLote}
              onChange={(e) => { setSearchMovLote(e.target.value); setPageMov(0); }}
            />
          </Box>
          <Box sx={{ overflowX: 'auto', width: '100%' }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Fecha / Hora</TableCell>
                  <TableCell>Tipo</TableCell>
                  <TableCell>Producto</TableCell>
                  <TableCell>Lote</TableCell>
                  <TableCell>Origen</TableCell>
                  <TableCell>Destino</TableCell>
                  <TableCell>Cantidad</TableCell>
                  <TableCell>Motivo</TableCell>
                  <TableCell>Usuario</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedMovimientos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center">No hay movimientos registrados.</TableCell>
                  </TableRow>
                ) : (
                  paginatedMovimientos.map((mov) => {
                    const isSelected = selectedRowId === mov.id;
                    return (
                      <TableRow
                        key={mov.id}
                        hover
                        onClick={() => setSelectedRowId(isSelected ? null : mov.id)}
                        sx={{
                          cursor: 'pointer',
                          bgcolor: isSelected ? 'rgba(59, 130, 246, 0.15)' : 'inherit',
                          '&:hover': {
                            bgcolor: isSelected ? 'rgba(59, 130, 246, 0.25)' : 'rgba(255, 255, 255, 0.04)',
                          },
                          transition: 'background-color 0.2s ease',
                        }}
                      >
                        <TableCell>{new Date(mov.fecha).toLocaleString('es-CO', { timeZone: systemTimezone })}</TableCell>
                        <TableCell>
                          <Chip
                            label={mov.tipo}
                            color={mov.tipo === 'ENTRADA' ? 'success' : 'error'}
                            size="small"
                            sx={{ fontWeight: 700 }}
                          />
                        </TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>{mov.producto.descripcion}</TableCell>
                        <TableCell>
                          {mov.lote ? <Chip label={mov.lote.numeroLote} size="small" variant="outlined" /> : '-'}
                        </TableCell>
                        <TableCell>{mov.sucursalOrigen?.nombre || '-'}</TableCell>
                        <TableCell>{mov.sucursalDestino?.nombre || '-'}</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>{mov.cantidad} {mov.producto.unidadMedida}</TableCell>
                        <TableCell>{mov.motivo}</TableCell>
                        <TableCell>{mov.usuario.nombre}</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
            <TablePagination
              component="div"
              count={filteredMovimientos.length}
              page={pageMov}
              onPageChange={(_, newPage) => setPageMov(newPage)}
              rowsPerPage={rowsPerPageMov}
              onRowsPerPageChange={(e) => {
                setRowsPerPageMov(parseInt(e.target.value, 10));
                setPageMov(0);
              }}
              rowsPerPageOptions={[10, 25, 50, 100]}
              labelRowsPerPage="Registros por página:"
            />
          </Box>
        </Paper>
      )}

      {/* TAB 2: TRASLADOS */}
      {activeTab === 2 && tienePermisoTraslados && (
        <Paper className="glass-panel" sx={{ p: 3 }}>
          <Box sx={{ overflowX: 'auto', width: '100%' }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Código</TableCell>
                  <TableCell>Origen</TableCell>
                  <TableCell>Destino</TableCell>
                  <TableCell>Productos</TableCell>
                  <TableCell>Solicitado Por</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell>Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {transferencias.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">No hay transferencias de stock registradas.</TableCell>
                  </TableRow>
                ) : (
                  transferencias.map((tr) => {
                    const isSelected = selectedRowId === tr.id;
                    return (
                      <TableRow
                        key={tr.id}
                        hover
                        onClick={() => setSelectedRowId(isSelected ? null : tr.id)}
                        sx={{
                          cursor: 'pointer',
                          bgcolor: isSelected ? 'rgba(59, 130, 246, 0.15)' : 'inherit',
                          '&:hover': {
                            bgcolor: isSelected ? 'rgba(59, 130, 246, 0.25)' : 'rgba(255, 255, 255, 0.04)',
                          },
                          transition: 'background-color 0.2s ease',
                        }}
                      >
                        <TableCell sx={{ fontWeight: 700 }}>{tr.codigo}</TableCell>
                        <TableCell>{tr.origen.nombre}</TableCell>
                        <TableCell>
                          {tr.estado !== 'RECIBIDA' && tr.estado !== 'RECHAZADA' ? (
                            <Button
                              variant="text"
                              size="small"
                              sx={{
                                p: 0,
                                minWidth: 0,
                                textTransform: 'none',
                                fontWeight: 700,
                                textAlign: 'left',
                                color: 'primary.main',
                                textDecoration: 'underline',
                                '&:hover': {
                                  textDecoration: 'none',
                                  color: 'primary.dark',
                                }
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenRecepcionGrupal(tr.destino.id, tr.destino.nombre);
                              }}
                            >
                              {tr.destino.nombre}
                            </Button>
                          ) : (
                            tr.destino.nombre
                          )}
                        </TableCell>
                        <TableCell>
                          {tr.detalles.map((det: any) => (
                            <div key={det.id}>
                              {det.producto.descripcion} (L: {det.lote?.numeroLote}) - {det.cantidad} {det.producto.unidadMedida}
                            </div>
                          ))}
                        </TableCell>
                        <TableCell>{tr.creadoPor.nombre}</TableCell>
                        <TableCell>
                          <Chip
                            label={tr.estado}
                            color={
                              tr.estado === 'RECIBIDA'
                                ? 'success'
                                : tr.estado === 'EN_TRANSITO'
                                ? 'warning'
                                : tr.estado === 'PENDIENTE'
                                ? 'primary'
                                : 'error'
                            }
                            size="small"
                            sx={{ fontWeight: 700 }}
                          />
                        </TableCell>
                        <TableCell>
                          {tr.estado === 'PENDIENTE' && (
                            <Button
                              variant="outlined"
                              size="small"
                              color="warning"
                              startIcon={<LocalShipping />}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleProcesarTransferencia(tr.id, 'EN_TRANSITO');
                              }}
                            >
                              Despachar
                            </Button>
                          )}
                          {tr.estado === 'EN_TRANSITO' && (
                            <Box sx={{ display: 'flex', gap: 1 }}>
                              <Button
                                variant="contained"
                                size="small"
                                color="success"
                                startIcon={<CheckCircle />}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleProcesarTransferencia(tr.id, 'RECIBIDA');
                                }}
                              >
                                Recibir
                              </Button>
                              <Button
                                variant="outlined"
                                size="small"
                                color="error"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleProcesarTransferencia(tr.id, 'RECHAZADA');
                                }}
                              >
                                Rechazar
                              </Button>
                            </Box>
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
      )}

      {activeTab === 2 && !tienePermisoTraslados && (
        <Paper className="glass-panel" sx={{ p: 3 }}>
          <Alert severity="error">No tiene permisos para acceder a la sección de traslados inter-sucursales.</Alert>
        </Paper>
      )}

      {/* TAB 3: CATÁLOGO DE PRODUCTOS */}
      {activeTab === 3 && tienePermisoInventario && (
        <Paper className="glass-panel" sx={{ p: 3 }}>
          <Box sx={{ mb: 2, display: 'flex', gap: 2 }}>
            <TextField
              size="small"
              label="Buscar por SKU"
              value={searchCatSKU}
              onChange={(e) => { setSearchCatSKU(e.target.value); setPageCat(0); }}
            />
            <TextField
              size="small"
              label="Buscar por Descripción"
              value={searchCatDesc}
              onChange={(e) => { setSearchCatDesc(e.target.value); setPageCat(0); }}
            />
          </Box>
          <Box sx={{ overflowX: 'auto', width: '100%' }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Prod ID</TableCell>
                  <TableCell>SKU</TableCell>
                  <TableCell>Código de Barras</TableCell>
                  <TableCell>Descripción</TableCell>
                  <TableCell>Categoría</TableCell>
                  <TableCell>Tipo</TableCell>
                  <TableCell>Marca</TableCell>
                  <TableCell>Medida</TableCell>
                  <TableCell>Costo</TableCell>
                  <TableCell>Precio Venta</TableCell>
                  <TableCell>T° Conservación</TableCell>
                  <TableCell>Vida Útil</TableCell>
                  <TableCell>Lead Time</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell align="right">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedTodosProductos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={14} align="center">No hay productos en el catálogo.</TableCell>
                  </TableRow>
                ) : (
                  paginatedTodosProductos.map((p) => {
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
                            bgcolor: isSelected ? 'rgba(59, 130, 246, 0.25)' : 'rgba(255, 255, 255, 0.04)',
                          },
                          transition: 'background-color 0.2s ease',
                        }}
                      >
                        <TableCell sx={{ fontWeight: 700 }}>{p.prodId}</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>{p.sku}</TableCell>
                        <TableCell>{p.codigoBarras}</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>{p.descripcion}</TableCell>
                        <TableCell>{p.categoria}</TableCell>
                        <TableCell>
                          <Chip
                            label={
                              (() => {
                                const found = tiposProducto.find((t: any) => t.nombre === p.tipoProducto);
                                if (found) return found.descripcion;
                                if (p.tipoProducto === 'PRODUCTO_TERMINADO' || p.tipoProducto === 'PT') return 'Prod. Terminado';
                                if (p.tipoProducto === 'INSUMO' || p.tipoProducto === 'INS') return 'Insumo';
                                if (p.tipoProducto === 'MATERIA_PRIMA' || p.tipoProducto === 'MP') return 'Mat. Prima';
                                return p.tipoProducto;
                              })()
                            }
                            color={
                              p.tipoProducto === 'PRODUCTO_TERMINADO' || p.tipoProducto === 'PT'
                                ? 'primary'
                                : p.tipoProducto === 'INSUMO' || p.tipoProducto === 'INS'
                                ? 'secondary'
                                : 'warning'
                            }
                            size="small"
                          />
                        </TableCell>
                        <TableCell>{p.marca}</TableCell>
                        <TableCell>{p.unidadMedida}</TableCell>
                        <TableCell>{formatCurrency(p.costo)}</TableCell>
                        <TableCell>{formatCurrency(p.precioVenta)}</TableCell>
                        <TableCell>{p.temperaturaMin}°C a {p.temperaturaMax}°C</TableCell>
                        <TableCell>{p.vidaUtilDias} días</TableCell>
                        <TableCell>{p.leadTime || 0} días</TableCell>
                        <TableCell>
                          <Chip
                            label={p.estado}
                            color={p.estado === 'ACTIVO' ? 'success' : 'error'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="right">
                          {(usuario?.rol === 'ADMINISTRADOR' || usuario?.rol === 'SUPERVISOR' || usuario?.rol === 'ALMACEN') && (
                            <>
                              <Tooltip title="Asociar Proveedores">
                                <IconButton
                                  size="small"
                                  color="secondary"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenAsociarProveedores(p);
                                  }}
                                  sx={{ mr: 0.5 }}
                                >
                                  <Store fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Editar Producto">
                                <IconButton
                                  size="small"
                                  color="primary"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedProducto(p);
                                    setEditarProductoForm({
                                      sku: p.sku,
                                      tipoProducto: p.tipoProducto || 'PRODUCTO_TERMINADO',
                                      descripcion: p.descripcion,
                                      categoria: p.categoria,
                                      marca: p.marca,
                                      unidadMedida: p.unidadMedida,
                                      costo: String(p.costo),
                                      precioVenta: String(p.precioVenta),
                                      iva: String(p.iva),
                                      temperaturaMin: String(p.temperaturaMin),
                                      temperaturaMax: String(p.temperaturaMax),
                                      vidaUtilDias: String(p.vidaUtilDias),
                                      leadTime: String(p.leadTime || 0),
                                      estado: p.estado,
                                      esManufacturado: p.esManufacturado !== false,
                                    });
                                    setOpenEditarProducto(true);
                                  }}
                                >
                                  <Edit fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              {(usuario?.rol === 'ADMINISTRADOR' || usuario?.rol === 'SUPERVISOR') && (
                                <Tooltip title="Eliminar Producto del Catálogo">
                                  <IconButton
                                    size="small"
                                    color="error"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedProducto(p);
                                      setOpenEliminarProducto(true);
                                    }}
                                    sx={{ ml: 0.5 }}
                                  >
                                    <Delete fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              )}
                            </>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
            <TablePagination
              component="div"
              count={filteredTodosProductos.length}
              page={pageCat}
              onPageChange={(_, newPage) => setPageCat(newPage)}
              rowsPerPage={rowsPerPageCat}
              onRowsPerPageChange={(e) => {
                setRowsPerPageCat(parseInt(e.target.value, 10));
                setPageCat(0);
              }}
              rowsPerPageOptions={[10, 25, 50, 100]}
              labelRowsPerPage="Registros por página:"
            />
          </Box>
        </Paper>
      )}

      {/* TAB 4: GESTIÓN DE LOTES */}
      {activeTab === 4 && tienePermisoInventario && (
        <Paper className="glass-panel" sx={{ p: 3 }}>
          <Box sx={{ overflowX: 'auto', width: '100%' }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Lote N°</TableCell>
                  <TableCell>Producto</TableCell>
                  <TableCell>Proveedor</TableCell>
                  <TableCell>Fechas (Prod / Venc)</TableCell>
                  <TableCell>T° Conservación</TableCell>
                  <TableCell>Stock Inicial</TableCell>
                  <TableCell>Stock Actual</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell align="right">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedTodosLotes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center">No hay lotes registrados.</TableCell>
                  </TableRow>
                ) : (
                  paginatedTodosLotes.map((l) => {
                    const diasRestantes = Math.ceil((new Date(l.fechaVencimiento).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                    const isVencido = diasRestantes <= 0;
                    const isSelected = selectedRowId === l.id;
                    return (
                      <TableRow
                        key={l.id}
                        hover
                        onClick={() => setSelectedRowId(isSelected ? null : l.id)}
                        sx={{
                          cursor: 'pointer',
                          bgcolor: isSelected ? 'rgba(59, 130, 246, 0.15)' : 'inherit',
                          '&:hover': {
                            bgcolor: isSelected ? 'rgba(59, 130, 246, 0.25)' : 'rgba(255, 255, 255, 0.04)',
                          },
                          transition: 'background-color 0.2s ease',
                        }}
                      >
                        <TableCell sx={{ fontWeight: 700 }}>
                          <Chip label={l.numeroLote} color={isVencido ? 'error' : 'default'} variant="outlined" />
                        </TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>{l.producto.descripcion}</TableCell>
                        <TableCell>{l.proveedor.nombre}</TableCell>
                        <TableCell>
                          <strong>P:</strong> {new Date(l.fechaProduccion).toLocaleDateString('es-CL')}
                          <br />
                          <strong>V:</strong> {new Date(l.fechaVencimiento).toLocaleDateString('es-CL')} 
                          {' '}({isVencido ? 'Vencido' : `${diasRestantes} días restantes`})
                        </TableCell>
                        <TableCell>{l.temperaturaRequeridaMin}°C a {l.temperaturaRequeridaMax}°C</TableCell>
                        <TableCell>{l.cantidadInicial} {l.producto.unidadMedida}</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>{l.cantidadActual} {l.producto.unidadMedida}</TableCell>
                        <TableCell>
                          <Chip
                            label={l.estado}
                            color={
                              l.estado === 'APROBADO'
                                ? 'success'
                                : l.estado === 'CUARENTENA'
                                ? 'warning'
                                : 'error'
                            }
                            size="small"
                            sx={{ fontWeight: 700 }}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end', alignItems: 'center' }}>
                            <Tooltip title="Ver Código de Barras Combinado">
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setBarcodeDialogData({
                                    sku: l.producto.sku,
                                    codigoBarras: l.producto.codigoBarras || l.producto.sku,
                                    prodId: l.producto.prodId,
                                    numeroLote: l.numeroLote,
                                    productoNombre: l.producto.descripcion,
                                  });
                                  setOpenBarcodeDialog(true);
                                }}
                              >
                                <QrCode />
                              </IconButton>
                            </Tooltip>

                            {(usuario?.rol === 'ADMINISTRADOR' || usuario?.rol === 'SUPERVISOR' || usuario?.rol === 'CONTROL_CALIDAD' || usuario?.rol === 'ALMACEN') && (
                              <Tooltip title="Editar Lote">
                                <IconButton
                                  size="small"
                                  color="info"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenEditarLote(l);
                                  }}
                                >
                                  <Edit fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}

                            {(usuario?.rol === 'ADMINISTRADOR' || usuario?.rol === 'SUPERVISOR') && (
                              <Tooltip title="Eliminar Lote">
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenEliminarLote(l);
                                  }}
                                >
                                  <Delete fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}

                            {(usuario?.rol === 'ADMINISTRADOR' || usuario?.rol === 'SUPERVISOR' || usuario?.rol === 'CONTROL_CALIDAD') && (
                              <>
                                <Button
                                  variant="outlined"
                                  size="small"
                                  color="success"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCambiarEstadoLote(l.id, 'APROBADO');
                                  }}
                                  disabled={l.estado === 'APROBADO'}
                                >
                                  Aprobar
                                </Button>
                                <Button
                                  variant="outlined"
                                  size="small"
                                  color="warning"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCambiarEstadoLote(l.id, 'CUARENTENA');
                                  }}
                                  disabled={l.estado === 'CUARENTENA'}
                                >
                                  Cuarentena
                                </Button>
                                <Button
                                  variant="outlined"
                                  size="small"
                                  color="error"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCambiarEstadoLote(l.id, 'RECHAZADO');
                                  }}
                                  disabled={l.estado === 'RECHAZADO'}
                                >
                                  Rechazar
                                </Button>
                              </>
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
              component="div"
              count={todosLotes.length}
              page={pageLote}
              onPageChange={(_, newPage) => setPageLote(newPage)}
              rowsPerPage={rowsPerPageLote}
              onRowsPerPageChange={(e) => {
                setRowsPerPageLote(parseInt(e.target.value, 10));
                setPageLote(0);
              }}
              rowsPerPageOptions={[10, 25, 50, 100]}
              labelRowsPerPage="Registros por página:"
            />
          </Box>
        </Paper>
      )}

      {/* TAB 5: MERMAS Y PÉRDIDAS */}
      {activeTab === 5 && tienePermisoInventario && (
        <Paper className="glass-panel" sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800 }}>
                Control de Mermas y Pérdidas de Inventario
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Registra mermas por vencimiento, daño, fallos térmicos o pérdida de productos por sucursal.
              </Typography>
            </Box>
            {(usuario?.rol === 'ADMINISTRADOR' || usuario?.rol === 'SUPERVISOR' || usuario?.rol === 'ALMACEN') && (
              <Button
                variant="contained"
                color="error"
                startIcon={<Inventory />}
                onClick={() => {
                  setOpenMerma(true);
                  const defaultSucursalId = (usuario?.rol === 'ADMINISTRADOR' || usuario?.rol === 'SUPERVISOR') 
                    ? '' 
                    : (usuario?.sucursalId || '');
                  setMermaForm({
                    sucursalId: defaultSucursalId,
                    productoId: '',
                    loteId: '',
                    cantidad: '',
                    tipoMerma: 'VENCIMIENTO',
                    motivo: '',
                  });
                }}
              >
                Registrar Merma / Pérdida
              </Button>
            )}
          </Box>

          <Box sx={{ overflowX: 'auto', mt: 2 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Fecha</TableCell>
                  <TableCell>Sucursal</TableCell>
                  <TableCell>SKU</TableCell>
                  <TableCell>Producto</TableCell>
                  <TableCell>Lote</TableCell>
                  <TableCell>Cantidad</TableCell>
                  <TableCell>Tipo de Merma</TableCell>
                  <TableCell>Justificación / Comentario</TableCell>
                  <TableCell>Registrado Por</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {mermasMovimientos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center">
                      <Typography color="text.secondary" sx={{ py: 2 }}>No se han registrado mermas o pérdidas en el sistema.</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  mermasMovimientos.map((m) => {
                    const match = m.motivo.match(/^\[(.*?)\]\s*(.*)$/);
                    const tipo = match ? match[1] : 'OTROS';
                    const comentario = match ? match[2] : m.motivo;
                    const isSelected = selectedRowId === m.id;

                    const getTipoColor = (t: string) => {
                      switch (t) {
                        case 'VENCIMIENTO': return 'warning';
                        case 'ROTURA_DANIO': return 'info';
                        case 'ROBO': return 'error';
                        case 'FALLO_FRIO': return 'primary';
                        default: return 'default';
                      }
                    };

                    const getTipoLabel = (t: string) => {
                      switch (t) {
                        case 'VENCIMIENTO': return 'Vencimiento';
                        case 'ROTURA_DANIO': return 'Rotura/Daño';
                        case 'ROBO': return 'Robo/Hurto';
                        case 'FALLO_FRIO': return 'Fallo Frío';
                        default: return 'Otros';
                      }
                    };

                    return (
                      <TableRow
                        key={m.id}
                        hover
                        onClick={() => setSelectedRowId(isSelected ? null : m.id)}
                        sx={{
                          cursor: 'pointer',
                          bgcolor: isSelected ? 'rgba(59, 130, 246, 0.15)' : 'inherit',
                          '&:hover': {
                            bgcolor: isSelected ? 'rgba(59, 130, 246, 0.25)' : 'rgba(255, 255, 255, 0.04)',
                          },
                          transition: 'background-color 0.2s ease',
                        }}
                      >
                        <TableCell>{new Date(m.fecha).toLocaleDateString('es-CL', { hour: '2-digit', minute: '2-digit' })}</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{m.sucursalOrigen?.nombre || 'Global'}</TableCell>
                        <TableCell sx={{ fontFamily: 'monospace' }}>{m.producto?.sku}</TableCell>
                        <TableCell>{m.producto?.descripcion}</TableCell>
                        <TableCell>
                          {m.lote ? (
                            <Chip label={m.lote.numeroLote} size="small" variant="outlined" />
                          ) : (
                            <Typography variant="caption" color="text.secondary">Sin Lote</Typography>
                          )}
                        </TableCell>
                        <TableCell sx={{ fontWeight: 700, color: 'error.main' }}>-{m.cantidad} U</TableCell>
                        <TableCell>
                          <Chip
                            label={getTipoLabel(tipo)}
                            color={getTipoColor(tipo) as any}
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>{comentario}</TableCell>
                        <TableCell>{m.usuario?.nombre} ({m.usuario?.rol})</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </Box>
        </Paper>
      )}

      {((activeTab === 0 || activeTab === 1 || activeTab === 3 || activeTab === 4 || activeTab === 5) && !tienePermisoInventario) && (
        <Paper className="glass-panel" sx={{ p: 3 }}>
          <Alert severity="error">No tiene permisos para acceder a esta sección del inventario.</Alert>
        </Paper>
      )}

      {/* DIALOG: AJUSTE MANUAL */}
      <Dialog open={openAjuste} onClose={() => setOpenAjuste(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 800 }}>Ajuste de Inventario Manual</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          {/* Cargar datos dinámicos si es admin */}
          <FormControl fullWidth size="small">
            <InputLabel>Sucursal</InputLabel>
            <Select
              value={ajusteForm.sucursalId}
              label="Sucursal"
              onChange={(e) => setAjusteForm({ ...ajusteForm, sucursalId: e.target.value })}
            >
              {sucursales.map((s) => (
                <MenuItem key={s.id} value={s.id}>{s.nombre}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth size="small">
            <InputLabel>Producto</InputLabel>
            <Select
              value={ajusteForm.productoId}
              label="Producto"
              onChange={(e) => setAjusteForm({ ...ajusteForm, productoId: e.target.value })}
            >
              {productos.map((p) => (
                <MenuItem key={p.id} value={p.id}>{p.descripcion} ({p.sku})</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth size="small">
            <InputLabel>Lote Requerido</InputLabel>
            <Select
              value={ajusteForm.loteId}
              label="Lote Requerido"
              onChange={(e) => setAjusteForm({ ...ajusteForm, loteId: e.target.value })}
            >
              <MenuItem value="">-- Ninguno (Sin Lote) --</MenuItem>
              {lotes
                .filter((l) => l.productoId === ajusteForm.productoId)
                .map((l) => (
                  <MenuItem key={l.id} value={l.id}>{l.numeroLote} (Disponible: {l.cantidadActual})</MenuItem>
                ))}
            </Select>
          </FormControl>

          <FormControl fullWidth size="small">
            <InputLabel>Tipo de Ajuste</InputLabel>
            <Select
              value={ajusteForm.tipo}
              label="Tipo de Ajuste"
              onChange={(e) => setAjusteForm({ ...ajusteForm, tipo: e.target.value })}
            >
              <MenuItem value="ENTRADA">Entrada (Sumar Stock)</MenuItem>
              <MenuItem value="SALIDA">Salida (Mermas / Egreso)</MenuItem>
            </Select>
          </FormControl>

          <TextField
            fullWidth
            label="Cantidad"
            type="number"
            size="small"
            value={ajusteForm.cantidad}
            onChange={(e) => setAjusteForm({ ...ajusteForm, cantidad: e.target.value })}
          />

          <TextField
            fullWidth
            label="Motivo Justificación"
            size="small"
            value={ajusteForm.motivo}
            onChange={(e) => setAjusteForm({ ...ajusteForm, motivo: e.target.value })}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenAjuste(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleAjusteSubmit}>Aplicar Ajuste</Button>
        </DialogActions>
      </Dialog>

      {/* DIALOG: TRASLADO */}
      <Dialog open={openTransfer} onClose={() => setOpenTransfer(false)} fullWidth maxWidth="md">
        <DialogTitle sx={{ fontWeight: 800 }}>Solicitud de Traslado Inter-Sucursal</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
            {/* Cabecera y Selección de Sucursales */}
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700, color: 'text.secondary' }}>
                1. Configurar Sucursales
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Sucursal Origen (Desde)</InputLabel>
                  <Select
                    value={transferForm.origenId}
                    label="Sucursal Origen (Desde)"
                    onChange={(e) => setTransferForm({ ...transferForm, origenId: e.target.value })}
                  >
                    {sucursales.map((s) => (
                      <MenuItem key={s.id} value={s.id}>{s.nombre}</MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl fullWidth size="small">
                  <InputLabel>Sucursal Destino (Hacia)</InputLabel>
                  <Select
                    value={transferForm.destinoId}
                    label="Sucursal Destino (Hacia)"
                    onChange={(e) => setTransferForm({ ...transferForm, destinoId: e.target.value })}
                  >
                    {sucursales
                      .filter((s) => s.id !== transferForm.origenId)
                      .map((s) => (
                        <MenuItem key={s.id} value={s.id}>{s.nombre}</MenuItem>
                      ))}
                  </Select>
                </FormControl>
              </Box>

              <Typography variant="subtitle2" sx={{ mt: 3, mb: 1, fontWeight: 700, color: 'text.secondary' }}>
                2. Seleccionar Producto y Lote
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Producto</InputLabel>
                  <Select
                    value={transferForm.productoId}
                    label="Producto"
                    onChange={(e) => setTransferForm({ ...transferForm, productoId: e.target.value, loteId: '' })}
                  >
                    {productos.map((p) => (
                      <MenuItem key={p.id} value={p.id}>{p.descripcion} ({p.sku})</MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl fullWidth size="small" disabled={!transferForm.productoId}>
                  <InputLabel>Lote</InputLabel>
                  <Select
                    value={transferForm.loteId}
                    label="Lote"
                    onChange={(e) => setTransferForm({ ...transferForm, loteId: e.target.value })}
                  >
                    {lotes
                      .filter((l) => l.productoId === transferForm.productoId)
                      .map((l) => (
                        <MenuItem key={l.id} value={l.id}>{l.numeroLote} (Disponible: {l.cantidadActual})</MenuItem>
                      ))}
                  </Select>
                </FormControl>

                <TextField
                  fullWidth
                  label="Cantidad a Transferir"
                  type="number"
                  size="small"
                  value={transferForm.cantidad}
                  onChange={(e) => setTransferForm({ ...transferForm, cantidad: e.target.value })}
                  disabled={!transferForm.loteId}
                />

                <Button
                  variant="outlined"
                  color="primary"
                  onClick={() => {
                    if (!transferForm.productoId || !transferForm.loteId || !transferForm.cantidad) return;
                    const prodObj = productos.find(p => p.id === transferForm.productoId);
                    const loteObj = lotes.find(l => l.id === transferForm.loteId);
                    if (!prodObj || !loteObj) return;

                    if (prodObj.unidadMedida?.toUpperCase() === 'UNIDAD') {
                      if (parseFloat(transferForm.cantidad) % 1 !== 0) {
                        setErrorMsg(`Para el producto "${prodObj.descripcion}" (Unidades), la cantidad a transferir debe ser un número entero.`);
                        return;
                      }
                    }
                    setErrorMsg(null);

                    setTransferItems([
                      ...transferItems,
                      {
                        productoId: transferForm.productoId,
                        productoNombre: prodObj.descripcion,
                        sku: prodObj.sku,
                        loteId: transferForm.loteId,
                        loteNumero: loteObj.numeroLote,
                        cantidad: transferForm.cantidad,
                      }
                    ]);

                    setTransferForm({
                      ...transferForm,
                      productoId: '',
                      loteId: '',
                      cantidad: '',
                    });
                  }}
                  disabled={!transferForm.productoId || !transferForm.loteId || !transferForm.cantidad}
                >
                  Agregar al Traslado
                </Button>
              </Box>
            </Box>

            {/* Lista de Ítems Agregados */}
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700, color: 'text.secondary' }}>
                Ítems a Transferir ({transferItems.length})
              </Typography>
              <Paper variant="outlined" sx={{ p: 2, minHeight: 300, display: 'flex', flexDirection: 'column', gap: 1, borderRadius: 2, bgcolor: 'background.default' }}>
                {transferItems.length === 0 ? (
                  <Box sx={{ m: 'auto', textAlign: 'center', color: 'text.secondary', p: 2 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>No has agregado ítems todavía.</Typography>
                    <Typography variant="caption">Selecciona un producto y lote a la izquierda y presiona "Agregar al Traslado".</Typography>
                  </Box>
                ) : (
                  <List dense>
                    {transferItems.map((item, index) => (
                      <ListItem
                        key={index}
                        secondaryAction={
                          <IconButton
                            edge="end"
                            aria-label="delete"
                            color="error"
                            size="small"
                            onClick={() => {
                              const newItems = [...transferItems];
                              newItems.splice(index, 1);
                              setTransferItems(newItems);
                            }}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        }
                      >
                        <ListItemText
                          primary={item.productoNombre}
                          secondary={`Lote: ${item.loteNumero} | Cantidad: ${item.cantidad}`}
                        />
                      </ListItem>
                    ))}
                  </List>
                )}
              </Paper>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenTransfer(false)}>Cancelar</Button>
          <Button
            variant="contained"
            color="success"
            onClick={handleTransferSubmit}
            disabled={transferItems.length === 0 && (!transferForm.productoId || !transferForm.loteId || !transferForm.cantidad)}
          >
            Registrar Solicitud
          </Button>
        </DialogActions>
      </Dialog>

      {/* DIALOG: RECEPCIÓN GRUPAL */}
      <Dialog open={openRecepcionGrupal} onClose={() => setOpenRecepcionGrupal(false)} fullWidth maxWidth="md">
        <DialogTitle sx={{ fontWeight: 800 }}>Recepción de Carga - {recepcionDestinoNombre}</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.2fr 0.8fr' }, gap: 3 }}>
            {/* Lista de transferencias a recibir */}
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 700, color: 'text.secondary' }}>
                Seleccione las transferencias físicas que está recibiendo:
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxHeight: 350, overflowY: 'auto', pr: 1 }}>
                {transferencias
                  .filter((tr) => tr.destinoId === recepcionDestinoId && (tr.estado === 'PENDIENTE' || tr.estado === 'EN_TRANSITO'))
                  .map((tr) => {
                    const isChecked = recepcionTransIds.includes(tr.id);
                    return (
                      <Paper
                        variant="outlined"
                        key={tr.id}
                        sx={{
                          p: 2,
                          borderRadius: 2,
                          borderColor: isChecked ? 'success.light' : 'divider',
                          bgcolor: isChecked ? 'rgba(46, 125, 50, 0.04)' : 'background.paper',
                        }}
                      >
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={isChecked}
                              color="success"
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setRecepcionTransIds([...recepcionTransIds, tr.id]);
                                } else {
                                  setRecepcionTransIds(recepcionTransIds.filter((id) => id !== tr.id));
                                }
                              }}
                            />
                          }
                          label={
                            <Box sx={{ ml: 1 }}>
                              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                                {tr.codigo} ({tr.estado})
                              </Typography>
                              <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                                Desde: {tr.origen.nombre}
                              </Typography>
                              <Box sx={{ mt: 1 }}>
                                {tr.detalles.map((det: any) => (
                                  <Chip
                                    key={det.id}
                                    label={`${det.producto.descripcion} (L: ${det.lote?.numeroLote}) x ${det.cantidad} ${det.producto.unidadMedida}`}
                                    size="small"
                                    sx={{ mr: 0.5, mb: 0.5 }}
                                  />
                                ))}
                              </Box>
                            </Box>
                          }
                        />
                      </Paper>
                    );
                  })}
              </Box>
            </Box>

            {/* Firma y datos de recepción */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                Datos del Receptor
              </Typography>
              
              <TextField
                fullWidth
                size="small"
                label="Nombre de quien recibe"
                value={recepcionNombre}
                onChange={(e) => setRecepcionNombre(e.target.value)}
                required
              />

              <TextField
                fullWidth
                size="small"
                type="password"
                label="PIN de Autorización (4 dígitos)"
                value={recepcionPin}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9]/g, '');
                  if (val.length <= 4) setRecepcionPin(val);
                }}
                required
                sx={{
                  '& input': {
                    textAlign: 'center',
                    letterSpacing: '0.4em',
                    fontSize: '1.1rem',
                    fontWeight: 'bold'
                  }
                }}
              />

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                    Firma Digital de Aceptación
                  </Typography>
                  <Button size="small" variant="text" color="error" onClick={clearCanvas} sx={{ fontSize: '0.75rem', p: 0 }}>
                    Limpiar firma
                  </Button>
                </Box>
                <Box
                  sx={{
                    border: '2px dashed',
                    borderColor: 'divider',
                    borderRadius: 2,
                    bgcolor: '#ffffff',
                    overflow: 'hidden',
                    height: 180,
                  }}
                >
                  <canvas
                    ref={canvasRef}
                    width={320}
                    height={180}
                    style={{ width: '100%', height: '100%', display: 'block', cursor: 'crosshair' }}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                  />
                </Box>
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenRecepcionGrupal(false)}>Cancelar</Button>
          <Button
            variant="contained"
            color="success"
            onClick={handleRecepcionGrupalSubmit}
            disabled={recepcionTransIds.length === 0 || !recepcionNombre.trim() || recepcionPin.length !== 4}
          >
            Confirmar y Recibir ({recepcionTransIds.length})
          </Button>
        </DialogActions>
      </Dialog>

      {/* DIALOG: ASOCIAR A INVENTARIO */}
      <Dialog open={openAsociar} onClose={() => setOpenAsociar(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 800 }}>Agregar a Inventario</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <FormControl fullWidth size="small">
            <InputLabel>Sucursal</InputLabel>
            <Select
              value={asociarForm.sucursalId}
              label="Sucursal"
              onChange={(e) => setAsociarForm({ ...asociarForm, sucursalId: e.target.value })}
            >
              {sucursales.map((s) => (
                <MenuItem key={s.id} value={s.id}>{s.nombre}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth size="small">
            <InputLabel>Producto</InputLabel>
            <Select
              value={asociarForm.productoId}
              label="Producto"
              onChange={(e) => setAsociarForm({ ...asociarForm, productoId: e.target.value })}
            >
              {productos.map((p) => (
                <MenuItem key={p.id} value={p.id}>{p.descripcion} ({p.sku})</MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            fullWidth
            label="Existencia Inicial"
            type="number"
            size="small"
            value={asociarForm.existencia}
            onChange={(e) => setAsociarForm({ ...asociarForm, existencia: e.target.value })}
          />

          <TextField
            fullWidth
            label="Stock Mínimo de Seguridad"
            type="number"
            size="small"
            value={asociarForm.existMin}
            onChange={(e) => setAsociarForm({ ...asociarForm, existMin: e.target.value })}
          />

          <TextField
            fullWidth
            label="Stock Máximo"
            type="number"
            size="small"
            value={asociarForm.existMax}
            onChange={(e) => setAsociarForm({ ...asociarForm, existMax: e.target.value })}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenAsociar(false)}>Cancelar</Button>
          <Button variant="contained" color="success" onClick={handleAsociarSubmit}>Guardar</Button>
        </DialogActions>
      </Dialog>

      {/* DIALOG: EDITAR INVENTARIO */}
      <Dialog open={openEdit} onClose={() => { setOpenEdit(false); setSelectedInv(null); }} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 800 }}>Editar Registro de Inventario</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          {selectedInv && (
            <Typography variant="body2" sx={{ mb: 1, color: 'text.secondary' }}>
              Producto: <strong>{selectedInv.producto.descripcion}</strong>
              <br />
              Sucursal: <strong>{selectedInv.sucursal.nombre}</strong>
            </Typography>
          )}

          <TextField
            fullWidth
            label="Existencias"
            type="number"
            size="small"
            value={editForm.existencia}
            onChange={(e) => setEditForm({ ...editForm, existencia: e.target.value })}
          />

          <TextField
            fullWidth
            label="Stock Mínimo de Seguridad"
            type="number"
            size="small"
            value={editForm.existMin}
            onChange={(e) => setEditForm({ ...editForm, existMin: e.target.value })}
          />

          <TextField
            fullWidth
            label="Stock Máximo"
            type="number"
            size="small"
            value={editForm.existMax}
            onChange={(e) => setEditForm({ ...editForm, existMax: e.target.value })}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => { setOpenEdit(false); setSelectedInv(null); }}>Cancelar</Button>
          <Button variant="contained" color="primary" onClick={handleEditSubmit}>Actualizar</Button>
        </DialogActions>
      </Dialog>

      {/* DIALOG: CONFIRMAR ELIMINACIÓN */}
      <Dialog open={openDelete} onClose={() => { setOpenDelete(false); setSelectedInv(null); }} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 800 }}>¿Eliminar registro de inventario?</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {selectedInv && (
            <Typography variant="body1">
              ¿Está seguro que desea eliminar el producto <strong>{selectedInv.producto.descripcion}</strong> de la sucursal <strong>{selectedInv.sucursal.nombre}</strong>? 
              <br /><br />
              Esta acción no se puede deshacer y podría afectar el registro histórico.
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => { setOpenDelete(false); setSelectedInv(null); }}>Cancelar</Button>
          <Button variant="contained" color="error" onClick={handleDeleteSubmit}>Eliminar</Button>
        </DialogActions>
      </Dialog>

      {/* DIALOG: CREAR PRODUCTO */}
      <Dialog open={openCrearProducto} onClose={() => setOpenCrearProducto(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 800 }}>Crear Nuevo Producto en Catálogo</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <TextField
            fullWidth
            label="SKU (Auto-generado)"
            placeholder="PT-QUE-QML"
            size="small"
            value={productoForm.sku}
            onChange={(e) => setProductoForm({ ...productoForm, sku: e.target.value })}
            helperText="Se genera automáticamente al completar Tipo, Categoría y Nombre. Puedes editarlo manualmente."
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <Tooltip title="Regenerar SKU">
                      <Button
                        size="small"
                        onClick={() => {
                          const sku = generarSKU(productoForm.tipoProducto, productoForm.categoria, productoForm.descripcion);
                          if (sku) setProductoForm({ ...productoForm, sku });
                        }}
                        sx={{ textTransform: 'none', fontWeight: 700 }}
                      >
                        Regenerar
                      </Button>
                    </Tooltip>
                  </InputAdornment>
                ),
              },
            }}
          />

          <TextField
            fullWidth
            label="Código de Barras"
            placeholder="7801234567890"
            size="small"
            value={productoForm.codigoBarras}
            onChange={(e) => setProductoForm({ ...productoForm, codigoBarras: e.target.value })}
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <Button
                      size="small"
                      onClick={() => {
                        const barcode = generateInternalBarcode();
                        setProductoForm({ ...productoForm, codigoBarras: barcode });
                      }}
                      sx={{ textTransform: 'none', fontWeight: 700 }}
                    >
                      Generar
                    </Button>
                  </InputAdornment>
                ),
              },
            }}
          />

          <TextField
            fullWidth
            label="Descripción / Nombre"
            placeholder="Queso Mantecoso Laminado"
            size="small"
            value={productoForm.descripcion}
            onChange={(e) => setProductoForm({ ...productoForm, descripcion: e.target.value })}
          />

          <FormControl fullWidth size="small">
            <InputLabel>Categoría</InputLabel>
            <Select
              value={productoForm.categoria}
              label="Categoría"
              onChange={(e) => {
                const catName = e.target.value;
                const matchedCat = categorias.find((c: any) => c.nombre === catName);
                setProductoForm({
                  ...productoForm,
                  categoria: catName,
                  tipoProducto: matchedCat ? matchedCat.tipoProducto : 'PRODUCTO_TERMINADO'
                });
              }}
            >
              {categorias.length === 0 ? (
                ['LECHE', 'YOGURT', 'QUESOS', 'MANTEQUILLA', 'HELADOS', 'POSTRES', 'OTROS'].map((cat) => (
                  <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                ))
              ) : (
                categorias.map((cat) => (
                  <MenuItem key={cat.id} value={cat.nombre}>{cat.nombre}</MenuItem>
                ))
              )}
            </Select>
          </FormControl>

          <FormControl fullWidth size="small">
            <InputLabel>Tipo de Producto</InputLabel>
            <Select
              value={productoForm.tipoProducto}
              label="Tipo de Producto"
              onChange={(e) => setProductoForm({ ...productoForm, tipoProducto: e.target.value })}
            >
              {tiposProducto.length === 0 ? (
                [
                  { nombre: 'PRODUCTO_TERMINADO', descripcion: 'Producto Terminado' },
                  { nombre: 'INSUMO', descripcion: 'Insumo' },
                  { nombre: 'MATERIA_PRIMA', descripcion: 'Materia Prima' },
                ].map((t) => (
                  <MenuItem key={t.nombre} value={t.nombre}>{t.descripcion}</MenuItem>
                ))
              ) : (
                tiposProducto.map((t) => (
                  <MenuItem key={t.id} value={t.nombre}>{t.descripcion}</MenuItem>
                ))
              )}
            </Select>
          </FormControl>

          <TextField
            fullWidth
            label="Marca"
            placeholder="Lácteos ERP"
            size="small"
            value={productoForm.marca}
            onChange={(e) => setProductoForm({ ...productoForm, marca: e.target.value })}
          />

          <FormControl fullWidth size="small">
            <InputLabel>Unidad de Medida</InputLabel>
            <Select
              value={productoForm.unidadMedida}
              label="Unidad de Medida"
              onChange={(e) => setProductoForm({ ...productoForm, unidadMedida: e.target.value })}
            >
              {unidadesMedida.length === 0 ? (
                ['LITRO', 'KILO', 'GRAMOS', 'UNIDAD'].map((u) => (
                  <MenuItem key={u} value={u}>{u}</MenuItem>
                ))
              ) : (
                unidadesMedida.map((u) => (
                  <MenuItem key={u.id} value={u.nombre}>{u.nombre} ({u.abreviacion})</MenuItem>
                ))
              )}
            </Select>
          </FormControl>

          <TextField
            fullWidth
            label="Costo Unitario ($)"
            type="number"
            size="small"
            value={productoForm.costo}
            onChange={(e) => setProductoForm({ ...productoForm, costo: e.target.value })}
          />

          <TextField
            fullWidth
            label="Precio de Venta ($)"
            type="number"
            size="small"
            value={productoForm.precioVenta}
            onChange={(e) => setProductoForm({ ...productoForm, precioVenta: e.target.value })}
          />

          <TextField
            fullWidth
            label="IVA"
            type="number"
            size="small"
            disabled
            value="0"
            helperText="El IVA está fijado en 0% por defecto"
          />

          <TextField
            fullWidth
            label="Lead Time / Tiempo de Entrega (Días)"
            type="number"
            size="small"
            value={productoForm.leadTime}
            onChange={(e) => setProductoForm({ ...productoForm, leadTime: e.target.value })}
            helperText="Días estimados para recibir este producto del proveedor"
          />

          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              fullWidth
              label="Temp Mín Conservación (°C)"
              type="number"
              size="small"
              value={productoForm.temperaturaMin}
              onChange={(e) => setProductoForm({ ...productoForm, temperaturaMin: e.target.value })}
            />
            <TextField
              fullWidth
              label="Temp Máx Conservación (°C)"
              type="number"
              size="small"
              value={productoForm.temperaturaMax}
              onChange={(e) => setProductoForm({ ...productoForm, temperaturaMax: e.target.value })}
            />
          </Box>

          <TextField
            fullWidth
            label="Vida Útil (Días)"
            type="number"
            size="small"
            value={productoForm.vidaUtilDias}
            onChange={(e) => setProductoForm({ ...productoForm, vidaUtilDias: e.target.value })}
          />

          {(productoForm.tipoProducto === 'PRODUCTO_TERMINADO' || productoForm.tipoProducto === 'PT') && (
            <FormControlLabel
              control={
                <Switch
                  checked={productoForm.esManufacturado}
                  onChange={(e) => setProductoForm({ ...productoForm, esManufacturado: e.target.checked })}
                  color="primary"
                />
              }
              label="Es Manufacturado (¿Se fabrica en planta?)"
            />
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenCrearProducto(false)}>Cancelar</Button>
          <Button variant="contained" color="success" onClick={handleCrearProductoSubmit}>Guardar</Button>
        </DialogActions>
      </Dialog>

      {/* DIALOG: EDITAR PRODUCTO */}
      <Dialog open={openEditarProducto} onClose={() => { setOpenEditarProducto(false); setSelectedProducto(null); }} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 800 }}>Editar Producto del Catálogo</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          {selectedProducto && (
            <Typography variant="body2" color="text.secondary">
              Código de Barras: <strong>{selectedProducto.codigoBarras}</strong>
            </Typography>
          )}

          <TextField
            fullWidth
            label="SKU (Auto-generado)"
            size="small"
            value={editarProductoForm.sku}
            onChange={(e) => setEditarProductoForm({ ...editarProductoForm, sku: e.target.value.toUpperCase() })}
            helperText="Identificador único del producto. Puedes editarlo o regenerarlo automáticamente."
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <Tooltip title="Regenerar SKU desde Tipo, Categoría y Nombre">
                      <Button
                        size="small"
                        onClick={() => {
                          const sku = generarSKU(editarProductoForm.tipoProducto, editarProductoForm.categoria, editarProductoForm.descripcion);
                          if (sku) setEditarProductoForm({ ...editarProductoForm, sku });
                        }}
                        sx={{ textTransform: 'none', fontWeight: 700 }}
                      >
                        Regenerar
                      </Button>
                    </Tooltip>
                  </InputAdornment>
                ),
              },
            }}
          />

          <TextField
            fullWidth
            label="Descripción / Nombre"
            size="small"
            value={editarProductoForm.descripcion}
            onChange={(e) => setEditarProductoForm({ ...editarProductoForm, descripcion: e.target.value })}
          />

          <FormControl fullWidth size="small">
            <InputLabel>Categoría</InputLabel>
            <Select
              value={editarProductoForm.categoria}
              label="Categoría"
              onChange={(e) => {
                const catName = e.target.value;
                setEditarProductoForm({
                  ...editarProductoForm,
                  categoria: catName,
                });
              }}
            >
              {categorias.length === 0 ? (
                ['LECHE', 'YOGURT', 'QUESOS', 'MANTEQUILLA', 'HELADOS', 'POSTRES', 'OTROS'].map((cat) => (
                  <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                ))
              ) : (
                categorias.map((cat) => (
                  <MenuItem key={cat.id} value={cat.nombre}>{cat.nombre}</MenuItem>
                ))
              )}
            </Select>
          </FormControl>

          <FormControl fullWidth size="small">
            <InputLabel>Tipo de Producto</InputLabel>
            <Select
              value={editarProductoForm.tipoProducto}
              label="Tipo de Producto"
              disabled
              onChange={(e) => setEditarProductoForm({ ...editarProductoForm, tipoProducto: e.target.value })}
            >
              {tiposProducto.length === 0 ? (
                [
                  { nombre: 'PRODUCTO_TERMINADO', descripcion: 'Producto Terminado' },
                  { nombre: 'INSUMO', descripcion: 'Insumo' },
                  { nombre: 'MATERIA_PRIMA', descripcion: 'Materia Prima' },
                ].map((t) => (
                  <MenuItem key={t.nombre} value={t.nombre}>{t.descripcion}</MenuItem>
                ))
              ) : (
                tiposProducto.map((t) => (
                  <MenuItem key={t.id} value={t.nombre}>{t.descripcion}</MenuItem>
                ))
              )}
            </Select>
          </FormControl>

          <TextField
            fullWidth
            label="Marca"
            size="small"
            value={editarProductoForm.marca}
            onChange={(e) => setEditarProductoForm({ ...editarProductoForm, marca: e.target.value })}
          />

          <FormControl fullWidth size="small">
            <InputLabel>Unidad de Medida</InputLabel>
            <Select
              value={editarProductoForm.unidadMedida}
              label="Unidad de Medida"
              onChange={(e) => setEditarProductoForm({ ...editarProductoForm, unidadMedida: e.target.value })}
            >
              {unidadesMedida.length === 0 ? (
                ['LITRO', 'KILO', 'GRAMOS', 'UNIDAD'].map((u) => (
                  <MenuItem key={u} value={u}>{u}</MenuItem>
                ))
              ) : (
                unidadesMedida.map((u) => (
                  <MenuItem key={u.id} value={u.nombre}>{u.nombre} ({u.abreviacion})</MenuItem>
                ))
              )}
            </Select>
          </FormControl>

          <TextField
            fullWidth
            label="Costo Unitario ($)"
            type="number"
            size="small"
            value={editarProductoForm.costo}
            onChange={(e) => setEditarProductoForm({ ...editarProductoForm, costo: e.target.value })}
          />

          <TextField
            fullWidth
            label="Precio de Venta ($)"
            type="number"
            size="small"
            value={editarProductoForm.precioVenta}
            onChange={(e) => setEditarProductoForm({ ...editarProductoForm, precioVenta: e.target.value })}
          />

          <TextField
            fullWidth
            label="IVA"
            type="number"
            size="small"
            disabled
            value="0"
            helperText="El IVA está fijado en 0% por defecto"
          />

          <TextField
            fullWidth
            label="Lead Time / Tiempo de Entrega (Días)"
            type="number"
            size="small"
            value={editarProductoForm.leadTime}
            onChange={(e) => setEditarProductoForm({ ...editarProductoForm, leadTime: e.target.value })}
            helperText="Días estimados para recibir este producto del proveedor"
          />

          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              fullWidth
              label="Temp Mín Conservación (°C)"
              type="number"
              size="small"
              value={editarProductoForm.temperaturaMin}
              onChange={(e) => setEditarProductoForm({ ...editarProductoForm, temperaturaMin: e.target.value })}
            />
            <TextField
              fullWidth
              label="Temp Máx Conservación (°C)"
              type="number"
              size="small"
              value={editarProductoForm.temperaturaMax}
              onChange={(e) => setEditarProductoForm({ ...editarProductoForm, temperaturaMax: e.target.value })}
            />
          </Box>

          <TextField
            fullWidth
            label="Vida Útil (Días)"
            type="number"
            size="small"
            value={editarProductoForm.vidaUtilDias}
            onChange={(e) => setEditarProductoForm({ ...editarProductoForm, vidaUtilDias: e.target.value })}
          />

          <FormControl fullWidth size="small">
            <InputLabel>Estado</InputLabel>
            <Select
              value={editarProductoForm.estado}
              label="Estado"
              onChange={(e) => setEditarProductoForm({ ...editarProductoForm, estado: e.target.value })}
            >
              <MenuItem value="ACTIVO">Activo</MenuItem>
              <MenuItem value="INACTIVO">Inactivo</MenuItem>
            </Select>
          </FormControl>

          {(editarProductoForm.tipoProducto === 'PRODUCTO_TERMINADO' || editarProductoForm.tipoProducto === 'PT') && (
            <FormControlLabel
              control={
                <Switch
                  checked={editarProductoForm.esManufacturado}
                  onChange={(e) => setEditarProductoForm({ ...editarProductoForm, esManufacturado: e.target.checked })}
                  color="primary"
                />
              }
              label="Es Manufacturado (¿Se fabrica en planta?)"
            />
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => { setOpenEditarProducto(false); setSelectedProducto(null); }}>Cancelar</Button>
          <Button variant="contained" color="primary" onClick={handleEditarProductoSubmit}>Actualizar</Button>
        </DialogActions>
      </Dialog>

      {/* DIALOG: CONFIRMAR ELIMINACIÓN DE PRODUCTO */}
      <Dialog open={openEliminarProducto} onClose={() => { setOpenEliminarProducto(false); setSelectedProducto(null); }} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 800 }}>¿Eliminar Producto del Catálogo?</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {selectedProducto && (
            <Typography variant="body1">
              ¿Está seguro que desea eliminar el producto <strong>{selectedProducto.descripcion}</strong> (SKU: <strong>{selectedProducto.sku}</strong>) del catálogo?
              <br /><br />
              Esta acción no se puede deshacer y fallará si el producto tiene lotes, movimientos, compras, recetas o ventas asociadas.
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => { setOpenEliminarProducto(false); setSelectedProducto(null); }}>Cancelar</Button>
          <Button variant="contained" color="error" onClick={handleEliminarProductoSubmit}>Eliminar</Button>
        </DialogActions>
      </Dialog>

      {/* DIALOG: ASOCIAR PROVEEDORES */}
      <Dialog open={openAsociarProveedores} onClose={() => setOpenAsociarProveedores(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 800 }}>
          Proveedores Asociados - {selectedProducto?.descripcion}
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 2 }}>
          {errorMsg && <Alert severity="error" onClose={() => setErrorMsg(null)}>{errorMsg}</Alert>}
          {successMsg && <Alert severity="success" onClose={() => setSuccessMsg(null)}>{successMsg}</Alert>}

          {/* Formulario de Nueva Asociación */}
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: 'background.default' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }}>
              Asociar Nuevo Proveedor
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Proveedor</InputLabel>
                <Select
                  value={asociacionForm.proveedorId}
                  label="Proveedor"
                  onChange={(e) => setAsociacionForm({ ...asociacionForm, proveedorId: e.target.value })}
                >
                  {todosProveedores.map((prov) => (
                    <MenuItem key={prov.id} value={prov.id}>
                      {prov.nombre} ({prov.codigo})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  fullWidth
                  label="Costo Proveedor ($)"
                  type="number"
                  size="small"
                  value={asociacionForm.costoProveedor}
                  onChange={(e) => setAsociacionForm({ ...asociacionForm, costoProveedor: e.target.value })}
                />
                <TextField
                  fullWidth
                  label="Código/SKU Proveedor"
                  placeholder="Ej: PROV-1234"
                  size="small"
                  value={asociacionForm.codigoProveedor}
                  onChange={(e) => setAsociacionForm({ ...asociacionForm, codigoProveedor: e.target.value })}
                />
              </Box>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={asociacionForm.esPredeterminado}
                    onChange={(e) => setAsociacionForm({ ...asociacionForm, esPredeterminado: e.target.checked })}
                    color="primary"
                  />
                }
                label="Definir como Proveedor Predeterminado (Default)"
              />
              <Button
                variant="contained"
                color="success"
                onClick={handleAsociarProveedorSubmit}
                disabled={!asociacionForm.proveedorId}
                sx={{ alignSelf: 'flex-end', textTransform: 'none', fontWeight: 700 }}
              >
                Agregar Asociación
              </Button>
            </Box>
          </Paper>

          {/* Lista de Proveedores Asociados */}
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
              Proveedores Vinculados ({asociacionesProveedor.length})
            </Typography>
            <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Proveedor</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Costo</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>SKU Prov</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Default</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {asociacionesProveedor.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                        No hay proveedores asociados a este producto todavía.
                      </TableCell>
                    </TableRow>
                  ) : (
                    asociacionesProveedor.map((ap) => (
                      <TableRow key={ap.id}>
                        <TableCell sx={{ fontWeight: 600 }}>{ap.proveedor?.nombre}</TableCell>
                        <TableCell>{ap.costoProveedor ? formatCurrency(ap.costoProveedor) : 'No especificado'}</TableCell>
                        <TableCell>{ap.codigoProveedor || '-'}</TableCell>
                        <TableCell>
                          <Chip
                            label={ap.esPredeterminado ? 'Principal' : 'Alternativo'}
                            color={ap.esPredeterminado ? 'success' : 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="right">
                          {!ap.esPredeterminado && (
                            <Button
                              size="small"
                              onClick={async () => {
                                try {
                                  setErrorMsg(null);
                                  await apiFetch(`/productos/${selectedProducto.id}/proveedores`, {
                                    method: 'POST',
                                    body: JSON.stringify({
                                      proveedorId: ap.proveedorId,
                                      costoProveedor: ap.costoProveedor,
                                      codigoProveedor: ap.codigoProveedor,
                                      esPredeterminado: true,
                                    }),
                                  });
                                  const updatedProductos = await apiFetch('/productos');
                                  setTodosProductos(updatedProductos);
                                  const updatedSelected = updatedProductos.find((p: any) => p.id === selectedProducto.id);
                                  if (updatedSelected) {
                                    setSelectedProducto(updatedSelected);
                                    setAsociacionesProveedor(updatedSelected.proveedoresAsociados || []);
                                  }
                                  setSuccessMsg('Proveedor predeterminado actualizado.');
                                } catch (e: any) {
                                  setErrorMsg(e.message);
                                }
                              }}
                              sx={{ mr: 1, textTransform: 'none', fontSize: '0.75rem' }}
                            >
                              Hacer Principal
                            </Button>
                          )}
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleEliminarAsociacion(ap.proveedorId)}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Paper>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenAsociarProveedores(false)} variant="contained">
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>

      {/* DIALOG: REGISTRAR LOTE */}
      <Dialog open={openRegistrarLote} onClose={() => setOpenRegistrarLote(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 800 }}>Registrar Nuevo Lote Directo</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <TextField
            fullWidth
            label="Número de Lote (Vacío para autogenerar)"
            placeholder="Autogenerado (Ej: L-SKU-20260620-123)"
            size="small"
            value={loteForm.numeroLote}
            onChange={(e) => setLoteForm({ ...loteForm, numeroLote: e.target.value })}
          />

          <FormControl fullWidth size="small">
            <InputLabel>Producto</InputLabel>
            <Select
              value={loteForm.productoId}
              label="Producto"
              onChange={(e) => {
                const prodId = e.target.value;
                const prod = productos.find((p) => p.id === prodId);
                setLoteForm({
                  ...loteForm,
                  productoId: prodId,
                  temperaturaRequeridaMin: prod ? String(prod.temperaturaMin) : '2.0',
                  temperaturaRequeridaMax: prod ? String(prod.temperaturaMax) : '6.0',
                });
              }}
            >
              {productos.map((p) => (
                <MenuItem key={p.id} value={p.id}>{p.descripcion} ({p.sku})</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth size="small">
            <InputLabel>Proveedor</InputLabel>
            <Select
              value={loteForm.proveedorId}
              label="Proveedor"
              onChange={(e) => setLoteForm({ ...loteForm, proveedorId: e.target.value })}
            >
              {todosProveedores.map((pr) => (
                <MenuItem key={pr.id} value={pr.id}>{pr.nombre}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <Box sx={{ mb: 2 }}>
            <DatePicker
              label="Fecha de Producción"
              value={loteForm.fechaProduccion ? dayjs(loteForm.fechaProduccion) : null}
              onChange={(newValue) => setLoteForm({ ...loteForm, fechaProduccion: newValue ? newValue.format('YYYY-MM-DD') : '' })}
              slotProps={{ textField: { size: 'small', fullWidth: true } }}
            />
          </Box>

          <Box sx={{ mb: 2 }}>
            <DatePicker
              label="Fecha de Vencimiento"
              value={loteForm.fechaVencimiento ? dayjs(loteForm.fechaVencimiento) : null}
              onChange={(newValue) => setLoteForm({ ...loteForm, fechaVencimiento: newValue ? newValue.format('YYYY-MM-DD') : '' })}
              slotProps={{ textField: { size: 'small', fullWidth: true } }}
            />
          </Box>

          <TextField
            fullWidth
            label="Certificado de Calidad URL (Opcional)"
            placeholder="http://..."
            size="small"
            value={loteForm.certificadoUrl}
            onChange={(e) => setLoteForm({ ...loteForm, certificadoUrl: e.target.value })}
          />

          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              fullWidth
              label="Temp Requerida Mín (°C)"
              type="number"
              size="small"
              value={loteForm.temperaturaRequeridaMin}
              onChange={(e) => setLoteForm({ ...loteForm, temperaturaRequeridaMin: e.target.value })}
            />
            <TextField
              fullWidth
              label="Temp Requerida Máx (°C)"
              type="number"
              size="small"
              value={loteForm.temperaturaRequeridaMax}
              onChange={(e) => setLoteForm({ ...loteForm, temperaturaRequeridaMax: e.target.value })}
            />
          </Box>

          <TextField
            fullWidth
            label="Cantidad Inicial"
            type="number"
            size="small"
            value={loteForm.cantidadInicial}
            onChange={(e) => setLoteForm({ ...loteForm, cantidadInicial: e.target.value })}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenRegistrarLote(false)}>Cancelar</Button>
          <Button variant="contained" color="success" onClick={handleRegistrarLoteSubmit}>Guardar</Button>
        </DialogActions>
      </Dialog>

      {/* Dialogs for category/unit editing removed (moved to Utilidades page) */}

      {/* DIALOG: EDITAR LOTE */}
      <Dialog open={openEditarLote} onClose={() => { setOpenEditarLote(false); setSelectedLote(null); }} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 800 }}>Editar Lote</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <TextField
            fullWidth
            label="Número de Lote"
            size="small"
            value={editarLoteForm.numeroLote}
            onChange={(e) => setEditarLoteForm({ ...editarLoteForm, numeroLote: e.target.value })}
          />

          <FormControl fullWidth size="small">
            <InputLabel>Producto</InputLabel>
            <Select
              value={editarLoteForm.productoId}
              label="Producto"
              onChange={(e) => setEditarLoteForm({ ...editarLoteForm, productoId: e.target.value })}
            >
              {productos.map((p) => (
                <MenuItem key={p.id} value={p.id}>{p.descripcion} ({p.sku})</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth size="small">
            <InputLabel>Proveedor</InputLabel>
            <Select
              value={editarLoteForm.proveedorId}
              label="Proveedor"
              onChange={(e) => setEditarLoteForm({ ...editarLoteForm, proveedorId: e.target.value })}
            >
              {todosProveedores.map((pr) => (
                <MenuItem key={pr.id} value={pr.id}>{pr.nombre}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <Box sx={{ mb: 2 }}>
            <DatePicker
              label="Fecha de Producción"
              value={editarLoteForm.fechaProduccion ? dayjs(editarLoteForm.fechaProduccion) : null}
              onChange={(newValue) => setEditarLoteForm({ ...editarLoteForm, fechaProduccion: newValue ? newValue.format('YYYY-MM-DD') : '' })}
              slotProps={{ textField: { size: 'small', fullWidth: true } }}
            />
          </Box>

          <Box sx={{ mb: 2 }}>
            <DatePicker
              label="Fecha de Vencimiento"
              value={editarLoteForm.fechaVencimiento ? dayjs(editarLoteForm.fechaVencimiento) : null}
              onChange={(newValue) => setEditarLoteForm({ ...editarLoteForm, fechaVencimiento: newValue ? newValue.format('YYYY-MM-DD') : '' })}
              slotProps={{ textField: { size: 'small', fullWidth: true } }}
            />
          </Box>

          <TextField
            fullWidth
            label="Certificado de Calidad URL (Opcional)"
            size="small"
            value={editarLoteForm.certificadoUrl}
            onChange={(e) => setEditarLoteForm({ ...editarLoteForm, certificadoUrl: e.target.value })}
          />

          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              fullWidth
              label="Temp Requerida Mín (°C)"
              type="number"
              size="small"
              value={editarLoteForm.temperaturaRequeridaMin}
              onChange={(e) => setEditarLoteForm({ ...editarLoteForm, temperaturaRequeridaMin: e.target.value })}
            />
            <TextField
              fullWidth
              label="Temp Requerida Máx (°C)"
              type="number"
              size="small"
              value={editarLoteForm.temperaturaRequeridaMax}
              onChange={(e) => setEditarLoteForm({ ...editarLoteForm, temperaturaRequeridaMax: e.target.value })}
            />
          </Box>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              fullWidth
              label="Cantidad Inicial"
              type="number"
              size="small"
              value={editarLoteForm.cantidadInicial}
              onChange={(e) => setEditarLoteForm({ ...editarLoteForm, cantidadInicial: e.target.value })}
            />
            <TextField
              fullWidth
              label="Cantidad Actual"
              type="number"
              size="small"
              value={editarLoteForm.cantidadActual}
              onChange={(e) => setEditarLoteForm({ ...editarLoteForm, cantidadActual: e.target.value })}
            />
          </Box>

          <FormControl fullWidth size="small">
            <InputLabel>Estado</InputLabel>
            <Select
              value={editarLoteForm.estado}
              label="Estado"
              onChange={(e) => setEditarLoteForm({ ...editarLoteForm, estado: e.target.value })}
            >
              <MenuItem value="APROBADO">Aprobado</MenuItem>
              <MenuItem value="CUARENTENA">Cuarentena</MenuItem>
              <MenuItem value="RECHAZADO">Rechazado</MenuItem>
              <MenuItem value="VENCIDO">Vencido</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => { setOpenEditarLote(false); setSelectedLote(null); }}>Cancelar</Button>
          <Button variant="contained" color="primary" onClick={handleEditarLoteSubmit}>Actualizar</Button>
        </DialogActions>
      </Dialog>

      {/* DIALOG: CONFIRMAR ELIMINACIÓN DE LOTE */}
      <Dialog open={openEliminarLote} onClose={() => { setOpenEliminarLote(false); setSelectedLote(null); }} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 800 }}>¿Eliminar Lote?</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {selectedLote && (
            <Typography variant="body1">
              ¿Está seguro que desea eliminar el lote <strong>{selectedLote.numeroLote}</strong> del producto <strong>{selectedLote.producto.descripcion}</strong>?
              <br /><br />
              Esta acción no se puede deshacer y fallará si el lote ya tiene movimientos de inventario, transferencias o ventas asociadas.
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => { setOpenEliminarLote(false); setSelectedLote(null); }}>Cancelar</Button>
          <Button variant="contained" color="error" onClick={handleEliminarLoteSubmit}>Eliminar</Button>
        </DialogActions>
      </Dialog>
 
      {/* DIALOG: VER CODIGO BARRAS COMBINADO */}
      <Dialog open={openBarcodeDialog} onClose={() => setOpenBarcodeDialog(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 800 }}>Código de Barras del Lote</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, pt: 2, pb: 3 }}>
          {barcodeDialogData && (
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
                    `${barcodeDialogData.prodId}#${barcodeDialogData.numeroLote}`
                  )}&code=Code128`}
                  alt="Código de Barras"
                  style={{ maxWidth: '100%', height: 'auto', display: 'block' }}
                />
              </Box>

              <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 700, mt: 1, color: 'text.secondary' }}>
                {`${barcodeDialogData.prodId}#${barcodeDialogData.numeroLote}`}
              </Typography>

              <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', px: 2 }}>
                Este código contiene el código de barras del producto y el lote. Al ser escaneado en el Punto de Venta, seleccionará automáticamente este lote específico.
              </Typography>
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, display: 'flex', gap: 1 }}>
          <Button onClick={() => setOpenBarcodeDialog(false)} variant="outlined" sx={{ flex: 1 }}>
            Cerrar
          </Button>
          <Button
            onClick={() => handlePrintBarcode(barcodeDialogData)}
            variant="contained"
            color="success"
            sx={{ flex: 1 }}
          >
            Imprimir Código
          </Button>
        </DialogActions>
      </Dialog>

      {/* DIALOG: REGISTRAR MERMA */}
      <Dialog open={openMerma} onClose={() => setOpenMerma(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 800 }}>Registrar Merma o Pérdida</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          
          {/* Sucursal select */}
          {(usuario?.rol === 'ADMINISTRADOR' || usuario?.rol === 'SUPERVISOR') ? (
            <FormControl fullWidth size="small">
              <InputLabel>Sucursal</InputLabel>
              <Select
                value={mermaForm.sucursalId}
                label="Sucursal"
                onChange={(e) => setMermaForm({ ...mermaForm, sucursalId: e.target.value, productoId: '', loteId: '' })}
              >
                {sucursales.map((s) => (
                  <MenuItem key={s.id} value={s.id}>{s.nombre}</MenuItem>
                ))}
              </Select>
            </FormControl>
          ) : (
            <TextField
              fullWidth
              size="small"
              label="Sucursal"
              value={usuario?.sucursalNombre || ''}
              disabled
            />
          )}

          {/* Producto select */}
          <FormControl fullWidth size="small" disabled={!(usuario?.rol === 'ADMINISTRADOR' || usuario?.rol === 'SUPERVISOR' ? mermaForm.sucursalId : true)}>
            <InputLabel>Producto</InputLabel>
            <Select
              value={mermaForm.productoId}
              label="Producto"
              onChange={(e) => setMermaForm({ ...mermaForm, productoId: e.target.value, loteId: '' })}
            >
              {productos
                .filter((p) => {
                  const finalSuc = (usuario?.rol === 'ADMINISTRADOR' || usuario?.rol === 'SUPERVISOR') 
                    ? mermaForm.sucursalId 
                    : usuario?.sucursalId;
                  if (!finalSuc) return false;
                  const invItem = inventario.find(i => i.productoId === p.id && i.sucursalId === finalSuc);
                  return invItem && invItem.existencia > 0;
                })
                .map((p) => (
                  <MenuItem key={p.id} value={p.id}>{p.descripcion} (SKU: {p.sku})</MenuItem>
                ))}
            </Select>
          </FormControl>

          {/* Lote select */}
          <FormControl fullWidth size="small" disabled={!mermaForm.productoId}>
            <InputLabel>Lote</InputLabel>
            <Select
              value={mermaForm.loteId}
              label="Lote"
              onChange={(e) => setMermaForm({ ...mermaForm, loteId: e.target.value })}
            >
              <MenuItem value=""><em>Sin Lote / General</em></MenuItem>
              {lotes
                .filter((l) => l.productoId === mermaForm.productoId)
                .map((l) => (
                  <MenuItem key={l.id} value={l.id}>
                    {l.numeroLote} (Stock: {l.cantidadActual} U)
                  </MenuItem>
                ))}
            </Select>
          </FormControl>

          {/* Cantidad input */}
          <TextField
            fullWidth
            type="number"
            size="small"
            label="Cantidad a Dar de Baja"
            value={mermaForm.cantidad}
            onChange={(e) => setMermaForm({ ...mermaForm, cantidad: e.target.value })}
            helperText={
              mermaForm.productoId ? (() => {
                const finalSuc = (usuario?.rol === 'ADMINISTRADOR' || usuario?.rol === 'SUPERVISOR') 
                  ? mermaForm.sucursalId 
                  : usuario?.sucursalId;
                if (mermaForm.loteId) {
                  const selectedLote = lotes.find(l => l.id === mermaForm.loteId);
                  return selectedLote ? `Stock disponible en lote: ${selectedLote.cantidadActual} U` : '';
                } else {
                  const invItem = inventario.find(i => i.productoId === mermaForm.productoId && i.sucursalId === finalSuc);
                  return invItem ? `Stock disponible en inventario: ${invItem.existencia} U` : '';
                }
              })() : ''
            }
          />

          {/* Tipo de Merma select */}
          <FormControl fullWidth size="small">
            <InputLabel>Tipo de Merma</InputLabel>
            <Select
              value={mermaForm.tipoMerma}
              label="Tipo de Merma"
              onChange={(e) => setMermaForm({ ...mermaForm, tipoMerma: e.target.value })}
            >
              <MenuItem value="VENCIMIENTO">Vencimiento</MenuItem>
              <MenuItem value="ROTURA_DANIO">Rotura o Daño Físico</MenuItem>
              <MenuItem value="ROBO">Hurto / Robo</MenuItem>
              <MenuItem value="FALLO_FRIO">Fallo Cadena de Frío</MenuItem>
              <MenuItem value="OTROS">Otros Motivos</MenuItem>
            </Select>
          </FormControl>

          {/* Motivo input */}
          <TextField
            fullWidth
            size="small"
            label="Notas / Justificación"
            multiline
            rows={3}
            value={mermaForm.motivo}
            onChange={(e) => setMermaForm({ ...mermaForm, motivo: e.target.value })}
            placeholder="Escriba los detalles de la pérdida o merma aquí..."
          />

        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenMerma(false)}>Cancelar</Button>
          <Button variant="contained" color="error" onClick={handleRegistrarMerma}>
            Confirmar Baja
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
