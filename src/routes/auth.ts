import express, { Router, Request, Response } from 'express';
import {keyExchange} from '../controllers/keyExchangeController';
import {login, register} from '../controllers/authController';

const router: Router = express.Router();

router.post('/register', register );
router.post('/proof', login );

export default router;