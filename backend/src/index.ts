import express from 'express';
import { env } from './config/env.js';
import { corsMiddleware } from './middleware/cors.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import campaignRoutes from './routes/campaign.js';
import healthRoutes from './routes/health.js';

const app = express();

// Middleware
app.use(corsMiddleware);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/health', healthRoutes);
app.use('/api/campaigns', campaignRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'AGA Backend API',
    version: '1.0.0',
    description: 'AI Growth Accelerator - Custom Backend (n8n replacement)',
    endpoints: {
      health: '/api/health',
      campaigns: {
        process: 'POST /api/campaigns/process',
        status: 'GET /api/campaigns/status/:runId',
        results: 'GET /api/campaigns/results/:campaignLeadsId',
        export: 'GET /api/campaigns/export/:campaignLeadsId',
        test: 'POST /api/campaigns/test'
      }
    }
  });
});

// Error handlers
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
const PORT = env.PORT;

app.listen(PORT, () => {
  console.log('\n🚀 AGA Backend Server Started');
  console.log(`📡 Server running on http://localhost:${PORT}`);
  console.log(`🌍 Environment: ${env.NODE_ENV}`);
  console.log(`\n📚 API Documentation:`);
  console.log(`   Health Check: http://localhost:${PORT}/api/health`);
  console.log(`   Process Campaign: POST http://localhost:${PORT}/api/campaigns/process`);
  console.log(`   Campaign Status: GET http://localhost:${PORT}/api/campaigns/status/:runId`);
  console.log(`   Campaign Results: GET http://localhost:${PORT}/api/campaigns/results/:campaignLeadsId`);
  console.log(`   Export CSV: GET http://localhost:${PORT}/api/campaigns/export/:campaignLeadsId`);
  console.log(`   Test Config: POST http://localhost:${PORT}/api/campaigns/test\n`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n🛑 SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n🛑 SIGINT received, shutting down gracefully...');
  process.exit(0);
});

export default app;
