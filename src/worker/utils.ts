// src/worker/utils.ts
export const toD1ISOString = (date: Date): string => date.toISOString().slice(0, 19).replace('T', ' ');

export async function cryptoKeyToPem(privateKey: CryptoKey): Promise<string> {
    const exported = await crypto.subtle.exportKey('pkcs8', privateKey);
    const exportedAsString = String.fromCharCode.apply(null, new Uint8Array(exported) as any); // This is problematic for binary data
    const exportedAsBase64 = btoa(exportedAsString);
    return `-----BEGIN PRIVATE KEY-----\n${exportedAsBase64}\n-----END PRIVATE KEY-----`;
}

// A more robust ArrayBuffer to Base64
function arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

export async function cryptoKeyToPkcs8Pem(privateKey: CryptoKey): Promise<string> {
    const exported = await crypto.subtle.exportKey('pkcs8', privateKey);
    const exportedAsBase64 = arrayBufferToBase64(exported);
    return `-----BEGIN PRIVATE KEY-----\n${exportedAsBase64.match(/.{1,64}/g)?.join('\n')}\n-----END PRIVATE KEY-----`;
}

export async function cryptoKeyToSpkiPem(publicKey: CryptoKey): Promise<string> {
    const exported = await crypto.subtle.exportKey('spki', publicKey);
    const exportedAsBase64 = arrayBufferToBase64(exported);
    return `-----BEGIN PUBLIC KEY-----\n${exportedAsBase64.match(/.{1,64}/g)?.join('\n')}\n-----END PUBLIC KEY-----`;
}
