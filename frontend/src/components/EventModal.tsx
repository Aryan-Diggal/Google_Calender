import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  IconButton,
  FormControlLabel,
  Switch,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Typography,
  Alert,
  Chip,
  CircularProgress,
  Tooltip,
} from '@mui/material';
import {
  Close as CloseIcon,
  Delete as DeleteIcon,
  Schedule as ScheduleIcon,
  LocationOn as LocationIcon,
  Notes as NotesIcon,
  Palette as PaletteIcon,
  Repeat as RepeatIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { format, addHours, parseISO } from 'date-fns';
import { Event } from '../types/Event';
import { eventService } from '../services/api';

interface EventModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (event: Event) => Promise<void>;
  onDelete: (eventId: number) => Promise<void>;
  event: Event | null;
  defaultStartTime?: Date | null;
}

const EVENT_COLORS = [
  { label: 'Blueberry', value: '#1a73e8' },
  { label: 'Tomato', value: '#ea4335' },
  { label: 'Sage', value: '#33b679' },
  { label: 'Flamingo', value: '#e67c73' },
  { label: 'Tangerine', value: '#f6bf26' },
  { label: 'Banana', value: '#f6bf26' },
  { label: 'Peacock', value: '#039be5' },
  { label: 'Graphite', value: '#616161' },
  { label: 'Lavender', value: '#7986cb' },
  { label: 'Grape', value: '#8e24aa' },
];

const formatDateTimeLocal = (date: Date): string => {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const EventModal: React.FC<EventModalProps> = ({
  open,
  onClose,
  onSave,
  onDelete,
  event,
  defaultStartTime,
}) => {
  const isEditing = Boolean(event);

  const getDefaultStart = () => {
    if (defaultStartTime) return formatDateTimeLocal(defaultStartTime);
    const now = new Date();
    now.setMinutes(0, 0, 0);
    return formatDateTimeLocal(now);
  };

  const getDefaultEnd = () => {
    if (defaultStartTime) return formatDateTimeLocal(addHours(defaultStartTime, 1));
    const now = new Date();
    now.setMinutes(0, 0, 0);
    return formatDateTimeLocal(addHours(now, 1));
  };

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState(getDefaultStart());
  const [endTime, setEndTime] = useState(getDefaultEnd());
  const [location, setLocation] = useState('');
  const [color, setColor] = useState('#1a73e8');
  const [allDay, setAllDay] = useState(false);
  const [recurrence, setRecurrence] = useState<'none' | 'daily' | 'weekly' | 'monthly'>('none');
  const [overlappingEvents, setOverlappingEvents] = useState<Event[]>([]);
  const [overlapChecked, setOverlapChecked] = useState(false);
  const [checkingOverlap, setCheckingOverlap] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Populate fields when editing
  useEffect(() => {
    if (event) {
      setTitle(event.title);
      setDescription(event.description || '');
      setStartTime(formatDateTimeLocal(new Date(event.startTime)));
      setEndTime(formatDateTimeLocal(new Date(event.endTime)));
      setLocation(event.location || '');
      setColor(event.color || '#1a73e8');
      setAllDay(event.allDay || false);
      setRecurrence((event.recurrence as any) || 'none');
    } else {
      setTitle('');
      setDescription('');
      setStartTime(getDefaultStart());
      setEndTime(getDefaultEnd());
      setLocation('');
      setColor('#1a73e8');
      setAllDay(false);
      setRecurrence('none');
    }
    setOverlappingEvents([]);
    setOverlapChecked(false);
    setErrors({});
  }, [event, open, defaultStartTime]);

  // Check overlap when times change
  useEffect(() => {
    setOverlapChecked(false);
    setOverlappingEvents([]);
  }, [startTime, endTime]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!title.trim()) newErrors.title = 'Title is required';
    const start = new Date(startTime);
    const end = new Date(endTime);
    if (isNaN(start.getTime())) newErrors.startTime = 'Invalid start time';
    if (isNaN(end.getTime())) newErrors.endTime = 'Invalid end time';
    if (start >= end) newErrors.endTime = 'End time must be after start time';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const checkOverlap = async (): Promise<Event[]> => {
    try {
      setCheckingOverlap(true);
      const start = new Date(startTime);
      const end = new Date(endTime);
      const overlaps = await eventService.getOverlappingEvents(
        start.toISOString(),
        end.toISOString(),
        event?.id
      );
      setOverlappingEvents(overlaps);
      setOverlapChecked(true);
      return overlaps;
    } catch {
      return [];
    } finally {
      setCheckingOverlap(false);
    }
  };

  const handleSave = async () => {
    if (!validate()) return;

    // If we haven't checked for overlaps yet, check first
    if (!overlapChecked) {
      const overlaps = await checkOverlap();
      if (overlaps.length > 0) {
        // Show overlap warning — user must confirm
        return;
      }
    }

    try {
      setIsSaving(true);
      const eventData: Event = {
        title: title.trim(),
        description: description.trim() || undefined,
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        location: location.trim() || undefined,
        color,
        allDay,
        recurrence,
      };
      await onSave(eventData);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAnyway = async () => {
    try {
      setIsSaving(true);
      const eventData: Event = {
        title: title.trim(),
        description: description.trim() || undefined,
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        location: location.trim() || undefined,
        color,
        allDay,
        recurrence,
      };
      await onSave(eventData);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!event?.id) return;
    try {
      setIsDeleting(true);
      await onDelete(event.id);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        component: motion.div,
        initial: { opacity: 0, scale: 0.95, y: -20 },
        animate: { opacity: 1, scale: 1, y: 0 },
        exit: { opacity: 0, scale: 0.95, y: -20 },
        transition: { duration: 0.2, ease: 'easeOut' },
        sx: {
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: '0 24px 80px rgba(0,0,0,0.2)',
        },
      }}
    >
      {/* Color accent bar */}
      <Box sx={{ height: 4, background: color }} />

      <DialogTitle sx={{ pr: 6, pb: 1, pt: 2 }}>
        <Typography variant="h6" fontWeight={600} color="#202124">
          {isEditing ? 'Edit Event' : 'New Event'}
        </Typography>
        <IconButton
          onClick={onClose}
          size="small"
          sx={{ position: 'absolute', right: 12, top: 12, color: '#5f6368' }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 1 }}>
        {/* Title */}
        <TextField
          id="event-title"
          label="Title"
          fullWidth
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          error={Boolean(errors.title)}
          helperText={errors.title}
          sx={{ mb: 2 }}
          autoFocus
          placeholder="Add title"
          variant="outlined"
        />

        {/* All Day Toggle */}
        <FormControlLabel
          control={
            <Switch
              checked={allDay}
              onChange={(e) => setAllDay(e.target.checked)}
              color="primary"
            />
          }
          label="All day"
          sx={{ mb: 1, ml: 0 }}
        />

        {/* Times */}
        <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, flex: 1, minWidth: 200 }}>
            <ScheduleIcon sx={{ color: '#5f6368', mt: 2 }} />
            <TextField
              id="event-start-time"
              label="Start"
              type={allDay ? 'date' : 'datetime-local'}
              fullWidth
              value={allDay ? startTime.split('T')[0] : startTime}
              onChange={(e) => setStartTime(allDay ? e.target.value + 'T00:00' : e.target.value)}
              error={Boolean(errors.startTime)}
              helperText={errors.startTime}
              InputLabelProps={{ shrink: true }}
            />
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, flex: 1, minWidth: 200 }}>
            <Box sx={{ width: 24 }} />
            <TextField
              id="event-end-time"
              label="End"
              type={allDay ? 'date' : 'datetime-local'}
              fullWidth
              value={allDay ? endTime.split('T')[0] : endTime}
              onChange={(e) => setEndTime(allDay ? e.target.value + 'T23:59' : e.target.value)}
              error={Boolean(errors.endTime)}
              helperText={errors.endTime}
              InputLabelProps={{ shrink: true }}
            />
          </Box>
        </Box>

        {/* Location */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <LocationIcon sx={{ color: '#5f6368' }} />
          <TextField
            id="event-location"
            label="Location"
            fullWidth
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Add location"
            size="small"
          />
        </Box>

        {/* Description */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 2 }}>
          <NotesIcon sx={{ color: '#5f6368', mt: 1 }} />
          <TextField
            id="event-description"
            label="Description"
            fullWidth
            multiline
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add description"
            size="small"
          />
        </Box>

        {/* Recurrence */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <RepeatIcon sx={{ color: '#5f6368' }} />
          <FormControl fullWidth size="small">
            <InputLabel id="recurrence-label">Repeat</InputLabel>
            <Select
              labelId="recurrence-label"
              id="event-recurrence"
              value={recurrence}
              label="Repeat"
              onChange={(e) => setRecurrence(e.target.value as any)}
            >
              <MenuItem value="none">Does not repeat</MenuItem>
              <MenuItem value="daily">Every day</MenuItem>
              <MenuItem value="weekly">Every week</MenuItem>
              <MenuItem value="monthly">Every month</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {/* Color Picker */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <PaletteIcon sx={{ color: '#5f6368' }} />
          <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
            {EVENT_COLORS.map((c) => (
              <Tooltip key={c.value} title={c.label} arrow>
                <Box
                  onClick={() => setColor(c.value)}
                  sx={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    backgroundColor: c.value,
                    cursor: 'pointer',
                    border: color === c.value ? '2px solid #202124' : '2px solid transparent',
                    outline: color === c.value ? `2px solid ${c.value}` : 'none',
                    outlineOffset: 2,
                    transition: 'transform 0.15s',
                    '&:hover': { transform: 'scale(1.2)' },
                  }}
                />
              </Tooltip>
            ))}
          </Box>
        </Box>

        {/* Overlap Warning */}
        <AnimatePresence>
          {overlappingEvents.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <Alert
                severity="warning"
                icon={<WarningIcon />}
                sx={{ mb: 2, borderRadius: '8px' }}
                action={
                  <Button
                    size="small"
                    color="warning"
                    variant="contained"
                    onClick={handleSaveAnyway}
                    disabled={isSaving}
                    sx={{ whiteSpace: 'nowrap' }}
                  >
                    {isSaving ? <CircularProgress size={16} /> : 'Save anyway'}
                  </Button>
                }
              >
                <Typography variant="body2" fontWeight={600}>
                  Time conflict detected!
                </Typography>
                <Typography variant="caption">
                  Overlaps with:{' '}
                  {overlappingEvents.map((e) => (
                    <Chip key={e.id} label={e.title} size="small" sx={{ ml: 0.5, height: 18, fontSize: '0.7rem' }} />
                  ))}
                </Typography>
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3, pt: 0, gap: 1 }}>
        {isEditing && (
          <IconButton
            onClick={handleDelete}
            disabled={isDeleting}
            color="error"
            sx={{ mr: 'auto' }}
            title="Delete event"
          >
            {isDeleting ? <CircularProgress size={20} /> : <DeleteIcon />}
          </IconButton>
        )}
        <Button onClick={onClose} disabled={isSaving} sx={{ color: '#5f6368' }}>
          Cancel
        </Button>
        {checkingOverlap ? (
          <Button variant="contained" disabled>
            <CircularProgress size={20} color="inherit" />
          </Button>
        ) : (
          <Button
            id="event-save-btn"
            variant="contained"
            onClick={handleSave}
            disabled={isSaving}
            sx={{
              background: `linear-gradient(90deg, ${color}, ${color}dd)`,
              fontWeight: 600,
              borderRadius: '8px',
              px: 3,
              '&:hover': { filter: 'brightness(0.9)' },
            }}
          >
            {isSaving ? <CircularProgress size={20} color="inherit" /> : isEditing ? 'Update' : 'Save'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default EventModal;
