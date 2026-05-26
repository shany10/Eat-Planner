import { z } from "zod";

export const saveDailyForecastBody = z.object({
  date: z.string().min(1).optional()
});

export const updateForecastCorrectionBody = z.object({
  correctionQuantity: z.number().int().min(0),
  correctionComment: z.string().max(280).optional().default("")
});

export type SaveDailyForecastInput = z.infer<typeof saveDailyForecastBody>;
export type UpdateForecastCorrectionInput = z.infer<typeof updateForecastCorrectionBody>;
