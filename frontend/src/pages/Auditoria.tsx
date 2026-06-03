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
} from '@mui/material';
import {
  PersonAdd,
  Badge,
  VerifiedUser,
} from '@mui/icons-material';
import { apiFetch, useAuthStore } from '../store/useAuthStore';

export default function Auditoria() {
  const usuario = useAuthStore((state) => state.usuario);
  const systemTimezone = useAuthStore((state) => state.systemTimezone);
  const [activeTab, setActiveTab] = useState(0);

  // Datos
  const [logs, setLogs] = useState<any[]>([]);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [sucursales, setSucursales] = useState<any[]>([]);

  // Modales de Sucursales
  const [openSucursal, setOpenSucursal] = useState(false);
  const [sucursalForm, setSucursalForm] = useState({
    codigo: '',
    nombre: '',
    direccion: '',
    telefono: '',
    correo: '',
  });
  const [openEditSucursal, setOpenEditSucursal] = useState(false);
  const [selectedSucursal, setSelectedSucursal] = useState<any>(null);
  const [editSucursalForm, setEditSucursalForm] = useState({
    nombre: '',
    direccion: '',
    telefono: '',
    correo: '',
    estado: 'ACTIVO',
  });

  // Modales
  const [openUser, setOpenUser] = useState(false);
  const [userForm, setUserForm] = useState({
    nombre: '',
    email: '',
    password: '',
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
  });

  // Notificaciones
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
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
      } else if (activeTab === 2) {
        const branches = await apiFetch('/sucursales');
        setSucursales(branches);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateSucursal = async () => {
    try {
      setErrorMsg(null);
      if (!sucursalForm.codigo.trim() || !sucursalForm.nombre.trim()) {
        throw new Error('El código y el nombre son requeridos.');
      }
      await apiFetch('/sucursales', {
        method: 'POST',
        body: JSON.stringify(sucursalForm),
      });
      setSuccessMsg('Sucursal creada exitosamente.');
      setOpenSucursal(false);
      cargarDatos();
    } catch (e: any) {
      setErrorMsg(e.message);
    }
  };

  const handleAbrirEditarSucursal = (sucursal: any) => {
    setSelectedSucursal(sucursal);
    setEditSucursalForm({
      nombre: sucursal.nombre,
      direccion: sucursal.direccion || '',
      telefono: sucursal.telefono || '',
      correo: sucursal.correo || '',
      estado: sucursal.estado,
    });
    setOpenEditSucursal(true);
  };

  const handleEditSucursalSubmit = async () => {
    try {
      setErrorMsg(null);
      if (!editSucursalForm.nombre.trim()) {
        throw new Error('El nombre de la sucursal es obligatorio.');
      }
      await apiFetch(`/sucursales/${selectedSucursal.id}`, {
        method: 'PUT',
        body: JSON.stringify(editSucursalForm),
      });
      setSuccessMsg('Sucursal actualizada con éxito.');
      setOpenEditSucursal(false);
      setSelectedSucursal(null);
      cargarDatos();
    } catch (e: any) {
      setErrorMsg(e.message);
    }
  };

  const handleEliminarSucursal = async (id: string) => {
    if (!window.confirm('¿Está seguro de que desea eliminar esta sucursal?')) return;
    try {
      setErrorMsg(null);
      await apiFetch(`/sucursales/${id}`, {
        method: 'DELETE',
      });
      setSuccessMsg('Sucursal eliminada con éxito.');
      cargarDatos();
    } catch (e: any) {
      setErrorMsg(e.message);
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
                rol: 'CAJERO',
                sucursalId: '',
              });
              setOpenUser(true);
            }}
          >
            Registrar Personal
          </Button>
        )}

        {activeTab === 2 && usuario?.rol === 'ADMINISTRADOR' && (
          <Button
            variant="contained"
            color="primary"
            onClick={() => {
              setSucursalForm({
                codigo: '',
                nombre: '',
                direccion: '',
                telefono: '',
                correo: '',
              });
              setOpenSucursal(true);
            }}
          >
            Registrar Sucursal
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
        onChange={(_, val) => setActiveTab(val)}
        sx={{
          borderBottom: 1,
          borderColor: 'divider',
          mb: 3,
          '& .MuiTab-root': { fontWeight: 700 },
        }}
      >
        <Tab label="Bitácora de Auditoría" />
        <Tab label="Gestión de Personal y Roles" />
        <Tab label="Gestión de Sucursales" />
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
                  logs.map((log) => (
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
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
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

          <FormControl fullWidth size="small">
            <InputLabel>Rol</InputLabel>
            <Select
              value={userForm.rol}
              label="Rol"
              onChange={(e) => setUserForm({ ...userForm, rol: e.target.value })}
            >
              <MenuItem value="ADMINISTRADOR">Administrador (Global)</MenuItem>
              <MenuItem value="SUPERVISOR">Supervisor (Global)</MenuItem>
              <MenuItem value="GERENTE_TIENDA">Gerente de Tienda (Sucursal)</MenuItem>
              <MenuItem value="CAJERO">Cajero (Sucursal)</MenuItem>
              <MenuItem value="ALMACEN">Operador de Almacén</MenuItem>
              <MenuItem value="CONTROL_CALIDAD">Inspector de Calidad</MenuItem>
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
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
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
              <MenuItem value="ADMINISTRADOR">Administrador (Global)</MenuItem>
              <MenuItem value="SUPERVISOR">Supervisor (Global)</MenuItem>
              <MenuItem value="GERENTE_TIENDA">Gerente de Tienda (Sucursal)</MenuItem>
              <MenuItem value="CAJERO">Cajero (Sucursal)</MenuItem>
              <MenuItem value="ALMACEN">Operador de Almacén</MenuItem>
              <MenuItem value="CONTROL_CALIDAD">Inspector de Calidad</MenuItem>
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
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => { setOpenEditUser(false); setSelectedUser(null); }}>Cancelar</Button>
          <Button variant="contained" onClick={handleEditUserSubmit}>Guardar Cambios</Button>
        </DialogActions>
      </Dialog>

      {/* TAB 2: SUCURSALES */}
      {activeTab === 2 && (
        <Paper className="glass-panel" sx={{ p: 3 }}>
          <Box sx={{ overflowX: 'auto', width: '100%' }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Código</TableCell>
                  <TableCell>Nombre</TableCell>
                  <TableCell>Dirección</TableCell>
                  <TableCell>Teléfono</TableCell>
                  <TableCell>Correo</TableCell>
                  <TableCell>Estado</TableCell>
                  {usuario?.rol === 'ADMINISTRADOR' && <TableCell align="right">Acciones</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {sucursales.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={usuario?.rol === 'ADMINISTRADOR' ? 7 : 6} align="center">
                      No hay sucursales registradas.
                    </TableCell>
                  </TableRow>
                ) : (
                  sucursales.map((suc) => (
                    <TableRow key={suc.id}>
                      <TableCell sx={{ fontFamily: 'monospace' }}>{suc.codigo}</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>{suc.nombre}</TableCell>
                      <TableCell>{suc.direccion || '—'}</TableCell>
                      <TableCell>{suc.telefono || '—'}</TableCell>
                      <TableCell>{suc.correo || '—'}</TableCell>
                      <TableCell>
                        <Chip
                          label={suc.estado}
                          color={suc.estado === 'ACTIVO' ? 'success' : 'error'}
                          size="small"
                          sx={{ fontWeight: 700 }}
                        />
                      </TableCell>
                      {usuario?.rol === 'ADMINISTRADOR' && (
                        <TableCell align="right">
                          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                            <Button
                              variant="outlined"
                              size="small"
                              color="info"
                              onClick={() => handleAbrirEditarSucursal(suc)}
                            >
                              Editar
                            </Button>
                            <Button
                              variant="outlined"
                              size="small"
                              color="error"
                              onClick={() => handleEliminarSucursal(suc.id)}
                            >
                              Eliminar
                            </Button>
                          </Box>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Box>
        </Paper>
      )}

      {/* REGISTRAR SUCURSAL DIALOG */}
      <Dialog open={openSucursal} onClose={() => setOpenSucursal(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 800 }}>Registrar Nueva Sucursal</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <TextField
            fullWidth
            label="Código de Sucursal"
            placeholder="SUC-003"
            size="small"
            value={sucursalForm.codigo}
            onChange={(e) => setSucursalForm({ ...sucursalForm, codigo: e.target.value })}
          />
          <TextField
            fullWidth
            label="Nombre"
            placeholder="Sucursal Providencia"
            size="small"
            value={sucursalForm.nombre}
            onChange={(e) => setSucursalForm({ ...sucursalForm, nombre: e.target.value })}
          />
          <TextField
            fullWidth
            label="Dirección"
            placeholder="Av. Providencia 1234"
            size="small"
            value={sucursalForm.direccion}
            onChange={(e) => setSucursalForm({ ...sucursalForm, direccion: e.target.value })}
          />
          <TextField
            fullWidth
            label="Teléfono"
            placeholder="+56 9 1234 5678"
            size="small"
            value={sucursalForm.telefono}
            onChange={(e) => setSucursalForm({ ...sucursalForm, telefono: e.target.value })}
          />
          <TextField
            fullWidth
            label="Correo Electrónico"
            placeholder="providencia@lavaquita.cl"
            size="small"
            value={sucursalForm.correo}
            onChange={(e) => setSucursalForm({ ...sucursalForm, correo: e.target.value })}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenSucursal(false)}>Cancelar</Button>
          <Button variant="contained" color="success" onClick={handleCreateSucursal}>Guardar</Button>
        </DialogActions>
      </Dialog>

      {/* EDITAR SUCURSAL DIALOG */}
      <Dialog open={openEditSucursal} onClose={() => { setOpenEditSucursal(false); setSelectedSucursal(null); }} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 800 }}>Editar Sucursal: {selectedSucursal?.nombre}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <TextField
            fullWidth
            label="Código de Sucursal"
            size="small"
            value={selectedSucursal?.codigo || ''}
            disabled
          />
          <TextField
            fullWidth
            label="Nombre"
            size="small"
            value={editSucursalForm.nombre}
            onChange={(e) => setEditSucursalForm({ ...editSucursalForm, nombre: e.target.value })}
          />
          <TextField
            fullWidth
            label="Dirección"
            size="small"
            value={editSucursalForm.direccion}
            onChange={(e) => setEditSucursalForm({ ...editSucursalForm, direccion: e.target.value })}
          />
          <TextField
            fullWidth
            label="Teléfono"
            size="small"
            value={editSucursalForm.telefono}
            onChange={(e) => setEditSucursalForm({ ...editSucursalForm, telefono: e.target.value })}
          />
          <TextField
            fullWidth
            label="Correo Electrónico"
            size="small"
            value={editSucursalForm.correo}
            onChange={(e) => setEditSucursalForm({ ...editSucursalForm, correo: e.target.value })}
          />
          <FormControl fullWidth size="small">
            <InputLabel>Estado</InputLabel>
            <Select
              value={editSucursalForm.estado}
              label="Estado"
              onChange={(e) => setEditSucursalForm({ ...editSucursalForm, estado: e.target.value })}
            >
              <MenuItem value="ACTIVO">Activo</MenuItem>
              <MenuItem value="INACTIVO">Inactivo</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => { setOpenEditSucursal(false); setSelectedSucursal(null); }}>Cancelar</Button>
          <Button variant="contained" color="primary" onClick={handleEditSucursalSubmit}>Guardar Cambios</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
