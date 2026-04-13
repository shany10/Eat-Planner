import { Router } from "express";
import { authMiddleware, roleMiddleware, validateMiddleware } from "../middlewares";
import { createChargeBody, CreateChargeInput, updateChargeBody, UpdateChargeInput } from "../schemas";
import { ChargeModel } from "../models";

const chargeRouter = Router();

chargeRouter.get("/", authMiddleware, async (_req, res): Promise<void> => {
  const charges = await ChargeModel.find().sort({ created_at: -1 }).exec();
  res.json(charges);
});

chargeRouter.post(
  "/",
  authMiddleware,
  roleMiddleware(["admin", "manager"]),
  validateMiddleware({ body: createChargeBody }),
  async (req, res): Promise<void> => {
    const charge = await ChargeModel.create(req.body as CreateChargeInput);
    res.status(201).json(charge);
  }
);

chargeRouter.patch(
  "/:id",
  authMiddleware,
  roleMiddleware(["admin", "manager"]),
  validateMiddleware({ body: updateChargeBody }),
  async (req, res): Promise<void> => {
    const charge = await ChargeModel.findByIdAndUpdate(req.params.id, req.body as UpdateChargeInput, {
      new: true
    }).exec();

    if (!charge) {
      res.status(404).json({ error: "Charge not found" });
      return;
    }

    res.json(charge);
  }
);

chargeRouter.delete(
  "/:id",
  authMiddleware,
  roleMiddleware(["admin", "manager"]),
  async (req, res): Promise<void> => {
    const deleted = await ChargeModel.findByIdAndDelete(req.params.id).exec();
    if (!deleted) {
      res.status(404).json({ error: "Charge not found" });
      return;
    }

    res.status(204).send();
  }
);

export { chargeRouter };
