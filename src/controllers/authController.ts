import {Response, Request} from "express";
import {checkIfCommitmentExists, registerCommitment} from "../services/authService";
import {decryptAesGcm} from "../utils/crypto";
import {Secrets} from "./keyExchangeController";
import {deleteSecret} from "../services/keyExchangeService";

interface RegisterRequest {
    commitment: string;
    sessionID: string;
    secret: string;
}

interface RegisterResponse {
    message: string;
}


export const register = async (req: Request<{}, {}, RegisterRequest>, res: Response<RegisterResponse | {error: string}>): Promise<void> => {
    try {
        const { commitment, sessionID , secret } = req.body;

        if (secret === (Secrets.get(sessionID) || '')) {
            console.log(`Secret for session ID ${sessionID} is correct.`);
        }

        if (!commitment || !sessionID) {
            res.status(400).json({ error: 'Missing commitment or sessionID' });
            return;
        }
        const decryptedCommitment : string =  await decryptAesGcm(commitment, Secrets.get(sessionID) || '');

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