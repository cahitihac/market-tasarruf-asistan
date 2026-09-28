export const keys = {
  needs: ['needs'] as const,
  need: (id: string) => ['needs', id] as const,
  offers: (id: string) => ['needs', id, 'offers'] as const,
  deals: (all: boolean) => ['deals', all] as const,
  deal: (id: string) => ['deals', id] as const,
  history: (id: string) => ['deals', id, 'history'] as const,
  notifications: ['notifications'] as const,
  pushDevices: ['push', 'devices'] as const,
  notificationPreferences: ['push', 'preferences'] as const,
  health: ['health'] as const,
  sessions: ['auth', 'sessions'] as const,
};
