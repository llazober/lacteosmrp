import { useState, useEffect } from 'react';
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  IconButton,
  Autocomplete,
  Card,
  CardContent,
  Divider,
  Checkbox,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  LocalShipping,
  CheckCircle,
  Search,
  Add,
  Delete,
  Assignment,
  ArrowBack,
  PostAdd,
  Warning,
} from '@mui/icons-material';
import dayjs from 'dayjs';
import { apiFetch, useAuthStore } from '../store/useAuthStore';

interface ItemRecepcion {
  ordenCompraDetalleId?: string;
  lineaNum?: number;
  productoId: string;
  sku: string;
  descripcion: string;
  cantidadMax?: number; // si viene de OC, la cantidad pendiente
  cantidad: number;
  costoUnitario: number;
  esMateriaPrima: boolean;
  numeroLote?: string;
  fechaProduccion?: string;
  fechaVencimiento?: string;
  tempMin?: number;
  tempMax?: number;
  checked?: boolean;
  binId?: string;
}

export default function RecepcionMateriales() {
  const usuario = useAuthStore((state) => state.usuario);

  // Catálogos
  const [proveedores, setProveedores] = useState<any[]>([]);
  const [sucursales, setSucursales] = useState<any[]>([]);
  const [productos, setProductos] = useState<any[]>([]);
  const [ordenesPendientes, setOrdenesPendientes] = useState<any[]>([]);

  // Búsqueda y Selección
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOC, setSelectedOC] = useState<any>(null);
  const [modoAdHoc, setModoAdHoc] = useState(false);

  // Formulario Recepción
  const [sucursalId, setSucursalId] = useState('');
  const [proveedorId, setProveedorId] = useState('');
  const [facturaNumero, setFacturaNumero] = useState('');
  const [packingSlip, setPackingSlip] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [itemsRecibir, setItemsRecibir] = useState<ItemRecepcion[]>([]);

  // Autocomplete state
  const [selectedProductToAdd, setSelectedProductToAdd] = useState<any>(null);

  // Mensajes de feedback
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Milk bins and confirm states
  const [binsLecheEntera, setBinsLecheEntera] = useState<any[]>([]);
  const [binsLecheDescremada, setBinsLecheDescremada] = useState<any[]>([]);
  const [openMilkConfirm, setOpenMilkConfirm] = useState(false);

  const [openCapacityWarning, setOpenCapacityWarning] = useState(false);
  const [capacityWarningData, setCapacityWarningData] = useState<{
    itemIndex: number;
    selectedBinName: string;
    availableCapacity: number;
    amountToReceive: number;
    suggestedDistribution: { binId: string; binName: string; cantidad: number }[];
  } | null>(null);

  const handleApplyCapacityDistribution = () => {
    if (!capacityWarningData) return;
    const { itemIndex, suggestedDistribution } = capacityWarningData;
    
    // Split the item in itemsRecibir
    const originalItem = itemsRecibir[itemIndex];
    const newItems = [...itemsRecibir];
    
    // Remove the original item
    newItems.splice(itemIndex, 1);
    
    // Insert split items
    suggestedDistribution.forEach((dist) => {
      newItems.push({
        ...originalItem,
        cantidad: dist.cantidad,
        binId: dist.binId,
      });
    });
    
    setItemsRecibir(newItems);
    setOpenCapacityWarning(false);
    setCapacityWarningData(null);
    
    // Submit with bypass
    setTimeout(() => {
      handleSubmitRecepcion(true);
    }, 100);
  };

  const handleForceCapacitySubmit = () => {
    setOpenCapacityWarning(false);
    setCapacityWarningData(null);
    handleSubmitRecepcion(true); // Bypass check
  };

  const cargarBinsLeche = async (sucId: string) => {
    try {
      const bods = await apiFetch(`/inventario/bodegas?sucursalId=${sucId}`);
      
      const enteraBodega = bods.find((b: any) => 
        b.tipoBodega === 'LECHE_ENTERA_FLUIDA' || 
        b.tipoBodega === 'LECHE_ENTERA' || 
        b.nombre.toLowerCase().includes('leche entera')
      );
      setBinsLecheEntera(enteraBodega ? (enteraBodega.bins || []) : []);

      const descremadaBodega = bods.find((b: any) => 
        b.tipoBodega === 'LECHE_DESCREMADA' || 
        b.nombre.toLowerCase().includes('leche descremada')
      );
      setBinsLecheDescremada(descremadaBodega ? (descremadaBodega.bins || []) : []);
    } catch (e) {
      console.error('Error cargando bins de leche:', e);
    }
  };

  useEffect(() => {
    if (sucursalId) {
      cargarBinsLeche(sucursalId);
    }
  }, [sucursalId]);

  // Cargar catálogos
  useEffect(() => {
    cargarCatalogos();
  }, []);

  const cargarCatalogos = async () => {
    try {
      const provs = await apiFetch('/proveedores');
      setProveedores(provs);

      const sucs = await apiFetch('/sucursales');
      setSucursales(sucs);

      const prods = await apiFetch('/productos');
      setProductos(prods);

      const pendingOcs = await apiFetch('/recepciones/ordenes-pendientes');
      setOrdenesPendientes(pendingOcs);

      // Default branch
      if (usuario?.sucursalId) {
        setSucursalId(usuario.sucursalId);
      } else if (sucs.length > 0) {
        setSucursalId(sucs[0].id);
      }
    } catch (e: any) {
      console.error('Error al cargar catálogos:', e);
      setErrorMsg('No se pudieron cargar los catálogos.');
    }
  };

  // Handler para cuando se selecciona una OC
  const handleSelectOrder = (oc: any) => {
    setSelectedOC(oc);
    setModoAdHoc(false);
    setSucursalId(oc.sucursalId);
    setProveedorId(oc.proveedorId);
    setErrorMsg(null);
    setSuccessMsg(null);

    const items = (oc.detalles || [])
      .filter((det: any) => det.cantidad - det.cantidadRecibida > 0)
      .map((det: any) => {
        const pendiente = Math.max(0, det.cantidad - det.cantidadRecibida);
        const esMP =
          det.producto.tipoProducto === 'MATERIA_PRIMA' ||
          det.producto.tipoProducto === 'INSUMO' ||
          det.producto.tipoProducto === 'MP';

        // Generar lote sugerido único
        const loteSugerido = esMP
          ? `${det.producto.sku}-${dayjs().format('YYMMDD')}-${Math.floor(100 + Math.random() * 900)}`
          : undefined;

        return {
          ordenCompraDetalleId: det.id,
          lineaNum: det.lineaNum,
          productoId: det.productoId,
          sku: det.producto.sku,
          descripcion: det.producto.descripcion,
          cantidadMax: pendiente,
          cantidad: pendiente,
          costoUnitario: det.costoUnitario,
          esMateriaPrima: esMP,
          numeroLote: loteSugerido,
          fechaProduccion: esMP ? dayjs().format('YYYY-MM-DD') : undefined,
          fechaVencimiento: esMP
            ? dayjs().add(det.producto.vidaUtilDias || 30, 'day').format('YYYY-MM-DD')
            : undefined,
          tempMin: esMP ? det.producto.temperaturaMin || 2.0 : undefined,
          tempMax: esMP ? det.producto.temperaturaMax || 6.0 : undefined,
          checked: true,
        };
      });

    setItemsRecibir(items);
  };

  // Activar modo ad-hoc (sin OC)
  const handleActivarAdHoc = () => {
    setSelectedOC(null);
    setModoAdHoc(true);
    setProveedorId('');
    setItemsRecibir([]);
    setFacturaNumero('');
    setPackingSlip('');
    setObservaciones('');
    setErrorMsg(null);
    setSuccessMsg(null);
    if (usuario?.sucursalId) {
      setSucursalId(usuario.sucursalId);
    }
  };

  // Volver a selección
  const handleVolver = () => {
    setSelectedOC(null);
    setModoAdHoc(false);
    setItemsRecibir([]);
    setFacturaNumero('');
    setPackingSlip('');
    setObservaciones('');
    setErrorMsg(null);
    setSuccessMsg(null);
    // Recargar pendientes
    cargarCatalogos();
  };

  // Agregar item en modo Ad-hoc
  const handleAgregarItemAdHoc = () => {
    if (!selectedProductToAdd) return;

    // Verificar si ya existe
    if (itemsRecibir.some((it) => it.productoId === selectedProductToAdd.id)) {
      setErrorMsg('El producto ya se encuentra en la lista.');
      return;
    }

    const esMP =
      selectedProductToAdd.tipoProducto === 'MATERIA_PRIMA' ||
      selectedProductToAdd.tipoProducto === 'INSUMO' ||
      selectedProductToAdd.tipoProducto === 'MP';

    const loteSugerido = esMP
      ? `${selectedProductToAdd.sku}-${dayjs().format('YYMMDD')}-${Math.floor(100 + Math.random() * 900)}`
      : undefined;

    const nuevoItem: ItemRecepcion = {
      productoId: selectedProductToAdd.id,
      sku: selectedProductToAdd.sku,
      descripcion: selectedProductToAdd.descripcion,
      cantidad: 1,
      costoUnitario: selectedProductToAdd.costo || 0,
      esMateriaPrima: esMP,
      numeroLote: loteSugerido,
      fechaProduccion: esMP ? dayjs().format('YYYY-MM-DD') : undefined,
      fechaVencimiento: esMP
        ? dayjs().add(selectedProductToAdd.vidaUtilDias || 30, 'day').format('YYYY-MM-DD')
        : undefined,
      tempMin: esMP ? selectedProductToAdd.temperaturaMin || 2.0 : undefined,
      tempMax: esMP ? selectedProductToAdd.temperaturaMax || 6.0 : undefined,
    };

    setItemsRecibir([...itemsRecibir, nuevoItem]);
    setSelectedProductToAdd(null);
    setErrorMsg(null);
  };

  // Eliminar item de la lista
  const handleEliminarItem = (index: number) => {
    const copia = [...itemsRecibir];
    copia.splice(index, 1);
    setItemsRecibir(copia);
  };

  // Modificar campo de un item específico
  const handleChangeItem = (index: number, campo: keyof ItemRecepcion, valor: any) => {
    const copia = [...itemsRecibir];
    copia[index] = { ...copia[index], [campo]: valor };
    setItemsRecibir(copia);
  };

  // Enviar recepción
  const handleSubmitRecepcion = async (bypassMilkCheck: boolean | any = false) => {
    setErrorMsg(null);
    setSuccessMsg(null);

    const isBypass = bypassMilkCheck === true;
    const itemsAEnviar = itemsRecibir.filter((it) => it.checked !== false);

    if (itemsAEnviar.length === 0) {
      setErrorMsg('Debe registrar al menos un producto seleccionado en el recibo.');
      return;
    }

    // Validar datos por cada item
    for (const item of itemsAEnviar) {
      if (item.cantidad <= 0) {
        setErrorMsg(`La cantidad para el producto ${item.sku} debe ser mayor que 0.`);
        return;
      }
      if (item.esMateriaPrima) {
        if (!item.numeroLote || item.numeroLote.trim() === '') {
          setErrorMsg(`El producto ${item.sku} es Materia Prima y requiere ingresar un número de lote.`);
          return;
        }
        if (!item.fechaProduccion || !item.fechaVencimiento) {
          setErrorMsg(`El producto ${item.sku} requiere fechas de producción y vencimiento.`);
          return;
        }
      }
    }

    // Alerta de leche en tanque por defecto
    if (!isBypass) {
      const lecheSinTanque = itemsAEnviar.filter(
        (it) =>
          (it.descripcion.toLowerCase().includes('leche entera') ||
            it.descripcion.toLowerCase().includes('leche descremada')) &&
          !it.binId
      );
      if (lecheSinTanque.length > 0) {
        setOpenMilkConfirm(true);
        return;
      }

      // Alerta de capacidad de tanque excedida
      for (let idx = 0; idx < itemsAEnviar.length; idx++) {
        const item = itemsAEnviar[idx];
        const isEntera = item.descripcion.toLowerCase().includes('leche entera');
        const isDescremada = item.descripcion.toLowerCase().includes('leche descremada');
        if (isEntera || isDescremada) {
          const binsList = isEntera ? binsLecheEntera : binsLecheDescremada;
          if (binsList.length > 0) {
            const selectedBin = binsList.find((b) => b.id === item.binId) || binsList[0];
            if (selectedBin) {
              const cap = selectedBin.capacidad || 10000;
              const ocup = selectedBin.ocupacion || 0;
              const avail = Math.max(0, cap - ocup);
              if (item.cantidad > avail) {
                // Calculate distribution
                let remaining = item.cantidad;
                const distribution: { binId: string; binName: string; cantidad: number }[] = [];

                // Fill selected first
                const takeSelected = Math.min(remaining, avail);
                if (takeSelected > 0) {
                  distribution.push({
                    binId: selectedBin.id,
                    binName: `${selectedBin.codigo} — ${selectedBin.nombre}`,
                    cantidad: takeSelected,
                  });
                  remaining -= takeSelected;
                }

                // Fill others next
                if (remaining > 0) {
                  const otherBins = binsList.filter((b) => b.id !== selectedBin.id && b.disponible > 0);
                  for (const bin of otherBins) {
                    if (remaining <= 0) break;
                    const take = Math.min(remaining, bin.disponible);
                    distribution.push({
                      binId: bin.id,
                      binName: `${bin.codigo} — ${bin.nombre}`,
                      cantidad: take,
                    });
                    remaining -= take;
                  }
                }

                // If still remaining, force it into the selected bin
                if (remaining > 0) {
                  const selectedDist = distribution.find((d) => d.binId === selectedBin.id);
                  if (selectedDist) {
                    selectedDist.cantidad += remaining;
                  } else {
                    distribution.push({
                      binId: selectedBin.id,
                      binName: `${selectedBin.codigo} — ${selectedBin.nombre}`,
                      cantidad: remaining,
                    });
                  }
                }

                // Find the original index of this item in the full itemsRecibir list
                const originalIndex = itemsRecibir.findIndex((it) => it.productoId === item.productoId && it.numeroLote === item.numeroLote);

                setCapacityWarningData({
                  itemIndex: originalIndex,
                  selectedBinName: `${selectedBin.codigo} — ${selectedBin.nombre}`,
                  availableCapacity: avail,
                  amountToReceive: item.cantidad,
                  suggestedDistribution: distribution,
                });
                setOpenCapacityWarning(true);
                return;
              }
            }
          }
        }
      }
    }

    const payload = {
      ordenCompraId: selectedOC ? selectedOC.id : undefined,
      proveedorId: proveedorId || undefined,
      sucursalId,
      facturaNumero: facturaNumero || undefined,
      packingSlip: packingSlip || undefined,
      observaciones: observaciones || undefined,
      items: itemsAEnviar.map((it) => ({
        ordenCompraDetalleId: it.ordenCompraDetalleId,
        productoId: it.productoId,
        cantidad: it.cantidad,
        costoUnitario: it.costoUnitario,
        numeroLote: it.esMateriaPrima ? it.numeroLote : undefined,
        fechaProduccion: it.esMateriaPrima ? it.fechaProduccion : undefined,
        fechaVencimiento: it.esMateriaPrima ? it.fechaVencimiento : undefined,
        tempMin: it.esMateriaPrima ? it.tempMin : undefined,
        tempMax: it.esMateriaPrima ? it.tempMax : undefined,
        binId: it.binId || undefined,
      })),
    };

    try {
      const res = await apiFetch('/recepciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.success) {
        setSuccessMsg(
          `Recepción registrada exitosamente con el recibo número ${res.data.numeroRecibo}.`
        );
        // Volver a cargar estado inicial tras 3 segundos
        setTimeout(() => {
          handleVolver();
        }, 3000);
      } else {
        setErrorMsg(res.message || 'Error al guardar la recepción.');
      }
    } catch (e: any) {
      console.error('Error al guardar recepción:', e);
      setErrorMsg(e.message || 'Error al procesar la solicitud.');
    }
  };

  // Filtrar órdenes basadas en el buscador
  const ordenesFiltradas = ordenesPendientes.filter((oc) => {
    const term = searchQuery.toLowerCase();
    const matchesOC =
      oc.numeroOrden.toLowerCase().includes(term) ||
      oc.proveedor.nombre.toLowerCase().includes(term);
    const matchesProduct = oc.detalles?.some((det: any) =>
      det.producto.sku.toLowerCase().includes(term) ||
      det.producto.descripcion.toLowerCase().includes(term)
    );
    return matchesOC || matchesProduct;
  });


  return (
    <Box sx={{ p: 4, height: '100%', overflowY: 'auto', color: '#fff' }}>
      {/* Encabezado Principal */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
              p: 1.5,
              borderRadius: 3,
              boxShadow: '0 4px 20px rgba(59, 130, 246, 0.4)',
            }}
          >
            <LocalShipping sx={{ fontSize: 32, color: '#fff' }} />
          </Box>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}>
              Recepción de Materiales
            </Typography>
            <Typography variant="subtitle2" color="text.secondary">
              Ingreso de materias primas e insumos no alimentarios
            </Typography>
          </Box>
        </Box>

        {!selectedOC && !modoAdHoc && (
          <Button
            variant="contained"
            color="primary"
            startIcon={<PostAdd />}
            onClick={handleActivarAdHoc}
            sx={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              fontWeight: 700,
              boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)',
              borderRadius: 2,
              px: 3,
              '&:hover': {
                background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
              },
            }}
          >
            Recepción Ad-hoc (Sin OC)
          </Button>
        )}
      </Box>

      {/* Alertas de Notificación */}
      {errorMsg && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setErrorMsg(null)}>
          {errorMsg}
        </Alert>
      )}
      {successMsg && (
        <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setSuccessMsg(null)}>
          {successMsg}
        </Alert>
      )}

      {/* VISTA 1: BÚSQUEDA Y SELECCIÓN DE OC */}
      {!selectedOC && !modoAdHoc && (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 4 }}>
          <Box sx={{ gridColumn: 'span 12' }}>
            <Card
              sx={{
                background: 'rgba(30, 41, 59, 0.5)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 4,
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, color: '#93c5fd' }}>
                  Seleccione una Orden de Compra Pendiente
                </Typography>
                <TextField
                  fullWidth
                  variant="outlined"
                  placeholder="Buscar por Número de OC o Proveedor..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  slotProps={{
                    input: {
                      startAdornment: <Search sx={{ color: 'text.secondary', mr: 1 }} />,
                    },
                  }}
                  sx={{
                    mb: 3,
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: 'rgba(15, 23, 42, 0.3)',
                      borderRadius: 2,
                    },
                  }}
                />

                {ordenesFiltradas.length === 0 ? (
                  <Box sx={{ py: 6, textAlign: 'center', color: 'text.secondary' }}>
                    <Assignment sx={{ fontSize: 48, mb: 1, opacity: 0.5 }} />
                    <Typography>No hay órdenes de compra aprobadas pendientes de recibir.</Typography>
                  </Box>
                ) : (
                  <Table sx={{ minWidth: 650 }}>
                    <TableHead sx={{ backgroundColor: 'rgba(15, 23, 42, 0.5)' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Orden</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Proveedor</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Sucursal</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Fecha Solicitud</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Líneas Pendientes</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, color: 'text.secondary' }}>Acción</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {ordenesFiltradas.map((oc) => {
                        const lineasPendientesCount = (oc.detalles || []).filter(
                          (d: any) => d.cantidad - d.cantidadRecibida > 0
                        ).length;
                        return (
                          <TableRow
                            key={oc.id}
                            sx={{ '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.02)' } }}
                          >
                            <TableCell sx={{ fontWeight: 700, color: '#93c5fd' }}>{oc.numeroOrden}</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>{oc.proveedor?.nombre}</TableCell>
                            <TableCell>{oc.sucursal?.nombre}</TableCell>
                            <TableCell>{new Date(oc.createdAt).toLocaleDateString('es-CO')}</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>
                              {lineasPendientesCount} {lineasPendientesCount === 1 ? 'línea' : 'líneas'}
                            </TableCell>
                            <TableCell align="right">
                              <Button
                                variant="outlined"
                                size="small"
                                onClick={() => handleSelectOrder(oc)}
                                sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
                              >
                                Recibir
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </Box>
        </Box>
      )}

      {/* VISTA 2: FORMULARIO DE RECEPCIÓN (CON OC O AD-HOC) */}
      {(selectedOC || modoAdHoc) && (
        <Box>
          {/* Botón de retorno */}
          <Button
            startIcon={<ArrowBack />}
            onClick={handleVolver}
            sx={{ mb: 3, textTransform: 'none', color: '#93c5fd', fontWeight: 700 }}
          >
            Volver a la Lista
          </Button>

          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 4 }}>
            {/* 1. Datos Generales de la Recepción */}
            <Box sx={{ gridColumn: { xs: 'span 12', md: 'span 4' } }}>
              <Card
                sx={{
                  background: 'rgba(30, 41, 59, 0.5)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: 4,
                  height: '100%',
                }}
              >
                <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: '#93c5fd' }}>
                    Información del Recibo
                  </Typography>

                  {selectedOC && (
                    <Box
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        border: '1px solid rgba(59, 130, 246, 0.2)',
                      }}
                    >
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                        Orden de Compra Asociada
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 800, color: '#93c5fd' }}>
                        {selectedOC.numeroOrden}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                        Proveedor
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        {selectedOC.proveedor.nombre}
                      </Typography>
                    </Box>
                  )}

                  {/* Sucursal Destino */}
                  <FormControl fullWidth>
                    <InputLabel id="sucursal-label">Sucursal Destino</InputLabel>
                    <Select
                      labelId="sucursal-label"
                      label="Sucursal Destino"
                      value={sucursalId}
                      onChange={(e) => setSucursalId(e.target.value)}
                      disabled={!!selectedOC} // Bloqueada si viene de OC
                    >
                      {sucursales.map((suc) => (
                        <MenuItem key={suc.id} value={suc.id}>
                          {suc.nombre}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  {/* Selector Proveedor (solo en Ad-hoc) */}
                  {modoAdHoc && (
                    <FormControl fullWidth>
                      <InputLabel id="proveedor-label">Proveedor (Opcional)</InputLabel>
                      <Select
                        labelId="proveedor-label"
                        label="Proveedor (Opcional)"
                        value={proveedorId}
                        onChange={(e) => setProveedorId(e.target.value)}
                      >
                        <MenuItem value="">
                          <em>Ninguno (Proveedor Genérico)</em>
                        </MenuItem>
                        {proveedores.map((prov) => (
                          <MenuItem key={prov.id} value={prov.id}>
                            {prov.nombre}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}

                  {/* Documentación */}
                  <TextField
                    fullWidth
                    label="Número de Factura"
                    variant="outlined"
                    placeholder="Ej. FAC-12345"
                    value={facturaNumero}
                    onChange={(e) => setFacturaNumero(e.target.value)}
                  />

                  <TextField
                    fullWidth
                    label="Packing Slip / Guía de Despacho"
                    variant="outlined"
                    placeholder="Ej. GUIA-98765"
                    value={packingSlip}
                    onChange={(e) => setPackingSlip(e.target.value)}
                  />

                  <TextField
                    fullWidth
                    label="Observaciones"
                    variant="outlined"
                    multiline
                    rows={3}
                    placeholder="Notas o comentarios sobre el estado de la entrega..."
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                  />

                  <Button
                    fullWidth
                    variant="contained"
                    color="primary"
                    size="large"
                    startIcon={<CheckCircle />}
                    onClick={handleSubmitRecepcion}
                    sx={{
                      background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                      fontWeight: 800,
                      borderRadius: 2,
                      py: 1.5,
                      boxShadow: '0 4px 15px rgba(59, 130, 246, 0.4)',
                    }}
                  >
                    Procesar Recepción
                  </Button>
                </CardContent>
              </Card>
            </Box>

            {/* 2. Grid de Productos y Lotes */}
            <Box sx={{ gridColumn: { xs: 'span 12', md: 'span 8' } }}>
              <Card
                sx={{
                  background: 'rgba(30, 41, 59, 0.5)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: 4,
                  height: '100%',
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: '#93c5fd', mb: 3 }}>
                    Productos a Recibir
                  </Typography>

                  {/* Buscador de productos (solo en modo Ad-Hoc) */}
                  {modoAdHoc && (
                    <Box sx={{ display: 'flex', gap: 2, mb: 4 }}>
                      <Autocomplete
                        fullWidth
                        options={productos}
                        getOptionLabel={(option) => `${option.sku} - ${option.descripcion}`}
                        value={selectedProductToAdd}
                        onChange={(_, newValue) => setSelectedProductToAdd(newValue)}
                        renderInput={(params) => (
                          <TextField {...params} label="Buscar Producto para Agregar" variant="outlined" />
                        )}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            backgroundColor: 'rgba(15, 23, 42, 0.3)',
                          },
                        }}
                      />
                      <Button
                        variant="contained"
                        onClick={handleAgregarItemAdHoc}
                        startIcon={<Add />}
                        sx={{
                          background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                          px: 3,
                          borderRadius: 2,
                          fontWeight: 700,
                        }}
                      >
                        Añadir
                      </Button>
                    </Box>
                  )}

                  {itemsRecibir.length === 0 ? (
                    <Box sx={{ py: 8, textAlign: 'center', color: 'text.secondary' }}>
                      <Assignment sx={{ fontSize: 48, mb: 1, opacity: 0.5 }} />
                      <Typography>No hay productos agregados en el recibo.</Typography>
                    </Box>
                  ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      {itemsRecibir.map((item, idx) => (
                        <Paper
                          key={`${item.productoId}-${idx}`}
                          elevation={0}
                          sx={{
                            p: 3,
                            borderRadius: 3,
                            backgroundColor: 'rgba(15, 23, 42, 0.3)',
                            border: '1px solid rgba(255, 255, 255, 0.05)',
                            opacity: item.checked === false ? 0.55 : 1,
                            transition: 'opacity 0.2s',
                          }}
                        >
                          {/* Fila del Producto y Cantidad */}
                          <Box
                            sx={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'flex-start',
                              flexWrap: 'wrap',
                              gap: 2,
                              mb: 2,
                            }}
                          >
                            <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                              {!modoAdHoc && (
                                <Checkbox
                                  checked={item.checked !== false}
                                  onChange={(e) =>
                                    handleChangeItem(idx, 'checked', e.target.checked)
                                  }
                                  sx={{
                                    color: '#93c5fd',
                                    '&.Mui-checked': {
                                      color: '#3b82f6',
                                    },
                                    p: 0,
                                    mr: 1,
                                  }}
                                />
                              )}
                              {item.lineaNum !== undefined && (
                                <Chip
                                  label={`Línea ${item.lineaNum}`}
                                  color="primary"
                                  size="small"
                                  sx={{ mr: 1, fontWeight: 800, height: 20, verticalAlign: 'middle' }}
                                />
                              )}
                              <Typography variant="body1" sx={{ fontWeight: 800, color: '#93c5fd', display: 'inline-block', verticalAlign: 'middle' }}>
                                {item.descripcion}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', width: '100%' }}>
                                SKU: <strong>{item.sku}</strong> | Tipo:{' '}
                                <Chip
                                  label={item.esMateriaPrima ? 'Materia Prima' : 'MNA'}
                                  color={item.esMateriaPrima ? 'success' : 'default'}
                                  size="small"
                                  sx={{ height: 18, fontSize: '0.65rem', fontWeight: 800 }}
                                />
                              </Typography>
                            </Box>

                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                              <TextField
                                label="Cantidad"
                                type="number"
                                size="small"
                                disabled={item.checked === false}
                                value={item.cantidad}
                                onChange={(e) =>
                                  handleChangeItem(idx, 'cantidad', parseFloat(e.target.value) || 0)
                                }
                                slotProps={{
                                  htmlInput: {
                                    min: 0.1,
                                    max: item.cantidadMax,
                                  },
                                }}
                                sx={{ width: 110 }}
                              />

                              {selectedOC && item.cantidadMax !== undefined && (
                                <Typography variant="caption" color="text.secondary" sx={{ mr: 1 }}>
                                  Pendiente: {item.cantidadMax}
                                </Typography>
                              )}

                              {modoAdHoc && (
                                <IconButton color="error" onClick={() => handleEliminarItem(idx)}>
                                  <Delete />
                                </IconButton>
                              )}
                            </Box>
                          </Box>

                          <Divider sx={{ my: 1.5, borderColor: 'rgba(255,255,255,0.05)' }} />

                          {/* Sección Lote para Materia Prima */}
                          {item.esMateriaPrima ? (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                              <Typography variant="caption" sx={{ color: '#10b981', fontWeight: 800 }}>
                                📋 INFORMACIÓN DE LOTE (Materia Prima / Insumo obligatorio)
                              </Typography>
                              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 2 }}>
                                <Box sx={{ gridColumn: { xs: 'span 12', sm: 'span 4' } }}>
                                  <TextField
                                    fullWidth
                                    size="small"
                                    label="Número de Lote"
                                    disabled={item.checked === false}
                                    value={item.numeroLote || ''}
                                    onChange={(e) =>
                                      handleChangeItem(idx, 'numeroLote', e.target.value)
                                    }
                                  />
                                </Box>
                                <Box sx={{ gridColumn: { xs: 'span 6', sm: 'span 4' } }}>
                                  <TextField
                                    fullWidth
                                    size="small"
                                    label="Fecha Producción"
                                    type="date"
                                    disabled={item.checked === false}
                                    slotProps={{ inputLabel: { shrink: true } }}
                                    value={item.fechaProduccion || ''}
                                    onChange={(e) =>
                                      handleChangeItem(idx, 'fechaProduccion', e.target.value)
                                    }
                                  />
                                </Box>
                                <Box sx={{ gridColumn: { xs: 'span 6', sm: 'span 4' } }}>
                                  <TextField
                                    fullWidth
                                    size="small"
                                    label="Fecha Vencimiento"
                                    type="date"
                                    disabled={item.checked === false}
                                    slotProps={{ inputLabel: { shrink: true } }}
                                    value={item.fechaVencimiento || ''}
                                    onChange={(e) =>
                                      handleChangeItem(idx, 'fechaVencimiento', e.target.value)
                                    }
                                  />
                                </Box>
                                <Box sx={{ gridColumn: { xs: 'span 6', sm: 'span 6' } }}>
                                  <TextField
                                    fullWidth
                                    size="small"
                                    label="Temperatura Mín (°C)"
                                    type="number"
                                    disabled={item.checked === false}
                                    value={item.tempMin || ''}
                                    onChange={(e) =>
                                      handleChangeItem(idx, 'tempMin', parseFloat(e.target.value) || 0)
                                    }
                                  />
                                </Box>
                                <Box sx={{ gridColumn: { xs: 'span 6', sm: 'span 6' } }}>
                                  <TextField
                                    fullWidth
                                    size="small"
                                    label="Temperatura Máx (°C)"
                                    type="number"
                                    disabled={item.checked === false}
                                    value={item.tempMax || ''}
                                    onChange={(e) =>
                                      handleChangeItem(idx, 'tempMax', parseFloat(e.target.value) || 0)
                                    }
                                  />
                                </Box>
                                {(item.descripcion.toLowerCase().includes('leche entera') || item.descripcion.toLowerCase().includes('leche descremada')) && (
                                  <Box sx={{ gridColumn: 'span 12', mt: 1 }}>
                                    <FormControl fullWidth size="small">
                                      <InputLabel>Tanque de Almacenamiento (Opcional)</InputLabel>
                                      <Select
                                        value={item.binId || ''}
                                        label="Tanque de Almacenamiento (Opcional)"
                                        disabled={item.checked === false}
                                        onChange={(e) =>
                                          handleChangeItem(idx, 'binId', e.target.value)
                                        }
                                      >
                                        <MenuItem value=""><em>-- Tanque por Defecto (Configurado) --</em></MenuItem>
                                        {(item.descripcion.toLowerCase().includes('leche entera') ? binsLecheEntera : binsLecheDescremada).map((bin: any) => {
                                          const cap = bin.capacidad || 10000;
                                          const disp = bin.disponible !== undefined ? bin.disponible : cap;
                                          return (
                                            <MenuItem key={bin.id} value={bin.id}>
                                              {bin.codigo} — {bin.nombre} (Disp: {disp.toLocaleString()} / {cap.toLocaleString()} Lts)
                                            </MenuItem>
                                          );
                                        })}
                                      </Select>
                                    </FormControl>
                                  </Box>
                                )}
                              </Box>
                            </Box>
                          ) : (
                            <Box
                              sx={{
                                p: 1.5,
                                borderRadius: 2,
                                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                                border: '1px dashed rgba(255, 255, 255, 0.1)',
                              }}
                            >
                              <Typography variant="caption" color="text.secondary">
                                ℹ️ <strong>MNA (Material No Alimentario):</strong> No requiere lote de
                                trazabilidad. Bodega Destino: General / Fallback.
                              </Typography>
                            </Box>
                          )}
                        </Paper>
                      ))}
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Box>
          </Box>
        </Box>
      )}

      {/* DIALOG: CONFIRMAR TANQUE DE LECHE */}
      <Dialog open={openMilkConfirm} onClose={() => setOpenMilkConfirm(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 800 }}>⚠️ Confirmar Tanque de Recepción</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Se ha detectado que va a recibir <strong>Leche</strong> y no ha seleccionado un tanque específico (se enviará al <strong>Tanque por Defecto</strong>).
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            ¿Desea cambiar el tanque receptor o prefiere continuar con el tanque predeterminado?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Button
            fullWidth
            variant="contained"
            color="primary"
            onClick={() => setOpenMilkConfirm(false)}
            sx={{ textTransform: 'none', fontWeight: 700 }}
          >
            Quiero cambiar de Tanque
          </Button>
          <Button
            fullWidth
            variant="outlined"
            color="warning"
            onClick={() => {
              setOpenMilkConfirm(false);
              handleSubmitRecepcion(true); // Bypass check
            }}
            sx={{ textTransform: 'none', fontWeight: 700 }}
          >
            Continuar con el Tanque por Defecto
          </Button>
        </DialogActions>
      </Dialog>

      {/* DIALOG: ALERTA DE CAPACIDAD EXCEDIDA */}
      <Dialog open={openCapacityWarning} onClose={() => setOpenCapacityWarning(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 800, bgcolor: 'warning.dark', color: 'white', display: 'flex', alignItems: 'center', gap: 1 }}>
          <Warning color="inherit" /> Capacidad de Tanque Excedida
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          {capacityWarningData && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <Typography variant="body1">
                La cantidad a recibir de leche (<strong>{capacityWarningData.amountToReceive.toLocaleString()} Lts</strong>) supera la capacidad disponible del tanque seleccionado (<strong>{capacityWarningData.selectedBinName}</strong>), que es de solo <strong>{capacityWarningData.availableCapacity.toLocaleString()} Lts</strong>.
              </Typography>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 1 }}>
                Distribución Sugerida de Capacidad:
              </Typography>
              <Box sx={{ border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: 2, p: 2, bgcolor: 'rgba(255, 255, 255, 0.02)' }}>
                {capacityWarningData.suggestedDistribution.map((dist, idx) => (
                  <Box key={dist.binId} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5, borderBottom: idx < capacityWarningData.suggestedDistribution.length - 1 ? '1px solid rgba(255, 255, 255, 0.05)' : 'none' }}>
                    <Typography variant="body2">{dist.binName}</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{dist.cantidad.toLocaleString()} Lts</Typography>
                  </Box>
                ))}
              </Box>
              <Typography variant="caption" color="text.secondary">
                * Si selecciona <strong>Distribuir Automáticamente</strong>, el sistema dividirá el registro en la recepción para llenar el tanque actual y dirigir el excedente al siguiente tanque con espacio disponible.
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenCapacityWarning(false)}>Cancelar</Button>
          <Button variant="outlined" color="warning" onClick={handleForceCapacitySubmit}>Forzar en este Tanque</Button>
          <Button variant="contained" color="warning" onClick={handleApplyCapacityDistribution}>Distribuir Automáticamente</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
