export interface Event {
  id?: number;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  location?: string;
  color?: string;
  allDay?: boolean;
  recurrence?: 'none' | 'daily' | 'weekly' | 'monthly';
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
  recurrence: 'none' | 'daily' | 'weekly' | 'monthly';
}

export type CalendarView = 'month' | 'week' | 'day';

export interface User {
  id: number;
  name: string;
  email: string;
}
