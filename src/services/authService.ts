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
    const actualGroup = zkp.getGroupSize();

    await db.query('INSERT INTO commitments ( merkleIndex , userID, commitment) VALUES (?, ?, ?)', [actualGroup,userID, commitment]);
    zkp.addToGroup(commitment);
}

export async function checkIfNullifierExists(nullifier: string): Promise<boolean> {
    const [rows] = await db.query('SELECT * FROM nullifier_history WHERE nullifier = ?', [ nullifier]);
    if ((rows as object[]).length > 0) {
        return true;
    }
    return false;
}

export async function registerNullifier(commitment: string): Promise<void> {
    const date = new Date();
    await db.query('INSERT INTO nullifier_history (nullifier, use_date) VALUES (?,?)', [commitment, date.toUTCString()]);
}

