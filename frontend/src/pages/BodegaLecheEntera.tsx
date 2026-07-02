import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  CircularProgress,
  Chip,
  Divider,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  LocalLaundryService as TankIcon,
  InfoOutlined as InfoIcon,
  History as HistoryIcon,
} from '@mui/icons-material';
import { apiFetch } from '../store/useAuthStore';
import dayjs from 'dayjs';

interface ComponenteMezcla {
  id: string;
  loteOrigen: {
    numeroLote: string;
    fechaVencimiento: string;
  };
  cantidadUsada: number;
  proporcion: number;
}

interface MezclaLeche {
  id: string;
  createdAt: string;
  loteMixto: {
    numeroLote: string;
    cantidadInicial: number;
  };
  ordenProduccion: {
    numeroOrden: string;
    receta: {
      nombre: string;
    };
  };
  componentes: ComponenteMezcla[];
}

interface LoteLeche {
  id: string;
  numeroLote: string;
  cantidadActual: number;
  cantidadInicial: number;
  fechaProduccion: string;
  fechaVencimiento: string;
  estado: string;
  color: string;
}

interface EstadoTanque {
  capacidadMax: number;
  totalLitros: number;
  lotes: LoteLeche[];
  mezclas: MezclaLeche[];
  bins: { id: string; codigo: string; nombre: string; capacidad: number; unidad: string }[];
}

export default function BodegaLecheEntera() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<EstadoTanque | null>(null);
  const [selectedLote, setSelectedLote] = useState<LoteLeche | null>(null);
  const [hoveredLoteId, setHoveredLoteId] = useState<string | null>(null);

  const fetchTankState = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/inventario/tanque-leche');
      setData(res);
      if (res.lotes && res.lotes.length > 0) {
        setSelectedLote(res.lotes[0]);
      } else {
        setSelectedLote(null);
      }
    } catch (err) {
      console.error('Error al cargar estado del tanque:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTankState();
  }, []);

  if (loading && !data) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: '80vh' }}>
        <CircularProgress size={60} thickness={4} />
      </Box>
    );
  }

  const { capacidadMax = 10000, totalLitros = 0, lotes = [], mezclas = [], bins = [] } = data || {};
  // Si hay bins, el primer bin define el silo principal
  const binPrincipal = bins.length > 0 ? bins[0] : null;
  const capacidadSilo = binPrincipal?.capacidad || capacidadMax;
  const porcentajeOcupado = (totalLitros / capacidadSilo) * 100;
  const disponible = capacidadSilo - totalLitros;

  // Render SVG Layers for the Tank
  const tankHeight = 340;
  const tankWidth = 180;
  const tankLeft = 40;
  const tankRight = tankLeft + tankWidth;
  const tankBottomY = 410;
  const tankTopY = tankBottomY - tankHeight;
  const rx = tankWidth / 2;
  const ry = 18; // vertical radius for 3D ellipse perspective

  // We build layers from the bottom up.
  let currentY = tankBottomY;
  const renderedLayers: React.ReactNode[] = [];

  lotes.forEach((lote) => {
    const layerHeight = (lote.cantidadActual / capacidadSilo) * tankHeight;
    const yTop = currentY - layerHeight;
    const isHovered = hoveredLoteId === lote.id;
    const isSelected = selectedLote?.id === lote.id;

    // Draw the main rectangular cylinder segment
    renderedLayers.push(
      <g 
        key={lote.id}
        onMouseEnter={() => setHoveredLoteId(lote.id)}
        onMouseLeave={() => setHoveredLoteId(null)}
        onClick={() => setSelectedLote(lote)}
        style={{ cursor: 'pointer' }}
      >
        {/* Layer body */}
        <rect
          x={tankLeft}
          y={yTop}
          width={tankWidth}
          height={layerHeight}
          fill={lote.color}
          opacity={isHovered ? 0.95 : isSelected ? 0.9 : 0.75}
          style={{ transition: 'opacity 0.2s, fill 0.2s' }}
        />
        {/* Bottom Ellipse of the layer */}
        <ellipse
          cx={tankLeft + rx}
          cy={currentY}
          rx={rx}
          ry={ry}
          fill={lote.color}
          opacity={isHovered ? 0.95 : isSelected ? 0.95 : 0.8}
        />
        {/* Top Ellipse of the layer */}
        <ellipse
          cx={tankLeft + rx}
          cy={yTop}
          rx={rx}
          ry={ry}
          fill={lote.color}
          opacity={isHovered ? 1.0 : isSelected ? 1.0 : 0.85}
          stroke="rgba(255,255,255,0.2)"
          strokeWidth="0.5"
        />
      </g>
    );

    currentY = yTop;
  });

  return (
    <Box sx={{ p: 4, height: '100%', overflowY: 'auto', color: '#e2e8f0' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, background: 'linear-gradient(135deg, #38bdf8 0%, #3b82f6 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <TankIcon sx={{ fontSize: 36, color: '#38bdf8' }} />
            Bodega de Leche Entera Fluida
          </Typography>
          <Typography variant="body2" sx={{ mt: 0.5, color: 'text.secondary' }}>
            Visualización en tiempo real del nivel y mezcla de lotes en el Silo de Recepción.
            {binPrincipal && (
              <> Capacidad configurada: <strong>{capacidadSilo.toLocaleString()} {binPrincipal.unidad}</strong></>
            )}
          </Typography>
        </Box>
        <Button
          variant="contained"
          color="primary"
          startIcon={<RefreshIcon />}
          onClick={fetchTankState}
          sx={{
            background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
            boxShadow: '0 4px 20px rgba(2, 132, 199, 0.3)',
            borderRadius: 2.5,
            px: 3,
            '&:hover': {
              background: 'linear-gradient(135deg, #0369a1 0%, #075985 100%)',
            }
          }}
        >
          Actualizar Estado
        </Button>
      </Box>

      {/* Main Grid via CSS grid */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(12, 1fr)' }, gap: 4 }}>
        {/* Tank Visualization Card */}
        <Box sx={{ gridColumn: { xs: 'span 12', md: 'span 5' } }}>
          <Card
            sx={{
              background: 'rgba(15, 23, 42, 0.65)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 4,
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
              overflow: 'visible',
              height: '100%',
            }}
          >
            <CardContent sx={{ p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Typography variant="h6" sx={{ fontWeight: 750, color: '#f8fafc', mb: 1, width: '100%', textAlign: 'center' }}>
                {binPrincipal ? `${binPrincipal.codigo} — ${binPrincipal.nombre}` : 'Silo de Almacenamiento'}
              </Typography>
              {binPrincipal && (
                <Typography variant="caption" sx={{ color: '#64748b', mb: 2, display: 'block', textAlign: 'center', fontFamily: 'monospace' }}>
                  Cap. máx: {capacidadSilo.toLocaleString()} {binPrincipal.unidad}
                </Typography>
              )}

              {/* The Tank SVG */}
              <Box sx={{ position: 'relative', width: 260, height: 480 }}>
                <svg width="100%" height="100%" viewBox="0 0 260 480" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <linearGradient id="tankGlass" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="rgba(255, 255, 255, 0.15)" />
                      <stop offset="25%" stopColor="rgba(255, 255, 255, 0.05)" />
                      <stop offset="75%" stopColor="rgba(255, 255, 255, 0.0)" />
                      <stop offset="90%" stopColor="rgba(255, 255, 255, 0.1)" />
                      <stop offset="100%" stopColor="rgba(255, 255, 255, 0.25)" />
                    </linearGradient>
                  </defs>

                  {/* Tank Background Guide / Empty State */}
                  <rect x={tankLeft} y={tankTopY} width={tankWidth} height={tankHeight} fill="rgba(30, 41, 59, 0.4)" rx="0" />
                  <ellipse cx={tankLeft + rx} cy={tankBottomY} rx={rx} ry={ry} fill="rgba(30, 41, 59, 0.6)" />
                  <ellipse cx={tankLeft + rx} cy={tankTopY} rx={rx} ry={ry} fill="rgba(30, 41, 59, 0.4)" stroke="rgba(255,255,255,0.08)" />

                  {/* Render Liquid Layers */}
                  {renderedLayers}

                  {/* Glass Cylinder Reflection / Cover */}
                  <rect
                    x={tankLeft}
                    y={tankTopY}
                    width={tankWidth}
                    height={tankHeight}
                    fill="url(#tankGlass)"
                    pointerEvents="none"
                  />
                  {/* Outlines of the tank structure */}
                  <path
                    d={`M ${tankLeft} ${tankTopY} L ${tankLeft} ${tankBottomY} A ${rx} ${ry} 0 0 0 ${tankRight} ${tankBottomY} L ${tankRight} ${tankTopY}`}
                    stroke="rgba(255, 255, 255, 0.25)"
                    strokeWidth="3.5"
                    fill="none"
                    pointerEvents="none"
                  />
                  {/* Top Rim of the Silo */}
                  <ellipse
                    cx={tankLeft + rx}
                    cy={tankTopY}
                    rx={rx}
                    ry={ry}
                    stroke="rgba(255, 255, 255, 0.25)"
                    strokeWidth="3.5"
                    fill="none"
                    pointerEvents="none"
                  />

                  {/* Scale Markers — dynamic based on bin capacity */}
                  {Array.from({ length: 5 }, (_, i) => Math.round((capacidadSilo / 5) * (i + 1))).map((liters) => {
                    const yVal = tankBottomY - (liters / capacidadSilo) * tankHeight;
                    return (
                      <g key={liters} opacity="0.6">
                        <line x1={tankRight + 4} y1={yVal} x2={tankRight + 12} y2={yVal} stroke="#94a3b8" strokeWidth="1.5" />
                        <text x={tankRight + 16} y={yVal + 4} fill="#94a3b8" fontSize="10.5" fontFamily="monospace" fontWeight="bold">
                          {liters.toLocaleString()}L
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </Box>

              {/* Status info bar */}
              <Box sx={{ width: '100%', mt: 3, px: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" sx={{ color: '#94a3b8', fontWeight: 600 }}>Nivel Actual</Typography>
                  <Typography variant="body2" sx={{ color: '#f8fafc', fontWeight: 700 }}>
                    {totalLitros.toLocaleString()} {binPrincipal?.unidad || 'L'} / {capacidadSilo.toLocaleString()} {binPrincipal?.unidad || 'L'}
                  </Typography>
                </Box>
                {/* Progress bar */}
                <Box sx={{ width: '100%', height: 10, bgcolor: 'rgba(255,255,255,0.06)', borderRadius: 5, overflow: 'hidden', mb: 2 }}>
                  <Box
                    sx={{
                      width: `${porcentajeOcupado}%`,
                      height: '100%',
                      background: porcentajeOcupado > 90 
                        ? 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)' 
                        : porcentajeOcupado > 75 
                          ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' 
                          : 'linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)',
                      borderRadius: 5,
                      transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                    }}
                  />
                </Box>

                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                  <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center', bgcolor: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}>
                    <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>DISPONIBLE</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 750, color: '#10b981' }}>{disponible.toLocaleString()} L</Typography>
                  </Paper>
                  <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center', bgcolor: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}>
                    <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>OCUPACIÓN</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 750, color: porcentajeOcupado > 90 ? '#ef4444' : '#38bdf8' }}>
                      {porcentajeOcupado.toFixed(1)}%
                    </Typography>
                  </Paper>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>

        {/* Lot Info & Breakdown Card */}
        <Box sx={{ gridColumn: { xs: 'span 12', md: 'span 7' } }}>
          <Card
            sx={{
              background: 'rgba(15, 23, 42, 0.65)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 4,
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <CardContent sx={{ p: 4, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
              <Typography variant="h6" sx={{ fontWeight: 750, color: '#f8fafc', mb: 2 }}>
                Lotes Activos en el Tanque
              </Typography>
              <Typography variant="body2" sx={{ mb: 3, color: 'text.secondary' }}>
                Haga clic sobre un lote en la lista o en el visualizador para ver su ficha de trazabilidad de recepción.
              </Typography>

              {/* Table of Active Lots */}
              <TableContainer component={Box} sx={{ maxHeight: 240, overflowY: 'auto', mb: 4 }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow sx={{ '& th': { bgcolor: 'rgba(15, 23, 42, 0.95)', color: '#94a3b8', borderColor: 'rgba(255,255,255,0.06)' } }}>
                      <TableCell width="25">Color</TableCell>
                      <TableCell>Número de Lote</TableCell>
                      <TableCell align="right">Litros</TableCell>
                      <TableCell>F. Vencimiento</TableCell>
                      <TableCell>Estado</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {lotes.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} align="center" sx={{ py: 4, color: '#64748b' }}>
                          No hay lotes de leche entera activos en el tanque.
                        </TableCell>
                      </TableRow>
                    ) : (
                      lotes.map((lote) => {
                        const isSelected = selectedLote?.id === lote.id;
                        const isHovered = hoveredLoteId === lote.id;
                        return (
                          <TableRow
                            key={lote.id}
                            onMouseEnter={() => setHoveredLoteId(lote.id)}
                            onMouseLeave={() => setHoveredLoteId(null)}
                            onClick={() => setSelectedLote(lote)}
                            sx={{
                              cursor: 'pointer',
                              bgcolor: isSelected 
                                ? 'rgba(2, 132, 199, 0.15)' 
                                : isHovered 
                                  ? 'rgba(255,255,255,0.03)' 
                                  : 'transparent',
                              '& td': { borderColor: 'rgba(255,255,255,0.06)', color: '#e2e8f0' },
                              transition: 'background-color 0.2s',
                            }}
                          >
                            <TableCell>
                              <Box sx={{ width: 14, height: 14, borderRadius: '50%', bgcolor: lote.color, border: '2px solid rgba(255,255,255,0.2)' }} />
                            </TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>{lote.numeroLote}</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 800, fontFamily: 'monospace' }}>
                              {lote.cantidadActual.toLocaleString()} L
                            </TableCell>
                            <TableCell>{dayjs(lote.fechaVencimiento).format('DD-MM-YYYY')}</TableCell>
                            <TableCell>
                              <Chip
                                label={lote.estado}
                                size="small"
                                color={lote.estado === 'APROBADO' ? 'success' : 'warning'}
                                sx={{ fontWeight: 700, fontSize: '0.65rem', height: 20 }}
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

              <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)', mb: 3 }} />

              {/* Selected Lot Detail Card */}
              <Box sx={{ flexGrow: 1 }}>
                {selectedLote ? (
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 3,
                      borderRadius: 3,
                      bgcolor: 'rgba(2, 132, 199, 0.05)',
                      borderColor: 'rgba(2, 132, 199, 0.15)',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                      <Box sx={{ width: 16, height: 16, borderRadius: '50%', bgcolor: selectedLote.color }} />
                      <Typography variant="h6" sx={{ fontWeight: 800, color: '#f8fafc' }}>
                        Ficha de Lote: {selectedLote.numeroLote}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: '1fr 1fr 1fr' }, gap: 2.5 }}>
                      <Box>
                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>CANTIDAD ACTUAL</Typography>
                        <Typography variant="body1" sx={{ fontWeight: 850, fontFamily: 'monospace' }}>
                          {selectedLote.cantidadActual.toLocaleString()} L
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>CANTIDAD INICIAL</Typography>
                        <Typography variant="body1" sx={{ fontWeight: 700, fontFamily: 'monospace' }}>
                          {selectedLote.cantidadInicial.toLocaleString()} L
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>ESTADO</Typography>
                        <Chip
                          label={selectedLote.estado}
                          size="small"
                          color={selectedLote.estado === 'APROBADO' ? 'success' : 'warning'}
                          sx={{ fontWeight: 700, mt: 0.5 }}
                        />
                      </Box>
                      <Box sx={{ gridColumn: { xs: 'span 2', sm: 'span 1' } }}>
                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>FECHA DE RECEPCIÓN</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 650 }}>
                          {dayjs(selectedLote.fechaProduccion).format('DD-MM-YYYY HH:mm')}
                        </Typography>
                      </Box>
                      <Box sx={{ gridColumn: { xs: 'span 2' } }}>
                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>FECHA DE VENCIMIENTO</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 650, color: '#f59e0b' }}>
                          {dayjs(selectedLote.fechaVencimiento).format('DD-MM-YYYY (HH:mm)')}
                        </Typography>
                      </Box>
                    </Box>
                  </Paper>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 4, opacity: 0.5 }}>
                    <InfoIcon sx={{ fontSize: 40, mb: 1, color: '#64748b' }} />
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      Seleccione un lote para ver su trazabilidad
                    </Typography>
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Traceability History Section */}
      <Box sx={{ mt: 5 }}>
        <Card
          sx={{
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 4,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
          }}
        >
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h6" sx={{ fontWeight: 750, color: '#f8fafc', mb: 1, display: 'flex', alignItems: 'center', gap: 1.2 }}>
              <HistoryIcon sx={{ color: '#0ea5e9' }} />
              Trazabilidad de Consumo y Mezclas Proporcionales (Picking)
            </Typography>
            <Typography variant="body2" sx={{ mb: 3, color: 'text.secondary' }}>
              Historial de lotes virtuales de mezcla generados para órdenes de producción y la deducción proporcional de alícuotas efectuada en el tanque.
            </Typography>

            <TableContainer component={Paper} sx={{ bgcolor: 'transparent', backgroundImage: 'none', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 3 }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ '& th': { bgcolor: 'rgba(30, 41, 59, 0.5)', color: '#94a3b8', borderColor: 'rgba(255,255,255,0.06)', py: 1.5 } }}>
                    <TableCell>Fecha / Hora</TableCell>
                    <TableCell>Lote de Mezcla Generado</TableCell>
                    <TableCell>Orden de Producción</TableCell>
                    <TableCell>Producto a Elaborar</TableCell>
                    <TableCell align="right">Litros Pickeados</TableCell>
                    <TableCell>Desglose de Lotes Usados (Alícuotas)</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {mezclas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 5, color: '#64748b', borderColor: 'rgba(255,255,255,0.06)' }}>
                        Aún no se han registrado picking de mezclas de leche en el sistema.
                      </TableCell>
                    </TableRow>
                  ) : (
                    mezclas.map((mezcla) => (
                      <TableRow key={mezcla.id} sx={{ '& td': { borderColor: 'rgba(255,255,255,0.06)', color: '#e2e8f0', py: 2 } }}>
                        <TableCell sx={{ fontSize: '0.85rem' }}>
                          {dayjs(mezcla.createdAt).format('DD-MM-YYYY HH:mm:ss')}
                        </TableCell>
                        <TableCell sx={{ fontWeight: 800, color: '#38bdf8' }}>
                          {mezcla.loteMixto.numeroLote}
                        </TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>
                          {mezcla.ordenProduccion.numeroOrden}
                        </TableCell>
                        <TableCell>{mezcla.ordenProduccion.receta.nombre}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 850, fontFamily: 'monospace', color: '#38bdf8' }}>
                          {mezcla.loteMixto.cantidadInicial.toLocaleString()} L
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                            {mezcla.componentes.map((comp) => (
                              <Box key={comp.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, fontSize: '0.75rem' }}>
                                <Chip
                                  label={comp.loteOrigen.numeroLote}
                                  size="small"
                                  variant="outlined"
                                  sx={{ height: 18, fontSize: '0.7rem', color: '#94a3b8', borderColor: 'rgba(255,255,255,0.1)' }}
                                />
                                <Typography variant="caption" sx={{ color: '#e2e8f0', fontWeight: 600 }}>
                                  {(comp.proporcion * 100).toFixed(1)}%
                                </Typography>
                                <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                                  ({comp.cantidadUsada.toFixed(2)} L)
                                </Typography>
                              </Box>
                            ))}
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
