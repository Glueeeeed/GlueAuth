/**
 * Key Exchange Controller Module
 *
 * This module implements the Diffie-Hellman key exchange protocol using elliptic curve
 * cryptography (x25519) to establish secure communication channels between clients and server.
 *
 * @module keyExchangeController
 */

import dotenv from 'dotenv';
import {Request, Response} from "express";
import crypto from "crypto";
import {computeSharedSecret, deleteSecret, generateKeyPair} from "../services/keyExchangeService";
dotenv.config({ path: './src/configs/secrets.env' })


interface KeyExchangeRequest {
    clientPublicKey: string;
}

interface KeyExchangeResponse {
    serverPublicKey: string;
    sessionID: string;
    baseKey: string;
}


// In-memory storage for session secrets
export const Secrets = new Map<string, string>();

export const  keyExchange = async (req: Request<{}, {}, KeyExchangeRequest>, res: Response<KeyExchangeResponse | { error: string }>): Promise<void> => {
    try {
        const clientPublicKey : string = req.body.clientPublicKey;
        if (!clientPublicKey) {
            res.status(400).json({ error: 'Invalid client public key' });
            return;
        }
        const uint8ClientPublicKey : Uint8Array<ArrayBufferLike> = Uint8Array.from(Buffer.from(clientPublicKey, 'hex'));
        const serverKeyPair    = generateKeyPair();
        const sharedSecret = computeSharedSecret(serverKeyPair.secret, uint8ClientPublicKey);
        const sessionID : string = crypto.randomBytes(10).toString('base64');
        const serverKeyHex : string = Buffer.from(serverKeyPair.public).toString('hex');
        Secrets.set(sessionID, sharedSecret.sharedSecret);
        res.status(200).json({ serverPublicKey: serverKeyHex, sessionID: sessionID, baseKey: process.env.baseKey || '' });
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}