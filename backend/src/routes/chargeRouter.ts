import { Router } from "express";
import { authMiddleware, roleMiddleware, validateMiddleware } from "../middlewares";
import { createChargeBody, CreateChargeInput, updateChargeBody, UpdateChargeInput } from "../schemas";
import { ChargeModel } from "../models";
import { buildAccountScope, getOwnerPatch, loadRequestUser } from "../services/accountScopeService";

const chargeRouter = Router();

chargeRouter.get("/", authMiddleware, async (req, res): Promise<void> => {
  const user = await loadRequestUser(req);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const charges = await ChargeModel.find(buildAccountScope(user)).sort({ created_at: -1 }).exec();
  res.json(charges);
});

chargeRouter.post(
  "/",
  authMiddleware,
  roleMiddleware(["admin", "manager"]),
  validateMiddleware({ body: createChargeBody }),
  async (req, res): Promise<void> => {
    const user = await loadRequestUser(req);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const charge = await ChargeModel.create({
      ...(req.body as CreateChargeInput),
      owner: user._id
    });
    res.status(201).json(charge);
  }
);

chargeRouter.patch(
  "/:id",
  authMiddleware,
  roleMiddleware(["admin", "manager"]),
  validateMiddleware({ body: updateChargeBody }),
  async (req, res): Promise<void> => {
    const user = await loadRequestUser(req);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const charge = await ChargeModel.findOneAndUpdate(
      buildAccountScope(user, { _id: req.params.id }),
      {
        ...(req.body as UpdateChargeInput),
        ...getOwnerPatch(user)
      },
      { new: true }
    ).exec();

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
    const user = await loadRequestUser(req);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const deleted = await ChargeModel.findOneAndDelete(
      buildAccountScope(user, { _id: req.params.id })
    ).exec();
    if (!deleted) {
      res.status(404).json({ error: "Charge not found" });
      return;
    }

    res.status(204).send();
  }
);

export { chargeRouter };
