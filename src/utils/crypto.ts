import { gcm } from '@noble/ciphers/aes.js';
import {randomBytes,bytesToHex, hexToBytes} from "@noble/ciphers/utils.js";
import  type {Cipher } from "@noble/ciphers/utils.js";

export async function encryptAesGcm(plainText : string, keyHex : string) : Promise<string> {
    const nonce : Uint8Array<ArrayBufferLike> = randomBytes(12);
    const key : Uint8Array<ArrayBufferLike> = hexToBytes(keyHex);
    const data : Uint8Array<ArrayBufferLike> = new TextEncoder().encode(plainText);
    const aes : Cipher = gcm(key, nonce);
    const cipher : Uint8Array<ArrayBufferLike> = aes.encrypt(data);
    const uint8Array = new Uint8Array(cipher);
    return bytesToHex(uint8Array) + ":" + bytesToHex(nonce);
}

export async function decryptAesGcm(cipherTextHex : string, keyHex : string , nonceHex: string) : Promise<string> {
    const nonce : Uint8Array<ArrayBufferLike> = hexToBytes(nonceHex);
    const cipherText : Uint8Array<ArrayBufferLike> = hexToBytes(cipherTextHex);
    const key : Uint8Array<ArrayBufferLike> = hexToBytes(keyHex);
    const aes : Cipher = gcm(key, nonce);
    const plainTextBytes : Uint8Array<ArrayBufferLike> = aes.decrypt(cipherText);
    return new TextDecoder().decode(plainTextBytes);
}