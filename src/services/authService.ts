import db from '../configs/database';
import crypto from 'crypto';
import {zkp} from "../app";

export async function checkIfCommitmentExists(commitment: string): Promise<boolean> {
    const [rows] = await db.query('SELECT * FROM commitments WHERE commitment = ?', [ commitment]);
    if ((rows as object[]).length > 0) {
        return true;
    }
    return false;
}

export async function registerCommitment(commitment: string): Promise<void> {
    const userID = crypto.randomBytes(12).toString('base64');
    const actualGroup = zkp.getGroup();

    await db.query('INSERT INTO commitments ( merkleIndex , userID, commitment) VALUES (?, ?, ?)', [actualGroup.length++,userID, commitment]);
    zkp.addToGroup(commitment);
}