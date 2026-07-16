import { Router } from "express";
import { authMiddleware, roleMiddleware, validateMiddleware } from "../middlewares";
import { savePaymentCardBody, SavePaymentCardInput } from "../schemas";
import { PaymentCardModel } from "../models";
import { buildAccountScope, loadRequestUser } from "../services/accountScopeService";
import { detectCardBrand, getCardLast4, isCardExpired, isValidCardNumber } from "../services/paymentCardService";

const paymentCardRouter = Router();

paymentCardRouter.get("/", authMiddleware, async (req, res): Promise<void> => {
  const user = await loadRequestUser(req);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const cards = await PaymentCardModel.find(buildAccountScope(user)).sort({ created_at: -1 }).exec();
  res.json(cards);
});

paymentCardRouter.post(
  "/",
  authMiddleware,
  roleMiddleware(["admin", "manager"]),
  validateMiddleware({ body: savePaymentCardBody }),
  async (req, res): Promise<void> => {
    const user = await loadRequestUser(req);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const payload = req.body as SavePaymentCardInput;

    if (!isValidCardNumber(payload.cardNumber)) {
      res.status(400).json({ error: "Numero de carte invalide" });
      return;
    }

    if (isCardExpired(payload.expiryMonth, payload.expiryYear)) {
      res.status(400).json({ error: "Carte expiree" });
      return;
    }

    const brand = detectCardBrand(payload.cardNumber);
    const last4 = getCardLast4(payload.cardNumber);

    const existing = await PaymentCardModel.findOne(buildAccountScope(user, {
      brand,
      last4,
      expiryMonth: payload.expiryMonth,
      expiryYear: payload.expiryYear
    })).exec();

    if (existing) {
      res.json(existing);
      return;
    }

    const card = await PaymentCardModel.create({
      holder: payload.holder.trim(),
      brand,
      last4,
      expiryMonth: payload.expiryMonth,
      expiryYear: payload.expiryYear,
      label: payload.label.trim(),
      owner: user._id
    });

    res.status(201).json(card);
  }
);

paymentCardRouter.delete(
  "/:id",
  authMiddleware,
  roleMiddleware(["admin", "manager"]),
  async (req, res): Promise<void> => {
    const user = await loadRequestUser(req);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const deleted = await PaymentCardModel.findOneAndDelete(
      buildAccountScope(user, { _id: req.params.id })
    ).exec();

    if (!deleted) {
      res.status(404).json({ error: "Payment card not found" });
      return;
    }

    res.status(204).send();
  }
);

export { paymentCardRouter };
