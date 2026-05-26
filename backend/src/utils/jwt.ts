import jwt, { Secret } from "jsonwebtoken";

const JWT_SECRET: Secret = process.env.JWT_SECRET ?? "dev-secret"; 

export interface AccessTokenPayload {
  sub: string;
  role?: "admin" | "manager" | "employee";
  typ: "access";
}

export interface MfaTokenPayload {
  sub: string;
  typ: "mfa";
}

export function signAccessToken(payload: Pick<AccessTokenPayload, "sub"> & { role?: "admin" | "manager" | "employee" }, expiresInHours = 1) {
  return jwt.sign(
    { ...payload, typ: "access" } as string | object | Buffer,
    JWT_SECRET,
    { expiresIn: `${expiresInHours}h` }
  );
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const payload = jwt.verify(token, JWT_SECRET) as Partial<AccessTokenPayload>;
  if (payload.typ && payload.typ !== "access") {
    throw new Error("Invalid token type");
  }
  if (!payload.sub) {
    throw new Error("Invalid token payload");
  }
  const result: AccessTokenPayload = { sub: payload.sub, typ: "access" };
  if (payload.role) result.role = payload.role;
  return result;
}

export function signMfaToken(payload: Pick<MfaTokenPayload, "sub">, expiresInMinutes = 10) {
  return jwt.sign(
    { ...payload, typ: "mfa" } as string | object | Buffer,
    JWT_SECRET,
    { expiresIn: `${expiresInMinutes}m` }
  );
}

export function verifyMfaToken(token: string): MfaTokenPayload {
  const payload = jwt.verify(token, JWT_SECRET) as Partial<MfaTokenPayload>;
  if (payload.typ !== "mfa" || !payload.sub) {
    throw new Error("Invalid token type");
  }
  return { sub: payload.sub, typ: "mfa" };
}
