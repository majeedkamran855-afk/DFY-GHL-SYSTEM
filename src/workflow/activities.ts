// activities.ts — Temporal Activities invoked by dripCampaignWorkflow.
// These are the actual side-effecting operations (each should be idempotent and
// safely retryable, since Temporal will retry on failure per the policy in workflow.ts).
//
// This is a stub — wire each function to the corresponding microservice
// (Telephony Service for sendSms/sendRvm/placeCall, CRM Service for updateDealStage, etc).

import type { WorkflowContext } from './workflow';

export async function sendSms(
  params: WorkflowContext & { template: string }
): Promise<void> {
  // TODO: call Telephony Service SMS endpoint, respecting 10DLC throughput limits and DNC flags
  throw new Error('Not implemented: sendSms');
}

export async function sendRvm(
  params: WorkflowContext & { audioUrl: string }
): Promise<void> {
  // TODO: call Telephony Service RVM drop endpoint
  throw new Error('Not implemented: sendRvm');
}

export async function placeCall(
  params: WorkflowContext & {
    script?: string;
    dialerType?: 'power' | 'single';
    aiAgent?: boolean;
    systemPrompt?: string;
  }
): Promise<void> {
  // TODO: call Telephony Service to originate a call (human power-dial queue or AI voice agent)
  throw new Error('Not implemented: placeCall');
}

export async function callWebhook(
  params: { url: string; payload: unknown }
): Promise<void> {
  // TODO: POST payload to params.url with retry/backoff and signature header
  throw new Error('Not implemented: callWebhook');
}

export async function evaluateCondition(
  params: WorkflowContext & { rule: Record<string, any> }
): Promise<boolean> {
  // TODO: evaluate a stored condition (field comparison, tag presence, or AI classification)
  // against current CRM state for this contact/deal.
  throw new Error('Not implemented: evaluateCondition');
}

export async function updateDealStage(
  params: { dealId: string; stage: string }
): Promise<void> {
  // TODO: call CRM Service to update Deal.stage and write a DealStageHistory row
  throw new Error('Not implemented: updateDealStage');
}
