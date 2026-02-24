import { prisma } from '@/lib/prisma';
import { refreshMarketScores } from '@/services/market';

export async function runReliabilityRefresh() {
  await refreshMarketScores();
}

async function main() {
  await runReliabilityRefresh();
  console.log('Market scores refreshed.');
}

if (require.main === module) {
  main().finally(() => prisma.$disconnect());
}
