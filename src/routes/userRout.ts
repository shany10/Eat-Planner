import { Router } from "express";
import { validate } from "../middlewares/validate";
import { requireAuth } from "../middlewares/auth";
import { createUserBody, CreateUserInput, updateUserBody } from "../schemas/userSchema";
import { IUser, UserModel } from "../models/userModel";
import { signAccessToken } from "../utils/jwt";

const userRout = Router();

userRout.get('/getAll', requireAuth, async (req, res): Promise<void> => {
    const list = await UserModel.find().exec();
    res.status(200).json(list);
})

userRout.get('/get/:id', requireAuth, async (req, res): Promise<void> => {
    const list = await UserModel.findById(req.params.id).exec();
    res.status(200).json(list);
})

userRout.post('/create', requireAuth, validate({ body: createUserBody }), async (req, res): Promise<void> => {
    const input = req.body as CreateUserInput;
    const created = await UserModel.create(input);
    const message = created && typeof created === "object" ? "user created" : "error";
    res.status(201).send(message);
})

userRout.post('/auth', async (req, res): Promise<void> => {
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

userRout.patch('/update/:id', requireAuth, validate({ body: updateUserBody }), async (req, res) => {
    const id = req.params.id;
    const updates = req.body as Partial<CreateUserInput>;
    if (updates.password) {
        const user = await UserModel.findById(id).select('+password');
        if (!user) return res.status(404).json({ error: 'User not found' });
        user.password = updates.password;
        Object.assign(user, updates);
    await user.save();
    return res.json({ ok: true, id: user.id });
    }
    const updated = await UserModel.findByIdAndUpdate(id, updates, { new: true }).exec();
    if (!updated) return res.status(404).json({ error: 'User not found' });
    res.json(updated);
});

userRout.delete('/delete/:id', requireAuth, async (req, res): Promise<void> => {
    const { id } = req.params;
    const deleted = await UserModel.findByIdAndDelete(id).exec();
    if (!deleted) {
        res.status(404).send("user not found");
        return;
    }
    res.status(204).send();
})

userRout.delete('/deleteAll', requireAuth, async (req, res): Promise<void> => {
    await UserModel.deleteMany({});
    res.status(204).send();
})

export default userRout;