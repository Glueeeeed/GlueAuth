import express, { Router } from 'express';
import {login, register, logout} from '../controllers/authController';
import rateLimit from "express-rate-limit";

const router: Router = express.Router();

const authLimit = rateLimit({
    windowMs: 60 * 1000,
    limit: 3,
    message: "Too many request."
});

router.post('/register', authLimit, register );
router.post('/proof',authLimit, login );
router.get('/logout', logout);

export default router;