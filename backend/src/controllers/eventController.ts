import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

const eventSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  startTime: z.string(),
  endTime: z.string(),
  location: z.string().optional(),
  color: z.string().optional().default('#1a73e8'),
  allDay: z.boolean().optional().default(false),
  recurrence: z.enum(['none', 'daily', 'weekly', 'monthly']).optional().default('none'),
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

export const getOverlappingEvents = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { startTime, endTime, excludeId } = req.query;
    if (!startTime || !endTime) {
      res.status(400).json({ error: 'startTime and endTime are required.' });
      return;
    }
    const whereClause: Record<string, unknown> = {
      userId,
      startTime: { lt: new Date(endTime as string) },
      endTime: { gt: new Date(startTime as string) },
    };
    if (excludeId) {
      whereClause.id = { not: parseInt(excludeId as string) };
    }
    const overlapping = await prisma.event.findMany({ where: whereClause });
    res.json(overlapping);
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
    const existing = await prisma.event.findFirst({ where: { id, userId } });
    if (!existing) {
      res.status(404).json({ error: 'Event not found.' });
      return;
    }
    await prisma.event.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete event.' });
  }
};
