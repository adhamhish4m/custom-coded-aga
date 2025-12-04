import axios from 'axios';
import pRetry from 'p-retry';
import { env } from '../../config/env.js';
import type { PerplexityRequest, PerplexityResponse, Lead } from '../../types/index.js';

class PerplexityService {
  private apiKey: string;
  private baseUrl = 'https://api.perplexity.ai/chat/completions';

  constructor() {
    this.apiKey = env.PERPLEXITY_API_KEY;
  }

  async research(request: PerplexityRequest): Promise<PerplexityResponse> {
    // Check if API key is placeholder - skip research if so
    if (this.apiKey === 'placeholder_add_when_available' || !this.apiKey || this.apiKey.includes('placeholder')) {
      console.warn('⚠️  Perplexity API key not configured - using mock research');
      return this.mockResearch(request.lead);
    }

    const runResearch = async (): Promise<PerplexityResponse> => {
      try {
        const response = await axios.post(
          this.baseUrl,
          {
            model: 'sonar',
            messages: [
              {
                role: 'system',
                content: request.systemPrompt
              },
              {
                role: 'user',
                content: this.buildUserPrompt(request.lead, request.userPrompt)
              }
            ]
          },
          {
            headers: {
              'Authorization': `Bearer ${this.apiKey}`,
              'Content-Type': 'application/json'
            },
            timeout: 60000 // 60 second timeout
          }
        );

        const content = response.data.choices?.[0]?.message?.content || '';
        const citations = response.data.citations || [];

        return {
          research: content,
          citations
        };
      } catch (error) {
        if (axios.isAxiosError(error)) {
          console.error('Perplexity API error:', {
            status: error.response?.status,
            data: error.response?.data,
            email: request.lead.email
          });
          throw new Error(`Perplexity API error: ${error.message}`);
        }
        throw error;
      }
    };

    // Retry with exponential backoff
    return pRetry(runResearch, {
      retries: env.RETRY_ATTEMPTS,
      minTimeout: env.RETRY_DELAY_MS,
      onFailedAttempt: (error) => {
        console.warn(
          `Perplexity attempt ${error.attemptNumber} failed for ${request.lead.email}. ${error.retriesLeft} retries left.`
        );
      }
    });
  }

  private buildUserPrompt(lead: Lead, basePrompt: string): string {
    return `
${basePrompt}

Lead Information:
- Name: ${lead.first_name} ${lead.last_name}
- Company: ${lead.company}
- Website: ${lead.company_url || 'Not provided'}
- LinkedIn: ${lead.linkedin_url || 'Not provided'}
- Location: ${lead.location || 'Not provided'}
- Industry: ${lead.company_industry || 'Not provided'}
- Company Size: ${lead.company_headcount || 'Not provided'}
- Job Title: ${lead.job_title || 'Not provided'}

Please research this company and identify:
1. AI automation opportunities
2. Security vulnerabilities or recent breaches
3. Compliance requirements (HIPAA, SOC 2, GDPR, etc.)
4. Manual processes that could be automated
5. Industry-specific threats and challenges
    `.trim();
  }

  // For testing/validation without making API calls
  async mockResearch(lead: Lead): Promise<PerplexityResponse> {
    return {
      research: `Mock research for ${lead.company}: This company operates in ${lead.company_industry || 'various sectors'} with approximately ${lead.company_headcount || 'unknown'} employees. They are located in ${lead.location || 'various locations'}.`,
      citations: []
    };
  }
}

export const perplexityService = new PerplexityService();
