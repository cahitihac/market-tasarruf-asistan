export const routes = {
  need: (id: string) => ({ pathname: '/needs/[id]' as const, params: { id } }),
  deal: (id: string) => ({ pathname: '/deals/[id]' as const, params: { id } }),
  form: (id?: string) => id ? ({ pathname: '/need-form' as const, params: { id } }) : '/need-form' as const,
};
