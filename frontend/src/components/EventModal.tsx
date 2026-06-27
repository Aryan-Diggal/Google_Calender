import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog, DialogContent, DialogActions,
  TextField, Button, Box, IconButton, Typography, Checkbox, FormControlLabel, Select, MenuItem, Alert, CircularProgress,
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
  Warning as WarningIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { motion, AnimatePresence } from 'framer-motion';
import { format, addHours, isSameDay, addMinutes, differenceInMinutes, parse, startOfDay, addDays } from 'date-fns';
import { Event } from '../types/Event';
import { eventService } from '../services/api';
import { useNavigate } from 'react-router-dom';

interface EventModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (event: Event) => Promise<void>;
  onDelete: (eventId: number) => Promise<void>;
  event: Event | null;
  defaultStartTime?: Date | null;
}

const generateStartTimeOptions = () => {
  const options = [];
  for (let i = 0; i < 24 * 4; i++) {
    const hours = Math.floor(i / 4);
    const minutes = (i % 4) * 15;
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    options.push(date);
  }
  return options;
};

const formatTime = (date: Date) => {
  return format(date, 'h:mma').toLowerCase();
};

const getDurationString = (startObj: Date, endObj: Date) => {
  let diffMinutes = differenceInMinutes(endObj, startObj);
  if (diffMinutes <= 0) return '';
  const diffHours = diffMinutes / 60;
  return `(${diffHours} hr${diffHours !== 1 ? 's' : ''})`;
};

const getCombinedDate = (date: Date, time: Date, isAllDay: boolean = false) => {
  if (isAllDay) return startOfDay(date);
  const result = new Date(date);
  result.setHours(time.getHours(), time.getMinutes(), 0, 0);
  return result;
};

const EventModal: React.FC<EventModalProps> = ({
  open, onClose, onSave, onDelete, event, defaultStartTime,
}) => {
  const navigate = useNavigate();

  const getDefaultStart = () => {
    const now = new Date();
    const remainder = now.getMinutes() % 30;
    const nextSlot = addMinutes(now, 30 - remainder);

    if (defaultStartTime) {
      if (defaultStartTime.getHours() === 0 && defaultStartTime.getMinutes() === 0) {
        const res = new Date(defaultStartTime);
        res.setHours(nextSlot.getHours(), nextSlot.getMinutes(), 0, 0);
        return res;
      }
      return defaultStartTime;
    }
    return nextSlot;
  };

  const getDefaultEnd = () => {
    if (defaultStartTime && (defaultStartTime.getHours() !== 0 || defaultStartTime.getMinutes() !== 0)) {
       return addHours(defaultStartTime, 1);
    }
    return addHours(getDefaultStart(), 1);
  };

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState<Date>(getDefaultStart());
  const [endDate, setEndDate] = useState<Date>(getDefaultEnd());
  const [startTime, setStartTime] = useState<Date>(getDefaultStart());
  const [endTime, setEndTime] = useState<Date>(getDefaultEnd());
  const [location, setLocation] = useState('');
  const [color, setColor] = useState('#1a73e8');
  const [allDay, setAllDay] = useState(false);
  const [recurrence, setRecurrence] = useState<'none' | 'daily' | 'weekly' | 'monthly'>('none');
  
  const [isSaving, setIsSaving] = useState(false);
  const [checkingOverlap, setCheckingOverlap] = useState(false);
  const [overlappingEvents, setOverlappingEvents] = useState<Event[]>([]);
  const [overlapChecked, setOverlapChecked] = useState(false);

  const [activeTab, setActiveTab] = useState<'event' | 'task'>('event');

  const startTimeOptions = useMemo(() => generateStartTimeOptions(), []);

  const endTimeOptions = useMemo(() => {
    const options = [];
    const startObj = getCombinedDate(startDate, startTime);

    if (isSameDay(startDate, endDate)) {
      for (let i = 1; i <= 24 * 4; i++) {
        options.push(addMinutes(startObj, i * 15));
      }
    } else {
      const endStartOfDay = startOfDay(endDate);
      for (let i = 0; i < 24 * 4; i++) {
        options.push(addMinutes(endStartOfDay, i * 15));
      }
    }
    return options;
  }, [startDate, startTime, endDate]);

  useEffect(() => {
    if (event) {
      setTitle(event.title);
      setDescription(event.description || '');
      const s = new Date(event.startTime);
      const e = new Date(event.endTime);
      setStartDate(s);
      setEndDate(e);
      setStartTime(s);
      setEndTime(e);
      setLocation(event.location || '');
      setColor(event.color || '#1a73e8');
      setAllDay(event.allDay || false);
      setRecurrence((event.recurrence as any) || 'none');
    } else {
      setTitle('');
      setDescription('');
      const defaultS = getDefaultStart();
      const defaultE = getDefaultEnd();
      setStartDate(defaultS);
      setEndDate(defaultE);
      setStartTime(defaultS);
      setEndTime(defaultE);
      setLocation('');
      setColor('#1a73e8');
      setAllDay(false);
      setRecurrence('none');
    }
    setOverlappingEvents([]);
    setOverlapChecked(false);
  }, [event, open, defaultStartTime]);

  useEffect(() => {
    setOverlapChecked(false);
    setOverlappingEvents([]);
  }, [startDate, endDate, startTime, endTime, allDay]);

  const handleStartTimeChange = (newTimeString: string) => {
    const newTime = parse(newTimeString, 'h:mma', new Date());
    setStartTime(newTime);
    
    const startObj = getCombinedDate(startDate, newTime);
    const newEndObj = addHours(startObj, 1);
    
    setEndDate(newEndObj);
    setEndTime(newEndObj);
  };

  const handleEndTimeChange = (newIsoString: string) => {
    const newEndObj = new Date(newIsoString);
    setEndDate(newEndObj);
    setEndTime(newEndObj);
  };

  const checkOverlap = async (startISO: string, endISO: string): Promise<Event[]> => {
    try {
      setCheckingOverlap(true);
      const overlaps = await eventService.getOverlappingEvents(startISO, endISO, event?.id);
      setOverlappingEvents(overlaps);
      setOverlapChecked(true);
      return overlaps;
    } catch {
      return [];
    } finally {
      setCheckingOverlap(false);
    }
  };

  const handleSave = async (forceSave = false) => {
    if (!title.trim()) return;

    const start = getCombinedDate(startDate, startTime, allDay);
    let end = getCombinedDate(endDate, endTime, allDay);
    
    if (allDay) {
      end = addHours(startOfDay(endDate), 23); 
    }

    if (!forceSave && !overlapChecked) {
      const overlaps = await checkOverlap(start.toISOString(), end.toISOString());
      if (overlaps.length > 0) return; 
    }

    try {
      setIsSaving(true);
      const eventData: Event = {
        title: title.trim(),
        description: description.trim() || undefined,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
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

  const currentEndObj = getCombinedDate(endDate, endTime);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
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
          width: 'auto',
          minWidth: '448px'
        },
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', backgroundColor: '#f1f3f4', px: 1, py: 0.5 }}>
        <IconButton size="small" sx={{ color: '#5f6368', cursor: 'grab' }}><DragHandleIcon fontSize="small" /></IconButton>
        <IconButton size="small" onClick={onClose} sx={{ color: '#5f6368' }}><CloseIcon fontSize="small" /></IconButton>
      </Box>

      <DialogContent sx={{ px: 3, pt: 2, pb: 1, overflowY: 'visible', overflowX: 'hidden' }}>
        <Box sx={{ pl: 5, mb: 1.5 }}>
          <TextField
            fullWidth variant="standard" placeholder="Add title" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus
            InputProps={{ disableUnderline: false, sx: { fontSize: '1.375rem', color: '#3c4043', '&::before': { borderBottom: '2px solid transparent !important' }, '&:hover::before': { borderBottom: '2px solid #dadce0 !important' }, '&::after': { borderBottom: '2px solid #1a73e8 !important' } } }}
          />
        </Box>

        <Box sx={{ pl: 5, mb: 2, display: 'flex', gap: 1 }}>
          <Button size="small" onClick={() => setActiveTab('event')} sx={{ textTransform: 'none', backgroundColor: activeTab === 'event' ? '#e8f0fe' : 'transparent', color: activeTab === 'event' ? '#1a73e8' : '#3c4043', borderRadius: '4px', fontWeight: 500, px: 2, '&:hover': { backgroundColor: activeTab === 'event' ? '#e8f0fe' : '#f1f3f4' } }}>Event</Button>
          <Button size="small" onClick={() => setActiveTab('task')} sx={{ textTransform: 'none', backgroundColor: activeTab === 'task' ? '#e8f0fe' : 'transparent', color: activeTab === 'task' ? '#1a73e8' : '#3c4043', borderRadius: '4px', fontWeight: 500, px: 2, '&:hover': { backgroundColor: activeTab === 'task' ? '#e8f0fe' : '#f1f3f4' } }}>Task</Button>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
            <ScheduleIcon sx={{ color: '#5f6368', mt: 1 }} />
            <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'nowrap', width: 'max-content' }}>
                <DatePicker 
                  value={startDate} 
                  onChange={(val) => { if(val) setStartDate(val); }} 
                  format="EEEE, d MMMM" 
                  slotProps={{ textField: { variant: 'standard', InputProps: { disableUnderline: true, sx: { fontSize: '0.875rem', backgroundColor: '#f1f3f4', px: 1, py: 0.5, borderRadius: '4px', cursor: 'pointer', '&:hover': { backgroundColor: '#e8eaed' } } } } }} 
                />
                
                {!allDay && (
                  <>
                    <Select 
                      value={formatTime(startTime)} 
                      onChange={(e) => handleStartTimeChange(e.target.value)} 
                      variant="standard" disableUnderline 
                      sx={{ fontSize: '0.875rem', backgroundColor: '#f1f3f4', px: 1, py: 0.5, borderRadius: '4px', height: 32, '& .MuiSelect-select': { py: 0 } }}
                    >
                      {startTimeOptions.map((t) => <MenuItem key={t.getTime()} value={formatTime(t)} sx={{ fontSize: '0.875rem' }}>{formatTime(t)}</MenuItem>)}
                    </Select>
                    
                    <Typography sx={{ color: '#5f6368', mx: 0.2 }}>–</Typography>
                    
                    <Select 
                      value={currentEndObj.toISOString()} 
                      onChange={(e) => handleEndTimeChange(e.target.value)} 
                      renderValue={(val) => formatTime(new Date(val))}
                      variant="standard" disableUnderline 
                      sx={{ fontSize: '0.875rem', backgroundColor: '#f1f3f4', px: 1, py: 0.5, borderRadius: '4px', height: 32, '& .MuiSelect-select': { py: 0 } }}
                    >
                      {endTimeOptions.map((t) => <MenuItem key={t.toISOString()} value={t.toISOString()} sx={{ fontSize: '0.875rem' }}>{formatTime(t)} {getDurationString(getCombinedDate(startDate, startTime), t)}</MenuItem>)}
                    </Select>

                    {!isSameDay(startDate, endDate) && (
                      <DatePicker 
                        value={endDate} 
                        onChange={(val) => { if(val) setEndDate(val); }} 
                        format="EEEE, d MMMM" 
                        slotProps={{ textField: { variant: 'standard', InputProps: { disableUnderline: true, sx: { fontSize: '0.875rem', backgroundColor: '#f1f3f4', px: 1, py: 0.5, borderRadius: '4px', cursor: 'pointer', '&:hover': { backgroundColor: '#e8eaed' } } } } }} 
                      />
                    )}
                  </>
                )}
                {allDay && (
                  <>
                    <Typography sx={{ color: '#5f6368', mx: 0.5 }}>–</Typography>
                    <DatePicker value={endDate} onChange={(val) => { if(val) setEndDate(val); }} format="EEEE, d MMMM" slotProps={{ textField: { variant: 'standard', InputProps: { disableUnderline: true, sx: { fontSize: '0.875rem', backgroundColor: '#f1f3f4', px: 1, py: 0.5, borderRadius: '4px', cursor: 'pointer', '&:hover': { backgroundColor: '#e8eaed' } } } } }} />
                  </>
                )}
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <FormControlLabel control={<Checkbox size="small" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} sx={{ py: 0 }} />} label={<Typography sx={{ fontSize: '0.875rem', color: '#3c4043' }}>All day</Typography>} />
              </Box>
              
              <Box>
                <Select value={recurrence} onChange={(e) => setRecurrence(e.target.value as any)} variant="standard" disableUnderline sx={{ fontSize: '0.875rem', backgroundColor: '#f1f3f4', px: 1, py: 0.5, borderRadius: '4px', height: 32, '& .MuiSelect-select': { py: 0 } }}>
                  <MenuItem value="none" sx={{ fontSize: '0.875rem' }}>Does not repeat</MenuItem>
                  <MenuItem value="daily" sx={{ fontSize: '0.875rem' }}>Daily</MenuItem>
                  <MenuItem value="weekly" sx={{ fontSize: '0.875rem' }}>Weekly on {format(startDate, 'EEEE')}</MenuItem>
                  <MenuItem value="monthly" sx={{ fontSize: '0.875rem' }}>Monthly on the {Math.ceil(startDate.getDate()/7)} {format(startDate, 'EEEE')}</MenuItem>
                </Select>
              </Box>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}><PeopleIcon sx={{ color: '#5f6368' }} /><Typography sx={{ color: '#3c4043', fontSize: '0.875rem', cursor: 'pointer', '&:hover': { backgroundColor: '#f1f3f4' }, px: 1, py: 0.5, borderRadius: '4px', ml: -1 }}>Add guests</Typography></Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}><VideocamIcon sx={{ color: '#fbbc04' }} /><Typography sx={{ color: '#3c4043', fontSize: '0.875rem', cursor: 'pointer', '&:hover': { backgroundColor: '#f1f3f4' }, px: 1, py: 0.5, borderRadius: '4px', ml: -1 }}>Add Google Meet video conferencing</Typography></Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}><LocationIcon sx={{ color: '#5f6368' }} /><Typography sx={{ color: '#3c4043', fontSize: '0.875rem', cursor: 'pointer', '&:hover': { backgroundColor: '#f1f3f4' }, px: 1, py: 0.5, borderRadius: '4px', ml: -1 }}>Add location</Typography></Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}><NotesIcon sx={{ color: '#5f6368' }} /><Typography sx={{ color: '#3c4043', fontSize: '0.875rem', cursor: 'pointer', '&:hover': { backgroundColor: '#f1f3f4' }, px: 1, py: 0.5, borderRadius: '4px', ml: -1 }}>Add description or a Google Drive attachment</Typography></Box>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
            <CalendarIcon sx={{ color: '#5f6368', mt: 0.5 }} />
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Typography sx={{ color: '#3c4043', fontSize: '0.875rem', fontWeight: 500 }}>Aryan Diggal</Typography><Box sx={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: color }} /></Box>
              <Typography sx={{ color: '#5f6368', fontSize: '0.75rem', mt: 0.5 }}>Free · Default visibility · Notify the day before at 5pm</Typography>
            </Box>
          </Box>
          
          <AnimatePresence>
            {overlappingEvents.length > 0 && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                <Alert severity="warning" icon={<WarningIcon />} sx={{ mt: 1, mb: 1, borderRadius: '8px' }} action={<Button size="small" color="warning" variant="contained" onClick={() => handleSave(true)} disabled={isSaving}>{isSaving ? <CircularProgress size={16} /> : 'Save anyway'}</Button>}>
                  <Typography variant="body2" fontWeight={600}>Time conflict detected!</Typography>
                </Alert>
              </motion.div>
            )}
          </AnimatePresence>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2, pt: 1, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
        <Button onClick={handleMoreOptions} sx={{ textTransform: 'none', fontWeight: 500, color: '#1a73e8', '&:hover': { backgroundColor: '#f1f3f4' }, mr: 'auto' }}>More options</Button>
        <Button variant="contained" onClick={() => handleSave(false)} disabled={isSaving || checkingOverlap} sx={{ backgroundColor: '#1a73e8', color: '#fff', textTransform: 'none', borderRadius: '20px', px: 3, fontWeight: 500, boxShadow: 'none', '&:hover': { backgroundColor: '#1557b0' } }}>
          {isSaving || checkingOverlap ? <CircularProgress size={20} color="inherit" /> : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EventModal;
