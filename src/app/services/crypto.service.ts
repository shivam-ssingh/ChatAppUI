import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class CryptoService {
  private encoder = new TextEncoder();
  private decoder = new TextDecoder();
  private masterKey!: CryptoKey;

  /** 🔹 Encrypt Message Before Sending */
  async encryptMessage(publicKey: CryptoKey, message: string): Promise<string> {
    const encryptedData = await crypto.subtle.encrypt(
      { name: 'RSA-OAEP' },
      publicKey,
      this.encoder.encode(message)
    );
    return this.arrayBufferToBase64(encryptedData);
  }

  /** 🔹 Decrypt Received Message */
  async decryptMessage(
    privateKey: CryptoKey,
    encryptedMessage: string
  ): Promise<string> {
    const binaryData = this.base64ToArrayBuffer(encryptedMessage);
    const decryptedData = await crypto.subtle.decrypt(
      { name: 'RSA-OAEP' },
      privateKey,
      binaryData
    );
    return this.decoder.decode(decryptedData);
  }

  // Generating a Master Key to encrypt our Private key.
  async generateMasterKey(): Promise<CryptoKey> {
    const storedKey = sessionStorage.getItem('masterKey');

    if (storedKey) {
      console.log('Master key already exists in sessionStorage.');
      return await this.getMasterKey();
    }

    const masterKey = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );

    // Export raw key and store in sessionStorage
    const exportedKey = await crypto.subtle.exportKey('raw', masterKey);
    sessionStorage.setItem('masterKey', this.arrayBufferToBase64(exportedKey));

    console.log('New master key generated and stored in sessionStorage.');
    return masterKey;
  }

  // we need a masterkey to encrypt our private key, we store this in session storage for now
  private async getMasterKey(): Promise<CryptoKey> {
    const storedKey = sessionStorage.getItem('masterKey');
    if (!storedKey) throw new Error('Master key not initialized');

    const keyBuffer = this.base64ToArrayBuffer(storedKey);
    return await crypto.subtle.importKey(
      'raw',
      keyBuffer,
      { name: 'AES-GCM' },
      true,
      ['encrypt', 'decrypt']
    );
  }

  // Encrypting private key using AES-GCM
  async encryptPrivateKey(privateKey: string): Promise<string> {
    this.masterKey = await this.getMasterKey();

    const iv = crypto.getRandomValues(new Uint8Array(12)); // IV for AES-GCM, think of it as salting.
    const encryptedData = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      this.masterKey,
      this.encoder.encode(privateKey)
    );

    return (
      this.arrayBufferToBase64(iv) +
      '.' +
      this.arrayBufferToBase64(encryptedData)
    );
  }

  // Decrypts Private key, we need this decrypted to decrypt the message.
  async decryptPrivateKey(encryptedData: string): Promise<string> {
    this.masterKey = await this.getMasterKey();

    const [ivB64, encryptedB64] = encryptedData.split('.');
    const iv = this.base64ToArrayBuffer(ivB64);
    const encryptedBuffer = this.base64ToArrayBuffer(encryptedB64);

    const decryptedData = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: new Uint8Array(iv) },
      this.masterKey,
      encryptedBuffer
    );

    return this.decoder.decode(decryptedData);
  }

  // Importing Private and public keys
  // https://stackoverflow.com/questions/54742554/subtlecrypto-importkey-from-pem
  // spki is used for private keys.
  async importPublicKey(pem: string): Promise<CryptoKey> {
    const binaryDer = this.base64ToArrayBuffer(
      pem.replace(/-----.*?-----/g, '')
    );
    return await crypto.subtle.importKey(
      'spki',
      binaryDer,
      { name: 'RSA-OAEP', hash: 'SHA-256' },
      true,
      ['encrypt']
    );
  }

  // pkcs8 is used for private keys
  async importPrivateKey(pem: string): Promise<CryptoKey> {
    const binaryDer = this.base64ToArrayBuffer(
      pem.replace(/-----.*?-----/g, '')
    );
    return await crypto.subtle.importKey(
      'pkcs8',
      binaryDer,
      { name: 'RSA-OAEP', hash: 'SHA-256' },
      true,
      ['decrypt']
    );
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    return btoa(String.fromCharCode(...new Uint8Array(buffer)));
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0)).buffer;
  }

  clearMasterKey() {
    sessionStorage.removeItem('masterKey');
    this.masterKey = null as any;
  }
}
