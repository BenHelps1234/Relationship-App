import { ConversationState, LikeStatus } from '@prisma/client';

export const DAILY_PROFILE_LIMIT = 25;
export const DAILY_LIKE_LIMIT = 5;
export const ACTIVE_CONVERSATION_LIMIT = 5;
export const MESSAGE_CAP = 15;

export function nextLikeStatus(expiresAt: Date, now: Date, current: LikeStatus): LikeStatus {
  if (current !== LikeStatus.pending) return current;
  return now >= expiresAt ? LikeStatus.expired : LikeStatus.pending;
}

export function canSendMessage(state: ConversationState, messageCountTotal: number): boolean {
  return state === ConversationState.active && messageCountTotal < MESSAGE_CAP;
}

export function conversationStateAfterMessage(countAfterSend: number): ConversationState {
  return countAfterSend >= MESSAGE_CAP ? ConversationState.gated_to_video : ConversationState.active;
}
