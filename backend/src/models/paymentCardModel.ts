import { Document, Schema, Types, model } from "mongoose";
import { CARD_BRANDS, CardBrand } from "../types/business";

// Carte de paiement "tokenisee" : on ne conserve jamais le numero complet
// ni le cryptogramme, uniquement de quoi identifier la carte a l'ecran.
export interface IPaymentCard extends Document {
  holder: string;
  brand: CardBrand;
  last4: string;
  expiryMonth: number;
  expiryYear: number;
  label: string;
  owner?: Types.ObjectId | null;
  created_at: Date;
  updated_at: Date;
}

const paymentCardSchema = new Schema<IPaymentCard>({
  holder: { type: String, required: true, trim: true },
  brand: { type: String, enum: CARD_BRANDS, required: true },
  last4: { type: String, required: true, match: /^\d{4}$/ },
  expiryMonth: { type: Number, required: true, min: 1, max: 12 },
  expiryYear: { type: Number, required: true, min: 2000 },
  label: { type: String, default: "", trim: true },
  owner: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true }
}, {
  timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  strict: true
});

export const PaymentCardModel = model<IPaymentCard>("PaymentCard", paymentCardSchema);
