import express, { Router } from 'express';
import {keyExchange} from '../controllers/keyExchangeController';

const router: Router = express.Router();

router.post('/keyexchange', keyExchange);

export default router;