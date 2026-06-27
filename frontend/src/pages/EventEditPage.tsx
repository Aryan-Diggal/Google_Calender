import React, { useState, useMemo } from 'react';
import {
  Box, IconButton, Typography, Button, TextField, Checkbox, 
  FormControlLabel, MenuItem, Select, CircularProgress,
} from '@mui/material';
import {
  Close as CloseIcon,
  VideocamOutlined as VideocamIcon,
  LocationOnOutlined as LocationIcon,
  NotificationsNoneOutlined as NotificationsIcon,
  CalendarToday as CalendarIcon,
  Notes as NotesIcon,
  FormatBold, FormatItalic, FormatUnderlined, FormatListBulleted, FormatListNumbered, Link as LinkIcon, FormatClear,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { useNavigate } from 'react-router-dom';
import { format, addHours, isSameDay, differenceInMinutes, parse, startOfDay, addMinutes, addDays } from 'date-fns';
import { eventService } from '../services/api';
import { useSnackbar } from 'notistack';

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

const formatTime = (date: Date) => format(date, 'h:mma').toLowerCase();

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

const EventEditPage: React.FC = () => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

  const getDefaultStart = () => {
    const now = new Date();
    const remainder = now.getMinutes() % 30;
    return addMinutes(now, 30 - remainder);
  };
  const getDefaultEnd = () => addHours(getDefaultStart(), 1);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState<Date>(getDefaultStart());
  const [endDate, setEndDate] = useState<Date>(getDefaultEnd());
  const [startTime, setStartTime] = useState<Date>(getDefaultStart());
  const [endTime, setEndTime] = useState<Date>(getDefaultEnd());
  const [allDay, setAllDay] = useState(false);
  const [recurrence, setRecurrence] = useState<'none' | 'daily' | 'weekly' | 'monthly'>('none');
  const [isSaving, setIsSaving] = useState(false);
  
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

  const handleSave = async (forceSave = false) => {
    if (!title.trim()) {
      enqueueSnackbar('Please add a title', { variant: 'error' });
      return;
    }

    const start = getCombinedDate(startDate, startTime, allDay);
    let end = getCombinedDate(endDate, endTime, allDay);
    if (allDay) end = addHours(startOfDay(endDate), 23);

    if (!forceSave) {
      const overlaps = await eventService.getOverlappingEvents(start.toISOString(), end.toISOString());
      if (overlaps.length > 0) {
        if (!window.confirm(`Time conflict detected! Overlaps with ${overlaps.map(o => o.title).join(', ')}. Save anyway?`)) {
          return;
        }
      }
    }

    try {
      setIsSaving(true);
      await eventService.createEvent({
        title: title.trim(),
        description: description.trim() || undefined,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        location: undefined,
        color: '#1a73e8',
        allDay,
        recurrence,
      });
      enqueueSnackbar('Event saved!', { variant: 'success' });
      navigate('/');
    } catch (err: any) {
      enqueueSnackbar(err.message || 'Failed to save event', { variant: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const currentEndObj = getCombinedDate(endDate, endTime);

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: '#ffffff', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', px: 2, py: 1, borderBottom: '1px solid transparent', mt: 1 }}>
        <IconButton onClick={() => navigate('/')} sx={{ color: '#5f6368', mr: 2 }}>
          <CloseIcon />
        </IconButton>
        
        <Box sx={{ flexGrow: 1, maxWidth: 600 }}>
          <TextField
            fullWidth
            variant="standard"
            placeholder="Add title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
            InputProps={{
              disableUnderline: false,
              sx: {
                fontSize: '1.5rem',
                color: '#3c4043',
                '&::before': { borderBottom: '1px solid transparent !important' },
                '&:hover::before': { borderBottom: '1px solid #dadce0 !important' },
                '&::after': { borderBottom: '2px solid #1a73e8 !important' },
              }
            }}
          />
        </Box>

        <Box sx={{ display: 'flex', flexGrow: 1, justifyContent: 'center' }}>
          <Button
            variant="contained"
            onClick={() => handleSave()}
            disabled={isSaving}
            sx={{
              backgroundColor: '#1a73e8', color: '#fff', textTransform: 'none', borderRadius: '20px', px: 3, py: 0.5, fontWeight: 500, boxShadow: 'none',
              '&:hover': { backgroundColor: '#1557b0', boxShadow: '0 1px 2px 0 rgba(60,64,67,0.3)' },
            }}
          >
            {isSaving ? <CircularProgress size={20} color="inherit" /> : 'Save'}
          </Button>
        </Box>

        <Box sx={{ width: 150 }} /> 
      </Box>

      {/* Date and Time Row */}
      <Box sx={{ pl: 8, pr: 4, py: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
        
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'nowrap', width: 'max-content' }}>
          <DatePicker
            value={startDate}
            onChange={(val) => { if(val) setStartDate(val); }}
            format="EEEE, d MMMM"
            slotProps={{ textField: { variant: 'standard', InputProps: { disableUnderline: true, sx: { fontSize: '0.875rem', backgroundColor: '#f1f3f4', px: 2, py: 1, borderRadius: '4px', cursor: 'pointer', '&:hover': { backgroundColor: '#e8eaed' } } } } }}
          />
          
          {!allDay && (
            <>
              <Select value={formatTime(startTime)} onChange={(e) => handleStartTimeChange(e.target.value)} variant="standard" disableUnderline sx={{ fontSize: '0.875rem', backgroundColor: '#f1f3f4', px: 2, py: 1, borderRadius: '4px', height: 36, '& .MuiSelect-select': { py: 0 } }}>
                {startTimeOptions.map((t) => <MenuItem key={t.getTime()} value={formatTime(t)} sx={{ fontSize: '0.875rem' }}>{formatTime(t)}</MenuItem>)}
              </Select>
              
              <Typography sx={{ color: '#5f6368', fontSize: '0.875rem', mx: 0.5 }}>–</Typography>
              
              <Select 
                value={currentEndObj.toISOString()} 
                onChange={(e) => handleEndTimeChange(e.target.value)} 
                renderValue={(val) => formatTime(new Date(val))}
                variant="standard" disableUnderline 
                sx={{ fontSize: '0.875rem', backgroundColor: '#f1f3f4', px: 2, py: 1, borderRadius: '4px', height: 36, '& .MuiSelect-select': { py: 0 } }}
              >
                {endTimeOptions.map((t) => <MenuItem key={t.toISOString()} value={t.toISOString()} sx={{ fontSize: '0.875rem' }}>{formatTime(t)} {getDurationString(getCombinedDate(startDate, startTime), t)}</MenuItem>)}
              </Select>

              {!isSameDay(startDate, endDate) && (
                <DatePicker
                  value={endDate}
                  onChange={(val) => { if(val) setEndDate(val); }}
                  format="EEEE, d MMMM"
                  slotProps={{ textField: { variant: 'standard', InputProps: { disableUnderline: true, sx: { fontSize: '0.875rem', backgroundColor: '#f1f3f4', px: 2, py: 1, borderRadius: '4px', cursor: 'pointer', '&:hover': { backgroundColor: '#e8eaed' } } } } }}
                />
              )}
            </>
          )}

          {allDay && (
            <>
              <Typography sx={{ color: '#5f6368', fontSize: '0.875rem', mx: 0.5 }}>to</Typography>
              <DatePicker value={endDate} onChange={(val) => { if(val) setEndDate(val); }} format="EEEE, d MMMM" slotProps={{ textField: { variant: 'standard', InputProps: { disableUnderline: true, sx: { fontSize: '0.875rem', backgroundColor: '#f1f3f4', px: 2, py: 1, borderRadius: '4px', cursor: 'pointer', '&:hover': { backgroundColor: '#e8eaed' } } } } }} />
            </>
          )}
        </Box>

        <Box sx={{ display: 'flex', gap: 3, alignItems: 'center' }}>
          <FormControlLabel
            control={<Checkbox checked={allDay} onChange={(e) => setAllDay(e.target.checked)} color="primary" sx={{ '& .MuiSvgIcon-root': { fontSize: 20 } }} />}
            label={<Typography sx={{ fontSize: '0.875rem', color: '#3c4043' }}>All day</Typography>}
            sx={{ ml: 0 }}
          />
          <Select
            size="small"
            value={recurrence}
            onChange={(e) => setRecurrence(e.target.value as any)}
            variant="standard"
            disableUnderline
            sx={{ fontSize: '0.875rem', backgroundColor: '#f1f3f4', px: 1, py: 0.5, borderRadius: '4px', height: 32, '& .MuiSelect-select': { py: 0 } }}
          >
            <MenuItem value="none" sx={{ fontSize: '0.875rem' }}>Does not repeat</MenuItem>
            <MenuItem value="daily" sx={{ fontSize: '0.875rem' }}>Daily</MenuItem>
            <MenuItem value="weekly" sx={{ fontSize: '0.875rem' }}>Weekly on {format(startDate, 'EEEE')}</MenuItem>
            <MenuItem value="monthly" sx={{ fontSize: '0.875rem' }}>Monthly on the {Math.ceil(startDate.getDate()/7)} {format(startDate, 'EEEE')}</MenuItem>
          </Select>
        </Box>
      </Box>

      {/* Main Content Columns */}
      <Box sx={{ display: 'flex', px: 8, gap: 8, mt: 2, maxWidth: 1200 }}>
        
        {/* Left Column (Event Details) */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0 }}>
          <Box sx={{ display: 'flex', gap: 3, borderBottom: '1px solid #dadce0', mb: 2 }}>
            <Typography sx={{ fontSize: '0.875rem', color: '#1a73e8', fontWeight: 500, pb: 1, borderBottom: '2px solid #1a73e8' }}>Event details</Typography>
            <Typography sx={{ fontSize: '0.875rem', color: '#5f6368', fontWeight: 500, pb: 1, cursor: 'pointer' }}>Find a time</Typography>
          </Box>

          <Box sx={{ border: '1px solid #dadce0', borderRadius: '8px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, px: 2, py: 2 }}>
              <VideocamIcon sx={{ color: '#fbbc04' }} />
              <Typography sx={{ color: '#3c4043', fontSize: '0.875rem' }}>Add Google Meet video conferencing</Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, px: 2, py: 1.5, backgroundColor: '#f1f3f4' }}>
              <LocationIcon sx={{ color: '#5f6368' }} />
              <Typography sx={{ color: '#5f6368', fontSize: '0.875rem' }}>Add location</Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, px: 2, py: 2 }}>
              <NotificationsIcon sx={{ color: '#5f6368' }} />
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Select size="small" value="notification" sx={{ height: 32, fontSize: '0.875rem', backgroundColor: '#f1f3f4', '& fieldset': { border: 'none' } }}>
                  <MenuItem value="notification">Notification</MenuItem>
                </Select>
                <TextField size="small" value="1" sx={{ width: 60, '& input': { height: 32, padding: '0 8px', fontSize: '0.875rem', backgroundColor: '#f1f3f4', border: 'none', borderRadius: '4px' }, '& fieldset': { border: 'none' } }} />
                <Select size="small" value="days" sx={{ height: 32, fontSize: '0.875rem', backgroundColor: '#f1f3f4', '& fieldset': { border: 'none' } }}>
                  <MenuItem value="days">days</MenuItem>
                </Select>
                <Typography sx={{ fontSize: '0.875rem', color: '#3c4043', mx: 1 }}>before at 5:00pm</Typography>
                <IconButton size="small"><CloseIcon fontSize="small" /></IconButton>
              </Box>
            </Box>
            <Box sx={{ pl: 6, pb: 2 }}>
              <Typography sx={{ color: '#1a73e8', fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer' }}>Add notification</Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, px: 2, py: 1.5 }}>
              <CalendarIcon sx={{ color: '#5f6368' }} />
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Select size="small" value="aryan" sx={{ height: 32, fontSize: '0.875rem', backgroundColor: '#f1f3f4', '& fieldset': { border: 'none' } }}>
                  <MenuItem value="aryan">Aryan Diggal</MenuItem>
                </Select>
                <Box sx={{ display: 'flex', alignItems: 'center', backgroundColor: '#f1f3f4', borderRadius: '4px', px: 1, gap: 0.5 }}>
                  <Box sx={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#1a73e8' }} />
                  <CloseIcon fontSize="small" sx={{ fontSize: 16, color: '#5f6368', cursor: 'pointer' }} />
                </Box>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, pl: 6, pr: 2, py: 1.5 }}>
              <Select size="small" value="free" sx={{ height: 32, fontSize: '0.875rem', backgroundColor: '#f1f3f4', '& fieldset': { border: 'none' } }}>
                <MenuItem value="free">Free</MenuItem>
              </Select>
              <Select size="small" value="default" sx={{ height: 32, fontSize: '0.875rem', backgroundColor: '#f1f3f4', '& fieldset': { border: 'none' } }}>
                <MenuItem value="default">Default visibility</MenuItem>
              </Select>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, px: 2, py: 2, backgroundColor: '#f8f9fa', borderTop: '1px solid #dadce0', minHeight: 150 }}>
              <NotesIcon sx={{ color: '#5f6368', mt: 1 }} />
              <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ display: 'flex', gap: 1, mb: 1, color: '#5f6368' }}>
                  <FormatBold fontSize="small" sx={{ cursor: 'pointer' }} />
                  <FormatItalic fontSize="small" sx={{ cursor: 'pointer' }} />
                  <FormatUnderlined fontSize="small" sx={{ cursor: 'pointer' }} />
                  <FormatListBulleted fontSize="small" sx={{ ml: 1, cursor: 'pointer' }} />
                  <FormatListNumbered fontSize="small" sx={{ cursor: 'pointer' }} />
                  <LinkIcon fontSize="small" sx={{ ml: 1, cursor: 'pointer' }} />
                  <FormatClear fontSize="small" sx={{ ml: 1, cursor: 'pointer' }} />
                </Box>
                <TextField
                  fullWidth
                  variant="standard"
                  placeholder="Add description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  multiline
                  InputProps={{
                    disableUnderline: true,
                    sx: { fontSize: '0.875rem', color: '#5f6368', '& textarea': { p: 0 } }
                  }}
                />
              </Box>
            </Box>
          </Box>
        </Box>

        {/* Right Column (Guests) */}
        <Box sx={{ width: 320, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box sx={{ display: 'flex', gap: 3, borderBottom: '1px solid #dadce0', mb: 0 }}>
            <Typography sx={{ fontSize: '0.875rem', color: '#1a73e8', fontWeight: 500, pb: 1, borderBottom: '2px solid #1a73e8' }}>Guests</Typography>
          </Box>

          <Box sx={{ backgroundColor: '#f1f3f4', borderRadius: '4px', p: 1.5, mt: 1 }}>
            <Typography sx={{ color: '#5f6368', fontSize: '0.875rem' }}>Add guests</Typography>
          </Box>

          <Box sx={{ mt: 2 }}>
            <Typography sx={{ fontSize: '0.875rem', color: '#3c4043', mb: 1 }}>Guest permissions</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
              <FormControlLabel control={<Checkbox size="small" sx={{ padding: 0.5 }} />} label={<Typography sx={{ fontSize: '0.875rem', color: '#3c4043' }}>Modify event</Typography>} />
              <FormControlLabel control={<Checkbox size="small" defaultChecked sx={{ padding: 0.5 }} />} label={<Typography sx={{ fontSize: '0.875rem', color: '#3c4043' }}>Invite others</Typography>} />
              <FormControlLabel control={<Checkbox size="small" defaultChecked sx={{ padding: 0.5 }} />} label={<Typography sx={{ fontSize: '0.875rem', color: '#3c4043' }}>See guest list</Typography>} />
            </Box>
          </Box>
        </Box>

      </Box>
    </Box>
  );
};

export default EventEditPage;
