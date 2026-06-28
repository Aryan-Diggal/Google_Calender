import React, { useMemo, useState } from 'react';
import { Box, Typography, Popover, Paper, Button, IconButton, Chip } from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
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
  onEventClick: (event: Event, anchor?: HTMLElement) => void;
  onCreateEvent: (startTime?: Date, anchor?: HTMLElement) => void;
  onEventDrop: (eventId: number | string, newStart: Date, newEnd: Date) => Promise<void>;
  onEventResize: (eventId: number | string, newStart: Date, newEnd: Date) => Promise<void>;
}

const MAX_VISIBLE_EVENTS = 3;

const MonthView: React.FC<MonthViewProps> = ({
  currentDate,
  events,
  onEventClick,
  onCreateEvent,
  onEventDrop,
  onEventResize,
}) => {
  const [moreAnchor, setMoreAnchor] = useState<{ el: HTMLElement; date: Date; events: Event[] } | null>(null);
  const [dragOverDate, setDragOverDate] = useState<Date | null>(null);
  const [draggingEvent, setDraggingEvent] = useState<Event | null>(null);
  const [resizingEvent, setResizingEvent] = useState<{ event: Event, edge: 'left' | 'right' } | null>(null);
  const [dragSourceDate, setDragSourceDate] = useState<Date | null>(null);

  React.useEffect(() => {
    const handleMouseUp = async (e: MouseEvent) => {
      if (draggingEvent && dragOverDate && dragSourceDate) {
        if (!isSameDay(dragOverDate, dragSourceDate)) {
          const diffTime = dragOverDate.getTime() - dragSourceDate.getTime();
          const newStart = new Date(new Date(draggingEvent.startTime).getTime() + diffTime);
          const newEnd = new Date(new Date(draggingEvent.endTime).getTime() + diffTime);
          await onEventDrop(draggingEvent.id!, newStart, newEnd);
        }
      } else if (resizingEvent && dragOverDate) {
        let newStart = new Date(resizingEvent.event.startTime);
        let newEnd = new Date(resizingEvent.event.endTime);
        
        // Month view resize operates on entire days
        if (resizingEvent.edge === 'left') {
          newStart = new Date(dragOverDate);
          newStart.setHours(0, 0, 0, 0);
        } else {
          newEnd = new Date(dragOverDate);
          newEnd.setHours(23, 59, 59, 999);
        }
        
        if (newStart <= newEnd) {
          await onEventResize(resizingEvent.event.id!, newStart, newEnd);
        }
      }
      
      setDraggingEvent(null);
      setResizingEvent(null);
      setDragSourceDate(null);
      setDragOverDate(null);
      document.body.style.userSelect = '';
    };

    if (draggingEvent || resizingEvent) {
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, [draggingEvent, resizingEvent, dragOverDate, dragSourceDate, onEventDrop, onEventResize]);

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
        if (e.allDay) {
          return start <= dayEnd && end >= dayStart;
        } else {
          // For non-all-day events shorter than 24 hours, only render on start day
          const durationMs = end.getTime() - start.getTime();
          if (durationMs <= 24 * 60 * 60 * 1000) {
            return isSameDay(start, day);
          }
          return start <= dayEnd && end >= dayStart;
        }
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
                  onMouseEnter={() => {
                    if (draggingEvent || resizingEvent) setDragOverDate(day);
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
                        onMouseDown={(e) => {
                          if (e.button !== 0) return;
                          e.stopPropagation();
                          const target = e.target as HTMLElement;
                          if (target.classList.contains('resize-handle-left')) {
                            setResizingEvent({ event, edge: 'left' });
                          } else if (target.classList.contains('resize-handle-right')) {
                            setResizingEvent({ event, edge: 'right' });
                          } else {
                            setDraggingEvent(event);
                            setDragSourceDate(day);
                          }
                          setDragOverDate(day);
                          document.body.style.userSelect = 'none';
                        }}
                        onClick={(e) => { e.stopPropagation(); onEventClick(event, e.currentTarget); }}
                        sx={{
                          backgroundColor: event.allDay ? (event.color || '#1a73e8') : 'transparent',
                          color: event.allDay ? 'white' : '#3c4043',
                          borderRadius: '4px',
                          px: 0.75,
                          py: 0.25,
                          mb: 0.25,
                          fontSize: '0.75rem',
                          fontWeight: 500,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          cursor: (draggingEvent || resizingEvent) ? 'grabbing' : 'pointer',
                          boxShadow: (event.id === -1 || draggingEvent?.id === event.id) ? '0 4px 6px rgba(0,0,0,0.25), 0 1px 3px rgba(0,0,0,0.15)' : 'none',
                          zIndex: (event.id === -1 || draggingEvent?.id === event.id) ? 10 : 1,
                          position: 'relative',
                          '&:hover': { filter: event.allDay ? 'brightness(0.9)' : 'none', backgroundColor: event.allDay ? 'none' : 'rgba(0,0,0,0.04)' },
                          transition: 'filter 0.15s, transform 0.1s, background-color 0.15s',
                          transform: draggingEvent?.id === event.id ? 'scale(1.02)' : 'none',
                          opacity: (draggingEvent?.id === event.id && !isSameDay(day, dragSourceDate!)) ? 0.5 : 1,
                        }}
                        title={event.title}
                      >
                        {/* Left resize handle (only for block events) */}
                        {event.allDay && isSameDay(day, new Date(event.startTime)) && (
                          <Box
                            className="resize-handle-left"
                            sx={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 6, cursor: 'ew-resize', zIndex: 2 }}
                          />
                        )}
                        {!event.allDay && (
                          <span style={{ color: event.color || '#1a73e8', marginRight: 4, fontSize: '10px' }}>●</span>
                        )}
                        {!event.allDay && (
                          <span style={{ opacity: 0.85, marginRight: 4, pointerEvents: 'none', fontWeight: 600 }}>
                            {format(new Date(event.startTime), 'h:mma').toLowerCase()}
                          </span>
                        )}
                        <span style={{ pointerEvents: 'none' }}>{event.title}</span>
                        {/* Right resize handle (only for block events) */}
                        {event.allDay && isSameDay(day, new Date(event.endTime)) && (
                          <Box
                            className="resize-handle-right"
                            sx={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 6, cursor: 'ew-resize', zIndex: 2 }}
                          />
                        )}
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
                onClick={(e: React.MouseEvent) => { onEventClick(event, e.currentTarget as HTMLElement); setMoreAnchor(null); }}
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
