/**
 * Database Utilities
 * Direct Supabase database operations
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const dbUtils = {
  // Query utilities
  async queryCampaigns(userId?: string) {
    const query = supabase
      .from('campaigns')
      .select('*')
      .order('created_at', { ascending: false });

    if (userId) {
      query.eq('user_id', userId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async queryRuns(userId?: string) {
    const query = supabase
      .from('campaign_runs')
      .select('*')
      .order('created_at', { ascending: false });

    if (userId) {
      query.eq('user_id', userId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async queryLeads(campaignId: string) {
    const { data, error } = await supabase
      .from('campaign_leads')
      .select('*')
      .eq('campaign_id', campaignId);

    if (error) throw error;
    return data;
  },

  // Delete utilities
  async deleteCampaign(campaignId: string) {
    // Delete associated runs
    await supabase
      .from('campaign_runs')
      .delete()
      .eq('campaign_id', campaignId);

    // Delete associated leads
    await supabase
      .from('campaign_leads')
      .delete()
      .eq('campaign_id', campaignId);

    // Delete campaign
    const { error } = await supabase
      .from('campaigns')
      .delete()
      .eq('id', campaignId);

    if (error) throw error;
    return { success: true };
  },

  async deleteCampaignByName(name: string, userId?: string) {
    const query = supabase
      .from('campaigns')
      .select('id')
      .eq('name', name);

    if (userId) {
      query.eq('user_id', userId);
    }

    const { data: campaigns, error: selectError } = await query;
    if (selectError) throw selectError;

    if (!campaigns || campaigns.length === 0) {
      return { success: false, message: 'Campaign not found' };
    }

    for (const campaign of campaigns) {
      await this.deleteCampaign(campaign.id);
    }

    return { success: true, deleted: campaigns.length };
  },

  async deleteAllTestCampaigns(userId?: string) {
    const query = supabase
      .from('campaigns')
      .select('id, name')
      .or('name.ilike.%test%,name.ilike.%demo%');

    if (userId) {
      query.eq('user_id', userId);
    }

    const { data: campaigns, error } = await query;
    if (error) throw error;

    if (!campaigns || campaigns.length === 0) {
      return { success: true, deleted: 0, message: 'No test campaigns found' };
    }

    for (const campaign of campaigns) {
      await this.deleteCampaign(campaign.id);
    }

    return { success: true, deleted: campaigns.length, campaigns: campaigns.map(c => c.name) };
  },

  async deleteAllCampaigns(userId: string) {
    const { data: campaigns, error } = await supabase
      .from('campaigns')
      .select('id')
      .eq('user_id', userId);

    if (error) throw error;

    if (!campaigns || campaigns.length === 0) {
      return { success: true, deleted: 0, message: 'No campaigns found' };
    }

    for (const campaign of campaigns) {
      await this.deleteCampaign(campaign.id);
    }

    return { success: true, deleted: campaigns.length };
  },

  // Update utilities
  async updateCampaignStatus(campaignId: string, status: string) {
    const { error } = await supabase
      .from('campaigns')
      .update({ status })
      .eq('id', campaignId);

    if (error) throw error;
    return { success: true };
  },

  async updateRunStatus(runId: string, status: string) {
    const { error } = await supabase
      .from('campaign_runs')
      .update({ status })
      .eq('run_id', runId);

    if (error) throw error;
    return { success: true };
  },

  // Inspection utilities
  async inspectDatabase() {
    const [campaigns, runs, metrics] = await Promise.all([
      this.queryCampaigns(),
      this.queryRuns(),
      supabase.from('user_metrics').select('*')
    ]);

    return {
      totalCampaigns: campaigns?.length || 0,
      totalRuns: runs?.length || 0,
      totalUsers: metrics.data?.length || 0,
      recentCampaigns: campaigns?.slice(0, 5),
      recentRuns: runs?.slice(0, 5)
    };
  },

  async findOrphanedRecords() {
    // Find runs without campaigns
    const { data: allRuns } = await supabase
      .from('campaign_runs')
      .select('run_id, campaign_id, campaign_name');

    const { data: allCampaigns } = await supabase
      .from('campaigns')
      .select('id');

    const campaignIds = new Set(allCampaigns?.map(c => c.id) || []);
    const orphanedRuns = allRuns?.filter(r => r.campaign_id && !campaignIds.has(r.campaign_id)) || [];

    // Find leads without campaigns
    const { data: allLeads } = await supabase
      .from('campaign_leads')
      .select('id, campaign_id');

    const orphanedLeads = allLeads?.filter(l => !campaignIds.has(l.campaign_id)) || [];

    return {
      orphanedRuns: orphanedRuns.length,
      orphanedLeads: orphanedLeads.length,
      runs: orphanedRuns,
      leads: orphanedLeads
    };
  },

  async cleanupOrphanedRecords() {
    const orphaned = await this.findOrphanedRecords();

    // Delete orphaned runs
    for (const run of orphaned.runs) {
      await supabase
        .from('campaign_runs')
        .delete()
        .eq('run_id', run.run_id);
    }

    // Delete orphaned leads
    for (const lead of orphaned.leads) {
      await supabase
        .from('campaign_leads')
        .delete()
        .eq('id', lead.id);
    }

    return {
      success: true,
      deletedRuns: orphaned.orphanedRuns,
      deletedLeads: orphaned.orphanedLeads
    };
  }
};

// CLI interface
const command = process.argv[2];
const arg1 = process.argv[3];
const arg2 = process.argv[4];

async function main() {
  try {
    switch (command) {
      case 'list':
        const campaigns = await dbUtils.queryCampaigns(arg1);
        console.log('\n📋 Campaigns:\n');
        campaigns?.forEach(c => {
          console.log(`  ${c.name}`);
          console.log(`    ID: ${c.id}`);
          console.log(`    Status: ${c.status || 'N/A'}`);
          console.log(`    Created: ${new Date(c.created_at).toLocaleString()}`);
          console.log('');
        });
        break;

      case 'delete':
        if (!arg1) {
          console.log('Usage: npm run db delete <campaign-name> [user-id]');
          process.exit(1);
        }
        const deleteResult = await dbUtils.deleteCampaignByName(arg1, arg2);
        console.log(deleteResult);
        break;

      case 'delete-all':
        if (!arg1) {
          console.log('Usage: npm run db delete-all <user-id>');
          process.exit(1);
        }
        const deleteAllResult = await dbUtils.deleteAllCampaigns(arg1);
        console.log(deleteAllResult);
        break;

      case 'delete-test':
        const testResult = await dbUtils.deleteAllTestCampaigns(arg1);
        console.log(testResult);
        break;

      case 'inspect':
        const inspection = await dbUtils.inspectDatabase();
        console.log('\n🔍 Database Inspection:\n');
        console.log(`Total Campaigns: ${inspection.totalCampaigns}`);
        console.log(`Total Runs: ${inspection.totalRuns}`);
        console.log(`Total Users: ${inspection.totalUsers}`);
        console.log('\nRecent Campaigns:');
        inspection.recentCampaigns?.forEach(c => console.log(`  - ${c.name}`));
        break;

      case 'orphaned':
        const orphaned = await dbUtils.findOrphanedRecords();
        console.log('\n🔍 Orphaned Records:\n');
        console.log(`Orphaned Runs: ${orphaned.orphanedRuns}`);
        console.log(`Orphaned Leads: ${orphaned.orphanedLeads}`);
        if (orphaned.runs.length > 0) {
          console.log('\nOrphaned Runs:');
          orphaned.runs.forEach(r => console.log(`  - ${r.campaign_name} (${r.run_id})`));
        }
        break;

      case 'cleanup':
        const cleanupResult = await dbUtils.cleanupOrphanedRecords();
        console.log('\n🧹 Cleanup Complete:\n');
        console.log(`Deleted Runs: ${cleanupResult.deletedRuns}`);
        console.log(`Deleted Leads: ${cleanupResult.deletedLeads}`);
        break;

      default:
        console.log(`
🗄️  Database Utilities

Usage:
  npm run db <command> [args]

Commands:
  list [user-id]              List all campaigns
  delete <name> [user-id]     Delete campaign by name
  delete-all <user-id>        Delete all campaigns for user
  delete-test [user-id]       Delete all test/demo campaigns
  inspect                     Show database overview
  orphaned                    Find orphaned records
  cleanup                     Clean up orphaned records

Examples:
  npm run db list
  npm run db delete "My Campaign"
  npm run db delete-test
  npm run db cleanup
        `);
    }
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// ES module check for direct execution
import { fileURLToPath } from 'url';
const isMainModule = import.meta.url === `file://${process.argv[1]}`;

if (isMainModule) {
  main();
}
