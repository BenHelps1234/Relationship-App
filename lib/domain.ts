export const DAILY_PROFILE_LIMIT = 25;
export const DAILY_LIKE_LIMIT = 5;
export const ACTIVE_CONVERSATION_LIMIT = 5;
export const MESSAGE_CAP = 15;
export const CONVERSATION_INACTIVITY_MS = 72 * 3600 * 1000;
export type LikeStatusValue = 'pending' | 'matched' | 'expired' | 'passed';
export type ConversationStateValue = 'active' | 'gated_to_video' | 'ended' | 'frozen';

export function nextLikeStatus(expiresAt: Date, now: Date, current: LikeStatusValue): LikeStatusValue {
  if (current !== 'pending') return current;
  return now >= expiresAt ? 'expired' : 'pending';
}

export function canSendMessage(state: ConversationStateValue, totalMessageCount: number): boolean {
  return state === 'active' && totalMessageCount < MESSAGE_CAP;
}

export function conversationStateAfterMessage(totalCountAfterSend: number): ConversationStateValue {
  return totalCountAfterSend >= MESSAGE_CAP ? 'gated_to_video' : 'active';
}

export function isConversationInactive(referenceTime: Date, now = new Date()): boolean {
  return now.getTime() - referenceTime.getTime() >= CONVERSATION_INACTIVITY_MS;
}
