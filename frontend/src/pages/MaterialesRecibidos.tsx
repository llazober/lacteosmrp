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
} from '@mui/material';
import {
  Search,
  Visibility,
  LocalShipping,
  Receipt,
  Store,
  Close,
} from '@mui/icons-material';
import dayjs from 'dayjs';
import { apiFetch } from '../store/useAuthStore';

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
  const [recepciones, setRecepciones] = useState<Recepcion[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50); // Mostrando 50 records por defecto

  // Dialog / Modal details
  const [selectedRecepcion, setSelectedRecepcion] = useState<Recepcion | null>(null);

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
                          <Typography variant="caption" sx={{ color: '#10b981', fontWeight: 800 }}>
                            📋 INFORMACIÓN DE LOTE GENERADO
                          </Typography>
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
              <Button
                variant="outlined"
                onClick={() => setSelectedRecepcion(null)}
                sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
              >
                Cerrar
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
}
