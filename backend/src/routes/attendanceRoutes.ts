import { Router } from 'express';
import { AttendanceController } from '../controllers/AttendanceController';

const router = Router();
const attendanceController = new AttendanceController();

router.post('/', attendanceController.recordAttendance);
router.get('/logs', attendanceController.getLogs);

export default router;