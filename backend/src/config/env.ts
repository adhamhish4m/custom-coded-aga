import { config } from 'dotenv';
import { z } from 'zod';

config();

const envSchema = z.object({
  PORT: z.string().default('3001'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Supabase
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string(),
  SUPABASE_SERVICE_ROLE_KEY: z.string(),

  // AI Services
  PERPLEXITY_API_KEY: z.string().default('placeholder_add_when_available'),
  OPENROUTER_API_KEY: z.string(),

  // Notifications
  SLACK_WEBHOOK_URL: z.string().optional(),

  // Instantly.ai Integration
  INSTANTLY_API_KEY: z.string().optional(),

  // Frontend URL for CORS (production only)
  FRONTEND_URL: z.string().optional(),

  // Configuration
  MAX_BATCH_SIZE: z.string().default('50'),
  RETRY_ATTEMPTS: z.string().default('3'),
  RETRY_DELAY_MS: z.string().default('2000'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
  throw new Error('Invalid environment variables');
}

export const env = {
  ...parsed.data,
  PORT: parseInt(parsed.data.PORT, 10),
  MAX_BATCH_SIZE: parseInt(parsed.data.MAX_BATCH_SIZE, 10),
  RETRY_ATTEMPTS: parseInt(parsed.data.RETRY_ATTEMPTS, 10),
  RETRY_DELAY_MS: parseInt(parsed.data.RETRY_DELAY_MS, 10),
};
