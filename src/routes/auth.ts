import express, { Router } from 'express';
import {login, register, logout} from '../controllers/authController';
import rateLimit from "express-rate-limit";
import {getMembers} from "../controllers/zkpController";
import {keyExchange} from "../controllers/keyExchangeController";

const router: Router = express.Router();

const authLimit = rateLimit({
    windowMs: 60 * 1000,
    limit: 3,
    message: "Too many request."
});

const keyExchangeLimit = rateLimit({
    windowMs: 5 * 60 * 1000,
    limit: 10,
    message: "Too many request."
});



router.post('/register', authLimit, register );
router.post('/proof',authLimit, login );
router.get('/logout', logout);
router.get('/members', authLimit, getMembers);
router.post('/key-exchange', keyExchangeLimit, keyExchange);

export default router;