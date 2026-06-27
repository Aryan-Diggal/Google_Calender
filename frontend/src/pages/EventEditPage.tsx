import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Box, IconButton, Typography, Button, TextField, Checkbox, 
  FormControlLabel, MenuItem, Select, CircularProgress, Menu
} from '@mui/material';
import {
  Close as CloseIcon,
  VideocamOutlined as VideocamIcon,
  LocationOnOutlined as LocationIcon,
  NotificationsNoneOutlined as NotificationsIcon,
  CalendarToday as CalendarIcon,
  Notes as NotesIcon,
  FormatBold, FormatItalic, FormatUnderlined, FormatListBulleted, FormatListNumbered, Link as LinkIcon, FormatClear,
  ArrowDropDown as ArrowDropDownIcon,
  Check as CheckIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
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
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const { enqueueSnackbar } = useSnackbar();
  
  const contentEditableRef = useRef<HTMLDivElement>(null);

  const getDefaultStart = () => {
    const now = new Date();
    const remainder = now.getMinutes() % 30;
    return addMinutes(now, 30 - remainder);
  };
  const getDefaultEnd = () => addHours(getDefaultStart(), 1);

  const [title, setTitle] = useState(location.state?.title || '');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState<Date>(location.state?.startDate ? new Date(location.state.startDate) : getDefaultStart());
  const [endDate, setEndDate] = useState<Date>(location.state?.endDate ? new Date(location.state.endDate) : getDefaultEnd());
  const [startTime, setStartTime] = useState<Date>(location.state?.startTime ? new Date(location.state.startTime) : getDefaultStart());
  const [endTime, setEndTime] = useState<Date>(location.state?.endTime ? new Date(location.state.endTime) : getDefaultEnd());
  const [allDay, setAllDay] = useState(location.state?.allDay || false);
  const [recurrence, setRecurrence] = useState<'none' | 'daily' | 'weekly' | 'monthly'>('none');
  const [isSaving, setIsSaving] = useState(false);
  
  const [startOpen, setStartOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);

  const [colorAnchorEl, setColorAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedColor, setSelectedColor] = useState('#1a73e8');
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

  useEffect(() => {
    if (id) {
      eventService.getEventById(Number(id))
        .then(event => {
          setTitle(event.title);
          setDescription(event.description || '');
          if (contentEditableRef.current && event.description) {
            contentEditableRef.current.innerHTML = event.description;
          }
          const start = new Date(event.startTime);
          const end = new Date(event.endTime);
          setStartDate(start);
          setStartTime(start);
          setEndDate(end);
          setEndTime(end);
          setAllDay(event.allDay || false);
          setRecurrence(event.recurrence || 'none');
          if (event.color) setSelectedColor(event.color);
        })
        .catch(err => {
          enqueueSnackbar('Failed to load event', { variant: 'error' });
          navigate('/');
        });
    }
  }, [id, navigate, enqueueSnackbar]);

  const handleSave = async (forceSave = false) => {
    if (!title.trim()) {
      enqueueSnackbar('Please add a title', { variant: 'error' });
      return;
    }

    const start = getCombinedDate(startDate, startTime, allDay);
    let end = getCombinedDate(endDate, endTime, allDay);
    if (allDay) end = addHours(startOfDay(endDate), 23);

    if (!forceSave) {
      let overlaps = await eventService.getOverlappingEvents(start.toISOString(), end.toISOString());
      if (id) {
        overlaps = overlaps.filter(o => o.id !== Number(id));
      }
      if (overlaps.length > 0) {
        if (!window.confirm(`Time conflict detected! Overlaps with ${overlaps.map(o => o.title).join(', ')}. Save anyway?`)) {
          return;
        }
      }
    }

    try {
      setIsSaving(true);
      
      const eventData = {
        title: title.trim(),
        description: description.trim() || undefined,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        location: undefined,
        color: selectedColor,
        allDay,
        recurrence,
      };

      if (id) {
        await eventService.updateEvent(Number(id), eventData);
      } else {
        await eventService.createEvent(eventData);
      }
      
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
      <Box sx={{ display: 'flex', px: 8, py: 1, mt: 1, maxWidth: 1200, width: '100%', boxSizing: 'border-box' }}>
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center' }}>
          <IconButton onClick={() => navigate('/')} sx={{ color: '#5f6368', mr: 2, ml: -6 }}>
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
        </Box>

        <Box sx={{ width: 320, display: 'flex', alignItems: 'center', ml: 8 }}>
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
      </Box>

      {/* Date and Time Row */}
      <Box sx={{ pl: 8, pr: 4, py: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
        
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'nowrap', width: 'max-content' }}>
          <DatePicker
            value={startDate}
            open={startOpen}
            onOpen={() => setStartOpen(true)}
            onClose={() => setStartOpen(false)}
            onChange={(val) => { if(val) setStartDate(val); setStartOpen(false); }}
            format="d MMM yyyy"
            slotProps={{ textField: { onClick: () => setStartOpen(true), variant: 'standard', InputProps: { readOnly: true, disableUnderline: true, sx: { fontSize: '0.875rem', backgroundColor: '#f1f3f4', px: 2, py: 1, borderRadius: '4px', cursor: 'pointer', '&:hover': { backgroundColor: '#e8eaed' }, '& .MuiInputAdornment-root': { display: 'none' }, textAlign: 'center', input: { textAlign: 'center', padding: 0, width: '85px', cursor: 'pointer' } } } } }}
          />
          
          {!allDay && (
            <>
              <Select 
                value={formatTime(startTime)} onChange={(e) => handleStartTimeChange(e.target.value)} 
                variant="standard" disableUnderline 
                IconComponent={() => null}
                sx={{ fontSize: '0.875rem', backgroundColor: '#f1f3f4', px: 2, py: 1, borderRadius: '4px', height: 36, '& .MuiSelect-select': { py: 0, paddingRight: '0 !important' } }}
              >
                {startTimeOptions.map((t) => <MenuItem key={t.getTime()} value={formatTime(t)} sx={{ fontSize: '0.875rem' }}>{formatTime(t)}</MenuItem>)}
              </Select>
              
              <Typography sx={{ color: '#5f6368', fontSize: '0.875rem', mx: 0.5 }}>to</Typography>
              
              <Select 
                value={currentEndObj.toISOString()} 
                onChange={(e) => handleEndTimeChange(e.target.value)} 
                renderValue={(val) => formatTime(new Date(val))}
                variant="standard" disableUnderline 
                IconComponent={() => null}
                sx={{ fontSize: '0.875rem', backgroundColor: '#f1f3f4', px: 2, py: 1, borderRadius: '4px', height: 36, '& .MuiSelect-select': { py: 0, paddingRight: '0 !important' } }}
              >
                {endTimeOptions.map((t) => <MenuItem key={t.toISOString()} value={t.toISOString()} sx={{ fontSize: '0.875rem' }}>{formatTime(t)} {getDurationString(getCombinedDate(startDate, startTime), t)}</MenuItem>)}
              </Select>

              <DatePicker
                value={endDate}
                open={endOpen}
                onOpen={() => setEndOpen(true)}
                onClose={() => setEndOpen(false)}
                onChange={(val) => { if(val) setEndDate(val); setEndOpen(false); }}
                format="d MMM yyyy"
                slotProps={{ textField: { onClick: () => setEndOpen(true), variant: 'standard', InputProps: { readOnly: true, disableUnderline: true, sx: { fontSize: '0.875rem', backgroundColor: '#f1f3f4', px: 2, py: 1, borderRadius: '4px', cursor: 'pointer', '&:hover': { backgroundColor: '#e8eaed' }, '& .MuiInputAdornment-root': { display: 'none' }, textAlign: 'center', input: { textAlign: 'center', padding: 0, width: '85px', cursor: 'pointer' } } } } }}
              />

              <Typography sx={{ color: '#1a73e8', fontSize: '0.875rem', cursor: 'pointer', ml: 1 }}>Time zone</Typography>
            </>
          )}

          {allDay && (
            <>
              <Typography sx={{ color: '#5f6368', fontSize: '0.875rem', mx: 0.5 }}>to</Typography>
              <DatePicker value={endDate} open={endOpen} onOpen={() => setEndOpen(true)} onClose={() => setEndOpen(false)} onChange={(val) => { if(val) setEndDate(val); setEndOpen(false); }} format="d MMM yyyy" slotProps={{ textField: { onClick: () => setEndOpen(true), variant: 'standard', InputProps: { readOnly: true, disableUnderline: true, sx: { fontSize: '0.875rem', backgroundColor: '#f1f3f4', px: 2, py: 1, borderRadius: '4px', cursor: 'pointer', '&:hover': { backgroundColor: '#e8eaed' }, '& .MuiInputAdornment-root': { display: 'none' }, textAlign: 'center', input: { textAlign: 'center', padding: 0, width: '85px', cursor: 'pointer' } } } } }} />
              <Typography sx={{ color: '#1a73e8', fontSize: '0.875rem', cursor: 'pointer', ml: 1 }}>Time zone</Typography>
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
          <Box sx={{ boxShadow: '0 1px 2px 0 rgba(60,64,67,0.3), 0 1px 3px 1px rgba(60,64,67,0.15)', border: '1px solid #dadce0', borderRadius: '8px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            
            <Box sx={{ display: 'flex', gap: 3, borderBottom: '1px solid #dadce0', px: 3, pt: 2, backgroundColor: '#ffffff' }}>
              <Typography sx={{ fontSize: '0.875rem', color: '#1a73e8', fontWeight: 500, pb: 1, borderBottom: '2px solid #1a73e8' }}>Event details</Typography>
              <Typography sx={{ fontSize: '0.875rem', color: '#5f6368', fontWeight: 500, pb: 1, cursor: 'pointer' }}>Find a time</Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, px: 2, py: 2, backgroundColor: '#ffffff' }}>
              <VideocamIcon sx={{ color: '#fbbc04' }} />
              <Typography sx={{ color: '#3c4043', fontSize: '0.875rem' }}>Add Google Meet video conferencing</Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, px: 2, py: 1.5, backgroundColor: '#ffffff' }}>
              <LocationIcon sx={{ color: '#5f6368' }} />
              <Box sx={{ flexGrow: 1, backgroundColor: '#f1f3f4', borderRadius: '4px', px: 2, py: 1 }}>
                <Typography sx={{ color: '#5f6368', fontSize: '0.875rem' }}>Add location</Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, px: 2, py: 2, backgroundColor: '#ffffff' }}>
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
            <Box sx={{ pl: 6, pb: 2, backgroundColor: '#ffffff' }}>
              <Typography sx={{ color: '#1a73e8', fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer' }}>Add notification</Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, px: 2, py: 1.5, backgroundColor: '#ffffff' }}>
              <CalendarIcon sx={{ color: '#5f6368' }} />
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Select size="small" value="aryan" sx={{ height: 32, fontSize: '0.875rem', backgroundColor: '#f1f3f4', '& fieldset': { border: 'none' } }}>
                  <MenuItem value="aryan">Aryan Diggal</MenuItem>
                </Select>
                <Box onClick={(e) => setColorAnchorEl(e.currentTarget)} sx={{ display: 'flex', alignItems: 'center', backgroundColor: '#f1f3f4', borderRadius: '4px', px: 1, gap: 0.5, cursor: 'pointer', '&:hover': { backgroundColor: '#e8eaed' } }}>
                  <Box sx={{ width: 14, height: 14, borderRadius: '50%', backgroundColor: selectedColor }} />
                  <ArrowDropDownIcon fontSize="small" sx={{ fontSize: 20, color: '#5f6368' }} />
                </Box>
                <Menu anchorEl={colorAnchorEl} open={Boolean(colorAnchorEl)} onClose={() => setColorAnchorEl(null)} PaperProps={{ sx: { p: 1, borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' } }}>
                  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1 }}>
                    {GOOGLE_COLORS.map(color => (
                      <Box
                        key={color}
                        onClick={() => { setSelectedColor(color); setColorAnchorEl(null); }}
                        sx={{ width: 24, height: 24, borderRadius: '50%', backgroundColor: color, cursor: 'pointer', '&:hover': { opacity: 0.8 }, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        {selectedColor === color && <CheckIcon sx={{ color: '#fff', fontSize: 16 }} />}
                      </Box>
                    ))}
                  </Box>
                </Menu>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, pl: 6, pr: 2, py: 1.5, backgroundColor: '#ffffff', pb: 2 }}>
              <Select size="small" value="free" sx={{ height: 32, fontSize: '0.875rem', backgroundColor: '#f1f3f4', '& fieldset': { border: 'none' } }}>
                <MenuItem value="free">Free</MenuItem>
              </Select>
              <Select size="small" value="default" sx={{ height: 32, fontSize: '0.875rem', backgroundColor: '#f1f3f4', '& fieldset': { border: 'none' } }}>
                <MenuItem value="default">Default visibility</MenuItem>
              </Select>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, px: 2, py: 2, backgroundColor: '#ffffff', pb: 3 }}>
              <NotesIcon sx={{ color: '#5f6368', mt: 1 }} />
              <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#f1f3f4', borderRadius: '8px', px: 2, py: 2, minHeight: 150 }}>
                <Box sx={{ display: 'flex', gap: 1, mb: 1, color: '#5f6368' }}>
                  <FormatBold fontSize="small" onMouseDown={(e) => { e.preventDefault(); document.execCommand('bold', false); }} sx={{ cursor: 'pointer', '&:hover': { color: '#202124' } }} />
                  <FormatItalic fontSize="small" onMouseDown={(e) => { e.preventDefault(); document.execCommand('italic', false); }} sx={{ cursor: 'pointer', '&:hover': { color: '#202124' } }} />
                  <FormatUnderlined fontSize="small" onMouseDown={(e) => { e.preventDefault(); document.execCommand('underline', false); }} sx={{ cursor: 'pointer', '&:hover': { color: '#202124' } }} />
                  <FormatListBulleted fontSize="small" sx={{ ml: 1, cursor: 'pointer', opacity: 0.5 }} />
                  <FormatListNumbered fontSize="small" sx={{ cursor: 'pointer', opacity: 0.5 }} />
                  <LinkIcon fontSize="small" sx={{ ml: 1, cursor: 'pointer', opacity: 0.5 }} />
                  <FormatClear fontSize="small" sx={{ ml: 1, cursor: 'pointer', opacity: 0.5 }} />
                </Box>
                <Box
                  ref={contentEditableRef}
                  contentEditable
                  onInput={(e) => setDescription(e.currentTarget.innerHTML)}
                  suppressContentEditableWarning
                  sx={{
                    flexGrow: 1,
                    fontSize: '0.875rem',
                    color: '#3c4043',
                    outline: 'none',
                    minHeight: '100px',
                    '&:empty:before': {
                      content: '"Add description"',
                      color: '#5f6368',
                      pointerEvents: 'none'
                    }
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
