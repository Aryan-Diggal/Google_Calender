import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { RRule, rrulestr } from 'rrule';

const prisma = new PrismaClient();

const eventSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().nullable().optional(),
  startTime: z.string(),
  endTime: z.string(),
  location: z.string().nullable().optional(),
  color: z.string().nullable().optional().default('#1a73e8'),
  allDay: z.boolean().nullable().optional().default(false),
  recurrence: z.string().nullable().optional().default('none'),
  parentEventId: z.number().nullable().optional(),
  originalStartTime: z.string().nullable().optional(),
  updateScope: z.enum(['this', 'following', 'all']).nullable().optional(),
});

export const getAllEvents = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const events = await prisma.event.findMany({
      where: { userId },
      orderBy: { startTime: 'asc' },
    });
    res.json(events);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch events.' });
  }
};

export const getEventById = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const id = parseInt(String(req.params.id));
    const event = await prisma.event.findFirst({ where: { id, userId } });
    if (!event) {
      res.status(404).json({ error: 'Event not found.' });
      return;
    }
    res.json(event);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch event.' });
  }
};

export const getEventsByRange = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      res.status(400).json({ error: 'startDate and endDate are required.' });
      return;
    }
    const events = await prisma.event.findMany({
      where: {
        userId,
        startTime: { gte: new Date(startDate as string) },
        endTime: { lte: new Date(endDate as string) },
      },
      orderBy: { startTime: 'asc' },
    });
    res.json(events);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch events by range.' });
  }
};

const expandEvents = (allEvents: any[], start: Date, end: Date) => {
  const expandedEvents: any[] = [];
  const exceptionsMap = new Map<string, any>(); // key: parentId_originalStartTime

  // First, map exceptions
  allEvents.forEach((ev) => {
    if (ev.parentEventId && ev.originalStartTime) {
      const key = `${ev.parentEventId}_${new Date(ev.originalStartTime).getTime()}`;
      exceptionsMap.set(key, ev);
    }
  });

  allEvents.forEach((ev) => {
    if (ev.parentEventId) return; // Skip exceptions here, handled below

    if (ev.recurrence === 'none') {
      if (ev.endTime > start && ev.startTime < end) {
        expandedEvents.push(ev);
      }
    } else {
      try {
        let recStr = ev.recurrence;
        if (recStr === 'daily') recStr = 'FREQ=DAILY';
        else if (recStr === 'weekly') recStr = 'FREQ=WEEKLY';
        else if (recStr === 'monthly') recStr = 'FREQ=MONTHLY';

        // Split recurrence string into RRULE line and any extra lines (EXDATE, etc.)
        const lines = recStr.split('\n');
        const rrulePart = lines[0]; // e.g. "FREQ=WEEKLY;UNTIL=..."
        const extraLines = lines.slice(1).join('\n'); // e.g. "EXDATE:20260617T070000Z"
        
        const dtstart = `DTSTART:${new Date(ev.startTime).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'}`;
        let icalStr = `${dtstart}\nRRULE:${rrulePart}`;
        if (extraLines) icalStr += `\n${extraLines}`;

        const rule = rrulestr(icalStr);
        const occurrences = rule.between(start, end, true);
        
        occurrences.forEach((occurrence) => {
          const key = `${ev.id}_${occurrence.getTime()}`;
          if (exceptionsMap.has(key)) {
            const exception = exceptionsMap.get(key);
            if (exception.endTime > start && exception.startTime < end) {
              expandedEvents.push(exception);
            }
          } else {
            const duration = new Date(ev.endTime).getTime() - new Date(ev.startTime).getTime();
            const occEnd = new Date(occurrence.getTime() + duration);
            
            if (occEnd > start && occurrence < end) {
              expandedEvents.push({
                ...ev,
                id: `${ev.id}_${occurrence.getTime()}`,
                originalId: ev.id,
                startTime: occurrence,
                endTime: occEnd,
              });
            }
          }
        });
      } catch (err) {
        console.error("Error expanding event", ev.id, err);
      }
    }
  });

  return expandedEvents;
};

export const getExpandedEvents = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      res.status(400).json({ error: 'startDate and endDate are required.' });
      return;
    }

    const start = new Date(startDate as string);
    const end = new Date(endDate as string);

    // Fetch all events for user that could possibly overlap or are recurring
    const allEvents = await prisma.event.findMany({
      where: { userId },
    });

    const expandedEvents = expandEvents(allEvents, start, end);
    res.json(expandedEvents.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch expanded events.' });
  }
};

export const getOverlappingEvents = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { startTime, endTime, excludeId } = req.query;
    if (!startTime || !endTime) {
      res.status(400).json({ error: 'startTime and endTime are required.' });
      return;
    }
    const start = new Date(startTime as string);
    const end = new Date(endTime as string);

    const allEvents = await prisma.event.findMany({
      where: { userId },
    });

    let expanded = expandEvents(allEvents, start, end);

    if (excludeId) {
      const parsedExclude = parseInt(excludeId as string);
      expanded = expanded.filter(e => e.id !== parsedExclude && e.originalId !== parsedExclude);
    }
    
    res.json(expanded);
  } catch (error) {
    res.status(500).json({ error: 'Failed to check overlapping events.' });
  }
};

export const createEvent = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const parsed = eventSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Validation failed', details: parsed.error.errors });
      return;
    }
    const data = parsed.data;
    const startTime = new Date(data.startTime);
    const endTime = new Date(data.endTime);
    if (endTime <= startTime) {
      res.status(400).json({ error: 'End time must be after start time.' });
      return;
    }
    const event = await prisma.event.create({
      data: {
        title: data.title,
        description: data.description,
        startTime,
        endTime,
        location: data.location,
        color: data.color ?? '#1a73e8',
        allDay: data.allDay ?? false,
        recurrence: data.recurrence ?? 'none',
        parentEventId: data.parentEventId,
        originalStartTime: data.originalStartTime ? new Date(data.originalStartTime) : null,
        userId,
      },
    });
    res.status(201).json(event);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create event.' });
  }
};

export const updateEvent = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const id = parseInt(String(req.params.id));
    const existing = await prisma.event.findFirst({ where: { id, userId } });
    if (!existing) {
      res.status(404).json({ error: 'Event not found.' });
      return;
    }
    const parsed = eventSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Validation failed', details: parsed.error.errors });
      return;
    }
    const data = parsed.data;
    const startTime = new Date(data.startTime);
    const endTime = new Date(data.endTime);
    if (endTime <= startTime) {
      res.status(400).json({ error: 'End time must be after start time.' });
      return;
    }
    if (data.updateScope === 'this') {
      const exception = await prisma.event.create({
        data: {
          title: data.title,
          description: data.description,
          startTime,
          endTime,
          location: data.location,
          color: data.color ?? existing.color,
          allDay: data.allDay ?? existing.allDay,
          recurrence: 'none',
          parentEventId: existing.parentEventId || id,
          originalStartTime: data.originalStartTime ? new Date(data.originalStartTime) : null,
          userId,
        }
      });
      res.json(exception);
      return;
    }

    if (data.updateScope === 'following') {
      // Simplistic approach: just update the original to end before this occurrence
      // Then create a new event for the rest
      if (existing.recurrence !== 'none' && data.originalStartTime) {
        const untilDate = new Date(data.originalStartTime);
        const untilStr = untilDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        let newRecurrence = existing.recurrence;
        if (!newRecurrence.includes('UNTIL=')) {
          newRecurrence += `;UNTIL=${untilStr}`;
        }
        await prisma.event.update({ where: { id }, data: { recurrence: newRecurrence } });
      }
      
      const newMaster = await prisma.event.create({
        data: {
          title: data.title,
          description: data.description,
          startTime,
          endTime,
          location: data.location,
          color: data.color ?? existing.color,
          allDay: data.allDay ?? existing.allDay,
          recurrence: data.recurrence ?? existing.recurrence,
          userId,
        }
      });
      res.json(newMaster);
      return;
    }

    const updated = await prisma.event.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        startTime,
        endTime,
        location: data.location,
        color: data.color ?? existing.color,
        allDay: data.allDay ?? existing.allDay,
        recurrence: data.recurrence ?? existing.recurrence,
      },
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update event.' });
  }
};

export const deleteEvent = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const id = parseInt(String(req.params.id));
    const scope = req.query.scope as string;
    const originalStartTime = req.query.originalStartTime as string;
    
    const existing = await prisma.event.findFirst({ where: { id, userId } });
    if (!existing) {
      res.status(404).json({ error: 'Event not found.' });
      return;
    }

    if (scope === 'following' && originalStartTime) {
      const untilDate = new Date(new Date(originalStartTime).getTime() - 1);
      const untilStr = untilDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      let newRecurrence = existing.recurrence;

      // Normalize simple shorthand to RRULE format
      if (newRecurrence === 'daily') newRecurrence = 'FREQ=DAILY';
      else if (newRecurrence === 'weekly') newRecurrence = 'FREQ=WEEKLY';
      else if (newRecurrence === 'monthly') newRecurrence = 'FREQ=MONTHLY';

      // Strip any existing UNTIL and add the new one
      newRecurrence = newRecurrence.replace(/;UNTIL=[^;\n]*/g, '');
      newRecurrence += `;UNTIL=${untilStr}`;

      await prisma.event.update({ where: { id }, data: { recurrence: newRecurrence } });
      res.status(204).send();
      return;
    }

    if (scope === 'this' && originalStartTime) {
      const exDate = new Date(originalStartTime);
      const exDateStr = exDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      let newRecurrence = existing.recurrence;

      // Normalize simple shorthand to RRULE format so EXDATE can sit on its own line
      if (newRecurrence === 'daily') newRecurrence = 'FREQ=DAILY';
      else if (newRecurrence === 'weekly') newRecurrence = 'FREQ=WEEKLY';
      else if (newRecurrence === 'monthly') newRecurrence = 'FREQ=MONTHLY';

      newRecurrence = newRecurrence.includes('\nEXDATE:') 
        ? `${newRecurrence},${exDateStr}` 
        : `${newRecurrence}\nEXDATE:${exDateStr}`;
      await prisma.event.update({ where: { id }, data: { recurrence: newRecurrence } });
      res.status(204).send();
      return;
    }

    await prisma.event.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete event.' });
  }
};
