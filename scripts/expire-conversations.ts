import { runExpireConversations } from '@/lib/conversation-expiry';
import { prisma } from '@/lib/prisma';

async function main() {
  const result = await runExpireConversations();
  console.log(`Expired conversations: ${result.count}`);
}

if (require.main === module) {
  main().finally(() => prisma.$disconnect());
}
