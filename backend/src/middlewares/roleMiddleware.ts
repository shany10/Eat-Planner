import { Request, Response, NextFunction } from "express";

export type UserRole = "admin" | "manager" | "employee";


export function roleMiddleware(allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: "Access denied" });
    }

    next();
  };
}

export function ownerOrRole(allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const isOwner = req.params.id === req.user.id;
    const hasRole = allowedRoles.includes(req.user.role);

    if (!isOwner && !hasRole) {
      return res.status(403).json({ error: "Access denied" });
    }

    next();
  };
}
