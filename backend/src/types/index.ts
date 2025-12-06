export interface CustomVariable {
  id: string;
  name: string;
  prompt: string;
}

export interface Lead {
  first_name: string;
  last_name: string;
  email: string;
  company: string;
  company_url?: string;
  linkedin_url?: string;
  job_title?: string;
  company_industry?: string;
  headline?: string;
  company_headcount?: string;
  keywords?: string;
  company_annual_revenue?: string;
  company_seo_description?: string;
  company_short_description?: string;
  company_linkedin_url?: string;
  company_total_funding?: string;
  company_technologies?: string;
  email_domain_catchall?: string;
  twitter_url?: string;
  facebook_url?: string;
  person_id?: string;
  company_id?: string;
  company_phone_number?: string;
  company_twitter?: string;
  company_facebook?: string;
  company_market_cap?: string;
  company_founded_year?: string;
  company_domain?: string;
  company_raw_address?: string;
  company_street_address?: string;
  company_city?: string;
  company_state?: string;
  company_country?: string;
  company_postal_code?: string;
  // Legacy fields for backwards compatibility
  location?: string;
  phone_number?: string;
  linkedin_post?: string;
  creator_name?: string;
}

export interface EnrichedLead extends Lead {
  personalized_message: string;
  enrichment_status: 'enriched' | 'failed' | 'pending';
  perplexity_research?: string;
  custom_variables?: { [key: string]: string };
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
  customVariables?: CustomVariable[];
  revenueFilterEnabled?: boolean;
  revenueMin?: number;
  revenueMax?: number;
  skipDuplicates?: boolean;
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
  custom_variables?: { [key: string]: string };
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
