import { Router } from "express";

const debugRouter = Router();

// Route de test pour valider la remontee d'erreurs vers GlitchTip (projet
// backend). Volontairement bloquee en production : lever une erreur a la
// demande serait un vecteur de bruit / DoS en prod.
debugRouter.get("/error", (req, res): void => {
  if (process.env.NODE_ENV === "production") {
    res.status(404).json({ error: "Not found" });
    return;
  }

  throw new Error("Sentry test — backend Express (Eat Planner /debug/error)");
});

export { debugRouter };
