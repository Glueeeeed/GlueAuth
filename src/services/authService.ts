import db from '../config/database';
import {zkp} from "../app";

export async function checkIfCommitmentExists(commitment: string): Promise<boolean> {
    const [rows] = await db.execute('SELECT * FROM commitments WHERE commitment = ?', [ commitment]);
    if ((rows as object[]).length > 0) {
        return true;
    }
    return false;
}

export async function checkIfDeviceRegistered(deviceID: string): Promise<boolean> {
    const [rows] = await db.execute('SELECT * FROM devices WHERE deviceID = ?', [ deviceID]);
    if ((rows as object[]).length > 0) {
        return true;
    }
    return false;
}


export async function registerCommitment(commitment: string): Promise<void> {
    await db.execute('INSERT INTO commitments ( commitment) VALUES (?)', [ commitment]);
    zkp.addToGroup(commitment);
}

export async function registerDevice(deviceID: string): Promise<void> {
    await db.execute('INSERT INTO devices (deviceID) VALUES (?)', [ deviceID]);
}

export async function checkIfNullifierExists(nullifier: string): Promise<boolean> {
    const [rows] = await db.execute('SELECT * FROM nullifier_history WHERE nullifier = ?', [ nullifier]);
    if ((rows as object[]).length > 0) {
        return true;
    }
    return false;
}

export async function registerNullifier(commitment: string): Promise<void> {
    const date = new Date();
    await db.execute('INSERT INTO nullifier_history (nullifier, use_date) VALUES (?,?)', [commitment, date.toUTCString()]);
}

