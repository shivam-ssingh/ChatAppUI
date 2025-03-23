import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { StorageKeys } from '../Constants';

export const authGuard: CanActivateFn = (route, state) => {
  const token = localStorage.getItem(StorageKeys.AUTHTOKEN);
  const router = inject(Router);
  // console.log(token);
  if (token) {
    return true;
  }

  //https://medium.com/front-end-tricks/guards-execution-order-in-angular-e35a76e0192d
  // we don't want the second guard to execute(checking of keys) if user is not logged in, returning urltree means execution stops, tip1 above
  const urlTree: UrlTree = router.parseUrl('/login');
  return urlTree;
};
