import { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Box,
  Button,
  TextField,
  Card,
  CardContent,
  IconButton,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  List,
  ListItem,
  ListItemText,
  Chip,
  Alert,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Add,
  Remove,
  Delete,
  Storefront,
  LockOpen,
  Lock,
  Receipt,
  PointOfSale,
  Person,
} from '@mui/icons-material';
import { apiFetch, useAuthStore } from '../store/useAuthStore';

export default function POS() {
  const systemTimezone = useAuthStore((state) => state.systemTimezone);
  // Estado de caja
  const [cajaAbierta, setCajaAbierta] = useState(false);
  const [cajaInfo, setCajaInfo] = useState<any>(null);

  // Modales de caja
  const [openApertura, setOpenApertura] = useState(false);
  const [montoApertura, setMontoApertura] = useState('50000');

  const [openCierre, setOpenCierre] = useState(false);
  const [montoArqueo, setMontoArqueo] = useState('');
  const [cierreResumen, setCierreResumen] = useState<any>(null);

  // Catálogo de Productos y Lotes
  const [productos, setProductos] = useState<any[]>([]);
  const [lotes, setLotes] = useState<any[]>([]);
  const [categoriasList, setCategoriasList] = useState<any[]>([]);
  const [categoriaFiltrada, setCategoriaFiltrada] = useState('TODOS');
  const [searchQuery, setSearchQuery] = useState('');

  // Carrito de compras
  // Array de { producto: any, lote: any, cantidad: number }
  const [cart, setCart] = useState<any[]>([]);

  // Información del cliente
  const [clienteNombre, setClienteNombre] = useState('Consumidor Final');
  const [clienteDocumento, setClienteDocumento] = useState('S/D');
  const [metodoPago, setMetodoPago] = useState('EFECTIVO');

  // Modal de Ticket Exitoso
  const [openTicket, setOpenTicket] = useState(false);
  const [ticketVenta, setTicketVenta] = useState<any>(null);

  // Errores
  const [errorPOS, setErrorPOS] = useState<string | null>(null);

  useEffect(() => {
    verificarEstadoCaja();
    cargarCatalogos();
  }, []);

  const verificarEstadoCaja = async () => {
    try {
      const res = await apiFetch('/pos/caja/estado');
      setCajaAbierta(res.abierta);
      setCajaInfo(res.caja);
    } catch (e) {
      console.error(e);
    }
  };

  const cargarCatalogos = async () => {
    try {
      const prodData = await apiFetch('/productos');
      const activeProducts = prodData.filter(
        (p: any) =>
          p.estado === 'ACTIVO' &&
          (p.tipoProducto === 'PRODUCTO_TERMINADO' || p.tipoProducto === 'PT')
      );
      setProductos(activeProducts);

      const loteData = await apiFetch('/lotes');
      setLotes(loteData.filter((l: any) => l.estado === 'APROBADO' && l.cantidadActual > 0));

      const catData = await apiFetch('/categorias');
      const activeCatNames = new Set(activeProducts.map((p: any) => p.categoria?.toUpperCase()));
      setCategoriasList(
        catData.filter((c: any) => activeCatNames.has(c.nombre?.toUpperCase()))
      );
    } catch (e) {
      console.error(e);
    }
  };

  const handleAbrirCaja = async () => {
    try {
      setErrorPOS(null);
      const res = await apiFetch('/pos/caja/apertura', {
        method: 'POST',
        body: JSON.stringify({ montoApertura }),
      });
      setCajaAbierta(true);
      setCajaInfo(res);
      setOpenApertura(false);
    } catch (e: any) {
      setErrorPOS(e.message);
    }
  };

  const handleCerrarCajaSubmit = async () => {
    if (!montoArqueo) {
      setErrorPOS('El monto contado es obligatorio.');
      return;
    }
    try {
      setErrorPOS(null);
      const res = await apiFetch('/pos/caja/cierre', {
        method: 'POST',
        body: JSON.stringify({ montoArqueo }),
      });
      setCierreResumen(res.resumen);
      setCajaAbierta(false);
      setCajaInfo(null);
      setCart([]);
      setMontoArqueo('');
    } catch (e: any) {
      setErrorPOS(e.message);
    }
  };

  // Escaneo de código de barras (con soporte para código combinado Producto + Lote o FIFO por defecto)
  const handleBarcodeScan = (code: string) => {
    if (!cajaAbierta || !code.trim()) return;

    const query = code.trim();
    let productQuery = query.toLowerCase();
    let specificLoteNumber: string | null = null;

    // Detectar código de barras combinado usando separadores #, @, |, :, -, / o espacio
    const delimiterMatch = query.match(/^(.*?)[#@|:\-\s/](.*)$/);
    if (delimiterMatch) {
      productQuery = delimiterMatch[1].trim().toLowerCase();
      specificLoteNumber = delimiterMatch[2].trim();
    }

    const prod = productos.find(
      (p) =>
        p.codigoBarras === productQuery ||
        p.sku.toLowerCase() === productQuery ||
        String(p.prodId) === productQuery
    );

    if (prod) {
      if (specificLoteNumber) {
        // Buscar el lote específico que coincide con el código de barras escaneado
        const exactLote = lotes.find(
          (l) =>
            l.productoId === prod.id &&
            l.numeroLote.toLowerCase() === specificLoteNumber!.toLowerCase() &&
            l.estado === 'APROBADO' &&
            l.cantidadActual > 0
        );

        if (exactLote) {
          addToCart(prod, exactLote);
          setSearchQuery('');
        } else {
          setErrorPOS(
            `El lote específico "${specificLoteNumber}" para el producto "${prod.descripcion}" no está aprobado o no tiene stock disponible.`
          );
        }
      } else {
        // Comportamiento FIFO por defecto si no se especifica lote en el código de barras
        const lotesProd = lotes
          .filter((l) => l.productoId === prod.id && l.estado === 'APROBADO' && l.cantidadActual > 0)
          .sort((a, b) => new Date(a.fechaVencimiento).getTime() - new Date(b.fechaVencimiento).getTime());

        if (lotesProd.length > 0) {
          addToCart(prod, lotesProd[0]);
          setSearchQuery('');
        } else {
          setErrorPOS(`El producto "${prod.descripcion}" no tiene lotes aprobados con stock disponible.`);
        }
      }
    } else {
      setErrorPOS(`No se encontró ningún producto con el código de barras o SKU: "${productQuery}"`);
    }
  };

  // Filtrar productos
  const categorias = [
    'TODOS',
    ...(categoriasList.length > 0
      ? categoriasList.map((c) => c.nombre)
      : Array.from(new Set(productos.map((p) => p.categoria))))
  ];

  const productosFiltrados = productos.filter((p) => {
    const coincideCat = categoriaFiltrada === 'TODOS' || p.categoria === categoriaFiltrada;
    
    // Si la búsqueda tiene un delimitador, extraemos solo la parte del producto para filtrar
    let q = searchQuery.trim().toLowerCase();
    const delimiterMatch = q.match(/^(.*?)[#@|:\-\s/](.*)$/);
    if (delimiterMatch) {
      q = delimiterMatch[1].trim().toLowerCase();
    }

    const coincideBusqueda =
      p.descripcion.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      (p.codigoBarras && p.codigoBarras.includes(q)) ||
      (p.prodId && String(p.prodId) === q);
    return coincideCat && coincideBusqueda;
  });

  // Agregar al carrito
  const addToCart = (producto: any, lote: any) => {
    setErrorPOS(null);
    if (lote.cantidadActual <= 0) {
      setErrorPOS('Este lote ya no cuenta con stock disponible.');
      return;
    }

    const itemExistente = cart.find((item) => item.lote.id === lote.id);

    if (itemExistente) {
      if (itemExistente.cantidad + 1 > lote.cantidadActual) {
        setErrorPOS('No se puede vender más de la existencia del lote.');
        return;
      }
      setCart(
        cart.map((item) =>
          item.lote.id === lote.id ? { ...item, cantidad: item.cantidad + 1 } : item
        )
      );
    } else {
      setCart([...cart, { producto, lote, cantidad: 1 }]);
    }
  };

  const updateQuantity = (loteId: string, delta: number) => {
    setCart(
      cart
        .map((item) => {
          if (item.lote.id === loteId) {
            const nuevaCant = item.cantidad + delta;
            if (nuevaCant > item.lote.cantidadActual) {
              setErrorPOS(`Stock del lote superado (${item.lote.cantidadActual} max)`);
              return item;
            }
            return { ...item, cantidad: nuevaCant };
          }
          return item;
        })
        .filter((item) => item.cantidad > 0)
    );
  };

  const removeFromCart = (loteId: string) => {
    setCart(cart.filter((item) => item.lote.id !== loteId));
  };

  // Cálculos totales
  const getSubtotal = () => {
    return cart.reduce((sum, item) => sum + item.producto.precioVenta * item.cantidad, 0);
  };

  const getIVA = () => {
    return cart.reduce((sum, item) => sum + item.producto.precioVenta * item.producto.iva * item.cantidad, 0);
  };

  const getTotal = () => {
    return getSubtotal() + getIVA();
  };

  // Checkout
  const handlePagar = async () => {
    if (cart.length === 0) {
      setErrorPOS('El carrito de compras está vacío.');
      return;
    }

    try {
      setErrorPOS(null);
      const postBody = {
        clienteNombre,
        clienteDocumento,
        metodoPago,
        productos: cart.map((item) => ({
          productoId: item.producto.id,
          loteId: item.lote.id,
          cantidad: item.cantidad,
          precioUnitario: item.producto.precioVenta,
        })),
      };

      const ventaProcesada = await apiFetch('/pos/venta', {
        method: 'POST',
        body: JSON.stringify(postBody),
      });

      setTicketVenta(ventaProcesada);
      setOpenTicket(true);
      setCart([]);
      setClienteNombre('Consumidor Final');
      setClienteDocumento('S/D');
      // Recargar stock de catálogos
      cargarCatalogos();
    } catch (e: any) {
      setErrorPOS(e.message);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val);
  };

  return (
    <Box sx={{ p: 3, height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
      {/* Header Caja Control */}
      <Paper className="glass-panel" sx={{ p: 2, mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <PointOfSale sx={{ fontSize: 32, color: 'primary.main' }} />
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800 }}>Punto de Venta (POS)</Typography>
            <Typography variant="caption" color="text.secondary">
              Caja control: {cajaAbierta ? `ABIERTA con base inicial de ${formatCurrency(cajaInfo?.montoApertura || 0)}` : 'CERRADA'}
            </Typography>
          </Box>
        </Box>

        <Box>
          {cajaAbierta ? (
            <Button
              variant="outlined"
              color="error"
              startIcon={<Lock />}
              onClick={() => {
                setCierreResumen(null);
                setOpenCierre(true);
              }}
            >
              Cerrar Turno de Caja
            </Button>
          ) : (
            <Button
              variant="contained"
              color="secondary"
              startIcon={<LockOpen />}
              onClick={() => setOpenApertura(true)}
            >
              Abrir Caja Registradora
            </Button>
          )}
        </Box>
      </Paper>

      {errorPOS && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setErrorPOS(null)}>
          {errorPOS}
        </Alert>
      )}

      {cierreResumen && (
        <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setCierreResumen(null)}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Resumen del Cierre Procesado:</Typography>
          Ventas Totales: {formatCurrency(cierreResumen.ventasTotales)} | Esperado en Caja: {formatCurrency(cierreResumen.montoEsperado)} | Reportado: {formatCurrency(cierreResumen.montoReal)} |
          <strong style={{ color: cierreResumen.diferencia < 0 ? '#f43f5e' : '#10b981', marginLeft: '6px' }}>
            Diferencia: {formatCurrency(cierreResumen.diferencia)}
          </strong>
        </Alert>
      )}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '7fr 5fr' }, gap: 3, flexGrow: 1, minHeight: 0 }}>
        {/* Left Side: Product Tactile Catalog */}
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Paper className="glass-panel" sx={{ p: 2, flexGrow: 1, display: 'flex', flexDirection: 'column', minHeight: 400 }}>
            {/* Search and Filters */}
            <Box sx={{ mb: 2 }}>
              <TextField
                fullWidth
                placeholder="Buscar por descripción, SKU o código de barras..."
                variant="outlined"
                size="small"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleBarcodeScan(searchQuery);
                  }
                }}
                sx={{ mb: 2 }}
              />
              <Tabs
                value={categoriaFiltrada}
                onChange={(_, val) => setCategoriaFiltrada(val)}
                variant="scrollable"
                scrollButtons="auto"
                sx={{
                  borderBottom: 1,
                  borderColor: 'divider',
                  '& .MuiTab-root': { fontWeight: 600, fontSize: '0.85rem' },
                }}
              >
                {categorias.map((cat) => (
                  <Tab key={cat} label={cat} value={cat} />
                ))}
              </Tabs>
            </Box>

            {/* Product Card Grid */}
            <Box sx={{ flexGrow: 1, overflowY: 'auto', maxHeight: '420px', pr: 1 }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                {productosFiltrados.map((prod) => {
                  // Buscar lotes correspondientes a este producto
                  const lotesProd = lotes.filter((l) => l.productoId === prod.id);

                  return (
                    <Box key={prod.id}>
                      <Card
                        onClick={() => {
                          if (!cajaAbierta) {
                            setErrorPOS('Abra la caja para registrar ventas.');
                            return;
                          }
                          const lotesProdDisponibles = lotes
                            .filter((l) => l.productoId === prod.id && l.estado === 'APROBADO' && l.cantidadActual > 0)
                            .sort((a, b) => new Date(a.fechaVencimiento).getTime() - new Date(b.fechaVencimiento).getTime());
                          if (lotesProdDisponibles.length > 0) {
                            addToCart(prod, lotesProdDisponibles[0]);
                          } else {
                            setErrorPOS(`El producto "${prod.descripcion}" no tiene lotes aprobados con stock disponible.`);
                          }
                        }}
                        sx={{
                          backgroundColor: 'rgba(15, 23, 42, 0.4)',
                          border: '1px solid rgba(255, 255, 255, 0.05)',
                          cursor: 'pointer',
                          '&:hover': {
                            borderColor: 'primary.main',
                            backgroundColor: 'rgba(15, 23, 42, 0.6)',
                            transform: 'translateY(-2px)',
                            boxShadow: '0 4px 20px rgba(2, 132, 199, 0.15)',
                          },
                          transition: 'all 0.2s ease',
                        }}
                      >
                        <CardContent sx={{ p: 2 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                              {prod.descripcion}
                            </Typography>
                            <Typography variant="subtitle2" color="primary.light" sx={{ fontWeight: 800 }}>
                              {formatCurrency(prod.precioVenta)}
                            </Typography>
                          </Box>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                            SKU: {prod.sku} | Temp: {prod.temperaturaMin}°C a {prod.temperaturaMax}°C
                          </Typography>

                          {/* Stock status indicator */}
                          <Box sx={{ mt: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="caption" color="text.secondary">
                              Stock Total: {lotesProd.reduce((sum, l) => sum + l.cantidadActual, 0)} U
                            </Typography>
                            {lotesProd.length === 0 ? (
                              <Chip label="Sin Stock" size="small" color="error" sx={{ height: 18, fontSize: '0.65rem', fontWeight: 700 }} />
                            ) : (
                              <Chip label="Disponible" size="small" color="success" sx={{ height: 18, fontSize: '0.65rem', fontWeight: 700 }} />
                            )}
                          </Box>
                        </CardContent>
                      </Card>
                    </Box>
                  );
                })}
              </Box>
            </Box>
          </Paper>
        </Box>

        {/* Right Side: Shopping Cart & Checkout */}
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Paper className="glass-panel" sx={{ p: 3, flexGrow: 1, display: 'flex', flexDirection: 'column', minHeight: 400 }}>
            <Typography variant="h6" sx={{ fontWeight: 800, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Receipt /> Ticket de Venta Actual
            </Typography>
            <Divider sx={{ mb: 2 }} />

            {/* Client Form */}
            <Box sx={{ display: 'flex', gap: 1.5, mb: 2 }}>
              <TextField
                label="Cliente"
                size="small"
                value={clienteNombre}
                onChange={(e) => setClienteNombre(e.target.value)}
                sx={{ flexGrow: 2 }}
                slotProps={{
                  input: { startAdornment: <Person sx={{ mr: 1, color: 'text.secondary' }} /> }
                }}
              />
              <TextField
                label="NIT/Cédula"
                size="small"
                value={clienteDocumento}
                onChange={(e) => setClienteDocumento(e.target.value)}
                sx={{ flexGrow: 1 }}
              />
            </Box>

            <FormControl fullWidth size="small" sx={{ mb: 3 }}>
              <InputLabel>Método de Pago</InputLabel>
              <Select
                value={metodoPago}
                label="Método de Pago"
                onChange={(e) => setMetodoPago(e.target.value)}
              >
                <MenuItem value="EFECTIVO">Efectivo</MenuItem>
                <MenuItem value="TARJETA">Tarjeta Débito/Crédito</MenuItem>
                <MenuItem value="TRANSFERENCIA">Transferencia Bancaria</MenuItem>
              </Select>
            </FormControl>

            {/* Cart Items List */}
            <Box sx={{ flexGrow: 1, overflowY: 'auto', maxHeight: '200px', mb: 2 }}>
              {cart.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4, opacity: 0.5 }}>
                  <Typography variant="body2">El ticket está vacío.</Typography>
                  <Typography variant="caption">Haga clic en los lotes de productos de la izquierda para agregar.</Typography>
                </Box>
              ) : (
                <List disablePadding>
                  {cart.map((item) => (
                    <ListItem
                      key={item.lote.id}
                      sx={{
                        px: 0,
                        py: 1,
                        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                        display: 'flex',
                        flexDirection: { xs: 'column', sm: 'row' },
                        alignItems: { xs: 'flex-start', sm: 'center' },
                        gap: 1
                      }}
                    >
                      <ListItemText
                        primary={<Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{item.producto.descripcion}</Typography>}
                        secondary={`Lote: ${item.lote.numeroLote} | Unitario: ${formatCurrency(item.producto.precioVenta)}`}
                        sx={{ width: '100%', m: 0 }}
                      />
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, alignSelf: { xs: 'flex-end', sm: 'center' } }}>
                        <IconButton size="small" onClick={() => updateQuantity(item.lote.id, -1)}>
                          <Remove fontSize="small" />
                        </IconButton>
                        <Typography sx={{ fontWeight: 700, px: 0.5 }}>{item.cantidad}</Typography>
                        <IconButton size="small" onClick={() => updateQuantity(item.lote.id, 1)}>
                          <Add fontSize="small" />
                        </IconButton>
                        <IconButton size="small" color="error" onClick={() => removeFromCart(item.lote.id)}>
                          <Delete fontSize="small" />
                        </IconButton>
                      </Box>
                    </ListItem>
                  ))}
                </List>
              )}
            </Box>

            {/* Calculations */}
            <Box sx={{ mt: 'auto', pt: 2, borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">Subtotal</Typography>
                <Typography variant="body2">{formatCurrency(getSubtotal())}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">IVA</Typography>
                <Typography variant="body2">{formatCurrency(getIVA())}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>Total a Pagar</Typography>
                <Typography variant="h6" color="secondary.main" sx={{ fontWeight: 800 }}>
                  {formatCurrency(getTotal())}
                </Typography>
              </Box>

              <Button
                fullWidth
                variant="contained"
                size="large"
                disabled={!cajaAbierta || cart.length === 0}
                onClick={handlePagar}
                sx={{
                  py: 1.5,
                  fontWeight: 700,
                  fontSize: '1rem',
                  background: 'linear-gradient(135deg, #10b981 0%, #0284c7 100%)',
                }}
              >
                {!cajaAbierta ? 'Abra la caja para pagar' : 'Registrar Venta (Pagar)'}
              </Button>
            </Box>
          </Paper>
        </Box>
      </Box>

      {/* MODAL APERTURA */}
      <Dialog open={openApertura} onClose={() => setOpenApertura(false)}>
        <DialogTitle sx={{ fontWeight: 700 }}>Apertura de Caja Registradora</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Ingrese el monto base en efectivo para iniciar el arqueo del turno.
          </Typography>
          <TextField
            fullWidth
            label="Monto Inicial en Efectivo"
            type="number"
            value={montoApertura}
            onChange={(e) => setMontoApertura(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenApertura(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleAbrirCaja}>Confirmar Apertura</Button>
        </DialogActions>
      </Dialog>

      {/* MODAL TURN CLOSING ARQUEO */}
      <Dialog open={openCierre} onClose={() => setOpenCierre(false)}>
        <DialogTitle sx={{ fontWeight: 700 }}>Arqueo y Cierre de Caja</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Realice el conteo físico del efectivo total existente en la caja y digítelo a continuación.
          </Typography>
          <TextField
            fullWidth
            label="Efectivo Físico Contado"
            type="number"
            value={montoArqueo}
            onChange={(e) => setMontoArqueo(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenCierre(false)}>Volver al POS</Button>
          <Button variant="contained" color="error" onClick={handleCerrarCajaSubmit}>Confirmar Cierre</Button>
        </DialogActions>
      </Dialog>

      {/* MODAL TICKET IMPRESIÓN */}
      <Dialog open={openTicket} onClose={() => setOpenTicket(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ textAlign: 'center', fontWeight: 800, pb: 0 }}>
          <Storefront color="primary" sx={{ fontSize: 40, mb: 1 }} /><br />
          LÁCTEOS ERP S.A.S
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <Box sx={{ borderBottom: '1px dashed rgba(255,255,255,0.2)', pb: 1, mb: 2, textAlign: 'center' }}>
            <Typography variant="caption" sx={{ display: 'block' }}>RUT: 900.123.456-1</Typography>
            <Typography variant="caption" sx={{ display: 'block' }}>Sucursal: {ticketVenta?.sucursal?.nombre}</Typography>
            <Typography variant="caption" sx={{ display: 'block' }}>TICKET: {ticketVenta?.ticketNumero}</Typography>
            <Typography variant="caption" sx={{ display: 'block' }}>Fecha: {ticketVenta ? new Date(ticketVenta.fecha).toLocaleString('es-CO', { timeZone: systemTimezone }) : ''}</Typography>
          </Box>

          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>Cliente: {ticketVenta?.clienteNombre}</Typography>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>Cédula/NIT: {ticketVenta?.clienteDocumento}</Typography>
            <Typography variant="body2">Met. Pago: {ticketVenta?.metodoPago}</Typography>
          </Box>

          <Divider sx={{ my: 1 }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Detalle de Compra:</Typography>
          {ticketVenta?.detalles?.map((det: any) => (
            <Box key={det.id} sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', mb: 0.5 }}>
              <Typography sx={{ fontSize: '0.85rem' }}>{det.producto?.descripcion} (L: {det.lote?.numeroLote}) x{det.cantidad}</Typography>
              <Typography sx={{ fontWeight: 700, fontSize: '0.85rem' }}>{formatCurrency(det.total)}</Typography>
            </Box>
          ))}

          <Box sx={{ borderTop: '1px dashed rgba(255,255,255,0.2)', mt: 2, pt: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
              <Typography>Subtotal:</Typography>
              <Typography>{formatCurrency(ticketVenta?.subtotal || 0)}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
              <Typography>IVA:</Typography>
              <Typography>{formatCurrency(ticketVenta?.iva || 0)}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>TOTAL:</Typography>
              <Typography variant="subtitle1" sx={{ fontWeight: 800 }} color="secondary.main">
                {formatCurrency(ticketVenta?.total || 0)}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ textAlign: 'center', mt: 3 }}>
            <Typography variant="caption" sx={{ fontStyle: 'italic' }}>¡Gracias por preferir nuestros productos frescos!</Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', pb: 3 }}>
          <Button variant="contained" onClick={() => setOpenTicket(false)}>Aceptar y Continuar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
