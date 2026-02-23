import test from 'node:test';
import assert from 'node:assert/strict';
import { conversationStateAfterMessage, nextLikeStatus, canSendMessage, MESSAGE_CAP } from '@/lib/domain';

test('likes expire after 48h when pending', () => {
  const createdAt = new Date('2024-01-01T00:00:00Z');
  const after = new Date('2024-01-03T00:00:01Z');
  assert.equal(nextLikeStatus(createdAt, after, 'pending'), 'expired');
});

test('conversation gates at 15 messages', () => {
  assert.equal(canSendMessage('active', MESSAGE_CAP - 1), true);
  assert.equal(conversationStateAfterMessage(MESSAGE_CAP), 'gated_to_video');
  assert.equal(canSendMessage('gated_to_video', MESSAGE_CAP), false);
});
