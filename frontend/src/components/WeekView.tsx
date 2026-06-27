import React, { useRef, useState } from 'react';
import { Box, Typography, Tooltip } from '@mui/material';
import { startOfWeek, addDays, format, isSameDay, isToday } from 'date-fns';
import { Event } from '../types/Event';
import { processOverlappingEvents } from '../utils/eventUtils';
import { motion } from 'framer-motion';

interface WeekViewProps {
  currentDate: Date;
  events: Event[];
  onEventClick: (event: Event) => void;
  onCreateEvent: (startTime?: Date) => void;
  onEventDrop: (eventId: number, newStart: Date, newEnd: Date) => Promise<void>;
}

const HOUR_HEIGHT = 64;
const HOURS = Array.from({ length: 24 }, (_, i) => i);

const WeekView: React.FC<WeekViewProps> = ({
  currentDate,
  events,
  onEventClick,
  onCreateEvent,
  onEventDrop,
}) => {
  const weekStart = startOfWeek(currentDate);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const scrollRef = useRef<HTMLDivElement>(null);
  const [draggingEvent, setDraggingEvent] = useState<Event | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const getEventsForDay = (day: Date): Event[] =>
    events.filter((e) => {
      const start = new Date(e.startTime);
      return isSameDay(start, day) && !e.allDay;
    });

  const getAllDayEventsForDay = (day: Date): Event[] =>
    events.filter((e) => {
      const start = new Date(e.startTime);
      return isSameDay(start, day) && e.allDay;
    });

  const getEventStyle = (event: Event, groupSize: number, groupIndex: number) => {
    const start = new Date(event.startTime);
    const end = new Date(event.endTime);
    const startMins = start.getHours() * 60 + start.getMinutes();
    const endMins = end.getHours() * 60 + end.getMinutes();
    const top = (startMins / 60) * HOUR_HEIGHT;
    const height = Math.max(((endMins - startMins) / 60) * HOUR_HEIGHT, 24);
    const width = groupSize > 1 ? `${90 / groupSize}%` : '92%';
    const left = groupSize > 1 ? `${(90 / groupSize) * groupIndex}%` : '4%';
    return { top, height, width, left };
  };

  const handleColumnClick = (e: React.MouseEvent, day: Date) => {
    if ((e.target as HTMLElement).closest('.event-block')) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const clickY = e.clientY - rect.top;
    const hours = Math.floor(clickY / HOUR_HEIGHT);
    const minutes = Math.round(((clickY % HOUR_HEIGHT) / HOUR_HEIGHT) * 60 / 15) * 15;
    const startTime = new Date(day);
    startTime.setHours(hours, minutes, 0, 0);
    onCreateEvent(startTime);
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Column headers */}
      <Box sx={{ display: 'flex', flexShrink: 0, borderBottom: '1px solid #e0e0e0' }}>
        <Box sx={{ width: 60, flexShrink: 0 }} />
        {days.map((day, i) => {
          const today = isToday(day);
          return (
            <Box key={i} sx={{ flex: 1, textAlign: 'center', py: 1, borderLeft: '1px solid #e0e0e0' }}>
              <Typography variant="caption" sx={{ color: today ? '#1a73e8' : '#70757a', fontSize: '0.7rem', letterSpacing: '0.05em', fontWeight: 600 }}>
                {format(day, 'EEE').toUpperCase()}
              </Typography>
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  margin: '2px auto 0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '50%',
                  backgroundColor: today ? '#1a73e8' : 'transparent',
                  color: today ? 'white' : '#202124',
                  fontSize: '1rem',
                  fontWeight: today ? 700 : 400,
                }}
              >
                {format(day, 'd')}
              </Box>
            </Box>
          );
        })}
      </Box>

      {/* All-day row */}
      <Box sx={{ display: 'flex', flexShrink: 0, borderBottom: '1px solid #e0e0e0', minHeight: 24 }}>
        <Box sx={{ width: 60, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 1 }}>
          <Typography variant="caption" sx={{ color: '#70757a', fontSize: '0.65rem' }}>ALL DAY</Typography>
        </Box>
        {days.map((day, i) => {
          const allDayEvents = getAllDayEventsForDay(day);
          return (
            <Box key={i} sx={{ flex: 1, minWidth: 0, borderLeft: '1px solid #e0e0e0', p: 0.25 }}>
              {allDayEvents.map((event) => (
                <Box
                  key={event.id}
                  onClick={() => onEventClick(event)}
                  sx={{
                    backgroundColor: event.color || '#1a73e8',
                    color: 'white',
                    borderRadius: '4px',
                    px: 0.5,
                    fontSize: '0.7rem',
                    fontWeight: 500,
                    mb: 0.25,
                    cursor: 'pointer',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    '&:hover': { filter: 'brightness(0.9)' },
                  }}
                >
                  {event.title}
                </Box>
              ))}
            </Box>
          );
        })}
      </Box>

      {/* Scrollable time grid */}
      <Box ref={scrollRef} sx={{ flexGrow: 1, overflowY: 'auto', display: 'flex' }}>
        {/* Time gutter */}
        <Box sx={{ width: 60, flexShrink: 0 }}>
          {HOURS.map((hour) => (
            <Box key={hour} sx={{ height: HOUR_HEIGHT, display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', pr: 1, pt: 0.5 }}>
              {hour > 0 && (
                <Typography variant="caption" sx={{ color: '#70757a', fontSize: '0.65rem', lineHeight: 1, mt: '-0.4em' }}>
                  {format(new Date().setHours(hour, 0, 0, 0), 'h a')}
                </Typography>
              )}
            </Box>
          ))}
        </Box>

        {/* Day columns */}
        {days.map((day, di) => {
          const dayEvents = getEventsForDay(day);
          const processed = processOverlappingEvents(dayEvents, HOUR_HEIGHT);

          return (
            <Box
              key={di}
              sx={{
                flex: 1,
                minWidth: 0,
                borderLeft: '1px solid #e0e0e0',
                position: 'relative',
                height: HOUR_HEIGHT * 24,
                cursor: 'crosshair',
                '&:hover': { backgroundColor: 'rgba(26,115,232,0.01)' },
              }}
              onClick={(e) => handleColumnClick(e, day)}
            >
              {/* Hour lines */}
              {HOURS.map((hour) => (
                <Box
                  key={hour}
                  sx={{
                    position: 'absolute',
                    top: hour * HOUR_HEIGHT,
                    left: 0,
                    right: 0,
                    borderTop: '1px solid #f0f0f0',
                    pointerEvents: 'none',
                  }}
                />
              ))}

              {/* Current time indicator */}
              {isToday(day) && (() => {
                const now = new Date();
                const top = (now.getHours() * 60 + now.getMinutes()) / 60 * HOUR_HEIGHT;
                return (
                  <Box
                    sx={{
                      position: 'absolute',
                      top,
                      left: 0,
                      right: 0,
                      height: 2,
                      backgroundColor: '#ea4335',
                      zIndex: 5,
                      pointerEvents: 'none',
                      '&::before': {
                        content: '""',
                        position: 'absolute',
                        left: -4,
                        top: -4,
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        backgroundColor: '#ea4335',
                      },
                    }}
                  />
                );
              })()}

              {/* Event blocks */}
              {processed.map((pe) => {
                const { top, height, width, left } = getEventStyle(pe, 1, 0);
                return (
                  <motion.div
                    key={pe.id}
                    className="event-block"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    whileHover={{ scale: 1.01 }}
                    transition={{ duration: 0.15 }}
                    style={{
                      position: 'absolute',
                      top: pe.position.top,
                      height: Math.max(pe.position.height, 22),
                      width: `${pe.position.width - 4}%`,
                      left: `${pe.position.left + 2}%`,
                      zIndex: pe.position.zIndex + 1,
                    }}
                  >
                    <Tooltip
                      title={`${pe.title} • ${format(new Date(pe.startTime), 'h:mm a')} - ${format(new Date(pe.endTime), 'h:mm a')}`}
                      placement="top"
                      arrow
                    >
                      <Box
                        onClick={(e) => { e.stopPropagation(); onEventClick(pe); }}
                        sx={{
                          height: '100%',
                          backgroundColor: pe.color || '#1a73e8',
                          borderRadius: '6px',
                          px: 0.75,
                          py: 0.5,
                          overflow: 'hidden',
                          cursor: 'pointer',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                          borderLeft: `3px solid ${pe.color ? pe.color + 'cc' : '#1558b0'}`,
                          '&:hover': { filter: 'brightness(0.92)', boxShadow: '0 2px 6px rgba(0,0,0,0.3)' },
                          transition: 'filter 0.15s, box-shadow 0.15s',
                        }}
                      >
                        <Typography sx={{ color: 'white', fontSize: '0.75rem', fontWeight: 600, lineHeight: 1.2 }} noWrap>
                          {pe.title}
                        </Typography>
                        {pe.position.height > 36 && (
                          <Typography sx={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.65rem', lineHeight: 1.2 }}>
                            {format(new Date(pe.startTime), 'h:mm a')} – {format(new Date(pe.endTime), 'h:mm a')}
                          </Typography>
                        )}
                      </Box>
                    </Tooltip>
                  </motion.div>
                );
              })}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};

export default WeekView;
