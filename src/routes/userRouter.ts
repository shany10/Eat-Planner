import { Router } from "express";
import { validateMiddleware, authMiddleware } from "../middlewares";
import { createUserBody, CreateUserInput, updateUserBody, UpdateUserInput } from "../schemas";
import { IUser, UserModel } from "../models";
import { signAccessToken } from "../utils/jwt";

const userRouter = Router();

userRouter.get('/getAll', authMiddleware, async (req, res): Promise<void> => {
    const list = await UserModel.find().exec();
    res.status(200).json(list);
})

userRouter.get('/get/:id', authMiddleware, async (req, res): Promise<void> => {
    const list = await UserModel.findById(req.params.id).exec();
    res.status(200).json(list);
})

userRouter.post('/create', authMiddleware, validateMiddleware({ body: createUserBody }), async (req, res): Promise<void> => {
    const input = req.body as CreateUserInput;
    const created = await UserModel.create(input);
    const message = created && typeof created === "object" ? "user created" : "error";
    res.status(201).send(message);
})

userRouter.post('/auth', async (req, res): Promise<void> => {
    const { email, password } = req.body;

    if (!email || !password) {
        res.status(400).json({ error: 'Email and password are required' });
        return;
    }

    const user: IUser | null = await UserModel.findOne({ email }).select('+password').exec();
    if (!user) {
        res.status(401).json({ error: 'Invalid email or password' });
        return;
    }
    const isValid = await user.verifyPassword(password);
    if (!isValid) {
        res.status(401).json({ error: 'Invalid email or password' });
        return;
    }
    const token = signAccessToken({ sub: user.id });
    res.json({ ok: true, token, id: user.id });
});

userRouter.patch('/update/:id', authMiddleware, validateMiddleware({ body: updateUserBody }), async (req, res): Promise<void> => {
    const id = req.params.id;
    const updates = req.body as UpdateUserInput;
    if (updates.password) {
        const user = await UserModel.findById(id).select('+password');
        if (!user) res.status(404).json({ error: 'User not found' });
        else {
            user.password = updates.password;
            Object.assign(user, updates);
            await user.save();
            res.json({ ok: true, id: user.id });
        }
    }
    const updated = await UserModel.findByIdAndUpdate(id, updates, { new: true }).exec();
    if (!updated) res.status(404).json({ error: 'User not found' });
    else res.json(updated);
});

userRouter.delete('/delete/:id', authMiddleware, async (req, res): Promise<void> => {
    const { id } = req.params;
    const deleted = await UserModel.findByIdAndDelete(id).exec();
    if (!deleted) res.status(404).send("user not found");
    else res.status(204).send();
})

userRouter.delete('/deleteAll', authMiddleware, async (req, res): Promise<void> => {
    await UserModel.deleteMany({});
    res.status(204).send();
})

export { userRouter };