import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { StorageKeys } from '../Constants';
import { CryptoService } from '../services/crypto.service';

export const keyGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const authService = inject(AuthService);
  const cryptoService = inject(CryptoService);

  if (
    localStorage.getItem(StorageKeys.AUTHTOKEN) &&
    localStorage.getItem(StorageKeys.PUBLICKEY) &&
    cryptoService.privateKey()
    // localStorage.getItem(StorageKeys.PRIVATEKEY)
  ) {
    return true;
  }
  authService.missingKeys.set(true);
  router.navigate(['./add-key'], { skipLocationChange: true });
  return false;
};
