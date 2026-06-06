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
  Checkbox,
  FormControlLabel,
  FormGroup,
} from '@mui/material';

const ALL_PERMISSIONS = [
  'VER_DASHBOARD',
  'VER_POS',
  'REALIZAR_VENTAS',
  'VER_VENTAS',
  'GESTIONAR_VENTAS',
  'VER_FRIO',
  'VER_TRAZABILIDAD',
  'VER_INVENTARIO',
  'GESTIONAR_INVENTARIO',
  'VER_TRASLADO_INTERSUCURSALES',
  'VER_PRODUCCION',
  'GESTIONAR_PRODUCCION',
  'VER_CALIDAD',
  'GESTIONAR_CALIDAD',
  'VER_COMPRAS',
  'GESTIONAR_COMPRAS',
  'VER_FINANZAS',
  'GESTIONAR_FINANZAS',
  'VER_AUDITORIA',
  'VER_CHAT',
  'USAR_ASISTENTE',
  'VER_UTILIDADES',
  'GESTIONAR_ROLES',
  'VER_SUCURSALES',
  'GESTIONAR_SUCURSALES',
  'VER_PRODUCTOS',
  'GESTIONAR_PRODUCTOS',
  'VER_LOTES',
  'GESTIONAR_LOTES',
];
import {
  Add,
  Edit,
  Delete,
} from '@mui/icons-material';
import { apiFetch, useAuthStore } from '../store/useAuthStore';

export default function Utilidades() {
  const usuario = useAuthStore((state) => state.usuario);
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(() => {
    const tabParam = new URLSearchParams(window.location.search).get('tab');
    if (tabParam) {
      const tabMap: Record<string, number> = {
        categorias: 0,
        unidades: 1,
        tipos: 2,
        proveedores: 3,
        condiciones: 4,
        sucursales: 5,
        roles: 6,
        manual: 7,
        configuracion: 8,
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
        categorias: 0,
        unidades: 1,
        tipos: 2,
        proveedores: 3,
        condiciones: 4,
        sucursales: 5,
        roles: 6,
        manual: 7,
        configuracion: 8,
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
    const tabNames = ['categorias', 'unidades', 'tipos', 'proveedores', 'condiciones', 'sucursales', 'roles', 'manual', 'configuracion'];
    setSearchParams({ tab: tabNames[val] });
  };

  // States for Sucursales
  const [sucursales, setSucursales] = useState<any[]>([]);
  const [openSucursal, setOpenSucursal] = useState(false);
  const [sucursalForm, setSucursalForm] = useState({
    codigo: '',
    nombre: '',
    direccion: '',
    telefono: '',
    correo: '',
  });
  const [openEditSucursal, setOpenEditSucursal] = useState(false);
  const [selectedSucursal, setSelectedSucursal] = useState<any>(null);
  const [editSucursalForm, setEditSucursalForm] = useState({
    nombre: '',
    direccion: '',
    telefono: '',
    correo: '',
    estado: 'ACTIVO',
  });

  // States for Categorías
  const [categorias, setCategorias] = useState<any[]>([]);
  const [openCrearCategoria, setOpenCrearCategoria] = useState(false);
  const [openEditarCategoria, setOpenEditarCategoria] = useState(false);
  const [selectedCategoria, setSelectedCategoria] = useState<any>(null);
  const [categoriaForm, setCategoriaForm] = useState({ nombre: '', tipoProducto: 'PRODUCTO_TERMINADO' });

  // States for Roles
  const [roles, setRoles] = useState<any[]>([]);
  const [openRol, setOpenRol] = useState(false);
  const [rolForm, setRolForm] = useState({
    nombre: '',
    descripcion: '',
    permisos: [] as string[],
  });
  const [openEditarRol, setOpenEditarRol] = useState(false);
  const [selectedRol, setSelectedRol] = useState<any>(null);

  // States for Unidades de Medida
  const [unidadesMedida, setUnidadesMedida] = useState<any[]>([]);
  const [openCrearUnidad, setOpenCrearUnidad] = useState(false);
  const [openEditarUnidad, setOpenEditarUnidad] = useState(false);
  const [selectedUnidad, setSelectedUnidad] = useState<any>(null);
  const [unidadForm, setUnidadForm] = useState({ nombre: '', abreviacion: '' });

  // States for Tipos de Producto
  const [tiposProducto, setTiposProducto] = useState<any[]>([]);
  const [openCrearTipo, setOpenCrearTipo] = useState(false);
  const [openEditarTipo, setOpenEditarTipo] = useState(false);
  const [selectedTipo, setSelectedTipo] = useState<any>(null);
  const [tipoForm, setTipoForm] = useState({ nombre: '', descripcion: '', metadata: '' });

  // States for Proveedores
  const [proveedores, setProveedores] = useState<any[]>([]);
  const [openCrearProveedor, setOpenCrearProveedor] = useState(false);
  const [openEditarProveedor, setOpenEditarProveedor] = useState(false);
  const [selectedProveedor, setSelectedProveedor] = useState<any>(null);
  const [proveedorForm, setProveedorForm] = useState({
    codigo: '',
    nombre: '',
    contacto: '',
    telefono: '',
    correo: '',
    certificacionesStr: '',
    estado: 'ACTIVO',
    terminoPagoId: '',
    bancoNombre: '',
    bancoTipoCuenta: '',
    bancoNroCuenta: '',
    bancoRutTitular: '',
    bancoNomTitular: '',
  });

  // States for Términos de Pago
  const [terminosPago, setTerminosPago] = useState<any[]>([]);
  const [openCrearTermino, setOpenCrearTermino] = useState(false);
  const [openEditarTermino, setOpenEditarTermino] = useState(false);
  const [selectedTermino, setSelectedTermino] = useState<any>(null);
  const [terminoForm, setTerminoForm] = useState({ nombre: '', dias: '0', estado: 'ACTIVO' });

  // States for IA / System Config
  const [aiConfig, setAiConfig] = useState({ model: 'gpt-4o-mini', apiKey: '', timezone: 'America/El_Salvador' });
  const [maskedKey, setMaskedKey] = useState('');
  const [probarLoading, setProbarLoading] = useState(false);

  // Notifications
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // State for Confirmation Dialog
  const [openConfirm, setOpenConfirm] = useState(false);
  const [confirmData, setConfirmData] = useState<{
    title: string;
    message: string;
    action: () => Promise<void>;
  } | null>(null);

  const triggerConfirm = (title: string, message: string, action: () => Promise<void>) => {
    setConfirmData({ title, message, action });
    setOpenConfirm(true);
  };

  useEffect(() => {
    cargarDatos();
  }, [activeTab]);

  const cargarDatos = async () => {
    try {
      if (activeTab === 0) {
        await cargarCategorias();
        await cargarTiposProducto();
      } else if (activeTab === 1) {
        await cargarUnidadesMedida();
      } else if (activeTab === 2) {
        await cargarTiposProducto();
      } else if (activeTab === 3) {
        await cargarProveedores();
        await cargarTerminosPago();
      } else if (activeTab === 4) {
        await cargarTerminosPago();
      } else if (activeTab === 5) {
        await cargarSucursales();
      } else if (activeTab === 6) {
        await cargarRoles();
      } else if (activeTab === 8) {
        await cargarConfiguracionIA();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const cargarSucursales = async () => {
    try {
      const data = await apiFetch('/sucursales');
      setSucursales(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateSucursal = async () => {
    try {
      setErrorMsg(null);
      if (!sucursalForm.codigo.trim() || !sucursalForm.nombre.trim()) {
        throw new Error('El código y el nombre son requeridos.');
      }
      await apiFetch('/sucursales', {
        method: 'POST',
        body: JSON.stringify(sucursalForm),
      });
      setSuccessMsg('Sucursal creada exitosamente.');
      setOpenSucursal(false);
      await cargarSucursales();
    } catch (e: any) {
      setErrorMsg(e.message);
    }
  };

  const handleAbrirEditarSucursal = (sucursal: any) => {
    setSelectedSucursal(sucursal);
    setEditSucursalForm({
      nombre: sucursal.nombre,
      direccion: sucursal.direccion || '',
      telefono: sucursal.telefono || '',
      correo: sucursal.correo || '',
      estado: sucursal.estado,
    });
    setOpenEditSucursal(true);
  };

  const handleEditSucursalSubmit = async () => {
    try {
      setErrorMsg(null);
      if (!editSucursalForm.nombre.trim()) {
        throw new Error('El nombre de la sucursal es obligatorio.');
      }
      await apiFetch(`/sucursales/${selectedSucursal.id}`, {
        method: 'PUT',
        body: JSON.stringify(editSucursalForm),
      });
      setSuccessMsg('Sucursal actualizada con éxito.');
      setOpenEditSucursal(false);
      setSelectedSucursal(null);
      await cargarSucursales();
    } catch (e: any) {
      setErrorMsg(e.message);
    }
  };

  const handleEliminarSucursal = (id: string) => {
    triggerConfirm(
      'Eliminar Sucursal',
      '¿Está seguro de que desea eliminar esta sucursal? Esta acción no se puede deshacer.',
      async () => {
        await apiFetch(`/sucursales/${id}`, {
          method: 'DELETE',
        });
        setSuccessMsg('Sucursal eliminada con éxito.');
        await cargarSucursales();
      }
    );
  };

  const cargarRoles = async () => {
    try {
      const data = await apiFetch('/roles');
      setRoles(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCrearRolSubmit = async () => {
    try {
      setErrorMsg(null);
      if (!rolForm.nombre.trim() || !rolForm.descripcion.trim()) {
        throw new Error('El nombre y la descripción del rol son obligatorios.');
      }
      await apiFetch('/roles', {
        method: 'POST',
        body: JSON.stringify({
          nombre: rolForm.nombre.toUpperCase().trim(),
          descripcion: rolForm.descripcion.trim(),
          permisos: rolForm.permisos,
        }),
      });
      setSuccessMsg('Rol creado con éxito.');
      setOpenRol(false);
      await cargarRoles();
    } catch (e: any) {
      setErrorMsg(e.message);
    }
  };

  const handleEditarRolSubmit = async () => {
    try {
      setErrorMsg(null);
      if (!rolForm.nombre.trim() || !rolForm.descripcion.trim()) {
        throw new Error('El nombre y la descripción del rol son obligatorios.');
      }
      await apiFetch(`/roles/${selectedRol.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          nombre: rolForm.nombre.toUpperCase().trim(),
          descripcion: rolForm.descripcion.trim(),
          permisos: rolForm.permisos,
        }),
      });
      setSuccessMsg('Rol actualizado con éxito.');
      setOpenEditarRol(false);
      setSelectedRol(null);
      await cargarRoles();
    } catch (e: any) {
      setErrorMsg(e.message);
    }
  };

  const handleEliminarRol = (id: string) => {
    triggerConfirm(
      'Eliminar Rol',
      '¿Está seguro de que desea eliminar este rol? Esta acción no se puede deshacer.',
      async () => {
        await apiFetch(`/roles/${id}`, {
          method: 'DELETE',
        });
        setSuccessMsg('Rol eliminado con éxito.');
        await cargarRoles();
      }
    );
  };

  const cargarTerminosPago = async () => {
    try {
      const data = await apiFetch('/finanzas/terminos-pago');
      setTerminosPago(data);
    } catch (e) {
      console.error(e);
    }
  };

  const cargarProveedores = async () => {
    try {
      const provs = await apiFetch('/proveedores');
      setProveedores(provs);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCrearProveedorSubmit = async () => {
    try {
      setErrorMsg(null);
      if (!proveedorForm.codigo.trim() || !proveedorForm.nombre.trim()) {
        throw new Error('El código y el nombre del proveedor son obligatorios.');
      }
      const certs = proveedorForm.certificacionesStr
        ? proveedorForm.certificacionesStr.split(',').map((c) => c.trim()).filter(Boolean)
        : [];
      await apiFetch('/proveedores', {
        method: 'POST',
        body: JSON.stringify({
          codigo: proveedorForm.codigo,
          nombre: proveedorForm.nombre,
          contacto: proveedorForm.contacto,
          telefono: proveedorForm.telefono,
          correo: proveedorForm.correo,
          certificaciones: certs,
          terminoPagoId: proveedorForm.terminoPagoId || null,
          bancoNombre: proveedorForm.bancoNombre || null,
          bancoTipoCuenta: proveedorForm.bancoTipoCuenta || null,
          bancoNroCuenta: proveedorForm.bancoNroCuenta || null,
          bancoRutTitular: proveedorForm.bancoRutTitular || null,
          bancoNomTitular: proveedorForm.bancoNomTitular || null,
        }),
      });
      setSuccessMsg('Proveedor creado con éxito.');
      setOpenCrearProveedor(false);
      await cargarProveedores();
    } catch (e: any) {
      setErrorMsg(e.message);
    }
  };

  const handleEditarProveedorSubmit = async () => {
    try {
      setErrorMsg(null);
      if (!proveedorForm.nombre.trim()) {
        throw new Error('El nombre del proveedor es obligatorio.');
      }
      const certs = proveedorForm.certificacionesStr
        ? proveedorForm.certificacionesStr.split(',').map((c) => c.trim()).filter(Boolean)
        : [];
      await apiFetch(`/proveedores/${selectedProveedor.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          nombre: proveedorForm.nombre,
          contacto: proveedorForm.contacto,
          telefono: proveedorForm.telefono,
          correo: proveedorForm.correo,
          certificaciones: certs,
          estado: proveedorForm.estado,
          terminoPagoId: proveedorForm.terminoPagoId || null,
          bancoNombre: proveedorForm.bancoNombre || null,
          bancoTipoCuenta: proveedorForm.bancoTipoCuenta || null,
          bancoNroCuenta: proveedorForm.bancoNroCuenta || null,
          bancoRutTitular: proveedorForm.bancoRutTitular || null,
          bancoNomTitular: proveedorForm.bancoNomTitular || null,
        }),
      });
      setSuccessMsg('Proveedor actualizado con éxito.');
      setOpenEditarProveedor(false);
      setSelectedProveedor(null);
      await cargarProveedores();
    } catch (e: any) {
      setErrorMsg(e.message);
    }
  };

  const handleEliminarProveedor = (id: string) => {
    triggerConfirm(
      'Eliminar Proveedor',
      '¿Está seguro de que desea eliminar este proveedor? Esta acción no se puede deshacer.',
      async () => {
        const res = await apiFetch(`/proveedores/${id}`, {
          method: 'DELETE',
        });
        setSuccessMsg(res.message || 'Proveedor eliminado con éxito.');
        await cargarProveedores();
      }
    );
  };

  const handleCrearTerminoSubmit = async () => {
    try {
      setErrorMsg(null);
      if (!terminoForm.nombre.trim() || terminoForm.dias === '') {
        throw new Error('El nombre y los días de crédito son obligatorios.');
      }
      await apiFetch('/finanzas/terminos-pago', {
        method: 'POST',
        body: JSON.stringify({
          nombre: terminoForm.nombre,
          dias: parseInt(terminoForm.dias),
        }),
      });
      setSuccessMsg('Condición de pago creada con éxito.');
      setOpenCrearTermino(false);
      await cargarTerminosPago();
    } catch (e: any) {
      setErrorMsg(e.message);
    }
  };

  const handleEditarTerminoSubmit = async () => {
    try {
      setErrorMsg(null);
      if (!terminoForm.nombre.trim() || terminoForm.dias === '') {
        throw new Error('El nombre y los días de crédito son obligatorios.');
      }
      await apiFetch(`/finanzas/terminos-pago/${selectedTermino.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          nombre: terminoForm.nombre,
          dias: parseInt(terminoForm.dias),
          estado: terminoForm.estado,
        }),
      });
      setSuccessMsg('Condición de pago actualizada con éxito.');
      setOpenEditarTermino(false);
      setSelectedTermino(null);
      await cargarTerminosPago();
    } catch (e: any) {
      setErrorMsg(e.message);
    }
  };

  const handleEliminarTermino = (id: string) => {
    triggerConfirm(
      'Eliminar Condición de Pago',
      '¿Está seguro de que desea eliminar este término de pago? Esta acción no se puede deshacer.',
      async () => {
        const res = await apiFetch(`/finanzas/terminos-pago/${id}`, {
          method: 'DELETE',
        });
        setSuccessMsg(res.message || 'Condición de pago eliminada con éxito.');
        await cargarTerminosPago();
      }
    );
  };

  const cargarConfiguracionIA = async () => {
    try {
      const res = await apiFetch('/ai/config');
      setAiConfig({ model: res.activeModel, apiKey: res.maskedKey || '', timezone: res.timezone || 'America/El_Salvador' });
      setMaskedKey(res.maskedKey || '');
    } catch (e: any) {
      setErrorMsg(e.message);
    }
  };

  const handleGuardarConfiguracionIA = async () => {
    try {
      setErrorMsg(null);
      await apiFetch('/ai/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: aiConfig.model,
          apiKey: aiConfig.apiKey,
          timezone: aiConfig.timezone,
        }),
      });
      setSuccessMsg('Configuración guardada con éxito.');
      await cargarConfiguracionIA();
    } catch (e: any) {
      setErrorMsg(e.message);
    }
  };

  const handleProbarConexionIA = async () => {
    try {
      setErrorMsg(null);
      setSuccessMsg(null);
      setProbarLoading(true);
      const res = await apiFetch('/ai/config/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: aiConfig.apiKey,
        }),
      });
      if (res.success) {
        setSuccessMsg(res.message);
      } else {
        setErrorMsg('No se pudo establecer la conexión.');
      }
    } catch (e: any) {
      setErrorMsg(e.message);
    } finally {
      setProbarLoading(false);
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

  const handleCrearCategoria = async () => {
    try {
      setErrorMsg(null);
      if (!categoriaForm.nombre.trim()) {
        throw new Error('El nombre de la categoría es obligatorio.');
      }
      await apiFetch('/categorias', {
        method: 'POST',
        body: JSON.stringify({ 
          nombre: categoriaForm.nombre,
          tipoProducto: categoriaForm.tipoProducto,
        }),
      });
      setSuccessMsg('Categoría creada con éxito.');
      setOpenCrearCategoria(false);
      await cargarCategorias();
    } catch (e: any) {
      setErrorMsg(e.message);
    }
  };

  const handleEditarCategoria = async () => {
    try {
      setErrorMsg(null);
      if (!categoriaForm.nombre.trim()) {
        throw new Error('El nombre de la categoría es obligatorio.');
      }
      await apiFetch(`/categorias/${selectedCategoria.id}`, {
        method: 'PUT',
        body: JSON.stringify({ 
          nombre: categoriaForm.nombre,
          tipoProducto: categoriaForm.tipoProducto,
        }),
      });
      setSuccessMsg('Categoría actualizada con éxito.');
      setOpenEditarCategoria(false);
      setSelectedCategoria(null);
      await cargarCategorias();
    } catch (e: any) {
      setErrorMsg(e.message);
    }
  };

  const handleEliminarCategoria = (id: string) => {
    triggerConfirm(
      'Eliminar Categoría',
      '¿Está seguro de que desea eliminar esta categoría? Esta acción no se puede deshacer.',
      async () => {
        await apiFetch(`/categorias/${id}`, {
          method: 'DELETE',
        });
        setSuccessMsg('Categoría eliminada con éxito.');
        await cargarCategorias();
      }
    );
  };

  const handleCrearUnidad = async () => {
    try {
      setErrorMsg(null);
      if (!unidadForm.nombre.trim() || !unidadForm.abreviacion.trim()) {
        throw new Error('El nombre y la abreviación son obligatorios.');
      }
      await apiFetch('/productos/unidades-medida', {
        method: 'POST',
        body: JSON.stringify(unidadForm),
      });
      setSuccessMsg('Unidad de medida creada con éxito.');
      setOpenCrearUnidad(false);
      await cargarUnidadesMedida();
    } catch (e: any) {
      setErrorMsg(e.message);
    }
  };

  const handleEditarUnidad = async () => {
    try {
      setErrorMsg(null);
      if (!unidadForm.nombre.trim() || !unidadForm.abreviacion.trim()) {
        throw new Error('El nombre y la abreviación son obligatorios.');
      }
      await apiFetch(`/productos/unidades-medida/${selectedUnidad.id}`, {
        method: 'PUT',
        body: JSON.stringify(unidadForm),
      });
      setSuccessMsg('Unidad de medida actualizada con éxito.');
      setOpenEditarUnidad(false);
      setSelectedUnidad(null);
      await cargarUnidadesMedida();
    } catch (e: any) {
      setErrorMsg(e.message);
    }
  };

  const handleEliminarUnidad = (id: string) => {
    triggerConfirm(
      'Eliminar Unidad de Medida',
      '¿Está seguro de que desea eliminar esta unidad de medida? Esta acción no se puede deshacer.',
      async () => {
        await apiFetch(`/productos/unidades-medida/${id}`, {
          method: 'DELETE',
        });
        setSuccessMsg('Unidad de medida eliminada con éxito.');
        await cargarUnidadesMedida();
      }
    );
  };

  const cargarTiposProducto = async () => {
    try {
      const types = await apiFetch('/productos/tipos');
      setTiposProducto(types);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCrearTipoProducto = async () => {
    try {
      setErrorMsg(null);
      if (!tipoForm.nombre.trim() || !tipoForm.descripcion.trim()) {
        throw new Error('El nombre y la descripción son obligatorios.');
      }
      await apiFetch('/productos/tipos', {
        method: 'POST',
        body: JSON.stringify(tipoForm),
      });
      setSuccessMsg('Tipo de producto creado con éxito.');
      setOpenCrearTipo(false);
      await cargarTiposProducto();
    } catch (e: any) {
      setErrorMsg(e.message);
    }
  };

  const handleEditarTipoProducto = async () => {
    try {
      setErrorMsg(null);
      if (!tipoForm.nombre.trim() || !tipoForm.descripcion.trim()) {
        throw new Error('El nombre y la descripción son obligatorios.');
      }
      await apiFetch(`/productos/tipos/${selectedTipo.id}`, {
        method: 'PUT',
        body: JSON.stringify(tipoForm),
      });
      setSuccessMsg('Tipo de producto actualizado con éxito.');
      setOpenEditarTipo(false);
      setSelectedTipo(null);
      await cargarTiposProducto();
    } catch (e: any) {
      setErrorMsg(e.message);
    }
  };

  const handleEliminarTipoProducto = (id: string) => {
    triggerConfirm(
      'Eliminar Tipo de Producto',
      '¿Está seguro de que desea eliminar este tipo de producto? Esta acción no se puede deshacer.',
      async () => {
        await apiFetch(`/productos/tipos/${id}`, {
          method: 'DELETE',
        });
        setSuccessMsg('Tipo de producto eliminado con éxito.');
        await cargarTiposProducto();
      }
    );
  };

  return (
    <Box sx={{ p: 3, height: '100%', overflowY: 'auto' }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5 }}>
          Utilidades y Soporte
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Configure las categorizaciones, unidades de medida y consulte el manual de procedimientos operativos.
        </Typography>
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

      <Tabs
        value={activeTab}
        onChange={(_, val) => handleTabChange(val)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}
      >
        <Tab label="Categorías" />
        <Tab label="Unidades de Medida" />
        <Tab label="Tipos de Producto" />
        <Tab label="Proveedores" />
        <Tab label="Condiciones de Pago" />
        <Tab label="Gestión de Sucursales" />
        <Tab label="Roles y Permisos" />
        <Tab label="Manual del Sistema" />
        {(usuario?.rol === 'ADMINISTRADOR' || usuario?.rol === 'SUPERVISOR') && (
          <Tab label="Configuración del Sistema" />
        )}
      </Tabs>

      {/* TAB 0: CATEGORÍAS */}
      {activeTab === 0 && (
        <Paper className="glass-panel" sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              Categorías de Productos
            </Typography>
            <Button
              variant="contained"
              color="primary"
              startIcon={<Add />}
              onClick={() => {
                const defaultType = tiposProducto.find((t: any) => t.nombre === 'PT' || t.nombre === 'PRODUCTO_TERMINADO')?.nombre || (tiposProducto[0]?.nombre || 'PT');
                setCategoriaForm({ nombre: '', tipoProducto: defaultType });
                setOpenCrearCategoria(true);
              }}
            >
              Agregar Categoría
            </Button>
          </Box>

          <Box sx={{ overflowX: 'auto', width: '100%' }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Nombre de Categoría</TableCell>
                  <TableCell>Tipo de Producto</TableCell>
                  <TableCell>Fecha Creación</TableCell>
                  <TableCell align="right">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {categorias.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      No hay categorías registradas en el sistema.
                    </TableCell>
                  </TableRow>
                ) : (
                  categorias.map((cat) => {
                    const isSelected = selectedRowId === cat.id;
                    return (
                      <TableRow
                        key={cat.id}
                        hover
                        onClick={() => setSelectedRowId(isSelected ? null : cat.id)}
                        sx={{
                          cursor: 'pointer',
                          bgcolor: isSelected ? 'rgba(59, 130, 246, 0.15)' : 'inherit',
                          '&:hover': {
                            bgcolor: isSelected ? 'rgba(59, 130, 246, 0.25) !important' : undefined,
                          },
                          transition: 'background-color 0.2s ease',
                        }}
                      >
                        <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{cat.id}</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>
                          <Chip label={cat.nombre} color="primary" variant="outlined" size="small" />
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const found = tiposProducto.find((t: any) => t.nombre === cat.tipoProducto);
                            if (found) {
                              const color =
                                cat.tipoProducto === 'PRODUCTO_TERMINADO' || cat.tipoProducto === 'PT'
                                  ? 'primary'
                                  : cat.tipoProducto === 'INSUMO' || cat.tipoProducto === 'INS'
                                  ? 'secondary'
                                  : 'warning';
                              return <Chip label={found.descripcion} color={color} variant="outlined" size="small" />;
                            }
                            if (cat.tipoProducto === 'PRODUCTO_TERMINADO' || cat.tipoProducto === 'PT') {
                              return <Chip label="Prod. Terminado" color="primary" variant="outlined" size="small" />;
                            }
                            if (cat.tipoProducto === 'INSUMO' || cat.tipoProducto === 'INS') {
                              return <Chip label="Insumo" color="secondary" variant="outlined" size="small" />;
                            }
                            if (cat.tipoProducto === 'MATERIA_PRIMA' || cat.tipoProducto === 'MP') {
                              return <Chip label="Materia Prima" color="warning" variant="outlined" size="small" />;
                            }
                            return cat.tipoProducto;
                          })()}
                        </TableCell>
                        <TableCell>{new Date(cat.createdAt).toLocaleDateString('es-CL', { hour: '2-digit', minute: '2-digit' })}</TableCell>
                        <TableCell align="right">
                          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                            <Button
                              variant="outlined"
                              size="small"
                              color="info"
                              startIcon={<Edit />}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedCategoria(cat);
                                setCategoriaForm({ nombre: cat.nombre, tipoProducto: cat.tipoProducto || 'PT' });
                                setOpenEditarCategoria(true);
                              }}
                            >
                              Editar
                            </Button>
                            <Button
                              variant="outlined"
                              size="small"
                              color="error"
                              startIcon={<Delete />}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEliminarCategoria(cat.id);
                              }}
                            >
                              Eliminar
                            </Button>
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

      {/* TAB 1: UNIDADES DE MEDIDA */}
      {activeTab === 1 && (
        <Paper className="glass-panel" sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              Unidades de Medida
            </Typography>
            {(usuario?.rol === 'ADMINISTRADOR' || usuario?.rol === 'SUPERVISOR' || usuario?.rol === 'ALMACEN') && (
              <Button
                variant="contained"
                color="primary"
                startIcon={<Add />}
                onClick={() => {
                  setUnidadForm({ nombre: '', abreviacion: '' });
                  setOpenCrearUnidad(true);
                }}
              >
                Agregar Unidad
              </Button>
            )}
          </Box>

          <Box sx={{ overflowX: 'auto', width: '100%' }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Nombre</TableCell>
                  <TableCell>Abreviación</TableCell>
                  <TableCell>Fecha Creación</TableCell>
                  <TableCell align="right">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {unidadesMedida.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      No hay unidades de medida registradas en el sistema.
                    </TableCell>
                  </TableRow>
                ) : (
                  unidadesMedida.map((uni) => {
                    const isSelected = selectedRowId === uni.id;
                    return (
                      <TableRow
                        key={uni.id}
                        hover
                        onClick={() => setSelectedRowId(isSelected ? null : uni.id)}
                        sx={{
                          cursor: 'pointer',
                          bgcolor: isSelected ? 'rgba(59, 130, 246, 0.15)' : 'inherit',
                          '&:hover': {
                            bgcolor: isSelected ? 'rgba(59, 130, 246, 0.25) !important' : undefined,
                          },
                          transition: 'background-color 0.2s ease',
                        }}
                      >
                        <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{uni.id}</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>
                          <Chip label={uni.nombre} color="secondary" variant="outlined" size="small" />
                        </TableCell>
                        <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600 }}>{uni.abreviacion}</TableCell>
                        <TableCell>{new Date(uni.createdAt).toLocaleDateString('es-CL', { hour: '2-digit', minute: '2-digit' })}</TableCell>
                        <TableCell align="right">
                          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                            {(usuario?.rol === 'ADMINISTRADOR' || usuario?.rol === 'SUPERVISOR' || usuario?.rol === 'ALMACEN') && (
                              <>
                                <Button
                                  variant="outlined"
                                  size="small"
                                  color="info"
                                  startIcon={<Edit />}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedUnidad(uni);
                                    setUnidadForm({ nombre: uni.nombre, abreviacion: uni.abreviacion });
                                    setOpenEditarUnidad(true);
                                  }}
                                >
                                  Editar
                                </Button>
                                <Button
                                  variant="outlined"
                                  size="small"
                                  color="error"
                                  startIcon={<Delete />}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEliminarUnidad(uni.id);
                                  }}
                                >
                                  Eliminar
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
          </Box>
        </Paper>
      )}

      {/* TAB 2: TIPOS DE PRODUCTO */}
      {activeTab === 2 && (
        <Paper className="glass-panel" sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              Tipos de Producto
            </Typography>
            {(usuario?.rol === 'ADMINISTRADOR' || usuario?.rol === 'SUPERVISOR' || usuario?.rol === 'ALMACEN') && (
              <Button
                variant="contained"
                color="primary"
                startIcon={<Add />}
                onClick={() => {
                  setTipoForm({ nombre: '', descripcion: '', metadata: '' });
                  setOpenCrearTipo(true);
                }}
              >
                Agregar Tipo
              </Button>
            )}
          </Box>

          <Box sx={{ overflowX: 'auto', width: '100%' }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Código / Nombre</TableCell>
                  <TableCell>Descripción</TableCell>
                  <TableCell>Detalles / Notas</TableCell>
                  <TableCell>Fecha Creación</TableCell>
                  {(usuario?.rol === 'ADMINISTRADOR' || usuario?.rol === 'SUPERVISOR' || usuario?.rol === 'ALMACEN') && (
                    <TableCell align="right">Acciones</TableCell>
                  )}
                </TableRow>
              </TableHead>
              <TableBody>
                {tiposProducto.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      No hay tipos de producto registrados en el sistema.
                    </TableCell>
                  </TableRow>
                ) : (
                  tiposProducto.map((tipo) => {
                    const isSelected = selectedRowId === tipo.id;
                    return (
                      <TableRow
                        key={tipo.id}
                        hover
                        onClick={() => setSelectedRowId(isSelected ? null : tipo.id)}
                        sx={{
                          cursor: 'pointer',
                          bgcolor: isSelected ? 'rgba(59, 130, 246, 0.15)' : 'inherit',
                          '&:hover': {
                            bgcolor: isSelected ? 'rgba(59, 130, 246, 0.25) !important' : undefined,
                          },
                          transition: 'background-color 0.2s ease',
                        }}
                      >
                        <TableCell sx={{ fontWeight: 700 }}>
                          <Chip label={tipo.nombre} color="info" variant="outlined" size="small" />
                        </TableCell>
                        <TableCell>{tipo.descripcion}</TableCell>
                        <TableCell>{tipo.metadata || '-'}</TableCell>
                        <TableCell>{new Date(tipo.createdAt).toLocaleDateString('es-CL', { hour: '2-digit', minute: '2-digit' })}</TableCell>
                        {(usuario?.rol === 'ADMINISTRADOR' || usuario?.rol === 'SUPERVISOR' || usuario?.rol === 'ALMACEN') && (
                          <TableCell align="right">
                            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                              <Button
                                variant="outlined"
                                size="small"
                                color="info"
                                startIcon={<Edit />}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedTipo(tipo);
                                  setTipoForm({
                                    nombre: tipo.nombre,
                                    descripcion: tipo.descripcion,
                                    metadata: tipo.metadata || '',
                                  });
                                  setOpenEditarTipo(true);
                                }}
                              >
                                Editar
                              </Button>
                              <Button
                                variant="outlined"
                                size="small"
                                color="error"
                                startIcon={<Delete />}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEliminarTipoProducto(tipo.id);
                                }}
                              >
                                Eliminar
                              </Button>
                            </Box>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </Box>
        </Paper>
      )}

      {/* TAB 3: PROVEEDORES */}
      {activeTab === 3 && (
        <Paper className="glass-panel" sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              Gestión de Proveedores
            </Typography>
            {(usuario?.rol === 'ADMINISTRADOR' || usuario?.rol === 'SUPERVISOR' || usuario?.rol === 'ALMACEN') && (
              <Button
                variant="contained"
                color="primary"
                startIcon={<Add />}
                onClick={() => {
                  setProveedorForm({
                    codigo: '',
                    nombre: '',
                    contacto: '',
                    telefono: '',
                    correo: '',
                    certificacionesStr: '',
                    estado: 'ACTIVO',
                    terminoPagoId: '',
                    bancoNombre: '',
                    bancoTipoCuenta: '',
                    bancoNroCuenta: '',
                    bancoRutTitular: '',
                    bancoNomTitular: '',
                  });
                  setOpenCrearProveedor(true);
                }}
              >
                Agregar Proveedor
              </Button>
            )}
          </Box>

          <Box sx={{ overflowX: 'auto', width: '100%' }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Código</TableCell>
                  <TableCell>Nombre</TableCell>
                  <TableCell>Contacto</TableCell>
                  <TableCell>Teléfono</TableCell>
                  <TableCell>Correo</TableCell>
                  <TableCell>Certificaciones</TableCell>
                  <TableCell>Condición de Pago</TableCell>
                  <TableCell>Datos Bancarios</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell align="right">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {proveedores.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} align="center">
                      No hay proveedores registrados en el sistema.
                    </TableCell>
                  </TableRow>
                ) : (
                  proveedores.map((prov) => {
                    let certs: string[] = [];
                    try {
                      certs = JSON.parse(prov.certificaciones || '[]');
                    } catch (e) {
                      certs = [];
                    }
                    const isSelected = selectedRowId === prov.id;
                    return (
                      <TableRow
                        key={prov.id}
                        hover
                        onClick={() => setSelectedRowId(isSelected ? null : prov.id)}
                        sx={{
                          cursor: 'pointer',
                          bgcolor: isSelected ? 'rgba(59, 130, 246, 0.15)' : 'inherit',
                          '&:hover': {
                            bgcolor: isSelected ? 'rgba(59, 130, 246, 0.25) !important' : undefined,
                          },
                          transition: 'background-color 0.2s ease',
                        }}
                      >
                        <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700 }}>
                          {prov.codigo}
                        </TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>{prov.nombre}</TableCell>
                        <TableCell>{prov.contacto || '-'}</TableCell>
                        <TableCell>{prov.telefono || '-'}</TableCell>
                        <TableCell>{prov.correo || '-'}</TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                            {certs.length === 0 ? (
                              <Typography variant="caption" color="text.secondary">Ninguna</Typography>
                            ) : (
                              certs.map((c: string, idx: number) => (
                                <Chip key={idx} label={c} size="small" variant="outlined" color="primary" />
                              ))
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>
                          {prov.terminoPago ? (
                            <Chip label={prov.terminoPago.nombre} color="info" size="small" variant="outlined" />
                          ) : (
                            <Chip label="Contado" color="default" size="small" variant="outlined" />
                          )}
                        </TableCell>
                        <TableCell>
                          {prov.bancoNombre ? (
                            <Box>
                              <Typography variant="body2" sx={{ fontSize: '0.8rem', fontWeight: 600 }}>
                                {prov.bancoNombre} ({prov.bancoTipoCuenta})
                              </Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                N° {prov.bancoNroCuenta}
                              </Typography>
                            </Box>
                          ) : (
                            <Typography variant="caption" color="text.secondary">No especificado</Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={prov.estado}
                            color={prov.estado === 'ACTIVO' ? 'success' : 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                            {(usuario?.rol === 'ADMINISTRADOR' || usuario?.rol === 'SUPERVISOR' || usuario?.rol === 'ALMACEN') && (
                              <>
                                <Button
                                  variant="outlined"
                                  size="small"
                                  color="info"
                                  startIcon={<Edit />}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedProveedor(prov);
                                    let certsStr = '';
                                    try {
                                      const parsed = JSON.parse(prov.certificaciones || '[]');
                                      certsStr = parsed.join(', ');
                                    } catch (e) {
                                      certsStr = '';
                                    }
                                    setProveedorForm({
                                      codigo: prov.codigo,
                                      nombre: prov.nombre,
                                      contacto: prov.contacto || '',
                                      telefono: prov.telefono || '',
                                      correo: prov.correo || '',
                                      certificacionesStr: certsStr,
                                      estado: prov.estado,
                                      terminoPagoId: prov.terminoPagoId || '',
                                      bancoNombre: prov.bancoNombre || '',
                                      bancoTipoCuenta: prov.bancoTipoCuenta || '',
                                      bancoNroCuenta: prov.bancoNroCuenta || '',
                                      bancoRutTitular: prov.bancoRutTitular || '',
                                      bancoNomTitular: prov.bancoNomTitular || '',
                                    });
                                    setOpenEditarProveedor(true);
                                  }}
                                >
                                  Editar
                                </Button>
                                <Button
                                  variant="outlined"
                                  size="small"
                                  color="error"
                                  startIcon={<Delete />}
                                  onClick={(e) => { e.stopPropagation(); handleEliminarProveedor(prov.id); }}
                                >
                                  Eliminar
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
          </Box>
        </Paper>
      )}

      {/* TAB 4: CONDICIONES DE PAGO */}
      {activeTab === 4 && (
        <Paper className="glass-panel" sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              Condiciones de Pago (Términos de Pago)
            </Typography>
            <Button
              variant="contained"
              color="primary"
              startIcon={<Add />}
              onClick={() => {
                setTerminoForm({ nombre: '', dias: '0', estado: 'ACTIVO' });
                setOpenCrearTermino(true);
              }}
            >
              Agregar Condición
            </Button>
          </Box>

          <Box sx={{ overflowX: 'auto', width: '100%' }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Nombre</TableCell>
                  <TableCell>Días de Crédito</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell align="right">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {terminosPago.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} align="center">
                      No hay condiciones de pago registradas en el sistema.
                    </TableCell>
                  </TableRow>
                ) : (
                  terminosPago.map((tp) => {
                    const isSelected = selectedRowId === tp.id;
                    return (
                    <TableRow
                      key={tp.id}
                      hover
                      onClick={() => setSelectedRowId(isSelected ? null : tp.id)}
                      sx={{
                        cursor: 'pointer',
                        bgcolor: isSelected ? 'rgba(59, 130, 246, 0.15)' : 'inherit',
                        '&:hover': {
                          bgcolor: isSelected ? 'rgba(59, 130, 246, 0.25) !important' : undefined,
                        },
                        transition: 'background-color 0.2s ease',
                      }}
                    >
                      <TableCell sx={{ fontWeight: 700 }}>{tp.nombre}</TableCell>
                      <TableCell>{tp.dias} días</TableCell>
                      <TableCell>
                        <Chip
                          label={tp.estado}
                          color={tp.estado === 'ACTIVO' ? 'success' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                          <Button
                            variant="outlined"
                            size="small"
                            color="info"
                            startIcon={<Edit />}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTermino(tp);
                              setTerminoForm({
                                nombre: tp.nombre,
                                dias: String(tp.dias),
                                estado: tp.estado,
                              });
                              setOpenEditarTermino(true);
                            }}
                          >
                            Editar
                          </Button>
                          <Button
                            variant="outlined"
                            size="small"
                            color="error"
                            startIcon={<Delete />}
                            onClick={(e) => { e.stopPropagation(); handleEliminarTermino(tp.id); }}
                          >
                            Eliminar
                          </Button>
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

      {/* TAB 5: GESTIÓN DE SUCURSALES */}
      {activeTab === 5 && (
        <Paper className="glass-panel" sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              Gestión de Sucursales
            </Typography>
            {usuario?.rol === 'ADMINISTRADOR' && (
              <Button
                variant="contained"
                color="primary"
                startIcon={<Add />}
                onClick={() => {
                  setSucursalForm({
                    codigo: '',
                    nombre: '',
                    direccion: '',
                    telefono: '',
                    correo: '',
                  });
                  setOpenSucursal(true);
                }}
              >
                Registrar Sucursal
              </Button>
            )}
          </Box>

          <Box sx={{ overflowX: 'auto', width: '100%' }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Código</TableCell>
                  <TableCell>Nombre</TableCell>
                  <TableCell>Dirección</TableCell>
                  <TableCell>Teléfono</TableCell>
                  <TableCell>Correo</TableCell>
                  <TableCell>Estado</TableCell>
                  {usuario?.rol === 'ADMINISTRADOR' && <TableCell align="right">Acciones</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {sucursales.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={usuario?.rol === 'ADMINISTRADOR' ? 7 : 6} align="center">
                      No hay sucursales registradas.
                    </TableCell>
                  </TableRow>
                ) : (
                  sucursales.map((suc) => {
                    const isSelected = selectedRowId === suc.id;
                    return (
                    <TableRow
                      key={suc.id}
                      hover
                      onClick={() => setSelectedRowId(isSelected ? null : suc.id)}
                      sx={{
                        cursor: 'pointer',
                        bgcolor: isSelected ? 'rgba(59, 130, 246, 0.15)' : 'inherit',
                        '&:hover': {
                          bgcolor: isSelected ? 'rgba(59, 130, 246, 0.25) !important' : undefined,
                        },
                        transition: 'background-color 0.2s ease',
                      }}
                    >
                      <TableCell sx={{ fontFamily: 'monospace' }}>{suc.codigo}</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>{suc.nombre}</TableCell>
                      <TableCell>{suc.direccion || '—'}</TableCell>
                      <TableCell>{suc.telefono || '—'}</TableCell>
                      <TableCell>{suc.correo || '—'}</TableCell>
                      <TableCell>
                        <Chip
                          label={suc.estado}
                          color={suc.estado === 'ACTIVO' ? 'success' : 'error'}
                          size="small"
                          sx={{ fontWeight: 700 }}
                        />
                      </TableCell>
                      {usuario?.rol === 'ADMINISTRADOR' && (
                        <TableCell align="right">
                          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                            <Button
                              variant="outlined"
                              size="small"
                              color="info"
                              startIcon={<Edit />}
                              onClick={(e) => { e.stopPropagation(); handleAbrirEditarSucursal(suc); }}
                            >
                              Editar
                            </Button>
                            <Button
                              variant="outlined"
                              size="small"
                              color="error"
                              startIcon={<Delete />}
                              onClick={(e) => { e.stopPropagation(); handleEliminarSucursal(suc.id); }}
                            >
                              Eliminar
                            </Button>
                          </Box>
                        </TableCell>
                      )}
                    </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </Box>
        </Paper>
      )}

      {/* TAB 6: ROLES Y PERMISOS */}
      {activeTab === 6 && (
        <Paper className="glass-panel" sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              Roles y Permisos del Sistema
            </Typography>
            {usuario?.rol === 'ADMINISTRADOR' && (
              <Button
                variant="contained"
                color="primary"
                startIcon={<Add />}
                onClick={() => {
                  setRolForm({
                    nombre: '',
                    descripcion: '',
                    permisos: [],
                  });
                  setOpenRol(true);
                }}
              >
                Crear Rol
              </Button>
            )}
          </Box>

          <Box sx={{ overflowX: 'auto', width: '100%' }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Rol</TableCell>
                  <TableCell>Descripción</TableCell>
                  <TableCell>Permisos Asignados</TableCell>
                  {usuario?.rol === 'ADMINISTRADOR' && <TableCell align="right">Acciones</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {roles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={usuario?.rol === 'ADMINISTRADOR' ? 4 : 3} align="center">
                      No hay roles registrados.
                    </TableCell>
                  </TableRow>
                ) : (
                  roles.map((r) => {
                    let permsList: string[] = [];
                    try {
                      permsList = JSON.parse(r.permisos || '[]');
                    } catch (e) {
                      permsList = [];
                    }
                    const isSelected = selectedRowId === r.id;
                    return (
                      <TableRow
                        key={r.id}
                        hover
                        onClick={() => setSelectedRowId(isSelected ? null : r.id)}
                        sx={{
                          cursor: 'pointer',
                          bgcolor: isSelected ? 'rgba(59, 130, 246, 0.15)' : 'inherit',
                          '&:hover': {
                            bgcolor: isSelected ? 'rgba(59, 130, 246, 0.25) !important' : undefined,
                          },
                          transition: 'background-color 0.2s ease',
                        }}
                      >
                        <TableCell sx={{ fontWeight: 700 }}>
                          <Chip label={r.nombre} color="secondary" variant="outlined" size="small" sx={{ fontWeight: 800 }} />
                        </TableCell>
                        <TableCell>{r.descripcion}</TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', maxWidth: '500px' }}>
                            {permsList.length === 0 ? (
                              <Typography variant="caption" color="text.secondary">Ninguno</Typography>
                            ) : (
                              permsList.map((p: string) => (
                                <Chip key={p} label={p} size="small" sx={{ fontSize: '0.7rem' }} />
                              ))
                            )}
                          </Box>
                        </TableCell>
                        {usuario?.rol === 'ADMINISTRADOR' && (
                          <TableCell align="right">
                            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                              <Button
                                variant="outlined"
                                size="small"
                                color="info"
                                startIcon={<Edit />}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedRol(r);
                                  setRolForm({
                                    nombre: r.nombre,
                                    descripcion: r.descripcion,
                                    permisos: permsList,
                                  });
                                  setOpenEditarRol(true);
                                }}
                              >
                                Editar
                              </Button>
                              <Button
                                variant="outlined"
                                size="small"
                                color="error"
                                startIcon={<Delete />}
                                onClick={(e) => { e.stopPropagation(); handleEliminarRol(r.id); }}
                                disabled={['ADMINISTRADOR', 'SUPERVISOR', 'GERENTE_TIENDA', 'CAJERO', 'ALMACEN', 'CONTROL_CALIDAD'].includes(r.nombre)}
                              >
                                Eliminar
                              </Button>
                            </Box>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </Box>
        </Paper>
      )}

      {/* TAB 7: MANUAL Y GUÍA DEL SISTEMA */}
      {activeTab === 7 && (
        <Paper className="glass-panel" sx={{ p: 4 }}>
          <Box sx={{ mb: 4 }}>
            <Typography variant="h5" sx={{ fontWeight: 800, color: 'primary.main', mb: 1 }}>
              Guía y Manual de Operaciones - Lácteos ERP
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Esta sección detalla el funcionamiento de cada módulo del sistema, incluyendo trazabilidad de lotes, cadena de frío, ciclos de compra y finanzas operativas.
            </Typography>
          </Box>

          <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>
            1. Resumen de Módulos del Sistema
          </Typography>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' }, gap: 3, mb: 5 }}>
            <Paper sx={{ p: 2.5, height: '100%', border: '1px solid rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'secondary.main', mb: 1 }}>
                📊 Stock por Sucursal
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Muestra la existencia física consolidada de cada producto agrupada por sucursal. Permite a los supervisores modificar el <strong>Stock Mínimo de Seguridad</strong> para disparar alertas de stock crítico.
              </Typography>
            </Paper>

            <Paper sx={{ p: 2.5, height: '100%', border: '1px solid rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'secondary.main', mb: 1 }}>
                🔄 Movimientos (Kardex)
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Auditoría detallada de entradas, salidas, ajustes de stock y mermas. Cada movimiento registra de forma obligatoria el lote asociado, garantizando la trazabilidad histórica de los productos lácteos.
              </Typography>
            </Paper>

            <Paper sx={{ p: 2.5, height: '100%', border: '1px solid rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'secondary.main', mb: 1 }}>
                🚚 Traslados Inter-Sucursales
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Permite mover stock y lotes específicos entre distintas sucursales. Un traslado pasa por los estados <i>EN TRÁNSITO</i> y requiere de la recepción y confirmación física por la sucursal de destino.
              </Typography>
            </Paper>

            <Paper sx={{ p: 2.5, height: '100%', border: '1px solid rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'secondary.main', mb: 1 }}>
                📦 Catálogo de Productos
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Ficha maestra del catálogo. Permite configurar costo, precio de venta, IVA, rangos de temperatura para Cadena de Frío, y generar automáticamente códigos de barra EAN-13 utilizando el botón integrado <strong>"Generar"</strong>.
              </Typography>
            </Paper>

            <Paper sx={{ p: 2.5, height: '100%', border: '1px solid rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'secondary.main', mb: 1 }}>
                🏷️ Gestión de Lotes
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Controla la fecha de elaboración, vencimiento, cantidad inicial y estado de calidad (Aprobado, Cuarentena, Rechazado). Aquí se obtienen e imprimen las etiquetas de códigos de barra combinados para el POS.
              </Typography>
            </Paper>

            <Paper sx={{ p: 2.5, height: '100%', border: '1px solid rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'secondary.main', mb: 1 }}>
                📁 Categorías
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Definición y clasificación de familias de productos del catálogo de Lácteos ERP (Leche, Yogurt, Quesos, Mantequilla, Helados, etc.).
              </Typography>
            </Paper>

            <Paper sx={{ p: 2.5, height: '100%', border: '1px solid rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'secondary.main', mb: 1 }}>
                💳 Cuentas por Pagar
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Módulo financiero de control de deudas. Permite ingresar facturas de proveedores, calcular vencimientos de crédito y emitir pagos por transferencia, depósito, cheque o efectivo.
              </Typography>
            </Paper>

            <Paper sx={{ p: 2.5, height: '100%', border: '1px solid rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'secondary.main', mb: 1 }}>
                📈 Historial de Ventas
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Reportes y auditoría del Punto de Venta (POS). Permite conciliar transacciones mediante filtros de fecha y desglose de tickets por productos y lotes específicos.
              </Typography>
            </Paper>

            <Paper sx={{ p: 2.5, height: '100%', border: '1px solid rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'secondary.main', mb: 1 }}>
                🏗️ Producción Láctea
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Permite la creación de recetas, cálculo de costos de insumos, y la planificación e inicio de órdenes de producción hasta el registro final de mermas y rendimientos.
              </Typography>
            </Paper>

            <Paper sx={{ p: 2.5, height: '100%', border: '1px solid rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'secondary.main', mb: 1 }}>
                🔬 Control de Calidad
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Audita insumos y lotes finales con parámetros físico-químicos (antibióticos, pH, grasa, etc.), captura de firma de aprobación/rechazo y control de no conformidades.
              </Typography>
            </Paper>
          </Box>

          <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>
            2. Trazabilidad y Códigos de Barras Combinados (Producto + Lote)
          </Typography>

          <Paper sx={{ p: 3, border: '1px dashed rgba(255,255,255,0.15)', backgroundColor: 'rgba(0,0,0,0.1)', mb: 4 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1, color: 'warning.main' }}>
              💡 ¿Cómo funciona el código combinado en el Punto de Venta?
            </Typography>
            <Typography variant="body2" sx={{ mb: 2, lineHeight: 1.6 }}>
              Para evitar el ingreso manual del lote al momento de facturar, el sistema permite codificar ambos datos en una sola etiqueta escaneable con la estructura: <code style={{ backgroundColor: '#000', padding: '2px 6px', borderRadius: '4px', color: '#ffea00', fontWeight: 'bold' }}>codigo_producto#numero_lote</code>.
            </Typography>

            <Box sx={{ pl: 2, borderLeft: '3px solid #ffea00', mb: 3 }}>
              <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>
                Escaneo Regular (Sin Lote):
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                Si se escanea el código comercial del producto (ej: <code style={{ backgroundColor: '#000', padding: '1px 4px', borderRadius: '3px' }}>7801234567890</code>), el sistema POS aplicará la regla <strong>FIFO (First In First Out)</strong> y seleccionará automáticamente el lote aprobado más antiguo próximo a vencer.
              </Typography>

              <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>
                Escaneo Combinado (Con Lote):
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Al escanear la etiqueta combinada impresa desde el sistema (ej: <code style={{ backgroundColor: '#000', padding: '1px 4px', borderRadius: '3px' }}>7801234567890#L-LECHE-OK</code>), el POS omitirá la lógica FIFO y agregará el producto vinculando <strong>específicamente ese lote exacto</strong>.
              </Typography>
            </Box>

            <Typography variant="body2" color="text.secondary">
              * Nota: Si el lote escaneado se encuentra en Cuarentena, Rechazado, Vencido o no cuenta con stock físico en la sucursal activa, el Punto de Venta detendrá el proceso de venta arrojando un mensaje de alerta informativo.
            </Typography>
          </Paper>

          <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>
            3. Gestión y Registro de Mermas y Pérdidas
          </Typography>

          <Paper sx={{ p: 3, border: '1px dashed rgba(255,255,255,0.15)', backgroundColor: 'rgba(0,0,0,0.1)', mb: 4 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1, color: 'error.main' }}>
              ⚠️ Registro Correcto de Pérdidas de Mercancía
            </Typography>
            <Typography variant="body2" sx={{ mb: 2, lineHeight: 1.6 }}>
              Para asegurar la exactitud de los inventarios, cualquier desecho de mercancía debe registrarse en la pestaña de <strong>Mermas y Pérdidas</strong>. Esto abarca: vencimientos, daños físicos, hurtos o fallos en la cadena de frío.
            </Typography>

            <Box sx={{ pl: 2, borderLeft: '3px solid #f43f5e', mb: 3 }}>
              <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>
                Categorías de Merma:
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                • <strong>Vencimiento:</strong> Productos caducados no aptos para el consumo.
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                • <strong>Rotura / Daño Físico:</strong> Empaques rotos o abollados durante manipulación o traslado.
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                • <strong>Hurto / Robo:</strong> Faltantes detectados en auditorías físicas o robos en sala de venta.
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • <strong>Fallo de Frío:</strong> Pérdida total por desviaciones térmicas fuera de los límites de refrigeración.
              </Typography>
            </Box>

            <Typography variant="body2" color="text.secondary">
              * Nota: Al guardar la merma, el sistema descuenta de forma automática la cantidad especificada de las existencias globales de la tienda y del lote exacto seleccionado (si aplica). El registro queda asentado con fines contables y de auditoría de personal.
            </Typography>
          </Paper>

          <Typography variant="h6" sx={{ fontWeight: 800, mb: 2, mt: 4 }}>
            4. Ciclo de Compras y Cuentas por Pagar (P2P)
          </Typography>

          <Paper sx={{ p: 3, border: '1px dashed rgba(255,255,255,0.15)', backgroundColor: 'rgba(0,0,0,0.1)', mb: 4 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1, color: 'primary.light' }}>
              💳 Gestión de Compras y Pasivos con Proveedores
            </Typography>
            <Typography variant="body2" sx={{ mb: 2, lineHeight: 1.6 }}>
              El ciclo financiero asegura que toda compra recibida tenga una contraparte de cobro y pago controlada administrativamente.
            </Typography>
            <Box sx={{ pl: 2, borderLeft: '3px solid #0284c7' }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                • <strong>Condición de Crédito:</strong> Configure el plazo (Contado, 30 días, etc.) y asócielo al proveedor para calcular vencimientos automáticos.
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                • <strong>Registro de Factura de Compra:</strong> Asocie la factura a la Orden de Compra para auditar las cantidades recibidas físicamente versus las facturadas.
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • <strong>Conciliación de Pagos:</strong> Ingrese el método de egreso. El sistema mostrará la cuenta bancaria del proveedor cargada en su ficha de Utilidades para guiar la transferencia.
              </Typography>
            </Box>
          </Paper>

          <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>
            5. Control e Historial de Ventas
          </Typography>

          <Paper sx={{ p: 3, border: '1px dashed rgba(255,255,255,0.15)', backgroundColor: 'rgba(0,0,0,0.1)', mb: 4 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1, color: 'success.light' }}>
              📈 Monitoreo Operativo y Auditoría de Caja
            </Typography>
            <Typography variant="body2" sx={{ mb: 2, lineHeight: 1.6 }}>
              El módulo de Ventas consolida las transacciones procesadas por caja para auditoría de facturación.
            </Typography>
            <Box sx={{ pl: 2, borderLeft: '3px solid #10b981' }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                • <strong>Consultas Temporales:</strong> Indique rango de fechas inicio/fin para revisar cierres de caja y ventas periódicas.
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                • <strong>Filtros por Sucursal:</strong> Los Administradores y Supervisores pueden seleccionar locales específicos para revisar sus ingresos aislados.
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • <strong>Trazabilidad de Ticket:</strong> Abra el detalle de la venta para revisar productos, costos de IVA, cajero que facturó y el número de lote despachado.
              </Typography>
            </Box>
          </Paper>

          <Typography variant="h6" sx={{ fontWeight: 800, mb: 2, mt: 4 }}>
            6. Módulo de Producción Láctea
          </Typography>

          <Paper sx={{ p: 3, border: '1px dashed rgba(255,255,255,0.15)', backgroundColor: 'rgba(0,0,0,0.1)', mb: 4 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1, color: 'primary.light' }}>
              🏗️ Ciclo de Manufactura y Recetas
            </Typography>
            <Typography variant="body2" sx={{ mb: 2, lineHeight: 1.6 }}>
              Permite formular productos terminados y programar su elaboración en base a ingredientes en stock.
            </Typography>
            <Box sx={{ pl: 2, borderLeft: '3px solid #0284c7' }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                • <strong>Recetario Maestro:</strong> Creación de fórmulas estándar de productos terminados indicando materias primas, mermas de insumos y costos estimados en USD ($).
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                • <strong>Órdenes de Producción:</strong> Planificación de lotes, consumo real de materias primas al iniciar preparación y registro final del rendimiento del lote obtenido.
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • <strong>Control de Mermas de Proceso:</strong> Declaración exacta de desechos surgidos durante la producción (evaporación de suero, etc.).
              </Typography>
            </Box>
          </Paper>

          <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>
            7. Control de Calidad y Cumplimiento
          </Typography>

          <Paper sx={{ p: 3, border: '1px dashed rgba(255,255,255,0.15)', backgroundColor: 'rgba(0,0,0,0.1)' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1, color: 'success.light' }}>
              🔬 Aseguramiento Sanitario y Liberación
            </Typography>
            <Typography variant="body2" sx={{ mb: 2, lineHeight: 1.6 }}>
              Garantiza que la mercadería producida o recibida cumpla con los estándares obligatorios de calidad.
            </Typography>
            <Box sx={{ pl: 2, borderLeft: '3px solid #10b981' }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                • <strong>Recepción de Leche:</strong> Control de acidez (pH), temperatura, porcentaje de grasa/proteína y presencia crítica de antibióticos con captura de firma digital del inspector.
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                • <strong>Auditorías en Proceso:</strong> Inspección y liberación formal de lotes terminados en inventario antes de estar disponibles para el POS.
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • <strong>No Conformidades (NC):</strong> Registro de desviaciones críticas con evidencia fotográfica digital y definición de acciones correctivas previas al cierre.
              </Typography>
            </Box>
          </Paper>
        </Paper>
      )}

      {/* TAB 8: CONFIGURACIÓN DEL SISTEMA */}
      {activeTab === 8 && (usuario?.rol === 'ADMINISTRADOR' || usuario?.rol === 'SUPERVISOR') && (
        <Paper className="glass-panel" sx={{ p: 4 }}>
          <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ 
              p: 1, 
              borderRadius: '12px', 
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(168, 85, 247, 0.2) 100%)',
              border: '1px solid rgba(168, 85, 247, 0.3)'
            }}>
              <span style={{ fontSize: '1.8rem' }}>⚙️</span>
            </Box>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800, mb: 0.5 }}>
                Configuración General del Sistema
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Configure los parámetros globales de la aplicación, como la zona horaria del negocio y las claves del asistente inteligente.
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '3fr 2fr' }, gap: 4 }}>
            {/* Formulario */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                  Zona Horaria / País del Negocio
                </Typography>
                <select
                  value={aiConfig.timezone}
                  onChange={(e) => setAiConfig({ ...aiConfig, timezone: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    color: '#fff',
                    outline: 'none',
                    fontSize: '1rem',
                    cursor: 'pointer'
                  }}
                >
                  <option value="America/El_Salvador">El Salvador (CST, UTC-6) [Por Defecto]</option>
                  <option value="America/Santiago">Chile (CLT/CLST, UTC-4/UTC-3)</option>
                  <option value="America/Bogota">Colombia (EST, UTC-5)</option>
                  <option value="America/Mexico_City">México (CST, UTC-6)</option>
                  <option value="America/Guatemala">Guatemala (CST, UTC-6)</option>
                  <option value="America/Tegucigalpa">Honduras (CST, UTC-6)</option>
                  <option value="America/Managua">Nicaragua (CST, UTC-6)</option>
                  <option value="America/San_Jose">Costa Rica (CST, UTC-6)</option>
                  <option value="America/Panama">Panamá (EST, UTC-5)</option>
                  <option value="America/Lima">Perú (PET, UTC-5)</option>
                  <option value="America/Caracas">Venezuela (VET, UTC-4)</option>
                  <option value="America/La_Paz">Bolivia (BOT, UTC-4)</option>
                  <option value="America/Asuncion">Paraguay (PYT, UTC-4/UTC-3)</option>
                  <option value="America/Montevideo">Uruguay (UYT, UTC-3)</option>
                  <option value="America/Buenos_Aires">Argentina (ART, UTC-3)</option>
                  <option value="UTC">Coordinated Universal Time (UTC)</option>
                </select>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                  Define la zona horaria utilizada para agrupar las ventas del día en los paneles y reportes.
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                  Modelo de Inteligencia Artificial Activo
                </Typography>
                <select
                  value={aiConfig.model}
                  onChange={(e) => setAiConfig({ ...aiConfig, model: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    color: '#fff',
                    outline: 'none',
                    fontSize: '1rem',
                    cursor: 'pointer'
                  }}
                >
                  <option value="gpt-4o-mini">gpt-4o-mini (Recomendado - Rápido, económico y preciso)</option>
                  <option value="gpt-4o">gpt-4o (Avanzado - Mayor capacidad analítica y razonamiento)</option>
                  <option value="o1-mini">o1-mini (Razonamiento Lógico - Excelente para cálculos complejos)</option>
                </select>
              </Box>

              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                  OpenAI API Key
                </Typography>
                <TextField
                  fullWidth
                  type="password"
                  placeholder={maskedKey ? maskedKey : "sk-proj-... (Ingresada por el sistema)"}
                  value={aiConfig.apiKey}
                  onChange={(e) => setAiConfig({ ...aiConfig, apiKey: e.target.value })}
                  size="medium"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: 'rgba(255,255,255,0.03)',
                      borderRadius: '8px',
                    }
                  }}
                />
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                  La API key se almacena segura en base de datos. Dejar en blanco si desea usar la llave por defecto de la aplicación.
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleGuardarConfiguracionIA}
                  sx={{ borderRadius: 2, px: 3, py: 1, fontWeight: 700 }}
                >
                  Guardar Configuración
                </Button>
                <Button
                  variant="outlined"
                  color="secondary"
                  disabled={probarLoading}
                  onClick={handleProbarConexionIA}
                  sx={{ borderRadius: 2, px: 3, py: 1, fontWeight: 700 }}
                >
                  {probarLoading ? 'Verificando...' : 'Probar Conexión'}
                </Button>
              </Box>
            </Box>

            {/* Información e Indicaciones */}
            <Box>
              <Paper sx={{ 
                p: 3, 
                height: '100%', 
                backgroundColor: 'rgba(255,255,255,0.02)', 
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '12px'
              }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1.5, color: 'primary.main' }}>
                  💡 ¿Cómo funciona el Asistente?
                </Typography>
                <Typography variant="body2" sx={{ mb: 2, lineHeight: 1.6 }} color="text.secondary">
                  El Asistente de IA de <strong>Lácteos ERP</strong> utiliza tecnología de <strong>OpenAI</strong> y técnicas de <i>Tool Calling</i> para conectarse dinámicamente con nuestra base de datos.
                </Typography>
                <Typography variant="body2" sx={{ mb: 2, lineHeight: 1.6 }} color="text.secondary">
                  Cuando le preguntas algo como <i>"¿Cuáles son los productos con stock crítico hoy?"</i>, el modelo decide llamar a la base de datos de manera controlada y resume el resultado en tablas de alta legibilidad.
                </Typography>
                <Typography variant="body2" sx={{ lineHeight: 1.6 }} color="text.secondary">
                  <strong>Seguridad de Datos:</strong> Los usuarios sin roles directivos (por ejemplo, Gerentes de Tienda) tienen restricción automática. Aunque pregunten por otra sucursal, el servidor de la API forzará que solo consulten su propio local.
                </Typography>
              </Paper>
            </Box>
          </Box>
        </Paper>
      )}

      {/* DIALOG: CREAR CATEGORIA */}
      <Dialog open={openCrearCategoria} onClose={() => setOpenCrearCategoria(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 800 }}>Agregar Nueva Categoría</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <TextField
            fullWidth
            label="Nombre de Categoría"
            placeholder="BEBIDAS LÁCTEAS"
            size="small"
            value={categoriaForm.nombre}
            onChange={(e) => setCategoriaForm({ ...categoriaForm, nombre: e.target.value })}
          />
          <FormControl fullWidth size="small">
            <InputLabel>Tipo de Producto</InputLabel>
            <Select
              value={categoriaForm.tipoProducto}
              label="Tipo de Producto"
              onChange={(e) => setCategoriaForm({ ...categoriaForm, tipoProducto: e.target.value })}
            >
              {tiposProducto.length === 0 ? (
                [
                  { nombre: 'PT', descripcion: 'Producto Terminado' },
                  { nombre: 'INS', descripcion: 'Insumo' },
                  { nombre: 'MP', descripcion: 'Materia Prima' },
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
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenCrearCategoria(false)}>Cancelar</Button>
          <Button variant="contained" color="success" onClick={handleCrearCategoria}>Guardar</Button>
        </DialogActions>
      </Dialog>

      {/* DIALOG: EDITAR CATEGORIA */}
      <Dialog open={openEditarCategoria} onClose={() => setOpenEditarCategoria(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 800 }}>Editar Categoría</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <TextField
            fullWidth
            label="Nombre de Categoría"
            size="small"
            value={categoriaForm.nombre}
            onChange={(e) => setCategoriaForm({ ...categoriaForm, nombre: e.target.value })}
          />
          <FormControl fullWidth size="small">
            <InputLabel>Tipo de Producto</InputLabel>
            <Select
              value={categoriaForm.tipoProducto}
              label="Tipo de Producto"
              onChange={(e) => setCategoriaForm({ ...categoriaForm, tipoProducto: e.target.value })}
            >
              {tiposProducto.length === 0 ? (
                [
                  { nombre: 'PT', descripcion: 'Producto Terminado' },
                  { nombre: 'INS', descripcion: 'Insumo' },
                  { nombre: 'MP', descripcion: 'Materia Prima' },
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
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenEditarCategoria(false)}>Cancelar</Button>
          <Button variant="contained" color="primary" onClick={handleEditarCategoria}>Guardar</Button>
        </DialogActions>
      </Dialog>

      {/* DIALOG: CREAR TIPO PRODUCTO */}
      <Dialog open={openCrearTipo} onClose={() => setOpenCrearTipo(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 800 }}>Agregar Nuevo Tipo de Producto</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <TextField
            fullWidth
            label="Código / Nombre"
            placeholder="PRODUCTO_TERMINADO"
            size="small"
            value={tipoForm.nombre}
            onChange={(e) => setTipoForm({ ...tipoForm, nombre: e.target.value })}
          />
          <TextField
            fullWidth
            label="Descripción"
            placeholder="Producto Terminado"
            size="small"
            value={tipoForm.descripcion}
            onChange={(e) => setTipoForm({ ...tipoForm, descripcion: e.target.value })}
          />
          <TextField
            fullWidth
            label="Detalles / Notas"
            placeholder="Productos listos para la venta en el POS..."
            size="small"
            multiline
            rows={2}
            value={tipoForm.metadata}
            onChange={(e) => setTipoForm({ ...tipoForm, metadata: e.target.value })}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenCrearTipo(false)}>Cancelar</Button>
          <Button variant="contained" color="success" onClick={handleCrearTipoProducto}>Guardar</Button>
        </DialogActions>
      </Dialog>

      {/* DIALOG: EDITAR TIPO PRODUCTO */}
      <Dialog open={openEditarTipo} onClose={() => setOpenEditarTipo(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 800 }}>Editar Tipo de Producto</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <TextField
            fullWidth
            label="Código / Nombre"
            size="small"
            value={tipoForm.nombre}
            onChange={(e) => setTipoForm({ ...tipoForm, nombre: e.target.value })}
          />
          <TextField
            fullWidth
            label="Descripción"
            size="small"
            value={tipoForm.descripcion}
            onChange={(e) => setTipoForm({ ...tipoForm, descripcion: e.target.value })}
          />
          <TextField
            fullWidth
            label="Detalles / Notas"
            size="small"
            multiline
            rows={2}
            value={tipoForm.metadata}
            onChange={(e) => setTipoForm({ ...tipoForm, metadata: e.target.value })}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenEditarTipo(false)}>Cancelar</Button>
          <Button variant="contained" color="primary" onClick={handleEditarTipoProducto}>Guardar</Button>
        </DialogActions>
      </Dialog>

      {/* DIALOG: CREAR UNIDAD */}
      <Dialog open={openCrearUnidad} onClose={() => setOpenCrearUnidad(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 800 }}>Agregar Nueva Unidad de Medida</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <TextField
            fullWidth
            label="Nombre"
            placeholder="LITROS"
            size="small"
            value={unidadForm.nombre}
            onChange={(e) => setUnidadForm({ ...unidadForm, nombre: e.target.value })}
          />
          <TextField
            fullWidth
            label="Abreviación"
            placeholder="L"
            size="small"
            value={unidadForm.abreviacion}
            onChange={(e) => setUnidadForm({ ...unidadForm, abreviacion: e.target.value })}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenCrearUnidad(false)}>Cancelar</Button>
          <Button variant="contained" color="success" onClick={handleCrearUnidad}>Guardar</Button>
        </DialogActions>
      </Dialog>

      {/* DIALOG: EDITAR UNIDAD */}
      <Dialog open={openEditarUnidad} onClose={() => setOpenEditarUnidad(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 800 }}>Editar Unidad de Medida</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <TextField
            fullWidth
            label="Nombre"
            size="small"
            value={unidadForm.nombre}
            onChange={(e) => setUnidadForm({ ...unidadForm, nombre: e.target.value })}
          />
          <TextField
            fullWidth
            label="Abreviación"
            size="small"
            value={unidadForm.abreviacion}
            onChange={(e) => setUnidadForm({ ...unidadForm, abreviacion: e.target.value })}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenEditarUnidad(false)}>Cancelar</Button>
          <Button variant="contained" color="primary" onClick={handleEditarUnidad}>Guardar</Button>
        </DialogActions>
      </Dialog>

      {/* DIALOG: CREAR PROVEEDOR */}
      <Dialog open={openCrearProveedor} onClose={() => setOpenCrearProveedor(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 800 }}>Agregar Nuevo Proveedor</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <TextField
            fullWidth
            label="Código de Proveedor"
            placeholder="PROV-LACTEOS-SUR"
            size="small"
            value={proveedorForm.codigo}
            onChange={(e) => setProveedorForm({ ...proveedorForm, codigo: e.target.value })}
          />
          <TextField
            fullWidth
            label="Nombre del Proveedor"
            placeholder="Lácteos del Sur S.A."
            size="small"
            value={proveedorForm.nombre}
            onChange={(e) => setProveedorForm({ ...proveedorForm, nombre: e.target.value })}
          />
          <TextField
            fullWidth
            label="Persona de Contacto"
            placeholder="Juan Pérez"
            size="small"
            value={proveedorForm.contacto}
            onChange={(e) => setProveedorForm({ ...proveedorForm, contacto: e.target.value })}
          />
          <TextField
            fullWidth
            label="Teléfono"
            placeholder="+56 9 1234 5678"
            size="small"
            value={proveedorForm.telefono}
            onChange={(e) => setProveedorForm({ ...proveedorForm, telefono: e.target.value })}
          />
          <TextField
            fullWidth
            label="Correo Electrónico"
            placeholder="contacto@proveedor.com"
            size="small"
            value={proveedorForm.correo}
            onChange={(e) => setProveedorForm({ ...proveedorForm, correo: e.target.value })}
          />
          <TextField
            fullWidth
            label="Certificaciones (separadas por coma)"
            placeholder="ISO 9001, HACCP, FDA"
            size="small"
            value={proveedorForm.certificacionesStr}
            onChange={(e) => setProveedorForm({ ...proveedorForm, certificacionesStr: e.target.value })}
          />

          <Divider sx={{ my: 1.5 }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'primary.main' }}>
            Condición de Pago & Datos Bancarios
          </Typography>

          <FormControl fullWidth size="small">
            <InputLabel>Condición de Pago (Crédito)</InputLabel>
            <Select
              value={proveedorForm.terminoPagoId}
              label="Condición de Pago (Crédito)"
              onChange={(e) => setProveedorForm({ ...proveedorForm, terminoPagoId: e.target.value })}
            >
              <MenuItem value=""><em>Pago de Contado / Sin Crédito</em></MenuItem>
              {terminosPago.map((tp) => (
                <MenuItem key={tp.id} value={tp.id}>{tp.nombre} ({tp.dias} días)</MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            fullWidth
            label="Banco"
            placeholder="Banco de Chile, Santander, Bci"
            size="small"
            value={proveedorForm.bancoNombre}
            onChange={(e) => setProveedorForm({ ...proveedorForm, bancoNombre: e.target.value })}
          />

          <FormControl fullWidth size="small">
            <InputLabel>Tipo de Cuenta</InputLabel>
            <Select
              value={proveedorForm.bancoTipoCuenta}
              label="Tipo de Cuenta"
              onChange={(e) => setProveedorForm({ ...proveedorForm, bancoTipoCuenta: e.target.value })}
            >
              <MenuItem value=""><em>Seleccione...</em></MenuItem>
              <MenuItem value="CORRIENTE">Cuenta Corriente</MenuItem>
              <MenuItem value="VISTA">Cuenta Vista / RUT</MenuItem>
              <MenuItem value="AHORRO">Cuenta de Ahorros</MenuItem>
            </Select>
          </FormControl>

          <TextField
            fullWidth
            label="Número de Cuenta"
            placeholder="123-45678-90"
            size="small"
            value={proveedorForm.bancoNroCuenta}
            onChange={(e) => setProveedorForm({ ...proveedorForm, bancoNroCuenta: e.target.value })}
          />

          <TextField
            fullWidth
            label="RUT Titular"
            placeholder="12.345.678-9"
            size="small"
            value={proveedorForm.bancoRutTitular}
            onChange={(e) => setProveedorForm({ ...proveedorForm, bancoRutTitular: e.target.value })}
          />

          <TextField
            fullWidth
            label="Nombre Titular"
            placeholder="Nombre del titular o Razón Social"
            size="small"
            value={proveedorForm.bancoNomTitular}
            onChange={(e) => setProveedorForm({ ...proveedorForm, bancoNomTitular: e.target.value })}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenCrearProveedor(false)}>Cancelar</Button>
          <Button variant="contained" color="success" onClick={handleCrearProveedorSubmit}>Guardar</Button>
        </DialogActions>
      </Dialog>

      {/* DIALOG: EDITAR PROVEEDOR */}
      <Dialog open={openEditarProveedor} onClose={() => setOpenEditarProveedor(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 800 }}>Editar Proveedor</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Código: <strong>{proveedorForm.codigo}</strong>
          </Typography>
          <TextField
            fullWidth
            label="Nombre del Proveedor"
            size="small"
            value={proveedorForm.nombre}
            onChange={(e) => setProveedorForm({ ...proveedorForm, nombre: e.target.value })}
          />
          <TextField
            fullWidth
            label="Persona de Contacto"
            size="small"
            value={proveedorForm.contacto}
            onChange={(e) => setProveedorForm({ ...proveedorForm, contacto: e.target.value })}
          />
          <TextField
            fullWidth
            label="Teléfono"
            size="small"
            value={proveedorForm.telefono}
            onChange={(e) => setProveedorForm({ ...proveedorForm, telefono: e.target.value })}
          />
          <TextField
            fullWidth
            label="Correo Electrónico"
            size="small"
            value={proveedorForm.correo}
            onChange={(e) => setProveedorForm({ ...proveedorForm, correo: e.target.value })}
          />
          <TextField
            fullWidth
            label="Certificaciones (separadas por coma)"
            size="small"
            value={proveedorForm.certificacionesStr}
            onChange={(e) => setProveedorForm({ ...proveedorForm, certificacionesStr: e.target.value })}
          />
          <FormControl fullWidth size="small">
            <InputLabel>Estado</InputLabel>
            <Select
              value={proveedorForm.estado}
              label="Estado"
              onChange={(e) => setProveedorForm({ ...proveedorForm, estado: e.target.value })}
            >
              <MenuItem value="ACTIVO">ACTIVO</MenuItem>
              <MenuItem value="INACTIVO">INACTIVO</MenuItem>
            </Select>
          </FormControl>

          <Divider sx={{ my: 1.5 }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'primary.main' }}>
            Condición de Pago & Datos Bancarios
          </Typography>

          <FormControl fullWidth size="small">
            <InputLabel>Condición de Pago (Crédito)</InputLabel>
            <Select
              value={proveedorForm.terminoPagoId}
              label="Condición de Pago (Crédito)"
              onChange={(e) => setProveedorForm({ ...proveedorForm, terminoPagoId: e.target.value })}
            >
              <MenuItem value=""><em>Pago de Contado / Sin Crédito</em></MenuItem>
              {terminosPago.map((tp) => (
                <MenuItem key={tp.id} value={tp.id}>{tp.nombre} ({tp.dias} días)</MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            fullWidth
            label="Banco"
            placeholder="Banco de Chile, Santander, Bci"
            size="small"
            value={proveedorForm.bancoNombre}
            onChange={(e) => setProveedorForm({ ...proveedorForm, bancoNombre: e.target.value })}
          />

          <FormControl fullWidth size="small">
            <InputLabel>Tipo de Cuenta</InputLabel>
            <Select
              value={proveedorForm.bancoTipoCuenta}
              label="Tipo de Cuenta"
              onChange={(e) => setProveedorForm({ ...proveedorForm, bancoTipoCuenta: e.target.value })}
            >
              <MenuItem value=""><em>Seleccione...</em></MenuItem>
              <MenuItem value="CORRIENTE">Cuenta Corriente</MenuItem>
              <MenuItem value="VISTA">Cuenta Vista / RUT</MenuItem>
              <MenuItem value="AHORRO">Cuenta de Ahorros</MenuItem>
            </Select>
          </FormControl>

          <TextField
            fullWidth
            label="Número de Cuenta"
            placeholder="123-45678-90"
            size="small"
            value={proveedorForm.bancoNroCuenta}
            onChange={(e) => setProveedorForm({ ...proveedorForm, bancoNroCuenta: e.target.value })}
          />

          <TextField
            fullWidth
            label="RUT Titular"
            placeholder="12.345.678-9"
            size="small"
            value={proveedorForm.bancoRutTitular}
            onChange={(e) => setProveedorForm({ ...proveedorForm, bancoRutTitular: e.target.value })}
          />

          <TextField
            fullWidth
            label="Nombre Titular"
            placeholder="Nombre del titular o Razón Social"
            size="small"
            value={proveedorForm.bancoNomTitular}
            onChange={(e) => setProveedorForm({ ...proveedorForm, bancoNomTitular: e.target.value })}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenEditarProveedor(false)}>Cancelar</Button>
          <Button variant="contained" color="primary" onClick={handleEditarProveedorSubmit}>Guardar</Button>
        </DialogActions>
      </Dialog>

      {/* DIALOG: CREAR CONDICIÓN DE PAGO */}
      <Dialog open={openCrearTermino} onClose={() => setOpenCrearTermino(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 800 }}>Agregar Nueva Condición de Pago</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <TextField
            fullWidth
            label="Nombre de Condición"
            placeholder="30 días"
            size="small"
            value={terminoForm.nombre}
            onChange={(e) => setTerminoForm({ ...terminoForm, nombre: e.target.value })}
          />
          <TextField
            fullWidth
            type="number"
            label="Días de Crédito"
            placeholder="30"
            size="small"
            value={terminoForm.dias}
            onChange={(e) => setTerminoForm({ ...terminoForm, dias: e.target.value })}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenCrearTermino(false)}>Cancelar</Button>
          <Button variant="contained" color="success" onClick={handleCrearTerminoSubmit}>Guardar</Button>
        </DialogActions>
      </Dialog>

      {/* DIALOG: EDITAR CONDICIÓN DE PAGO */}
      <Dialog open={openEditarTermino} onClose={() => setOpenEditarTermino(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 800 }}>Editar Condición de Pago</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <TextField
            fullWidth
            label="Nombre de Condición"
            size="small"
            value={terminoForm.nombre}
            onChange={(e) => setTerminoForm({ ...terminoForm, nombre: e.target.value })}
          />
          <TextField
            fullWidth
            type="number"
            label="Días de Crédito"
            size="small"
            value={terminoForm.dias}
            onChange={(e) => setTerminoForm({ ...terminoForm, dias: e.target.value })}
          />
          <FormControl fullWidth size="small">
            <InputLabel>Estado</InputLabel>
            <Select
              value={terminoForm.estado}
              label="Estado"
              onChange={(e) => setTerminoForm({ ...terminoForm, estado: e.target.value })}
            >
              <MenuItem value="ACTIVO">ACTIVO</MenuItem>
              <MenuItem value="INACTIVO">INACTIVO</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenEditarTermino(false)}>Cancelar</Button>
          <Button variant="contained" color="primary" onClick={handleEditarTerminoSubmit}>Guardar</Button>
        </DialogActions>
      </Dialog>

      {/* REGISTRAR SUCURSAL DIALOG */}
      <Dialog open={openSucursal} onClose={() => setOpenSucursal(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 800 }}>Registrar Nueva Sucursal</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <TextField
            fullWidth
            label="Código de Sucursal"
            placeholder="SUC-003"
            size="small"
            value={sucursalForm.codigo}
            onChange={(e) => setSucursalForm({ ...sucursalForm, codigo: e.target.value })}
          />
          <TextField
            fullWidth
            label="Nombre"
            placeholder="Sucursal Providencia"
            size="small"
            value={sucursalForm.nombre}
            onChange={(e) => setSucursalForm({ ...sucursalForm, nombre: e.target.value })}
          />
          <TextField
            fullWidth
            label="Dirección"
            placeholder="Av. Providencia 1234"
            size="small"
            value={sucursalForm.direccion}
            onChange={(e) => setSucursalForm({ ...sucursalForm, direccion: e.target.value })}
          />
          <TextField
            fullWidth
            label="Teléfono"
            placeholder="+56 9 1234 5678"
            size="small"
            value={sucursalForm.telefono}
            onChange={(e) => setSucursalForm({ ...sucursalForm, telefono: e.target.value })}
          />
          <TextField
            fullWidth
            label="Correo Electrónico"
            placeholder="providencia@lavaquita.cl"
            size="small"
            value={sucursalForm.correo}
            onChange={(e) => setSucursalForm({ ...sucursalForm, correo: e.target.value })}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenSucursal(false)}>Cancelar</Button>
          <Button variant="contained" color="success" onClick={handleCreateSucursal}>Guardar</Button>
        </DialogActions>
      </Dialog>

      {/* EDITAR SUCURSAL DIALOG */}
      <Dialog open={openEditSucursal} onClose={() => { setOpenEditSucursal(false); setSelectedSucursal(null); }} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 800 }}>Editar Sucursal: {selectedSucursal?.nombre}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <TextField
            fullWidth
            label="Código de Sucursal"
            size="small"
            value={selectedSucursal?.codigo || ''}
            disabled
          />
          <TextField
            fullWidth
            label="Nombre"
            size="small"
            value={editSucursalForm.nombre}
            onChange={(e) => setEditSucursalForm({ ...editSucursalForm, nombre: e.target.value })}
          />
          <TextField
            fullWidth
            label="Dirección"
            size="small"
            value={editSucursalForm.direccion}
            onChange={(e) => setEditSucursalForm({ ...editSucursalForm, direccion: e.target.value })}
          />
          <TextField
            fullWidth
            label="Teléfono"
            size="small"
            value={editSucursalForm.telefono}
            onChange={(e) => setEditSucursalForm({ ...editSucursalForm, telefono: e.target.value })}
          />
          <TextField
            fullWidth
            label="Correo Electrónico"
            size="small"
            value={editSucursalForm.correo}
            onChange={(e) => setEditSucursalForm({ ...editSucursalForm, correo: e.target.value })}
          />
          <FormControl fullWidth size="small">
            <InputLabel>Estado</InputLabel>
            <Select
              value={editSucursalForm.estado}
              label="Estado"
              onChange={(e) => setEditSucursalForm({ ...editSucursalForm, estado: e.target.value })}
            >
              <MenuItem value="ACTIVO">Activo</MenuItem>
              <MenuItem value="INACTIVO">Inactivo</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => { setOpenEditSucursal(false); setSelectedSucursal(null); }}>Cancelar</Button>
          <Button variant="contained" color="primary" onClick={handleEditSucursalSubmit}>Guardar Cambios</Button>
        </DialogActions>
      </Dialog>

      {/* DIALOG: CREAR ROL */}
      <Dialog open={openRol} onClose={() => setOpenRol(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 800 }}>Crear Nuevo Rol</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <TextField
            fullWidth
            label="Nombre del Rol"
            placeholder="OPERADOR_LOGISTICA"
            size="small"
            value={rolForm.nombre}
            onChange={(e) => setRolForm({ ...rolForm, nombre: e.target.value.toUpperCase() })}
          />
          <TextField
            fullWidth
            label="Descripción"
            placeholder="Rol encargado de la logística de despachos y recepciones."
            size="small"
            value={rolForm.descripcion}
            onChange={(e) => setRolForm({ ...rolForm, descripcion: e.target.value })}
          />
          <Divider sx={{ my: 1 }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'primary.main' }}>
            Asignar Permisos
          </Typography>
          <FormGroup sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
            {ALL_PERMISSIONS.map((perm) => {
              const isChecked = rolForm.permisos.includes(perm);
              return (
                <FormControlLabel
                  key={perm}
                  control={
                    <Checkbox
                      checked={isChecked}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setRolForm({ ...rolForm, permisos: [...rolForm.permisos, perm] });
                        } else {
                          setRolForm({ ...rolForm, permisos: rolForm.permisos.filter((p) => p !== perm) });
                        }
                      }}
                    />
                  }
                  label={<Typography variant="body2" sx={{ fontSize: '0.8rem' }}>{perm}</Typography>}
                />
              );
            })}
          </FormGroup>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenRol(false)}>Cancelar</Button>
          <Button variant="contained" color="success" onClick={handleCrearRolSubmit}>Guardar Rol</Button>
        </DialogActions>
      </Dialog>

      {/* DIALOG: EDITAR ROL */}
      <Dialog open={openEditarRol} onClose={() => { setOpenEditarRol(false); setSelectedRol(null); }} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 800 }}>Editar Rol: {selectedRol?.nombre}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <TextField
            fullWidth
            label="Nombre del Rol"
            size="small"
            value={rolForm.nombre}
            onChange={(e) => setRolForm({ ...rolForm, nombre: e.target.value.toUpperCase() })}
            disabled={['ADMINISTRADOR', 'SUPERVISOR', 'GERENTE_TIENDA', 'CAJERO', 'ALMACEN', 'CONTROL_CALIDAD'].includes(selectedRol?.nombre)}
          />
          <TextField
            fullWidth
            label="Descripción"
            size="small"
            value={rolForm.descripcion}
            onChange={(e) => setRolForm({ ...rolForm, descripcion: e.target.value })}
          />
          <Divider sx={{ my: 1 }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'primary.main' }}>
            Modificar Permisos
          </Typography>
          <FormGroup sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
            {ALL_PERMISSIONS.map((perm) => {
              const isChecked = rolForm.permisos.includes(perm);
              return (
                <FormControlLabel
                  key={perm}
                  control={
                    <Checkbox
                      checked={isChecked}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setRolForm({ ...rolForm, permisos: [...rolForm.permisos, perm] });
                        } else {
                          setRolForm({ ...rolForm, permisos: rolForm.permisos.filter((p) => p !== perm) });
                        }
                      }}
                    />
                  }
                  label={<Typography variant="body2" sx={{ fontSize: '0.8rem' }}>{perm}</Typography>}
                />
              );
            })}
          </FormGroup>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => { setOpenEditarRol(false); setSelectedRol(null); }}>Cancelar</Button>
          <Button variant="contained" color="primary" onClick={handleEditarRolSubmit}>Guardar Cambios</Button>
        </DialogActions>
      </Dialog>

      {/* DIALOG: CONFIRMACIÓN GENÉRICA */}
      <Dialog open={openConfirm} onClose={() => setOpenConfirm(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 800 }}>{confirmData?.title || 'Confirmar Acción'}</DialogTitle>
        <DialogContent>
          <Typography>{confirmData?.message}</Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenConfirm(false)}>Cancelar</Button>
          <Button
            variant="contained"
            color="error"
            onClick={async () => {
              if (confirmData?.action) {
                try {
                  setErrorMsg(null);
                  await confirmData.action();
                } catch (e: any) {
                  setErrorMsg(e.message);
                }
              }
              setOpenConfirm(false);
            }}
          >
            Confirmar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
