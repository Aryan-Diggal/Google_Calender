import React, { useState } from 'react';
import {
  Box,
  Drawer,
  Typography,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Checkbox,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  ChevronLeft,
  ChevronRight,
  Add as AddIcon,
  CalendarViewMonth,
  CalendarViewWeek,
  CalendarViewDay,
  FiberManualRecord as DotIcon,
  PeopleAlt as PeopleIcon,
  KeyboardArrowUp,
  KeyboardArrowDown,
  ArrowDropDown,
} from '@mui/icons-material';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isToday,
} from 'date-fns';
import { CalendarView } from '../types/Event';

interface SidebarProps {
  open: boolean;
  currentView: CalendarView;
  onViewChange: (view: CalendarView) => void;
  onCreateEvent: () => void;
  selectedDate?: Date;
  onDateSelect?: (date: Date) => void;
}

const WEEK_DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const CALENDAR_COLORS = [
  { label: 'My Calendar', color: '#4285f4' },
  { label: 'Work', color: '#33b679' },
  { label: 'Personal', color: '#8e24aa' },
  { label: 'Birthdays', color: '#f4511e' },
];

const Sidebar: React.FC<SidebarProps> = ({
  open,
  currentView,
  onViewChange,
  onCreateEvent,
  selectedDate = new Date(),
  onDateSelect,
}) => {
  const [miniMonth, setMiniMonth] = useState(selectedDate);
  const [isScrolled, setIsScrolled] = useState(false);
  const [createMenuAnchorEl, setCreateMenuAnchorEl] = useState<null | HTMLElement>(null);

  const handleCreateMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setCreateMenuAnchorEl(event.currentTarget);
  };
  const handleCreateMenuClose = () => {
    setCreateMenuAnchorEl(null);
  };

  const miniCalDays = (() => {
    const monthStart = startOfMonth(miniMonth);
    const monthEnd = endOfMonth(monthStart);
    const start = startOfWeek(monthStart);
    const end = endOfWeek(monthEnd);
    const days: Date[] = [];
    let d = start;
    while (d <= end) {
      days.push(d);
      d = addDays(d, 1);
    }
    return days;
  })();

  const viewItems = [
    { view: 'month' as CalendarView, label: 'Month', icon: <CalendarViewMonth fontSize="small" /> },
    { view: 'week' as CalendarView, label: 'Week', icon: <CalendarViewWeek fontSize="small" /> },
    { view: 'day' as CalendarView, label: 'Day', icon: <CalendarViewDay fontSize="small" /> },
  ];

  return (
    <Drawer
      variant="persistent"
      anchor="left"
      open={open}
      sx={{
        width: open ? 256 : 0,
        flexShrink: 0,
        transition: 'width 0.25s cubic-bezier(0.4,0,0.2,1)',
        '& .MuiDrawer-paper': {
          width: 256,
          boxSizing: 'border-box',
          backgroundColor: '#f8f9fa',
          borderRight: 'none',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          // Make it sit below the AppBar (64px)
          top: 64,
          height: 'calc(100% - 64px)',
          transition: 'transform 0.25s cubic-bezier(0.4,0,0.2,1)',
        },
      }}
    >
      {/* ── Create button — Google Calendar style ── */}
      <Box sx={{ 
        px: 1, 
        pt: 1, 
        pb: 2, 
        flexShrink: 0,
        boxShadow: isScrolled ? '0 1px 2px 0 rgba(60,64,67,0.3), 0 2px 6px 2px rgba(60,64,67,0.15)' : 'none',
        transition: 'box-shadow 0.2s',
        zIndex: 2,
        backgroundColor: '#f8f9fa'
      }}>
        <Box
          id="sidebar-create-btn"
          onClick={handleCreateMenuOpen}
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: 2,
            py: 1.5,
            ml: 1,
            backgroundColor: '#ffffff',
            border: '1px solid #dadce0',
            borderRadius: '16px',
            cursor: 'pointer',
            width: 'fit-content',
            minWidth: '130px',
            boxShadow: '0 1px 2px 0 rgba(60,64,67,0.3), 0 1px 3px 1px rgba(60,64,67,0.15)',
            transition: 'box-shadow 0.2s ease, background-color 0.2s',
            '&:hover': {
              boxShadow: '0 1px 3px 0 rgba(60,64,67,0.3), 0 4px 8px 3px rgba(60,64,67,0.15)',
              backgroundColor: '#f8f9fa',
            },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AddIcon sx={{ color: '#3c4043', fontSize: 24 }} />
            <Typography sx={{ color: '#3c4043', fontSize: '1rem', fontWeight: 500 }}>
              Create
            </Typography>
          </Box>
          <ArrowDropDown sx={{ color: '#5f6368', fontSize: 24, ml: 1 }} />
        </Box>
        <Menu
          anchorEl={createMenuAnchorEl}
          open={Boolean(createMenuAnchorEl)}
          onClose={handleCreateMenuClose}
          sx={{ mt: 1 }}
          PaperProps={{
            sx: {
              width: 200,
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)',
            }
          }}
        >
          <MenuItem onClick={() => { handleCreateMenuClose(); onCreateEvent(); }} sx={{ py: 1.5, fontSize: '0.875rem' }}>
            Event
          </MenuItem>
          <MenuItem onClick={handleCreateMenuClose} sx={{ py: 1.5, fontSize: '0.875rem' }}>
            Task
          </MenuItem>
          <MenuItem onClick={handleCreateMenuClose} sx={{ py: 1.5, fontSize: '0.875rem' }}>
            Appointment schedule
          </MenuItem>
        </Menu>
      </Box>

      {/* ── Scrollable Content ── */}
      <Box 
        onScroll={(e) => setIsScrolled((e.target as HTMLElement).scrollTop > 0)}
        sx={{ 
          flex: 1, 
          overflowY: 'auto', 
          overflowX: 'hidden',
          '&::-webkit-scrollbar': {
            width: '8px',
            backgroundColor: 'transparent',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: 'transparent',
            borderRadius: '4px',
          },
          '&:hover::-webkit-scrollbar-thumb': {
            backgroundColor: '#dadce0',
          },
        }}
      >
        {/* ── Mini Calendar ── */}
        <Box sx={{ px: 1.5, pb: 1, pt: 0.5 }}>
        {/* Month nav header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5, pl: 0.5 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#3c4043', fontSize: '0.8125rem' }}>
            {format(miniMonth, 'MMMM yyyy')}
          </Typography>
          <Box>
            <IconButton size="small" onClick={() => setMiniMonth(subMonths(miniMonth, 1))}
              sx={{ '&:hover': { backgroundColor: '#f1f3f4' } }}>
              <ChevronLeft fontSize="small" />
            </IconButton>
            <IconButton size="small" onClick={() => setMiniMonth(addMonths(miniMonth, 1))}
              sx={{ '&:hover': { backgroundColor: '#f1f3f4' } }}>
              <ChevronRight fontSize="small" />
            </IconButton>
          </Box>
        </Box>

        {/* Weekday labels */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', mb: 0.25 }}>
          {WEEK_DAYS.map((d, i) => (
            <Box key={i} sx={{ textAlign: 'center' }}>
              <Typography variant="caption" sx={{ color: '#70757a', fontSize: '0.65rem', fontWeight: 600 }}>
                {d}
              </Typography>
            </Box>
          ))}
        </Box>

        {/* Day grid */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '1px' }}>
          {miniCalDays.map((day, i) => {
            const inMonth = isSameMonth(day, miniMonth);
            const selected = isSameDay(day, selectedDate);
            const current = isToday(day);
            return (
              <Box
                key={i}
                onClick={() => { onDateSelect?.(day); setMiniMonth(day); }}
                sx={{
                  aspectRatio: '1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '50%',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  backgroundColor: selected
                    ? '#1a73e8'
                    : current && !selected
                      ? 'transparent'
                      : 'transparent',
                  color: selected
                    ? 'white'
                    : current
                      ? '#1a73e8'
                      : inMonth
                        ? '#3c4043'
                        : '#b0b0b0',
                  fontWeight: current ? 700 : 400,
                  border: current && !selected ? '1px solid #1a73e8' : 'none',
                  '&:hover': {
                    backgroundColor: selected ? '#1557b0' : '#f1f3f4',
                  },
                  transition: 'background-color 0.15s',
                }}
              >
                {format(day, 'd')}
              </Box>
            );
          })}
        </Box>
      </Box>

      {/* ── Search for people ── */}
      <Box sx={{ px: 1.5, pb: 1.5 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            px: 1.5,
            py: 1,
            backgroundColor: '#f1f3f4',
            borderRadius: '24px',
            cursor: 'pointer',
            '&:hover': { backgroundColor: '#e8eaed' },
          }}
        >
          <PeopleIcon sx={{ color: '#5f6368', fontSize: 18 }} />
          <Typography variant="body2" sx={{ color: '#5f6368', fontSize: '0.8125rem' }}>
            Search for people
          </Typography>
        </Box>
      </Box>

      <Divider sx={{ mx: 1 }} />

      {/* ── Booking Pages ── */}
      <Box sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', '&:hover': { backgroundColor: '#f1f3f4' } }}>
        <Typography variant="body2" sx={{ color: '#3c4043', fontWeight: 500, fontSize: '0.875rem' }}>
          Booking pages
        </Typography>
        <AddIcon sx={{ color: '#5f6368', fontSize: 20 }} />
      </Box>

      {/* ── My Calendars ── */}
      <Box sx={{ px: 2, pb: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5, cursor: 'pointer', '&:hover': { backgroundColor: '#f1f3f4' } }}>
          <Typography
            variant="body2"
            sx={{ color: '#3c4043', fontWeight: 500, fontSize: '0.875rem' }}
          >
            My calendars
          </Typography>
          <KeyboardArrowUp sx={{ color: '#5f6368', fontSize: 20 }} />
        </Box>
        {CALENDAR_COLORS.map(({ label, color }) => (
          <Box
            key={label}
            sx={{
              display: 'flex',
              alignItems: 'center',
              py: 0.25,
              px: 0.5,
              borderRadius: '6px',
              cursor: 'pointer',
              '&:hover': { backgroundColor: '#f1f3f4' },
            }}
          >
            <Checkbox
              size="small"
              defaultChecked
              disableRipple
              sx={{
                color: color,
                '&.Mui-checked': { color: color },
                p: 0.5,
                mr: 1,
                '& .MuiSvgIcon-root': { fontSize: 20, borderRadius: '4px' }
              }}
            />
            <Typography variant="body2" sx={{ color: '#3c4043', fontSize: '0.875rem' }}>
              {label}
            </Typography>
          </Box>
        ))}
      </Box>

      {/* ── Other Calendars ── */}
      <Box sx={{ px: 2, pb: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5, cursor: 'pointer', '&:hover': { backgroundColor: '#f1f3f4' } }}>
          <Typography
            variant="body2"
            sx={{ color: '#3c4043', fontWeight: 500, fontSize: '0.875rem' }}
          >
            Other calendars
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <AddIcon sx={{ color: '#5f6368', fontSize: 20, mr: 1 }} />
            <KeyboardArrowUp sx={{ color: '#5f6368', fontSize: 20 }} />
          </Box>
        </Box>
        {/* Dummy items for Other calendars */}
        {['Books [Personal]', 'Chemistry [Personal]', 'Computer Science', 'Holidays in India', 'Mathematics [Personal]'].map((label, idx) => {
          const colors = ['#3f51b5', '#3f51b5', '#3f51b5', '#0f9d58', '#db4437'];
          return (
            <Box
              key={label}
              sx={{
                display: 'flex',
                alignItems: 'center',
                py: 0.25,
                px: 0.5,
                borderRadius: '6px',
                cursor: 'pointer',
                '&:hover': { backgroundColor: '#f1f3f4' },
              }}
            >
              <Checkbox
                size="small"
                defaultChecked
                disableRipple
                sx={{
                  color: colors[idx],
                  '&.Mui-checked': { color: colors[idx] },
                  p: 0.5,
                  mr: 1,
                  '& .MuiSvgIcon-root': { fontSize: 20, borderRadius: '4px' }
                }}
              />
              <Typography variant="body2" sx={{ color: '#3c4043', fontSize: '0.875rem' }}>
                {label}
              </Typography>
            </Box>
          );
        })}
      </Box>
      </Box>
    </Drawer>
  );
};

export default Sidebar;
