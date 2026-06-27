import React, { useState, useEffect, useRef } from 'react';
import { Box, Typography, Tooltip } from '@mui/material';
import { format, isToday } from 'date-fns';
import { Event } from '../types/Event';
import { processOverlappingEvents, getTimezoneOffsetString } from '../utils/eventUtils';
import { motion } from 'framer-motion';

interface DayViewProps {
  currentDate: Date;
  events: Event[];
  onEventClick: (event: Event, anchor?: HTMLElement) => void;
  onCreateEvent: (startTime?: Date) => void;
  onEventDrop: (eventId: number, newStart: Date, newEnd: Date) => Promise<void>;
  onEventResize: (eventId: number, newStart: Date, newEnd: Date) => Promise<void>;
}

const HOUR_HEIGHT = 40;
const HOURS = Array.from({ length: 24 }, (_, i) => i);

const DayView: React.FC<DayViewProps> = ({
  currentDate,
  events,
  onEventClick,
  onCreateEvent,
  onEventResize,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const regularEvents = events.filter((e) => !e.allDay);
  const allDayEvents = events.filter((e) => e.allDay);
  const processed = processOverlappingEvents(regularEvents, HOUR_HEIGHT);
  const date = new Date(currentDate);

  // --- Resizing state ---
  const [resizingEventId, setResizingEventId] = useState<number | null>(null);
  const [resizeType, setResizeType] = useState<'top' | 'bottom' | null>(null);
  const [resizeDeltaMins, setResizeDeltaMins] = useState<number>(0);
  const resizeDeltaMinsRef = useRef<number>(0);
  const [originalEvent, setOriginalEvent] = useState<Event | null>(null);
  const initialYRef = useRef<number>(0);

  const handleResizeStart = (e: React.MouseEvent, event: Event, type: 'top' | 'bottom') => {
    e.stopPropagation();
    e.preventDefault();
    setResizingEventId(event.id);
    setResizeType(type);
    setOriginalEvent(event);
    setResizeDeltaMins(0);
    resizeDeltaMinsRef.current = 0;
    initialYRef.current = e.clientY;
  };

  useEffect(() => {
    if (!resizingEventId) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaY = e.clientY - initialYRef.current;
      let deltaMins = (deltaY / HOUR_HEIGHT) * 60;
      deltaMins = Math.round(deltaMins / 15) * 15;

      if (originalEvent) {
        const start = new Date(originalEvent.startTime);
        const end = new Date(originalEvent.endTime);
        const durationMins = (end.getTime() - start.getTime()) / 60000;

        if (resizeType === 'top') {
          if (durationMins - deltaMins < 15) deltaMins = durationMins - 15;
        } else {
          if (durationMins + deltaMins < 15) deltaMins = 15 - durationMins;
        }
      }
      resizeDeltaMinsRef.current = deltaMins;
      setResizeDeltaMins(deltaMins);
    };

    const handleMouseUp = async () => {
      const finalDelta = resizeDeltaMinsRef.current;
      if (originalEvent && finalDelta !== 0) {
        const start = new Date(originalEvent.startTime);
        const end = new Date(originalEvent.endTime);
        if (resizeType === 'top') {
          start.setMinutes(start.getMinutes() + finalDelta);
        } else {
          end.setMinutes(end.getMinutes() + finalDelta);
        }
        await onEventResize(originalEvent.id!, start, end);
      }
      setResizingEventId(null);
      setResizeType(null);
      setOriginalEvent(null);
      setResizeDeltaMins(0);
      resizeDeltaMinsRef.current = 0;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizingEventId, resizeType, originalEvent, onEventResize]);
  // ----------------------

  const handleColumnClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.event-block')) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const clickY = e.clientY - rect.top;
    const hours = Math.floor(clickY / HOUR_HEIGHT);
    const minutes = Math.round(((clickY % HOUR_HEIGHT) / HOUR_HEIGHT) * 60 / 15) * 15;
    const startTime = new Date(currentDate);
    startTime.setHours(hours, minutes, 0, 0);
    onCreateEvent(startTime);
  };

  const today = isToday(currentDate);

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Day header */}
      <Box sx={{ flexShrink: 0, display: 'flex' }}>
        <Box sx={{ width: 60, flexShrink: 0, position: 'relative' }}>
          <Typography variant="caption" sx={{ position: 'absolute', bottom: 8, right: 8, color: '#70757a', fontSize: '0.6rem', lineHeight: 1, whiteSpace: 'nowrap' }}>
            {getTimezoneOffsetString()}
          </Typography>
        </Box>
        <Box sx={{ flex: 1, py: 1.5, px: 2, position: 'relative', borderBottom: '1px solid #e0e0e0', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <Box sx={{ position: 'absolute', left: 0, bottom: 0, width: '1px', height: 8, backgroundColor: '#e0e0e0' }} />
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Typography variant="caption" sx={{ color: today ? '#1a73e8' : '#70757a', fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.05em', mb: 0.5 }}>
              {format(currentDate, 'EEE').toUpperCase()}
            </Typography>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 46,
                height: 46,
                borderRadius: '50%',
                backgroundColor: today ? '#1a73e8' : 'transparent',
                color: today ? 'white' : '#202124',
                fontSize: '1.625rem',
                fontWeight: today ? 500 : 400,
              }}
            >
              {format(currentDate, 'd')}
            </Box>
          </Box>
        </Box>
        <Box sx={{ width: 8, flexShrink: 0, borderBottom: '1px solid #e0e0e0' }} />
      </Box>

      {/* All-day events row */}
      {allDayEvents.length > 0 && (
        <Box sx={{ flexShrink: 0, display: 'flex', minHeight: 28 }}>
          <Box sx={{ width: 60, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 1 }} />
          <Box sx={{ flex: 1, borderLeft: '1px solid #e0e0e0', borderBottom: '1px solid #e0e0e0', p: 0.5, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            {allDayEvents.map((event) => (
              <Box
                key={event.id}
                onClick={(e) => { e.stopPropagation(); onEventClick(event, e.currentTarget); }}
                sx={{
                  backgroundColor: event.color || '#1a73e8',
                  color: 'white',
                  borderRadius: '4px',
                  px: 1,
                  py: 0.25,
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  '&:hover': { filter: 'brightness(0.9)' },
                }}
              >
                {event.title}
              </Box>
            ))}
          </Box>
          <Box sx={{ width: 8, flexShrink: 0, borderBottom: '1px solid #e0e0e0' }} />
        </Box>
      )}

      {/* Scrollable time grid */}
      <Box ref={scrollRef} sx={{ 
        flexGrow: 1, 
        overflowY: 'auto', 
        display: 'flex',
        '&::-webkit-scrollbar': {
          width: '8px',
        },
        '&::-webkit-scrollbar-track': {
          background: 'transparent',
          borderLeft: '1px solid #e0e0e0',
        },
        '&::-webkit-scrollbar-thumb': {
          background: '#dadce0',
          borderRadius: '4px',
        },
        '&::-webkit-scrollbar-thumb:hover': {
          background: '#bdc1c6',
        }
      }}>
        {/* Time gutter */}
        <Box sx={{ width: 60, flexShrink: 0 }}>
          {HOURS.map((hour) => (
            <Box key={hour} sx={{ height: HOUR_HEIGHT, position: 'relative' }}>
              {hour > 0 && (
                <>
                  <Typography variant="caption" sx={{ position: 'absolute', right: 12, top: '-0.6em', color: '#70757a', fontSize: '0.65rem', lineHeight: 1 }}>
                    {format(new Date().setHours(hour, 0, 0, 0), 'h a')}
                  </Typography>
                  <Box sx={{ position: 'absolute', right: 0, top: 0, width: 8, height: '1px', backgroundColor: '#e0e0e0' }} />
                </>
              )}
            </Box>
          ))}
        </Box>

        {/* Day column */}
        <Box
          sx={{
            flex: 1,
            borderLeft: '1px solid #e0e0e0',
            position: 'relative',
            height: HOUR_HEIGHT * 24,
            cursor: 'crosshair',
          }}
          onClick={handleColumnClick}
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
          {today && (() => {
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
            const isResizing = resizingEventId === pe.id;
            let renderTop = pe.position.top;
            let renderHeight = Math.max(pe.position.height, 22);
            let renderStart = new Date(pe.startTime);
            let renderEnd = new Date(pe.endTime);

            if (isResizing) {
              const deltaPx = (resizeDeltaMins / 60) * HOUR_HEIGHT;
              if (resizeType === 'top') {
                renderTop += deltaPx;
                renderHeight -= deltaPx;
                renderStart.setMinutes(renderStart.getMinutes() + resizeDeltaMins);
              } else {
                renderHeight += deltaPx;
                renderEnd.setMinutes(renderEnd.getMinutes() + resizeDeltaMins);
              }
              renderHeight = Math.max(renderHeight, 10);
            }

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
                  top: renderTop,
                  height: renderHeight,
                  width: `calc(${pe.position.width}% - 6px)`,
                  left: `${pe.position.left}%`,
                  zIndex: isResizing ? 999 : pe.position.zIndex + 1,
                }}
              >
                <Tooltip
                  title={`${pe.title} • ${format(renderStart, 'h:mm a')} - ${format(renderEnd, 'h:mm a')}${pe.location ? ` • ${pe.location}` : ''}`}
                  placement="right"
                  arrow
                >
                  <Box
                    onClick={(e) => { e.stopPropagation(); onEventClick(pe, e.currentTarget); }}
                    sx={{
                      height: '100%',
                      backgroundColor: pe.color || '#1a73e8',
                      borderRadius: '8px',
                      px: 1.5,
                      py: 0.75,
                      overflow: 'hidden',
                      cursor: 'pointer',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                      borderLeft: `4px solid ${pe.color ? pe.color + 'aa' : '#1558b0'}`,
                      '&:hover': { filter: 'brightness(0.92)', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' },
                      transition: isResizing ? 'none' : 'all 0.15s',
                    }}
                  >
                    <Typography sx={{ color: 'white', fontSize: '0.875rem', fontWeight: 700, lineHeight: 1.3, pointerEvents: 'none' }} noWrap>
                      {pe.title}
                    </Typography>
                    {renderHeight > 40 && (
                      <Typography sx={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.75rem', lineHeight: 1.3, pointerEvents: 'none' }}>
                        {format(renderStart, 'h:mm a')} – {format(renderEnd, 'h:mm a')}
                      </Typography>
                    )}
                    {renderHeight > 60 && pe.location && (
                      <Typography sx={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.7rem', mt: 0.5, pointerEvents: 'none' }} noWrap>
                        📍 {pe.location}
                      </Typography>
                    )}
                    
                    {/* Top Resize Handle */}
                    <Box
                      onMouseDown={(e) => handleResizeStart(e, pe, 'top')}
                      sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: '8px',
                        cursor: 'ns-resize',
                        zIndex: 10,
                        '&:hover': { backgroundColor: 'rgba(255,255,255,0.2)' }
                      }}
                    />
                    {/* Bottom Resize Handle */}
                    <Box
                      onMouseDown={(e) => handleResizeStart(e, pe, 'bottom')}
                      sx={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: '8px',
                        cursor: 'ns-resize',
                        zIndex: 10,
                        '&:hover': { backgroundColor: 'rgba(255,255,255,0.2)' }
                      }}
                    />
                  </Box>
                </Tooltip>
              </motion.div>
            );
          })}
        </Box>
      </Box>
    </Box>
  );
};

export default DayView;
