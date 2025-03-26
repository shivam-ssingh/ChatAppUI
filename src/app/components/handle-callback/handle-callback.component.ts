import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-handle-callback',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './handle-callback.component.html',
  styleUrl: './handle-callback.component.css',
})
export class HandleCallbackComponent implements OnInit {
  constructor(
    private route: ActivatedRoute,
    private authService: AuthService,
    private router: Router
  ) {}

  message = 'Please wait...';
  isError = false;
  async ngOnInit() {
    try {
      {
        await this.authService.handleGitHubCallback(
          this.route.snapshot.queryParamMap.get('code') || ''
        );
      }
      this.router.navigate(['/add-key']);
    } catch (error: any) {
      console.log('Login Fail', error);
      this.message = 'Some Error Occured';
      if (error.error.error === 'GithubEmail') {
        this.message =
          'Your email address needs to be made visible on your GitHub profile.';
      }
      this.isError = true;
    }
  }
}
