import { Router } from 'express';
import { getStatus, getHello } from '../controllers/example.controller.js';

const router = Router();

router.get('/health', getStatus);
router.get('/hello', getHello);

export default router;
