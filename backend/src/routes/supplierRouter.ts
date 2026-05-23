import { Router } from "express";
import { authMiddleware, roleMiddleware, validateMiddleware } from "../middlewares";
import { createSupplierBody, CreateSupplierInput, updateSupplierBody, UpdateSupplierInput } from "../schemas";
import { IngredientModel, SupplierModel } from "../models";
import { buildAccountScope, getOwnerPatch, loadRequestUser } from "../services/accountScopeService";

const supplierRouter = Router();

supplierRouter.get("/", authMiddleware, async (req, res): Promise<void> => {
  const user = await loadRequestUser(req);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const suppliers = await SupplierModel.find(buildAccountScope(user)).sort({ name: 1 }).exec();
  res.json(suppliers);
});

supplierRouter.post(
  "/",
  authMiddleware,
  roleMiddleware(["admin", "manager"]),
  validateMiddleware({ body: createSupplierBody }),
  async (req, res): Promise<void> => {
    const user = await loadRequestUser(req);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const supplier = await SupplierModel.create({
      ...(req.body as CreateSupplierInput),
      owner: user._id
    });
    res.status(201).json(supplier);
  }
);

supplierRouter.patch(
  "/:id",
  authMiddleware,
  roleMiddleware(["admin", "manager"]),
  validateMiddleware({ body: updateSupplierBody }),
  async (req, res): Promise<void> => {
    const user = await loadRequestUser(req);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const supplier = await SupplierModel.findOneAndUpdate(
      buildAccountScope(user, { _id: req.params.id }),
      {
        ...(req.body as UpdateSupplierInput),
        ...getOwnerPatch(user)
      },
      { new: true }
    ).exec();

    if (!supplier) {
      res.status(404).json({ error: "Supplier not found" });
      return;
    }

    res.json(supplier);
  }
);

supplierRouter.delete(
  "/:id",
  authMiddleware,
  roleMiddleware(["admin", "manager"]),
  async (req, res): Promise<void> => {
    const user = await loadRequestUser(req);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const linkedIngredient = await IngredientModel.findOne(
      buildAccountScope(user, { supplier: req.params.id })
    ).exec();
    if (linkedIngredient) {
      res.status(409).json({ error: "Supplier is still linked to ingredients" });
      return;
    }

    const deleted = await SupplierModel.findOneAndDelete(
      buildAccountScope(user, { _id: req.params.id })
    ).exec();
    if (!deleted) {
      res.status(404).json({ error: "Supplier not found" });
      return;
    }

    res.status(204).send();
  }
);

export { supplierRouter };
