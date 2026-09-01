// workflow.ts — Temporal Workflow definition, one instance per contact-per-campaign-enrollment
//
// Compiled from the React Flow visual builder's JSON graph. Each node type maps to a
// strongly-typed Temporal Activity (see ./activities.ts). Using Temporal here (rather than
// a raw BullMQ delayed job) is what lets a multi-day drip survive worker restarts/deploys
// and be interrupted mid-sleep by a signal (e.g. the lead replies "STOP" or books an appointment).

import { proxyActivities, sleep, condition, defineSignal, setHandler } from '@temporalio/workflow';
import type * as activities from './activities';

const { sendSms, sendRvm, placeCall, callWebhook, evaluateCondition, updateDealStage } =
  proxyActivities<typeof activities>({
    startToCloseTimeout: '1 minute',
    retry: { maximumAttempts: 5, backoffCoefficient: 2 },
  });

export const stopSignal = defineSignal<[]>('stop'); // fired if lead replies "STOP" or books appt

export interface WorkflowNode {
  id: string;
  type: 'sms' | 'rvm' | 'call' | 'delay' | 'condition' | 'webhook' | 'ai_agent' | 'update_stage';
  config: Record<string, any>;
  next: string | { true: string; false: string };
}

export interface WorkflowContext {
  contactId: string;
  dealId: string;
  organizationId: string;
}

export async function dripCampaignWorkflow(
  graph: Record<string, WorkflowNode>,
  startNodeId: string,
  context: WorkflowContext
): Promise<void> {
  let stopped = false;
  setHandler(stopSignal, () => {
    stopped = true;
  });

  let currentNodeId: string | null = startNodeId;

  while (currentNodeId && !stopped) {
    const node = graph[currentNodeId];

    switch (node.type) {
      case 'sms':
        await sendSms({ ...context, template: node.config.template });
        currentNodeId = node.next as string;
        break;

      case 'rvm':
        await sendRvm({ ...context, audioUrl: node.config.audioUrl });
        currentNodeId = node.next as string;
        break;

      case 'call':
        await placeCall({ ...context, script: node.config.script, dialerType: 'power' });
        currentNodeId = node.next as string;
        break;

      case 'delay': {
        // condition() lets the STOP signal interrupt a multi-day sleep instantly
        await condition(() => stopped, node.config.durationMs);
        currentNodeId = stopped ? null : (node.next as string);
        break;
      }

      case 'condition': {
        const result = await evaluateCondition({ ...context, rule: node.config.rule });
        const branches = node.next as { true: string; false: string };
        currentNodeId = result ? branches.true : branches.false;
        break;
      }

      case 'webhook':
        await callWebhook({ url: node.config.url, payload: context });
        currentNodeId = node.next as string;
        break;

      case 'ai_agent':
        await placeCall({ ...context, aiAgent: true, systemPrompt: node.config.systemPrompt });
        currentNodeId = node.next as string;
        break;

      case 'update_stage':
        await updateDealStage({ dealId: context.dealId, stage: node.config.stage });
        currentNodeId = node.next as string;
        break;

      default:
        currentNodeId = null;
    }
  }
}
