import { Router } from "express";
import { authMiddleware, roleMiddleware, validateMiddleware } from "../middlewares";
import { saveDailyForecastBody, SaveDailyForecastInput, updateForecastCorrectionBody, UpdateForecastCorrectionInput } from "../schemas";
import { buildDailyForecast, loadSavedDailyForecast, saveDailyForecast, updateForecastCorrection } from "../services/forecastService";
import { loadRequestUser } from "../services/accountScopeService";

const forecastRouter = Router();

forecastRouter.get("/daily", authMiddleware, async (req, res): Promise<void> => {
  try {
    const user = await loadRequestUser(req);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const date = typeof req.query.date === "string" ? req.query.date : undefined;
    const savedForecast = await loadSavedDailyForecast(date, user);
    const forecast = savedForecast ?? await buildDailyForecast(date, user);

    res.json(forecast);
  } catch {
    res.status(500).json({ error: "Unable to generate forecast" });
  }
});

forecastRouter.post(
  "/daily",
  authMiddleware,
  roleMiddleware(["admin", "manager"]),
  validateMiddleware({ body: saveDailyForecastBody }),
  async (req, res): Promise<void> => {
    try {
      const user = await loadRequestUser(req);
      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      const input = req.body as SaveDailyForecastInput;
      const forecast = await saveDailyForecast(input.date, user);
      res.status(201).json(forecast);
    } catch {
      res.status(500).json({ error: "Unable to save forecast" });
    }
  }
);

forecastRouter.patch(
  "/:id/recommendations/:dishId/correction",
  authMiddleware,
  roleMiddleware(["admin", "manager"]),
  validateMiddleware({ body: updateForecastCorrectionBody }),
  async (req, res): Promise<void> => {
    try {
      const user = await loadRequestUser(req);
      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      const input = req.body as UpdateForecastCorrectionInput;
      const { id, dishId } = req.params;
      if (!id || !dishId) {
        res.status(400).json({ error: "Forecast id and dish id are required" });
        return;
      }

      const forecast = await updateForecastCorrection(
        id,
        dishId,
        input.correctionQuantity,
        input.correctionComment,
        user
      );

      if (!forecast) {
        res.status(404).json({ error: "Forecast recommendation not found" });
        return;
      }

      res.json(forecast);
    } catch {
      res.status(500).json({ error: "Unable to update forecast correction" });
    }
  }
);

export { forecastRouter };
