import axios from 'axios';
import { env } from '../config/env.js';

class SlackService {
  private webhookUrl?: string;

  constructor() {
    this.webhookUrl = env.SLACK_WEBHOOK_URL;
  }

  /**
   * Send a notification to Slack when a campaign completes
   */
  async notifyCampaignComplete(
    campaignName: string,
    runId: string,
    stats: {
      totalLeads: number;
      successCount: number;
      failureCount: number;
      duration?: string;
    }
  ): Promise<boolean> {
    if (!this.webhookUrl) {
      console.log('Slack webhook URL not configured, skipping notification');
      return false;
    }

    try {
      const successRate = stats.totalLeads > 0
        ? ((stats.successCount / stats.totalLeads) * 100).toFixed(1)
        : '0';

      const message = {
        text: `🎉 Campaign Complete: ${campaignName}`,
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: `✅ Campaign Complete: ${campaignName}`,
              emoji: true
            }
          },
          {
            type: 'section',
            fields: [
              {
                type: 'mrkdwn',
                text: `*Total Leads:*\n${stats.totalLeads}`
              },
              {
                type: 'mrkdwn',
                text: `*Successful:*\n${stats.successCount} ✅`
              },
              {
                type: 'mrkdwn',
                text: `*Failed:*\n${stats.failureCount} ❌`
              },
              {
                type: 'mrkdwn',
                text: `*Success Rate:*\n${successRate}%`
              }
            ]
          },
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: `Run ID: \`${runId}\`${stats.duration ? ` • Duration: ${stats.duration}` : ''}`
              }
            ]
          }
        ]
      };

      await axios.post(this.webhookUrl, message, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 5000
      });

      console.log(`✓ Slack notification sent for campaign: ${campaignName}`);
      return true;
    } catch (error) {
      console.error('Failed to send Slack notification:', error);
      return false;
    }
  }

  /**
   * Send a notification when a campaign fails
   */
  async notifyCampaignFailed(
    campaignName: string,
    runId: string,
    errorMessage: string
  ): Promise<boolean> {
    if (!this.webhookUrl) {
      console.log('Slack webhook URL not configured, skipping notification');
      return false;
    }

    try {
      const message = {
        text: `❌ Campaign Failed: ${campaignName}`,
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: `❌ Campaign Failed: ${campaignName}`,
              emoji: true
            }
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Error:*\n\`\`\`${errorMessage}\`\`\``
            }
          },
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: `Run ID: \`${runId}\``
              }
            ]
          }
        ]
      };

      await axios.post(this.webhookUrl, message, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 5000
      });

      console.log(`✓ Slack failure notification sent for campaign: ${campaignName}`);
      return true;
    } catch (error) {
      console.error('Failed to send Slack notification:', error);
      return false;
    }
  }
}

export const slackService = new SlackService();
