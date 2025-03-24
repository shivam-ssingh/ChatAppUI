import { Component, inject, OnInit } from '@angular/core';
import {
  ReactiveFormsModule,
  FormControl,
  FormGroup,
  Validators,
  FormsModule,
} from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent implements OnInit {
  ngOnInit() {
    this.authService.tokeExpired.set(false);
  }
  private authService = inject(AuthService);
  private router = inject(Router);

  email = '';
  password = '';
  errorMessage = '';

  async login() {
    try {
      await this.authService.login(this.email, this.password);
      this.router.navigate(['/add-key']);
    } catch (error: any) {
      this.errorMessage = error.error.error || 'Login failed';
    }
  }

  navigateToRegister() {
    this.router.navigate(['/register']);
  }

  loginWithGitHub() {
    let scope = 'read:user user:email';
    let clientId = 'Ov23liPxyE4aelFp6X3Y';
    let redirectUri = 'https://chatappui-gs4s.onrender.com/handle-callback';
    // let clientId = 'Ov23lizfoPxXQVBxrBVY'; ////LOCAL DEBUG
    // let redirectUri = 'http://localhost:4200/handle-callback'; ////LOCAL DEBUG
    window.location.href = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}`;
  }
}
