import { prisma } from '@/lib/prisma';

export async function runExpireLikes() {
  return prisma.like.updateMany({
    where: { status: 'pending', expiresAt: { lte: new Date() } },
    data: { status: 'expired' }
  });
}

async function main() {
  const result = await runExpireLikes();
  console.log(`Expired likes: ${result.count}`);
}

if (require.main === module) {
  main().finally(() => prisma.$disconnect());
}
