import { Router } from "express";
import { authMiddleware, roleMiddleware, validateMiddleware } from "../middlewares";
import {
  createSupplierBody,
  CreateSupplierInput,
  replySupplierMessageBody,
  ReplySupplierMessageInput,
  sendSupplierMessageBody,
  SendSupplierMessageInput,
  updateSupplierBody,
  UpdateSupplierInput
} from "../schemas";
import { IngredientModel, SupplierMessageModel, SupplierModel } from "../models";
import { buildAccountScope, getOwnerPatch, loadRequestUser } from "../services/accountScopeService";
import { sendSupplierMessageEmail } from "../utils/email";

const supplierRouter = Router();
const supplierMessagePopulate = { path: "supplier", select: "name email contactName phone active" };

supplierRouter.get("/", authMiddleware, async (req, res): Promise<void> => {
  const user = await loadRequestUser(req);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  if (user.role === "supplier") {
    const supplier = await SupplierModel.findOne({ portalUser: user._id }).exec();
    res.json(supplier ? [supplier] : []);
    return;
  }

  const suppliers = await SupplierModel.find(buildAccountScope(user)).sort({ name: 1 }).exec();
  res.json(suppliers);
});

supplierRouter.get("/messages", authMiddleware, async (req, res): Promise<void> => {
  const user = await loadRequestUser(req);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  if (user.role === "supplier") {
    const supplier = await SupplierModel.findOne({ portalUser: user._id }).exec();
    if (!supplier) {
      res.status(404).json({ error: "Supplier account is not linked" });
      return;
    }

    const messages = await SupplierMessageModel.find({ supplier: supplier._id })
      .populate(supplierMessagePopulate)
      .sort({ created_at: -1 })
      .limit(80)
      .exec();

    res.json(messages);
    return;
  }

  const messages = await SupplierMessageModel.find(buildAccountScope(user))
    .populate(supplierMessagePopulate)
    .sort({ created_at: -1 })
    .limit(80)
    .exec();

  res.json(messages);
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

supplierRouter.post(
  "/messages",
  authMiddleware,
  roleMiddleware(["admin", "manager"]),
  validateMiddleware({ body: sendSupplierMessageBody }),
  async (req, res): Promise<void> => {
    const user = await loadRequestUser(req);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const payload = req.body as SendSupplierMessageInput;
    const supplier = await SupplierModel.findOne(
      buildAccountScope(user, { _id: payload.supplier })
    ).exec();

    if (!supplier) {
      res.status(404).json({ error: "Supplier not found" });
      return;
    }

    if (!supplier.email) {
      res.status(400).json({ error: "Supplier has no email configured" });
      return;
    }

    try {
      await sendSupplierMessageEmail({
        to: supplier.email,
        supplierName: supplier.name,
        restaurantName: user.restaurantName || "Mon restaurant",
        subject: payload.subject,
        body: payload.body
      });

      const message = await SupplierMessageModel.create({
        supplier: supplier._id,
        owner: user._id,
        subject: payload.subject,
        body: payload.body,
        direction: "outbound",
        from: user.email,
        to: supplier.email,
        status: "sent",
        sentAt: new Date()
      });
      await message.populate(supplierMessagePopulate);

      res.status(201).json(message);
    } catch (error) {
      const message = await SupplierMessageModel.create({
        supplier: supplier._id,
        owner: user._id,
        subject: payload.subject,
        body: payload.body,
        direction: "outbound",
        from: user.email,
        to: supplier.email,
        status: "failed",
        sentAt: null,
        errorMessage: error instanceof Error ? error.message : "Email send failed"
      });
      await message.populate(supplierMessagePopulate);

      res.status(502).json({ error: "Supplier email could not be sent", message });
    }
  }
);

supplierRouter.post(
  "/messages/reply",
  authMiddleware,
  roleMiddleware(["supplier"]),
  validateMiddleware({ body: replySupplierMessageBody }),
  async (req, res): Promise<void> => {
    const user = await loadRequestUser(req);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const supplier = await SupplierModel.findOne({ portalUser: user._id }).exec();
    if (!supplier) {
      res.status(404).json({ error: "Supplier account is not linked" });
      return;
    }

    const payload = req.body as ReplySupplierMessageInput;
    const message = await SupplierMessageModel.create({
      supplier: supplier._id,
      owner: supplier.owner ?? null,
      subject: payload.subject,
      body: payload.body,
      direction: "inbound",
      from: user.email,
      to: "restaurant",
      status: "sent",
      sentAt: new Date()
    });
    await message.populate(supplierMessagePopulate);

    res.status(201).json(message);
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
