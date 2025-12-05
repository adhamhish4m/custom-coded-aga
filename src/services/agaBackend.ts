/**
 * AGA Backend API Client
 * Replaces n8n workflow calls with direct backend API calls
 */

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

export interface CustomVariable {
  id: string;
  name: string;
  prompt: string;
}

export interface CampaignProcessRequest {
  csv_file?: File;
  leadSource: 'csv' | 'apollo';
  campaign_id: string;
  campaign_leads_id: string;
  user_id: string;
  run_id?: string;
  campaignName: string;
  perplexityPrompt: string;
  personalizationPrompt: string;
  promptTask: string;
  promptGuidelines: string;
  promptExample: string;
  personalizationStrategy: string;
  apolloUrl?: string;
  leadCount?: number;
  demo?: string;
  rerun?: string;
  notifyOnComplete?: boolean;
  customVariables?: CustomVariable[];
}

export interface CampaignProcessResponse {
  success: boolean;
  message: string;
  run_id: string;
  campaign_id: string;
  campaign_leads_id: string;
}

export interface CampaignStatus {
  success: boolean;
  status: {
    run_id: string;
    campaign_id: string;
    status: 'verifying' | 'extracting' | 'personalizing' | 'failed' | 'completed';
    updated_at: string;
    error_message?: string;
  };
}

export interface EnrichedLead {
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
  personalized_message: string;
  enrichment_status: 'enriched' | 'failed' | 'pending';
  perplexity_research?: string;
  custom_variables?: { [key: string]: string };
}

export interface CampaignResults {
  success: boolean;
  results: {
    total: number;
    successful: number;
    failed: number;
    leads: EnrichedLead[];
  };
}

class AGABackendClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  /**
   * Process a new campaign (replaces n8n webhook call)
   */
  async processCampaign(request: CampaignProcessRequest): Promise<CampaignProcessResponse> {
    const formData = new FormData();

    // Add all fields to FormData
    Object.entries(request).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (value instanceof File) {
          formData.append(key, value);
        } else if (typeof value === 'object') {
          // For objects and arrays (like customVariables), JSON.stringify them
          formData.append(key, JSON.stringify(value));
        } else {
          formData.append(key, String(value));
        }
      }
    });

    const response = await fetch(`${this.baseUrl}/api/campaigns/process`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  /**
   * Get campaign status
   */
  async getCampaignStatus(runId: string): Promise<CampaignStatus> {
    const response = await fetch(`${this.baseUrl}/api/campaigns/status/${runId}`);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  /**
   * Get campaign results
   */
  async getCampaignResults(campaignLeadsId: string): Promise<CampaignResults> {
    const response = await fetch(`${this.baseUrl}/api/campaigns/results/${campaignLeadsId}`);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  /**
   * Export campaign results as CSV
   */
  async exportCampaignCSV(campaignLeadsId: string): Promise<Blob> {
    const response = await fetch(`${this.baseUrl}/api/campaigns/export/${campaignLeadsId}`);

    if (!response.ok) {
      throw new Error(`Export failed: HTTP ${response.status}`);
    }

    return response.blob();
  }

  /**
   * Download CSV file
   */
  downloadCSV(blob: Blob, filename: string) {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  /**
   * Test campaign configuration
   */
  async testConfiguration(request: CampaignProcessRequest): Promise<any> {
    const formData = new FormData();

    Object.entries(request).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (value instanceof File) {
          formData.append(key, value);
        } else if (typeof value === 'object') {
          // For objects and arrays (like customVariables), JSON.stringify them
          formData.append(key, JSON.stringify(value));
        } else {
          formData.append(key, String(value));
        }
      }
    });

    const response = await fetch(`${this.baseUrl}/api/campaigns/test`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  /**
   * Check backend health
   */
  async healthCheck(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/health`);
    return response.json();
  }

  /**
   * Export campaign leads to Instantly.ai
   */
  async exportToInstantly(campaignLeadsId: string, instantlyCampaignId: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/campaigns/export-to-instantly`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        campaignLeadsId,
        instantlyCampaignId
      })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  /**
   * Poll for campaign completion
   */
  async pollUntilComplete(
    runId: string,
    onProgress?: (status: CampaignStatus['status']) => void,
    maxAttempts: number = 120, // 10 minutes at 5s intervals
    intervalMs: number = 5000
  ): Promise<CampaignStatus> {
    let attempts = 0;

    while (attempts < maxAttempts) {
      const status = await this.getCampaignStatus(runId);

      if (onProgress) {
        onProgress(status.status);
      }

      if (status.status.status === 'completed' || status.status.status === 'failed') {
        return status;
      }

      attempts++;
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }

    throw new Error('Campaign processing timed out');
  }
}

// Export singleton instance
export const agaBackend = new AGABackendClient();
