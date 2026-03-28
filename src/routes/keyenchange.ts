import express, { Router } from 'express';
import {keyExchange} from '../controllers/keyExchangeController';
import rateLimit from "express-rate-limit";
const limiter = rateLimit({
    windowMs: 5 * 60 * 1000,
    limit: 10,
    message: "Too many request."
});

const router: Router = express.Router();

router.post('/keyexchange', limiter, keyExchange);

export default router;