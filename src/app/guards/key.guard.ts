import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const keyGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const authService = inject(AuthService);

  if (
    localStorage.getItem('authToken') &&
    localStorage.getItem('publicKey') &&
    localStorage.getItem('privateKey')
  ) {
    return true;
  }
  authService.missingKeys.set(true);
  router.navigate(['./add-key'], { skipLocationChange: true });
  return false;
};
