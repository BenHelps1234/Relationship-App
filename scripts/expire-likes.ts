import { prisma } from '@/lib/prisma';

async function main() {
  const result = await prisma.like.updateMany({
    where: { status: 'pending', expiresAt: { lte: new Date() } },
    data: { status: 'expired' }
  });
  console.log(`Expired likes: ${result.count}`);
}

main().finally(() => prisma.$disconnect());
