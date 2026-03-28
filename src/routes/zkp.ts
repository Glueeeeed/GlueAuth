import express, { Router } from 'express';
import {getMembers} from "../controllers/zkpController";
import rateLimit from "express-rate-limit";

const limiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 3,
    message: "Too many request."
});

const router: Router = express.Router();

router.get('/members', limiter, getMembers);
export default router;