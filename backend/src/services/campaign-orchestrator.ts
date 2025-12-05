import { csvProcessorService } from './csv-processor.js';
import { personalizationService } from './personalization.js';
import { supabaseService } from './supabase.js';
import { slackService } from './slack.js';
import { env } from '../config/env.js';
import type { CampaignInput, Lead } from '../types/index.js';

/**
 * Main Campaign Orchestrator
 * Replaces the n8n "nov 2025 AGA" workflow
 */
class CampaignOrchestrator {
  /**
   * Main entry point - replaces the n8n webhook trigger
   */
  async processCampaign(input: CampaignInput): Promise<void> {
    const {
      run_id,
      campaign_id,
      campaign_leads_id,
      user_id,
      leadSource,
      csv_file,
      demo,
      notifyOnComplete,
      campaignName
    } = input;

    console.log(`\n🚀 Starting campaign processing...`);
    console.log(`Run ID: ${run_id}`);
    console.log(`Campaign ID: ${campaign_id}`);
    console.log(`Lead Source: ${leadSource}`);
    console.log(`Notifications: ${notifyOnComplete ? 'Enabled' : 'Disabled'}`);

    const startTime = Date.now();

    try {
      // Step 1: Update status to "extracting"
      await supabaseService.updateRunStatus(
        run_id,
        campaign_id,
        user_id,
        'extracting'
      );

      // Step 2: Extract leads based on source
      let leads: Lead[] = [];

      if (leadSource === 'csv' && csv_file) {
        console.log('\n📄 Extracting leads from CSV...');
        leads = await this.extractCSVLeads(csv_file, demo === 'true');
      } else if (leadSource === 'apollo') {
        console.log('\n🔍 Apollo integration not yet implemented');
        throw new Error('Apollo lead source is not yet implemented. Please use CSV upload.');
      } else {
        throw new Error('Invalid lead source or missing CSV file');
      }

      if (leads.length === 0) {
        throw new Error('No valid leads found to process');
      }

      console.log(`✓ Found ${leads.length} leads to process`);

      // Step 3: Update status to "personalizing" and set lead_count
      await supabaseService.updateRunStatus(
        run_id,
        campaign_id,
        user_id,
        'personalizing',
        undefined,
        { lead_count: leads.length, processed_count: 0 }
      );

      // Step 4: Personalize leads
      console.log('\n🤖 Starting personalization...');

      const config = {
        perplexityPrompt: input.perplexityPrompt,
        personalizationPrompt: input.personalizationPrompt,
        promptTask: input.promptTask,
        promptGuidelines: input.promptGuidelines,
        promptExample: input.promptExample,
        campaignLeadsId: campaign_leads_id,
        userId: user_id,
        runId: run_id,
        campaignId: campaign_id,
        customVariables: input.customVariables
      };

      if (!personalizationService.validateConfig(config)) {
        throw new Error('Invalid personalization configuration');
      }

      // Process leads with batch size from env
      const batchSize = Math.min(env.MAX_BATCH_SIZE, 10); // Cap at 10 for safety
      const enrichedLeads = await personalizationService.personalizeLeads(leads, config, batchSize);

      // Step 5: Update status to "completed"
      await supabaseService.updateRunStatus(
        run_id,
        campaign_id,
        user_id,
        'completed'
      );

      console.log('\n✅ Campaign processing completed successfully!');

      // Step 6: Send Slack notification if enabled
      if (notifyOnComplete) {
        const duration = Math.round((Date.now() - startTime) / 1000 / 60); // minutes
        const successCount = enrichedLeads.filter(l => l.enrichment_status === 'enriched').length;
        const failureCount = enrichedLeads.filter(l => l.enrichment_status === 'failed').length;

        await slackService.notifyCampaignComplete(
          campaignName,
          run_id,
          {
            totalLeads: leads.length,
            successCount,
            failureCount,
            duration: `${duration} min`
          }
        );
      }
    } catch (error) {
      console.error('\n❌ Campaign processing failed:', error);

      // Update status to "failed" with error message
      await supabaseService.updateRunStatus(
        run_id,
        campaign_id,
        user_id,
        'failed',
        error instanceof Error ? error.message : 'Unknown error'
      );

      // Send failure notification if enabled
      if (notifyOnComplete) {
        await slackService.notifyCampaignFailed(
          campaignName,
          run_id,
          error instanceof Error ? error.message : 'Unknown error'
        );
      }

      throw error;
    }
  }

  /**
   * Extract and validate leads from CSV file
   * Replaces the "internal extract CSV" workflow
   */
  private async extractCSVLeads(file: Express.Multer.File, isDemo: boolean): Promise<Lead[]> {
    try {
      // Parse CSV
      const leads = await csvProcessorService.extractLeads(file.buffer);

      // Apply demo limit if needed
      const limitedLeads = csvProcessorService.applyDemoLimit(leads, isDemo, 20);

      console.log(`Extracted ${limitedLeads.length} leads from CSV`);

      return limitedLeads;
    } catch (error) {
      console.error('CSV extraction error:', error);
      throw new Error(`Failed to extract leads from CSV: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get campaign status
   */
  async getCampaignStatus(runId: string) {
    return supabaseService.getRunProgress(runId);
  }

  /**
   * Get campaign results
   */
  async getCampaignResults(campaignLeadsId: string) {
    const campaignLead = await supabaseService.getCampaignLead(campaignLeadsId);

    if (!campaignLead) {
      return null;
    }

    const enrichedLeads = campaignLead.lead_data || [];
    const successfulLeads = enrichedLeads.filter(
      lead => lead.enrichment_status === 'enriched' && lead.personalized_message
    );

    return {
      total: enrichedLeads.length,
      successful: successfulLeads.length,
      failed: enrichedLeads.length - successfulLeads.length,
      leads: enrichedLeads
    };
  }

  /**
   * Export campaign results as CSV
   */
  async exportCampaignToCSV(campaignLeadsId: string): Promise<string> {
    const results = await this.getCampaignResults(campaignLeadsId);

    if (!results || results.leads.length === 0) {
      throw new Error('No results to export');
    }

    return csvProcessorService.leadsToCSV(results.leads);
  }

  /**
   * Validate campaign input
   */
  validateInput(input: Partial<CampaignInput>): input is CampaignInput {
    const required = [
      'run_id',
      'campaign_id',
      'campaign_leads_id',
      'user_id',
      'leadSource',
      'perplexityPrompt',
      'personalizationPrompt',
      'promptTask',
      'promptGuidelines',
      'promptExample'
    ];

    for (const field of required) {
      if (!input[field as keyof CampaignInput]) {
        console.error(`Missing required field: ${field}`);
        return false;
      }
    }

    // Validate lead source specific requirements
    if (input.leadSource === 'csv' && !input.csv_file) {
      console.error('CSV lead source requires csv_file');
      return false;
    }

    if (input.leadSource === 'apollo' && !input.apolloUrl) {
      console.error('Apollo lead source requires apolloUrl');
      return false;
    }

    return true;
  }
}

export const campaignOrchestrator = new CampaignOrchestrator();
