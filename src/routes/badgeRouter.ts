import { Router } from "express";
import { authMiddleware, validateMiddleware } from "../middlewares";
import { createBadgeBody, CreateBadgeInput, updateBadgeBody, UpdateBadgeInput } from "../schemas";
import { BadgeModel } from "../models";

const badgeRouter = Router();

badgeRouter.get('/getAll', authMiddleware, async (req, res): Promise<void> => {
    const list = await BadgeModel.find().exec();
    res.status(200).json(list);
})

badgeRouter.get('/get/:id', authMiddleware, async (req, res): Promise<void> => {
    const list = await BadgeModel.findById(req.params.id).exec();
    res.status(200).json(list);
})

badgeRouter.post('/create', authMiddleware, validateMiddleware({ body: createBadgeBody }), async (req, res): Promise<void> => {
    const input = req.body as CreateBadgeInput;
    const created = await BadgeModel.create(input);
    const message = created && typeof created === "object" ? "badge created" : "error";
    res.status(201).send(message);
})

badgeRouter.patch('/update/:id', authMiddleware, validateMiddleware({ body: updateBadgeBody }), async (req, res): Promise<void> => {
    const id = req.params.id;
    const updates = req.body as UpdateBadgeInput;
    const updated = await BadgeModel.findByIdAndUpdate(id, updates, { new: true }).exec();
    if (!updated) res.status(404).json({ error: 'Badge not found' })
    else res.json(updated);
});

badgeRouter.delete('/delete/:id', authMiddleware, async (req, res): Promise<void> => {
    const { id } = req.params;
    const deleted = await BadgeModel.findByIdAndDelete(id).exec();
    if (!deleted) res.status(404).json({ error: 'Badge not found' });
    else res.status(204).send();
})

badgeRouter.delete('/deleteAll', authMiddleware, async (req, res): Promise<void> => {
    await BadgeModel.deleteMany({});
    res.status(204).send();
})

export { badgeRouter };