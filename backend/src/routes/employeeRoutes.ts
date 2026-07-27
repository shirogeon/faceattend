import { Router } from 'express';
import { EmployeeController } from '../controllers/employeeController';

const router = Router();
const employeeController = new EmployeeController();

router.get('/', employeeController.getEmployees);
router.post('/', employeeController.createEmployee);
router.delete('/:id', employeeController.deleteEmployee);

export default router;