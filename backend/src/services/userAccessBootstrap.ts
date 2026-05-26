import { UserModel } from "../models";

const DEFAULT_ADMIN_FIRSTNAME = process.env.ADMIN_FIRSTNAME ?? "Admin";
const DEFAULT_ADMIN_LASTNAME = process.env.ADMIN_LASTNAME ?? "System";
const DEFAULT_ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@eatplanner.local";
const DEFAULT_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "Admin123!";

type AccessBootstrapResult = {
  createdAdminEmail: string | null;
  normalizedLegacyUsers: number;
  demotedExtraAdmins: number;
};

export async function ensureUserAccessBootstrap(): Promise<AccessBootstrapResult> {
  const legacyRoleResult = await UserModel.updateMany(
    { role: { $nin: ["admin", "manager"] } },
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

    return {
      createdAdminEmail: admin.email,
      normalizedLegacyUsers: legacyRoleResult.modifiedCount ?? 0,
      demotedExtraAdmins: 0
    };
  }

  if (admins.length === 1) {
    return {
      createdAdminEmail: null,
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
    normalizedLegacyUsers: legacyRoleResult.modifiedCount ?? 0,
    demotedExtraAdmins: demotionResult.modifiedCount ?? 0
  };
}
