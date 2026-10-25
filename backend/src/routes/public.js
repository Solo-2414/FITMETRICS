import { Router } from 'express';
import { getGymSettings, maintenanceStatus } from '../services/maintenance.js';

const router = Router();

router.get('/public/status', async (_req, res, next) => {
  try {
    res.json(maintenanceStatus(await getGymSettings()));
  } catch (error) {
    next(error);
  }
});

export default router;
