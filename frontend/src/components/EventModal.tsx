import React, { useState, useEffect, useMemo } from 'react';
import {
  Popover, DialogContent, DialogActions,
  TextField, Button, Box, IconButton, Typography, Checkbox, FormControlLabel, Select, MenuItem, Alert, CircularProgress, Menu,
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
  BusinessCenterOutlined as SuitcaseIcon,
  LockOutlined as LockIcon,
  NotificationsOutlined as NotificationIcon,
  ArrowDropDown as ArrowDropDownIcon,
  Check as CheckIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { motion, AnimatePresence } from 'framer-motion';
import { format, addHours, isSameDay, addMinutes, differenceInMinutes, parse, startOfDay } from 'date-fns';
import { Event } from '../types/Event';
import { eventService } from '../services/api';
import { useNavigate } from 'react-router-dom';

interface EventModalProps {
  open: boolean;
  anchorEl?: HTMLElement | null;
  onClose: () => void;
  onSave: (event: Event) => Promise<void>;
  onDelete: (eventId: number) => Promise<void>;
  event: Event | null;
  defaultStartTime?: Date | null;
  onChange?: (draft: Partial<Event>) => void;
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
  open, anchorEl, onClose, onSave, onDelete, event, defaultStartTime, onChange
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
  const isMonthViewClick = defaultStartTime ? (defaultStartTime.getHours() === 0 && defaultStartTime.getMinutes() === 0) : false;
  const [allDay, setAllDay] = useState(isMonthViewClick);
  const [showTimeInputs, setShowTimeInputs] = useState(!isMonthViewClick);
  const [recurrence, setRecurrence] = useState<'none' | 'daily' | 'weekly' | 'monthly'>('none');
  const [isSaving, setIsSaving] = useState(false);
  const [checkingOverlap, setCheckingOverlap] = useState(false);
  const [overlappingEvents, setOverlappingEvents] = useState<Event[]>([]);
  const [overlapChecked, setOverlapChecked] = useState(false);

  const [activeTab, setActiveTab] = useState<'event' | 'task'>('event');

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [colorAnchorEl, setColorAnchorEl] = useState<null | HTMLElement>(null);
  const [calendarAnchorEl, setCalendarAnchorEl] = useState<null | HTMLElement>(null);

  const GOOGLE_COLORS = ['#d50000', '#e67c73', '#f4511e', '#f6bf26', '#33b679', '#0b8043', '#039be5', '#3f51b5', '#7986cb', '#8e24aa', '#616161'];

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
    setShowAdvanced(false);
  }, [event, open, defaultStartTime]);

  useEffect(() => {
    setOverlapChecked(false);
    setOverlappingEvents([]);
  }, [startDate, endDate, startTime, endTime, allDay]);

  useEffect(() => {
    if (open && onChange && !event) {
      const start = getCombinedDate(startDate, startTime, allDay);
      let end = getCombinedDate(endDate, endTime, allDay);
      if (allDay) {
        end = addHours(startOfDay(endDate), 23); 
      }
      onChange({
        id: -1,
        title: title || '(No title)',
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        color,
        allDay,
      });
    }
  }, [title, startDate, startTime, endDate, endTime, allDay, color, open]);

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
      const finalAllDay = showTimeInputs ? allDay : true;
      const eventData: Event = {
        title: title.trim() || '(No title)',
        description: description.trim() || undefined,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        location: location.trim() || undefined,
        color,
        allDay: finalAllDay,
        recurrence,
      };
      await onSave(eventData);
    } finally {
      setIsSaving(false);
    }
  };

  const handleMoreOptions = () => {
    if (event?.id) {
      navigate(`/eventedit/${event.id}`);
    } else {
      navigate('/eventedit');
    }
    onClose();
  };

  const currentEndObj = getCombinedDate(endDate, endTime);

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{
        vertical: 'center',
        horizontal: 'right',
      }}
      transformOrigin={{
        vertical: 'center',
        horizontal: 'left',
      }}
      disableScrollLock={true}
      PaperProps={{
        sx: { 
          backgroundColor: '#f8f9fa',
          borderRadius: '24px', 
          boxShadow: '0 24px 38px 3px rgba(0,0,0,0.14), 0 9px 46px 8px rgba(0,0,0,0.12), 0 11px 15px -7px rgba(0,0,0,0.2)', 
          m: 1, 
          width: 'auto',
          minWidth: '448px'
        },
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', backgroundColor: '#f1f3f4', px: 1, py: 0.5 }}>
        <IconButton size="small" sx={{ color: '#5f6368', cursor: 'grab' }}><DragHandleIcon fontSize="small" /></IconButton>
        <IconButton size="small" onClick={onClose} sx={{ color: '#5f6368' }}><CloseIcon fontSize="small" /></IconButton>
      </Box>

      <DialogContent sx={{ px: 3, pt: 2, pb: 1, overflowY: 'auto', overflowX: 'hidden', maxHeight: '500px' }}>
        <Box sx={{ pl: 5, mb: 1.5 }}>
          <TextField
            fullWidth variant="standard" placeholder="Add title" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus
            InputProps={{ disableUnderline: false, sx: { fontSize: '1.375rem', color: '#3c4043', '&::before': { borderBottom: '2px solid transparent !important' }, '&:hover::before': { borderBottom: '2px solid #dadce0 !important' }, '&::after': { borderBottom: '2px solid #1a73e8 !important' } } }}
          />
        </Box>

        <Box sx={{ display: 'flex', gap: 2, pl: 5, mb: 2 }}>
          <Button variant={activeTab === 'event' ? 'contained' : 'text'} onClick={() => setActiveTab('event')} sx={{ minWidth: 'auto', px: 2, py: 0.5, textTransform: 'none', borderRadius: '4px', backgroundColor: activeTab === 'event' ? '#c2e7ff' : 'transparent', color: activeTab === 'event' ? '#001d35' : '#3c4043', boxShadow: 'none', '&:hover': { backgroundColor: activeTab === 'event' ? '#b3d9f2' : '#f1f3f4', boxShadow: 'none' } }}>
            Event
          </Button>
          <Button variant={activeTab === 'task' ? 'contained' : 'text'} onClick={() => setActiveTab('task')} sx={{ minWidth: 'auto', px: 2, py: 0.5, textTransform: 'none', borderRadius: '4px', backgroundColor: activeTab === 'task' ? '#c2e7ff' : 'transparent', color: activeTab === 'task' ? '#001d35' : '#3c4043', boxShadow: 'none', '&:hover': { backgroundColor: activeTab === 'task' ? '#b3d9f2' : '#f1f3f4', boxShadow: 'none' } }}>
            Task
          </Button>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
            <ScheduleIcon sx={{ color: '#5f6368', mt: 1 }} />
            <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
              
              {!showTimeInputs ? (
                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', width: '100%' }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    <Typography sx={{ fontSize: '0.875rem', color: '#3c4043', pt: 0.5 }}>
                      {format(startDate, 'EEEE, d MMMM')} – {format(endDate, 'EEEE, d MMMM')}
                    </Typography>
                    <Select value={recurrence} onChange={(e) => setRecurrence(e.target.value as any)} variant="standard" disableUnderline sx={{ fontSize: '0.875rem', color: '#5f6368', height: 24, '& .MuiSelect-select': { py: 0, pl: 0 } }}>
                      <MenuItem value="none" sx={{ fontSize: '0.875rem' }}>Doesn't repeat</MenuItem>
                      <MenuItem value="daily" sx={{ fontSize: '0.875rem' }}>Daily</MenuItem>
                      <MenuItem value="weekly" sx={{ fontSize: '0.875rem' }}>Weekly on {format(startDate, 'EEEE')}</MenuItem>
                    </Select>
                  </Box>
                  <Button 
                    variant="outlined" 
                    onClick={() => { setShowTimeInputs(true); setAllDay(false); }}
                    sx={{ borderRadius: '24px', textTransform: 'none', color: '#1a73e8', borderColor: '#dadce0', px: 2, py: 0.25 }}
                  >
                    Add time
                  </Button>
                </Box>
              ) : (
                <>
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
                </>
              )}
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}><PeopleIcon sx={{ color: '#5f6368' }} /><Typography sx={{ color: '#3c4043', fontSize: '0.875rem', cursor: 'pointer', '&:hover': { backgroundColor: '#f1f3f4' }, px: 1, py: 0.5, borderRadius: '4px', ml: -1 }}>Add guests</Typography></Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}><VideocamIcon sx={{ color: '#fbbc04' }} /><Typography sx={{ color: '#3c4043', fontSize: '0.875rem', cursor: 'pointer', '&:hover': { backgroundColor: '#f1f3f4' }, px: 1, py: 0.5, borderRadius: '4px', ml: -1 }}>Add Google Meet video conferencing</Typography></Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}><LocationIcon sx={{ color: '#5f6368' }} /><Typography sx={{ color: '#3c4043', fontSize: '0.875rem', cursor: 'pointer', '&:hover': { backgroundColor: '#f1f3f4' }, px: 1, py: 0.5, borderRadius: '4px', ml: -1 }}>Add location</Typography></Box>
          {description ? (
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
              <NotesIcon sx={{ color: '#5f6368' }} />
              <Typography 
                component="div" 
                sx={{ color: '#3c4043', fontSize: '0.875rem', px: 1, py: 0, ml: -1, '& p': { margin: 0 } }} 
                dangerouslySetInnerHTML={{ __html: description }} 
              />
            </Box>
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <NotesIcon sx={{ color: '#5f6368' }} />
              <Typography sx={{ color: '#3c4043', fontSize: '0.875rem', cursor: 'pointer', '&:hover': { backgroundColor: '#f1f3f4' }, px: 1, py: 0.5, borderRadius: '4px', ml: -1 }}>
                Add description or a Google Drive attachment
              </Typography>
            </Box>
          )}
          
          {!showAdvanced ? (
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, cursor: 'pointer', '&:hover': { backgroundColor: '#f1f3f4' }, px: 1, py: 0.5, borderRadius: '4px', ml: -1 }} onClick={() => setShowAdvanced(true)}>
              <CalendarIcon sx={{ color: '#5f6368', mt: 0.5 }} />
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Typography sx={{ color: '#3c4043', fontSize: '0.875rem', fontWeight: 500 }}>Aryan Diggal</Typography><Box sx={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: color }} /></Box>
                <Typography sx={{ color: '#5f6368', fontSize: '0.75rem', mt: 0.5 }}>Free · Default visibility · Notify the day before at 5pm</Typography>
              </Box>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, ml: -1, mt: 1, pl: 1 }}>
              {/* Calendar and Color */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <CalendarIcon sx={{ color: '#5f6368' }} />
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Box onClick={(e) => setCalendarAnchorEl(e.currentTarget)} sx={{ display: 'flex', alignItems: 'center', gap: 1, backgroundColor: '#f1f3f4', px: 1.5, py: 0.75, borderRadius: '4px', cursor: 'pointer', '&:hover': { backgroundColor: '#e8eaed' } }}>
                    <Typography sx={{ fontSize: '0.875rem', color: '#3c4043' }}>Aryan Diggal</Typography>
                    <ArrowDropDownIcon sx={{ color: '#5f6368' }} />
                  </Box>
                  <Box onClick={(e) => setColorAnchorEl(e.currentTarget)} sx={{ display: 'flex', alignItems: 'center', gap: 1, backgroundColor: '#f1f3f4', px: 1.5, py: 0.75, borderRadius: '4px', cursor: 'pointer', '&:hover': { backgroundColor: '#e8eaed' } }}>
                    <Box sx={{ width: 14, height: 14, borderRadius: '50%', backgroundColor: color }} />
                    <ArrowDropDownIcon sx={{ color: '#5f6368' }} />
                  </Box>
                </Box>
              </Box>

              {/* Busy/Free */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <SuitcaseIcon sx={{ color: '#5f6368' }} />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, backgroundColor: '#f1f3f4', px: 1.5, py: 0.75, borderRadius: '4px', cursor: 'pointer', '&:hover': { backgroundColor: '#e8eaed' }, width: 'max-content' }}>
                  <Typography sx={{ fontSize: '0.875rem', color: '#3c4043' }}>Free</Typography>
                  <ArrowDropDownIcon sx={{ color: '#5f6368' }} />
                </Box>
              </Box>

              {/* Visibility */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <LockIcon sx={{ color: '#5f6368' }} />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, backgroundColor: '#f1f3f4', px: 1.5, py: 0.75, borderRadius: '4px', cursor: 'pointer', '&:hover': { backgroundColor: '#e8eaed' }, width: 'max-content' }}>
                  <Typography sx={{ fontSize: '0.875rem', color: '#3c4043' }}>Default visibility</Typography>
                  <ArrowDropDownIcon sx={{ color: '#5f6368' }} />
                </Box>
              </Box>

              {/* Notifications */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <NotificationIcon sx={{ color: '#5f6368' }} />
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, backgroundColor: '#f1f3f4', px: 1.5, py: 0.75, borderRadius: '4px', cursor: 'pointer', '&:hover': { backgroundColor: '#e8eaed' }, width: 'max-content' }}>
                    <Typography sx={{ fontSize: '0.875rem', color: '#3c4043' }}>The day before at 5pm</Typography>
                    <ArrowDropDownIcon sx={{ color: '#5f6368' }} />
                  </Box>
                  <Typography sx={{ fontSize: '0.875rem', color: '#1a73e8', fontWeight: 500, cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}>
                    Add notification
                  </Typography>
                </Box>
              </Box>
            </Box>
          )}

          {/* Menus for dropdowns */}
          <Menu anchorEl={colorAnchorEl} open={Boolean(colorAnchorEl)} onClose={() => setColorAnchorEl(null)} PaperProps={{ sx: { p: 1, borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' } }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1 }}>
              {GOOGLE_COLORS.map(c => (
                <Box key={c} onClick={() => { setColor(c); setColorAnchorEl(null); }} sx={{ width: 24, height: 24, borderRadius: '50%', backgroundColor: c, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', '&:hover': { transform: 'scale(1.1)' }, transition: 'transform 0.1s' }}>
                  {color === c && <CheckIcon sx={{ color: '#fff', fontSize: 16 }} />}
                </Box>
              ))}
            </Box>
          </Menu>

          <Menu anchorEl={calendarAnchorEl} open={Boolean(calendarAnchorEl)} onClose={() => setCalendarAnchorEl(null)} PaperProps={{ sx: { width: 220, borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' } }}>
            <MenuItem onClick={() => setCalendarAnchorEl(null)} sx={{ fontSize: '0.875rem', py: 1 }}>Aryan Diggal</MenuItem>
            <MenuItem onClick={() => setCalendarAnchorEl(null)} sx={{ fontSize: '0.875rem', py: 1 }}>Assignments Now</MenuItem>
          </Menu>
          
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
        <Button onClick={handleMoreOptions} sx={{ textTransform: 'none', fontWeight: 500, color: '#1a73e8', '&:hover': { backgroundColor: '#f1f3f4' } }}>More options</Button>
        <Button variant="contained" onClick={() => handleSave(false)} disabled={isSaving || checkingOverlap} sx={{ backgroundColor: '#1a73e8', color: '#fff', textTransform: 'none', borderRadius: '20px', px: 3, fontWeight: 500, boxShadow: 'none', '&:hover': { backgroundColor: '#1557b0' } }}>
          {isSaving || checkingOverlap ? <CircularProgress size={20} color="inherit" /> : 'Save'}
        </Button>
      </DialogActions>
    </Popover>
  );
};

export default EventModal;
