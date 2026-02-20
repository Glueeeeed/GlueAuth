import express, { Router, Request, Response } from 'express';
import {getMembers} from "../controllers/zkpController";
import {verifyProof} from "@semaphore-protocol/proof";

const router: Router = express.Router();

router.get('/members', getMembers);
export default router;