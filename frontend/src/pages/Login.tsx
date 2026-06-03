import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Alert,
  InputAdornment,
  IconButton,
} from '@mui/material';
import { Visibility, VisibilityOff, Storefront } from '@mui/icons-material';
import { useAuthStore, apiFetch } from '../store/useAuthStore';

export default function Login() {
  const loginGlobal = useAuthStore((state) => state.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Recovery Password states
  const [forgotPasswordMode, setForgotPasswordMode] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryMessage, setRecoveryMessage] = useState<string | null>(null);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const [recoveryLoading, setRecoveryLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Por favor, complete todos los campos.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const data = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      loginGlobal(data.token, data.usuario);
    } catch (err: any) {
      setError(err.message || 'Error de conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  const handleRecoverySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryEmail) {
      setRecoveryError('Por favor, ingrese su correo electrónico.');
      return;
    }

    setRecoveryError(null);
    setRecoveryMessage(null);
    setRecoveryLoading(true);

    try {
      const data = await apiFetch('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: recoveryEmail }),
      });
      setRecoveryMessage(data.message);
    } catch (err: any) {
      setRecoveryError(err.message || 'Error al procesar la solicitud.');
    } finally {
      setRecoveryLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(circle at 10% 20%, rgba(2, 132, 199, 0.15) 0%, rgba(15, 23, 42, 0) 60%), radial-gradient(circle at 90% 80%, rgba(16, 185, 129, 0.15) 0%, rgba(11, 15, 25, 0) 60%)',
        backgroundColor: '#0b0f19',
        p: 2,
      }}
    >
      <Card
        className="glass-panel"
        sx={{
          maxWidth: 450,
          width: '100%',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
          borderRadius: 4,
          border: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        <CardContent sx={{ p: 4 }}>
          {/* Logo / Header */}
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(2, 132, 199, 0.15)',
                color: 'primary.main',
                p: 2,
                borderRadius: '50%',
                mb: 2,
              }}
            >
              <Storefront sx={{ fontSize: 40 }} />
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 800, mb: 1, letterSpacing: '-0.03em' }}>
              La Vaquita
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Sistema Integral de Gestión y Cadena de Frío
            </Typography>
          </Box>

          {forgotPasswordMode ? (
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800, mb: 1, textAlign: 'center', letterSpacing: '-0.02em', color: 'text.primary' }}>
                Recuperar Contraseña
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3, textAlign: 'center' }}>
                Ingresa tu correo electrónico registrado y restableceremos tu contraseña.
              </Typography>

              {recoveryError && (
                <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
                  {recoveryError}
                </Alert>
              )}

              {recoveryMessage && (
                <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }}>
                  {recoveryMessage}
                </Alert>
              )}

              {!recoveryMessage ? (
                <form onSubmit={handleRecoverySubmit}>
                  <TextField
                    fullWidth
                    label="Correo Electrónico"
                    variant="outlined"
                    type="email"
                    value={recoveryEmail}
                    onChange={(e) => setRecoveryEmail(e.target.value)}
                    sx={{ mb: 3 }}
                    slotProps={{
                      input: { style: { borderRadius: 10 } },
                    }}
                    required
                  />

                  <Button
                    fullWidth
                    size="large"
                    variant="contained"
                    type="submit"
                    disabled={recoveryLoading}
                    sx={{
                      py: 1.5,
                      borderRadius: 2.5,
                      fontSize: '1rem',
                      fontWeight: 700,
                      background: 'linear-gradient(135deg, #0284c7 0%, #10b981 100%)',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #0369a1 0%, #047857 100%)',
                      },
                      mb: 2,
                    }}
                  >
                    {recoveryLoading ? 'Restableciendo...' : 'Restablecer Contraseña'}
                  </Button>

                  <Button
                    fullWidth
                    variant="text"
                    onClick={() => {
                      setForgotPasswordMode(false);
                      setRecoveryMessage(null);
                      setRecoveryError(null);
                    }}
                    sx={{
                      textTransform: 'none',
                      color: 'text.secondary',
                      fontWeight: 600,
                      '&:hover': {
                        color: 'text.primary',
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      },
                    }}
                  >
                    Volver al Inicio de Sesión
                  </Button>
                </form>
              ) : (
                <Button
                  fullWidth
                  size="large"
                  variant="contained"
                  onClick={() => {
                    setForgotPasswordMode(false);
                    setRecoveryMessage(null);
                    setRecoveryError(null);
                    setEmail(recoveryEmail);
                  }}
                  sx={{
                    py: 1.5,
                    borderRadius: 2.5,
                    fontSize: '1rem',
                    fontWeight: 700,
                    background: 'linear-gradient(135deg, #0284c7 0%, #10b981 100%)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #0369a1 0%, #047857 100%)',
                    },
                    mb: 2,
                  }}
                >
                  Volver al Inicio de Sesión
                </Button>
              )}
            </Box>
          ) : (
            <Box>
              {error && (
                <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
                  {error}
                </Alert>
              )}

              <form onSubmit={handleSubmit}>
                <TextField
                  fullWidth
                  label="Correo Electrónico"
                  variant="outlined"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  sx={{ mb: 2 }}
                  slotProps={{
                    input: { style: { borderRadius: 10 } },
                  }}
                />

                <TextField
                  fullWidth
                  label="Contraseña"
                  variant="outlined"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  sx={{ mb: 1.5 }}
                  slotProps={{
                    input: {
                      style: { borderRadius: 10 },
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                            {showPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    },
                  }}
                />

                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
                  <Button
                    variant="text"
                    size="small"
                    onClick={() => {
                      setForgotPasswordMode(true);
                      setError(null);
                      setRecoveryEmail(email);
                      setRecoveryMessage(null);
                      setRecoveryError(null);
                    }}
                    sx={{
                      textTransform: 'none',
                      color: 'primary.main',
                      fontWeight: 600,
                      fontSize: '0.85rem',
                      p: 0,
                      minWidth: 0,
                      '&:hover': {
                        color: 'primary.light',
                        backgroundColor: 'transparent',
                        textDecoration: 'underline',
                      },
                    }}
                  >
                    ¿Olvidaste tu contraseña?
                  </Button>
                </Box>

                <Button
                  fullWidth
                  size="large"
                  variant="contained"
                  type="submit"
                  disabled={loading}
                  sx={{
                    py: 1.5,
                    borderRadius: 2.5,
                    fontSize: '1rem',
                    fontWeight: 700,
                    background: 'linear-gradient(135deg, #0284c7 0%, #10b981 100%)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #0369a1 0%, #047857 100%)',
                    },
                  }}
                >
                  {loading ? 'Iniciando sesión...' : 'Ingresar'}
                </Button>
              </form>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
