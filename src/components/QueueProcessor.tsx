import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { agaBackend } from '@/services/agaBackend';

/**
 * QueueProcessor - Monitors the queue and triggers webhooks for the next run
 * when active runs complete.
 *
 * This component:
 * 1. Subscribes to changes in the campaign_runs table
 * 2. When a run status changes to "Completed" or "Done"
 * 3. Checks if there are any "In Queue" runs waiting
 * 4. Triggers the webhook for the oldest queued run
 */
export function QueueProcessor() {
  const { user } = useAuth();
  const processingRef = useRef(false);

  const processQueue = async () => {
    // Prevent concurrent processing
    if (processingRef.current || !user) return;
    processingRef.current = true;

    try {
      // Check if there are any active runs (not completed)
      const { data: activeRuns, error: activeError } = await supabase
        .from('campaign_runs')
        .select('run_id, status')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (activeError) {
        console.error('Error checking active runs:', activeError);
        return;
      }

      // Filter out completed runs
      const nonCompletedRuns = activeRuns?.filter(run => {
        const status = run.status?.toLowerCase() || '';
        return status !== 'done' && status !== 'completed';
      }) || [];

      // Find queued runs and other active runs
      const queuedRuns = nonCompletedRuns.filter(run =>
        run.status?.toLowerCase() === 'in queue'
      );
      const processingRuns = nonCompletedRuns.filter(run =>
        run.status?.toLowerCase() !== 'in queue'
      );

      console.log('[QueueProcessor] Active runs:', {
        queued: queuedRuns.length,
        processing: processingRuns.length
      });

      // If there are no processing runs and there are queued runs, start the first one
      if (processingRuns.length === 0 && queuedRuns.length > 0) {
        const nextRun = queuedRuns[0];
        console.log('[QueueProcessor] Starting next queued run:', nextRun.run_id);

        // Get the campaign details for this run
        const { data: runDetails, error: runError } = await supabase
          .from('campaign_runs')
          .select('campaign_name')
          .eq('run_id', nextRun.run_id)
          .single();

        if (runError || !runDetails?.campaign_name) {
          console.error('Error getting run details:', runError);
          return;
        }

        // Get the campaign and its webhook payload
        const { data: campaign, error: campaignError } = await supabase
          .from('campaigns')
          .select('webhook_payload, id')
          .eq('name', runDetails.campaign_name)
          .eq('user_id', user.id)
          .single();

        if (campaignError || !campaign?.webhook_payload) {
          console.error('Error getting campaign webhook payload:', campaignError);
          return;
        }

        // Reconstruct the FormData for the webhook
        const webhookPayload = campaign.webhook_payload as any;
        const formData = new FormData();

        // Add all the stored payload fields
        Object.keys(webhookPayload).forEach(key => {
          if (key !== 'csvFileName' && key !== 'csvFileSize') {
            formData.append(key, webhookPayload[key]);
          }
        });

        // For CSV uploads, we need to get the file from campaign_leads
        if (webhookPayload.leadSource === 'csv') {
          // Get the CSV data from campaign_leads
          const { data: campaignLeads, error: leadsError } = await supabase
            .from('campaign_leads')
            .select('csv_cache')
            .eq('campaign_id', campaign.id)
            .single();

          if (leadsError) {
            console.error('[QueueProcessor] Error getting campaign leads:', leadsError);
            // Mark run as failed if we can't get the CSV
            await supabase
              .from('campaign_runs')
              .update({ status: 'Failed - CSV file not found' })
              .eq('run_id', nextRun.run_id);
            return;
          } else if (campaignLeads?.csv_cache) {
            // Convert the stored CSV data back to a file-like object
            const csvData = campaignLeads.csv_cache as any;
            if (csvData.content) {
              console.log('[QueueProcessor] Reconstructing CSV file:', csvData.fileName);
              const blob = new Blob([csvData.content], { type: 'text/csv' });
              const file = new File([blob], csvData.fileName || 'leads.csv', {
                type: 'text/csv'
              });
              formData.append('csvFile', file);
            } else {
              console.error('[QueueProcessor] CSV cache exists but has no content');
              await supabase
                .from('campaign_runs')
                .update({ status: 'Failed - CSV content missing' })
                .eq('run_id', nextRun.run_id);
              return;
            }
          } else {
            console.error('[QueueProcessor] No CSV cache found in campaign_leads');
            await supabase
              .from('campaign_runs')
              .update({ status: 'Failed - CSV cache not found' })
              .eq('run_id', nextRun.run_id);
            return;
          }
        }

        // Trigger the custom backend
        try {
          console.log('[QueueProcessor] Triggering custom backend for run:', nextRun.run_id);

          // Prepare backend request
          const backendRequest: any = {
            leadSource: webhookPayload.leadSource as 'csv' | 'apollo',
            campaign_id: webhookPayload.campaign_id,
            campaign_leads_id: webhookPayload.campaign_leads_id,
            user_id: webhookPayload.user_id,
            run_id: nextRun.run_id,
            campaignName: webhookPayload.campaignName,
            perplexityPrompt: webhookPayload.perplexityPrompt,
            personalizationPrompt: webhookPayload.personalizationPrompt,
            promptTask: webhookPayload.promptTask,
            promptGuidelines: webhookPayload.promptGuidelines,
            promptExample: webhookPayload.promptExample,
            personalizationStrategy: webhookPayload.personalizationStrategy,
            rerun: webhookPayload.rerun || 'false'
          };

          // Add CSV file if available
          if (webhookPayload.leadSource === 'csv' && campaignLeads?.csv_cache) {
            const csvData = campaignLeads.csv_cache as any;
            if (csvData.content) {
              const blob = new Blob([csvData.content], { type: 'text/csv' });
              const file = new File([blob], csvData.fileName || 'leads.csv', { type: 'text/csv' });
              backendRequest.csv_file = file;
            }
          }

          // Add Apollo parameters if available
          if (webhookPayload.leadSource === 'apollo') {
            backendRequest.apolloUrl = webhookPayload.apolloUrl;
            backendRequest.leadCount = webhookPayload.leadCount;
          }

          const response = await agaBackend.processCampaign(backendRequest);
          console.log('[QueueProcessor] Backend processing started successfully:', response);
        } catch (error) {
          console.error('[QueueProcessor] Backend error:', error);
          // Update run status to failed
          await supabase
            .from('campaign_runs')
            .update({
              status: 'Failed',
              error_message: error instanceof Error ? error.message : 'Unknown error'
            })
            .eq('run_id', nextRun.run_id);
        }
      }
    } catch (error) {
      console.error('[QueueProcessor] Error processing queue:', error);
    } finally {
      processingRef.current = false;
    }
  };

  useEffect(() => {
    if (!user) return;

    // Process queue on mount
    processQueue();

    // Subscribe to changes in AGA Runs Progress
    const channel = supabase
      .channel('queue-processor')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'campaign_runs',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('[QueueProcessor] Run status changed:', payload);

          // When a run completes or status changes, process the queue
          if (payload.eventType === 'UPDATE' || payload.eventType === 'DELETE') {
            const status = (payload.new as any)?.status?.toLowerCase();
            if (status === 'completed' || status === 'done' || payload.eventType === 'DELETE') {
              console.log('[QueueProcessor] Run completed, processing queue...');
              // Small delay to ensure database is consistent
              setTimeout(processQueue, 1000);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // This component doesn't render anything
  return null;
}
