import React from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { SnackbarProvider } from 'notistack';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import App from './App';
import './index.css';

const theme = createTheme({
  palette: {
    primary: { main: '#1a73e8' },
    secondary: { main: '#34a853' },
    background: { default: '#ffffff' },
    error: { main: '#ea4335' },
    warning: { main: '#fbbc04' },
    success: { main: '#34a853' },
  },
  typography: {
    fontFamily: '"Google Sans", "Roboto", "Arial", sans-serif',
  },
  components: {
    MuiButton: {
      styleOverrides: { root: { textTransform: 'none', borderRadius: '6px' } },
    },
    MuiPaper: {
      styleOverrides: { root: { backgroundImage: 'none' } },
    },
  },
  shape: { borderRadius: 8 },
});

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <SnackbarProvider
          maxSnack={3}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          autoHideDuration={3000}
        >
          <App />
        </SnackbarProvider>
      </LocalizationProvider>
    </ThemeProvider>
  </React.StrictMode>
);
