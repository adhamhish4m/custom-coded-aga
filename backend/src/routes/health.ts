import { Router, Request, Response } from 'express';
import { supabaseService } from '../services/supabase.js';

const router = Router();

/**
 * GET /api/health
 * Health check endpoint
 */
router.get('/', async (req: Request, res: Response) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    services: {
      api: 'operational',
      database: 'checking...',
      ai: 'operational'
    }
  };

  try {
    // Test database connection
    const testQuery = await supabaseService.getCampaign('00000000-0000-0000-0000-000000000000');
    health.services.database = 'operational';
  } catch (error) {
    health.services.database = 'degraded';
    health.status = 'degraded';
  }

  const statusCode = health.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(health);
});

export default router;
