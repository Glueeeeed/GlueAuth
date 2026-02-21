import { type ThumbmarkResponse} from "@thumbmarkjs/thumbmarkjs";
import QRCode from 'qrcode'
import {randomBytes,bytesToHex} from "@noble/ciphers/utils.js";
import { sha256 } from '@noble/hashes/sha2.js';
import { pbkdf2 } from '@noble/hashes/pbkdf2.js';
import {Identity} from "@semaphore-protocol/core";
import {numberToHexUnpadded} from "@noble/curves/utils.js";
import {getSessionKey, verifyDeviceID, encryptAesGcm, getFingerprint, securePrivateKey} from "./utils.ts";

const registerBtn = document.getElementById("registerBtn") as HTMLButtonElement;
const understandBtn = document.getElementById("understandBtn") as HTMLButtonElement;
const downloadBtn = document.getElementById("downloadBtn") as HTMLButtonElement;

downloadBtn.addEventListener("click", () => {
    downloadQRCode();
})

addEventListener('DOMContentLoaded', () => {
    verifyDeviceID();
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

export interface sessionData {
    secret: string;
    sessionID: string;
    baseKey: string;
}


async function register(): Promise<void> {
    try {
        const nonceHex : string = bytesToHex(randomBytes(12));
        const sessionNonceHex : string = bytesToHex(randomBytes(12));
        const generatingSection = document.getElementById("generatingSection") as HTMLDivElement;
        generatingSection.hidden = false;
        const sessionData : sessionData = await getSessionKey();
        const identity = new Identity();
        const fingerprintData : ThumbmarkResponse = await getFingerprint();
        const deviceID = localStorage.getItem('DeviceID') as string;
        const privateKey = bytesToHex(identity.privateKey as Uint8Array);
        await securePrivateKey(fingerprintData.thumbmark, privateKey, deviceID, sessionData.baseKey, nonceHex);
        const encryptQRData = document.getElementById("encryptQR")  as HTMLInputElement;
        const commitment : string  = numberToHexUnpadded(identity.commitment);
        const encryptedCommitment : string = await encryptAesGcm(commitment, sessionData.secret,sessionNonceHex);

        const registerResponse = await fetch(`http://localhost:3000/api/zkp/auth/register`, { // CHANGE TO YOUR DOMAIN
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                commitment: encryptedCommitment,
                sessionID: sessionData.sessionID,
                nonceHex: sessionNonceHex,
            })
        });
        if (!registerResponse.ok) {
            throw new Error('HTTP error! status: ' + registerResponse.status);
        }
        if (registerResponse.status !== 200) {
            throw new Error('Registration failed with status: ' + registerResponse.status);
        }

        if (encryptQRData.checked) {
            interface qrDataStructure {
                key : string,
                encrypted : boolean,
                salt: string,
                nonce : string,
            }
            const pin : string = generatePIN();
            const privateKey : string = bytesToHex(identity.privateKey as Uint8Array);
            const encryptedData  =  await encryptQR(privateKey, pin) as qrDataStructure;
            const qrData : string = JSON.stringify({
                key: encryptedData.key,
                encrypted: true,
                salt: encryptedData.salt,
                nonce: encryptedData.nonce,
            })
            await generateQR(qrData);
            const pinInfo = document.getElementById("pinInfo") as HTMLDivElement;
            const pinCode = document.getElementById("pinCode") as HTMLSpanElement;
            const qrSection = document.getElementById("qrSection") as HTMLDivElement;
            generatingSection.hidden = true;
            pinInfo.hidden = false;
            qrSection.hidden = false;
            pinCode.textContent = pin;
        } else {
            const privateKey : string = bytesToHex(identity.privateKey as Uint8Array);
            const qrData : string = JSON.stringify({
                key: privateKey,
                encrypted: false
            })
            await generateQR(qrData);
            const qrSection = document.getElementById("qrSection") as HTMLDivElement;
            generatingSection.hidden = true;
            qrSection.hidden = false;
        }
    } catch (error) {
        console.error("Error during registration process:", error);
        const loading = document.getElementById("loading") as HTMLDivElement;
        loading.hidden = true;
        const errorSection = document.getElementById("errorMessage") as HTMLDivElement;
        errorSection.hidden = false;
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


async function encryptQR(privateKey: string, PIN: string): Promise<object> {
    const nonce : Uint8Array<ArrayBufferLike> = randomBytes(12);
    const salt : Uint8Array<ArrayBufferLike> = randomBytes(32);
    const key : Uint8Array<ArrayBufferLike> = pbkdf2(sha256, PIN, salt, { c: 524288, dkLen: 32 });
    console.log(bytesToHex(key));
    console.log("Pirvate key " + privateKey)
    const encryptedData : string = await encryptAesGcm(privateKey, bytesToHex(key),bytesToHex(nonce));
    return {key: encryptedData, salt: bytesToHex(salt) , nonce: bytesToHex(nonce)};
}










