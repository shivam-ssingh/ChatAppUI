import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CryptoService } from '../../services/crypto.service';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

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
  private userDetailKey = 'userDetail';
  private router = inject(Router);
  private cryptoService = inject(CryptoService);

  constructor(private http: HttpClient) {}

  async ngOnInit() {
    this.userDetails = JSON.parse(
      localStorage.getItem(this.userDetailKey) || '{}'
    ); //https://stackoverflow.com/questions/46915002/argument-of-type-string-null-is-not-assignable-to-parameter-of-type-string
    await this.cryptoService.generateMasterKey(); // remove this
  }

  async addKey() {
    const publicKey = await this.fetchPublicKey(this.githubUserName);
    localStorage.setItem('publicKey', publicKey);
    this.router.navigate(['/chat']);
  }

  handleFileUpload(event: Event) {
    const fileInput = event.target as HTMLInputElement;
    if (fileInput.files && fileInput.files.length > 0) {
      const file = fileInput.files[0];
      const reader = new FileReader();

      //save self private key. encrypted
      reader.onload = async () => {
        localStorage.setItem(
          'privateKey',
          await this.cryptoService.encryptPrivateKey(reader.result as string)
        );
        this.privateKey = 'abc';
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
}
