import React, { useMemo, useState } from 'react';
import { Box, Typography, Popover, Paper, Button, IconButton, Chip } from '@mui/material';
import { Close as CloseIcon, Add as AddIcon } from '@mui/icons-material';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameMonth,
  isSameDay,
  isToday,
  format,
} from 'date-fns';
import { Event } from '../types/Event';
import { motion, AnimatePresence } from 'framer-motion';
import { useDndMonitor } from '@dnd-kit/core';

interface MonthViewProps {
  currentDate: Date;
  events: Event[];
  onEventClick: (event: Event) => void;
  onCreateEvent: (startTime?: Date, anchor?: HTMLElement) => void;
  onEventDrop: (eventId: number, newStart: Date, newEnd: Date) => Promise<void>;
}

const MAX_VISIBLE_EVENTS = 3;

const MonthView: React.FC<MonthViewProps> = ({
  currentDate,
  events,
  onEventClick,
  onCreateEvent,
}) => {
  const [moreAnchor, setMoreAnchor] = useState<{ el: HTMLElement; date: Date; events: Event[] } | null>(null);
  const [dragOverDate, setDragOverDate] = useState<Date | null>(null);

  const weeks = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calStart = startOfWeek(monthStart);
    const calEnd = endOfWeek(monthEnd);

    const days: Date[] = [];
    let day = calStart;
    while (day <= calEnd) {
      days.push(day);
      day = addDays(day, 1);
    }

    const result: Date[][] = [];
    for (let i = 0; i < days.length; i += 7) {
      result.push(days.slice(i, i + 7));
    }
    return result;
  }, [currentDate]);

  const getEventsForDay = (day: Date): Event[] => {
    return events
      .filter((e) => {
        const start = new Date(e.startTime);
        const end = new Date(e.endTime);
        const dayStart = new Date(day);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(day);
        dayEnd.setHours(23, 59, 59, 999);
        return start <= dayEnd && end >= dayStart;
      })
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  };

  const WEEK_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Day headers */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', flexShrink: 0 }}>
        {WEEK_DAYS.map((day, i) => (
          <Box key={day} sx={{ pt: 1.5, pb: 0, textAlign: 'center', borderRight: i < 6 ? '1px solid #e0e0e0' : 'none' }}>
            <Typography variant="caption" sx={{ color: '#70757a', fontWeight: 500, fontSize: '0.7125rem', letterSpacing: '0.05em', lineHeight: 1 }}>
              {day.toUpperCase()}
            </Typography>
          </Box>
        ))}
      </Box>

      {/* Calendar Grid */}
      <Box sx={{ flexGrow: 1, display: 'grid', gridTemplateRows: `repeat(${weeks.length}, 1fr)`, overflow: 'hidden' }}>
        {weeks.map((week, wi) => (
          <Box key={wi} sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: wi < weeks.length - 1 ? '1px solid #e0e0e0' : 'none' }}>
            {week.map((day, di) => {
              const dayEvents = getEventsForDay(day);
              const visibleEvents = dayEvents.slice(0, MAX_VISIBLE_EVENTS);
              const hiddenCount = dayEvents.length - MAX_VISIBLE_EVENTS;
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isCurrentDay = isToday(day);
              const isDragOver = dragOverDate && isSameDay(day, dragOverDate);

              return (
                <Box
                  key={di}
                  sx={{
                    borderRight: di < 6 ? '1px solid #e0e0e0' : 'none',
                    p: 0.5,
                    minHeight: 100,
                    minWidth: 0,
                    backgroundColor: isDragOver ? '#e8f0fe' : 'transparent',
                    transition: 'background-color 0.15s',
                    cursor: 'pointer',
                    '&:hover .add-event-btn': { opacity: 1 },
                    position: 'relative',
                  }}
                  onClick={(e) => {
                    if ((e.target as HTMLElement).closest('.event-pill')) return;
                    onCreateEvent(day, e.currentTarget);
                  }}
                >
                  {/* Day number */}
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mb: 0.5, position: 'relative' }}>
                    <Box
                      sx={{
                        minWidth: 28,
                        height: 28,
                        px: day.getDate() === 1 ? 1 : 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '14px',
                        backgroundColor: isCurrentDay ? '#1a73e8' : 'transparent',
                        color: isCurrentDay ? 'white' : isCurrentMonth ? '#3c4043' : '#b0b0b0',
                        fontSize: '0.75rem',
                        fontWeight: isCurrentDay ? 700 : 500,
                        cursor: 'pointer',
                        '&:hover': { backgroundColor: isCurrentDay ? '#1557b0' : '#f1f3f4' },
                      }}
                    >
                      {day.getDate() === 1 ? format(day, 'd MMM') : format(day, 'd')}
                    </Box>
                    <IconButton
                      className="add-event-btn"
                      size="small"
                      onClick={(e) => { e.stopPropagation(); onCreateEvent(day); }}
                      sx={{ opacity: 0, transition: 'opacity 0.15s', width: 20, height: 20, position: 'absolute', right: 0 }}
                    >
                      <AddIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  </Box>

                  {/* Events */}
                  {visibleEvents.map((event) => (
                    <motion.div
                      key={event.id}
                      className="event-pill"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.15 }}
                    >
                      <Box
                        onClick={(e) => { e.stopPropagation(); onEventClick(event); }}
                        sx={{
                          backgroundColor: event.color || '#1a73e8',
                          color: 'white',
                          borderRadius: '4px',
                          px: 0.75,
                          py: 0.25,
                          mb: 0.25,
                          fontSize: '0.75rem',
                          fontWeight: 500,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          cursor: 'pointer',
                          boxShadow: event.id === -1 ? '0 4px 6px rgba(0,0,0,0.25), 0 1px 3px rgba(0,0,0,0.15)' : 'none',
                          zIndex: event.id === -1 ? 10 : 1,
                          position: event.id === -1 ? 'relative' : 'static',
                          '&:hover': { filter: 'brightness(0.9)' },
                          transition: 'filter 0.15s',
                        }}
                        title={event.title}
                      >
                        {!event.allDay && (
                          <span style={{ opacity: 0.85, marginRight: 4 }}>
                            {format(new Date(event.startTime), 'h:mm a')}
                          </span>
                        )}
                        {event.title}
                      </Box>
                    </motion.div>
                  ))}

                  {/* "+N more" button */}
                  {hiddenCount > 0 && (
                    <Box
                      onClick={(e) => {
                        e.stopPropagation();
                        setMoreAnchor({ el: e.currentTarget as HTMLElement, date: day, events: dayEvents });
                      }}
                      sx={{
                        fontSize: '0.75rem',
                        color: '#5f6368',
                        fontWeight: 600,
                        px: 0.75,
                        py: 0.25,
                        borderRadius: '4px',
                        cursor: 'pointer',
                        '&:hover': { backgroundColor: '#f1f3f4' },
                      }}
                    >
                      +{hiddenCount} more
                    </Box>
                  )}
                </Box>
              );
            })}
          </Box>
        ))}
      </Box>

      {/* Popover for "more" events */}
      <Popover
        open={Boolean(moreAnchor)}
        anchorEl={moreAnchor?.el}
        onClose={() => setMoreAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        PaperProps={{ sx: { borderRadius: '12px', p: 1.5, minWidth: 220, boxShadow: '0 8px 30px rgba(0,0,0,0.15)' } }}
      >
        {moreAnchor && (
          <>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="subtitle2" fontWeight={600}>
                {format(moreAnchor.date, 'EEEE, MMM d')}
              </Typography>
              <IconButton size="small" onClick={() => setMoreAnchor(null)}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>
            {moreAnchor.events.map((event) => (
              <Box
                key={event.id}
                onClick={() => { onEventClick(event); setMoreAnchor(null); }}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  py: 0.75,
                  px: 1,
                  borderRadius: '6px',
                  cursor: 'pointer',
                  '&:hover': { backgroundColor: '#f1f3f4' },
                }}
              >
                <Box sx={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: event.color || '#1a73e8', flexShrink: 0 }} />
                <Typography variant="body2" noWrap>{event.title}</Typography>
              </Box>
            ))}
          </>
        )}
      </Popover>
    </Box>
  );
};

export default MonthView;
