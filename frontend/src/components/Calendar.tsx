import React, { useMemo } from 'react';
import {
  Box,
  CircularProgress,
} from '@mui/material';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
} from 'date-fns';
import { Event, CalendarView } from '../types/Event';
import MonthView from './MonthView';
import WeekView from './WeekView';
import DayView from './DayView';

interface CalendarProps {
  events: Event[];
  currentView: CalendarView;
  selectedDate: Date;
  onViewChange: (view: CalendarView) => void;
  onDateChange: (date: Date) => void;
  onEventClick: (event: Event, anchor?: HTMLElement) => void;
  onCreateEvent: (startTime?: Date, anchor?: HTMLElement) => void;
  onEventDrop: (eventId: number, newStart: Date, newEnd: Date) => Promise<void>;
  onEventResize: (eventId: number, newStart: Date, newEnd: Date) => Promise<void>;
  loading: boolean;
}

const Calendar: React.FC<CalendarProps> = ({
  events,
  currentView,
  selectedDate,
  onViewChange,
  onDateChange,
  onEventClick,
  onCreateEvent,
  onEventDrop,
  onEventResize,
  loading,
}) => {
  const filteredEvents = useMemo(() => {
    let start: Date, end: Date;
    if (currentView === 'month') {
      start = startOfWeek(startOfMonth(selectedDate));
      end = endOfWeek(endOfMonth(selectedDate));
    } else if (currentView === 'week') {
      start = startOfWeek(selectedDate);
      end = endOfWeek(selectedDate);
    } else {
      start = new Date(selectedDate);
      start.setHours(0, 0, 0, 0);
      end = new Date(selectedDate);
      end.setHours(23, 59, 59, 999);
    }
    return events.filter((event) => {
      const eventStart = new Date(event.startTime);
      const eventEnd = new Date(event.endTime);
      return eventEnd >= start && eventStart <= end;
    });
  }, [events, selectedDate, currentView]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100%">
        <CircularProgress sx={{ color: '#1a73e8' }} />
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: '#fff' }}>
      {/* View Content */}
      <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
        {currentView === 'month' && (
          <MonthView
            currentDate={selectedDate}
            events={filteredEvents}
            onEventClick={onEventClick}
            onCreateEvent={onCreateEvent}
            onEventDrop={onEventDrop}
            onEventResize={onEventResize}
          />
        )}
        {currentView === 'week' && (
          <WeekView
            currentDate={selectedDate}
            events={filteredEvents}
            onEventClick={onEventClick}
            onCreateEvent={onCreateEvent}
            onEventDrop={onEventDrop}
            onEventResize={onEventResize}
          />
        )}
        {currentView === 'day' && (
          <DayView
            currentDate={selectedDate}
            events={filteredEvents}
            onEventClick={onEventClick}
            onCreateEvent={onCreateEvent}
            onEventDrop={onEventDrop}
            onEventResize={onEventResize}
          />
        )}
      </Box>
    </Box>
  );
};



export default Calendar;
