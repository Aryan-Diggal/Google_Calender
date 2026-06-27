import React, { useState } from 'react';
import {
  Box, IconButton, Typography, Button, TextField, Checkbox, 
  FormControlLabel, MenuItem, Select,
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
import { useNavigate } from 'react-router-dom';

const EventEditPage: React.FC = () => {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [allDay, setAllDay] = useState(false);

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: '#ffffff', display: 'flex', flexDirection: 'column' }}>
      {/* Header Bar */}
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
            sx={{
              backgroundColor: '#1a73e8',
              color: '#fff',
              textTransform: 'none',
              borderRadius: '20px',
              px: 3,
              py: 0.5,
              fontWeight: 500,
              boxShadow: 'none',
              '&:hover': { backgroundColor: '#1557b0', boxShadow: '0 1px 2px 0 rgba(60,64,67,0.3)' },
            }}
          >
            Save
          </Button>
        </Box>

        <Box sx={{ width: 150 }} /> 
      </Box>

      {/* Date and Time Row */}
      <Box sx={{ pl: 8, pr: 4, py: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', backgroundColor: '#f1f3f4', borderRadius: '4px', px: 2, py: 1 }}>
            <Typography sx={{ color: '#3c4043', fontSize: '0.875rem' }}>29 Jun 2026</Typography>
          </Box>
          <Typography sx={{ color: '#5f6368', fontSize: '0.875rem' }}>to</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', backgroundColor: '#f1f3f4', borderRadius: '4px', px: 2, py: 1 }}>
            <Typography sx={{ color: '#3c4043', fontSize: '0.875rem' }}>29 Jun 2026</Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 3, alignItems: 'center' }}>
          <FormControlLabel
            control={<Checkbox checked={allDay} onChange={(e) => setAllDay(e.target.checked)} color="primary" sx={{ '& .MuiSvgIcon-root': { fontSize: 20 } }} />}
            label={<Typography sx={{ fontSize: '0.875rem', color: '#3c4043' }}>All day</Typography>}
            sx={{ ml: 0 }}
          />
          <Select
            size="small"
            value="none"
            sx={{ 
              borderRadius: '4px', 
              fontSize: '0.875rem', 
              height: 36, 
              backgroundColor: '#f1f3f4',
              '& .MuiOutlinedInput-notchedOutline': { border: 'none' }
            }}
          >
            <MenuItem value="none">Does not repeat</MenuItem>
          </Select>
        </Box>
      </Box>

      {/* Main Content Columns */}
      <Box sx={{ display: 'flex', px: 8, gap: 8, mt: 2, maxWidth: 1200 }}>
        
        {/* Left Column (Event Details) */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0 }}>
          
          <Box sx={{ display: 'flex', gap: 3, borderBottom: '1px solid #dadce0', mb: 2 }}>
            <Typography sx={{ fontSize: '0.875rem', color: '#1a73e8', fontWeight: 500, pb: 1, borderBottom: '2px solid #1a73e8' }}>
              Event details
            </Typography>
            <Typography sx={{ fontSize: '0.875rem', color: '#5f6368', fontWeight: 500, pb: 1, cursor: 'pointer' }}>
              Find a time
            </Typography>
          </Box>

          <Box sx={{ 
            border: '1px solid #dadce0', 
            borderRadius: '8px', 
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}>
            {/* Meet */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, px: 2, py: 2 }}>
              <VideocamIcon sx={{ color: '#fbbc04' }} />
              <Typography sx={{ color: '#3c4043', fontSize: '0.875rem' }}>
                Add Google Meet video conferencing
              </Typography>
            </Box>

            {/* Location */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, px: 2, py: 1.5, backgroundColor: '#f1f3f4' }}>
              <LocationIcon sx={{ color: '#5f6368' }} />
              <Typography sx={{ color: '#5f6368', fontSize: '0.875rem' }}>
                Add location
              </Typography>
            </Box>

            {/* Notification */}
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
              <Typography sx={{ color: '#1a73e8', fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer' }}>
                Add notification
              </Typography>
            </Box>

            {/* Calendar Select */}
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

            {/* Free/Busy and Visibility */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, pl: 6, pr: 2, py: 1.5 }}>
              <Select size="small" value="free" sx={{ height: 32, fontSize: '0.875rem', backgroundColor: '#f1f3f4', '& fieldset': { border: 'none' } }}>
                <MenuItem value="free">Free</MenuItem>
              </Select>
              <Select size="small" value="default" sx={{ height: 32, fontSize: '0.875rem', backgroundColor: '#f1f3f4', '& fieldset': { border: 'none' } }}>
                <MenuItem value="default">Default visibility</MenuItem>
              </Select>
            </Box>

            {/* Description (Rich Text fake layout) */}
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
                <Typography sx={{ color: '#5f6368', fontSize: '0.875rem' }}>
                  Add description
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>

        {/* Right Column (Guests) */}
        <Box sx={{ width: 320, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box sx={{ display: 'flex', gap: 3, borderBottom: '1px solid #dadce0', mb: 0 }}>
            <Typography sx={{ fontSize: '0.875rem', color: '#1a73e8', fontWeight: 500, pb: 1, borderBottom: '2px solid #1a73e8' }}>
              Guests
            </Typography>
          </Box>

          <Box sx={{ backgroundColor: '#f1f3f4', borderRadius: '4px', p: 1.5, mt: 1 }}>
            <Typography sx={{ color: '#5f6368', fontSize: '0.875rem' }}>Add guests</Typography>
          </Box>

          <Box sx={{ mt: 2 }}>
            <Typography sx={{ fontSize: '0.875rem', color: '#3c4043', mb: 1 }}>
              Guest permissions
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
              <FormControlLabel
                control={<Checkbox size="small" sx={{ padding: 0.5 }} />}
                label={<Typography sx={{ fontSize: '0.875rem', color: '#3c4043' }}>Modify event</Typography>}
              />
              <FormControlLabel
                control={<Checkbox size="small" defaultChecked sx={{ padding: 0.5 }} />}
                label={<Typography sx={{ fontSize: '0.875rem', color: '#3c4043' }}>Invite others</Typography>}
              />
              <FormControlLabel
                control={<Checkbox size="small" defaultChecked sx={{ padding: 0.5 }} />}
                label={<Typography sx={{ fontSize: '0.875rem', color: '#3c4043' }}>See guest list</Typography>}
              />
            </Box>
          </Box>
        </Box>

      </Box>
    </Box>
  );
};

export default EventEditPage;
