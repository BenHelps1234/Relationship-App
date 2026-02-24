import test from 'node:test';
import assert from 'node:assert/strict';
import { conversationStateAfterMessage, nextLikeStatus, canSendMessage, MESSAGE_CAP, isConversationInactive } from '@/lib/domain';

test('likes expire strictly from expiresAt when pending', () => {
  const expiresAt = new Date('2024-01-03T00:00:00Z');
  const after = new Date('2024-01-03T00:00:01Z');
  assert.equal(nextLikeStatus(expiresAt, after, 'pending'), 'expired');
});

test('conversation gates at 15 total messages', () => {
  assert.equal(canSendMessage('active', MESSAGE_CAP - 1), true);
  assert.equal(conversationStateAfterMessage(MESSAGE_CAP), 'gated_to_video');
  assert.equal(canSendMessage('active', MESSAGE_CAP), false);
});

test('conversation expires after 72 hours of inactivity', () => {
  const baseline = new Date('2024-01-01T00:00:00Z');
  const stillActiveAt = new Date('2024-01-03T23:59:59Z');
  const staleAt = new Date('2024-01-04T00:00:00Z');
  assert.equal(isConversationInactive(baseline, stillActiveAt), false);
  assert.equal(isConversationInactive(baseline, staleAt), true);
});
