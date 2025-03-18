import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-handle-callback',
  standalone: true,
  imports: [],
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
    } catch (error) {
      console.log('Login Fail');
      this.message = 'Some Error Occured';
    }
  }
}
