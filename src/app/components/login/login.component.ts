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
}
