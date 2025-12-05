import axios from 'axios';
import { env } from '../config/env.js';
import type { EnrichedLead } from '../types/index.js';

interface InstantlyLead {
  campaign: string;
  email: string;
  first_name?: string;
  last_name?: string;
  company_name?: string;
  personalization?: string;
  [key: string]: string | number | boolean | null | undefined;
}

interface InstantlyBulkResponse {
  success: boolean;
  message?: string;
  leads_added?: number;
  errors?: any[];
}

class InstantlyService {
  private apiKey?: string;
  private baseUrl = 'https://api.instantly.ai/api/v2';

  constructor() {
    this.apiKey = env.INSTANTLY_API_KEY;
  }

  /**
   * Send a single lead to Instantly campaign
   */
  async addLead(campaignId: string, lead: EnrichedLead): Promise<boolean> {
    if (!this.apiKey) {
      console.log('Instantly API key not configured, skipping export');
      return false;
    }

    try {
      const instantlyLead: InstantlyLead = {
        campaign: campaignId,
        email: lead.email,
        first_name: lead.first_name,
        last_name: lead.last_name,
        company_name: lead.company,
        personalization: lead.personalized_message,
        // Custom variables
        company_website: lead.company_url || '',
        linkedin_url: lead.linkedin_url || '',
        job_title: lead.job_title || '',
        company_state: lead.company_state || '',
        company_industry: lead.company_industry || '',
        headline: lead.headline || ''
      };

      const response = await axios.post(`${this.baseUrl}/leads`, instantlyLead, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      console.log(`✓ Lead ${lead.email} added to Instantly campaign ${campaignId}`);
      return true;
    } catch (error) {
      console.error(`Failed to add lead ${lead.email} to Instantly:`, error);
      return false;
    }
  }

  /**
   * Send multiple leads to Instantly campaign in bulk
   */
  async addLeadsBulk(campaignId: string, leads: EnrichedLead[]): Promise<InstantlyBulkResponse> {
    if (!this.apiKey) {
      throw new Error('Instantly API key not configured');
    }

    if (leads.length === 0) {
      return {
        success: false,
        message: 'No leads to export'
      };
    }

    try {
      const instantlyLeads: InstantlyLead[] = leads.map(lead => ({
        campaign: campaignId,
        email: lead.email,
        first_name: lead.first_name,
        last_name: lead.last_name,
        company_name: lead.company,
        personalization: lead.personalized_message,
        // Custom variables
        company_website: lead.company_url || '',
        linkedin_url: lead.linkedin_url || '',
        job_title: lead.job_title || '',
        company_state: lead.company_state || '',
        company_industry: lead.company_industry || '',
        headline: lead.headline || ''
      }));

      // Process in batches of 100 (Instantly API limit)
      const batchSize = 100;
      let totalAdded = 0;
      const errors: any[] = [];

      for (let i = 0; i < instantlyLeads.length; i += batchSize) {
        const batch = instantlyLeads.slice(i, i + batchSize);

        try {
          // Send each lead individually for better error handling
          const promises = batch.map(lead =>
            axios.post(`${this.baseUrl}/leads`, lead, {
              headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
              },
              timeout: 10000
            })
          );

          const results = await Promise.allSettled(promises);

          results.forEach((result, index) => {
            if (result.status === 'fulfilled') {
              totalAdded++;
            } else {
              errors.push({
                email: batch[index].email,
                error: result.reason?.message || 'Unknown error'
              });
            }
          });

          console.log(`✓ Processed batch ${i / batchSize + 1}: ${totalAdded} leads added`);
        } catch (error) {
          console.error(`Batch ${i / batchSize + 1} failed:`, error);
          errors.push({
            batch: i / batchSize + 1,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      const response: InstantlyBulkResponse = {
        success: totalAdded > 0,
        message: `Added ${totalAdded} of ${leads.length} leads to Instantly campaign`,
        leads_added: totalAdded,
        errors: errors.length > 0 ? errors : undefined
      };

      console.log(`✓ Instantly export complete: ${totalAdded}/${leads.length} leads added`);
      return response;
    } catch (error) {
      console.error('Instantly bulk export failed:', error);
      throw new Error(`Failed to export leads to Instantly: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Test Instantly API connection
   */
  async testConnection(): Promise<boolean> {
    if (!this.apiKey) {
      return false;
    }

    try {
      // Try to make a simple API call to verify the key works
      const response = await axios.get(`${this.baseUrl}/campaigns`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        },
        timeout: 5000
      });

      return response.status === 200;
    } catch (error) {
      console.error('Instantly API connection test failed:', error);
      return false;
    }
  }
}

export const instantlyService = new InstantlyService();
