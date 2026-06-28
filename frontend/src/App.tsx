import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import {
  Box, AppBar, Toolbar, Typography, IconButton,
  Avatar, Menu, MenuItem, Divider, Tooltip, Button,
  Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress
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
  CalendarToday as CalendarIcon,
  TaskAlt as TaskIcon,
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
  isToday,
} from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { useSnackbar } from 'notistack';
import Calendar from './components/Calendar';
import EventModal from './components/EventModal';
import EventViewModal from './components/EventViewModal';
import Sidebar from './components/Sidebar';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import EventEditPage from './pages/EventEditPage';
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
  const [isEventViewModalOpen, setIsEventViewModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [profileAnchorEl, setProfileAnchorEl] = useState<null | HTMLElement>(null);
  const [eventAnchorEl, setEventAnchorEl] = useState<null | HTMLElement>(null);
  const [defaultStartTime, setDefaultStartTime] = useState<Date | null>(null);

  interface CollisionDialogState {
    open: boolean;
    pendingEvent: Event | null;
    overlaps: Event[];
    updatePayload: any;
    originalEvent: Event | null;
    isCreate: boolean;
    masterId?: number;
  }
  const [collisionDialog, setCollisionDialog] = useState<CollisionDialogState>({
    open: false,
    pendingEvent: null,
    overlaps: [],
    updatePayload: null,
    originalEvent: null,
    isCreate: false,
  });
  const [isSavingCollision, setIsSavingCollision] = useState(false);

  const [draftEvent, setDraftEvent] = useState<Partial<Event> | null>(null);

  useEffect(() => { loadEvents(); }, []);

  useEffect(() => {
    // Dynamic Title
    const isTodayFlag = isToday(selectedDate);
    const dateStr = format(selectedDate, 'EEEE, d MMMM yyyy');
    document.title = `Google Calendar - ${dateStr}${isTodayFlag ? ', today' : ''}`;

    // Dynamic Favicon always shows today's date
    const dayNum = new Date().getDate();
    const faviconUrl = `https://www.gstatic.com/images/branding/productlogos/calendar_2026_${dayNum}/v2/png/calendar_2026_${dayNum}_96dp.png`;
    let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.getElementsByTagName('head')[0].appendChild(link);
    }
    link.href = faviconUrl;
  }, [selectedDate]);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const start = new Date(selectedDate.getFullYear() - 2, 0, 1).toISOString();
      const end = new Date(selectedDate.getFullYear() + 2, 11, 31).toISOString();
      setEvents(await eventService.getExpandedEvents(start, end));
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
      if (start.getMonth() === end.getMonth()) {
        return format(start, 'MMMM yyyy');
      } else if (start.getFullYear() === end.getFullYear()) {
        return `${format(start, 'MMM')} – ${format(end, 'MMM yyyy')}`;
      } else {
        return `${format(start, 'MMM yyyy')} – ${format(end, 'MMM yyyy')}`;
      }
    }
    return format(selectedDate, 'd MMMM yyyy');
  };

  const handleCreateEvent = (startTime?: Date, anchor?: HTMLElement) => {
    setSelectedEvent(null);
    setDefaultStartTime(startTime || null);
    setEventAnchorEl(anchor || null);
    setIsEventModalOpen(true);
  };

  const handleEditEvent = (event: Event, anchor?: HTMLElement) => {
    setSelectedEvent(event);
    setDefaultStartTime(null);
    setEventAnchorEl(anchor || null);
    setIsEventViewModalOpen(true);
  };

  const handleSaveEvent = async (eventData: Event) => {
    try {
      const excludeId = selectedEvent?.id ? Number(selectedEvent.id.toString().split('_')[0]) : undefined;
      const overlaps = await eventService.getOverlappingEvents(
        eventData.startTime, 
        eventData.endTime, 
        excludeId
      );

      if (overlaps.length > 0) {
        setCollisionDialog({
          open: true,
          pendingEvent: eventData,
          overlaps,
          updatePayload: eventData,
          originalEvent: selectedEvent || null,
          isCreate: !selectedEvent,
        });
        return; // Wait for user confirmation
      }

      const saveId = selectedEvent?.id ? Number(selectedEvent.id.toString().split('_')[0]) : undefined;
      await executeSaveEvent(eventData, !selectedEvent, saveId);
    } catch (err: any) {
      enqueueSnackbar(err?.response?.data?.error || 'Failed to check event collision', { variant: 'error' });
    }
  };

  const executeSaveEvent = async (payload: any, isCreate: boolean, eventId?: number) => {
    try {
      if (!isCreate && eventId) {
        await eventService.updateEvent(eventId, payload);
        await loadEvents();
        enqueueSnackbar('Event updated!', { variant: 'success' });
      } else {
        await eventService.createEvent(payload);
        await loadEvents();
        enqueueSnackbar('Event created!', { variant: 'success' });
      }
      setIsEventModalOpen(false);
      setSelectedEvent(null);
      setEventAnchorEl(null);
      setDraftEvent(null);
    } catch (err: any) {
      enqueueSnackbar(err?.response?.data?.error || 'Failed to save event', { variant: 'error' });
      throw err;
    }
  };

  const handleDeleteEvent = async (eventId: number | string, scope?: string, originalStartTime?: string) => {
    try {
      await eventService.deleteEvent(eventId, scope, originalStartTime);
      enqueueSnackbar('Event deleted', { variant: 'info' });
      await loadEvents();
      setIsEventModalOpen(false);
      setIsEventViewModalOpen(false);
      setSelectedEvent(null);
      setEventAnchorEl(null);
      setDraftEvent(null);
    } catch {
      enqueueSnackbar('Failed to delete event', { variant: 'error' });
    }
  };

  const handleEventDrop = async (eventId: number | string, newStartTime: Date, newEndTime: Date) => {
    try {
      const event = events.find(e => e.id === eventId);
      if (!event) return;

      // Optimistic UI Update
      setEvents(prev => prev.map(e => e.id === eventId ? {
        ...e,
        startTime: newStartTime.toISOString(),
        endTime: newEndTime.toISOString()
      } : e));

      const isOccurrence = typeof eventId === 'string' && eventId.includes('_');
      const parsedId = isOccurrence ? Number(eventId.toString().split('_')[0]) : (eventId as number);

      const updatePayload: any = {
        ...event,
        startTime: newStartTime.toISOString(),
        endTime: newEndTime.toISOString(),
      };
      
      if (isOccurrence) {
        updatePayload.updateScope = 'this';
        updatePayload.originalStartTime = new Date(Number(eventId.toString().split('_')[1])).toISOString();
      }

      // Zod doesn't accept null for optional strings
      if (updatePayload.location === null) delete updatePayload.location;
      if (updatePayload.description === null) delete updatePayload.description;
      if (updatePayload.color === null) delete updatePayload.color;
      
      // Check for overlap
      const overlaps = await eventService.getOverlappingEvents(updatePayload.startTime, updatePayload.endTime, parsedId);
      if (overlaps.length > 0) {
        setCollisionDialog({
          open: true,
          pendingEvent: { ...event, startTime: updatePayload.startTime, endTime: updatePayload.endTime },
          overlaps,
          updatePayload,
          originalEvent: event,
          isCreate: false,
          masterId: parsedId,
        });
        return; // Wait for user confirmation
      }

      await eventService.updateEvent(parsedId, updatePayload);
      // Sync with definitive server response
      await loadEvents();

      enqueueSnackbar('Event moved!', { variant: 'success' });
    } catch {
      loadEvents(); // Revert on failure
      enqueueSnackbar('Failed to move event', { variant: 'error' });
    }
  };

  const handleEventResize = async (eventId: number | string, newStartTime: Date, newEndTime: Date) => {
    try {
      const event = events.find(e => e.id === eventId);
      if (!event) return;

      // Optimistic UI Update
      setEvents(prev => prev.map(e => e.id === eventId ? {
        ...e,
        startTime: newStartTime.toISOString(),
        endTime: newEndTime.toISOString()
      } : e));

      const isOccurrence = typeof eventId === 'string' && eventId.includes('_');
      const parsedId = isOccurrence ? Number(eventId.toString().split('_')[0]) : (eventId as number);

      const updatePayload: any = {
        ...event,
        startTime: newStartTime.toISOString(),
        endTime: newEndTime.toISOString(),
      };
      
      if (isOccurrence) {
        updatePayload.updateScope = 'this';
        updatePayload.originalStartTime = new Date(Number(eventId.toString().split('_')[1])).toISOString();
      }

      // Zod doesn't accept null for optional strings
      if (updatePayload.location === null) delete updatePayload.location;
      if (updatePayload.description === null) delete updatePayload.description;
      if (updatePayload.color === null) delete updatePayload.color;
      
      // Check for overlap
      const overlaps = await eventService.getOverlappingEvents(updatePayload.startTime, updatePayload.endTime, parsedId);
      if (overlaps.length > 0) {
        setCollisionDialog({
          open: true,
          pendingEvent: { ...event, startTime: updatePayload.startTime, endTime: updatePayload.endTime },
          overlaps,
          updatePayload,
          originalEvent: event,
          isCreate: false,
          masterId: parsedId,
        });
        return; // Wait for user confirmation
      }

      await eventService.updateEvent(parsedId, updatePayload);
      // Sync with definitive server response
      await loadEvents();

      // Optional: No snackbar for resizing so it doesn't get annoying, but we'll leave it for now
      enqueueSnackbar('Event updated', { variant: 'success' });
    } catch {
      loadEvents(); // Revert on failure
      enqueueSnackbar('Failed to resize event', { variant: 'error' });
    }
  };

  const handleConfirmCollision = async () => {
    const { updatePayload, originalEvent, isCreate } = collisionDialog;
    if (!updatePayload) return;
    
    setIsSavingCollision(true);
    try {
      if (isCreate || !originalEvent) {
        await executeSaveEvent(updatePayload, true);
      } else {
        // If it was from a drag/resize optimistic update, executeSaveEvent handles the state update already if we pass false. 
        // Wait, executeSaveEvent closes the modal, which is fine even if it wasn't open.
        const masterId = collisionDialog.masterId ?? (originalEvent.id ? Number(originalEvent.id.toString().split('_')[0]) : undefined);
        await executeSaveEvent(updatePayload, false, masterId);
      }
    } catch {
      loadEvents(); // Revert on failure
    } finally {
      setIsSavingCollision(false);
      setCollisionDialog(prev => ({ ...prev, open: false }));
    }
  };

  const handleCancelCollision = () => {
    const { originalEvent } = collisionDialog;
    if (originalEvent) {
      // Revert optimistic update
      setEvents(prev => prev.map(e => e.id === originalEvent.id ? originalEvent : e));
    }
    setCollisionDialog(prev => ({ ...prev, open: false }));
  };

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', backgroundColor: '#f8f9fa' }}>

      {/* ── Single unified top AppBar (no duplicate in sidebar) ── */}
      <AppBar
        position="static"
        elevation={0}
        sx={{
          backgroundColor: '#f8f9fa',
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

          <Box sx={{ ml: 2, mr: 2 }}>
            <ViewDropdown currentView={currentView} onViewChange={setCurrentView} />
          </Box>

          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              border: '1px solid #dadce0',
              borderRadius: '20px',
              overflow: 'hidden',
              mr: 2,
              height: 34,
            }}
          >
            <Tooltip title="Calendar">
              <Box
                sx={{
                  backgroundColor: '#c2e7ff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 48,
                  height: '100%',
                  cursor: 'pointer',
                }}
              >
                <CalendarIcon sx={{ fontSize: 20, color: '#001d35' }} />
              </Box>
            </Tooltip>
            <Divider orientation="vertical" flexItem sx={{ borderColor: '#dadce0', margin: 0 }} />
            <Tooltip title="Tasks">
              <Box
                sx={{
                  backgroundColor: 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 48,
                  height: '100%',
                  cursor: 'pointer',
                  '&:hover': { backgroundColor: '#f1f3f4' }
                }}
              >
                <TaskIcon sx={{ fontSize: 20, color: '#444746' }} />
              </Box>
            </Tooltip>
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
              onClick={(e) => setProfileAnchorEl(e.currentTarget)}
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
                {user?.name.charAt(0).toUpperCase()}
              </Avatar>
            </IconButton>
          </Tooltip>

          <Menu
            anchorEl={profileAnchorEl}
            open={Boolean(profileAnchorEl)}
            onClose={() => setProfileAnchorEl(null)}
            PaperProps={{ sx: { borderRadius: '12px', minWidth: 220, mt: 0.5, boxShadow: '0 4px 20px rgba(0,0,0,0.15)' } }}
          >
            <Box sx={{ px: 2, py: 1.5 }}>
              <Typography variant="body2" fontWeight={600} color="#202124">{user?.name}</Typography>
              <Typography variant="caption" color="text.secondary">{user?.email}</Typography>
            </Box>
            <Divider />
            <MenuItem
              onClick={() => { logout(); setProfileAnchorEl(null); }}
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
                  events={draftEvent ? [...events, draftEvent as Event] : events}
                  currentView={currentView}
                  selectedDate={selectedDate}
                  onViewChange={setCurrentView}
                  onDateChange={setSelectedDate}
                  onEventClick={handleEditEvent}
                  onCreateEvent={handleCreateEvent}
                  onEventDrop={handleEventDrop}
                  onEventResize={handleEventResize}
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
            backgroundColor: '#f8f9fa',
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
        anchorEl={eventAnchorEl}
        onClose={() => { setIsEventModalOpen(false); setSelectedEvent(null); setEventAnchorEl(null); setDraftEvent(null); }}
        onSave={handleSaveEvent}
        onDelete={handleDeleteEvent}
        event={selectedEvent}
        defaultStartTime={defaultStartTime}
        onChange={(draft) => setDraftEvent(draft)}
      />

      <EventViewModal
        open={isEventViewModalOpen}
        anchorEl={eventAnchorEl}
        onClose={() => { setIsEventViewModalOpen(false); setSelectedEvent(null); setEventAnchorEl(null); }}
        event={selectedEvent}
        onDelete={handleDeleteEvent}
      />

      {/* Collision Confirmation Dialog */}
      <Dialog open={collisionDialog.open} onClose={handleCancelCollision} PaperProps={{ sx: { borderRadius: '12px' } }}>
        <DialogTitle sx={{ fontWeight: 600 }}>Time Conflict</DialogTitle>
        <DialogContent sx={{ minWidth: 300 }}>
          <Typography variant="body1" sx={{ mb: 2 }}>
            This event overlaps with {collisionDialog.overlaps.map(e => e.title || '(No title)').join(', ')}. 
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Are you sure you want to save it here?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button onClick={handleCancelCollision} sx={{ color: '#5f6368', textTransform: 'none', fontWeight: 500 }}>
            Cancel
          </Button>
          <Button 
            onClick={handleConfirmCollision} 
            variant="contained" 
            disabled={isSavingCollision}
            sx={{ backgroundColor: '#1a73e8', textTransform: 'none', borderRadius: '20px', boxShadow: 'none' }}
          >
            {isSavingCollision ? <CircularProgress size={20} color="inherit" /> : 'Save anyway'}
          </Button>
        </DialogActions>
      </Dialog>
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
          borderRadius: '20px',
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
          <Route path="/eventedit/:id?" element={<ProtectedRoute><EventEditPage /></ProtectedRoute>} />
          <Route path="/*" element={<ProtectedRoute><CalendarApp /></ProtectedRoute>} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
