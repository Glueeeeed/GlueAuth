/**
 * Auth Controller Module
 *
 * This module handles user registration by storing commitments and login via ZKP proof verification with JWT issuance.
 *
 * @module authController
 */
import {Response, Request} from "express";
import {checkIfCommitmentExists, checkIfNullifierExists, registerCommitment, registerNullifier} from "../services/authService";
import {decryptAesGcm} from "../utils/crypto";
import * as jwtLib from 'jsonwebtoken';
import {Secrets} from "./keyExchangeController";
import {deleteSecret} from "../services/keyExchangeService";
import { verifyProof } from "@semaphore-protocol/proof";
interface RegisterRequest {
    commitment: string;
    sessionID: string;
    secret: string;
    nonceHex: string;
}

interface RegisterResponse {
    message: string;
}

interface Credentials {

    zkp: any
    sessionID: string;
}


export const register = async (req: Request<{}, {}, RegisterRequest>, res: Response<RegisterResponse | {error: string}>): Promise<void> => {
    try {
        const { commitment, sessionID , secret, nonceHex } = req.body;

        if (secret === (Secrets.get(sessionID) || '')) {
            console.log(`Secret for session ID ${sessionID} is correct.`);
        }

        if (!commitment || !sessionID) {
            res.status(400).json({ error: 'Missing commitment or sessionID' });
            return;
        }
        const decryptedCommitment : string =  await decryptAesGcm(commitment, Secrets.get(sessionID) || '', nonceHex);

        if (await checkIfCommitmentExists(decryptedCommitment)) {
            res.status(409).json({ error: 'Commitment already exists' });
        }

        await registerCommitment(decryptedCommitment);
        res.status(200).json({ message: 'Commitment registered successfully' });
        deleteSecret(sessionID);
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }


}

export const login = async (req: Request<{}, {}, Credentials>, res: Response<RegisterResponse | {error: string}>): Promise<void> => {
    try {
        const { zkp , sessionID } = req.body;

        if (!zkp || !sessionID) {
            res.status(400).json({ error: 'Missing zkp  or sessionID' });
        }

        const nullifierExists : boolean = await checkIfNullifierExists(zkp.nullifier);
        if (nullifierExists) {
            res.status(400).json({ error: 'Nullifier already exists' });
        }

        const isValid = verifyProof(zkp);

        if (!isValid) {
            res.status(401).json({ error: 'Invalid proof' });
        }

        await registerNullifier(zkp.nullifier);
        const token= jwtLib.sign(
            {userID: zkp.message},
            process.env.SESSION_SECRET_JWT as string,
            {expiresIn: '15m'}
        );

        res.cookie('token', token, {
            maxAge: 60 * 60 * 1000,
            httpOnly: true,
            secure: false,
            sameSite: 'lax',
            path: '/'
        });

        res.status(200).json({ message: 'Authenticated successfully' });


        

    } catch (error) {
        console.log(error);
        res.status(500).json({error: "Internal Server Error"})
    }
}