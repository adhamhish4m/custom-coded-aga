import { perplexityService } from './ai/perplexity.js';
import { claudeService } from './ai/claude.js';
import { supabaseService } from './supabase.js';
import type { Lead, EnrichedLead, PersonalizationRequest, CustomVariable } from '../types/index.js';

interface PersonalizationConfig {
  perplexityPrompt: string;
  personalizationPrompt: string;
  promptTask: string;
  promptGuidelines: string;
  promptExample: string;
  campaignLeadsId: string;
  userId: string;
  runId?: string;
  campaignId?: string;
  customVariables?: CustomVariable[];
}

class PersonalizationService {
  /**
   * Main personalization workflow for a single lead
   */
  async personalizeLead(
    lead: Lead,
    config: PersonalizationConfig
  ): Promise<EnrichedLead> {
    const enrichedLead: EnrichedLead = {
      ...lead,
      personalized_message: '',
      enrichment_status: 'pending'
    };

    try {
      // Step 1: Perplexity research (or reuse intent research if available)
      let research = '';

      // Check if lead already has research from intent qualification
      const leadWithIntent = lead as Lead & { intent_research?: string };
      if (leadWithIntent.intent_research) {
        console.log(`📋 Reusing intent research for ${lead.company} (${lead.email}) - skipping Perplexity call to save credits`);
        research = leadWithIntent.intent_research;
        enrichedLead.perplexity_research = research;
      } else {
        // No intent research available, do normal research
        console.log(`🔍 Researching ${lead.company} for ${lead.email}...`);
        try {
          const perplexityResponse = await perplexityService.research({
            systemPrompt: config.perplexityPrompt,
            userPrompt: this.buildPerplexityUserPrompt(lead),
            lead
          });
          research = perplexityResponse.research;
          enrichedLead.perplexity_research = research;
        } catch (error) {
          console.error(`Perplexity research failed for ${lead.email}:`, error);
          // Continue with empty research - Claude can still personalize
          research = `Unable to fetch research for ${lead.company}. Using available lead information only.`;
        }
      }

      // Step 2: Claude personalization
      console.log(`Personalizing message for ${lead.email}...`);

      try {
        const personalizationResponse = await claudeService.personalize({
          systemPrompt: config.personalizationPrompt,
          userPrompt: '',
          lead,
          research,
          task: config.promptTask,
          guidelines: config.promptGuidelines,
          example: config.promptExample
        }, config.customVariables);

        enrichedLead.personalized_message = personalizationResponse.personalized_sentence;
        if (personalizationResponse.custom_variables) {
          enrichedLead.custom_variables = personalizationResponse.custom_variables;
          console.log(`[Personalization] Added custom variables to ${lead.email}:`, Object.keys(personalizationResponse.custom_variables));
        } else if (config.customVariables && config.customVariables.length > 0) {
          console.warn(`[Personalization] ⚠️ Custom variables requested but not received for ${lead.email}`);
        }
        enrichedLead.enrichment_status = 'enriched';

        console.log(`✓ Successfully personalized for ${lead.email}`);
      } catch (error) {
        console.error(`Claude personalization failed for ${lead.email}:`, error);
        enrichedLead.enrichment_status = 'failed';
        enrichedLead.personalized_message = '';
        throw error;
      }

      return enrichedLead;
    } catch (error) {
      console.error(`Failed to personalize lead ${lead.email}:`, error);
      enrichedLead.enrichment_status = 'failed';
      return enrichedLead;
    }
  }

  /**
   * Process multiple leads in batches
   */
  async personalizeLeads(
    leads: Lead[],
    config: PersonalizationConfig,
    batchSize: number = 10
  ): Promise<EnrichedLead[]> {
    const enrichedLeads: EnrichedLead[] = [];
    let successCount = 0;
    let failureCount = 0;
    let processedCount = 0;

    // Process in batches to avoid overwhelming APIs
    for (let i = 0; i < leads.length; i += batchSize) {
      const batch = leads.slice(i, i + batchSize);
      console.log(`\nProcessing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(leads.length / batchSize)}`);

      // Process batch in parallel with Promise.allSettled to handle failures gracefully
      const batchResults = await Promise.allSettled(
        batch.map(lead => this.personalizeLead(lead, config))
      );

      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          const enrichedLead = result.value;
          enrichedLeads.push(enrichedLead);
          processedCount++;

          // Save to database immediately if successful
          if (enrichedLead.enrichment_status === 'enriched' && enrichedLead.personalized_message) {
            // Log what we're saving to database
            console.log(`[Database] Saving lead ${enrichedLead.email} with:`, {
              has_personalized_message: !!enrichedLead.personalized_message,
              has_custom_variables: !!enrichedLead.custom_variables,
              custom_variable_keys: enrichedLead.custom_variables ? Object.keys(enrichedLead.custom_variables) : 'none'
            });

            const saved = await supabaseService.appendLeadToCampaign(
              config.campaignLeadsId,
              enrichedLead
            );

            if (saved) {
              successCount++;

              // Update KPIs for user
              await supabaseService.updateClientMetrics(config.userId, 1);

              // Update campaign completed count
              const campaignLead = await supabaseService.getCampaignLead(config.campaignLeadsId);
              if (campaignLead) {
                const campaign = await supabaseService.getCampaign(campaignLead.campaign_id);
                if (campaign) {
                  await supabaseService.updateCampaignCompletedCount(
                    campaign.id,
                    campaignLead.lead_data.length
                  );
                }
              }
            }
          } else {
            failureCount++;
          }
        } else {
          processedCount++;
          failureCount++;
          console.error('Batch processing error:', result.reason);
        }
      }

      // Update progress in campaign_runs after each batch
      if (config.runId && config.campaignId) {
        await supabaseService.updateRunStatus(
          config.runId,
          config.campaignId,
          config.userId,
          'personalizing',
          undefined,
          {
            processed_count: processedCount,
            success_count: successCount,
            error_count: failureCount
          }
        );
      }

      // Small delay between batches to respect rate limits
      if (i + batchSize < leads.length) {
        await this.delay(1000);
      }
    }

    console.log(`\n✓ Personalization complete: ${successCount} successful, ${failureCount} failed`);

    return enrichedLeads;
  }

  /**
   * Build user prompt for Perplexity research
   */
  private buildPerplexityUserPrompt(lead: Lead): string {
    return `Please research ${lead.company}${lead.company_url ? ` (${lead.company_url})` : ''} and provide insights about:
- Recent news, updates, or changes
- AI automation opportunities
- Security concerns or compliance requirements
- Industry challenges they might be facing
- Any relevant context for cold outreach

Focus on factual, recent information that would be valuable for personalized outreach.`;
  }

  /**
   * Utility: Delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Validate personalization config
   */
  validateConfig(config: Partial<PersonalizationConfig>): config is PersonalizationConfig {
    const required = [
      'perplexityPrompt',
      'personalizationPrompt',
      'promptTask',
      'promptGuidelines',
      'promptExample',
      'campaignLeadsId',
      'userId'
    ];

    for (const field of required) {
      if (!config[field as keyof PersonalizationConfig]) {
        console.error(`Missing required field: ${field}`);
        return false;
      }
    }

    return true;
  }
}

export const personalizationService = new PersonalizationService();
