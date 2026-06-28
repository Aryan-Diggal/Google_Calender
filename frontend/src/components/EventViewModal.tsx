import React, { useState } from 'react';
import {
  Popover,
  Box,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  Tooltip,
} from '@mui/material';
import {
  Close as CloseIcon,
  EditOutlined as EditIcon,
  DeleteOutline as DeleteIcon,
  EmailOutlined as EmailIcon,
  MoreVert as MoreVertIcon,
  NotificationsOutlined as NotificationsIcon,
  CalendarTodayOutlined as CalendarIcon,
  Notes as NotesIcon,
} from '@mui/icons-material';
import { format, isSameDay } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { Event } from '../types/Event';
import { useAuth } from '../context/AuthContext';

interface EventViewModalProps {
  open: boolean;
  anchorEl: HTMLElement | null;
  onClose: () => void;
  event: Event | null;
  onDelete: (id: number) => void;
}

const EventViewModal: React.FC<EventViewModalProps> = ({
  open,
  anchorEl,
  onClose,
  event,
  onDelete,
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [moreMenuAnchorEl, setMoreMenuAnchorEl] = useState<null | HTMLElement>(null);

  if (!event) return null;

  const handleEdit = () => {
    if (event.id) {
      navigate(`/eventedit/${event.id}`);
    } else {
      navigate('/eventedit');
    }
    onClose();
  };

  const handleDelete = () => {
    if (event.id) {
      onDelete(event.id);
    }
  };

  const formatDateTime = (startStr: string, endStr: string, allDay?: boolean) => {
    const start = new Date(startStr);
    const end = new Date(endStr);
    
    if (allDay) {
      if (isSameDay(start, end)) {
        return format(start, 'EEEE, d MMMM');
      }
      return `${format(start, 'EEEE, d MMMM')} – ${format(end, 'EEEE, d MMMM')}`;
    }

    if (isSameDay(start, end)) {
      return `${format(start, 'EEEE, d MMMM')} ⋅ ${format(start, 'h:mma').toLowerCase()} – ${format(end, 'h:mma').toLowerCase()}`;
    }
    
    return `${format(start, 'EEEE, d MMMM, h:mma')} – ${format(end, 'EEEE, d MMMM, h:mma')}`;
  };

  const anchorElRect = anchorEl?.getBoundingClientRect();
  const isRightSide = anchorElRect ? anchorElRect.left > window.innerWidth / 2 : false;
  const isWideAnchor = anchorElRect ? anchorElRect.width > window.innerWidth * 0.4 : false;

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{
        vertical: 'center',
        horizontal: isWideAnchor ? 'center' : (isRightSide ? 'left' : 'right'),
      }}
      transformOrigin={{
        vertical: 'center',
        horizontal: isWideAnchor ? 'center' : (isRightSide ? 'right' : 'left'),
      }}
      disableScrollLock={true}
      PaperProps={{
        sx: { 
          backgroundColor: '#f8f9fa',
          borderRadius: '24px', 
          boxShadow: '0 24px 38px 3px rgba(0,0,0,0.14), 0 9px 46px 8px rgba(0,0,0,0.12), 0 11px 15px -7px rgba(0,0,0,0.2)', 
          m: 1, 
          width: 'auto',
          minWidth: '448px',
          maxWidth: '500px',
        },
      }}
    >
      {/* Top Action Bar */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', px: 1, py: 0.5, gap: 0.5 }}>
        <Tooltip title="Edit event">
          <IconButton onClick={handleEdit} size="small" sx={{ color: '#5f6368' }}>
            <EditIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        
        <Tooltip title="Delete event">
          <IconButton onClick={handleDelete} size="small" sx={{ color: '#5f6368' }}>
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        
        <Tooltip title="Email guests">
          <IconButton size="small" sx={{ color: '#5f6368' }}>
            <EmailIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        
        <Tooltip title="Options">
          <IconButton 
            size="small" 
            sx={{ color: '#5f6368' }}
            onClick={(e) => setMoreMenuAnchorEl(e.currentTarget)}
          >
            <MoreVertIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        
        <Tooltip title="Close">
          <IconButton onClick={onClose} size="small" sx={{ color: '#5f6368', ml: 1 }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Options Menu */}
      <Menu
        anchorEl={moreMenuAnchorEl}
        open={Boolean(moreMenuAnchorEl)}
        onClose={() => setMoreMenuAnchorEl(null)}
        PaperProps={{
          sx: {
            borderRadius: '8px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            minWidth: '200px'
          }
        }}
      >
        <MenuItem onClick={() => setMoreMenuAnchorEl(null)} sx={{ fontSize: '0.875rem', py: 1 }}>Print</MenuItem>
        <MenuItem onClick={() => setMoreMenuAnchorEl(null)} sx={{ fontSize: '0.875rem', py: 1 }}>Duplicate</MenuItem>
        <MenuItem onClick={() => setMoreMenuAnchorEl(null)} sx={{ fontSize: '0.875rem', py: 1 }}>Copy to Assignments Now</MenuItem>
        <MenuItem onClick={() => setMoreMenuAnchorEl(null)} sx={{ fontSize: '0.875rem', py: 1 }}>Publish event</MenuItem>
        <MenuItem onClick={() => setMoreMenuAnchorEl(null)} sx={{ fontSize: '0.875rem', py: 1 }}>Change owner</MenuItem>
      </Menu>

      {/* Body */}
      <Box sx={{ px: 3, pb: 3, pt: 1, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        
        {/* Title and Time */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
          <Box 
            sx={{ 
              width: 14, 
              height: 14, 
              borderRadius: '3px', 
              backgroundColor: event.color || '#1a73e8',
              mt: 1,
              flexShrink: 0
            }} 
          />
          <Box>
            <Typography variant="h6" sx={{ fontSize: '1.375rem', fontWeight: 400, color: '#3c4043', lineHeight: 1.2, mb: 0.5 }}>
              {event.title}
            </Typography>
            <Typography sx={{ fontSize: '0.875rem', color: '#3c4043' }}>
              {formatDateTime(event.startTime, event.endTime, event.allDay)}
            </Typography>
          </Box>
        </Box>

        {/* Description */}
        {event.description && (
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
            <NotesIcon sx={{ color: '#5f6368', fontSize: 20, ml: -0.5 }} />
            <Typography 
              component="div" 
              sx={{ color: '#3c4043', fontSize: '0.875rem', '& p': { margin: 0 } }} 
              dangerouslySetInnerHTML={{ __html: event.description }} 
            />
          </Box>
        )}

        {/* Notifications */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <NotificationsIcon sx={{ color: '#5f6368', fontSize: 20, ml: -0.5 }} />
          <Typography sx={{ fontSize: '0.875rem', color: '#3c4043' }}>
            The day before at 5pm
          </Typography>
        </Box>

        {/* Calendar / User */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <CalendarIcon sx={{ color: '#5f6368', fontSize: 20, ml: -0.5 }} />
          <Typography sx={{ fontSize: '0.875rem', color: '#3c4043' }}>
            {user?.name || 'My Calendar'}
          </Typography>
        </Box>

      </Box>
    </Popover>
  );
};

export default EventViewModal;
