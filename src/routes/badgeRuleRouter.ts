import { Router } from "express";
import { authMiddleware, validateMiddleware } from "../middlewares";
import { createBadgeRuleBody, CreateBadgeRuleInput, updateBadgeRuleBody, UpdateBadgeRuleInput } from "../schemas";
import { BadgeRuleModel } from "../models";

const badgeRuleRouter = Router();

// Récupérer toutes les règles de badges
badgeRuleRouter.get('/getAll', authMiddleware, async (req, res): Promise<void> => {
    try {
        const list = await BadgeRuleModel.find().exec();
        res.status(200).json(list);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching badge rules' });
    }
});

// Récupérer une règle par ID
badgeRuleRouter.get('/get/:id', authMiddleware, async (req, res): Promise<void> => {
    try {
        const rule = await BadgeRuleModel.findById(req.params.id).exec();
        if (!rule) {
            res.status(404).json({ error: 'Badge rule not found' });
            return;
        }
        res.status(200).json(rule);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching badge rule' });
    }
});

// Récupérer toutes les règles actives
badgeRuleRouter.get('/active', authMiddleware, async (req, res): Promise<void> => {
    try {
        const list = await BadgeRuleModel.find({ isActive: true }).exec();
        res.status(200).json(list);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching active badge rules' });
    }
});

// Récupérer les règles pour un badge spécifique
badgeRuleRouter.get('/badge', authMiddleware, async (req, res): Promise<void> => {
    try {
        const { name } = req.query;
        if (!name || typeof name !== 'string') {
            res.status(400).json({ error: 'Badge name is required as query parameter' });
            return;
        }
        const rules = await BadgeRuleModel.find({ badgeName: name }).exec();
        res.status(200).json(rules);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching badge rules' });
    }
});

// Créer une nouvelle règle de badge
badgeRuleRouter.post('/create', authMiddleware, validateMiddleware({ body: createBadgeRuleBody }), async (req, res): Promise<void> => {
    try {
        const input = req.body as CreateBadgeRuleInput;
        const created = await BadgeRuleModel.create(input);
        res.status(201).json({ message: 'Badge rule created', data: created });
    } catch (error) {
        res.status(500).json({ error: 'Error creating badge rule' });
    }
});

// Mettre à jour une règle existante
badgeRuleRouter.patch('/update/:id', authMiddleware, validateMiddleware({ body: updateBadgeRuleBody }), async (req, res): Promise<void> => {
    try {
        const id = req.params.id;
        const updates = req.body as UpdateBadgeRuleInput;
        const updated = await BadgeRuleModel.findByIdAndUpdate(id, updates, { new: true }).exec();
        if (!updated) {
            res.status(404).json({ error: 'Badge rule not found' });
            return;
        }
        res.json(updated);
    } catch (error) {
        res.status(500).json({ error: 'Error updating badge rule' });
    }
});

// Activer/Désactiver une règle
badgeRuleRouter.patch('/toggle/:id', authMiddleware, async (req, res): Promise<void> => {
    try {
        const id = req.params.id;
        const rule = await BadgeRuleModel.findById(id).exec();
        if (!rule) {
            res.status(404).json({ error: 'Badge rule not found' });
            return;
        }
        rule.isActive = !rule.isActive;
        await rule.save();
        res.json({ message: `Rule ${rule.isActive ? 'activated' : 'deactivated'}`, data: rule });
    } catch (error) {
        res.status(500).json({ error: 'Error toggling badge rule' });
    }
});

// Supprimer une règle
badgeRuleRouter.delete('/delete/:id', authMiddleware, async (req, res): Promise<void> => {
    try {
        const { id } = req.params;
        const deleted = await BadgeRuleModel.findByIdAndDelete(id).exec();
        if (!deleted) {
            res.status(404).json({ error: 'Badge rule not found' });
            return;
        }
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: 'Error deleting badge rule' });
    }
});

// Supprimer toutes les règles (à utiliser avec précaution)
badgeRuleRouter.delete('/deleteAll', authMiddleware, async (req, res): Promise<void> => {
    try {
        await BadgeRuleModel.deleteMany({});
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: 'Error deleting badge rules' });
    }
});

export { badgeRuleRouter };
