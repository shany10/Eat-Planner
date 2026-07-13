import rateLimit from "express-rate-limit";

// Limiteur strict pour les endpoints d'authentification (login, register,
// OAuth, reset de mot de passe, 2FA de connexion). Objectif : freiner le
// brute-force et l'énumération de comptes. Compté par IP sur une fenêtre
// glissante. Les valeurs sont ajustables via l'environnement.
export const authRateLimiter = rateLimit({
  windowMs: Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS ?? 15 * 60 * 1000),
  limit: Number(process.env.AUTH_RATE_LIMIT_MAX ?? 20),
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many attempts, please try again later" }
});
