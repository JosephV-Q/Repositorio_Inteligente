import { Router } from 'express';
import { handleGeminiPrompt, getGeminiStatus } from '../controllers/gemini.controller.js';

const router = Router();

router.get('/status', getGeminiStatus);
router.post('/', handleGeminiPrompt);
router.get('/', handleGeminiPrompt);

export default router;
