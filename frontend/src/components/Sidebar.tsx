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
          overflowX: 'hidden',
          // Make it sit below the AppBar (64px)
          top: 64,
          height: 'calc(100% - 64px)',
          transition: 'transform 0.25s cubic-bezier(0.4,0,0.2,1)',
        },
      }}
    >
      {/* ── Create button — Google Calendar style ── */}
      <Box sx={{ px: 2, pt: 2, pb: 1 }}>
        <Box
          id="sidebar-create-btn"
          onClick={onCreateEvent}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.25,
            px: 2,
            py: 1.25,
            backgroundColor: '#ffffff',
            border: '1px solid #dadce0',
            borderRadius: '16px',
            cursor: 'pointer',
            width: 'fit-content',
            boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
            transition: 'box-shadow 0.2s ease',
            '&:hover': {
              boxShadow: '0 4px 12px rgba(0,0,0,0.18)',
            },
          }}
        >
          <AddIcon sx={{ color: '#3c4043', fontSize: 20 }} />
          <Typography sx={{ color: '#3c4043', fontSize: '0.875rem', fontWeight: 600, pr: 0.5 }}>
            Create
          </Typography>
        </Box>
      </Box>

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

      {/* ── Views ── */}
      <Box sx={{ px: 1, py: 1 }}>
        <List dense sx={{ py: 0 }}>
          {viewItems.map(({ view, label, icon }) => (
            <ListItem key={view} disablePadding>
              <ListItemButton
                id={`sidebar-${view}-view`}
                selected={currentView === view}
                onClick={() => onViewChange(view)}
                sx={{
                  borderRadius: '0 24px 24px 0',
                  pl: 2,
                  mr: 1,
                  mb: 0.25,
                  minHeight: 40,
                  '&.Mui-selected': {
                    backgroundColor: '#e8f0fe',
                    '&:hover': { backgroundColor: '#d2e3fc' },
                  },
                  '&:hover:not(.Mui-selected)': { backgroundColor: '#f1f3f4' },
                }}
              >
                <ListItemIcon sx={{ minWidth: 36, color: currentView === view ? '#1a73e8' : '#5f6368' }}>
                  {icon}
                </ListItemIcon>
                <ListItemText
                  primary={label}
                  primaryTypographyProps={{
                    fontSize: '0.875rem',
                    fontWeight: currentView === view ? 600 : 400,
                    color: currentView === view ? '#1a73e8' : '#3c4043',
                  }}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Box>

      <Divider sx={{ mx: 1 }} />

      {/* ── My Calendars ── */}
      <Box sx={{ px: 2, py: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
          <Typography
            variant="caption"
            sx={{ color: '#3c4043', fontWeight: 600, fontSize: '0.8125rem', letterSpacing: 0 }}
          >
            My calendars
          </Typography>
        </Box>
        {CALENDAR_COLORS.map(({ label, color }) => (
          <Box
            key={label}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              py: 0.5,
              px: 0.5,
              borderRadius: '6px',
              cursor: 'pointer',
              '&:hover': { backgroundColor: '#f1f3f4' },
            }}
          >
            <Box
              sx={{
                width: 16,
                height: 16,
                borderRadius: '4px',
                backgroundColor: color,
                flexShrink: 0,
              }}
            />
            <Typography variant="body2" sx={{ color: '#3c4043', fontSize: '0.875rem' }}>
              {label}
            </Typography>
          </Box>
        ))}
      </Box>
    </Drawer>
  );
};

export default Sidebar;
