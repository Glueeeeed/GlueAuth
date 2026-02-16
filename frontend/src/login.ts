import {openDB} from "idb";
import {getSessionKey, verifyDeviceID, decryptAesGcm, getFingerprint, scanQRCode, startCameraScan, securePrivateKey} from "./utils.ts";
import type {sessionData} from "./register.ts";
import type {ThumbmarkResponse} from "@thumbmarkjs/thumbmarkjs";
import {bytesToHex, hexToBytes} from "@noble/ciphers/utils.js";
import {pbkdf2} from "@noble/hashes/pbkdf2.js";
import {sha256} from "@noble/hashes/sha2.js";
import QrScanner from 'qr-scanner';


addEventListener('DOMContentLoaded', () => {
    const loginBtn = document.getElementById("loginBtn") as HTMLButtonElement;
    const uploadQRBtn = document.getElementById("uploadQRBtn") as HTMLInputElement;
    const scanQRBtn = document.getElementById("scanQRBtn") as HTMLButtonElement;
    const videoContainer = document.getElementById("videoContainer") as HTMLDivElement;
    const qrVideo = document.getElementById("qrVideo") as HTMLVideoElement;
    const closeCameraBtn = document.getElementById("closeCameraBtn") as HTMLButtonElement;

    let qrScanner: QrScanner | null = null;

    if (loginBtn) {
        loginBtn.addEventListener("click", () => {
            login();
        });
    }

    if (uploadQRBtn) {
        uploadQRBtn.addEventListener("change", async () => {
            if (uploadQRBtn.files && uploadQRBtn.files[0]) {
                const file = uploadQRBtn.files[0];
                try {
                    const qrData : string = await scanQRCode(file);
                    const isEncrypted : boolean = await checkIfQrCodeIsEncrypted(qrData);
                    if (isEncrypted) {
                        sessionStorage.setItem("encryptedQrCodeVal", qrData);
                        const decryptSection = document.getElementById("decryptSection") as HTMLDivElement;
                        const notFoundSection = document.getElementById("secretNotFound") as HTMLDivElement;
                        notFoundSection.hidden = true;
                        decryptSection.hidden = false;
                    } else {
                        await securePrivateKey(sessionStorage.getItem("fingerprint") as string, qrData, localStorage.getItem("DeviceID") as string, sessionStorage.getItem("baseKey") as string);
                        login();
                    }
                } catch (error) {
                    console.error(error);
                }
            }
        })
    }

    if (scanQRBtn && qrVideo && videoContainer) {
        scanQRBtn.addEventListener("click", async () => {
            videoContainer.hidden = false;
            qrScanner = startCameraScan(qrVideo, async (result) => {
                console.log("Scanned QR from camera:", result);
                if (qrScanner) {
                    qrScanner.stop();
                    qrScanner.destroy();
                    qrScanner = null;
                }
                videoContainer.hidden = true;
                const isEncrypted : boolean = await checkIfQrCodeIsEncrypted(result);
                if (isEncrypted) {
                    sessionStorage.setItem("encryptedQrCodeVal", result);
                    const decryptSection = document.getElementById("decryptSection") as HTMLDivElement;
                    const notFoundSection = document.getElementById("secretNotFound") as HTMLDivElement;
                    notFoundSection.hidden = true;
                    decryptSection.hidden = false;
                } else {
                    await securePrivateKey(sessionStorage.getItem("fingerprint") as string, result, localStorage.getItem("DeviceID") as string, sessionStorage.getItem("baseKey") as string);
                    login();
                }
            });
        });
    }

    if (closeCameraBtn && videoContainer) {
        closeCameraBtn.addEventListener("click", () => {
            if (qrScanner) {
                qrScanner.stop();
                qrScanner.destroy();
                qrScanner = null;
            }
            videoContainer.hidden = true;
        });
    }

    verifyDeviceID();
});

async function checkIfSecretExists() : Promise<string | null> {
    try {
        const db = await openDB('gluecrypt', 2, {
            upgrade(db) {
                if (!db.objectStoreNames.contains('secrets')) {
                    db.createObjectStore('secrets');
                }
            }
        });
        const existingKey : string = await db.get('secrets', 'privateKey');
        if (existingKey != undefined) {
            return existingKey;
        } else {
            const loginSection = document.getElementById("loginSection") as HTMLDivElement;
            const secretNotFound = document.getElementById("secretNotFound") as HTMLDivElement;
            loginSection.hidden = true;
            secretNotFound.hidden = false;
            return null;
        }
    } catch (error) {
        console.error('Failed to save:', error);
         return null;
    }
}

async function checkIfQrCodeIsEncrypted(encryptedData : string): Promise<boolean> {
    const encryptTag: string = encryptedData.slice(-13);
    if (encryptTag === "||ENCRYPTED||") {
        return true;
    }
    return false;
}

async function login(): Promise<void> {
    const sessionData : sessionData =  await getSessionKey();
    const fingerprint : ThumbmarkResponse =  await getFingerprint();
    const deviceID : string = localStorage.getItem("DeviceID") as string;
    const baseKey : string = sessionData.baseKey;

    sessionStorage.setItem("fingerprint", deviceID);
    sessionStorage.setItem("baseKey", baseKey);

    const encryptedSecret : string | null = await checkIfSecretExists();
    if (encryptedSecret != null) {
        const combinedKey = fingerprint.thumbmark + deviceID + baseKey;
        const [encryptedData, salt] : string[]  = encryptedSecret.split("|");
        const saltBytes : Uint8Array<ArrayBufferLike> = hexToBytes(salt);
        const key : Uint8Array<ArrayBufferLike> = pbkdf2(sha256, combinedKey, saltBytes, { c: 524288, dkLen: 32 });
        const secret : string = await decryptAesGcm(encryptedData,bytesToHex(key));
        console.log(secret)
    }

    return;
}

