import { Types } from "mongoose";
import { SupplierModel, UserModel } from "../models";

const DEFAULT_ADMIN_FIRSTNAME = process.env.ADMIN_FIRSTNAME ?? "Admin";
const DEFAULT_ADMIN_LASTNAME = process.env.ADMIN_LASTNAME ?? "System";
const DEFAULT_ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@eatplanner.local";
const DEFAULT_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "Admin123!";
const DEFAULT_SUPPLIER_EMAIL = process.env.SUPPLIER_PORTAL_EMAIL ?? "tovincentngo@gmail.com";
const DEFAULT_SUPPLIER_PASSWORD = process.env.SUPPLIER_PORTAL_PASSWORD ?? "Fournisseur123!";

type AccessBootstrapResult = {
  createdAdminEmail: string | null;
  createdSupplierEmail: string | null;
  normalizedLegacyUsers: number;
  demotedExtraAdmins: number;
};

async function ensureSupplierPortalAccount(ownerId: Types.ObjectId): Promise<string | null> {
  let supplierUser = await UserModel.findOne({ email: DEFAULT_SUPPLIER_EMAIL }).select("+password").exec();
  const createdSupplierEmail = supplierUser ? null : DEFAULT_SUPPLIER_EMAIL;

  if (!supplierUser) {
    supplierUser = await UserModel.create({
      firstname: "Vincent",
      lastname: "Fournisseur",
      email: DEFAULT_SUPPLIER_EMAIL,
      password: DEFAULT_SUPPLIER_PASSWORD,
      role: "supplier",
      active: true,
      authProvider: "local",
      restaurantName: "Portail fournisseur"
    });
  } else {
    supplierUser.password = DEFAULT_SUPPLIER_PASSWORD;
    supplierUser.role = "supplier";
    supplierUser.active = true;
    supplierUser.authProvider = "local";
    await supplierUser.save();
  }

  await SupplierModel.findOneAndUpdate(
    { email: DEFAULT_SUPPLIER_EMAIL },
    {
      name: "Fournisseur demo Vincent",
      productTypes: ["Epicerie seche"],
      deliveryLeadTimeDays: 1,
      deliveryFee: 0,
      minimumOrderAmount: 0,
      contactName: "Vincent Ngo",
      email: DEFAULT_SUPPLIER_EMAIL,
      phone: "",
      address: "",
      notes: "Compte fournisseur demo pour la messagerie temps reel.",
      owner: ownerId,
      portalUser: supplierUser._id,
      active: true
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).exec();

  return createdSupplierEmail;
}

export async function ensureUserAccessBootstrap(): Promise<AccessBootstrapResult> {
  const legacyRoleResult = await UserModel.updateMany(
    { role: { $nin: ["admin", "manager", "supplier"] } },
    { $set: { role: "manager", active: true } }
  ).exec();

  const admins = await UserModel.find({ role: "admin" })
    .sort({ created_at: 1, _id: 1 })
    .exec();

  if (admins.length === 0) {
    const admin = await UserModel.create({
      firstname: DEFAULT_ADMIN_FIRSTNAME,
      lastname: DEFAULT_ADMIN_LASTNAME,
      email: DEFAULT_ADMIN_EMAIL,
      password: DEFAULT_ADMIN_PASSWORD,
      role: "admin",
      active: true,
      authProvider: "local"
    });
    const createdSupplierEmail = await ensureSupplierPortalAccount(admin._id as Types.ObjectId);

    return {
      createdAdminEmail: admin.email,
      createdSupplierEmail,
      normalizedLegacyUsers: legacyRoleResult.modifiedCount ?? 0,
      demotedExtraAdmins: 0
    };
  }

  const primaryAdmin = admins[0];
  if (!primaryAdmin) {
    throw new Error("Admin bootstrap failed");
  }

  const createdSupplierEmail = await ensureSupplierPortalAccount(primaryAdmin._id as Types.ObjectId);

  if (admins.length === 1) {
    return {
      createdAdminEmail: null,
      createdSupplierEmail,
      normalizedLegacyUsers: legacyRoleResult.modifiedCount ?? 0,
      demotedExtraAdmins: 0
    };
  }

  const [, ...extraAdmins] = admins;
  const demotionResult = await UserModel.updateMany(
    { _id: { $in: extraAdmins.map(admin => admin._id) } },
    { $set: { role: "manager" } }
  ).exec();

  return {
    createdAdminEmail: null,
    createdSupplierEmail,
    normalizedLegacyUsers: legacyRoleResult.modifiedCount ?? 0,
    demotedExtraAdmins: demotionResult.modifiedCount ?? 0
  };
}
