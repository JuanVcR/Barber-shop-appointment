export type BarbershopPlan = 'FREE' | 'BASIC' | 'PRO';

export const barbershopPlanLimits: Record<
  BarbershopPlan,
  { barbers: number | null; services: number | null }
> = {
  FREE: { barbers: 2, services: 5 },
  BASIC: { barbers: 10, services: 20 },
  PRO: { barbers: null, services: null },
};
