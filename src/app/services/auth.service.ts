import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { CryptoService } from './crypto.service';

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
  private tokenKey = 'authToken';
  private userDetailKey = 'userDetail';
  private apiUrl = 'https://chatapi-jm0g.onrender.com/';
  isAuthenticated = signal(this.hasToken());
  private cryptoService = inject(CryptoService);

  constructor(private http: HttpClient) {}

  private hasToken(): boolean {
    return !!localStorage.getItem(this.tokenKey);
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
      localStorage.setItem(this.tokenKey, response.authToken);
      localStorage.setItem(
        this.userDetailKey,
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
      localStorage.setItem(this.tokenKey, response.authToken);
      localStorage.setItem(
        this.userDetailKey,
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
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userDetailKey);
    localStorage.removeItem('publicKey');
    localStorage.removeItem('privateKey');
    this.cryptoService.clearMasterKey();
    this.isAuthenticated.set(false);
  }

  async handleGitHubCallback(code: string) {
    const response: any = await firstValueFrom(
      await this.http.get(`${this.apiUrl}User/GithubCallback?code=${code}`)
    );
    localStorage.setItem(this.tokenKey, response.authToken);
    localStorage.setItem(
      this.userDetailKey,
      JSON.stringify(response.userDetails)
    );
    this.isAuthenticated.set(true);
    await this.cryptoService.generateMasterKey();
  }
}
