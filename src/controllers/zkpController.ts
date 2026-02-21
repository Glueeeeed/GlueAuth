/**
 * ZKP Controller Module
 *
 * This module provides endpoints for ZKP group management, such as retrieving group members.
 *
 * @module zkpController
 */
import {Response, Request} from 'express';
import {zkp} from "../app";

export const getMembers = async (req: Request, res: Response) : Promise<void> => {
 res.setHeader('Content-Type', 'application/json');
 res.send({response: await zkp.getGroup()});
}