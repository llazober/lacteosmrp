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
} from '@mui/material';
import {
  LocalShipping,
  Check,
  AddShoppingCart,
  FactCheck,
  Edit,
  Delete,
} from '@mui/icons-material';
import { apiFetch, useAuthStore } from '../store/useAuthStore';

export default function Compras() {
  const usuario = useAuthStore((state) => state.usuario);

  // Datos
  const [compras, setCompras] = useState<any[]>([]);
  const [proveedores, setProveedores] = useState<any[]>([]);
  const [sucursales, setSucursales] = useState<any[]>([]);
  const [productos, setProductos] = useState<any[]>([]);

  // Modales
  const [openOC, setOpenOC] = useState(false);
  const [ocForm, setOcForm] = useState({
    proveedorId: '',
    sucursalId: '',
    productoId: '',
    cantidad: '',
    costoUnitario: '',
    fechaEntrega: '',
  });

  const [openRecepcion, setOpenRecepcion] = useState(false);
  const [selectedOC, setSelectedOC] = useState<any>(null);
  const [recepcionLotes, setRecepcionLotes] = useState<any[]>([]); // Array de datos de lote por cada detalle de OC

  const [openEditarOC, setOpenEditarOC] = useState(false);
  const [editarOcForm, setEditarOcForm] = useState({
    proveedorId: '',
    sucursalId: '',
    productoId: '',
    cantidad: '',
    costoUnitario: '',
    fechaEntrega: '',
  });
  const [openEliminarOC, setOpenEliminarOC] = useState(false);

  // Notificaciones
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Buscador de órdenes de compra
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      const data = await apiFetch('/compras');
      setCompras(data);

      const prov = await apiFetch('/proveedores');
      setProveedores(prov.filter((p: any) => p.estado === 'ACTIVO'));

      const suc = await apiFetch('/sucursales');
      setSucursales(suc);

      const prod = await apiFetch('/productos');
      setProductos(prod.filter((p: any) => p.estado === 'ACTIVO'));
    } catch (e) {
      console.error(e);
    }
  };

  const handleOCSubmit = async () => {
    try {
      setErrorMsg(null);
      const body = {
        proveedorId: ocForm.proveedorId,
        sucursalId: ocForm.sucursalId,
        fechaEntrega: ocForm.fechaEntrega || null,
        productos: [
          {
            productoId: ocForm.productoId,
            cantidad: parseFloat(ocForm.cantidad),
            costoUnitario: parseFloat(ocForm.costoUnitario),
          },
        ],
      };

      await apiFetch('/compras', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      setSuccessMsg('Orden de Compra registrada exitosamente.');
      setOpenOC(false);
      cargarDatos();
    } catch (e: any) {
      setErrorMsg(e.message);
    }
  };

  const handleOpenEditarOC = (oc: any) => {
    setSelectedOC(oc);
    const primerDetalle = oc.detalles[0] || {};
    setEditarOcForm({
      proveedorId: oc.proveedorId,
      sucursalId: oc.sucursalId,
      productoId: primerDetalle.productoId || '',
      cantidad: primerDetalle.cantidad ? String(primerDetalle.cantidad) : '',
      costoUnitario: primerDetalle.costoUnitario ? String(primerDetalle.costoUnitario) : '',
      fechaEntrega: oc.fechaEntrega ? oc.fechaEntrega.split('T')[0] : '',
    });
    setOpenEditarOC(true);
  };

  const handleEditarOCSubmit = async () => {
    try {
      setErrorMsg(null);
      await apiFetch(`/compras/${selectedOC.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          proveedorId: editarOcForm.proveedorId,
          sucursalId: editarOcForm.sucursalId,
          fechaEntrega: editarOcForm.fechaEntrega || null,
          productos: [
            {
              productoId: editarOcForm.productoId,
              cantidad: parseFloat(editarOcForm.cantidad),
              costoUnitario: parseFloat(editarOcForm.costoUnitario),
            },
          ],
        }),
      });
      setSuccessMsg('Orden de Compra actualizada exitosamente.');
      setOpenEditarOC(false);
      setSelectedOC(null);
      cargarDatos();
    } catch (e: any) {
      setErrorMsg(e.message);
    }
  };

  const handleOpenEliminarOC = (oc: any) => {
    setSelectedOC(oc);
    setOpenEliminarOC(true);
  };

  const handleEliminarOCSubmit = async () => {
    try {
      setErrorMsg(null);
      const res = await apiFetch(`/compras/${selectedOC.id}`, {
        method: 'DELETE',
      });
      setSuccessMsg(res.message || 'Orden de Compra eliminada exitosamente.');
      setOpenEliminarOC(false);
      setSelectedOC(null);
      cargarDatos();
    } catch (e: any) {
      setErrorMsg(e.message);
    }
  };

  const handleAprobarOC = async (id: string) => {
    try {
      setErrorMsg(null);
      await apiFetch(`/compras/${id}/aprobar`, {
        method: 'PUT',
      });
      setSuccessMsg('Orden de Compra aprobada para recepción.');
      cargarDatos();
    } catch (e: any) {
      setErrorMsg(e.message);
    }
  };

  const handleAbrirRecepcion = (oc: any) => {
    setSelectedOC(oc);
    // Inicializar inputs de lote para cada detalle
    const lotesInit = oc.detalles.map((det: any) => {
      const cantRecibidaPrevia = det.cantidadRecibida || 0;
      const restante = Math.max(0, det.cantidad - cantRecibidaPrevia);
      return {
        productoId: det.productoId,
        productoNombre: det.producto.descripcion,
        numeroLote: `LOT-${oc.numeroOrden.replace('OC-', '')}-${det.producto.sku.substring(0,3).toUpperCase()}`,
        fechaProduccion: new Date().toISOString().substring(0, 10),
        fechaVencimiento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10),
        tempMin: det.producto.temperaturaMin,
        tempMax: det.producto.temperaturaMax,
        cantidadOrdenada: det.cantidad,
        cantidadRecibidaPrevia: cantRecibidaPrevia,
        cantidadRecibida: restante,
      };
    });
    setRecepcionLotes(lotesInit);
    setOpenRecepcion(true);
  };

  const handleUpdateLoteInfo = (idx: number, field: string, val: any) => {
    const updated = [...recepcionLotes];
    updated[idx] = { ...updated[idx], [field]: val };
    setRecepcionLotes(updated);
  };

  const handleRecepcionSubmit = async () => {
    try {
      setErrorMsg(null);
      await apiFetch(`/compras/${selectedOC.id}/recepcion`, {
        method: 'PUT',
        body: JSON.stringify({ lotes: recepcionLotes }),
      });
      setSuccessMsg('Recepcion de mercadería registrada. Los lotes ya están en stock.');
      setOpenRecepcion(false);
      setSelectedOC(null);
      cargarDatos();
    } catch (e: any) {
      setErrorMsg(e.message);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val);
  };

  return (
    <Box sx={{ p: 3, height: '100%', overflowY: 'auto' }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5 }}>
            Abastecimiento y Compras
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Genere órdenes de compra, asigne aprobaciones de gerencia y registre recepciones y lotes de proveedores.
          </Typography>
        </Box>

        <Button
          variant="contained"
          color="primary"
          startIcon={<AddShoppingCart />}
          onClick={() => {
            setOcForm({
              proveedorId: '',
              sucursalId: usuario?.sucursalId || '',
              productoId: '',
              cantidad: '',
              costoUnitario: '',
              fechaEntrega: '',
            });
            setOpenOC(true);
          }}
        >
          Crear Orden de Compra
        </Button>
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

      <Box sx={{ mb: 3 }}>
        <TextField
          size="small"
          label="Buscar por Número de OC o Proveedor"
          variant="outlined"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{ width: 350, backgroundColor: 'rgba(255,255,255,0.03)' }}
        />
      </Box>

      <Paper className="glass-panel" sx={{ p: 3 }}>
        <Box sx={{ overflowX: 'auto', width: '100%' }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Orden de Compra</TableCell>
                <TableCell>Proveedor</TableCell>
                <TableCell>Sucursal Destino</TableCell>
                <TableCell>Detalle Productos</TableCell>
                <TableCell>Valor Total</TableCell>
                <TableCell>Fecha Solicitud</TableCell>
                <TableCell>Fecha Entrega</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell>Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(() => {
                const query = searchQuery.toLowerCase();
                const filtered = compras.filter((oc) =>
                  oc.numeroOrden.toLowerCase().includes(query) ||
                  oc.proveedor.nombre.toLowerCase().includes(query) ||
                  oc.detalles.some((det: any) => det.producto.descripcion.toLowerCase().includes(query))
                );

                if (filtered.length === 0) {
                  return (
                    <TableRow>
                      <TableCell colSpan={9} align="center">No se encontraron órdenes de compra.</TableCell>
                    </TableRow>
                  );
                }

                return filtered.map((oc) => (
                  <TableRow key={oc.id}>
                    <TableCell sx={{ fontWeight: 700 }}>{oc.numeroOrden}</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>{oc.proveedor.nombre}</TableCell>
                    <TableCell>{oc.sucursal.nombre}</TableCell>
                    <TableCell>
                      {oc.detalles.map((det: any) => (
                        <div key={det.id}>
                          {det.producto.descripcion} (Recibido: {det.cantidadRecibida || 0} / {det.cantidad})
                        </div>
                      ))}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>{formatCurrency(oc.total)}</TableCell>
                    <TableCell>{new Date(oc.createdAt).toLocaleDateString('es-CO')}</TableCell>
                    <TableCell sx={{ color: oc.fechaEntrega && new Date(oc.fechaEntrega) < new Date() && oc.estado !== 'RECIBIDA' ? 'error.main' : 'inherit' }}>
                      {oc.fechaEntrega ? new Date(oc.fechaEntrega).toLocaleDateString('es-CO') : 'No especificada'}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={oc.estado}
                        color={
                          oc.estado === 'RECIBIDA'
                            ? 'success'
                            : oc.estado === 'APROBADA'
                            ? 'warning'
                            : oc.estado === 'PENDIENTE'
                            ? 'primary'
                            : 'default'
                        }
                        size="small"
                        sx={{ fontWeight: 700 }}
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        {oc.estado === 'PENDIENTE' && (usuario?.rol === 'ADMINISTRADOR' || usuario?.rol === 'SUPERVISOR') && (
                          <Button
                            variant="outlined"
                            size="small"
                            color="success"
                            startIcon={<Check />}
                            onClick={() => handleAprobarOC(oc.id)}
                          >
                            Aprobar
                          </Button>
                        )}
                        {(oc.estado === 'APROBADA' || oc.estado === 'PARCIAL') && (
                          <Button
                            variant="contained"
                            size="small"
                            color="secondary"
                            startIcon={<LocalShipping />}
                            onClick={() => handleAbrirRecepcion(oc)}
                          >
                            Recibir Lotes
                          </Button>
                        )}

                        {oc.estado !== 'RECIBIDA' && (usuario?.rol === 'ADMINISTRADOR' || usuario?.rol === 'SUPERVISOR' || usuario?.rol === 'ALMACEN' || usuario?.rol === 'GERENTE_TIENDA') && (
                          <Tooltip title="Editar Orden de Compra">
                            <IconButton
                              size="small"
                              color="info"
                              onClick={() => handleOpenEditarOC(oc)}
                            >
                              <Edit fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}

                        {oc.estado !== 'RECIBIDA' && (usuario?.rol === 'ADMINISTRADOR' || usuario?.rol === 'SUPERVISOR') && (
                          <Tooltip title="Eliminar Orden de Compra">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleOpenEliminarOC(oc)}
                            >
                              <Delete fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              })()}
            </TableBody>
          </Table>
        </Box>
      </Paper>

      {/* MODAL CREAR ORDEN COMPRA */}
      <Dialog open={openOC} onClose={() => setOpenOC(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 800 }}>Crear Orden de Compra</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <FormControl fullWidth size="small">
            <InputLabel>Proveedor</InputLabel>
            <Select
              value={ocForm.proveedorId}
              label="Proveedor"
              onChange={(e) => setOcForm({ ...ocForm, proveedorId: e.target.value })}
            >
              {proveedores.map((p) => (
                <MenuItem key={p.id} value={p.id}>{p.nombre}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth size="small">
            <InputLabel>Sucursal Destino</InputLabel>
            <Select
              value={ocForm.sucursalId}
              label="Sucursal Destino"
              onChange={(e) => setOcForm({ ...ocForm, sucursalId: e.target.value })}
            >
              {sucursales.map((s) => (
                <MenuItem key={s.id} value={s.id}>{s.nombre}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth size="small">
            <InputLabel>Producto</InputLabel>
            <Select
              value={ocForm.productoId}
              label="Producto"
              onChange={(e) => {
                const prodSelected = productos.find((p) => p.id === e.target.value);
                setOcForm({
                  ...ocForm,
                  productoId: e.target.value,
                  costoUnitario: prodSelected ? String(prodSelected.costo) : '',
                });
              }}
            >
              {productos.map((p) => (
                <MenuItem key={p.id} value={p.id}>{p.descripcion} (Costo: {formatCurrency(p.costo)})</MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            fullWidth
            label="Cantidad"
            type="number"
            size="small"
            value={ocForm.cantidad}
            onChange={(e) => setOcForm({ ...ocForm, cantidad: e.target.value })}
          />

          <TextField
            fullWidth
            label="Costo Unitario Pactado"
            type="number"
            size="small"
            value={ocForm.costoUnitario}
            onChange={(e) => setOcForm({ ...ocForm, costoUnitario: e.target.value })}
          />

          <TextField
            fullWidth
            label="Fecha Estimada de Entrega"
            type="date"
            size="small"
            value={ocForm.fechaEntrega}
            onChange={(e) => setOcForm({ ...ocForm, fechaEntrega: e.target.value })}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenOC(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleOCSubmit}>Emitir Orden</Button>
        </DialogActions>
      </Dialog>

      {/* MODAL REGISTRAR RECEPCION DE OC CON LOTES */}
      <Dialog open={openRecepcion} onClose={() => setOpenRecepcion(false)} fullWidth maxWidth="md">
        <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
          <FactCheck color="secondary" /> Recepción y Creación de Lote Trazable - OC {selectedOC?.numeroOrden}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Especifique los datos de control del lote ingresante de cada producto para asegurar el monitoreo de cadena de frío y vencimientos (FEFO).
          </Typography>

          {recepcionLotes.map((lote, index) => (
            <Box key={index} sx={{ mb: 4, p: 2, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 0.5, color: 'primary.light' }}>
                Producto: {lote.productoNombre}
              </Typography>
              <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
                Cantidad Ordenada: <strong>{lote.cantidadOrdenada}</strong> | Recibida anteriormente: <strong>{lote.cantidadRecibidaPrevia}</strong> | Restante: <strong>{lote.cantidadOrdenada - lote.cantidadRecibidaPrevia}</strong>
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 2 }}>
                <Box>
                  <TextField
                    fullWidth
                    label="Código de Lote"
                    size="small"
                    value={lote.numeroLote}
                    onChange={(e) => handleUpdateLoteInfo(index, 'numeroLote', e.target.value)}
                  />
                </Box>
                <Box>
                  <TextField
                    fullWidth
                    label="Fecha Producción"
                    type="date"
                    size="small"
                    value={lote.fechaProduccion}
                    onChange={(e) => handleUpdateLoteInfo(index, 'fechaProduccion', e.target.value)}
                  />
                </Box>
                <Box>
                  <TextField
                    fullWidth
                    label="Fecha Vencimiento"
                    type="date"
                    size="small"
                    value={lote.fechaVencimiento}
                    onChange={(e) => handleUpdateLoteInfo(index, 'fechaVencimiento', e.target.value)}
                  />
                </Box>

                <Box>
                  <TextField
                    fullWidth
                    label="Temperatura Mín (°C)"
                    type="number"
                    size="small"
                    value={lote.tempMin}
                    onChange={(e) => handleUpdateLoteInfo(index, 'tempMin', e.target.value)}
                  />
                </Box>
                <Box>
                  <TextField
                    fullWidth
                    label="Temperatura Máx (°C)"
                    type="number"
                    size="small"
                    value={lote.tempMax}
                    onChange={(e) => handleUpdateLoteInfo(index, 'tempMax', e.target.value)}
                  />
                </Box>
                <Box>
                  <TextField
                    fullWidth
                    label="Cantidad Recibida"
                    type="number"
                    size="small"
                    value={lote.cantidadRecibida}
                    onChange={(e) => handleUpdateLoteInfo(index, 'cantidadRecibida', e.target.value)}
                  />
                </Box>
              </Box>
            </Box>
          ))}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => { setOpenRecepcion(false); setSelectedOC(null); }}>Cancelar</Button>
          <Button variant="contained" color="secondary" onClick={handleRecepcionSubmit}>Confirmar Recepción</Button>
        </DialogActions>
      </Dialog>
      {/* DIALOG: EDITAR ORDEN COMPRA */}
      <Dialog open={openEditarOC} onClose={() => { setOpenEditarOC(false); setSelectedOC(null); }} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 800 }}>Editar Orden de Compra</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <FormControl fullWidth size="small">
            <InputLabel>Proveedor</InputLabel>
            <Select
              value={editarOcForm.proveedorId}
              label="Proveedor"
              onChange={(e) => setEditarOcForm({ ...editarOcForm, proveedorId: e.target.value })}
            >
              {proveedores.map((p) => (
                <MenuItem key={p.id} value={p.id}>{p.nombre}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth size="small">
            <InputLabel>Sucursal Destino</InputLabel>
            <Select
              value={editarOcForm.sucursalId}
              label="Sucursal Destino"
              onChange={(e) => setEditarOcForm({ ...editarOcForm, sucursalId: e.target.value })}
            >
              {sucursales.map((s) => (
                <MenuItem key={s.id} value={s.id}>{s.nombre}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth size="small">
            <InputLabel>Producto</InputLabel>
            <Select
              value={editarOcForm.productoId}
              label="Producto"
              onChange={(e) => {
                const prodSelected = productos.find((p) => p.id === e.target.value);
                setEditarOcForm({
                  ...editarOcForm,
                  productoId: e.target.value,
                  costoUnitario: prodSelected ? String(prodSelected.costo) : '',
                });
              }}
            >
              {productos.map((p) => (
                <MenuItem key={p.id} value={p.id}>{p.descripcion} (Costo: {formatCurrency(p.costo)})</MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            fullWidth
            label="Cantidad"
            type="number"
            size="small"
            value={editarOcForm.cantidad}
            onChange={(e) => setEditarOcForm({ ...editarOcForm, cantidad: e.target.value })}
          />

          <TextField
            fullWidth
            label="Costo Unitario Pactado"
            type="number"
            size="small"
            value={editarOcForm.costoUnitario}
            onChange={(e) => setEditarOcForm({ ...editarOcForm, costoUnitario: e.target.value })}
          />

          <TextField
            fullWidth
            label="Fecha Estimada de Entrega"
            type="date"
            size="small"
            value={editarOcForm.fechaEntrega}
            onChange={(e) => setEditarOcForm({ ...editarOcForm, fechaEntrega: e.target.value })}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => { setOpenEditarOC(false); setSelectedOC(null); }}>Cancelar</Button>
          <Button variant="contained" onClick={handleEditarOCSubmit}>Actualizar</Button>
        </DialogActions>
      </Dialog>

      {/* DIALOG: CONFIRMAR ELIMINACIÓN DE ORDEN COMPRA */}
      <Dialog open={openEliminarOC} onClose={() => { setOpenEliminarOC(false); setSelectedOC(null); }} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 800 }}>¿Eliminar Orden de Compra?</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {selectedOC && (
            <Typography variant="body1">
              ¿Está seguro que desea eliminar la orden de compra <strong>{selectedOC.numeroOrden}</strong>?
              <br /><br />
              Esta acción no se puede deshacer y fallará si la orden ya ha sido recibida.
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => { setOpenEliminarOC(false); setSelectedOC(null); }}>Cancelar</Button>
          <Button variant="contained" color="error" onClick={handleEliminarOCSubmit}>Eliminar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
