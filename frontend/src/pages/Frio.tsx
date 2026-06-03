import { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Box,
  Button,
  Slider,
  Card,
  CardContent,
  Chip,
  Alert,
  Snackbar,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  AcUnit,
  SettingsInputAntenna,
  Wifi,
  Thermostat,
  Edit,
  Delete,
} from '@mui/icons-material';
import { io } from 'socket.io-client';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { apiFetch, useAuthStore } from '../store/useAuthStore';

export default function Frio() {
  const systemTimezone = useAuthStore((state) => state.systemTimezone);
  const [freezers, setFreezers] = useState<any[]>([]);
  const [selectedFreezer, setSelectedFreezer] = useState<any>(null);
  const [readings, setReadings] = useState<any[]>([]);

  // Telemetría simulada
  const [simTemp, setSimTemp] = useState<number>(4.0);
  const [simHum, setSimHum] = useState<number>(60);
  const [simulating, setSimulating] = useState(false);

  // Snackbar para notificaciones WebSocket
  const [socketNotification, setSocketNotification] = useState<string | null>(null);

  // Estados de CRUD Equipos
  const [sucursales, setSucursales] = useState<any[]>([]);
  const [openCrearFreezer, setOpenCrearFreezer] = useState(false);
  const [openEditarFreezer, setOpenEditarFreezer] = useState(false);
  const [freezerForm, setFreezerForm] = useState({
    codigo: '',
    nombre: '',
    sucursalId: '',
    ubicacion: '',
    temperaturaMin: '2.0',
    temperaturaMax: '6.0',
  });

  useEffect(() => {
    cargarFreezers();
    cargarSucursales();

    // Conectar WebSocket Client
    const getSocketUrl = () => {
      const apiUrl = (window as any)._env_?.VITE_API_URL || import.meta.env.VITE_API_URL;
      if (apiUrl) {
        return apiUrl.replace('/api', '');
      }
      const protocol = window.location.protocol;
      const hostname = window.location.hostname || 'localhost';
      return `${protocol}//${hostname}:3000`;
    };
    const socketUrl = getSocketUrl();
    const socket = io(socketUrl);

    // Escuchar telemetría general
    socket.on('telemetria-general', (data: any) => {
      // Actualizar el freezer en el estado
      setFreezers((prev) =>
        prev.map((f) => {
          if (f.id === data.freezerId) {
            return { ...f, estado: data.estado === 'CRITICO' ? 'ALERTA' : 'CONECTADO' };
          }
          return f;
        })
      );

      // Si el freezer actualmente seleccionado recibió la lectura, agregarla al gráfico
      if (selectedFreezer && selectedFreezer.id === data.freezerId) {
        setReadings((prev) => [data, ...prev].slice(0, 50));
      }
    });

    // Escuchar nuevas alertas
    socket.on('nueva-alerta', (data: any) => {
      setSocketNotification(
        `[ALERTA IoT] Sucursal: ${data.sucursalId ? 'Tienda' : 'Sistema'} - ${data.mensaje} - Estado: ${data.estado}`
      );
    });

    return () => {
      socket.disconnect();
    };
  }, [selectedFreezer]);

  const cargarFreezers = async () => {
    try {
      const data = await apiFetch('/freezers');
      setFreezers(data);
      if (data.length > 0 && !selectedFreezer) {
        handleSelectFreezer(data[0]);
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

  const handleCrearFreezer = async () => {
    try {
      if (!freezerForm.codigo || !freezerForm.nombre || !freezerForm.sucursalId) {
        alert('Código, nombre y sucursal son obligatorios.');
        return;
      }
      const created = await apiFetch('/freezers', {
        method: 'POST',
        body: JSON.stringify(freezerForm),
      });
      setOpenCrearFreezer(false);
      await cargarFreezers();
      handleSelectFreezer(created);
    } catch (e: any) {
      alert('Error al crear equipo: ' + e.message);
    }
  };

  const handleEditarFreezer = async () => {
    try {
      if (!freezerForm.codigo || !freezerForm.nombre || !freezerForm.sucursalId) {
        alert('Código, nombre y sucursal son obligatorios.');
        return;
      }
      const updated = await apiFetch(`/freezers/${selectedFreezer.id}`, {
        method: 'PUT',
        body: JSON.stringify(freezerForm),
      });
      setOpenEditarFreezer(false);
      await cargarFreezers();
      handleSelectFreezer(updated);
    } catch (e: any) {
      alert('Error al editar equipo: ' + e.message);
    }
  };

  const handleEliminarFreezer = async (id: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (!window.confirm('¿Está seguro de eliminar este equipo de frío? Se borrarán también todas sus lecturas históricas.')) return;
    try {
      await apiFetch(`/freezers/${id}`, {
        method: 'DELETE',
      });
      setSelectedFreezer(null);
      await cargarFreezers();
    } catch (e: any) {
      alert('Error al eliminar equipo: ' + e.message);
    }
  };

  const handleSelectFreezer = async (freezer: any) => {
    setSelectedFreezer(freezer);
    setSimTemp((freezer.temperaturaMin + freezer.temperaturaMax) / 2);
    try {
      const history = await apiFetch(`/freezers/${freezer.id}/lecturas`);
      setReadings(history);
    } catch (e) {
      console.error(e);
    }
  };

  // Enviar telemetría simulada al backend (POST Público de IoT)
  const handleEnviarSimulacion = async () => {
    if (!selectedFreezer) return;
    setSimulating(true);

    try {
      const res = await apiFetch('/freezers/telemetria', {
        method: 'POST',
        body: JSON.stringify({
          codigo: selectedFreezer.codigo,
          temperatura: simTemp,
          humedad: simHum,
        }),
      });

      // Refrescar lecturas actuales
      const history = await apiFetch(`/freezers/${selectedFreezer.id}/lecturas`);
      setReadings(history);
      
      // Actualizar el estado del freezer directamente
      setFreezers((prev) =>
        prev.map((f) =>
          f.id === selectedFreezer.id ? { ...f, estado: res.freezerEstado } : f
        )
      );
    } catch (e: any) {
      console.error(e);
    } finally {
      setSimulating(false);
    }
  };

  // Formateadores de fecha
  const formatTime = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleTimeString('es-CO', { timeZone: systemTimezone, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <Box sx={{ p: 3, height: '100%', overflowY: 'auto' }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5 }}>
          Cadena de Frío IoT
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Monitoreo en tiempo real de temperatura y humedad en refrigeradores de lácteos.
        </Typography>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 2fr' }, gap: 3 }}>
        {/* Left column: Freezer list */}
        <Box>
          <Paper className="glass-panel" sx={{ p: 3, height: '580px', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
                <AcUnit color="primary" /> Equipos de Frío
              </Typography>
              <Button
                variant="outlined"
                color="primary"
                size="small"
                onClick={() => {
                  setFreezerForm({
                    codigo: '',
                    nombre: '',
                    sucursalId: sucursales.length > 0 ? sucursales[0].id : '',
                    ubicacion: '',
                    temperaturaMin: '2.0',
                    temperaturaMax: '6.0',
                  });
                  setOpenCrearFreezer(true);
                }}
                sx={{ fontSize: '0.75rem', py: 0.5 }}
              >
                Agregar
              </Button>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto', flexGrow: 1 }}>
              {freezers.map((freezer) => {
                const isSelected = selectedFreezer?.id === freezer.id;
                const isAlert = freezer.estado === 'ALERTA';

                return (
                  <Card
                    key={freezer.id}
                    onClick={() => handleSelectFreezer(freezer)}
                    sx={{
                      cursor: 'pointer',
                      border: isSelected
                        ? '2px solid #0284c7'
                        : '1px solid rgba(255, 255, 255, 0.05)',
                      backgroundColor: isSelected
                        ? 'rgba(2, 132, 199, 0.08)'
                        : 'rgba(15, 23, 42, 0.4)',
                      transition: 'all 0.2s',
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                      },
                    }}
                  >
                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                          {freezer.nombre}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Chip
                            label={freezer.estado}
                            color={isAlert ? 'error' : 'success'}
                            size="small"
                            sx={{ fontSize: '0.65rem', height: 18 }}
                          />
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedFreezer(freezer);
                              setFreezerForm({
                                codigo: freezer.codigo,
                                nombre: freezer.nombre,
                                sucursalId: freezer.sucursalId,
                                ubicacion: freezer.ubicacion || '',
                                temperaturaMin: String(freezer.temperaturaMin),
                                temperaturaMax: String(freezer.temperaturaMax),
                              });
                              setOpenEditarFreezer(true);
                            }}
                            sx={{ color: 'text.secondary', p: 0.2 }}
                          >
                            <Edit sx={{ fontSize: '0.9rem' }} />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={(e) => handleEliminarFreezer(freezer.id, e)}
                            sx={{ color: 'error.main', p: 0.2 }}
                          >
                            <Delete sx={{ fontSize: '0.9rem' }} />
                          </IconButton>
                        </Box>
                      </Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                        Código: {freezer.codigo} | Sucursal: {freezer.sucursal.nombre}
                      </Typography>
                      <Typography variant="caption" sx={{ fontWeight: 600 }}>
                        Rango Permitido: {freezer.temperaturaMin}°C a {freezer.temperaturaMax}°C
                      </Typography>
                    </CardContent>
                  </Card>
                );
              })}
            </Box>
          </Paper>
        </Box>

        {/* Right column: Monitor detail & Simulator */}
        <Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Realtime Chart */}
            <Box>
              <Paper className="glass-panel" sx={{ p: 3, height: '320px', display: 'flex', flexDirection: 'column' }}>
                <Typography variant="h6" sx={{ fontWeight: 800, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Wifi color="primary" /> Historial de Temperatura - {selectedFreezer?.nombre}
                </Typography>
                <Box sx={{ width: '100%', height: '100%', flexGrow: 1 }}>
                  {readings.length === 0 ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', opacity: 0.5 }}>
                      <Typography variant="body2">Sin lecturas históricas registradas.</Typography>
                    </Box>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={[...readings].reverse()}
                        margin={{ top: 5, right: 30, left: -20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="fecha" tickFormatter={formatTime} stroke="#94a3b8" />
                        <YAxis stroke="#94a3b8" />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#111827', borderColor: 'rgba(255,255,255,0.1)', borderRadius: 8 }}
                          labelFormatter={(l) => `Hora: ${new Date(l).toLocaleString('es-CO', { timeZone: systemTimezone })}`}
                        />
                        <Line type="monotone" dataKey="temperatura" stroke="#0284c7" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 8 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </Box>
              </Paper>
            </Box>

            {/* Simulated IoT Console */}
            <Box>
              <Paper className="glass-panel" sx={{ p: 3, border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                <Typography variant="h6" sx={{ fontWeight: 800, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }} color="secondary.main">
                  <SettingsInputAntenna /> Consola Simuladora de Dispositivo IoT (ESP32 / Shelly)
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 3 }}>
                  Simule las tramas de telemetría enviadas por los sensores físicos hacia la pasarela HTTP de la plataforma.
                </Typography>

                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 3, alignItems: 'center' }}>
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Thermostat />
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        Temperatura Simulada: {simTemp.toFixed(1)} °C
                      </Typography>
                    </Box>
                    <Slider
                      value={simTemp}
                      onChange={(_, val) => setSimTemp(val as number)}
                      min={-10}
                      max={15}
                      step={0.5}
                      color={simTemp < (selectedFreezer?.temperaturaMin || 0) || simTemp > (selectedFreezer?.temperaturaMax || 0) ? 'error' : 'secondary'}
                    />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: -1 }}>
                      <Typography variant="caption" color="text.secondary">-10°C</Typography>
                      <Typography variant="caption" color="text.secondary">15°C</Typography>
                    </Box>
                  </Box>

                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 700, mb: 1 }}>
                      Humedad Relativa: {simHum} %
                    </Typography>
                    <Slider
                      value={simHum}
                      onChange={(_, val) => setSimHum(val as number)}
                      min={10}
                      max={100}
                      step={1}
                      color="info"
                    />
                  </Box>

                  <Box>
                    <Button
                      fullWidth
                      variant="contained"
                      color="secondary"
                      size="large"
                      disabled={simulating}
                      onClick={handleEnviarSimulacion}
                      sx={{ py: 1.5, fontWeight: 700 }}
                    >
                      {simulating ? 'Enviando Trama...' : 'Enviar Telemetría IoT'}
                    </Button>
                  </Box>
                </Box>

                {selectedFreezer && (
                  <Box sx={{ mt: 3, p: 2, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.02)', display: 'flex', gap: 3 }}>
                    <Typography variant="caption" color="text.secondary">
                      Rango Seguro del Equipo: <strong>{selectedFreezer.temperaturaMin} °C</strong> a <strong>{selectedFreezer.temperaturaMax} °C</strong>
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Estado Evaluado: {simTemp < selectedFreezer.temperaturaMin || simTemp > selectedFreezer.temperaturaMax ? (
                        <strong style={{ color: '#f43f5e' }}>CRÍTICO (Generará Alerta)</strong>
                      ) : (
                        <strong style={{ color: '#10b981' }}>SEGURO (Ok)</strong>
                      )}
                    </Typography>
                  </Box>
                )}
              </Paper>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* SNACKBAR DE NOTIFICACIÓN DE ALERTAS EN TIEMPO REAL */}
      <Snackbar
        open={!!socketNotification}
        autoHideDuration={6000}
        onClose={() => setSocketNotification(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSocketNotification(null)}
          severity="warning"
          variant="filled"
          sx={{ width: '100%', borderRadius: 2 }}
        >
          {socketNotification}
        </Alert>
      </Snackbar>

      {/* DIALOG: CREAR EQUIPO */}
      <Dialog open={openCrearFreezer} onClose={() => setOpenCrearFreezer(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 800 }}>Agregar Nuevo Equipo de Frío</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <TextField
            fullWidth
            label="Código de Dispositivo"
            placeholder="FREEZ-004"
            size="small"
            value={freezerForm.codigo}
            onChange={(e) => setFreezerForm({ ...freezerForm, codigo: e.target.value })}
          />
          <TextField
            fullWidth
            label="Nombre del Equipo"
            placeholder="Congelador Carnes"
            size="small"
            value={freezerForm.nombre}
            onChange={(e) => setFreezerForm({ ...freezerForm, nombre: e.target.value })}
          />
          <FormControl fullWidth size="small">
            <InputLabel>Sucursal</InputLabel>
            <Select
              value={freezerForm.sucursalId}
              label="Sucursal"
              onChange={(e) => setFreezerForm({ ...freezerForm, sucursalId: e.target.value })}
            >
              {sucursales.map((s) => (
                <MenuItem key={s.id} value={s.id}>{s.nombre}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            fullWidth
            label="Ubicación Física"
            placeholder="Pasillo 3 o Bodega"
            size="small"
            value={freezerForm.ubicacion}
            onChange={(e) => setFreezerForm({ ...freezerForm, ubicacion: e.target.value })}
          />
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              fullWidth
              label="Temp. Mínima (°C)"
              type="number"
              size="small"
              value={freezerForm.temperaturaMin}
              onChange={(e) => setFreezerForm({ ...freezerForm, temperaturaMin: e.target.value })}
            />
            <TextField
              fullWidth
              label="Temp. Máxima (°C)"
              type="number"
              size="small"
              value={freezerForm.temperaturaMax}
              onChange={(e) => setFreezerForm({ ...freezerForm, temperaturaMax: e.target.value })}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenCrearFreezer(false)}>Cancelar</Button>
          <Button variant="contained" color="success" onClick={handleCrearFreezer}>Guardar</Button>
        </DialogActions>
      </Dialog>

      {/* DIALOG: EDITAR EQUIPO */}
      <Dialog open={openEditarFreezer} onClose={() => setOpenEditarFreezer(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 800 }}>Editar Equipo de Frío</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <TextField
            fullWidth
            label="Código de Dispositivo"
            disabled
            size="small"
            value={freezerForm.codigo}
          />
          <TextField
            fullWidth
            label="Nombre del Equipo"
            size="small"
            value={freezerForm.nombre}
            onChange={(e) => setFreezerForm({ ...freezerForm, nombre: e.target.value })}
          />
          <FormControl fullWidth size="small">
            <InputLabel>Sucursal</InputLabel>
            <Select
              value={freezerForm.sucursalId}
              label="Sucursal"
              onChange={(e) => setFreezerForm({ ...freezerForm, sucursalId: e.target.value })}
            >
              {sucursales.map((s) => (
                <MenuItem key={s.id} value={s.id}>{s.nombre}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            fullWidth
            label="Ubicación Física"
            size="small"
            value={freezerForm.ubicacion}
            onChange={(e) => setFreezerForm({ ...freezerForm, ubicacion: e.target.value })}
          />
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              fullWidth
              label="Temp. Mínima (°C)"
              type="number"
              size="small"
              value={freezerForm.temperaturaMin}
              onChange={(e) => setFreezerForm({ ...freezerForm, temperaturaMin: e.target.value })}
            />
            <TextField
              fullWidth
              label="Temp. Máxima (°C)"
              type="number"
              size="small"
              value={freezerForm.temperaturaMax}
              onChange={(e) => setFreezerForm({ ...freezerForm, temperaturaMax: e.target.value })}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenEditarFreezer(false)}>Cancelar</Button>
          <Button variant="contained" color="primary" onClick={handleEditarFreezer}>Guardar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
