import { Event } from '../types/Event';

export interface EventPosition {
  top: number;
  height: number;
  left: number;
  width: number;
  zIndex: number;
}

export interface ProcessedEvent extends Event {
  position: EventPosition;
  overlapGroup: number;
}

export const getEventPosition = (event: Event, hourHeight: number = 60): EventPosition => {
  const startTime = new Date(event.startTime);
  const endTime = new Date(event.endTime);
  const startHour = startTime.getHours();
  const startMinute = startTime.getMinutes();
  const endHour = endTime.getHours();
  const endMinute = endTime.getMinutes();
  
  const top = (startHour * hourHeight) + (startMinute * hourHeight / 60);
  const height = ((endHour * hourHeight) + (endMinute * hourHeight / 60)) - top;
  
  return {
    top: Math.max(top, 0),
    height: Math.max(height, 20),
    left: 0,
    width: 100,
    zIndex: 1,
  };
};

export const processOverlappingEvents = (events: Event[], hourHeight: number = 60): ProcessedEvent[] => {
  if (events.length === 0) return [];

  // Sort events by start time
  const sortedEvents = [...events].sort((a, b) => 
    new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );

  const processedEvents: ProcessedEvent[] = [];
  const overlapGroups: Event[][] = [];
  let currentGroup: Event[] = [];

  // Group overlapping events
  for (let i = 0; i < sortedEvents.length; i++) {
    const currentEvent = sortedEvents[i];
    const currentStart = new Date(currentEvent.startTime);
    const currentEnd = new Date(currentEvent.endTime);

    if (currentGroup.length === 0) {
      currentGroup.push(currentEvent);
    } else {
      const lastEvent = currentGroup[currentGroup.length - 1];
      const lastEnd = new Date(lastEvent.endTime);

      // Check if current event overlaps with the last event in current group
      if (currentStart < lastEnd) {
        currentGroup.push(currentEvent);
      } else {
        // No overlap, start a new group
        overlapGroups.push([...currentGroup]);
        currentGroup = [currentEvent];
      }
    }
  }

  // Add the last group
  if (currentGroup.length > 0) {
    overlapGroups.push(currentGroup);
  }

  // Process each group
  overlapGroups.forEach((group, groupIndex) => {
    group.forEach((event, eventIndex) => {
      const position = getEventPosition(event, hourHeight);
      const groupSize = group.length;
      
      // Calculate width and left position for overlapping events
      if (groupSize > 1) {
        position.width = 100 / groupSize;
        position.left = (100 / groupSize) * eventIndex;
      }

      processedEvents.push({
        ...event,
        position,
        overlapGroup: groupIndex,
      });
    });
  });

  return processedEvents;
};

export const formatEventTime = (event: Event): string => {
  const startTime = new Date(event.startTime);
  const endTime = new Date(event.endTime);
  
  if (event.allDay) {
    return 'All day';
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  return `${formatTime(startTime)} - ${formatTime(endTime)}`;
};

export const getEventDuration = (event: Event): string => {
  const startTime = new Date(event.startTime);
  const endTime = new Date(event.endTime);
  const durationMs = endTime.getTime() - startTime.getTime();
  const durationMinutes = Math.round(durationMs / (1000 * 60));
  
  if (durationMinutes < 60) {
    return `${durationMinutes}m`;
  }
  
  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;
  
  if (minutes === 0) {
    return `${hours}h`;
  }
  
  return `${hours}h ${minutes}m`;
};
