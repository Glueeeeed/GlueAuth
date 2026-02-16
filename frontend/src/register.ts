import type {ThumbmarkResponse} from "@thumbmarkjs/thumbmarkjs";
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
        const generatingSection = document.getElementById("generatingSection") as HTMLDivElement;
        generatingSection.hidden = false;
        const sessionData : sessionData = await getSessionKey();
        const identity = new Identity();
        const fingerprintData : ThumbmarkResponse = await getFingerprint();
        const deviceID = localStorage.getItem('DeviceID') as string;
        console.log("Secret:" + identity.export());
        await securePrivateKey(fingerprintData.thumbmark, identity.export(), deviceID, sessionData.baseKey);
        const encryptQRData = document.getElementById("encryptQR")  as HTMLInputElement;
        const commitment : string  = numberToHexUnpadded(identity.commitment);
        const encryptedCommitment : string = await encryptAesGcm(commitment, sessionData.secret);

        const registerResponse = await fetch(`http://localhost:5173/api/zkp/auth/register`, { // CHANGE TO YOUR DOMAIN
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                commitment: encryptedCommitment,
                sessionID: sessionData.sessionID,
            })
        });
        if (!registerResponse.ok) {
            throw new Error('HTTP error! status: ' + registerResponse.status);
        }
        if (registerResponse.status !== 200) {
            throw new Error('Registration failed with status: ' + registerResponse.status);
        }

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




async function encryptQR(privateKey: string, PIN: string): Promise<string> {
    const salt : Uint8Array<ArrayBufferLike> = randomBytes(32);
    const key : Uint8Array<ArrayBufferLike> = pbkdf2(sha256, PIN, salt, { c: 524288, dkLen: 32 });
    const encryptedData : string = await encryptAesGcm(privateKey, bytesToHex(key));
    return encryptedData + "::" + bytesToHex(salt);
}










