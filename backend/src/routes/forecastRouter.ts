import { Router } from "express";
import { authMiddleware } from "../middlewares";
import { buildDailyForecast } from "../services/forecastService";

const forecastRouter = Router();

forecastRouter.get("/daily", authMiddleware, async (req, res): Promise<void> => {
  try {
    const forecast = await buildDailyForecast(
      typeof req.query.date === "string" ? req.query.date : undefined
    );

    res.json(forecast);
  } catch {
    res.status(500).json({ error: "Unable to generate forecast" });
  }
});

export { forecastRouter };
