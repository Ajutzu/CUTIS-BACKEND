import express from 'express';
import { verifyToken } from '../middleware/guard.js';
import { upload } from '../middleware/upload.js';
import { trackHistory, uploadFollowUp, deleteTrackedSeries } from '../controllers/history.js';

const router = express.Router();

router.use(verifyToken);

router.post('/:id/track', trackHistory);
router.post('/:trackedGroupId/follow-up', upload.single('image'), uploadFollowUp);
router.delete('/:trackedGroupId/series', deleteTrackedSeries);

export default router;
