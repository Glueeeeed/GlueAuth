import {x25519} from "@noble/curves/ed25519.js";
import {bytesToHex, type Cipher, hexToBytes, randomBytes} from "@noble/ciphers/utils.js";
import type {sessionData} from "./register.ts";
import {gcm} from "@noble/ciphers/aes.js";
import {type ThumbmarkResponse} from "@thumbmarkjs/thumbmarkjs";
import * as ThumbmarkJS from "@thumbmarkjs/thumbmarkjs";
import {openDB} from "idb";
import {pbkdf2} from "@noble/hashes/pbkdf2.js";
import {sha256} from "@noble/hashes/sha2.js";
import QrScanner from 'qr-scanner';

export async function getSessionKey() : Promise<sessionData> {
    try {
        const clientKeyPair : {secretKey: Uint8Array<ArrayBufferLike>, publicKey: Uint8Array<ArrayBufferLike>}    = x25519.keygen();
        const clientPublicKeyHex : Uint8Array<ArrayBufferLike> = clientKeyPair.publicKey;
        const clientPublicKeyHexString : string = bytesToHex(clientPublicKeyHex);
        const keyExchange : Response = await fetch(`http://localhost:3000/api/keyexchange`, { // CHANGE TO YOUR DOMAIN
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                clientPublicKey: clientPublicKeyHexString
            })
        });
        if (!keyExchange.ok) {
            throw new Error('HTTP error! status: ' + keyExchange.status);
        }


        const keyExchangeData  = await keyExchange.json();
        const serverPublicKeyBytes : Uint8Array<ArrayBufferLike>  = hexToBytes(keyExchangeData.serverPublicKey);
        return {secret: bytesToHex(x25519.getSharedSecret(clientKeyPair.secretKey, serverPublicKeyBytes)), sessionID: keyExchangeData.sessionID, baseKey: keyExchangeData.baseKey} as sessionData;
    } catch (error) {
        console.error("Error generating session key:", error);
        throw error;
    }
}

export function verifyDeviceID() {
    if (localStorage.getItem('DeviceID') === null) {
        const DeviceID = crypto.randomUUID();
        localStorage.setItem('DeviceID', DeviceID);
    }
}

export async function encryptAesGcm(plainText : string, keyHex : string, nonceHex : string) : Promise<string> {
    const nonce : Uint8Array<ArrayBufferLike> = hexToBytes(nonceHex);
    const key : Uint8Array<ArrayBufferLike> = hexToBytes(keyHex);
    const data : Uint8Array<ArrayBufferLike> = new TextEncoder().encode(plainText);
    const aes : Cipher = gcm(key, nonce);
    const cipher : Uint8Array<ArrayBufferLike> = aes.encrypt(data);
    const uint8Array = new Uint8Array(cipher);
    return bytesToHex(uint8Array);
}

export async function decryptAesGcm(cipherTextHex : string, keyHex : string , nonceHex: string) : Promise<string> {
    const nonce : Uint8Array<ArrayBufferLike> = hexToBytes(nonceHex);
    const cipherText : Uint8Array<ArrayBufferLike> = hexToBytes(cipherTextHex);
    const key : Uint8Array<ArrayBufferLike> = hexToBytes(keyHex);
    const aes : Cipher = gcm(key, nonce);
    const plainTextBytes : Uint8Array<ArrayBufferLike> = aes.decrypt(cipherText);
    return new TextDecoder().decode(plainTextBytes);
}

export async function getFingerprint() : Promise<ThumbmarkResponse> {
    const tm = new ThumbmarkJS.Thumbmark();
    return await tm.get();
}

export async function insertKey(encryptedKey: string , salt : string, nonceHex : string) : Promise<void>  {
    try {
        const db = await openDB('gluecrypt', 2, {
            upgrade(db) {
                if (!db.objectStoreNames.contains('secrets')) {
                    db.createObjectStore('secrets');
                }
            }
        });
        const data = encryptedKey;
        await db.put('secrets', data, 'privateKey');
        await db.put('secrets', salt, 'salt');
        await db.put('secrets', nonceHex, 'nonceHex');
    } catch (error) {
        console.error('Failed to save:', error);
    }
}


export async function securePrivateKey(fingerprint: string, privateKey: string, deviceID: string, baseKey: string, nonceHex : string ): Promise<void> {
    const combinedKey : string = fingerprint + deviceID + baseKey;
    const salt : Uint8Array<ArrayBufferLike> = randomBytes(32)
    const key : Uint8Array<ArrayBufferLike> = pbkdf2(sha256, combinedKey, salt, { c: 524288, dkLen: 32 });
    const encryptedPrivateKey : string =  await encryptAesGcm(privateKey, bytesToHex(key), nonceHex);
    await insertKey(encryptedPrivateKey, bytesToHex(salt), nonceHex);

}

export async function scanQRCode(source: File | HTMLImageElement | HTMLCanvasElement | string): Promise<string> {
    try {
        const result = await QrScanner.scanImage(source, { returnDetailedScanResult: true });
        return result.data;
    } catch (error) {
        console.error("Failed to scan QR code:", error);
        throw error;
    }
}

export function startCameraScan(videoElement: HTMLVideoElement, onResult: (result: string) => void): QrScanner {
    const qrScanner = new QrScanner(
        videoElement,
        result => onResult(result.data),
        {
            highlightScanRegion: true,
            highlightCodeOutline: true,
        }
    );
    qrScanner.start();
    return qrScanner;
}
