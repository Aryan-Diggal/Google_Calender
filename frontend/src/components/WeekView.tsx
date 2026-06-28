import React, { useState, useEffect, useRef } from 'react';
import { Box, Typography, Tooltip } from '@mui/material';
import { startOfWeek, addDays, format, isSameDay, isToday } from 'date-fns';
import { Event } from '../types/Event';
import { processOverlappingEvents, getTimezoneOffsetString } from '../utils/eventUtils';
import { motion } from 'framer-motion';

interface WeekViewProps {
  currentDate: Date;
  events: Event[];
  onEventClick: (event: Event, anchor: HTMLElement) => void;
  onCreateEvent: (startTime?: Date, anchor?: HTMLElement) => void;
  onEventDrop: (eventId: number, newStart: Date, newEnd: Date) => Promise<void>;
  onEventResize: (eventId: number, newStart: Date, newEnd: Date) => Promise<void>;
}

const HOUR_HEIGHT = 40;
const HOURS = Array.from({ length: 24 }, (_, i) => i);

const WeekView: React.FC<WeekViewProps> = ({
  currentDate,
  events,
  onEventClick,
  onCreateEvent,
  onEventDrop,
  onEventResize,
}) => {
  const weekStart = startOfWeek(currentDate);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

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
    setResizingEventId(event.id!);
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

  const scrollRef = useRef<HTMLDivElement>(null);

  // --- Dragging state ---
  const [draggingEventId, setDraggingEventId] = useState<number | null>(null);
  const [dragDeltaMins, setDragDeltaMins] = useState<number>(0);
  const dragDeltaMinsRef = useRef<number>(0);
  const [dragOverDay, setDragOverDay] = useState<Date | null>(null);
  const dragOverDayRef = useRef<Date | null>(null);

  const handleDragStart = (e: React.MouseEvent, event: Event, day: Date) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    setDraggingEventId(event.id!);
    setOriginalEvent(event);
    setDragDeltaMins(0);
    dragDeltaMinsRef.current = 0;
    initialYRef.current = e.clientY;
    setDragOverDay(day);
    dragOverDayRef.current = day;
  };

  useEffect(() => {
    if (!draggingEventId) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaY = e.clientY - initialYRef.current;
      let deltaMins = (deltaY / HOUR_HEIGHT) * 60;
      deltaMins = Math.round(deltaMins / 15) * 15;
      dragDeltaMinsRef.current = deltaMins;
      setDragDeltaMins(deltaMins);
    };

    const handleMouseUp = async () => {
      if (originalEvent && dragOverDayRef.current) {
        const start = new Date(originalEvent.startTime);
        const end = new Date(originalEvent.endTime);
        const diffMins = dragDeltaMinsRef.current;
        
        start.setMinutes(start.getMinutes() + diffMins);
        end.setMinutes(end.getMinutes() + diffMins);

        const origDay = new Date(originalEvent.startTime);
        origDay.setHours(0,0,0,0);
        const targetDay = new Date(dragOverDayRef.current);
        targetDay.setHours(0,0,0,0);
        const dayDiffMs = targetDay.getTime() - origDay.getTime();
        
        const finalStart = new Date(start.getTime() + dayDiffMs);
        const finalEnd = new Date(end.getTime() + dayDiffMs);

        await onEventDrop(originalEvent.id!, finalStart, finalEnd);
      }
      setDraggingEventId(null);
      setOriginalEvent(null);
      setDragDeltaMins(0);
      dragDeltaMinsRef.current = 0;
      setDragOverDay(null);
      dragOverDayRef.current = null;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingEventId, originalEvent, onEventDrop]);
  // ----------------------

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
    onCreateEvent(startTime, e.currentTarget as HTMLElement);
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Column headers */}
      <Box sx={{ display: 'flex', flexShrink: 0 }}>
        <Box sx={{ width: 60, flexShrink: 0, position: 'relative' }}>
          <Typography variant="caption" sx={{ position: 'absolute', bottom: 8, right: 8, color: '#70757a', fontSize: '0.6rem', lineHeight: 1, whiteSpace: 'nowrap' }}>
            {getTimezoneOffsetString()}
          </Typography>
        </Box>
        {days.map((day, i) => {
          const today = isToday(day);
          return (
            <Box key={i} sx={{ flex: 1, textAlign: 'center', py: 1, position: 'relative', borderBottom: '1px solid #e0e0e0' }}>
              <Box sx={{ position: 'absolute', left: 0, bottom: 0, width: '1px', height: 8, backgroundColor: '#e0e0e0' }} />
              <Typography variant="caption" sx={{ color: today ? '#1a73e8' : '#70757a', fontSize: '0.7rem', letterSpacing: '0.05em', fontWeight: 600 }}>
                {format(day, 'EEE').toUpperCase()}
              </Typography>
              <Box
                sx={{
                  width: 46,
                  height: 46,
                  margin: '4px auto 0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '50%',
                  backgroundColor: today ? '#1a73e8' : 'transparent',
                  color: today ? 'white' : '#202124',
                  fontSize: '1.625rem',
                  fontWeight: today ? 500 : 400,
                }}
              >
                {format(day, 'd')}
              </Box>
            </Box>
          );
        })}
        <Box sx={{ width: 8, flexShrink: 0 }} />
      </Box>

      {/* All-day row - Only show if there are all-day events in the week */}
      {days.some(day => getAllDayEventsForDay(day).length > 0) && (
        <Box sx={{ display: 'flex', flexShrink: 0, minHeight: 24 }}>
          <Box sx={{ width: 60, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 1 }}>
            
          </Box>
          {days.map((day, i) => {
            const allDayEvents = getAllDayEventsForDay(day);
            return (
              <Box key={i} sx={{ flex: 1, minWidth: 0, borderLeft: '1px solid #e0e0e0', borderBottom: '1px solid #e0e0e0', p: 0.25 }}>
                {allDayEvents.map((event) => (
                  <Box
                    key={event.id}
                    onClick={(e) => { e.stopPropagation(); onEventClick(event, e.currentTarget); }}
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
                backgroundColor: dragOverDay && isSameDay(day, dragOverDay) ? '#e8f0fe' : 'transparent',
                '&:hover': { backgroundColor: 'rgba(26,115,232,0.01)' },
              }}
              onClick={(e) => handleColumnClick(e, day)}
              onMouseEnter={() => {
                if (draggingEventId) {
                  setDragOverDay(day);
                  dragOverDayRef.current = day;
                }
              }}
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
                
                const isDragging = draggingEventId === pe.id;
                if (isDragging) {
                  const deltaPx = (dragDeltaMins / 60) * HOUR_HEIGHT;
                  renderTop += deltaPx;
                  renderStart.setMinutes(renderStart.getMinutes() + dragDeltaMins);
                  renderEnd.setMinutes(renderEnd.getMinutes() + dragDeltaMins);
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
                      title={`${pe.title} • ${format(renderStart, 'h:mm a')} - ${format(renderEnd, 'h:mm a')}`}
                      placement="top"
                      arrow
                    >
                      <Box
                        onMouseDown={(e) => handleDragStart(e, pe, day)}
                        onClick={(e) => { e.stopPropagation(); onEventClick(pe, e.currentTarget); }}
                        sx={{
                          height: '100%',
                          backgroundColor: pe.color || '#1a73e8',
                          borderRadius: '6px',
                          px: 0.75,
                          py: 0.5,
                          overflow: 'hidden',
                          cursor: (isDragging || isResizing) ? 'grabbing' : 'pointer',
                          boxShadow: (isDragging || isResizing) ? '0 4px 6px rgba(0,0,0,0.25)' : '0 1px 3px rgba(0,0,0,0.2)',
                          borderLeft: `3px solid ${pe.color ? pe.color + 'cc' : '#1558b0'}`,
                          '&:hover': { filter: 'brightness(0.92)', boxShadow: '0 2px 6px rgba(0,0,0,0.3)' },
                          transition: (isResizing || isDragging) ? 'none' : 'filter 0.15s, box-shadow 0.15s',
                          opacity: (isDragging && dragOverDay && !isSameDay(day, dragOverDay)) ? 0.5 : 1,
                        }}
                      >
                        <Typography sx={{ color: 'white', fontSize: '0.75rem', fontWeight: 600, lineHeight: 1.2, pointerEvents: 'none' }} noWrap>
                          {pe.title}
                        </Typography>
                        {renderHeight > 36 && (
                          <Typography sx={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.65rem', lineHeight: 1.2, pointerEvents: 'none' }}>
                            {format(renderStart, 'h:mm a')} – {format(renderEnd, 'h:mm a')}
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
          );
        })}
      </Box>
    </Box>
  );
};

export default WeekView;
