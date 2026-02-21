import {Response, Request} from 'express';
import {zkp} from "../app";

export const getMembers = async (req: Request, res: Response) : Promise<void> => {
 res.setHeader('Content-Type', 'application/json');
 res.send({response: await zkp.getGroup()});
}