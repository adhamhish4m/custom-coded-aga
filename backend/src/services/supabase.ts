import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from '../config/env.js';
import type {
  CampaignLead,
  Campaign,
  ClientMetrics,
  AGARunProgress,
  EnrichedLead
} from '../types/index.js';

class SupabaseService {
  private client: SupabaseClient;

  constructor() {
    this.client = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  }

  // Campaign Leads Operations
  async getCampaignLead(campaignLeadsId: string): Promise<CampaignLead | null> {
    const { data, error } = await this.client
      .from('campaign_leads')
      .select('*')
      .eq('id', campaignLeadsId)
      .single();

    if (error) {
      console.error('Error fetching campaign lead:', error);
      return null;
    }

    return data as CampaignLead;
  }

  async updateCampaignLeads(
    campaignLeadsId: string,
    leads: EnrichedLead[]
  ): Promise<boolean> {
    const { error } = await this.client
      .from('campaign_leads')
      .update({
        lead_data: leads,
        updated_at: new Date().toISOString()
      })
      .eq('id', campaignLeadsId);

    if (error) {
      console.error('Error updating campaign leads:', error);
      return false;
    }

    return true;
  }

  async appendLeadToCampaign(
    campaignLeadsId: string,
    newLead: EnrichedLead
  ): Promise<boolean> {
    // Get existing leads
    const campaignLead = await this.getCampaignLead(campaignLeadsId);
    if (!campaignLead) return false;

    const existingLeads = campaignLead.lead_data || [];

    // Deduplicate by email
    const filteredExisting = existingLeads.filter(
      lead => lead.email.toLowerCase() !== newLead.email.toLowerCase()
    );

    // Only add if personalized_message is not empty
    if (!newLead.personalized_message || newLead.personalized_message.trim() === '') {
      console.warn(`Skipping lead ${newLead.email} - empty personalized message`);
      return false;
    }

    const updatedLeads = [...filteredExisting, newLead];
    return this.updateCampaignLeads(campaignLeadsId, updatedLeads);
  }

  async checkLeadExists(campaignLeadsId: string, email: string): Promise<boolean> {
    const campaignLead = await this.getCampaignLead(campaignLeadsId);
    if (!campaignLead) return false;

    const leads = campaignLead.lead_data || [];
    return leads.some(lead => lead.email.toLowerCase() === email.toLowerCase());
  }

  // Campaign Operations
  async getCampaign(campaignId: string): Promise<Campaign | null> {
    const { data, error } = await this.client
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();

    if (error) {
      console.error('Error fetching campaign:', error);
      return null;
    }

    return data as Campaign;
  }

  async updateCampaignCompletedCount(
    campaignId: string,
    count: number
  ): Promise<boolean> {
    const { error } = await this.client
      .from('campaigns')
      .update({
        completed_count: count,
        updated_at: new Date().toISOString()
      })
      .eq('id', campaignId);

    if (error) {
      console.error('Error updating campaign completed count:', error);
      return false;
    }

    return true;
  }

  // Client Metrics Operations
  async getClientMetrics(userId: string): Promise<ClientMetrics | null> {
    const { data, error } = await this.client
      .from('user_metrics')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Error fetching client metrics:', error);
      return null;
    }

    return data as ClientMetrics;
  }

  async updateClientMetrics(
    userId: string,
    numLeads: number
  ): Promise<boolean> {
    const metrics = await this.getClientMetrics(userId);

    if (!metrics) {
      console.error('Client metrics not found for user:', userId);
      return false;
    }

    const hoursPerLead = 0.02; // 1.2 minutes per lead
    const costPerLead = 0.04; // $0.04 per lead

    const { error } = await this.client
      .from('user_metrics')
      .update({
        total_leads_enriched: metrics.total_leads_enriched + numLeads,
        hours_saved: metrics.hours_saved + (hoursPerLead * numLeads),
        money_saved: metrics.money_saved + Math.ceil(costPerLead * numLeads)
      })
      .eq('user_id', userId);

    if (error) {
      console.error('Error updating client metrics:', error);
      return false;
    }

    return true;
  }

  // AGA Run Progress Operations
  async updateRunStatus(
    runId: string,
    campaignId: string,
    userId: string,
    status: AGARunProgress['status'],
    errorMessage?: string,
    counts?: {
      lead_count?: number;
      processed_count?: number;
      success_count?: number;
      error_count?: number;
    }
  ): Promise<boolean> {
    const updateData: Partial<AGARunProgress> = {
      status,
      updated_at: new Date().toISOString()
    };

    if (errorMessage) {
      updateData.error_message = errorMessage;
    }

    if (counts) {
      if (counts.lead_count !== undefined) updateData.lead_count = counts.lead_count;
      if (counts.processed_count !== undefined) updateData.processed_count = counts.processed_count;
      if (counts.success_count !== undefined) updateData.success_count = counts.success_count;
      if (counts.error_count !== undefined) updateData.error_count = counts.error_count;
    }

    const { error } = await this.client
      .from('campaign_runs')
      .upsert({
        id: runId,
        campaign_id: campaignId,
        user_id: userId,
        ...updateData
      });

    if (error) {
      console.error('Error updating run status:', error);
      return false;
    }

    return true;
  }

  async getRunProgress(runId: string): Promise<AGARunProgress | null> {
    const { data, error } = await this.client
      .from('campaign_runs')
      .select('*')
      .eq('id', runId)
      .single();

    if (error) {
      console.error('Error fetching run progress:', error);
      return null;
    }

    return data as AGARunProgress;
  }

  /**
   * Get all existing email addresses from user's previous campaigns
   * Returns a Set of lowercase, trimmed email addresses
   */
  async getExistingEmailsForUser(userId: string, currentCampaignLeadsId: string): Promise<Set<string>> {
    try {
      // Fetch all campaign_leads for this user by joining with campaigns table
      const { data, error } = await this.client
        .from('campaign_leads')
        .select('lead_data, campaigns!inner(user_id)')
        .eq('campaigns.user_id', userId)
        .neq('id', currentCampaignLeadsId);

      if (error) {
        console.error('Error fetching existing campaigns:', error);
        return new Set();
      }

      // Extract all email addresses from lead_data arrays
      const existingEmails = new Set<string>();

      if (data && Array.isArray(data)) {
        for (const row of data) {
          if (row.lead_data && Array.isArray(row.lead_data)) {
            for (const lead of row.lead_data) {
              if (lead.email) {
                // Normalize email: lowercase and trim
                existingEmails.add(lead.email.toLowerCase().trim());
              }
            }
          }
        }
      }

      return existingEmails;
    } catch (error) {
      console.error('Error in getExistingEmailsForUser:', error);
      return new Set();
    }
  }
}

export const supabaseService = new SupabaseService();
