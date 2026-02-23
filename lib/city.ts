import { prisma } from './prisma';

const ACTIVE_WINDOW_DAYS = 30;

export function activeSinceDate(): Date {
  return new Date(Date.now() - ACTIVE_WINDOW_DAYS * 24 * 60 * 60 * 1000);
}

export async function refreshCityStatus(cityId?: string) {
  const cities = cityId ? await prisma.city.findMany({ where: { id: cityId } }) : await prisma.city.findMany();
  const since = activeSinceDate();

  for (const city of cities) {
    const totalUsersActive = await prisma.user.count({
      where: {
        cityId: city.id,
        accountStatus: 'active',
        isFrozen: false,
        lastActiveAt: { gte: since }
      }
    });

    await prisma.cityStatus.upsert({
      where: { cityId: city.id },
      update: { totalUsersActive, threshold: city.threshold },
      create: { cityId: city.id, totalUsersActive, threshold: city.threshold }
    });
  }
}
