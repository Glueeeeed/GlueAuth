import express, { Router } from 'express';
import {getMembers} from "../controllers/zkpController";

const router: Router = express.Router();

router.get('/members', getMembers);
export default router;