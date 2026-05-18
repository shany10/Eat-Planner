import { Router } from "express";
import { authMiddleware, roleMiddleware, validateMiddleware } from "../middlewares";
import { createSupplierBody, CreateSupplierInput, updateSupplierBody, UpdateSupplierInput } from "../schemas";
import { IngredientModel, SupplierModel } from "../models";

const supplierRouter = Router();

supplierRouter.get("/", authMiddleware, async (_req, res): Promise<void> => {
  const suppliers = await SupplierModel.find().sort({ name: 1 }).exec();
  res.json(suppliers);
});

supplierRouter.post(
  "/",
  authMiddleware,
  roleMiddleware(["admin", "manager"]),
  validateMiddleware({ body: createSupplierBody }),
  async (req, res): Promise<void> => {
    const supplier = await SupplierModel.create(req.body as CreateSupplierInput);
    res.status(201).json(supplier);
  }
);

supplierRouter.patch(
  "/:id",
  authMiddleware,
  roleMiddleware(["admin", "manager"]),
  validateMiddleware({ body: updateSupplierBody }),
  async (req, res): Promise<void> => {
    const supplier = await SupplierModel.findByIdAndUpdate(req.params.id, req.body as UpdateSupplierInput, {
      new: true
    }).exec();

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
    const linkedIngredient = await IngredientModel.findOne({ supplier: req.params.id }).exec();
    if (linkedIngredient) {
      res.status(409).json({ error: "Supplier is still linked to ingredients" });
      return;
    }

    const deleted = await SupplierModel.findByIdAndDelete(req.params.id).exec();
    if (!deleted) {
      res.status(404).json({ error: "Supplier not found" });
      return;
    }

    res.status(204).send();
  }
);

export { supplierRouter };
