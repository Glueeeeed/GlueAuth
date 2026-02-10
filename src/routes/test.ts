import express, { Router, Request, Response } from 'express';
import {test} from '../controllers/testController';

const router: Router = express.Router();

router.post('/test', test);

export default router;