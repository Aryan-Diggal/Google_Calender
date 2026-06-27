import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import {
  Box, AppBar, Toolbar, Typography, IconButton,
  Avatar, Menu, MenuItem, Divider, Tooltip, Button,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Search as SearchIcon,
  HelpOutline as HelpIcon,
  Settings as SettingsIcon,
  AppsRounded as AppsIcon,
  Add as AddIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  ArrowDropDown as ArrowDropDownIcon,
} from '@mui/icons-material';
import {
  format,
  startOfWeek,
  endOfWeek,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
} from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { useSnackbar } from 'notistack';
import Calendar from './components/Calendar';
import EventModal from './components/EventModal';
import Sidebar from './components/Sidebar';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Event, CalendarView } from './types/Event';
import { eventService } from './services/api';

// ── Protected / Public Route wrappers ──────────────────────────────
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  return user ? <>{children}</> : <Navigate to="/login" replace />;
};

const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  return !user ? <>{children}</> : <Navigate to="/" replace />;
};

// ── Main calendar app ───────────────────────────────────────────────
function CalendarApp() {
  const { user, logout } = useAuth();
  const { enqueueSnackbar } = useSnackbar();

  const [events, setEvents] = useState<Event[]>([]);
  const [currentView, setCurrentView] = useState<CalendarView>('month');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [defaultStartTime, setDefaultStartTime] = useState<Date | null>(null);

  useEffect(() => { loadEvents(); }, []);

  const loadEvents = async () => {
    try {
      setLoading(true);
      setEvents(await eventService.getAllEvents());
    } catch {
      enqueueSnackbar('Failed to load events', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleToday = () => setSelectedDate(new Date());

  const navigateDate = (direction: 'prev' | 'next') => {
    let newDate: Date;
    if (currentView === 'month') {
      newDate = direction === 'prev' ? subMonths(selectedDate, 1) : addMonths(selectedDate, 1);
    } else if (currentView === 'week') {
      newDate = direction === 'prev' ? subWeeks(selectedDate, 1) : addWeeks(selectedDate, 1);
    } else {
      newDate = direction === 'prev' ? subDays(selectedDate, 1) : addDays(selectedDate, 1);
    }
    setSelectedDate(newDate);
  };

  const getHeaderTitle = () => {
    if (currentView === 'month') return format(selectedDate, 'MMMM yyyy');
    if (currentView === 'week') {
      const start = startOfWeek(selectedDate);
      const end = endOfWeek(selectedDate);
      return `${format(start, 'MMM d')} – ${format(end, start.getMonth() === end.getMonth() ? 'd, yyyy' : 'MMM d, yyyy')}`;
    }
    return format(selectedDate, 'EEEE, MMMM d, yyyy');
  };

  const handleCreateEvent = (startTime?: Date) => {
    setSelectedEvent(null);
    setDefaultStartTime(startTime || null);
    setIsEventModalOpen(true);
  };

  const handleEditEvent = (event: Event) => {
    setSelectedEvent(event);
    setDefaultStartTime(null);
    setIsEventModalOpen(true);
  };

  const handleSaveEvent = async (eventData: Event) => {
    try {
      if (selectedEvent) {
        await eventService.updateEvent(selectedEvent.id!, eventData);
        enqueueSnackbar('Event updated!', { variant: 'success' });
      } else {
        await eventService.createEvent(eventData);
        enqueueSnackbar('Event created!', { variant: 'success' });
      }
      await loadEvents();
      setIsEventModalOpen(false);
      setSelectedEvent(null);
    } catch (err: any) {
      enqueueSnackbar(err?.response?.data?.error || 'Failed to save event', { variant: 'error' });
    }
  };

  const handleDeleteEvent = async (eventId: number) => {
    try {
      await eventService.deleteEvent(eventId);
      enqueueSnackbar('Event deleted', { variant: 'info' });
      await loadEvents();
      setIsEventModalOpen(false);
      setSelectedEvent(null);
    } catch {
      enqueueSnackbar('Failed to delete event', { variant: 'error' });
    }
  };

  const handleEventDrop = async (eventId: number, newStartTime: Date, newEndTime: Date) => {
    try {
      const event = events.find(e => e.id === eventId);
      if (!event) return;
      await eventService.updateEvent(eventId, {
        ...event,
        startTime: newStartTime.toISOString(),
        endTime: newEndTime.toISOString(),
      });
      await loadEvents();
      enqueueSnackbar('Event moved!', { variant: 'success' });
    } catch {
      enqueueSnackbar('Failed to move event', { variant: 'error' });
    }
  };

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>

      {/* ── Single unified top AppBar (no duplicate in sidebar) ── */}
      <AppBar
        position="static"
        elevation={0}
        sx={{
          backgroundColor: '#ffffff',
          color: '#5f6368',
          borderBottom: 'none',
          zIndex: 1200,
          flexShrink: 0,
        }}
      >
        <Toolbar sx={{ minHeight: '64px !important', px: 2, gap: 0.5 }}>

          {/* Left: hamburger + logo + "Calendar" */}
          <Tooltip title="Main menu">
            <IconButton
              id="hamburger-btn"
              color="inherit"
              onClick={() => setSidebarOpen(s => !s)}
              sx={{ borderRadius: '50%', '&:hover': { backgroundColor: '#f1f3f4' } }}
            >
              <MenuIcon />
            </IconButton>
          </Tooltip>

          {/* Google Calendar-style date logo */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.75,
              ml: 0.5,
              mr: 1,
              textDecoration: 'none',
              cursor: 'default',
            }}
          >
            <img
              className="gb_6c gb_ge"
              src={`https://www.gstatic.com/images/branding/productlogos/calendar_2026_${new Date().getDate()}/v2/png/calendar_2026_${new Date().getDate()}_96dp.png`}
              srcSet={`https://www.gstatic.com/images/branding/productlogos/calendar_2026_${new Date().getDate()}/v2/png/calendar_2026_${new Date().getDate()}_96dp.png 1x, https://www.gstatic.com/images/branding/productlogos/calendar_2026_${new Date().getDate()}/v2/png/calendar_2026_${new Date().getDate()}_96dp.png 2x`}
              alt=""
              aria-hidden="true"
              role="presentation"
              style={{ width: '40px', height: '40px' }}
            />
            <Typography
              variant="h6"
              sx={{ color: '#3c4043', fontWeight: 400, fontSize: '1.375rem', letterSpacing: '-0.01em', mr: 2 }}
            >
              Calendar
            </Typography>
          </Box>

          {/* Calendar navigation */}
          <Box display="flex" alignItems="center" gap={0.5} sx={{ ml: 4 }}>
            <Button
              id="today-btn"
              variant="outlined"
              onClick={handleToday}
              size="small"
              sx={{
                textTransform: 'none',
                color: '#3c4043',
                borderColor: '#dadce0',
                borderRadius: '20px',
                fontWeight: 500,
                fontSize: '0.875rem',
                px: 2,
                mr: 0.5,
                '&:hover': { backgroundColor: '#f1f3f4', borderColor: '#c6c6c6' },
              }}
            >
              Today
            </Button>
            <IconButton
              id="prev-btn"
              onClick={() => navigateDate('prev')}
              size="small"
              sx={{ borderRadius: '50%', '&:hover': { backgroundColor: '#f1f3f4' } }}
            >
              <ChevronLeftIcon />
            </IconButton>
            <IconButton
              id="next-btn"
              onClick={() => navigateDate('next')}
              size="small"
              sx={{ borderRadius: '50%', '&:hover': { backgroundColor: '#f1f3f4' } }}
            >
              <ChevronRightIcon />
            </IconButton>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 400,
                color: '#3c4043',
                ml: 1,
                fontSize: '1.25rem',
                letterSpacing: '-0.01em',
                minWidth: 180,
              }}
            >
              {getHeaderTitle()}
            </Typography>
          </Box>

          {/* Spacer */}
          <Box sx={{ flexGrow: 1 }} />

          {/* Right: Search, Help, Settings, Apps, Avatar */}
          <Tooltip title="Search">
            <IconButton
              id="search-btn"
              color="inherit"
              sx={{ borderRadius: '50%', '&:hover': { backgroundColor: '#f1f3f4' } }}
            >
              <SearchIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title="Help">
            <IconButton
              id="help-btn"
              color="inherit"
              sx={{ borderRadius: '50%', '&:hover': { backgroundColor: '#f1f3f4' } }}
            >
              <HelpIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title="Settings">
            <IconButton
              id="settings-btn"
              color="inherit"
              sx={{ borderRadius: '50%', '&:hover': { backgroundColor: '#f1f3f4' } }}
            >
              <SettingsIcon />
            </IconButton>
          </Tooltip>

          <Box sx={{ ml: 2, mr: 1 }}>
            <ViewDropdown currentView={currentView} onViewChange={setCurrentView} />
          </Box>

          <Tooltip title="Google apps">
            <IconButton
              id="apps-btn"
              color="inherit"
              sx={{ borderRadius: '50%', '&:hover': { backgroundColor: '#f1f3f4' } }}
            >
              <AppsIcon />
            </IconButton>
          </Tooltip>

          {/* User avatar */}
          <Tooltip title={user?.name || 'Account'}>
            <IconButton
              id="avatar-btn"
              onClick={(e) => setAnchorEl(e.currentTarget)}
              sx={{ ml: 0.5 }}
            >
              <Avatar
                sx={{
                  width: 34,
                  height: 34,
                  background: 'linear-gradient(135deg, #4285f4, #1a73e8)',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                }}
              >
                {initials}
              </Avatar>
            </IconButton>
          </Tooltip>

          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={() => setAnchorEl(null)}
            PaperProps={{ sx: { borderRadius: '12px', minWidth: 220, mt: 0.5, boxShadow: '0 4px 20px rgba(0,0,0,0.15)' } }}
          >
            <Box sx={{ px: 2, py: 1.5 }}>
              <Typography variant="body2" fontWeight={600} color="#202124">{user?.name}</Typography>
              <Typography variant="caption" color="text.secondary">{user?.email}</Typography>
            </Box>
            <Divider />
            <MenuItem
              onClick={() => { logout(); setAnchorEl(null); }}
              sx={{ color: 'error.main', py: 1.25, fontSize: '0.875rem' }}
            >
              Sign out
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      {/* ── Below the AppBar: Sidebar + Calendar content side by side ── */}
      <Box sx={{ display: 'flex', flexGrow: 1, overflow: 'hidden', position: 'relative' }}>

        {/* Sidebar (Create button lives here) */}
        <Sidebar
          open={sidebarOpen}
          currentView={currentView}
          onViewChange={setCurrentView}
          onCreateEvent={() => handleCreateEvent()}
          selectedDate={selectedDate}
          onDateSelect={setSelectedDate}
        />

        {/* Main calendar area */}
        <Box sx={{ flexGrow: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', px: 2, pb: 2 }}>
          <Box
            sx={{
              flexGrow: 1,
              overflow: 'hidden',
              backgroundColor: '#ffffff',
              borderRadius: '24px',
              border: '1px solid #e0e0e0',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
            }}
          >
            {/* When sidebar is CLOSED → show compact FAB "+" button INSIDE the calendar card */}
            <AnimatePresence>
              {!sidebarOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.18 }}
                  style={{
                    position: 'absolute',
                    top: 16,
                    left: 16,
                    zIndex: 100,
                  }}
                >
                  <Tooltip title="Create new event" placement="right">
                    <Box
                      id="create-fab-btn"
                      onClick={() => handleCreateEvent()}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        px: 1.5,
                        py: 1,
                        backgroundColor: '#ffffff',
                        border: '1px solid #dadce0',
                        borderRadius: '16px',
                        cursor: 'pointer',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                        transition: 'box-shadow 0.2s',
                        '&:hover': {
                          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                        },
                      }}
                    >
                      <AddIcon sx={{ color: '#3c4043', fontSize: 22 }} />
                    </Box>
                  </Tooltip>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence mode="wait">
              <motion.div
                key={currentView}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.18 }}
                style={{ height: '100%' }}
              >
                <Calendar
                  events={events}
                  currentView={currentView}
                  selectedDate={selectedDate}
                  onViewChange={setCurrentView}
                  onDateChange={setSelectedDate}
                  onEventClick={handleEditEvent}
                  onCreateEvent={handleCreateEvent}
                  onEventDrop={handleEventDrop}
                  loading={loading}
                />
              </motion.div>
            </AnimatePresence>
          </Box>
        </Box>

        {/* Right Add-ons Sidebar */}
        <Box
          sx={{
            width: 56,
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            pt: 1,
            pb: 2,
            gap: 2.5,
            backgroundColor: '#ffffff',
            zIndex: 10,
          }}
        >
          <Tooltip title="Keep" placement="left">
            <IconButton sx={{ width: 40, height: 40 }}>
              <img src="https://www.gstatic.com/images/branding/product/1x/keep_48dp.png" alt="Keep" style={{ width: 20, height: 20 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Tasks" placement="left">
            <IconButton sx={{ width: 40, height: 40 }}>
              <img src="https://www.gstatic.com/images/branding/product/1x/tasks_48dp.png" alt="Tasks" style={{ width: 20, height: 20 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Contacts" placement="left">
            <IconButton sx={{ width: 40, height: 40 }}>
              <img src="https://www.gstatic.com/images/branding/product/1x/contacts_48dp.png" alt="Contacts" style={{ width: 20, height: 20 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Maps" placement="left">
            <IconButton sx={{ width: 40, height: 40 }}>
              <img src="https://www.gstatic.com/images/branding/product/1x/maps_48dp.png" alt="Maps" style={{ width: 20, height: 20 }} />
            </IconButton>
          </Tooltip>

          <Divider sx={{ width: 24, my: 1 }} />

          <Tooltip title="Get add-ons" placement="left">
            <IconButton sx={{ width: 40, height: 40 }}>
              <AddIcon sx={{ color: '#3c4043' }} />
            </IconButton>
          </Tooltip>

          <Box sx={{ flexGrow: 1 }} />

          <Tooltip title="Hide side panel" placement="left">
            <IconButton sx={{ width: 40, height: 40, '&:hover': { backgroundColor: '#f1f3f4' } }}>
              <ChevronRightIcon sx={{ color: '#3c4043' }} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      <EventModal
        open={isEventModalOpen}
        onClose={() => { setIsEventModalOpen(false); setSelectedEvent(null); }}
        onSave={handleSaveEvent}
        onDelete={handleDeleteEvent}
        event={selectedEvent}
        defaultStartTime={defaultStartTime}
      />
    </Box>
  );
}

// ── Google Calendar-style dropdown view switcher ──
const VIEW_OPTIONS: { label: string; value: 'month' | 'week' | 'day' }[] = [
  { label: 'Month', value: 'month' },
  { label: 'Week', value: 'week' },
  { label: 'Day', value: 'day' },
];

const ViewDropdown: React.FC<{
  currentView: 'month' | 'week' | 'day';
  onViewChange: (v: 'month' | 'week' | 'day') => void;
}> = ({ currentView, onViewChange }) => {
  const [anchor, setAnchor] = React.useState<null | HTMLElement>(null);
  const label = VIEW_OPTIONS.find(v => v.value === currentView)?.label ?? 'Month';

  return (
    <>
      <Button
        id="view-dropdown-btn"
        variant="outlined"
        endIcon={<ArrowDropDownIcon />}
        onClick={(e) => setAnchor(e.currentTarget)}
        size="small"
        sx={{
          textTransform: 'none',
          color: '#3c4043',
          borderColor: '#dadce0',
          borderRadius: '4px',
          fontWeight: 500,
          fontSize: '0.875rem',
          px: 2,
          '&:hover': { backgroundColor: '#f1f3f4', borderColor: '#c6c6c6' },
        }}
      >
        {label}
      </Button>
      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        PaperProps={{
          sx: {
            borderRadius: '12px',
            mt: 0.5,
            minWidth: 140,
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          },
        }}
      >
        {VIEW_OPTIONS.map((opt) => (
          <MenuItem
            key={opt.value}
            selected={currentView === opt.value}
            onClick={() => { onViewChange(opt.value); setAnchor(null); }}
            sx={{
              fontSize: '0.875rem',
              fontWeight: currentView === opt.value ? 600 : 400,
              color: currentView === opt.value ? '#1a73e8' : '#3c4043',
              '&.Mui-selected': { backgroundColor: '#e8f0fe' },
              borderRadius: '6px',
              mx: 0.5,
              my: 0.25,
            }}
          >
            {opt.label}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
          <Route path="/*" element={<ProtectedRoute><CalendarApp /></ProtectedRoute>} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
