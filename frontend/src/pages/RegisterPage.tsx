import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Link,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
} from '@mui/material';
import { Visibility, VisibilityOff, CalendarMonth } from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const RegisterPage: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      setError('Please fill in all fields.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    try {
      setIsLoading(true);
      setError('');
      await register(name, email, password);
      navigate('/', { replace: true });
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #e6f4ea 0%, #ffffff 50%, #e8f0fe 100%)',
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        <Paper
          elevation={0}
          sx={{
            p: { xs: 3, sm: 5 },
            width: { xs: '90vw', sm: 420 },
            borderRadius: '16px',
            border: '1px solid #dadce0',
            boxShadow: '0 8px 40px rgba(0,0,0,0.08)',
          }}
        >
          {/* Logo */}
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 56,
                height: 56,
                borderRadius: '16px',
                background: 'linear-gradient(135deg, #34a853, #1e8e3e)',
                boxShadow: '0 4px 14px rgba(52,168,83,0.4)',
                mb: 2,
              }}
            >
              <CalendarMonth sx={{ color: 'white', fontSize: 30 }} />
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 700, color: '#202124', mb: 0.5 }}>
              Create your account
            </Typography>
            <Typography variant="body2" sx={{ color: '#5f6368' }}>
              Get started with Google Calendar Clone
            </Typography>
          </Box>

          {error && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <Alert severity="error" sx={{ mb: 2, borderRadius: '8px' }}>
                {error}
              </Alert>
            </motion.div>
          )}

          <form onSubmit={handleSubmit}>
            <TextField
              id="register-name"
              label="Full name"
              fullWidth
              value={name}
              onChange={(e) => setName(e.target.value)}
              sx={{ mb: 2 }}
              disabled={isLoading}
              autoComplete="name"
            />
            <TextField
              id="register-email"
              label="Email address"
              type="email"
              fullWidth
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              sx={{ mb: 2 }}
              disabled={isLoading}
              autoComplete="email"
            />
            <TextField
              id="register-password"
              label="Password (min 6 characters)"
              type={showPassword ? 'text' : 'password'}
              fullWidth
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              sx={{ mb: 3 }}
              disabled={isLoading}
              autoComplete="new-password"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <Button
              id="register-submit-btn"
              type="submit"
              fullWidth
              variant="contained"
              color="success"
              disabled={isLoading}
              sx={{
                py: 1.5,
                fontSize: '1rem',
                fontWeight: 600,
                borderRadius: '8px',
                background: 'linear-gradient(90deg, #34a853, #1e8e3e)',
                boxShadow: '0 4px 14px rgba(52,168,83,0.4)',
                '&:hover': {
                  background: 'linear-gradient(90deg, #1e8e3e, #137333)',
                  boxShadow: '0 6px 20px rgba(52,168,83,0.5)',
                },
              }}
            >
              {isLoading ? <CircularProgress size={24} color="inherit" /> : 'Create account'}
            </Button>
          </form>

          <Box sx={{ textAlign: 'center', mt: 3 }}>
            <Typography variant="body2" sx={{ color: '#5f6368' }}>
              Already have an account?{' '}
              <Link component={RouterLink} to="/login" sx={{ color: '#1a73e8', fontWeight: 600 }}>
                Sign in
              </Link>
            </Typography>
          </Box>
        </Paper>
      </motion.div>
    </Box>
  );
};

export default RegisterPage;
