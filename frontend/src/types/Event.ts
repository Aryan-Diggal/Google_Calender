export interface Event {
  id?: number | string;
  originalId?: number;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  location?: string;
  color?: string;
  allDay?: boolean;
  recurrence?: string;
  parentEventId?: number;
  originalStartTime?: string;
  updateScope?: 'this' | 'following' | 'all';
  userId?: number;
}

export interface EventFormData {
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  location: string;
  color: string;
  allDay: boolean;
  recurrence: string;
  parentEventId?: number;
  originalStartTime?: string;
  updateScope?: 'this' | 'following' | 'all';
}

export type CalendarView = 'month' | 'week' | 'day';

export interface User {
  id: number;
  name: string;
  email: string;
}
