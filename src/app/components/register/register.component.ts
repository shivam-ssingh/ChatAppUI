import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css',
})
export class RegisterComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  email = '';
  password = '';
  errorMessage = '';
  userName = '';
  firstName = '';
  lastName = '';

  async register() {
    try {
      await this.authService.register(
        this.email,
        this.password,
        this.firstName,
        this.lastName,
        this.userName
      );
      this.router.navigate(['/chat']);
    } catch (error: any) {
      this.errorMessage = error.error.Error || 'Registration failed';
    }
  }

  navigateToLogin() {
    this.router.navigate(['/login']);
  }
}
