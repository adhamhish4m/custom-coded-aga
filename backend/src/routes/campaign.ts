import { Router, Request, Response } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { campaignOrchestrator } from '../services/campaign-orchestrator.js';
import { instantlyService } from '../services/instantly.js';
import type { CampaignInput } from '../types/index.js';

const router = Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  }
});

/**
 * POST /api/campaigns/process
 * Main endpoint to start campaign processing
 * Replaces n8n webhook at /nov-2025-adham
 */
router.post('/process', upload.single('csv_file'), async (req: Request, res: Response) => {
  try {
    console.log('\n📥 Received campaign processing request');
    console.log('customVariables received:', req.body.customVariables);
    console.log('customVariables type:', typeof req.body.customVariables);

    // Extract data from request
    const {
      leadSource,
      campaignName,
      campaign_id,
      campaign_leads_id,
      user_id,
      rerun,
      perplexityPrompt,
      personalizationPrompt,
      promptTask,
      promptGuidelines,
      promptExample,
      personalizationStrategy,
      apolloUrl,
      leadCount,
      demo,
      notifyOnComplete,
      customVariables,
      revenueFilterEnabled,
      revenueMin,
      revenueMax
    } = req.body;

    // Generate run_id if not provided
    const run_id = req.body.run_id || uuidv4();

    const input: Partial<CampaignInput> = {
      leadSource,
      run_id,
      campaignName,
      campaign_id,
      campaign_leads_id,
      user_id,
      rerun: rerun === 'true' || rerun === true,
      perplexityPrompt,
      personalizationPrompt,
      promptTask,
      promptGuidelines,
      promptExample,
      personalizationStrategy,
      apolloUrl,
      leadCount: leadCount ? parseInt(leadCount, 10) : undefined,
      demo,
      notifyOnComplete: notifyOnComplete === 'true' || notifyOnComplete === true,
      csv_file: req.file,
      customVariables: (() => {
        if (!customVariables) return undefined;
        try {
          // Check if it's already a valid JSON string
          if (typeof customVariables === 'string') {
            return JSON.parse(customVariables);
          }
          // If it's already an object, return as-is
          return customVariables;
        } catch (error) {
          console.error('Failed to parse customVariables:', customVariables);
          return undefined;
        }
      })(),
      revenueFilterEnabled: revenueFilterEnabled === 'true' || revenueFilterEnabled === true,
      revenueMin: revenueMin ? parseFloat(revenueMin) : undefined,
      revenueMax: revenueMax ? parseFloat(revenueMax) : undefined
    };

    // Validate input
    if (!campaignOrchestrator.validateInput(input)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid campaign input. Please check all required fields.'
      });
    }

    // Start processing asynchronously
    // Don't await - return immediately with run_id
    campaignOrchestrator.processCampaign(input as CampaignInput)
      .then(() => {
        console.log(`✓ Campaign ${run_id} completed successfully`);
      })
      .catch((error) => {
        console.error(`✗ Campaign ${run_id} failed:`, error);
      });

    // Return run_id immediately for status tracking
    res.status(202).json({
      success: true,
      message: 'Campaign processing started',
      run_id,
      campaign_id,
      campaign_leads_id
    });
  } catch (error) {
    console.error('Campaign processing endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

/**
 * GET /api/campaigns/status/:runId
 * Get campaign processing status
 */
router.get('/status/:runId', async (req: Request, res: Response) => {
  try {
    const { runId } = req.params;

    const status = await campaignOrchestrator.getCampaignStatus(runId);

    if (!status) {
      return res.status(404).json({
        success: false,
        error: 'Campaign run not found'
      });
    }

    res.json({
      success: true,
      status: {
        run_id: status.id,
        campaign_id: status.campaign_id,
        status: status.status,
        updated_at: status.updated_at,
        error_message: status.error_message
      }
    });
  } catch (error) {
    console.error('Get status error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

/**
 * GET /api/campaigns/results/:campaignLeadsId
 * Get campaign results
 */
router.get('/results/:campaignLeadsId', async (req: Request, res: Response) => {
  try {
    const { campaignLeadsId } = req.params;

    const results = await campaignOrchestrator.getCampaignResults(campaignLeadsId);

    if (!results) {
      return res.status(404).json({
        success: false,
        error: 'Campaign results not found'
      });
    }

    res.json({
      success: true,
      results
    });
  } catch (error) {
    console.error('Get results error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

/**
 * GET /api/campaigns/export/:campaignLeadsId
 * Export campaign results as CSV
 */
router.get('/export/:campaignLeadsId', async (req: Request, res: Response) => {
  try {
    const { campaignLeadsId } = req.params;

    const csv = await campaignOrchestrator.exportCampaignToCSV(campaignLeadsId);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="campaign-${campaignLeadsId}.csv"`);
    res.send(csv);
  } catch (error) {
    console.error('Export CSV error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

/**
 * POST /api/campaigns/test
 * Test endpoint to validate configuration without processing
 */
router.post('/test', upload.single('csv_file'), async (req: Request, res: Response) => {
  try {
    const input: Partial<CampaignInput> = {
      ...req.body,
      csv_file: req.file,
      run_id: req.body.run_id || uuidv4()
    };

    const isValid = campaignOrchestrator.validateInput(input);

    if (!isValid) {
      return res.status(400).json({
        success: false,
        error: 'Invalid campaign configuration',
        received: Object.keys(req.body)
      });
    }

    // If CSV file provided, validate it
    if (req.file) {
      const { csvProcessorService } = await import('../services/csv-processor.js');
      const leads = await csvProcessorService.extractLeads(req.file.buffer);

      return res.json({
        success: true,
        message: 'Configuration is valid',
        lead_preview: {
          total: leads.length,
          sample: leads.slice(0, 3)
        }
      });
    }

    res.json({
      success: true,
      message: 'Configuration is valid'
    });
  } catch (error) {
    console.error('Test endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

/**
 * POST /api/campaigns/export-to-instantly
 * Export campaign leads to Instantly.ai
 */
router.post('/export-to-instantly', async (req: Request, res: Response) => {
  try {
    const { campaignLeadsId, instantlyCampaignId } = req.body;

    if (!campaignLeadsId || !instantlyCampaignId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: campaignLeadsId and instantlyCampaignId'
      });
    }

    console.log(`\n📤 Exporting leads to Instantly campaign: ${instantlyCampaignId}`);

    // Get campaign results
    const results = await campaignOrchestrator.getCampaignResults(campaignLeadsId);

    if (!results || results.leads.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No leads found to export'
      });
    }

    // Filter only successfully enriched leads
    const enrichedLeads = results.leads.filter(
      lead => lead.enrichment_status === 'enriched' && lead.personalized_message
    );

    if (enrichedLeads.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No enriched leads with personalized messages found'
      });
    }

    // Export to Instantly
    const instantlyResult = await instantlyService.addLeadsBulk(
      instantlyCampaignId,
      enrichedLeads
    );

    res.json({
      success: true,
      message: instantlyResult.message,
      leads_exported: instantlyResult.leads_added,
      total_leads: enrichedLeads.length,
      errors: instantlyResult.errors
    });
  } catch (error) {
    console.error('Export to Instantly error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

export default router;
