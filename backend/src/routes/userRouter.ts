import { Router } from "express";
import { validateMiddleware, authMiddleware, roleMiddleware, ownerOrRole } from "../middlewares";
import {
  registerUserBody, RegisterUserInput,
  createUserBody, CreateUserInput,
  updateOwnProfileBody, UpdateOwnProfileInput,
  updateUserBody, UpdateUserInput,
  changeRoleBody, ChangeRoleInput,
  authUserBody
} from "../schemas";
import { IUser, UserModel } from "../models";
import { signAccessToken } from "../utils/jwt";

const userRouter = Router();


userRouter.post(
  "/register",
  validateMiddleware({ body: registerUserBody }),
  async (req, res): Promise<void> => {
    const input = req.body as RegisterUserInput;
    const created = await UserModel.create({ ...input, role: "employee" });
    res.status(201).json({ message: "user created", id: created.id });
  }
);

userRouter.post(
  "/auth",
  validateMiddleware({ body: authUserBody }),
  async (req, res): Promise<void> => {
    const { email, password } = req.body;

    const user: IUser | null = await UserModel.findOne({ email })
      .select("+password")
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
    const token = signAccessToken({ sub: user.id, role: user.role });
    res.json({ ok: true, token, id: user.id, role: user.role });
  }
);


userRouter.get("/me", authMiddleware, async (req, res): Promise<void> => {
  const user = await UserModel.findById(req.user!.id, "-password").exec();
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.json(user);
});

userRouter.patch(
  "/me",
  authMiddleware,
  validateMiddleware({ body: updateOwnProfileBody }),
  async (req, res): Promise<void> => {
    const updates = req.body as UpdateOwnProfileInput;
    if (updates.password) {
      const user = await UserModel.findById(req.user!.id).select("+password");
      if (!user) { res.status(404).json({ error: "User not found" }); return; }
      user.password = updates.password;
      Object.assign(user, updates);
      await user.save();
      res.json({ ok: true, id: user.id });
      return;
    }
    const updated = await UserModel.findByIdAndUpdate(req.user!.id, updates, { new: true }).exec();
    if (!updated) { res.status(404).json({ error: "User not found" }); return; }
    res.json(updated);
  }
);

userRouter.get('/getAll', authMiddleware, roleMiddleware(["admin", "manager"]), async (req, res): Promise<void> => {
  const list = await UserModel.find({}, "-password").exec();
  res.status(200).json(list);
});

userRouter.get('/get/:id', authMiddleware, ownerOrRole(["admin", "manager"]), async (req, res): Promise<void> => {
  const user = await UserModel.findById(req.params.id, "-password").exec();
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.json(user);
});

userRouter.get(
  "/status/:id",
  authMiddleware,
  roleMiddleware(["admin", "manager"]),
  async (req, res): Promise<void> => {
    try {
      const user = await UserModel.findById(
        req.params.id,
        "firstname lastname email role active"
      ).exec();
      if (!user) { res.status(404).json({ error: "Utilisateur non trouvé" }); return; }
      res.status(200).json(user);
    } catch (error) {
      res.status(500).json({ error: "Erreur lors de la récupération du statut" });
    }
  }
);


userRouter.post(
  "/create",
  authMiddleware,
  roleMiddleware(["admin"]),
  validateMiddleware({ body: createUserBody }),
  async (req, res): Promise<void> => {
    const input = req.body as CreateUserInput;
    const created = await UserModel.create(input);
    res.status(201).json({ message: "user created", id: created.id });
  }
);

userRouter.patch(
  "/update/:id",
  authMiddleware,
  roleMiddleware(["admin"]),
  validateMiddleware({ body: updateUserBody }),
  async (req, res): Promise<void> => {
    const id = req.params.id;
    const updates = req.body as UpdateUserInput;
    if (updates.password) {
      const user = await UserModel.findById(id).select("+password");
      if (!user) { res.status(404).json({ error: "User not found" }); return; }
      user.password = updates.password;
      Object.assign(user, updates);
      await user.save();
      res.json({ ok: true, id: user.id });
      return;
    }
    const updated = await UserModel.findByIdAndUpdate(id, updates, { new: true }).exec();
    if (!updated) { res.status(404).json({ error: "User not found" }); return; }
    res.json(updated);
  }
);

userRouter.patch(
  "/role/:id",
  authMiddleware,
  roleMiddleware(["admin"]),
  validateMiddleware({ body: changeRoleBody }),
  async (req, res): Promise<void> => {
    const { role } = req.body as ChangeRoleInput;
    const updated = await UserModel.findByIdAndUpdate(req.params.id, { role }, { new: true }).exec();
    if (!updated) { res.status(404).json({ error: "User not found" }); return; }
    res.json({ message: "Role updated", user: { id: updated.id, role: updated.role } });
  }
);

userRouter.patch(
  "/toggle-active/:id",
  authMiddleware,
  roleMiddleware(["admin"]),
  async (req, res): Promise<void> => {
    try {
      const user = await UserModel.findById(req.params.id).exec();
      if (!user) { res.status(404).json({ error: "Utilisateur non trouvé" }); return; }

      user.active = !user.active;
      await user.save();

      res.status(200).json({
        message: user.active ? "Utilisateur activé" : "Utilisateur désactivé",
        user: { id: user.id, email: user.email, active: user.active },
      });
    } catch (error) {
      res.status(500).json({ error: "Erreur lors de la modification du statut" });
    }
  }
);

userRouter.delete('/delete/:id', authMiddleware, roleMiddleware(["admin"]), async (req, res): Promise<void> => {
    const { id } = req.params;
    const deleted = await UserModel.findByIdAndDelete(id).exec();
    if (!deleted) res.status(404).send("user not found");
    else res.status(204).send();
  }
);

userRouter.delete('/deleteAll', authMiddleware, roleMiddleware(["admin"]), async (req, res): Promise<void> => {
    await UserModel.deleteMany({});
    res.status(204).send();
  }
);

export { userRouter };
