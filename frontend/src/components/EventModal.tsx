import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogActions,
  TextField, Button, Box, IconButton, Typography,
} from '@mui/material';
import {
  Close as CloseIcon,
  DragHandle as DragHandleIcon,
  Schedule as ScheduleIcon,
  PeopleOutline as PeopleIcon,
  VideocamOutlined as VideocamIcon,
  LocationOnOutlined as LocationIcon,
  Notes as NotesIcon,
  CalendarToday as CalendarIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { format, addHours } from 'date-fns';
import { Event } from '../types/Event';
import { useNavigate } from 'react-router-dom';

interface EventModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (event: Event) => Promise<void>;
  onDelete: (eventId: number) => Promise<void>;
  event: Event | null;
  defaultStartTime?: Date | null;
}

const formatDateTimeLocal = (date: Date): string => {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const EventModal: React.FC<EventModalProps> = ({
  open, onClose, onSave, onDelete, event, defaultStartTime,
}) => {
  const navigate = useNavigate();
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
  const [isSaving, setIsSaving] = useState(false);
  
  const [activeTab, setActiveTab] = useState<'event' | 'task'>('event');

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
  }, [event, open, defaultStartTime]);

  const handleSave = async () => {
    if (!title.trim()) return;
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

  const handleMoreOptions = () => {
    navigate('/eventedit');
    onClose();
  };

  const formatDisplayTime = () => {
    try {
      const start = new Date(startTime);
      return `${format(start, 'EEEE, d MMMM')} – ${format(start, 'EEEE, d MMMM')}`;
    } catch {
      return 'Invalid Date';
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
          borderRadius: '8px',
          boxShadow: '0 24px 38px 3px rgba(0,0,0,0.14), 0 9px 46px 8px rgba(0,0,0,0.12), 0 11px 15px -7px rgba(0,0,0,0.2)',
          m: 2,
        },
      }}
    >
      {/* Minimal Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', backgroundColor: '#f1f3f4', px: 1, py: 0.5 }}>
        <IconButton size="small" sx={{ color: '#5f6368', cursor: 'grab' }}>
          <DragHandleIcon fontSize="small" />
        </IconButton>
        <IconButton size="small" onClick={onClose} sx={{ color: '#5f6368' }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      <DialogContent sx={{ px: 3, pt: 2, pb: 1, overflowY: 'visible' }}>
        {/* Title Input */}
        <Box sx={{ pl: 5, mb: 1.5 }}>
          <TextField
            fullWidth
            variant="standard"
            placeholder="Add title and time"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
            InputProps={{
              disableUnderline: false,
              sx: {
                fontSize: '1.375rem',
                color: '#3c4043',
                '&::before': { borderBottom: '2px solid #1a73e8 !important' },
                '&::after': { borderBottom: '2px solid #1a73e8 !important' },
              }
            }}
          />
        </Box>

        {/* Tabs: Event / Task */}
        <Box sx={{ pl: 5, mb: 3, display: 'flex', gap: 1 }}>
          <Button
            size="small"
            onClick={() => setActiveTab('event')}
            sx={{
              textTransform: 'none',
              backgroundColor: activeTab === 'event' ? '#e8f0fe' : 'transparent',
              color: activeTab === 'event' ? '#1a73e8' : '#3c4043',
              borderRadius: '4px',
              fontWeight: 500,
              px: 2,
              '&:hover': { backgroundColor: activeTab === 'event' ? '#e8f0fe' : '#f1f3f4' }
            }}
          >
            Event
          </Button>
          <Button
            size="small"
            onClick={() => setActiveTab('task')}
            sx={{
              textTransform: 'none',
              backgroundColor: activeTab === 'task' ? '#e8f0fe' : 'transparent',
              color: activeTab === 'task' ? '#1a73e8' : '#3c4043',
              borderRadius: '4px',
              fontWeight: 500,
              px: 2,
              '&:hover': { backgroundColor: activeTab === 'task' ? '#e8f0fe' : '#f1f3f4' }
            }}
          >
            Task
          </Button>
        </Box>

        {/* Details Rows */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          
          {/* Time row */}
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
            <ScheduleIcon sx={{ color: '#5f6368', mt: 0.5 }} />
            <Box sx={{ flexGrow: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography sx={{ color: '#3c4043', fontSize: '0.875rem' }}>
                  {formatDisplayTime()}
                </Typography>
                <Button 
                  variant="outlined" 
                  size="small"
                  sx={{ 
                    borderRadius: '20px', 
                    textTransform: 'none', 
                    color: '#1a73e8', 
                    borderColor: '#dadce0',
                    px: 2,
                    py: 0,
                    height: 24,
                  }}
                >
                  Add time
                </Button>
              </Box>
              <Typography sx={{ color: '#5f6368', fontSize: '0.75rem', mt: 0.5 }}>
                Doesn't repeat
              </Typography>
            </Box>
          </Box>

          {/* Add guests */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <PeopleIcon sx={{ color: '#5f6368' }} />
            <Typography sx={{ color: '#3c4043', fontSize: '0.875rem', cursor: 'pointer', '&:hover': { backgroundColor: '#f1f3f4' }, px: 1, py: 0.5, borderRadius: '4px', ml: -1 }}>
              Add guests
            </Typography>
          </Box>

          {/* Add Google Meet */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <VideocamIcon sx={{ color: '#fbbc04' }} />
            <Typography sx={{ color: '#3c4043', fontSize: '0.875rem', cursor: 'pointer', '&:hover': { backgroundColor: '#f1f3f4' }, px: 1, py: 0.5, borderRadius: '4px', ml: -1 }}>
              Add Google Meet video conferencing
            </Typography>
          </Box>

          {/* Add Location */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <LocationIcon sx={{ color: '#5f6368' }} />
            <Typography sx={{ color: '#3c4043', fontSize: '0.875rem', cursor: 'pointer', '&:hover': { backgroundColor: '#f1f3f4' }, px: 1, py: 0.5, borderRadius: '4px', ml: -1 }}>
              Add location
            </Typography>
          </Box>

          {/* Add description */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <NotesIcon sx={{ color: '#5f6368' }} />
            <Typography sx={{ color: '#3c4043', fontSize: '0.875rem', cursor: 'pointer', '&:hover': { backgroundColor: '#f1f3f4' }, px: 1, py: 0.5, borderRadius: '4px', ml: -1 }}>
              Add description or a Google Drive attachment
            </Typography>
          </Box>

          {/* Calendar Select */}
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
            <CalendarIcon sx={{ color: '#5f6368', mt: 0.5 }} />
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography sx={{ color: '#3c4043', fontSize: '0.875rem', fontWeight: 500 }}>
                  Aryan Diggal
                </Typography>
                <Box sx={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: color }} />
              </Box>
              <Typography sx={{ color: '#5f6368', fontSize: '0.75rem', mt: 0.5 }}>
                Free · Default visibility · Notify the day before at 5pm
              </Typography>
            </Box>
          </Box>

        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2, pt: 1, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
        <Button 
          onClick={handleMoreOptions} 
          sx={{ 
            textTransform: 'none', 
            fontWeight: 500, 
            color: '#1a73e8',
            '&:hover': { backgroundColor: '#f1f3f4' },
            mr: 'auto',
          }}
        >
          More options
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={isSaving}
          sx={{
            backgroundColor: '#1a73e8',
            color: '#fff',
            textTransform: 'none',
            borderRadius: '20px',
            px: 3,
            fontWeight: 500,
            boxShadow: 'none',
            '&:hover': { backgroundColor: '#1557b0', boxShadow: '0 1px 2px 0 rgba(60,64,67,0.3)' },
          }}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EventModal;
