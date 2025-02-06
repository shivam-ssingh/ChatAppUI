import { HttpClient } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private tokenKey = 'authToken';
  private apiUrl = 'https://localhost:7247/';
  isAuthenticated = signal(this.hasToken());

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
      localStorage.setItem(this.tokenKey, response.AuthToken);
      this.isAuthenticated.set(true);
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
      localStorage.setItem(this.tokenKey, response.AuthToken);
      this.isAuthenticated.set(true);
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  logout() {
    localStorage.removeItem(this.tokenKey);
    this.isAuthenticated.set(false);
  }
}
