import { z } from 'zod';

export const recommendationSchema = z.enum(['BAD_PRICE', 'NORMAL_PRICE', 'GOOD_PRICE', 'BUY', 'GREAT_DEAL']);
export type RecommendationLabel = z.infer<typeof recommendationSchema>;
