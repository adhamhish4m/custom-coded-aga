export interface Lead {
  first_name: string;
  last_name: string;
  email: string;
  job_title?: string;
  linkedin_url?: string;
  company_linkedin_url?: string;
  company: string;
  company_url?: string;
  location?: string;
  company_headcount?: string;
  company_industry?: string;
  phone_number?: string;
  linkedin_post?: string;
  creator_name?: string;
}

export interface EnrichedLead extends Lead {
  personalized_message: string;
  enrichment_status: 'enriched' | 'failed' | 'pending';
  perplexity_research?: string;
}

export interface CampaignInput {
  leadSource: 'apollo' | 'csv';
  run_id: string;
  campaignName: string;
  campaign_id: string;
  campaign_leads_id: string;
  user_id: string;
  rerun: boolean;
  perplexityPrompt: string;
  personalizationPrompt: string;
  promptTask: string;
  promptGuidelines: string;
  promptExample: string;
  personalizationStrategy: string;
  csv_file?: Express.Multer.File;
  apolloUrl?: string;
  leadCount?: number;
  demo?: string;
  notifyOnComplete?: boolean;
}

export interface PerplexityRequest {
  systemPrompt: string;
  userPrompt: string;
  lead: Lead;
}

export interface PerplexityResponse {
  research: string;
  citations?: string[];
}

export interface PersonalizationRequest {
  systemPrompt: string;
  userPrompt: string;
  lead: Lead;
  research: string;
  task: string;
  guidelines: string;
  example: string;
}

export interface PersonalizationResponse {
  personalized_sentence: string;
}

export interface CampaignLead {
  id: string;
  campaign_id: string;
  lead_data: EnrichedLead[];
  csv_cache?: any;
  status?: string;
  processed_count?: number;
  total_count?: number;
  created_at: string;
  updated_at: string;
}

export interface Campaign {
  id: string;
  name: string;
  user_id: string;
  completed_count: number;
  created_at: string;
  updated_at: string;
}

export interface UserMetrics {
  id: string;
  user_id: string;
  total_campaigns: number;
  total_leads_processed: number;
  total_leads_enriched: number;
  hours_saved: number;
  money_saved: number;
  created_at: string;
  updated_at: string;
}

export interface CampaignRun {
  id: string;
  campaign_id: string;
  user_id: string;
  status: 'pending' | 'in_queue' | 'extracting' | 'personalizing' | 'processing' | 'completed' | 'failed' | 'cancelled';
  source: string | null;
  lead_count: number | null;
  processed_count: number;
  success_count: number;
  error_count: number;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

// Legacy alias for backwards compatibility
export type AGARunProgress = CampaignRun;
export type ClientMetrics = UserMetrics;

export interface BatchProcessingOptions {
  batchSize: number;
  delayBetweenBatches?: number;
}
