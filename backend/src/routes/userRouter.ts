import { createHash, randomBytes, randomUUID } from "crypto";
import { Router } from "express";
import { validateMiddleware, authMiddleware, roleMiddleware } from "../middlewares";
import {
  createUserBody,
  CreateUserInput,
  updateUserBody,
  UpdateUserInput,
  authUserBody,
  registerUserBody,
  RegisterUserInput,
  verify2faBody,
  Verify2faInput,
  totpCodeBody,
  TotpCodeInput,
  oauthGoogleBody,
  OauthGoogleInput,
  forgotPasswordBody,
  ForgotPasswordInput,
  resetPasswordBody,
  ResetPasswordInput,
  updateAccountSettingsBody,
  UpdateAccountSettingsInput
} from "../schemas";
import { IUser, UserModel } from "../models";
import {
  signAccessToken,
  signMfaToken,
  verifyMfaToken
} from "../utils/jwt";
import { encryptText, decryptText } from "../utils/crypto";
import { buildOtpAuthUrl, generateTotpSecret, verifyTotp } from "../utils/totp";
import { sendPasswordResetEmail } from "../utils/email";

type GoogleTokenInfo = {
  sub?: string;
  email?: string;
  email_verified?: string | boolean;
  given_name?: string;
  family_name?: string;
  name?: string;
  aud?: string;
};

const userRouter = Router();
const TOTP_ISSUER = process.env.TOTP_ISSUER ?? "EatPlanner";
const APP_URL = process.env.APP_URL ?? process.env.FRONTEND_BASE_URL ?? "http://localhost:3001";
const PASSWORD_RESET_TTL_MINUTES = Number(process.env.PASSWORD_RESET_TTL_MINUTES ?? 30);
const USER_PUBLIC_FIELDS = "firstname lastname email role active authProvider restaurantName defaultMarginRate vatRate twoFactorEnabled created_at updated_at";

type UserRole = "admin" | "manager" | "employee" | "supplier";

function buildAuthSuccessPayload(userId: string, role?: UserRole) {
  const payload: { sub: string; role?: UserRole } = { sub: userId };
  if (role) {
    payload.role = role;
  }

  const token = signAccessToken(payload);
  return { ok: true, token, id: userId };
}

function buildTwoFactorChallengePayload(userId: string) {
  const mfaToken = signMfaToken({ sub: userId });
  return { ok: true, requires2fa: true, mfaToken, id: userId };
}

function buildPasswordResetToken() {
  const token = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(token).digest("hex");

  return { token, tokenHash };
}

function buildPasswordResetUrl(token: string) {
  const resetUrl = new URL("/reset-password", APP_URL);
  resetUrl.searchParams.set("token", token);
  return resetUrl.toString();
}

function isGoogleEmailVerified(value?: string | boolean): boolean {
  if (typeof value === "boolean") return value;
  return value === "true";
}

function isDuplicateKeyError(error: unknown): boolean {
  return (error as { code?: number } | undefined)?.code === 11000;
}

async function hasAnotherAdmin(excludedUserId?: string): Promise<boolean> {
  const filter = excludedUserId
    ? { role: "admin", _id: { $ne: excludedUserId } }
    : { role: "admin" };

  const admin = await UserModel.findOne(filter).select("_id").lean().exec();
  return Boolean(admin);
}

function splitDisplayName(fullName?: string): { firstname: string; lastname: string } {
  if (!fullName) {
    return { firstname: "Google", lastname: "User" };
  }

  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return { firstname: "Google", lastname: "User" };
  }
  if (parts.length === 1) {
    return { firstname: parts[0] ?? "Google", lastname: "User" };
  }

  return {
    firstname: parts[0] ?? "Google",
    lastname: parts.slice(1).join(" ")
  };
}

async function getGoogleTokenInfo(idToken: string): Promise<GoogleTokenInfo | null> {
  const tokenInfoUrl = new URL("https://oauth2.googleapis.com/tokeninfo");
  tokenInfoUrl.searchParams.set("id_token", idToken);

  const response = await fetch(tokenInfoUrl);
  if (!response.ok) return null;

  return (await response.json()) as GoogleTokenInfo;
}

userRouter.get("/getAll", authMiddleware, roleMiddleware(["admin"]), async (req, res): Promise<void> => {
  const list = await UserModel.find()
    .select(USER_PUBLIC_FIELDS)
    .sort({ created_at: -1, _id: -1 })
    .lean()
    .exec();
  res.status(200).json(list);
});

userRouter.get("/get/:id", authMiddleware, roleMiddleware(["admin"]), async (req, res): Promise<void> => {
  const user = await UserModel.findById(req.params.id)
    .select(USER_PUBLIC_FIELDS)
    .lean()
    .exec();

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.status(200).json(user);
});

userRouter.post(
  "/register",
  validateMiddleware({ body: registerUserBody }),
  async (req, res): Promise<void> => {
    try {
      const input = req.body as RegisterUserInput;
      const existingUser = await UserModel.findOne({ email: input.email }).exec();

      if (existingUser) {
        res.status(409).json({ error: "Email already in use" });
        return;
      }

      const created = await UserModel.create({
        ...input,
        role: "manager",
        active: true,
        authProvider: "local"
      });

      res.status(201).json({ ok: true, id: created.id });
    } catch {
      res.status(500).json({ error: "Unable to register user" });
    }
  }
);

userRouter.post(
  "/oauth/google",
  validateMiddleware({ body: oauthGoogleBody }),
  async (req, res): Promise<void> => {
    const { idToken } = req.body as OauthGoogleInput;
    const expectedAudience = process.env.GOOGLE_CLIENT_ID;

    if (!expectedAudience) {
      res.status(500).json({ error: "Google OAuth is not configured on server" });
      return;
    }

    try {
      const tokenInfo = await getGoogleTokenInfo(idToken);
      if (!tokenInfo?.sub || !tokenInfo.email || tokenInfo.aud !== expectedAudience) {
        res.status(401).json({ error: "Invalid Google token" });
        return;
      }

      if (!isGoogleEmailVerified(tokenInfo.email_verified)) {
        res.status(403).json({ error: "Google account email is not verified" });
        return;
      }

      let user =
        await UserModel.findOne({ providerId: tokenInfo.sub })
          .select("+twoFactorSecret")
          .exec();

      if (!user) {
        user = await UserModel.findOne({ email: tokenInfo.email })
          .select("+twoFactorSecret")
          .exec();
      }

      if (!user) {
        const parsed = splitDisplayName(tokenInfo.name);
        const firstname = tokenInfo.given_name ?? parsed.firstname;
        const lastname = tokenInfo.family_name ?? parsed.lastname;

        user = await UserModel.create({
          firstname,
          lastname,
          email: tokenInfo.email,
          password: `oauth-${randomUUID()}-${randomUUID()}`,
          role: "manager",
          active: true,
          authProvider: "google",
          providerId: tokenInfo.sub
        });
      } else if (user.authProvider !== "google" || user.providerId !== tokenInfo.sub) {
        user.authProvider = "google";
        user.providerId = tokenInfo.sub;
        await user.save();
      }

      if (!user.active) {
        res.status(403).json({ error: "Account disabled. Contact administrator." });
        return;
      }

      if (user.twoFactorEnabled) {
        res.json(buildTwoFactorChallengePayload(user.id));
        return;
      }

      res.json(buildAuthSuccessPayload(user.id, user.role));
    } catch {
      res.status(500).json({ error: "Google OAuth failed" });
    }
  }
);

userRouter.post(
  "/create",
  authMiddleware,
  roleMiddleware(["admin"]),
  validateMiddleware({ body: createUserBody }),
  async (req, res): Promise<void> => {
    try {
      const input = req.body as CreateUserInput;
      const existingUser = await UserModel.findOne({ email: input.email }).select("_id").lean().exec();

      if (existingUser) {
        res.status(409).json({ error: "Email already in use" });
        return;
      }

      if (input.role === "admin" && await hasAnotherAdmin()) {
        res.status(409).json({ error: "Only one admin account is allowed" });
        return;
      }

      const created = await UserModel.create(input);
      const createdUser = await UserModel.findById(created.id)
        .select(USER_PUBLIC_FIELDS)
        .lean()
        .exec();

      res.status(201).json(createdUser);
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        res.status(409).json({ error: "Email already in use" });
        return;
      }

      res.status(500).json({ error: "Unable to create user" });
    }
  }
);

userRouter.post(
  "/auth",
  validateMiddleware({ body: authUserBody }),
  async (req, res): Promise<void> => {
    const { email, password } = req.body;

    const user: IUser | null = await UserModel.findOne({ email })
      .select("+password +twoFactorSecret")
      .exec();

    if (!user) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    if (!user.active) {
      res.status(403).json({ error: "Account disabled. Contact administrator." });
      return;
    }

    const isValid = await user.verifyPassword(password);
    if (!isValid) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    if (user.twoFactorEnabled) {
      res.json(buildTwoFactorChallengePayload(user.id));
      return;
    }

    res.json(buildAuthSuccessPayload(user.id, user.role));
  }
);

userRouter.post(
  "/password/forgot",
  validateMiddleware({ body: forgotPasswordBody }),
  async (req, res): Promise<void> => {
    const { email } = req.body as ForgotPasswordInput;
    const genericResponse = {
      ok: true,
      message: "Si un compte existe pour cet email, un lien de reinitialisation a ete envoye."
    };

    try {
      const user = await UserModel.findOne({ email }).exec();

      if (!user || !user.active) {
        res.status(200).json(genericResponse);
        return;
      }

      const { token, tokenHash } = buildPasswordResetToken();
      user.passwordResetTokenHash = tokenHash;
      user.passwordResetTokenExpiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MINUTES * 60 * 1000);
      await user.save();

      try {
        await sendPasswordResetEmail({
          firstname: user.firstname,
          to: user.email,
          resetUrl: buildPasswordResetUrl(token)
        });
      } catch (error) {
        console.error("Unable to send password reset email", error);
        user.passwordResetTokenHash = null;
        user.passwordResetTokenExpiresAt = null;
        await user.save();
        res.status(500).json({ error: "Unable to send password reset email" });
        return;
      }

      res.status(200).json(genericResponse);
    } catch {
      res.status(500).json({ error: "Unable to initialize password reset" });
    }
  }
);

userRouter.post(
  "/password/reset",
  validateMiddleware({ body: resetPasswordBody }),
  async (req, res): Promise<void> => {
    const { token, password } = req.body as ResetPasswordInput;
    const tokenHash = createHash("sha256").update(token).digest("hex");

    try {
      const user = await UserModel.findOne({
        passwordResetTokenHash: tokenHash,
        passwordResetTokenExpiresAt: { $gt: new Date() }
      })
        .select("+password +passwordResetTokenHash +passwordResetTokenExpiresAt")
        .exec();

      if (!user) {
        res.status(400).json({ error: "Invalid or expired password reset token" });
        return;
      }

      if (!user.active) {
        res.status(403).json({ error: "Account disabled. Contact administrator." });
        return;
      }

      user.password = password;
      user.passwordResetTokenHash = null;
      user.passwordResetTokenExpiresAt = null;
      await user.save();

      res.status(200).json({ ok: true, message: "Password updated" });
    } catch {
      res.status(500).json({ error: "Unable to reset password" });
    }
  }
);

userRouter.post(
  "/auth/2fa",
  validateMiddleware({ body: verify2faBody }),
  async (req, res): Promise<void> => {
    const { mfaToken, code } = req.body as Verify2faInput;

    try {
      const payload = verifyMfaToken(mfaToken);
      const user = await UserModel.findById(payload.sub).select("+twoFactorSecret").exec();

      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      if (!user.active) {
        res.status(403).json({ error: "Account disabled. Contact administrator." });
        return;
      }

      if (!user.twoFactorEnabled) {
        res.status(400).json({ error: "2FA is not enabled on this account" });
        return;
      }

      const secret = decryptText(user.twoFactorSecret);
      if (!secret || !verifyTotp({ secret, token: code })) {
        res.status(401).json({ error: "Invalid 2FA code" });
        return;
      }

      res.json(buildAuthSuccessPayload(user.id, user.role));
    } catch {
      res.status(401).json({ error: "Invalid or expired MFA token" });
    }
  }
);

userRouter.post(
  "/2fa/setup",
  authMiddleware,
  async (req, res): Promise<void> => {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: "User not authenticated" });
      return;
    }

    const user = await UserModel.findById(userId).select("+twoFactorTempSecret").exec();
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    if (user.twoFactorEnabled) {
      res.status(409).json({ error: "2FA is already enabled" });
      return;
    }

    const secret = generateTotpSecret();
    user.twoFactorTempSecret = encryptText(secret);
    await user.save();

    const otpauthUrl = buildOtpAuthUrl({
      secret,
      accountName: user.email,
      issuer: TOTP_ISSUER
    });

    res.status(200).json({
      ok: true,
      issuer: TOTP_ISSUER,
      secret,
      otpauthUrl
    });
  }
);

userRouter.post(
  "/2fa/enable",
  authMiddleware,
  validateMiddleware({ body: totpCodeBody }),
  async (req, res): Promise<void> => {
    const userId = req.user?.id;
    const { code } = req.body as TotpCodeInput;

    if (!userId) {
      res.status(401).json({ error: "User not authenticated" });
      return;
    }

    const user = await UserModel.findById(userId).select("+twoFactorTempSecret").exec();
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const tempSecret = decryptText(user.twoFactorTempSecret);
    if (!tempSecret) {
      res.status(400).json({ error: "2FA setup has not been initialized" });
      return;
    }

    if (!verifyTotp({ secret: tempSecret, token: code })) {
      res.status(401).json({ error: "Invalid 2FA code" });
      return;
    }

    user.twoFactorEnabled = true;
    user.twoFactorSecret = encryptText(tempSecret);
    user.twoFactorTempSecret = null;
    await user.save();

    res.status(200).json({ ok: true, message: "2FA enabled" });
  }
);

userRouter.post(
  "/2fa/disable",
  authMiddleware,
  validateMiddleware({ body: totpCodeBody }),
  async (req, res): Promise<void> => {
    const userId = req.user?.id;
    const { code } = req.body as TotpCodeInput;

    if (!userId) {
      res.status(401).json({ error: "User not authenticated" });
      return;
    }

    const user = await UserModel.findById(userId).select("+twoFactorSecret").exec();
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    if (!user.twoFactorEnabled) {
      res.status(400).json({ error: "2FA is not enabled" });
      return;
    }

    const secret = decryptText(user.twoFactorSecret);
    if (!secret || !verifyTotp({ secret, token: code })) {
      res.status(401).json({ error: "Invalid 2FA code" });
      return;
    }

    user.twoFactorEnabled = false;
    user.twoFactorSecret = null;
    user.twoFactorTempSecret = null;
    await user.save();

    res.status(200).json({ ok: true, message: "2FA disabled" });
  }
);

userRouter.get(
  "/me",
  authMiddleware,
  async (req, res): Promise<void> => {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: "User not authenticated" });
      return;
    }

    const user = await UserModel.findById(
      userId,
      USER_PUBLIC_FIELDS
    ).exec();

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.status(200).json(user);
  }
);

userRouter.patch(
  "/settings",
  authMiddleware,
  validateMiddleware({ body: updateAccountSettingsBody }),
  async (req, res): Promise<void> => {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: "User not authenticated" });
      return;
    }

    const input = req.body as UpdateAccountSettingsInput;
    const user = await UserModel.findByIdAndUpdate(
      userId,
      input,
      { new: true }
    )
      .select(USER_PUBLIC_FIELDS)
      .exec();

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.status(200).json(user);
  }
);

userRouter.patch(
  "/toggle-active/:id",
  authMiddleware,
  roleMiddleware(["admin"]),
  async (req, res): Promise<void> => {
    try {
      const { id } = req.params;

      const user = await UserModel.findById(id).exec();
      if (!user) {
        res.status(404).json({ error: "Utilisateur non trouve" });
        return;
      }

      if (user.role === "admin" && user.active) {
        res.status(403).json({ error: "Le compte admin principal ne peut pas etre desactive" });
        return;
      }

      user.active = !user.active;
      await user.save();

      res.status(200).json({
        message: user.active ? "Utilisateur active" : "Utilisateur desactive",
        user: {
          id: user.id,
          email: user.email,
          active: user.active
        }
      });
    } catch {
      res.status(500).json({ error: "Erreur lors de la modification du statut" });
    }
  }
);

userRouter.get(
  "/status/:id",
  authMiddleware,
  roleMiddleware(["admin"]),
  async (req, res): Promise<void> => {
    try {
      const user = await UserModel.findById(
        req.params.id,
        "firstname lastname email role active"
      ).exec();
      if (!user) {
        res.status(404).json({ error: "Utilisateur non trouve" });
        return;
      }
      res.status(200).json(user);
    } catch {
      res.status(500).json({ error: "Erreur lors de la recuperation du statut" });
    }
  }
);

userRouter.patch(
  "/update/:id",
  authMiddleware,
  roleMiddleware(["admin"]),
  validateMiddleware({ body: updateUserBody }),
  async (req, res): Promise<void> => {
    try {
      const id = req.params.id;
      const updates = req.body as UpdateUserInput;
      const user = await UserModel.findById(id).select("+password").exec();

      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      if (updates.email && updates.email !== user.email) {
        const existingUser = await UserModel.findOne({
          email: updates.email,
          _id: { $ne: id }
        }).select("_id").lean().exec();

        if (existingUser) {
          res.status(409).json({ error: "Email already in use" });
          return;
        }
      }

      const nextRole = (updates.role ?? user.role) as UserRole;

      if (nextRole === "admin" && user.role !== "admin" && await hasAnotherAdmin(id)) {
        res.status(409).json({ error: "Only one admin account is allowed" });
        return;
      }

      if (user.role === "admin") {
        if (updates.role && updates.role !== "admin") {
          res.status(403).json({ error: "Le compte admin principal doit rester admin" });
          return;
        }

        if (updates.active === false) {
          res.status(403).json({ error: "Le compte admin principal ne peut pas etre desactive" });
          return;
        }
      }

      Object.assign(user, updates);
      await user.save();

      const updatedUser = await UserModel.findById(user.id)
        .select(USER_PUBLIC_FIELDS)
        .lean()
        .exec();

      res.json(updatedUser);
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        res.status(409).json({ error: "Email already in use" });
        return;
      }

      res.status(500).json({ error: "Unable to update user" });
    }
  }
);

userRouter.delete("/delete/:id", authMiddleware, roleMiddleware(["admin"]), async (req, res): Promise<void> => {
  const { id } = req.params;
  const user = await UserModel.findById(id).exec();
  if (!user) {
    res.status(404).send("user not found");
    return;
  }

  if (user.role === "admin") {
    res.status(403).json({ error: "Le compte admin principal ne peut pas etre supprime" });
    return;
  }

  await user.deleteOne();
  res.status(204).send();
});

userRouter.delete("/deleteAll", authMiddleware, roleMiddleware(["admin"]), async (_req, res): Promise<void> => {
  const result = await UserModel.deleteMany({ role: "manager" }).exec();
  res.status(200).json({ ok: true, deletedCount: result.deletedCount ?? 0 });
});

export { userRouter };
