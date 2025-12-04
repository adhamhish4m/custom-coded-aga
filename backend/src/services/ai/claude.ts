import axios from 'axios';
import pRetry from 'p-retry';
import { env } from '../../config/env.js';
import type { PersonalizationRequest, PersonalizationResponse } from '../../types/index.js';

interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenRouterResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

class ClaudeService {
  private apiKey: string;
  private baseUrl = 'https://openrouter.ai/api/v1/chat/completions';
  private model = 'anthropic/claude-3.5-sonnet';

  constructor() {
    this.apiKey = env.OPENROUTER_API_KEY;
  }

  async personalize(request: PersonalizationRequest): Promise<PersonalizationResponse> {
    const runPersonalization = async (): Promise<PersonalizationResponse> => {
      try {
        const messages: OpenRouterMessage[] = [
          {
            role: 'system',
            content: this.buildSystemPrompt(request)
          },
          {
            role: 'user',
            content: this.buildUserPrompt(request)
          }
        ];

        const response = await axios.post<OpenRouterResponse>(
          this.baseUrl,
          {
            model: this.model,
            messages,
            temperature: 0.3,
            max_tokens: 32768,
            response_format: {
              type: 'json_object'
            }
          },
          {
            headers: {
              'Authorization': `Bearer ${this.apiKey}`,
              'Content-Type': 'application/json',
              'HTTP-Referer': 'https://github.com/yourusername/aga-backend',
              'X-Title': 'AGA Backend'
            },
            timeout: 60000 // 60 second timeout
          }
        );

        const content = response.data.choices?.[0]?.message?.content || '{}';

        try {
          const parsed = JSON.parse(content);

          if (!parsed.personalized_sentence) {
            throw new Error('No personalized_sentence in response');
          }

          return {
            personalized_sentence: parsed.personalized_sentence
          };
        } catch (parseError) {
          console.error('Failed to parse Claude response:', content);
          throw new Error('Invalid JSON response from Claude');
        }
      } catch (error) {
        if (axios.isAxiosError(error)) {
          console.error('OpenRouter/Claude API error:', {
            status: error.response?.status,
            data: error.response?.data,
            email: request.lead.email
          });
          throw new Error(`Claude API error: ${error.message}`);
        }
        throw error;
      }
    };

    // Retry with exponential backoff
    return pRetry(runPersonalization, {
      retries: env.RETRY_ATTEMPTS,
      minTimeout: env.RETRY_DELAY_MS,
      onFailedAttempt: (error) => {
        console.warn(
          `Claude attempt ${error.attemptNumber} failed for ${request.lead.email}. ${error.retriesLeft} retries left.`
        );
      }
    });
  }

  private buildSystemPrompt(request: PersonalizationRequest): string {
    return `${request.systemPrompt}

Task: ${request.task}

Guidelines:
${request.guidelines}

Example Output:
${request.example}

IMPORTANT: You must return ONLY valid JSON in this exact format:
{
  "personalized_sentence": "your personalized message here"
}

Constraints:
- Maximum 25 words
- Grade 6 reading level
- Conversational tone
- No questions or meeting requests
- Only use information provided in the research
- Be specific and relevant to their company/industry
`;
  }

  private buildUserPrompt(request: PersonalizationRequest): string {
    const { lead, research } = request;

    return `
Lead Information:
- Name: ${lead.first_name} ${lead.last_name}
- Job Title: ${lead.job_title || 'Not specified'}
- Company: ${lead.company}
- Industry: ${lead.company_industry || 'Not specified'}
- Location: ${lead.location || 'Not specified'}
- Company Size: ${lead.company_headcount || 'Not specified'}

Research Findings:
${research}

Based on the research findings above, create a highly personalized opening sentence for a cold outreach message. The sentence should:
1. Reference specific, recent information about their company
2. Be conversational and natural
3. Create curiosity without asking questions
4. Stay within 25 words
5. Be relevant to their industry/role

Return ONLY the JSON response with the personalized_sentence field.
    `.trim();
  }

  // For testing/validation without making API calls
  async mockPersonalize(request: PersonalizationRequest): Promise<PersonalizationResponse> {
    return {
      personalized_sentence: `Noticed ${request.lead.company} is in ${request.lead.company_industry || 'tech'} - automation could save your team significant time on repetitive tasks.`
    };
  }
}

export const claudeService = new ClaudeService();
