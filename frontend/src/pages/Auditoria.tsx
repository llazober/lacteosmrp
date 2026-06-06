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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  TablePagination,
} from '@mui/material';
import {
  PersonAdd,
  Badge,
  VerifiedUser,
} from '@mui/icons-material';
import { apiFetch, useAuthStore } from '../store/useAuthStore';

export default function Auditoria() {
  const systemTimezone = useAuthStore((state) => state.systemTimezone);
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(() => {
    const tabParam = new URLSearchParams(window.location.search).get('tab');
    if (tabParam) {
      const tabMap: Record<string, number> = {
        bitacora: 0,
        personal: 1,
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
        bitacora: 0,
        personal: 1,
      };
      if (tabMap[tabParam] !== undefined && tabMap[tabParam] !== activeTab) {
        setActiveTab(tabMap[tabParam]);
      }
    }
  }, [searchParams]);

  const handleTabChange = (val: number) => {
    setActiveTab(val);
    const tabNames = ['bitacora', 'personal'];
    setSearchParams({ tab: tabNames[val] });
  };

  // Datos
  const [logs, setLogs] = useState<any[]>([]);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [sucursales, setSucursales] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);

  // States for pagination (Bitácora)
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);

  // Modales
  const [openUser, setOpenUser] = useState(false);
  const [userForm, setUserForm] = useState({
    nombre: '',
    email: '',
    password: '',
    pin: '',
    rol: 'CAJERO',
    sucursalId: '',
  });

  const [openEditUser, setOpenEditUser] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [editUserForm, setEditUserForm] = useState({
    nombre: '',
    rol: 'CAJERO',
    sucursalId: '',
    estado: 'ACTIVO',
    password: '',
    pin: '',
  });

  // Notificaciones
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    setPage(0);
    cargarDatos();
  }, [activeTab]);

  const cargarDatos = async () => {
    try {
      if (activeTab === 0) {
        const auditLogs = await apiFetch('/auditoria');
        setLogs(auditLogs);
      } else if (activeTab === 1) {
        const users = await apiFetch('/usuarios');
        setUsuarios(users);
        const branches = await apiFetch('/sucursales');
        setSucursales(branches);
        const rolesData = await apiFetch('/roles');
        setRoles(rolesData);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateUser = async () => {
    try {
      setErrorMsg(null);
      await apiFetch('/usuarios', {
        method: 'POST',
        body: JSON.stringify(userForm),
      });
      setSuccessMsg('Usuario creado exitosamente.');
      setOpenUser(false);
      cargarDatos();
    } catch (e: any) {
      setErrorMsg(e.message);
    }
  };

  const handleAbrirEditarUsuario = (user: any) => {
    setSelectedUser(user);
    setEditUserForm({
      nombre: user.nombre,
      rol: user.rol,
      sucursalId: user.sucursalId || '',
      estado: user.estado,
      password: '',
      pin: user.pin || '',
    });
    setOpenEditUser(true);
  };

  const handleEditUserSubmit = async () => {
    try {
      setErrorMsg(null);
      await apiFetch(`/usuarios/${selectedUser.id}`, {
        method: 'PUT',
        body: JSON.stringify(editUserForm),
      });
      setSuccessMsg('Usuario actualizado con éxito.');
      setOpenEditUser(false);
      setSelectedUser(null);
      cargarDatos();
    } catch (e: any) {
      setErrorMsg(e.message);
    }
  };

  return (
    <Box sx={{ p: 3, height: '100%', overflowY: 'auto' }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5 }}>
            Auditoría y Usuarios
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Inspeccione la bitácora de auditoría inmutable del sistema y administre el personal y roles.
          </Typography>
        </Box>

        {activeTab === 1 && (
          <Button
            variant="contained"
            color="primary"
            startIcon={<PersonAdd />}
            onClick={() => {
              setUserForm({
                nombre: '',
                email: '',
                password: '',
                pin: '',
                rol: 'CAJERO',
                sucursalId: '',
              });
              setOpenUser(true);
            }}
          >
            Registrar Personal
          </Button>
        )}

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

      <Tabs
        value={activeTab}
        onChange={(_, val) => handleTabChange(val)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          borderBottom: 1,
          borderColor: 'divider',
          mb: 3,
          '& .MuiTab-root': { fontWeight: 700 },
        }}
      >
        <Tab label="Bitácora de Auditoría" />
        <Tab label="Gestión de Personal y Roles" />
      </Tabs>

      {/* TAB 0: BITÁCORA */}
      {activeTab === 0 && (
        <Paper className="glass-panel" sx={{ p: 3 }}>
          <Box sx={{ overflowX: 'auto', width: '100%' }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Fecha / Hora</TableCell>
                  <TableCell>Usuario</TableCell>
                  <TableCell>Rol</TableCell>
                  <TableCell>Acción</TableCell>
                  <TableCell>Módulo</TableCell>
                  <TableCell>Detalles de Transacción</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">No hay registros de auditoría.</TableCell>
                  </TableRow>
                ) : (
                  logs.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>{new Date(log.fecha).toLocaleString('es-CO', { timeZone: systemTimezone })}</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>{log.usuarioNombre}</TableCell>
                      <TableCell><Chip label={log.usuario.rol} size="small" variant="outlined" /></TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>{log.accion}</TableCell>
                      <TableCell>
                        <Chip
                          label={log.modulo}
                          color={
                            log.modulo === 'POS'
                              ? 'secondary'
                              : log.modulo === 'INVENTARIO'
                              ? 'warning'
                              : log.modulo === 'TELEMETRIA'
                              ? 'info'
                              : 'default'
                          }
                          size="small"
                        />
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.8rem', fontFamily: 'monospace', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {log.detalles}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Box>
          <TablePagination
            rowsPerPageOptions={[10, 25, 50, 100]}
            component="div"
            count={logs.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
            labelRowsPerPage="Registros por página:"
            sx={{
              borderTop: '1px solid rgba(255, 255, 255, 0.1)',
              color: 'text.secondary',
            }}
          />
        </Paper>
      )}

      {/* TAB 1: PERSONAL */}
      {activeTab === 1 && (
        <Paper className="glass-panel" sx={{ p: 3 }}>
          <Box sx={{ overflowX: 'auto', width: '100%' }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Nombre completo</TableCell>
                  <TableCell>Correo</TableCell>
                  <TableCell>Rol Asignado</TableCell>
                  <TableCell>Sucursal</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell>Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {usuarios.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell sx={{ fontWeight: 700 }}>{user.nombre}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Chip label={user.rol} color="primary" size="small" sx={{ fontWeight: 700 }} />
                    </TableCell>
                    <TableCell>{user.sucursal?.nombre || 'Acceso Global'}</TableCell>
                    <TableCell>
                      <Chip
                        label={user.estado}
                        color={user.estado === 'ACTIVO' ? 'success' : 'error'}
                        size="small"
                        sx={{ fontWeight: 700 }}
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<Badge />}
                        onClick={() => handleAbrirEditarUsuario(user)}
                      >
                        Editar Rol/Clave
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        </Paper>
      )}

      {/* REGISTRAR USUARIO DIALOG */}
      <Dialog open={openUser} onClose={() => setOpenUser(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 800 }}>Registrar Personal / Cajero</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2, maxHeight: '60vh', overflowY: 'auto' }}>
          <TextField
            fullWidth
            label="Nombre Completo"
            size="small"
            value={userForm.nombre}
            onChange={(e) => setUserForm({ ...userForm, nombre: e.target.value })}
          />
          <TextField
            fullWidth
            label="Correo Electrónico"
            size="small"
            type="email"
            value={userForm.email}
            onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
          />
          <TextField
            fullWidth
            label="Contraseña Inicial"
            size="small"
            type="password"
            value={userForm.password}
            onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
          />
          <TextField
            fullWidth
            label="PIN de Autorización (4 dígitos)"
            size="small"
            type="password"
            value={userForm.pin}
            onChange={(e) => {
              const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 4);
              setUserForm({ ...userForm, pin: val });
            }}
            helperText="PIN personal de 4 dígitos para firmar y recibir traslados"
          />

          <FormControl fullWidth size="small">
            <InputLabel>Rol</InputLabel>
            <Select
              value={userForm.rol}
              label="Rol"
              onChange={(e) => setUserForm({ ...userForm, rol: e.target.value })}
            >
              {roles.map((r) => (
                <MenuItem key={r.id} value={r.nombre}>{r.nombre}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth size="small">
            <InputLabel>Sucursal Asignada</InputLabel>
            <Select
              value={userForm.sucursalId}
              label="Sucursal Asignada"
              onChange={(e) => setUserForm({ ...userForm, sucursalId: e.target.value })}
            >
              <MenuItem value="">-- Ninguna (Acceso Global) --</MenuItem>
              {sucursales.map((s) => (
                <MenuItem key={s.id} value={s.id}>{s.nombre}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenUser(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleCreateUser}>Guardar Personal</Button>
        </DialogActions>
      </Dialog>

      {/* EDITAR USUARIO DIALOG */}
      <Dialog open={openEditUser} onClose={() => { setOpenEditUser(false); setSelectedUser(null); }} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
          <VerifiedUser color="primary" /> Editar Personal: {selectedUser?.nombre}
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2, maxHeight: '60vh', overflowY: 'auto' }}>
          <TextField
            fullWidth
            label="Nombre Completo"
            size="small"
            value={editUserForm.nombre}
            onChange={(e) => setEditUserForm({ ...editUserForm, nombre: e.target.value })}
          />

          <TextField
            fullWidth
            label="Correo Electrónico"
            size="small"
            value={selectedUser?.email || ''}
            disabled
          />

          <FormControl fullWidth size="small">
            <InputLabel>Rol</InputLabel>
            <Select
              value={editUserForm.rol}
              label="Rol"
              onChange={(e) => setEditUserForm({ ...editUserForm, rol: e.target.value })}
            >
              {roles.map((r) => (
                <MenuItem key={r.id} value={r.nombre}>{r.nombre}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth size="small">
            <InputLabel>Sucursal Asignada</InputLabel>
            <Select
              value={editUserForm.sucursalId}
              label="Sucursal Asignada"
              onChange={(e) => setEditUserForm({ ...editUserForm, sucursalId: e.target.value })}
            >
              <MenuItem value="">-- Ninguna (Acceso Global) --</MenuItem>
              {sucursales.map((s) => (
                <MenuItem key={s.id} value={s.id}>{s.nombre}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth size="small">
            <InputLabel>Estado</InputLabel>
            <Select
              value={editUserForm.estado}
              label="Estado"
              onChange={(e) => setEditUserForm({ ...editUserForm, estado: e.target.value })}
            >
              <MenuItem value="ACTIVO">Activo</MenuItem>
              <MenuItem value="INACTIVO">Inactivo</MenuItem>
            </Select>
          </FormControl>

          <TextField
            fullWidth
            label="Cambiar Contraseña (Dejar en blanco para mantener)"
            size="small"
            type="password"
            value={editUserForm.password}
            onChange={(e) => setEditUserForm({ ...editUserForm, password: e.target.value })}
          />
          <TextField
            fullWidth
            label="PIN de Autorización (4 dígitos)"
            size="small"
            type="password"
            value={editUserForm.pin}
            onChange={(e) => {
              const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 4);
              setEditUserForm({ ...editUserForm, pin: val });
            }}
            helperText="PIN personal de 4 dígitos para firmar y recibir traslados"
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => { setOpenEditUser(false); setSelectedUser(null); }}>Cancelar</Button>
          <Button variant="contained" onClick={handleEditUserSubmit}>Guardar Cambios</Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
}
