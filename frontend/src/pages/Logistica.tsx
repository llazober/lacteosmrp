import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  Divider,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  TextField,
  MenuItem,
  FormControlLabel,
  Switch,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  LocalShipping,
  Map,
  Restore,
  People,
  CheckCircle,
  Warning,
  Error as ErrorIcon,
  PlayArrow,
  Pause,
  Thermostat,
  Add,
  Edit,
  Delete,
  TrendingUp,
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  ResponsiveContainer,
} from 'recharts';
import { apiFetch } from '../store/useAuthStore';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Corregir ícono de marcador de Leaflet para Vite
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

// Custom Leaflet icons for different points
const CDIcon = L.divIcon({
  html: `<div style="background-color: #f43f5e; width: 14px; height: 14px; border-radius: 50%; border: 3px solid #fff; box-shadow: 0 0 10px rgba(244,63,94,0.8);"></div>`,
  className: 'custom-cd-marker',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

const ShopIcon = L.divIcon({
  html: `<div style="background-color: #0284c7; width: 12px; height: 12px; border-radius: 50%; border: 2.5px solid #fff; box-shadow: 0 0 8px rgba(2,132,199,0.8);"></div>`,
  className: 'custom-shop-marker',
  iconSize: [12, 12],
  iconAnchor: [6, 6],
});

const TruckIcon = L.divIcon({
  html: `<div style="background-color: #10b981; width: 16px; height: 16px; border-radius: 50%; border: 3px solid #fff; box-shadow: 0 0 12px rgba(16,185,129,0.8); display: flex; align-items: center; justify-content: center;"><span style="color: white; font-size: 8px; font-weight: bold;">🚚</span></div>`,
  className: 'custom-truck-marker',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

export default function Logistica() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(() => {
    const tabParam = new URLSearchParams(window.location.search).get('tab');
    if (tabParam) {
      const tabMap: Record<string, number> = {
        reabastecimiento: 0,
        pronostico: 1,
        rutas: 2,
        monitoreo: 3,
        conductores: 4,
      };
      if (tabMap[tabParam] !== undefined) {
        return tabMap[tabParam];
      }
    }
    return 0;
  });

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam) {
      const tabMap: Record<string, number> = {
        reabastecimiento: 0,
        pronostico: 1,
        rutas: 2,
        monitoreo: 3,
        conductores: 4,
      };
      if (tabMap[tabParam] !== undefined && tabMap[tabParam] !== activeTab) {
        setActiveTab(tabMap[tabParam]);
      }
    }
  }, [searchParams]);

  const handleTabChange = (val: number) => {
    setActiveTab(val);
    const tabNames = ['reabastecimiento', 'pronostico', 'rutas', 'monitoreo', 'conductores'];
    setSearchParams({ tab: tabNames[val] });
  };
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // --- TABLA REABASTECIMIENTO ---
  const [propuestas, setPropuestas] = useState<any[]>([]);
  const [autoReplenish, setAutoReplenish] = useState(true);
  const [useSafetyStockMin, setUseSafetyStockMin] = useState(false);

  // --- TABLA PLANIFICACIÓN DE RUTAS ---
  const [sugerenciasRuta, setSugerenciasRuta] = useState<any[]>([]);
  const [transSinAsignar, setTransSinAsignar] = useState<any[]>([]);
  const [calculandoRutas, setCalculandoRutas] = useState(false);

  // --- MONITOREO Y MAPA ---
  const [rutasActivas, setRutasActivas] = useState<any[]>([]);
  const [rutaSeleccionada, setRutaSeleccionada] = useState<any>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersGroupRef = useRef<L.LayerGroup | null>(null);
  const truckMarkersRef = useRef<{ [key: string]: L.Marker }>({});

  // Simulación
  const [simulandoId, setSimulandoId] = useState<string | null>(null);
  const [falloFrio, setFalloFrio] = useState(false);
  const simIntervalRef = useRef<number | null>(null);
  const simProgressRef = useRef<{ [key: string]: number }>({});

  // --- PRONÓSTICO DE DEMANDA (SIMULADOR) ---
  const [sucursales, setSucursales] = useState<any[]>([]);
  const [productos, setProductos] = useState<any[]>([]);
  const [forecastingSucursal, setForecastingSucursal] = useState('');
  const [forecastingProducto, setForecastingProducto] = useState('');
  const [forecastingPromo, setForecastingPromo] = useState(false);
  const [forecastingFestivo, setForecastingFestivo] = useState(false);
  const [forecastingEvento, setForecastingEvento] = useState(false);
  const [forecastData, setForecastData] = useState<any>(null);

  // --- FLOTA CRUD STATE ---
  const [camiones, setCamiones] = useState<any[]>([]);
  const [conductores, setConductores] = useState<any[]>([]);
  const [openCamionDialog, setOpenCamionDialog] = useState(false);
  const [openConductorDialog, setOpenConductorDialog] = useState(false);
  const [camionEdit, setCamionEdit] = useState<any>(null);
  const [conductorEdit, setConductorEdit] = useState<any>(null);

  // Fetch initial data
  useEffect(() => {
    cargarDatosLogistica();
    cargarFlota();
  }, []);

  // Inicializar Mapa de Leaflet al ir a la pestaña Monitoreo (Tab 3)
  useEffect(() => {
    if (activeTab === 3) {
      setTimeout(() => {
        initMap();
      }, 100);
    } else {
      // Destruir mapa si salimos de la pestaña para evitar duplicados
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    }
  }, [activeTab]);

  // Efecto para redibujar marcadores cuando cambian las rutas activas o la selección
  useEffect(() => {
    if (activeTab === 3 && mapRef.current) {
      renderMapMarkers();
    }
  }, [rutasActivas, rutaSeleccionada, activeTab]);

  const cargarDatosLogistica = async (useSafetyStockOverride?: boolean) => {
    setLoading(true);
    setError(null);
    try {
      // Cargar Sucursales y Productos
      const sucs = await apiFetch('/sucursales');
      const prods = await apiFetch('/productos');
      setSucursales(sucs.filter((s: any) => s.estado === 'ACTIVO'));
      setProductos(prods.filter((p: any) => p.estado === 'ACTIVO' && (p.tipoProducto === 'PRODUCTO_TERMINADO' || p.tipoProducto === 'PT')));

      if (sucs.length > 0) setForecastingSucursal(sucs[0].id);
      const terminado = prods.find((p: any) => p.tipoProducto === 'PRODUCTO_TERMINADO' || p.tipoProducto === 'PT');
      if (terminado) setForecastingProducto(terminado.id);

      // Cargar propuestas de reabastecimiento
      const checkSafety = useSafetyStockOverride !== undefined ? useSafetyStockOverride : useSafetyStockMin;
      const props = await apiFetch('/logistica/reabastecimiento/calcular' + (checkSafety ? '?useSafetyStockMin=true' : ''));
      setPropuestas(props);

      // Cargar rutas activas en monitoreo
      const rts = await apiFetch('/logistica/rutas');
      setRutasActivas(rts);

      // Cargar configuración de reabastecimiento automático
      try {
        const config = await apiFetch('/logistica/config/autoreplenish');
        setAutoReplenish(config.enabled);
      } catch (err) {
        console.error('Error al cargar la configuración de auto-reabastecimiento:', err);
      }
    } catch (e: any) {
      setError(e.message || 'Error al cargar datos logísticos.');
    } finally {
      setLoading(false);
    }
  };

  const cargarFlota = async () => {
    try {
      const cams = await apiFetch('/logistica/camiones');
      const conds = await apiFetch('/logistica/conductores');
      setCamiones(cams);
      setConductores(conds);
    } catch (e: any) {
      console.error(e);
    }
  };

  // --- PROCESAR PROPUESTAS REABASTECIMIENTO ---
  const handleProcesarReabastecimiento = async () => {
    if (propuestas.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const result = await apiFetch('/logistica/reabastecimiento/procesar', {
        method: 'POST',
        body: JSON.stringify({ propuestas }),
      });
      setSuccess(`Procesamiento completado con éxito: ${result.length} sugerencias ejecutadas.`);
      setPropuestas([]);
      cargarDatosLogistica();
    } catch (e: any) {
      setError(e.message || 'Error al procesar el reabastecimiento automático.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAutoReplenish = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.checked;
    setAutoReplenish(val);
    try {
      await apiFetch('/logistica/config/autoreplenish', {
        method: 'POST',
        body: JSON.stringify({ enabled: val }),
      });
      setSuccess(`Reabastecimiento automático ${val ? 'habilitado' : 'deshabilitado'} en segundo plano.`);
    } catch (e: any) {
      setError(e.message || 'Error al guardar la configuración.');
      setAutoReplenish(!val);
    }
  };

  const handleToggleSafetyStock = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.checked;
    setUseSafetyStockMin(val);
    cargarDatosLogistica(val);
  };

  // --- CALCULAR RUTAS TSP/VRP ---
  const handleCalcularRutas = async () => {
    setCalculandoRutas(true);
    setError(null);
    try {
      const result = await apiFetch('/logistica/rutas/sugerir');
      setSugerenciasRuta(result.rutasSugeridas || []);
      setTransSinAsignar(result.transferenciasSinAsignar || []);
      if (result.rutasSugeridas?.length === 0) {
        setSuccess('No hay transferencias pendientes en CD para optimizar rutas.');
      } else {
        setSuccess(`Se generaron ${result.rutasSugeridas.length} rutas optimizadas mediante TSP.`);
      }
    } catch (e: any) {
      setError(e.message || 'Error al optimizar rutas.');
    } finally {
      setCalculandoRutas(false);
    }
  };

  // --- GUARDAR RUTA ACEPTADA ---
  const handleGuardarRuta = async (sug: any) => {
    setLoading(true);
    setError(null);
    try {
      await apiFetch('/logistica/rutas', {
        method: 'POST',
        body: JSON.stringify({
          codigo: sug.codigoSugerido,
          camionId: sug.camion.id,
          conductorId: sug.conductor.id,
          puntos: sug.puntos,
          kilometros: sug.metricas.kilometros,
          tiempoEstimado: sug.metricas.tiempoEstimado,
          consumoEstimado: sug.metricas.consumoEstimado,
          costoEntrega: sug.metricas.costoEntrega,
        }),
      });
      setSuccess(`Ruta ${sug.codigoSugerido} guardada y activada con éxito.`);
      setSugerenciasRuta((prev) => prev.filter((r) => r.codigoSugerido !== sug.codigoSugerido));
      cargarFlota();
      cargarDatosLogistica();
    } catch (e: any) {
      setError(e.message || 'Error al guardar la ruta.');
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // MAPA E INTERACTIVIDAD LEAFLET
  // ==========================================
  const initMap = () => {
    if (mapRef.current) return;

    // Planta Principal coordinates (Santa Ana, El Salvador)
    const map = L.map('map-container').setView([13.9942, -89.5597], 13);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    mapRef.current = map;
    markersGroupRef.current = L.layerGroup().addTo(map);

    renderMapMarkers();
  };

  const renderMapMarkers = () => {
    const map = mapRef.current;
    const group = markersGroupRef.current;
    if (!map || !group) return;

    group.clearLayers();
    truckMarkersRef.current = {};

    // 1. Agregar Planta Principal (CD) (Santa Ana)
    L.marker([13.9785, -89.5398], { icon: CDIcon })
      .bindPopup('<b>Planta de Producción Principal (CD)</b><br>Origen de Distribución')
      .addTo(group);

    // 2. Agregar Sucursales
    sucursales.forEach((suc) => {
      if (suc.latitud && suc.longitud && suc.codigo !== 'SUC-001') {
        L.marker([suc.latitud, suc.longitud], { icon: ShopIcon })
          .bindPopup(`<b>${suc.nombre}</b><br>${suc.direccion}`)
          .addTo(group);
      }
    });

    // 3. Dibujar rutas y camiones en tránsito
    rutasActivas.forEach((rt) => {
      const points: [number, number][] = [];
      points.push([13.9785, -89.5398]); // Origen CD

      rt.puntos.forEach((pt: any) => {
        if (pt.sucursal && pt.sucursal.latitud && pt.sucursal.longitud) {
          points.push([pt.sucursal.latitud, pt.sucursal.longitud]);
        }
      });

      // Dibujar polilínea de ruta
      const isSelected = rutaSeleccionada && rutaSeleccionada.id === rt.id;
      const polyline = L.polyline(points, {
        color: isSelected ? '#00f2fe' : '#475569',
        weight: isSelected ? 4 : 2,
        opacity: isSelected ? 0.9 : 0.4,
        dashArray: isSelected ? '8, 8' : undefined,
      }).addTo(group);

      if (isSelected) {
        map.fitBounds(polyline.getBounds(), { padding: [50, 50] });
      }

      // Colocar camión en su posición actual (o en el CD si es planificada)
      const lat = rt.camion.gpsLat || 13.9785;
      const lng = rt.camion.gpsLng || -89.5398;

      const truckMarker = L.marker([lat, lng], { icon: TruckIcon })
        .bindPopup(`<b>Camión: ${rt.camion.placa}</b><br>Chofer: ${rt.conductor.nombre}<br>Ruta: ${rt.codigo}<br>Estado: ${rt.estado}`)
        .addTo(group);

      truckMarkersRef.current[rt.id] = truckMarker;
    });
  };

  // --- SIMULAR TRÁNSITO Y CADENA DE FRÍO ---
  const handleToggleSimulacion = (rt: any) => {
    if (simulandoId === rt.id) {
      // Detener
      if (simIntervalRef.current) {
        clearInterval(simIntervalRef.current);
        simIntervalRef.current = null;
      }
      setSimulandoId(null);
      return;
    }

    // Iniciar
    setSimulandoId(rt.id);
    setRutaSeleccionada(rt);

    // Cambiar estado a EN_CAMINO en el backend
    apiFetch(`/logistica/rutas/${rt.id}/estado`, {
      method: 'PUT',
      body: JSON.stringify({ estado: 'EN_CAMINO', temperaturaSalida: 4.0 }),
    }).then(() => {
      cargarDatosLogistica();
    });

    // Puntos de la simulación
    const points: { lat: number; lng: number; label: string }[] = [];
    points.push({ lat: 13.9785, lng: -89.5398, label: 'CD' });
    rt.puntos.forEach((pt: any) => {
      if (pt.sucursal && pt.sucursal.latitud && pt.sucursal.longitud) {
        points.push({ lat: pt.sucursal.latitud, lng: pt.sucursal.longitud, label: pt.sucursal.nombre });
      }
    });

    let step = simProgressRef.current[rt.id] || 0;

    simIntervalRef.current = window.setInterval(async () => {
      if (step >= points.length - 1) {
        // Finalizó simulación
        clearInterval(simIntervalRef.current!);
        simIntervalRef.current = null;
        setSimulandoId(null);
        simProgressRef.current[rt.id] = 0;

        await apiFetch(`/logistica/rutas/${rt.id}/estado`, {
          method: 'PUT',
          body: JSON.stringify({ estado: 'COMPLETADA', temperaturaRecepcion: falloFrio ? 8.5 : 4.5 }),
        });

        setSuccess(`Ruta ${rt.codigo} completada y entregas descargadas.`);
        cargarDatosLogistica();
        cargarFlota();
        return;
      }

      // Mover camión del punto actual al siguiente
      const startPoint = points[step];
      const endPoint = points[step + 1];

      // Animamos en sub-pasos (del 0 al 4)
      let subStep = 0;
      const subStepsCount = 5;

      const subInterval = setInterval(async () => {
        if (subStep >= subStepsCount) {
          clearInterval(subInterval);
          step++;
          simProgressRef.current[rt.id] = step;
          return;
        }

        const progress = subStep / subStepsCount;
        const currentLat = startPoint.lat + (endPoint.lat - startPoint.lat) * progress;
        const currentLng = startPoint.lng + (endPoint.lng - startPoint.lng) * progress;

        // Actualizar marcador
        const marker = truckMarkersRef.current[rt.id];
        if (marker) {
          marker.setLatLng([currentLat, currentLng]);
        }

        // Actualizar camión en base de datos
        await apiFetch(`/logistica/camiones/${rt.camion.id}`, {
          method: 'PUT',
          body: JSON.stringify({ gpsLat: currentLat, gpsLng: currentLng }),
        });

        // Enviar temperatura simulada
        // Temperatura normal: 3.5 a 4.5. Con falla: sube
        const tempBase = falloFrio ? 7.8 : 3.8;
        const currentTemp = parseFloat((tempBase + (Math.random() * 1.2 - 0.6)).toFixed(1));

        await apiFetch(`/logistica/rutas/${rt.id}/temperatura`, {
          method: 'POST',
          body: JSON.stringify({
            temperatura: currentTemp,
            humedad: 45,
            ubicacion: `Punto intermedio hacia ${endPoint.label}`,
          }),
        });

        subStep++;
      }, 800);
    }, 5000);
  };

  // --- CALCULAR SIMULADOR DE PRONÓSTICO ---
  const handleCalcularForecast = async () => {
    if (!forecastingSucursal || !forecastingProducto) return;
    setLoading(true);
    try {
      const data = await apiFetch(
        `/logistica/pronostico?sucursalId=${forecastingSucursal}&productoId=${forecastingProducto}&promocion=${forecastingPromo}&festivo=${forecastingFestivo}&evento=${forecastingEvento}`
      );
      setForecastData(data);
    } catch (e: any) {
      setError(e.message || 'Error al calcular pronóstico.');
    } finally {
      setLoading(false);
    }
  };

  // --- FLEET CRUD ACTIONS ---
  const handleSaveCamion = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      placa: formData.get('placa') as string,
      capacidadPeso: parseFloat(formData.get('capacidadPeso') as string),
      capacidadVolumen: parseFloat(formData.get('capacidadVolumen') as string),
      temperaturaMin: parseFloat(formData.get('temperaturaMin') as string),
      temperaturaMax: parseFloat(formData.get('temperaturaMax') as string),
    };

    try {
      if (camionEdit) {
        await apiFetch(`/logistica/camiones/${camionEdit.id}`, {
          method: 'PUT',
          body: JSON.stringify(data),
        });
      } else {
        await apiFetch('/logistica/camiones', {
          method: 'POST',
          body: JSON.stringify(data),
        });
      }
      setOpenCamionDialog(false);
      cargarFlota();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSaveConductor = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      nombre: formData.get('nombre') as string,
      licencia: formData.get('licencia') as string,
      telefono: formData.get('telefono') as string,
    };

    try {
      if (conductorEdit) {
        await apiFetch(`/logistica/conductores/${conductorEdit.id}`, {
          method: 'PUT',
          body: JSON.stringify(data),
        });
      } else {
        await apiFetch('/logistica/conductores', {
          method: 'POST',
          body: JSON.stringify(data),
        });
      }
      setOpenConductorDialog(false);
      cargarFlota();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteCamion = async (id: string) => {
    if (!confirm('¿Seguro que deseas eliminar este camión?')) return;
    try {
      await apiFetch(`/logistica/camiones/${id}`, { method: 'DELETE' });
      cargarFlota();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteConductor = async (id: string) => {
    if (!confirm('¿Seguro que deseas eliminar este conductor?')) return;
    try {
      await apiFetch(`/logistica/conductores/${id}`, { method: 'DELETE' });
      cargarFlota();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <Box sx={{ p: 3, height: '100%', overflowY: 'auto' }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5 }}>
            Rutas Inteligentes y Logística
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Administre la flota, calcule necesidades de stock, planifique despachos optimizados y monitoree la cadena de frío en tiempo real.
          </Typography>
        </Box>
        <Button variant="outlined" onClick={() => cargarDatosLogistica()} startIcon={<Restore />}>
          Refrescar Datos
        </Button>
      </Box>

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 3, borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" onClose={() => setSuccess(null)} sx={{ mb: 3, borderRadius: 2 }}>
          {success}
        </Alert>
      )}

      <Tabs
        value={activeTab}
        onChange={(_, val) => handleTabChange(val)}
        sx={{ mb: 4, borderBottom: '1px solid rgba(255,255,255,0.08)' }}
      >
        <Tab icon={<Restore />} label="Reabastecimiento y FEFO" iconPosition="start" />
        <Tab icon={<TrendingUp />} label="Pronóstico de Demanda" iconPosition="start" />
        <Tab icon={<LocalShipping />} label="Planificación de Rutas" iconPosition="start" />
        <Tab icon={<Map />} label="Monitoreo en Vivo" iconPosition="start" />
        <Tab icon={<People />} label="Flota y Conductores" iconPosition="start" />
      </Tabs>

      {/* ==========================================
          TAB 0: REABASTECIMIENTO Y FEFO
          ========================================== */}
      {activeTab === 0 && (
        <Box>
          <Paper className="glass-panel" sx={{ p: 3, mb: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                  Propuestas de Reabastecimiento Automático
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  El motor analiza el stock actual, ventas históricas y propone transferencias inteligentes para evitar mermas (FEFO).
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={autoReplenish}
                      onChange={handleToggleAutoReplenish}
                      color="primary"
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        Auto-Procesar en Fondo
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                        Corre periódicamente en segundo plano
                      </Typography>
                    </Box>
                  }
                  sx={{ mr: 0 }}
                />

                <FormControlLabel
                  control={
                    <Switch
                      checked={useSafetyStockMin}
                      onChange={handleToggleSafetyStock}
                      color="secondary"
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        Forzar Mínimo de Seguridad
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                        Usar stock mínimo si supera estimación (Prueba)
                      </Typography>
                    </Box>
                  }
                  sx={{ mr: 0 }}
                />
                
                <Button
                  variant="contained"
                  onClick={handleProcesarReabastecimiento}
                  disabled={propuestas.length === 0 || loading}
                  size="large"
                  startIcon={<CheckCircle />}
                >
                  Procesar y Generar Transferencias
                </Button>
              </Box>
            </Box>

            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                <CircularProgress />
              </Box>
            ) : propuestas.length === 0 ? (
              <Alert severity="success">
                Todos los locales se encuentran abastecidos y en rangos de stock objetivo. No se requieren acciones preventivas.
              </Alert>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Tienda Destino</TableCell>
                      <TableCell>Producto</TableCell>
                      <TableCell align="right">Stock Actual</TableCell>
                      <TableCell align="right">Venta Diaria Prom.</TableCell>
                      <TableCell align="right">Stock Objetivo</TableCell>
                      <TableCell align="right">Cant. Sugerida</TableCell>
                      <TableCell>Origen Recomendado</TableCell>
                      <TableCell>Razón / FEFO</TableCell>
                      <TableCell align="center">Riesgo</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {propuestas.map((prop, idx) => (
                      <TableRow key={idx}>
                        <TableCell sx={{ fontWeight: 700 }}>{prop.sucursalNombre}</TableCell>
                        <TableCell>
                          <strong>{prop.productoSku}</strong> - {prop.productoNombre}
                        </TableCell>
                        <TableCell align="right">{prop.stockActual}</TableCell>
                        <TableCell align="right">{prop.promedioVentasDiarias}</TableCell>
                        <TableCell align="right">{prop.stockObjetivo}</TableCell>
                        <TableCell align="right" sx={{ color: '#10b981', fontWeight: 800 }}>
                          +{prop.cantidadSugerida}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={prop.origenSugeridoNombre}
                            color={prop.tipoOrigen === 'TRANSFERENCIA' ? 'warning' : 'primary'}
                            size="small"
                            sx={{ fontWeight: 700 }}
                          />
                        </TableCell>
                        <TableCell sx={{ color: 'text.secondary' }}>
                          {prop.detalleRazon}
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            icon={prop.alertaRiesgo === 'CRITICO' ? <ErrorIcon /> : <Warning />}
                            label={prop.alertaRiesgo}
                            color={prop.alertaRiesgo === 'CRITICO' ? 'error' : 'warning'}
                            size="small"
                            sx={{ fontWeight: 700 }}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        </Box>
      )}

      {/* ==========================================
          TAB 1: PRONÓSTICO DE DEMANDA
          ========================================== */}
      {activeTab === 1 && (
        <Box>
          <Paper className="glass-panel" sx={{ p: 3, mb: 4 }}>
            <Typography variant="h6" sx={{ fontWeight: 800, mb: 3 }}>
              Motor Inteligente de Simulación de Demanda
            </Typography>

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 4 }}>
              <Box sx={{ flex: '1 1 200px' }}>
                <TextField
                  fullWidth
                  select
                  label="Sucursal"
                  value={forecastingSucursal}
                  onChange={(e) => setForecastingSucursal(e.target.value)}
                >
                  {sucursales.map((s) => (
                    <MenuItem key={s.id} value={s.id}>
                      {s.nombre}
                    </MenuItem>
                  ))}
                </TextField>
              </Box>
              <Box sx={{ flex: '1 1 200px' }}>
                <TextField
                  fullWidth
                  select
                  label="Producto"
                  value={forecastingProducto}
                  onChange={(e) => setForecastingProducto(e.target.value)}
                >
                  {productos.map((p) => (
                    <MenuItem key={p.id} value={p.id}>
                      {p.sku} - {p.descripcion}
                    </MenuItem>
                  ))}
                </TextField>
              </Box>
              <Box sx={{ flex: '2 2 300px', display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                <FormControlLabel
                  control={<Switch checked={forecastingPromo} onChange={(e) => setForecastingPromo(e.target.checked)} />}
                  label="Elasticidad Promo (+30%)"
                />
                <FormControlLabel
                  control={<Switch checked={forecastingFestivo} onChange={(e) => setForecastingFestivo(e.target.checked)} />}
                  label="Víspera Festiva (+20%)"
                />
                <FormControlLabel
                  control={<Switch checked={forecastingEvento} onChange={(e) => setForecastingEvento(e.target.checked)} />}
                  label="Evento Local (+15%)"
                />
              </Box>
              <Box sx={{ width: '100%' }}>
                <Button variant="contained" onClick={handleCalcularForecast} size="large" sx={{ fontWeight: 700 }}>
                  Calcular Pronóstico Logístico
                </Button>
              </Box>
            </Box>

            {forecastData && (
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 2fr' }, gap: 4 }}>
                <Box>
                  <Card className="glass-card" sx={{ height: '100%' }}>
                    <CardContent>
                      <Typography variant="subtitle2" color="text.secondary">
                        DEMANDA ESPERADA SUGERIDA
                      </Typography>
                      <Typography variant="h3" color="primary" sx={{ fontWeight: 800, my: 1.5 }}>
                        {forecastData.pronostico.demandaEsperada} <span style={{ fontSize: 16 }}>unidades/día</span>
                      </Typography>

                      <Divider sx={{ my: 2 }} />

                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" color="text.secondary">Rango Mínimo Seguro:</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>{forecastData.pronostico.demandaMinima} u/día</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" color="text.secondary">Rango Máximo Seguro:</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>{forecastData.pronostico.demandaMaxima} u/día</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" color="text.secondary">Tasa Venta Histórica (30d):</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>{forecastData.calculosBase.promedioDiario30} u/día</Typography>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Box>

                <Box>
                  <Paper sx={{ p: 3, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 2 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
                      Ajustes Aplicados por el Motor
                    </Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
                      <Box>
                        <Paper sx={{ p: 2, textAlign: 'center' }}>
                          <Typography variant="caption" color="text.secondary">Día Semana Factor</Typography>
                          <Typography variant="h6" sx={{ fontWeight: 800 }}>x{forecastData.factores.diaSemana}</Typography>
                        </Paper>
                      </Box>
                      <Box>
                        <Paper sx={{ p: 2, textAlign: 'center' }}>
                          <Typography variant="caption" color="text.secondary">Estacionalidad</Typography>
                          <Typography variant="h6" sx={{ fontWeight: 800 }}>x{forecastData.factores.estacionalidad}</Typography>
                        </Paper>
                      </Box>
                      <Box>
                        <Paper sx={{ p: 2, textAlign: 'center' }}>
                          <Typography variant="caption" color="text.secondary">Multiplicador Eventos</Typography>
                          <Typography variant="h6" sx={{ fontWeight: 800 }}>
                            x{(forecastData.factores.promocion * forecastData.factores.festivo * forecastData.factores.evento).toFixed(2)}
                          </Typography>
                        </Paper>
                      </Box>
                    </Box>

                    <Box sx={{ height: 180, mt: 3 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                        Curva de Simulación de Demanda (Mínima / Esperada / Máxima)
                      </Typography>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={[
                            { name: 'Lunes', Min: forecastData.pronostico.demandaMinima * 0.9, Esperada: forecastData.pronostico.demandaEsperada * 0.9, Max: forecastData.pronostico.demandaMaxima * 0.9 },
                            { name: 'Miércoles', Min: forecastData.pronostico.demandaMinima * 1.0, Esperada: forecastData.pronostico.demandaEsperada * 1.0, Max: forecastData.pronostico.demandaMaxima * 1.0 },
                            { name: 'Viernes', Min: forecastData.pronostico.demandaMinima * 1.2, Esperada: forecastData.pronostico.demandaEsperada * 1.2, Max: forecastData.pronostico.demandaMaxima * 1.2 },
                            { name: 'Sábado', Min: forecastData.pronostico.demandaMinima * 1.3, Esperada: forecastData.pronostico.demandaEsperada * 1.3, Max: forecastData.pronostico.demandaMaxima * 1.3 },
                            { name: 'Domingo', Min: forecastData.pronostico.demandaMinima * 1.25, Esperada: forecastData.pronostico.demandaEsperada * 1.25, Max: forecastData.pronostico.demandaMaxima * 1.25 },
                          ]}
                        >
                          <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <ChartTooltip />
                          <Line type="monotone" dataKey="Max" stroke="#f43f5e" strokeWidth={2} dot={false} />
                          <Line type="monotone" dataKey="Esperada" stroke="#0284c7" strokeWidth={3} />
                          <Line type="monotone" dataKey="Min" stroke="#10b981" strokeWidth={2} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </Box>
                  </Paper>
                </Box>
              </Box>
            )}
          </Paper>
        </Box>
      )}

      {/* ==========================================
          TAB 2: PLANIFICACIÓN DE RUTAS
          ========================================== */}
      {activeTab === 2 && (
        <Box>
          <Paper className="glass-panel" sx={{ p: 3, mb: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                  Optimización y Programación de Despachos
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Agrupe transferencias de stock pendientes desde CD en camiones compatibles mediante el algoritmo VRP/TSP.
                </Typography>
              </Box>
              <Button
                variant="contained"
                color="secondary"
                onClick={handleCalcularRutas}
                disabled={calculandoRutas}
                startIcon={<TrendingUp />}
              >
                {calculandoRutas ? 'Calculando TSP...' : 'Optimizar Rutas (VRP/TSP)'}
              </Button>
            </Box>

            {sugerenciasRuta.length === 0 ? (
              <Alert severity="info">
                No hay propuestas activas en la cola. Haz clic en "Optimizar Rutas (VRP/TSP)" para procesar transferencias pendientes.
              </Alert>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {sugerenciasRuta.map((sug, idx) => (
                  <Card key={idx} className="glass-card" sx={{ borderLeft: '5px solid #10b981' }}>
                    <CardContent>
                      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 3 }}>
                        <Box>
                          <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'primary.light' }}>
                            {sug.codigoSugerido}
                          </Typography>
                          <Box sx={{ mt: 1.5 }}>
                            <Typography variant="body2">
                              🚚 Camión: <strong>{sug.camion.placa}</strong> ({sug.camion.capacidadPeso} kg)
                            </Typography>
                            <Typography variant="body2">
                              👤 Conductor: <strong>{sug.conductor.nombre}</strong> ({sug.conductor.licencia})
                            </Typography>
                            <Typography variant="body2" sx={{ color: 'info.main', fontWeight: 600 }}>
                              ❄️ Temperatura: {sug.camion.temperaturaMin}°C a {sug.camion.temperaturaMax}°C
                            </Typography>
                          </Box>
                        </Box>

                        <Box>
                          <Typography variant="subtitle2" color="text.secondary">
                            SECUENCIA DE VISITAS TSP
                          </Typography>
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 1 }}>
                            {sug.puntos.map((pt: any) => (
                              <Typography key={pt.orden} variant="body2">
                                <strong>{pt.orden}.</strong> {pt.sucursalNombre} ({pt.peso} kg - {pt.volumen.toFixed(3)} m³)
                              </Typography>
                            ))}
                          </Box>
                        </Box>

                        <Box>
                          <Typography variant="subtitle2" color="text.secondary">
                            MÉTRICAS ESTIMADAS
                          </Typography>
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mt: 1 }}>
                            <Typography variant="body2">Kilómetros totales: <strong>{sug.metricas.kilometros} km</strong></Typography>
                            <Typography variant="body2">Tiempo de recorrido: <strong>{sug.metricas.tiempoEstimado} mins</strong></Typography>
                            <Typography variant="body2">Consumo combustible: <strong>{sug.metricas.consumoEstimado} L</strong></Typography>
                            <Typography variant="body2" sx={{ color: '#10b981', fontWeight: 700 }}>
                              Costo operativo: ${sug.metricas.costoEntrega.toLocaleString()}
                            </Typography>
                          </Box>
                          <Button
                            variant="contained"
                            color="success"
                            onClick={() => handleGuardarRuta(sug)}
                            sx={{ mt: 2 }}
                            fullWidth
                          >
                            Aprobar y Despachar Ruta
                          </Button>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                ))}

                {transSinAsignar.length > 0 && (
                  <Box>
                    <Typography variant="subtitle2" color="error.main" sx={{ mb: 1, fontWeight: 700 }}>
                      ⚠️ Transferencias que no pudieron asignarse por límite de flota
                    </Typography>
                    {transSinAsignar.map((tsa, idx) => (
                      <Chip key={idx} label={`${tsa.codigo} -> ${tsa.destino}`} color="error" variant="outlined" sx={{ mr: 1, mb: 1 }} />
                    ))}
                  </Box>
                )}
              </Box>
            )}
          </Paper>
        </Box>
      )}

      {/* ==========================================
          TAB 3: MONITOREO EN VIVO
          ========================================== */}
      {activeTab === 3 && (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' }, gap: 3 }}>
          <Box>
            <Paper className="glass-panel" sx={{ p: 2, height: 500, position: 'relative' }}>
              <div id="map-container" style={{ width: '100%', height: '100%', borderRadius: '12px' }}></div>
            </Paper>
          </Box>

          <Box>
            <Paper className="glass-panel" sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>
                Panel de Telemetría y Control
              </Typography>

              {rutasActivas.length === 0 ? (
                <Alert severity="info">No hay rutas activas en distribución en este momento.</Alert>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, overflowY: 'auto' }}>
                  {rutasActivas.map((rt) => (
                    <Card
                      key={rt.id}
                      onClick={() => setRutaSeleccionada(rt)}
                      sx={{
                        cursor: 'pointer',
                        border: rutaSeleccionada?.id === rt.id ? '2px solid #00f2fe' : '1px solid rgba(255,255,255,0.08)',
                        backgroundColor: 'rgba(255,255,255,0.02)',
                      }}
                    >
                      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                            {rt.codigo}
                          </Typography>
                          <Chip
                            label={rt.estado}
                            color={rt.estado === 'EN_CAMINO' ? 'success' : rt.estado === 'COMPLETADA' ? 'info' : 'default'}
                            size="small"
                          />
                        </Box>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                          Camión: {rt.camion.placa} | Chofer: {rt.conductor.nombre}
                        </Typography>

                        {/* Controles de Simulación */}
                        <Box sx={{ mt: 2, display: 'flex', gap: 1, alignItems: 'center' }}>
                          <Button
                            variant="contained"
                            color={simulandoId === rt.id ? 'error' : 'success'}
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleSimulacion(rt);
                            }}
                            startIcon={simulandoId === rt.id ? <Pause /> : <PlayArrow />}
                          >
                            {simulandoId === rt.id ? 'Detener' : 'Iniciar Simulación'}
                          </Button>

                          {simulandoId === rt.id && (
                            <FormControlLabel
                              control={<Switch checked={falloFrio} onChange={(e) => setFalloFrio(e.target.checked)} color="error" />}
                              label="Fallo Frío"
                              sx={{ ml: 1 }}
                            />
                          )}
                        </Box>
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              )}

              {rutaSeleccionada && (
                <Box sx={{ mt: 3 }}>
                  <Divider sx={{ mb: 2 }} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Thermostat color="error" /> Historial de Temperatura en Ruta
                  </Typography>

                  {rutaSeleccionada.temperaturas?.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">No hay lecturas de telemetría aún.</Typography>
                  ) : (
                    <Box sx={{ height: 130 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={rutaSeleccionada.temperaturas}>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                          <XAxis dataKey="id" hide />
                          <YAxis domain={[0, 10]} />
                          <Line type="monotone" dataKey="temperatura" stroke="#10b981" strokeWidth={2} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </Box>
                  )}
                </Box>
              )}
            </Paper>
          </Box>
        </Box>
      )}

      {/* ==========================================
          TAB 4: FLOTA Y CONDUCTORES
          ========================================== */}
      {activeTab === 4 && (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 4 }}>
          <Box>
            <Paper className="glass-panel" sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>Camiones</Typography>
                <Button variant="contained" startIcon={<Add />} onClick={() => { setCamionEdit(null); setOpenCamionDialog(true); }}>
                  Añadir Camión
                </Button>
              </Box>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Placa</TableCell>
                      <TableCell>Capacidad Peso</TableCell>
                      <TableCell>Volumen</TableCell>
                      <TableCell>Rango Temp.</TableCell>
                      <TableCell>Estado</TableCell>
                      <TableCell align="center">Acciones</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {camiones.map((cam) => (
                      <TableRow key={cam.id}>
                        <TableCell sx={{ fontWeight: 700 }}>{cam.placa}</TableCell>
                        <TableCell>{cam.capacidadPeso} kg</TableCell>
                        <TableCell>{cam.capacidadVolumen} m³</TableCell>
                        <TableCell>{cam.temperaturaMin}°C a {cam.temperaturaMax}°C</TableCell>
                        <TableCell>
                          <Chip label={cam.estado} color={cam.estado === 'DISPONIBLE' ? 'success' : 'warning'} size="small" />
                        </TableCell>
                        <TableCell align="center">
                          <IconButton onClick={() => { setCamionEdit(cam); setOpenCamionDialog(true); }}><Edit /></IconButton>
                          <IconButton onClick={() => handleDeleteCamion(cam.id)} color="error"><Delete /></IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Box>

          <Box>
            <Paper className="glass-panel" sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>Conductores</Typography>
                <Button variant="contained" startIcon={<Add />} onClick={() => { setConductorEdit(null); setOpenConductorDialog(true); }}>
                  Añadir Conductor
                </Button>
              </Box>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Nombre</TableCell>
                      <TableCell>Licencia</TableCell>
                      <TableCell>Teléfono</TableCell>
                      <TableCell>Estado</TableCell>
                      <TableCell align="center">Acciones</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {conductores.map((cond) => (
                      <TableRow key={cond.id}>
                        <TableCell sx={{ fontWeight: 700 }}>{cond.nombre}</TableCell>
                        <TableCell>{cond.licencia}</TableCell>
                        <TableCell>{cond.telefono}</TableCell>
                        <TableCell>
                          <Chip label={cond.estado} color={cond.estado === 'ACTIVO' ? 'success' : 'warning'} size="small" />
                        </TableCell>
                        <TableCell align="center">
                          <IconButton onClick={() => { setConductorEdit(cond); setOpenConductorDialog(true); }}><Edit /></IconButton>
                          <IconButton onClick={() => handleDeleteConductor(cond.id)} color="error"><Delete /></IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Box>
        </Box>
      )}

      {/* DIALOGS */}
      {/* Camión Dialog */}
      <Dialog open={openCamionDialog} onClose={() => setOpenCamionDialog(false)}>
        <form onSubmit={handleSaveCamion}>
          <DialogTitle>{camionEdit ? 'Editar Camión' : 'Añadir Camión'}</DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1, minWidth: 350 }}>
            <TextField name="placa" label="Placa" defaultValue={camionEdit?.placa || ''} fullWidth required />
            <TextField name="capacidadPeso" label="Capacidad Peso (kg)" type="number" defaultValue={camionEdit?.capacidadPeso || ''} fullWidth required />
            <TextField name="capacidadVolumen" label="Capacidad Volumen (m³)" type="number" defaultValue={camionEdit?.capacidadVolumen || ''} fullWidth required />
            <TextField name="temperaturaMin" label="Temp. Mínima Requerida (°C)" type="number" defaultValue={camionEdit?.temperaturaMin || ''} fullWidth required />
            <TextField name="temperaturaMax" label="Temp. Máxima Requerida (°C)" type="number" defaultValue={camionEdit?.temperaturaMax || ''} fullWidth required />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenCamionDialog(false)}>Cancelar</Button>
            <Button type="submit" variant="contained">Guardar</Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Conductor Dialog */}
      <Dialog open={openConductorDialog} onClose={() => setOpenConductorDialog(false)}>
        <form onSubmit={handleSaveConductor}>
          <DialogTitle>{conductorEdit ? 'Editar Conductor' : 'Añadir Conductor'}</DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1, minWidth: 350 }}>
            <TextField name="nombre" label="Nombre Completo" defaultValue={conductorEdit?.nombre || ''} fullWidth required />
            <TextField name="licencia" label="Licencia de Conducir" defaultValue={conductorEdit?.licencia || ''} fullWidth required />
            <TextField name="telefono" label="Teléfono" defaultValue={conductorEdit?.telefono || ''} fullWidth required />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenConductorDialog(false)}>Cancelar</Button>
            <Button type="submit" variant="contained">Guardar</Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}
