import { Component, inject } from '@angular/core';
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
export class LoginComponent {
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
    let redirectUri = 'https://chatapi-jm0g.onrender.com/handle-callback';
    window.location.href = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}`;
  }
}
