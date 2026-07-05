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
  TablePagination,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Checkbox,
  Alert,
} from '@mui/material';
import {
  Search,
  Visibility,
  LocalShipping,
  Receipt,
  Store,
  Close,
  Print,
} from '@mui/icons-material';
import dayjs from 'dayjs';
import { apiFetch, useAuthStore } from '../store/useAuthStore';

interface RecepcionDetalle {
  id: string;
  productoId: string;
  cantidad: number;
  costoUnitario: number;
  loteId?: string;
  producto: {
    sku: string;
    descripcion: string;
    tipoProducto: string;
    prodId?: number;
  };
  lote?: {
    numeroLote: string;
    fechaProduccion: string;
    fechaVencimiento: string;
    tempMin?: number;
    tempMax?: number;
  };
}

interface Recepcion {
  id: string;
  numeroRecibo: string;
  fecha: string;
  facturaNumero?: string;
  packingSlip?: string;
  observaciones?: string;
  ordenCompra?: {
    numeroOrden: string;
  };
  proveedor?: {
    nombre: string;
  };
  sucursal: {
    nombre: string;
  };
  recibidoPor: {
    nombre: string;
  };
  detalles: RecepcionDetalle[];
  facturaCompra?: {
    id: string;
    numeroFactura: string;
  };
}

export default function MaterialesRecibidos() {
  const usuario = useAuthStore((state) => state.usuario);

  if (
    usuario?.rol !== 'ADMINISTRADOR' &&
    usuario?.rol !== 'SUPERVISOR' &&
    usuario?.rol !== 'ALMACEN' &&
    usuario?.rol !== 'CALIDAD' &&
    usuario?.rol !== 'CONTROL_CALIDAD' &&
    !usuario?.permisos?.includes('VER_COMPRAS')
  ) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="error">No tiene permisos para acceder a esta página.</Alert>
      </Box>
    );
  }

  const [recepciones, setRecepciones] = useState<Recepcion[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50); // Mostrando 50 records por defecto

  // Dialog / Modal details
  const [selectedRecepcion, setSelectedRecepcion] = useState<Recepcion | null>(null);

  // Barcode printing states
  const [openBarcodeDialog, setOpenBarcodeDialog] = useState(false);
  const [barcodeDialogData, setBarcodeDialogData] = useState<any[] | null>(null);
  const [printQuantity, setPrintQuantity] = useState<number>(1);
  const [selectedLotsForPrint, setSelectedLotsForPrint] = useState<string[]>([]);

  useEffect(() => {
    setSelectedLotsForPrint([]);
  }, [selectedRecepcion]);

  useEffect(() => {
    cargarRecepciones();
  }, [searchTerm]);

  const cargarRecepciones = async () => {
    setLoading(true);
    try {
      const url = searchTerm
        ? `/recepciones?search=${encodeURIComponent(searchTerm)}`
        : '/recepciones';
      const data = await apiFetch(url);
      setRecepciones(data || []);
      setPage(0); // Reset page on search change
    } catch (error) {
      console.error('Error al cargar recepciones:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePage = (_: any, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(val);
  };

  const handlePrintBarcode = (itemsToPrint: any[], qty: number) => {
    if (!itemsToPrint || itemsToPrint.length === 0) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    let labelsHtml = '';
    for (const item of itemsToPrint) {
      const barcodeVal = item.numeroLote;
      const barcodeUrl = `https://barcode.tec-it.com/barcode.ashx?data=${encodeURIComponent(
        barcodeVal
      )}&code=Code128`;
      
      for (let i = 0; i < qty; i++) {
        labelsHtml += `
          <div class="label-page">
            <div class="title">${item.productoNombre}</div>
            <div class="subtitle">SKU: ${item.sku} | Lote: ${item.numeroLote}</div>
            <img class="barcode-img" src="${barcodeUrl}" alt="Barcode" />
            <div class="code-text">${barcodeVal}</div>
          </div>
        `;
      }
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Imprimir Lotes</title>
          <style>
            @page {
              size: auto;
              margin: 0mm;
            }
            body {
              font-family: 'Courier New', Courier, monospace;
              text-align: center;
              margin: 0;
              padding: 0;
            }
            .label-page {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              padding: 20px;
              page-break-after: always;
            }
            .label-page:last-child {
              page-break-after: avoid;
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

  // Paginated and filtered lists
  const paginatedRecepciones = recepciones.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  return (
    <Box sx={{ p: 4, height: '100%', overflowY: 'auto', color: '#fff' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
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
          <Receipt sx={{ fontSize: 32, color: '#fff' }} />
        </Box>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}>
            Historial de Materiales Recibidos
          </Typography>
          <Typography variant="subtitle2" color="text.secondary">
            Registro consolidado de todas las recepciones de inventario y lotes
          </Typography>
        </Box>
      </Box>

      {/* Buscador */}
      <Box sx={{ mb: 4 }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Buscar por recibo, factura, guía, OC o proveedor..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          slotProps={{
            input: {
              startAdornment: <Search sx={{ color: 'text.secondary', mr: 1 }} />,
            },
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              backgroundColor: 'rgba(15, 23, 42, 0.3)',
              borderRadius: 3,
              border: '1px solid rgba(255, 255, 255, 0.08)',
            },
          }}
        />
      </Box>

      {/* Main Table Card */}
      <Paper
        sx={{
          background: 'rgba(30, 41, 59, 0.5)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 4,
          overflow: 'hidden',
        }}
      >
        {loading ? (
          <Box sx={{ py: 8, textAlign: 'center', color: 'text.secondary' }}>
            <Typography>Cargando registros...</Typography>
          </Box>
        ) : paginatedRecepciones.length === 0 ? (
          <Box sx={{ py: 8, textAlign: 'center', color: 'text.secondary' }}>
            <LocalShipping sx={{ fontSize: 48, mb: 1, opacity: 0.5 }} />
            <Typography>No se encontraron recepciones de materiales.</Typography>
          </Box>
        ) : (
          <>
            <Table>
              <TableHead sx={{ backgroundColor: 'rgba(15, 23, 42, 0.5)' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Recibo</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Fecha</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Orden Compra</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Proveedor</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Sucursal</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Documentación</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Recibido Por</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, color: 'text.secondary' }}>Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedRecepciones.map((rec) => (
                  <TableRow
                    key={rec.id}
                    sx={{
                      '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.02)' },
                      '& .MuiTableCell-root': { verticalAlign: 'middle' },
                    }}
                  >
                    <TableCell>
                      <Chip
                        label={rec.numeroRecibo}
                        sx={{
                          fontWeight: 800,
                          backgroundColor: 'rgba(59, 130, 246, 0.15)',
                          color: '#60a5fa',
                          border: '1px solid rgba(59, 130, 246, 0.3)',
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      {dayjs(rec.fecha).format('DD/MM/YYYY HH:mm')}
                    </TableCell>
                    <TableCell>
                      {rec.ordenCompra ? (
                        <Chip
                          label={rec.ordenCompra.numeroOrden}
                          variant="outlined"
                          size="small"
                          sx={{ fontWeight: 600, color: '#93c5fd' }}
                        />
                      ) : (
                        <Chip
                          label="Ad-hoc"
                          variant="outlined"
                          size="small"
                          sx={{
                            fontWeight: 600,
                            color: '#10b981',
                            borderColor: '#047857',
                            backgroundColor: 'rgba(16, 185, 129, 0.05)',
                          }}
                        />
                      )}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>
                      {rec.proveedor ? rec.proveedor.nombre : 'Proveedor Genérico'}
                    </TableCell>
                    <TableCell>{rec.sucursal.nombre}</TableCell>
                    <TableCell sx={{ fontSize: '0.8rem' }}>
                      {rec.facturaNumero && (
                        <div>
                          <strong>Factura:</strong> {rec.facturaNumero}
                        </div>
                      )}
                      {rec.packingSlip && (
                        <div>
                          <strong>Guía/Packing:</strong> {rec.packingSlip}
                        </div>
                      )}
                      {rec.facturaCompra ? (
                        <Box sx={{ mt: 0.5 }}>
                          <Chip
                            label={`Facturado (${rec.facturaCompra.numeroFactura})`}
                            size="small"
                            color="success"
                            sx={{ fontWeight: 700, fontSize: '0.7rem' }}
                          />
                        </Box>
                      ) : (
                        <Box sx={{ mt: 0.5 }}>
                          <Chip
                            label="Pendiente Facturar"
                            size="small"
                            color="warning"
                            variant="outlined"
                            sx={{ fontWeight: 700, fontSize: '0.7rem' }}
                          />
                        </Box>
                      )}
                    </TableCell>
                    <TableCell>{rec.recibidoPor.nombre}</TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                        <Button
                          variant="contained"
                          size="small"
                          startIcon={<Visibility />}
                          onClick={() => setSelectedRecepcion(rec)}
                          sx={{
                            background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                            textTransform: 'none',
                            fontWeight: 700,
                            borderRadius: 2,
                          }}
                        >
                          Ver Detalle
                        </Button>
                        {/* Facturación centralizada en Cuentas por Pagar */}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <TablePagination
              component="div"
              count={recepciones.length}
              page={page}
              onPageChange={handleChangePage}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              rowsPerPageOptions={[25, 50, 100]}
              labelRowsPerPage="Registros por página:"
              sx={{
                color: '#fff',
                '& .MuiTablePagination-selectIcon': { color: '#fff' },
                '& .MuiTablePagination-actions': { color: '#fff' },
              }}
            />
          </>
        )}
      </Paper>

      {/* Detalle de Recepción Modal Dialog */}
      <Dialog
        open={!!selectedRecepcion}
        onClose={() => setSelectedRecepcion(null)}
        maxWidth="md"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              backgroundColor: '#1e293b',
              backgroundImage: 'none',
              color: '#fff',
              borderRadius: 4,
              border: '1px solid rgba(255, 255, 255, 0.08)',
            },
          },
        }}
      >
        {selectedRecepcion && (
          <>
            <DialogTitle
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontWeight: 800,
                fontSize: '1.25rem',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Store sx={{ color: '#3b82f6' }} />
                <span>Detalle de Recepción: {selectedRecepcion.numeroRecibo}</span>
              </Box>
              <Button
                onClick={() => setSelectedRecepcion(null)}
                sx={{ minWidth: 'auto', p: 0.5, color: 'text.secondary' }}
              >
                <Close />
              </Button>
            </DialogTitle>

            <DialogContent sx={{ p: 3 }}>
              {/* Metadata Info Panel */}
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(12, 1fr)',
                  gap: 3,
                  mb: 4,
                  p: 2.5,
                  borderRadius: 3,
                  backgroundColor: 'rgba(15, 23, 42, 0.3)',
                  border: '1px solid rgba(255, 255, 255, 0.04)',
                }}
              >
                <Box sx={{ gridColumn: { xs: 'span 12', sm: 'span 4' } }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    Proveedor
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 800 }}>
                    {selectedRecepcion.proveedor ? selectedRecepcion.proveedor.nombre : 'Proveedor Genérico'}
                  </Typography>
                </Box>
                <Box sx={{ gridColumn: { xs: 'span 6', sm: 'span 4' } }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    Sucursal Destino
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {selectedRecepcion.sucursal.nombre}
                  </Typography>
                </Box>
                <Box sx={{ gridColumn: { xs: 'span 6', sm: 'span 4' } }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    Fecha y Hora
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {dayjs(selectedRecepcion.fecha).format('DD/MM/YYYY HH:mm')}
                  </Typography>
                </Box>

                <Box sx={{ gridColumn: { xs: 'span 6', sm: 'span 4' } }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    Orden de Compra
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {selectedRecepcion.ordenCompra?.numeroOrden || 'Ad-hoc (Sin OC)'}
                  </Typography>
                </Box>
                <Box sx={{ gridColumn: { xs: 'span 6', sm: 'span 4' } }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    Factura Nro.
                  </Typography>
                  <Typography variant="body2">{selectedRecepcion.facturaNumero || '-'}</Typography>
                </Box>
                <Box sx={{ gridColumn: { xs: 'span 6', sm: 'span 4' } }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    Guía de Despacho
                  </Typography>
                  <Typography variant="body2">{selectedRecepcion.packingSlip || '-'}</Typography>
                </Box>

                <Box sx={{ gridColumn: { xs: 'span 12' } }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    Registrado Por
                  </Typography>
                  <Typography variant="body2">{selectedRecepcion.recibidoPor.nombre}</Typography>
                </Box>

                {selectedRecepcion.observaciones && (
                  <Box sx={{ gridColumn: { xs: 'span 12' }, mt: 1 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                      Observaciones
                    </Typography>
                    <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                      "{selectedRecepcion.observaciones}"
                    </Typography>
                  </Box>
                )}
              </Box>

              {/* Items List */}
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#93c5fd', mb: 2 }}>
                Ítems Recibidos
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                {selectedRecepcion.detalles.map((det) => (
                  <Paper
                    key={det.id}
                    elevation={0}
                    sx={{
                      p: 2.5,
                      borderRadius: 3,
                      backgroundColor: 'rgba(15, 23, 42, 0.25)',
                      border: '1px solid rgba(255, 255, 255, 0.05)',
                    }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: 1.5,
                        mb: 1.5,
                      }}
                    >
                      <Box>
                        <Typography variant="body1" sx={{ fontWeight: 800, color: '#93c5fd' }}>
                          {det.producto.descripcion}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          SKU: <strong>{det.producto.sku}</strong> | Tipo:{' '}
                          <Chip
                            label={det.producto.tipoProducto}
                            size="small"
                            sx={{ height: 18, fontSize: '0.65rem', fontWeight: 800 }}
                          />
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="body1" sx={{ fontWeight: 800 }}>
                          {det.cantidad} {det.producto.tipoProducto === 'MNA' ? 'U' : 'Kg/U'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Costo: {formatCurrency(det.costoUnitario)} | Total:{' '}
                          {formatCurrency(det.cantidad * det.costoUnitario)}
                        </Typography>
                      </Box>
                    </Box>

                    {det.lote && (
                      <>
                        <Divider sx={{ my: 1.5, borderColor: 'rgba(255,255,255,0.05)' }} />
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Checkbox
                                size="small"
                                checked={selectedLotsForPrint.includes(det.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedLotsForPrint([...selectedLotsForPrint, det.id]);
                                  } else {
                                    setSelectedLotsForPrint(selectedLotsForPrint.filter(id => id !== det.id));
                                  }
                                }}
                                sx={{ color: '#10b981', '&.Mui-checked': { color: '#10b981' }, p: 0.5 }}
                              />
                              <Typography variant="caption" sx={{ color: '#10b981', fontWeight: 800 }}>
                                📋 SELECCIONAR LOTE PARA IMPRIMIR
                              </Typography>
                            </Box>
                            <Button
                              variant="contained"
                              size="small"
                              startIcon={<Print />}
                              onClick={() => {
                                setBarcodeDialogData([{
                                  sku: det.producto.sku,
                                  prodId: det.producto.prodId,
                                  numeroLote: det.lote?.numeroLote || '',
                                  productoNombre: det.producto.descripcion,
                                  tipoProducto: det.producto.tipoProducto,
                                }]);
                                setPrintQuantity(1);
                                setOpenBarcodeDialog(true);
                              }}
                              sx={{
                                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                textTransform: 'none',
                                fontWeight: 700,
                                borderRadius: 2,
                                height: 28,
                                fontSize: '0.75rem',
                              }}
                            >
                              Imprimir Barcode
                            </Button>
                          </Box>
                          <Box
                            sx={{
                              display: 'grid',
                              gridTemplateColumns: 'repeat(12, 1fr)',
                              gap: 2,
                              backgroundColor: 'rgba(255, 255, 255, 0.02)',
                              p: 1.5,
                              borderRadius: 2,
                            }}
                          >
                            <Box sx={{ gridColumn: { xs: 'span 12', sm: 'span 4' } }}>
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                Lote Nro
                              </Typography>
                              <Typography variant="body2" sx={{ fontWeight: 800, color: '#10b981' }}>
                                {det.lote.numeroLote}
                              </Typography>
                            </Box>
                            <Box sx={{ gridColumn: { xs: 'span 6', sm: 'span 4' } }}>
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                F. Producción
                              </Typography>
                              <Typography variant="body2">
                                {dayjs(det.lote.fechaProduccion).format('DD/MM/YYYY')}
                              </Typography>
                            </Box>
                            <Box sx={{ gridColumn: { xs: 'span 6', sm: 'span 4' } }}>
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                F. Vencimiento
                              </Typography>
                              <Typography variant="body2">
                                {dayjs(det.lote.fechaVencimiento).format('DD/MM/YYYY')}
                              </Typography>
                            </Box>

                            {det.lote.tempMin !== undefined && det.lote.tempMax !== undefined && (
                              <Box sx={{ gridColumn: { xs: 'span 12' }, mt: 0.5 }}>
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                  Rango Temperatura Admitido
                                </Typography>
                                <Typography variant="body2">
                                  {det.lote.tempMin} °C - {det.lote.tempMax} °C
                                </Typography>
                              </Box>
                            )}
                          </Box>
                        </Box>
                      </>
                    )}
                  </Paper>
                ))}
              </Box>
            </DialogContent>

            <DialogActions
              sx={{
                p: 2.5,
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                justifyContent: 'space-between',
              }}
            >
              <Box>
                {selectedRecepcion.facturaCompra ? (
                  <Chip
                    label={`Facturado con Factura N° ${selectedRecepcion.facturaCompra.numeroFactura}`}
                    color="success"
                    sx={{ fontWeight: 700 }}
                  />
                ) : (
                  <Chip
                    label="Pendiente de Facturar"
                    color="warning"
                    variant="outlined"
                    sx={{ fontWeight: 700 }}
                  />
                )}
              </Box>
              <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                {selectedLotsForPrint.length > 0 && (
                  <Button
                    variant="contained"
                    startIcon={<Print />}
                    onClick={() => {
                      const selectedItems = selectedRecepcion.detalles
                        .filter((d) => d.lote && selectedLotsForPrint.includes(d.id))
                        .map((d) => ({
                          sku: d.producto.sku,
                          prodId: d.producto.prodId,
                          numeroLote: d.lote?.numeroLote || '',
                          productoNombre: d.producto.descripcion,
                          tipoProducto: d.producto.tipoProducto,
                        }));
                      setBarcodeDialogData(selectedItems);
                      setPrintQuantity(1);
                      setOpenBarcodeDialog(true);
                    }}
                    sx={{
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      textTransform: 'none',
                      fontWeight: 700,
                      borderRadius: 2,
                    }}
                  >
                    Imprimir Seleccionados ({selectedLotsForPrint.length})
                  </Button>
                )}
                <Button
                  variant="outlined"
                  onClick={() => setSelectedRecepcion(null)}
                  sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
                >
                  Cerrar
                </Button>
              </Box>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* DIALOG: VER CODIGO BARRAS LOTE */}
      <Dialog
        open={openBarcodeDialog}
        onClose={() => setOpenBarcodeDialog(false)}
        fullWidth
        maxWidth="xs"
        slotProps={{
          paper: {
            sx: {
              backgroundColor: '#1e293b',
              backgroundImage: 'none',
              color: '#fff',
              borderRadius: 4,
              border: '1px solid rgba(255, 255, 255, 0.08)',
            },
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 800 }}>Código de Barras del Lote</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2.5, pt: 2, pb: 3 }}>
          {barcodeDialogData && barcodeDialogData.length > 0 && (
            <>
              {barcodeDialogData.length === 1 ? (
                <>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, textAlign: 'center' }}>
                    {barcodeDialogData[0].productoNombre}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center', mb: 1 }}>
                    <Chip label={`SKU: ${barcodeDialogData[0].sku}`} size="small" sx={{ color: '#fff', backgroundColor: 'rgba(255,255,255,0.08)' }} />
                    <Chip label={`Lote: ${barcodeDialogData[0].numeroLote}`} size="small" color="primary" />
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
                        barcodeDialogData[0].numeroLote
                      )}&code=Code128`}
                      alt="Código de Barras"
                      style={{ maxWidth: '100%', height: 'auto', display: 'block' }}
                    />
                  </Box>

                  <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 700, mt: 1, color: '#94a3b8' }}>
                    {barcodeDialogData[0].numeroLote}
                  </Typography>

                  <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', px: 2 }}>
                    Este código contiene únicamente el número de lote para identificación de Materia Prima / Insumo.
                  </Typography>
                </>
              ) : (
                <>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, textAlign: 'center', color: '#93c5fd' }}>
                    Se imprimirán {barcodeDialogData.length} lotes
                  </Typography>
                  <Box
                    sx={{
                      width: '100%',
                      maxHeight: '200px',
                      overflowY: 'auto',
                      backgroundColor: 'rgba(15, 23, 42, 0.3)',
                      borderRadius: 2,
                      p: 1.5,
                      border: '1px solid rgba(255, 255, 255, 0.05)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 1,
                    }}
                  >
                    {barcodeDialogData.map((item, index) => (
                      <Box
                        key={index}
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          borderBottom: index < barcodeDialogData.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                          pb: index < barcodeDialogData.length - 1 ? 0.75 : 0,
                        }}
                      >
                        <Box sx={{ maxWidth: '65%' }}>
                          <Typography variant="caption" sx={{ fontWeight: 800, display: 'block', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                            {item.productoNombre}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                            SKU: {item.sku}
                          </Typography>
                        </Box>
                        <Chip label={item.numeroLote} size="small" color="primary" sx={{ height: 20, fontSize: '0.7rem' }} />
                      </Box>
                    ))}
                  </Box>

                  <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', px: 2 }}>
                    Se generarán códigos de barras conteniendo únicamente el número de lote para cada uno de los productos.
                  </Typography>
                </>
              )}

              <Divider sx={{ width: '100%', borderColor: 'rgba(255,255,255,0.08)', my: 1 }} />

              <TextField
                label="Cantidad de etiquetas a imprimir por lote"
                type="number"
                value={printQuantity}
                onChange={(e) => setPrintQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                slotProps={{
                  htmlInput: { min: 1 },
                }}
                fullWidth
                sx={{
                  '& .MuiOutlinedInput-root': {
                    color: '#fff',
                    backgroundColor: 'rgba(15, 23, 42, 0.3)',
                    borderRadius: 3,
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                  },
                  '& .MuiInputLabel-root': {
                    color: '#94a3b8',
                  },
                }}
              />

              {barcodeDialogData.length > 1 && (
                <Typography variant="caption" sx={{ color: '#10b981', fontWeight: 600 }}>
                  Total a imprimir: {barcodeDialogData.length * printQuantity} etiquetas
                </Typography>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2.5, display: 'flex', gap: 1.5, borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <Button
            onClick={() => setOpenBarcodeDialog(false)}
            variant="outlined"
            sx={{ flex: 1, textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
          >
            Cerrar
          </Button>
          <Button
            onClick={() => {
              handlePrintBarcode(barcodeDialogData || [], printQuantity);
              setOpenBarcodeDialog(false);
            }}
            variant="contained"
            color="success"
            sx={{
              flex: 1,
              textTransform: 'none',
              fontWeight: 700,
              borderRadius: 2,
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            }}
          >
            Imprimir Código
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
