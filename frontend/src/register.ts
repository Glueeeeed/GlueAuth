import * as ThumbmarkJS from '@thumbmarkjs/thumbmarkjs';
import type {ThumbmarkResponse} from "@thumbmarkjs/thumbmarkjs";
import  type {Cipher } from "@noble/ciphers/utils.js";
import {  x25519 } from '@noble/curves/ed25519.js';
import QRCode from 'qrcode'
import { gcm } from '@noble/ciphers/aes.js';
import {randomBytes,bytesToHex, hexToBytes} from "@noble/ciphers/utils.js";
import { sha256 } from '@noble/hashes/sha2.js';
import { pbkdf2 } from '@noble/hashes/pbkdf2.js';
import {Identity} from "@semaphore-protocol/core";
import { openDB} from 'idb';

const registerBtn = document.getElementById("registerBtn") as HTMLButtonElement;
const understandBtn = document.getElementById("understandBtn") as HTMLButtonElement;
const downloadBtn = document.getElementById("downloadBtn") as HTMLButtonElement;

downloadBtn.addEventListener("click", () => {
    downloadQRCode();
})

understandBtn.addEventListener("click", async ()  => {
    const infoSection = document.getElementById("infoSection") as HTMLDivElement;
    infoSection.hidden = true;
    await register();
})
registerBtn.addEventListener("click", async () => {
    try {
        initializeRegistration();
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
    const generatingSection = document.getElementById("generatingSection") as HTMLDivElement;
    generatingSection.hidden = false;
    const sessionData : sessionData = await getSessionKey();
    const identity = new Identity();
    // const fingerprintData : ThumbmarkResponse = await getFingerprint(); to jest ogolnie zjebane naprawie to pozniej, na razie testowo daje stringa
    await securePrivateKey('dgfhfgjnf', identity.export(), sessionData.sessionID, sessionData.baseKey);
    const encryptQRData = document.getElementById("encryptQR")  as HTMLInputElement;
    if (encryptQRData.checked) {
        const pin : string = generatePIN();
        const encryptedData : string =  await encryptQR(identity.export(), pin);
        await generateQR(encryptedData + '||' + 'ENCRYPTED' + '||');
        const pinInfo = document.getElementById("pinInfo") as HTMLDivElement;
        const pinCode = document.getElementById("pinCode") as HTMLSpanElement;
        const qrSection = document.getElementById("qrSection") as HTMLDivElement;
        generatingSection.hidden = true;
        pinInfo.hidden = false;
        qrSection.hidden = false;
        pinCode.textContent = pin;
    } else {
        await generateQR(identity.export());
        const qrSection = document.getElementById("qrSection") as HTMLDivElement;
        generatingSection.hidden = true;
        qrSection.hidden = false;
    }


}

function initializeRegistration(): void {
    const registerSection = document.getElementById("registerSection") as HTMLDivElement;
    registerSection.hidden = true;
    const infoSection = document.getElementById("infoSection") as HTMLDivElement;
    infoSection.hidden = false;
}

 const generateQR   = async (text : string)  => {
    QRCode.toCanvas(document.getElementById('qrCode'), text, function (error) {
        if (error) console.error(error)
        console.log('success!');
    })
}

 function downloadQRCode(filename = 'AuthQRCode') {
    const canvas = document.getElementById('qrCode') as HTMLCanvasElement | null;

    if (!canvas) {
        console.error('No QR code found to download');
        return;
    }

    const dataURL = canvas.toDataURL('image/png');


    const downloadLink = document.createElement('a');
    downloadLink.href = dataURL;
    downloadLink.download = `${filename}.png`;

    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
}


function generatePIN(): string {
    const bytes : Uint8Array<ArrayBufferLike> = randomBytes(4);
    const view = new DataView(bytes.buffer);
    const randomNumber : number = view.getUint32(0);
    return (randomNumber % 1000000).toString().padStart(6, '0');
}

async function securePrivateKey(fingerprint: ThumbmarkResponse, privateKey: string, deviceID: string, baseKey: string ): Promise<void> {
    const combinedKey : string = fingerprint + deviceID + baseKey;
    const salt : Uint8Array<ArrayBufferLike> = randomBytes(32)
    const key : Uint8Array<ArrayBufferLike> = pbkdf2(sha256, combinedKey, salt, { c: 524288, dkLen: 32 });
    const encryptedPrivateKey : string =  await encryptAesGcm(privateKey, bytesToHex(key));
    await insertKey(encryptedPrivateKey, bytesToHex(salt));

}

async function encryptQR(privateKey: string, PIN: string): Promise<string> {
    const salt : Uint8Array<ArrayBufferLike> = randomBytes(32);
    const key : Uint8Array<ArrayBufferLike> = pbkdf2(sha256, PIN, salt, { c: 524288, dkLen: 32 });
    const encryptedData : string = await encryptAesGcm(privateKey, bytesToHex(key));
    return encryptedData + "::" + bytesToHex(salt);
}


async function insertKey(encryptedKey: string , salt : string) {
    try {
        const db = await openDB('gluecrypt', 2, {
            upgrade(db, oldVersion, newVersion, transaction) {
                if (!db.objectStoreNames.contains('keys')) {
                    db.createObjectStore('keys');
                }
            }
        });
        const data = encryptedKey + "|" + salt;
        await db.put('keys', data, 'privateKey');
    } catch (error) {
        console.error('Failed to save:', error);
        return null;
    }
}







