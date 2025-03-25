import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CryptoService } from '../../services/crypto.service';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { StorageKeys } from '../../Constants';

interface UserDetails {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  userName: string;
}

@Component({
  selector: 'app-add-key',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './add-key.component.html',
  styleUrl: './add-key.component.css',
})
export class AddKeyComponent implements OnInit {
  userDetails = {} as UserDetails;
  privateKey = '';
  githubUserName = '';
  private router = inject(Router);
  private cryptoService = inject(CryptoService);
  private authService = inject(AuthService);

  selectedOption: string | null = null;
  publicKey: string | null = null;
  repoName: string = '';
  gistId: string = '';
  keyName: string = '';
  gistFileName: string = '';
  canProceed: boolean = false;
  publicKeyRetrieved: boolean = false;
  privateKeyRetrived: boolean = false;
  showFinalWarning: boolean = false;

  constructor(private http: HttpClient) {}

  async ngOnInit() {
    if (this.authService.missingKeys() == true) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      this.authService.missingKeys.set(false);
    }
    this.userDetails = JSON.parse(
      localStorage.getItem(StorageKeys.USERDETAIL) || '{}'
    ); //https://stackoverflow.com/questions/46915002/argument-of-type-string-null-is-not-assignable-to-parameter-of-type-string
    await this.cryptoService.generateMasterKey(); // remove this
    if (localStorage.getItem(StorageKeys.PUBLICKEY)) {
      this.publicKeyRetrieved = true;
    }
  }

  selectOption(option: string) {
    this.selectedOption = option;
    this.publicKey = null; // Reset public key display when changing options
  }

  async addKey() {
    const publicKey = await this.fetchPublicKey(this.githubUserName);
    localStorage.setItem(StorageKeys.PUBLICKEY, publicKey);
    this.router.navigate(['/chat']);
  }

  handleFileUpload(event: Event) {
    const fileInput = event.target as HTMLInputElement;
    if (fileInput.files && fileInput.files.length > 0) {
      const file = fileInput.files[0];
      const reader = new FileReader();

      //save self private key. encrypted
      reader.onload = async () => {
        // localStorage.setItem(
        //   StorageKeys.PRIVATEKEY,
        //   await this.cryptoService.encryptPrivateKey(reader.result as string)
        // );
        // this.privateKey = 'abc';
        await this.cryptoService.loadAndSavePrivateKey(reader.result as string);
        this.privateKeyRetrived = true;
      };

      reader.readAsText(file);
    }
  }

  async fetchPublicKey(githubUsername: string): Promise<string> {
    const url = `https://raw.githubusercontent.com/${githubUsername}/chat-key/main/chat-key.pem`;

    try {
      // return await firstValueFrom(this.http.get(url, { responseType: 'text' }));
      const publicKeyPem = await firstValueFrom(
        this.http.get(url, { responseType: 'text' })
      );
      return publicKeyPem;
    } catch (error) {
      throw new Error('Public key not found for user');
    }
  }

  async retrieveFromRepo() {
    const url = `https://raw.githubusercontent.com/${this.userDetails.userName}/${this.repoName}/main/${this.keyName}`;
    try {
      const publicKeyPem = await firstValueFrom(
        this.http.get(url, { responseType: 'text' })
      );
      localStorage.setItem(StorageKeys.PUBLICKEY, publicKeyPem);
      this.publicKeyRetrieved = true;
    } catch (error) {
      throw new Error('Public key not found for user');
    }
  }

  async retrieveFromGist() {
    const url = `https://api.github.com/gists/${this.gistId}`;
    try {
      const gistResponse: any = await firstValueFrom(
        this.http.get(url, { responseType: 'text' })
      );
      const gistData = JSON.parse(gistResponse);
      console.log(gistData);
      if (gistData.files && gistData.files[this.gistFileName]) {
        localStorage.setItem(
          StorageKeys.PUBLICKEY,
          gistData.files[this.gistFileName].content
        );
        this.publicKeyRetrieved = true;
      } else {
        throw new Error('Public key not found for user');
      }
    } catch (error) {
      throw new Error('Public key not found for user');
    }
  }

  proceed() {
    this.showFinalWarning = true;
  }
  continue() {
    this.showFinalWarning = false;
    this.router.navigate(['/chat']);
  }
}
