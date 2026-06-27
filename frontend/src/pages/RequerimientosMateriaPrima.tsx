import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Checkbox,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Alert,
  CircularProgress,
  IconButton,
  Tooltip,
  OutlinedInput,
  ListItemText,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  ShoppingCart as ComprasIcon,
  FilterList as FilterIcon,
  CheckCircle as SuccessIcon,
} from '@mui/icons-material';
import { useAuthStore, apiFetch } from '../store/useAuthStore';

interface RequerimientoItem {
  productoId: string;
  sku: string;
  descripcion: string;
  categoria: string;
  existencia: number;
  existMin: number;
  existMax: number;
  cantidadSugerida: number;
  esManufacturado: boolean;
  recetaId: string | null;
  proveedorId: string | null;
  proveedorNombre: string | null;
  costoProveedor: number;
  proveedoresAsociados: Array<{
    proveedorId: string;
    nombre: string;
    costoProveedor: number;
  }>;
}

export default function RequerimientosMateriaPrima() {
  const usuario = useAuthStore((state) => state.usuario);
  
  // States
  const [requerimientos, setRequerimientos] = useState<RequerimientoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  
  // Filters
  const [sucursales, setSucursales] = useState<any[]>([]);
  const [selectedSucursal, setSelectedSucursal] = useState<string>('');
  const [allCategories, setAllCategories] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  
  // Row edits (local overrides)
  const [editableCantidades, setEditableCantidades] = useState<Record<string, number>>({});
  const [editableProveedores, setEditableProveedores] = useState<Record<string, string>>({});
  const [selectedItems, setSelectedItems] = useState<Record<string, boolean>>({});
  


  const isHQ = usuario?.rol === 'ADMINISTRADOR' || usuario?.rol === 'SUPERVISOR';

  // Load sucursales
  useEffect(() => {
    const loadSucursales = async () => {
      try {
        const data = await apiFetch('/sucursales');
        setSucursales(data);
        // Default sucursal
        if (isHQ) {
          const cd = data.find((s: any) => s.codigo === 'SUC-001');
          setSelectedSucursal(cd?.id || data[0]?.id || '');
        } else {
          setSelectedSucursal(usuario?.sucursalId || '');
        }
      } catch (e: any) {
        setErrorMsg('Error al cargar sucursales.');
      }
    };
    loadSucursales();
  }, [usuario, isHQ]);

  // Load raw material requirements
  const loadRequirements = async (sucId: string) => {
    if (!sucId) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const data: RequerimientoItem[] = await apiFetch(`/compras/requerimientos?sucursalId=${sucId}`);
      setRequerimientos(data);
      
      // Initialize edit states
      const cants: Record<string, number> = {};
      const provs: Record<string, string> = {};
      const checked: Record<string, boolean> = {};
      
      // Categories list
      const cats = Array.from(new Set(data.map((item) => item.categoria)));
      setAllCategories(cats);
      setSelectedCategories(cats); // Default all checked
      
      data.forEach((item) => {
        cants[item.productoId] = item.cantidadSugerida;
        provs[item.productoId] = item.proveedorId || '';
        checked[item.productoId] = true; // Default to selected
      });
      
      setEditableCantidades(cants);
      setEditableProveedores(provs);
      setSelectedItems(checked);
    } catch (e: any) {
      setErrorMsg(e.message || 'Error al cargar los requerimientos de materia prima.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedSucursal) {
      loadRequirements(selectedSucursal);
    }
  }, [selectedSucursal]);

  const handleCategoryChange = (event: any) => {
    const value = event.target.value;
    setSelectedCategories(typeof value === 'string' ? value.split(',') : value);
  };

  const handleCantidadChange = (productId: string, val: string) => {
    const num = parseFloat(val);
    setEditableCantidades((prev) => ({
      ...prev,
      [productId]: isNaN(num) ? 0 : num,
    }));
  };

  const handleProveedorChange = (productId: string, provId: string) => {
    setEditableProveedores((prev) => ({
      ...prev,
      [productId]: provId,
    }));
  };

  const handleToggleSelect = (productId: string) => {
    setSelectedItems((prev) => ({
      ...prev,
      [productId]: !prev[productId],
    }));
  };

  const handleSelectAll = (checked: boolean) => {
    const newSelected: Record<string, boolean> = {};
    filteredItems.forEach((item) => {
      newSelected[item.productoId] = checked;
    });
    setSelectedItems((prev) => ({
      ...prev,
      ...newSelected,
    }));
  };

  // Delete/dismiss item locally
  const handleDismissItem = (productId: string) => {
    setRequerimientos((prev) => prev.filter((item) => item.productoId !== productId));
    setSuccessMsg('Requerimiento descartado de la vista temporalmente.');
  };



  // General action: Create Purchase Orders for checked items
  const handleGeneratePurchaseOrders = async () => {
    const selectedList = filteredItems.filter((item) => selectedItems[item.productoId]);
    
    if (selectedList.length === 0) {
      setErrorMsg('Debe seleccionar al menos un requerimiento para generar órdenes de compra.');
      return;
    }

    // Prepare items payload
    const itemsPayload = [];
    for (const item of selectedList) {
      const qty = editableCantidades[item.productoId] || 0;
      const provId = editableProveedores[item.productoId];
      
      if (qty <= 0) {
        setErrorMsg(`La cantidad para ${item.descripcion} debe ser mayor a 0.`);
        return;
      }
      if (!provId) {
        setErrorMsg(`Debe seleccionar un proveedor para ${item.descripcion}.`);
        return;
      }

      // Find the cost
      const provAsoc = item.proveedoresAsociados.find((pa) => pa.proveedorId === provId);
      const costoUnitario = provAsoc ? provAsoc.costoProveedor : item.costoProveedor;

      itemsPayload.push({
        productoId: item.productoId,
        proveedorId: provId,
        cantidad: qty,
        costoUnitario,
      });
    }

    try {
      setErrorMsg(null);
      setSuccessMsg(null);
      
      const result = await apiFetch('/compras/requerimientos/crear', {
        method: 'POST',
        body: JSON.stringify({
          items: itemsPayload,
          sucursalId: selectedSucursal,
        }),
      });

      setSuccessMsg(`Se han creado con éxito ${result.ordenesCreadas} órdenes de compra agrupadas por proveedor.`);
      
      // Refresh list to update requirements (now that they have open OCs)
      loadRequirements(selectedSucursal);
    } catch (e: any) {
      setErrorMsg(e.message || 'Error al generar las órdenes de compra.');
    }
  };

  // Filter items based on selected categories
  const filteredItems = requerimientos.filter((item) =>
    selectedCategories.includes(item.categoria)
  );

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(val);
  };

  const isAllFilteredSelected = filteredItems.length > 0 && 
    filteredItems.every((item) => selectedItems[item.productoId]);

  return (
    <Box sx={{ p: 3, height: '100%', overflowY: 'auto' }}>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5 }}>
            Requerimientos de Materia Prima
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Revise los insumos y materias primas bajo el límite mínimo de inventario. Genere órdenes de compra masivas o lance órdenes de producción internas.
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          {isHQ && (
            <FormControl size="small" sx={{ minWidth: 220 }}>
              <InputLabel id="sucursal-label">Sucursal / Planta</InputLabel>
              <Select
                labelId="sucursal-label"
                value={selectedSucursal}
                label="Sucursal / Planta"
                onChange={(e) => setSelectedSucursal(e.target.value)}
              >
                {sucursales.map((suc) => (
                  <MenuItem key={suc.id} value={suc.id}>
                    {suc.nombre}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => loadRequirements(selectedSucursal)}
          >
            Actualizar
          </Button>

          <Button
            variant="contained"
            color="primary"
            startIcon={<ComprasIcon />}
            onClick={handleGeneratePurchaseOrders}
            disabled={filteredItems.length === 0}
          >
            Crear Órdenes de Compra
          </Button>
        </Box>
      </Box>

      {/* Messages */}
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

      {/* Category Multi-Select Filter */}
      {allCategories.length > 0 && (
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
          <FilterIcon color="action" />
          <FormControl size="small" sx={{ width: 400 }}>
            <InputLabel id="categories-filter-label">Categorías de Materia Prima</InputLabel>
            <Select
              labelId="categories-filter-label"
              multiple
              value={selectedCategories}
              onChange={handleCategoryChange}
              input={<OutlinedInput label="Categorías de Materia Prima" />}
              renderValue={(selected) => selected.join(', ')}
            >
              {allCategories.map((cat) => (
                <MenuItem key={cat} value={cat}>
                  <Checkbox checked={selectedCategories.indexOf(cat) > -1} />
                  <ListItemText primary={cat} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Typography variant="body2" color="text.secondary">
            Mostrando {filteredItems.length} de {requerimientos.length} insumos con faltantes.
          </Typography>
        </Box>
      )}

      {/* Table Container */}
      <Paper className="glass-panel" sx={{ p: 3, borderRadius: 3 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : filteredItems.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8, color: 'text.secondary' }}>
            <SuccessIcon sx={{ fontSize: 48, color: 'success.main', mb: 2 }} />
            <Typography variant="h6">¡Todo Abastecido!</Typography>
            <Typography variant="body2">
              No hay materias primas por debajo de su límite mínimo en la sucursal seleccionada.
            </Typography>
          </Box>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    indeterminate={
                      filteredItems.some((item) => selectedItems[item.productoId]) &&
                      !isAllFilteredSelected
                    }
                    checked={isAllFilteredSelected}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                  />
                </TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>SKU / Producto</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Categoría</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold' }}>Stock Actual</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold' }}>Mínimo</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold' }}>Máximo</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold', width: '130px' }}>Cant. Pedir</TableCell>
                <TableCell sx={{ fontWeight: 'bold', minWidth: '180px' }}>Proveedor Asignado</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredItems.map((item) => {
                const qtyVal = editableCantidades[item.productoId] ?? item.cantidadSugerida;
                const selectedProvId = editableProveedores[item.productoId] ?? '';
                const isSelected = !!selectedItems[item.productoId];
                
                return (
                  <TableRow
                    key={item.productoId}
                    hover
                    selected={isSelected}
                    sx={{
                      '&:last-child td, &:last-child th': { border: 0 },
                      backgroundColor: isSelected ? 'rgba(2, 132, 199, 0.04)' : 'inherit',
                    }}
                  >
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={isSelected}
                        onChange={() => handleToggleSelect(item.productoId)}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        {item.descripcion}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {item.sku}
                      </Typography>
                    </TableCell>
                    <TableCell>{item.categoria}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>
                      <span style={{ color: item.existencia === 0 ? '#ef4444' : '#f59e0b' }}>
                        {item.existencia}
                      </span>
                    </TableCell>
                    <TableCell align="right" color="text.secondary">
                      {item.existMin}
                    </TableCell>
                    <TableCell align="right" color="text.secondary">
                      {item.existMax}
                    </TableCell>
                    <TableCell align="center">
                      <TextField
                        size="small"
                        type="number"
                        value={qtyVal}
                        onChange={(e) => handleCantidadChange(item.productoId, e.target.value)}
                        sx={{ width: '100px' }}
                      />
                    </TableCell>
                    <TableCell>
                      <FormControl size="small" fullWidth>
                        <Select
                          value={selectedProvId}
                          onChange={(e) => handleProveedorChange(item.productoId, e.target.value)}
                          displayEmpty
                        >
                          <MenuItem value="" disabled>
                            -- Seleccionar Proveedor --
                          </MenuItem>
                          {item.proveedoresAsociados.map((pa) => (
                            <MenuItem key={pa.proveedorId} value={pa.proveedorId}>
                              {pa.nombre} ({formatCurrency(pa.costoProveedor)})
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      {item.proveedoresAsociados.length === 0 && (
                        <Typography variant="caption" color="error.main" sx={{ display: 'block', mt: 0.5 }}>
                          ⚠️ Sin proveedores asociados
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                        <Tooltip title="Ocultar de la lista">
                          <IconButton
                            color="error"
                            onClick={() => handleDismissItem(item.productoId)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Paper>

    </Box>
  );
}
