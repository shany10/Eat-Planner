import { Router } from "express";
import { validateMiddleware } from "../middlewares";
import { createGymBody, updateGymBody, approveGymBody, CreateGymInput } from "../schemas";
import { GymModel } from "../models";

const gymRouter = Router();

// Récupérer toutes les salles
gymRouter.get('/getAll', async (req, res): Promise<void> => {
  try {
    const gyms = await GymModel.find().populate('owner', 'firstname lastname email').exec();
    res.status(200).json(gyms);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération des salles' });
  }
});

// Récupérer les salles approuvées uniquement
gymRouter.get('/approved', async (req, res): Promise<void> => {
  try {
    const gyms = await GymModel.find({ approved: true }).populate('owner', 'firstname lastname email').exec();
    res.status(200).json(gyms);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération des salles' });
  }
});

// Récupérer une salle par ID
gymRouter.get('/:id', async (req, res): Promise<void> => {
  try {
    const gym = await GymModel.findById(req.params.id).populate('owner', 'firstname lastname email').exec();
    if (!gym) {
      res.status(404).json({ error: 'Salle non trouvée' });
      return;
    }
    res.status(200).json(gym);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération de la salle' });
  }
});

// Créer une nouvelle salle
gymRouter.post('/create', validateMiddleware({ body: createGymBody }), async (req, res): Promise<void> => {
  try {
    const input = req.body as CreateGymInput;
    const gym = await GymModel.create(input);
    res.status(201).json({ message: 'Salle créée avec succès', gym });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la création de la salle' });
  }
});

// Approuver/Rejeter une salle (ADMIN)
gymRouter.patch('/approve/:id', validateMiddleware({ body: approveGymBody }), async (req, res): Promise<void> => {
  try {
    const { id } = req.params;
    const { approved } = req.body;
    
    const gym = await GymModel.findByIdAndUpdate(
      id,
      { approved },
      { new: true }
    ).exec();
    
    if (!gym) {
      res.status(404).json({ error: 'Salle non trouvée' });
      return;
    }
    
    res.status(200).json({ message: 'Statut mis à jour', gym });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la mise à jour du statut' });
  }
});

// Modifier une salle
gymRouter.patch('/:id', validateMiddleware({ body: updateGymBody }), async (req, res): Promise<void> => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const gym = await GymModel.findByIdAndUpdate(id, updates, { new: true }).exec();
    
    if (!gym) {
      res.status(404).json({ error: 'Salle non trouvée' });
      return;
    }
    
    res.status(200).json({ message: 'Salle mise à jour', gym });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la mise à jour de la salle' });
  }
});

// Supprimer une salle
gymRouter.delete('/:id', async (req, res): Promise<void> => {
  try {
    const { id } = req.params;
    const deleted = await GymModel.findByIdAndDelete(id).exec();
    
    if (!deleted) {
      res.status(404).json({ error: 'Salle non trouvée' });
      return;
    }
    
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la suppression de la salle' });
  }
});

export { gymRouter };