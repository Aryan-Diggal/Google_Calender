import { Router } from 'express';
import {
  getAllEvents,
  getEventById,
  getEventsByRange,
  getOverlappingEvents,
  createEvent,
  updateEvent,
  deleteEvent,
} from '../controllers/eventController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Apply auth to all event routes
router.use(authenticateToken);

// Specific routes first to avoid /:id conflicts
router.get('/range', getEventsByRange);
router.get('/overlapping', getOverlappingEvents);

// CRUD routes
router.get('/', getAllEvents);
router.get('/:id', getEventById);
router.post('/', createEvent);
router.put('/:id', updateEvent);
router.delete('/:id', deleteEvent);

export default router;
