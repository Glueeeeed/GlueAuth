import {openDB} from "idb";
import {decryptAesGcm, getFingerprint, getSessionKey, scanQRCode, securePrivateKey, startCameraScan, verifyDeviceID} from "./utils.ts";
import type {sessionData} from "./register.ts";
import type {ThumbmarkResponse} from "@thumbmarkjs/thumbmarkjs";import {bytesToHex, hexToBytes, randomBytes} from "@noble/ciphers/utils.js";
import {pbkdf2} from "@noble/hashes/pbkdf2.js";
import {sha256} from "@noble/hashes/sha2.js";
import QrScanner from 'qr-scanner';
import {Identity} from "@semaphore-protocol/identity";
import {Group} from "@semaphore-protocol/group";
import {generateProof} from "@semaphore-protocol/proof"
import {hexToNumber} from "@noble/curves/utils.js";
import type {SemaphoreProof} from "@semaphore-protocol/core";


addEventListener('DOMContentLoaded', () => {
    const loginBtn = document.getElementById("loginBtn") as HTMLButtonElement;
    const uploadQRBtn = document.getElementById("uploadQRBtn") as HTMLInputElement;
    const scanQRBtn = document.getElementById("scanQRBtn") as HTMLButtonElement;
    const videoContainer = document.getElementById("videoContainer") as HTMLDivElement;
    const qrVideo = document.getElementById("qrVideo") as HTMLVideoElement;
    const closeCameraBtn = document.getElementById("closeCameraBtn") as HTMLButtonElement;
    const decryptBtn = document.getElementById("decryptBtn") as HTMLButtonElement;
    const pinInput = document.getElementById("pinInput") as HTMLInputElement;

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
                        const nonceHex  = bytesToHex(randomBytes(12));
                        const data = JSON.parse(qrData);
                        console.log(data.key)
                        await securePrivateKey(sessionStorage.getItem("fingerprint") as string, data.key, localStorage.getItem("DeviceID") as string, sessionStorage.getItem("baseKey") as string,nonceHex);
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
                    const nonceHex  = bytesToHex(randomBytes(12));
                    const data = JSON.parse(result);
                    await securePrivateKey(sessionStorage.getItem("fingerprint") as string, data.key, localStorage.getItem("DeviceID") as string, sessionStorage.getItem("baseKey") as string,nonceHex);
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

    if (decryptBtn && pinInput) {
        decryptBtn.addEventListener("click", async () => {
            const loadingSection = document.getElementById("loadingSection") as HTMLDivElement;
            loadingSection.hidden = false;
            const secretNotFound = document.getElementById("secretNotFound") as HTMLDivElement;
            secretNotFound.hidden = true;
            const pin = pinInput.value;
            const encryptedData : string | null = sessionStorage.getItem("encryptedQrCodeVal");
            if (pin && encryptedData) {
                try {

                    interface qrDataStructure {
                        key : string,
                        encrypted : boolean,
                        salt: string,
                        nonce : string,
                    }

                    const data = JSON.parse(encryptedData) as qrDataStructure;
                    console.log(data.key, data.salt, data.nonce)
                    const nonceHex  = bytesToHex(randomBytes(12));
                    const decryptedKey = await decryptQR(data.key, pin, data.nonce, data.salt);
                    await securePrivateKey(
                        sessionStorage.getItem("fingerprint") as string,
                        decryptedKey,
                        localStorage.getItem("DeviceID") as string,
                        sessionStorage.getItem("baseKey") as string,
                        nonceHex as string
                    );
                    const decryptSection = document.getElementById("decryptSection") as HTMLDivElement;
                    decryptSection.hidden = true;
                    const loginSection = document.getElementById("loginSection") as HTMLDivElement;
                    loginSection.hidden = false;
                    await login();
                } catch (error) {
                    console.error("Decryption failed:", error);
                    alert("Błędny PIN lub uszkodzone dane.");
                }
            } else {
                alert("Podaj PIN.");
            }
        });
    }

    verifyDeviceID();
});
async function decryptQR(encryptedData: string, PIN: string, nonceHex : string, salt : string): Promise<string> {
    const saltBytes : Uint8Array<ArrayBufferLike> = hexToBytes(salt);
    const key : Uint8Array<ArrayBufferLike> = pbkdf2(sha256, PIN, saltBytes, { c: 524288, dkLen: 32 });
    return await decryptAesGcm(encryptedData, bytesToHex(key), nonceHex);
}

async function checkIfSecretExists() : Promise<object | null> {
    try {
        const db = await openDB('gluecrypt', 2, {
            upgrade(db) {
                if (!db.objectStoreNames.contains('secrets')) {
                    db.createObjectStore('secrets');
                }
            }
        });
        const existingKey : string = await db.get('secrets', 'privateKey');
        const salt : string = await db.get('secrets', 'salt');
        const nonceHex : string = await db.get('secrets', 'nonceHex');
        if (existingKey != undefined && nonceHex != undefined && salt != undefined) {
            return {key: existingKey, salt: salt, nonce: nonceHex};
        } else {
            const loadingSection = document.getElementById("loadingSection") as HTMLDivElement;
            loadingSection.hidden = true;
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
    interface qrDataStructure {
        key : string,
        encrypted : boolean,
        salt: string,
        nonce : string,
    }
    const data  = JSON.parse(encryptedData) as qrDataStructure;
    return data.encrypted;

}

async function login(): Promise<void> {
    try {
        const loginSection = document.getElementById("loginSection") as HTMLDivElement;
        loginSection.hidden = true;
        const loadingSection = document.getElementById("loadingSection") as HTMLDivElement;
        loadingSection.hidden = false;
        const sessionData : sessionData =  await getSessionKey();
        const fingerprint : ThumbmarkResponse =  await getFingerprint();
        const deviceID : string = localStorage.getItem("DeviceID") as string;
        const baseKey : string = sessionData.baseKey;

        sessionStorage.setItem("fingerprint", fingerprint.thumbmark);
        sessionStorage.setItem("baseKey", baseKey);

        const encryptedSecret : object | null = await checkIfSecretExists();
        if (encryptedSecret != null) {
            interface secretStructure {
                key : string;
                salt: string;
                nonce: string;
            }
            const secrets = encryptedSecret as secretStructure;
            const combinedKey: string = fingerprint.thumbmark + deviceID + baseKey;
            const saltBytes : Uint8Array<ArrayBufferLike> = hexToBytes(secrets.salt);
            const key : Uint8Array<ArrayBufferLike> = pbkdf2(sha256, combinedKey, saltBytes, { c: 524288, dkLen: 32 });
            const secret : string = await decryptAesGcm(secrets.key,bytesToHex(key), secrets.nonce);
            const merkleRoot : Group = await getMerkleRoot();
            const proof : SemaphoreProof = await generateProofs(merkleRoot, sessionData.sessionID, secret);
            await authenticateViaProof(proof, sessionData.sessionID);
            window.open('/gluecrypt');
        }


        return;
    } catch (error) {
        console.error('Failed to login:', error);
        const errorMessage = document.getElementById('errorMessage') as HTMLDivElement;
        errorMessage.hidden = false;


    }
}

async function getMerkleRoot() : Promise<Group> {
    const response: Response = await fetch('http://localhost:3000/api/zkp/members', {
        method: 'GET',
        headers: {
            Accept: 'application/json',
        }
    })
    const obj =  await response.json();
    const commitmentsHex = obj.response;
    const group = new Group();
    commitmentsHex.forEach((m: string) => group.addMember(hexToNumber(m)));
    return group;
}


async function generateProofs(group : Group, sessionID: string, privateKey: string) {
    const identity = new Identity(hexToBytes(privateKey));
    const scope : string = sessionID;
    const message = "GlueAuth"
    return await generateProof(identity, group, message, scope);
}

async function authenticateViaProof(proof : object , sessionID : string,): Promise<void> {
    const authResponse = await fetch('http://localhost:3000/api/zkp/auth/proof', {
        method: 'POST',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            zkp: proof,
            sessionID: sessionID,
        }),
    })

    if (authResponse.status === 200) {
        alert('Pomyślnie zalogowano');
    }
}

