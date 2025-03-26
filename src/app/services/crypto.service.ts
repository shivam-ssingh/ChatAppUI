import { Injectable, signal } from '@angular/core';
import { StorageKeys } from '../Constants';

@Injectable({
  providedIn: 'root',
})
export class CryptoService {
  private encoder = new TextEncoder();
  private decoder = new TextDecoder();
  private masterKey!: CryptoKey;
  // private privateKey!: CryptoKey;
  privateKey = signal<CryptoKey | null>(null);

  //TODO: Save the public key and encrypted Private key in indexed db for more safety

  constructor() {
    this.setupUnloadWarning();
  }

  async verifyKeyPair() {
    try {
      const testString = 'Test message';
      const importedPublicKey = await this.importPublicKey(
        localStorage.getItem(StorageKeys.PUBLICKEY)!
      );
      const encryptedMessage = await this.encryptMessage(
        importedPublicKey,
        testString
      );
      const decryptedMessage = await this.decryptMessageWithInMemoryPrimaryKey(
        encryptedMessage
      );
      return testString === decryptedMessage;
    } catch (error) {
      console.log(error);
      return false;
    }
  }

  // encrypting the message with public key
  async encryptMessage(publicKey: CryptoKey, message: string): Promise<string> {
    const encryptedData = await crypto.subtle.encrypt(
      { name: 'RSA-OAEP' },
      publicKey,
      this.encoder.encode(message)
    );
    return this.arrayBufferToBase64(encryptedData);
  }

  // encrypting the message with private key
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

  // encrypting the message with private key
  async decryptMessageWithInMemoryPrimaryKey(
    encryptedMessage: string
  ): Promise<string> {
    const binaryData = this.base64ToArrayBuffer(encryptedMessage);
    const decryptedData = await crypto.subtle.decrypt(
      { name: 'RSA-OAEP' },
      this.privateKey()!,
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

  private setupUnloadWarning() {
    window.addEventListener('beforeunload', (event) => {
      if (this.privateKey()) {
        event.preventDefault();
        // event.returnValue = '';
      }
    });
  }

  // load and save privateKey
  async loadAndSavePrivateKey(privateKey: string) {
    this.privateKey.set(await this.importPrivateKey(privateKey));
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

  // encrypting file
  async encryptFile(
    publicKey: CryptoKey,
    fileData: ArrayBuffer
  ): Promise<{
    encryptedKey: string;
    encryptedFile: ArrayBuffer;
    iv: Uint8Array;
  }> {
    const aesKey = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );

    const iv = crypto.getRandomValues(new Uint8Array(12));

    // Encryptin the file:
    const encryptedFile = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      aesKey,
      fileData
    );

    const exportedKey = await crypto.subtle.exportKey('raw', aesKey);

    // Encrypt the AES key with the RSA public key
    const encryptedKey = await crypto.subtle.encrypt(
      { name: 'RSA-OAEP' },
      publicKey,
      exportedKey
    );

    return {
      encryptedKey: this.arrayBufferToBase64(encryptedKey),
      encryptedFile,
      iv,
    };
  }

  async decryptFile(
    privateKey: CryptoKey,
    encryptedKeyBase64: string,
    encryptedData: ArrayBuffer,
    ivArray: number[]
  ): Promise<ArrayBuffer> {
    try {
      const encryptedKey = this.base64ToArrayBuffer(encryptedKeyBase64);

      // Convert IV array back to Uint8Array
      const iv = new Uint8Array(ivArray);

      // Decrypt the AES key using private key
      const decryptedKeyBuffer = await crypto.subtle.decrypt(
        { name: 'RSA-OAEP' },
        privateKey,
        encryptedKey
      );

      const aesKey = await crypto.subtle.importKey(
        'raw',
        decryptedKeyBuffer,
        { name: 'AES-GCM', length: 256 },
        false,
        ['decrypt']
      );

      const decryptedData = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        aesKey,
        encryptedData
      );

      return decryptedData;
    } catch (error) {
      console.error('Decryption error:', error);
      throw error;
    }
  }

  async decryptFileWithInMemoryPrivateKey(
    encryptedKeyBase64: string,
    encryptedData: ArrayBuffer,
    ivArray: number[]
  ): Promise<ArrayBuffer> {
    try {
      const encryptedKey = this.base64ToArrayBuffer(encryptedKeyBase64);

      // Convert IV array back to Uint8Array
      const iv = new Uint8Array(ivArray);

      // Decrypt the AES key using private key
      const decryptedKeyBuffer = await crypto.subtle.decrypt(
        { name: 'RSA-OAEP' },
        this.privateKey()!,
        encryptedKey
      );

      const aesKey = await crypto.subtle.importKey(
        'raw',
        decryptedKeyBuffer,
        { name: 'AES-GCM', length: 256 },
        false,
        ['decrypt']
      );

      const decryptedData = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        aesKey,
        encryptedData
      );

      return decryptedData;
    } catch (error) {
      console.error('Decryption error:', error);
      throw error;
    }
  }
}
