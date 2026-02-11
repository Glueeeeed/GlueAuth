import * as ThumbmarkJS from '@thumbmarkjs/thumbmarkjs';
import type {ThumbmarkResponse} from "@thumbmarkjs/thumbmarkjs";
import  type {Cipher } from "@noble/ciphers/utils.js";
import {  x25519 } from '@noble/curves/ed25519.js';
import { gcm } from '@noble/ciphers/aes.js';
import {randomBytes,bytesToHex, hexToBytes} from "@noble/ciphers/utils.js";

const registerBtn = document.getElementById("registerBtn") as HTMLButtonElement;
registerBtn.addEventListener("click", async () => {
    try {
        await register();
    } catch (error) {
        console.error("Error during registration:", error);
    }
});

interface sessionData {
    secret: string;
    sessionID: string;
    baseKey: string;
}

export async function getFingerprint() : Promise<ThumbmarkResponse> {
    const tm = new ThumbmarkJS.Thumbmark();
    return await tm.get();
}




export async function getSessionKey() : Promise<sessionData> {
    try {
        const clientKeyPair : {secretKey: Uint8Array<ArrayBufferLike>, publicKey: Uint8Array<ArrayBufferLike>}    = x25519.keygen();
        const clientPublicKeyHex : Uint8Array<ArrayBufferLike> = clientKeyPair.publicKey;
        const clientPublicKeyHexString : string = bytesToHex(clientPublicKeyHex);
        const keyExchange : Response = await fetch(`http://localhost:5173/api/keyexchange`, { // CHANGE TO YOUR DOMAIN
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
        return {secret: bytesToHex(x25519.getSharedSecret(clientKeyPair.secretKey, serverPublicKeyBytes)).slice(0,32), sessionID: keyExchangeData.sessionID, baseKey: keyExchangeData.baseKey} as sessionData;
    } catch (error) {
        console.error("Error generating session key:", error);
        throw error;
    }
}

export async function encryptAesGcm(plainText : string, keyHex : string) : Promise<string> {
    const nonce : Uint8Array<ArrayBufferLike> = randomBytes(12);
    const key : Uint8Array<ArrayBufferLike> = hexToBytes(keyHex);
    const data : Uint8Array<ArrayBufferLike> = new TextEncoder().encode(plainText);
    const aes : Cipher = gcm(key, nonce);
    const cipher : Uint8Array<ArrayBufferLike> = aes.encrypt(data);
    const uint8Array = new Uint8Array(cipher);
    return bytesToHex(uint8Array) + ":" + bytesToHex(nonce);
}

export async function decryptAesGcm(cipherTextWithNonce : string, keyHex : string) : Promise<string> {
    const parts = cipherTextWithNonce.split(":");
    if (parts.length !== 2) {
        throw new Error("Invalid cipher text format. Expected 'cipher:nonce'");
    }
    const cipherText : Uint8Array<ArrayBufferLike> = hexToBytes(parts[0]);
    const nonce : Uint8Array<ArrayBufferLike> = hexToBytes(parts[1]);
    const key : Uint8Array<ArrayBufferLike> = hexToBytes(keyHex);
    const aes : Cipher = gcm(key, nonce);
    const plainTextBytes : Uint8Array<ArrayBufferLike> = aes.decrypt(cipherText);
    return new TextDecoder().decode(plainTextBytes);
}

async function register(): Promise<void> {
    const sessionData : sessionData = await getSessionKey();
    const encryptedUsername : string = await encryptAesGcm("testuser", sessionData.secret);
    console.log("Encrypted username:", encryptedUsername);
    console.log( await decryptAesGcm(encryptedUsername, sessionData.secret));
}





