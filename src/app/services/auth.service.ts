import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { CryptoService } from './crypto.service';
import { Router } from '@angular/router';
import { StorageKeys } from '../Constants';

interface UserDetails {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  userName: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  // private apiUrl = 'https://chatapi-jm0g.onrender.com/';
  private apiUrl = 'https://localhost:7247/'; ////LOCAL DEBUG
  isAuthenticated = signal(this.hasToken());
  private cryptoService = inject(CryptoService);
  public tokeExpired = signal<boolean>(false);
  public missingKeys = signal<boolean>(false);
  private router = inject(Router);

  constructor(private http: HttpClient) {}

  private hasToken(): boolean {
    return !!localStorage.getItem(StorageKeys.AUTHTOKEN);
  }

  async register(
    username: string,
    password: string,
    firstName: string,
    lastName: string,
    userName: string
  ) {
    try {
      const response: any = await firstValueFrom(
        await this.http.post(`${this.apiUrl}User/RegisterUser`, {
          email: username,
          password: password,
          firstName: firstName,
          lastName: lastName,
          userName: userName,
        })
      );
      localStorage.setItem(StorageKeys.AUTHTOKEN, response.authToken);
      localStorage.setItem(
        StorageKeys.USERDETAIL,
        JSON.stringify(response.userDetails)
      );
      this.isAuthenticated.set(true);
      await this.cryptoService.generateMasterKey();
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  async login(username: string, password: string) {
    try {
      const response: any = await firstValueFrom(
        await this.http.post(`${this.apiUrl}User/Login`, {
          email: username,
          password: password,
        })
      );
      localStorage.setItem(StorageKeys.AUTHTOKEN, response.authToken);
      localStorage.setItem(
        StorageKeys.USERDETAIL,
        JSON.stringify(response.userDetails)
      );
      this.isAuthenticated.set(true);
      await this.cryptoService.generateMasterKey();
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  logout() {
    localStorage.removeItem(StorageKeys.AUTHTOKEN);
    localStorage.removeItem(StorageKeys.USERDETAIL);
    localStorage.removeItem(StorageKeys.PUBLICKEY);
    localStorage.removeItem(StorageKeys.PRIVATEKEY);
    this.cryptoService.clearMasterKey();
    this.isAuthenticated.set(false);
  }

  async handleGitHubCallback(code: string) {
    const response: any = await firstValueFrom(
      await this.http.get(`${this.apiUrl}User/GithubCallback?code=${code}`)
    );
    localStorage.setItem(StorageKeys.AUTHTOKEN, response.authToken);
    localStorage.setItem(
      StorageKeys.USERDETAIL,
      JSON.stringify(response.userDetails)
    );
    this.isAuthenticated.set(true);
    await this.cryptoService.generateMasterKey();
  }

  handleUnAuthorizedSignalR() {
    this.logout();
    this.router.navigate(['/login']);
  }
}
