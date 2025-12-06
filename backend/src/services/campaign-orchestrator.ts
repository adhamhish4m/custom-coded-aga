import { csvProcessorService } from './csv-processor.js';
import { personalizationService } from './personalization.js';
import { perplexityService } from './ai/perplexity.js';
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

      console.log(`✓ Found ${leads.length} leads before filtering`);

      // Apply revenue filter if enabled
      if (input.revenueFilterEnabled && (input.revenueMin !== undefined || input.revenueMax !== undefined)) {
        const originalCount = leads.length;
        leads = this.filterLeadsByRevenue(leads, input.revenueMin, input.revenueMax);
        console.log(`✓ Revenue filter applied: ${originalCount} leads -> ${leads.length} leads (filtered ${originalCount - leads.length})`);

        if (leads.length === 0) {
          throw new Error('No leads remaining after revenue filter. Try adjusting your revenue range.');
        }
      }

      // Apply duplicate detection if enabled
      if (input.skipDuplicates) {
        const originalCount = leads.length;
        leads = await this.filterDuplicateEmails(leads, user_id, campaign_leads_id);
        console.log(`✓ Duplicate filter applied: ${originalCount} leads -> ${leads.length} leads (filtered ${originalCount - leads.length} duplicates)`);

        if (leads.length === 0) {
          throw new Error('No leads remaining after duplicate filter. All leads already exist in your previous campaigns.');
        }
      }

      // Apply intent signals filtering if provided
      if (input.intentSignals && input.intentSignals.trim()) {
        const originalCount = leads.length;
        console.log(`🔍 Applying intent signals filter: "${input.intentSignals}"`);

        // Update status to "qualifying"
        await supabaseService.updateRunStatus(
          run_id,
          campaign_id,
          user_id,
          'qualifying',
          undefined,
          { lead_count: originalCount, processed_count: 0 }
        );

        leads = await this.filterByIntentSignals(
          leads,
          input.intentSignals,
          input.perplexityPrompt,
          run_id,
          campaign_id,
          user_id
        );

        console.log(`✓ Intent filter applied: ${originalCount} leads -> ${leads.length} leads (filtered ${originalCount - leads.length} not matching intent)`);

        if (leads.length === 0) {
          throw new Error('No leads remaining after intent filtering. Try adjusting your intent signals criteria.');
        }
      }

      console.log(`✓ Processing ${leads.length} leads`);

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
   * Filter leads by annual revenue range
   */
  private filterLeadsByRevenue(leads: Lead[], revenueMin?: number, revenueMax?: number): Lead[] {
    return leads.filter(lead => {
      const revenueStr = lead.company_annual_revenue;

      // If no revenue data, exclude the lead
      if (!revenueStr || revenueStr.trim() === '') {
        return false;
      }

      // Parse revenue value - handle formats like "$1,000,000" or "1000000" or "1M"
      let revenue: number;
      try {
        // Remove $ and commas
        let cleanValue = revenueStr.replace(/[$,]/g, '').trim();

        // Handle abbreviations like 1M, 1B, 1K
        const multipliers: { [key: string]: number } = {
          'K': 1000,
          'M': 1000000,
          'B': 1000000000
        };

        const lastChar = cleanValue.slice(-1).toUpperCase();
        if (multipliers[lastChar]) {
          const numericPart = parseFloat(cleanValue.slice(0, -1));
          revenue = numericPart * multipliers[lastChar];
        } else {
          revenue = parseFloat(cleanValue);
        }

        // If parsing failed or resulted in NaN, exclude lead
        if (isNaN(revenue)) {
          return false;
        }
      } catch (error) {
        console.warn(`Failed to parse revenue for lead ${lead.email}: ${revenueStr}`);
        return false;
      }

      // Apply min/max filters
      if (revenueMin !== undefined && revenue < revenueMin) {
        return false;
      }
      if (revenueMax !== undefined && revenue > revenueMax) {
        return false;
      }

      return true;
    });
  }

  /**
   * Filter out duplicate emails that exist in user's previous campaigns
   */
  private async filterDuplicateEmails(leads: Lead[], userId: string, currentCampaignLeadsId: string): Promise<Lead[]> {
    try {
      // Fetch all previous campaign_leads for this user (excluding the current one)
      const existingEmails = await supabaseService.getExistingEmailsForUser(userId, currentCampaignLeadsId);

      if (existingEmails.size === 0) {
        console.log('No existing emails found in previous campaigns');
        return leads;
      }

      console.log(`Found ${existingEmails.size} existing emails in previous campaigns`);

      // Filter out leads whose emails already exist
      const filteredLeads = leads.filter(lead => {
        const email = lead.email?.toLowerCase().trim();
        if (!email) {
          return false; // Exclude leads without email
        }
        return !existingEmails.has(email);
      });

      return filteredLeads;
    } catch (error) {
      console.error('Error filtering duplicate emails:', error);
      // On error, return all leads to avoid blocking the campaign
      return leads;
    }
  }

  /**
   * Filter leads based on intent signals using AI research
   * Also stores research data with qualified leads to reuse in personalization (saves credits!)
   */
  private async filterByIntentSignals(
    leads: Lead[],
    intentSignals: string,
    perplexityPrompt: string,
    runId: string,
    campaignId: string,
    userId: string
  ): Promise<Array<Lead & { intent_research?: string }>> {
    const matchingLeads: Array<Lead & { intent_research?: string }> = [];
    const batchSize = 5; // Process 5 leads at a time
    let processedCount = 0;

    console.log(`Checking ${leads.length} leads against intent signals...`);
    console.log(`💡 Research from intent qualification will be reused for personalization to save credits`);

    // Process leads in batches
    for (let i = 0; i < leads.length; i += batchSize) {
      const batch = leads.slice(i, i + batchSize);

      const batchResults = await Promise.allSettled(
        batch.map(async (lead) => {
          try {
            // Research the lead using Perplexity - combine intent check with useful personalization info
            const intentCheckPrompt = `${perplexityPrompt}\n\nIntent Signals to Check: ${intentSignals}\n\nFirst, determine if company ${lead.company} meets these intent signals and start your response with "YES" or "NO".\n\nThen, regardless of your answer, provide detailed research about the company that would be useful for personalized outreach (recent news, achievements, key information, etc.). This research will be used for personalization if the lead qualifies.`;

            const researchResult = await perplexityService.research({
              systemPrompt: intentCheckPrompt,
              userPrompt: `Research ${lead.company}${lead.company_url ? ` (${lead.company_url})` : ''} and determine if they match the intent signals: "${intentSignals}". Start with YES or NO, then provide useful research about the company.`,
              lead
            });

            // Check if the response starts with "YES"
            const meetsIntent = researchResult.research.trim().toUpperCase().startsWith('YES');

            if (meetsIntent) {
              console.log(`✓ ${lead.company} (${lead.email}) MATCHES intent signals (research saved for personalization)`);
              // Attach the research to the lead for reuse in personalization
              return { lead: { ...lead, intent_research: researchResult.research }, matches: true };
            } else {
              console.log(`✗ ${lead.company} (${lead.email}) does NOT match intent signals`);
              return { lead, matches: false };
            }
          } catch (error) {
            console.error(`Error checking intent for ${lead.email}:`, error);
            // On error, include the lead to avoid blocking
            return { lead, matches: true };
          }
        })
      );

      // Collect matching leads (with research attached)
      for (const result of batchResults) {
        if (result.status === 'fulfilled' && result.value.matches) {
          matchingLeads.push(result.value.lead);
        }
      }

      // Update progress after each batch
      processedCount += batch.length;
      await supabaseService.updateRunStatus(
        runId,
        campaignId,
        userId,
        'qualifying',
        undefined,
        { lead_count: leads.length, processed_count: processedCount, qualified_count: matchingLeads.length }
      );

      // Small delay between batches to respect API limits
      if (i + batchSize < leads.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return matchingLeads;
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
