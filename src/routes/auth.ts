import express, { Router } from 'express';
import {login, register} from '../controllers/authController';

const router: Router = express.Router();

router.post('/register', register );
router.post('/proof', login );

export default router;