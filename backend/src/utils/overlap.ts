import { Event } from '@prisma/client';

export const checkOverlap = (events: Event[]): boolean => {
  return events.length > 0;
};

export const formatOverlapMessage = (events: Event[]): string => {
  if (events.length === 1) {
    return `This event overlaps with "${events[0].title}". Are you sure you want to save it?`;
  }
  return `This event overlaps with ${events.length} existing events. Are you sure you want to save it?`;
};
