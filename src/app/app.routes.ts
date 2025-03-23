import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { ChatComponent } from './components/chat/chat.component';
import { AddKeyComponent } from './components/add-key/add-key.component';
import { HandleCallbackComponent } from './components/handle-callback/handle-callback.component';
import { FileShareComponent } from './components/file-share/file-share.component';
import { HeroComponent } from './components/hero/hero.component';
import { authGuard } from './guards/auth.guard';
import { keyGuard } from './guards/key.guard';

export const routes: Routes = [
  {
    path: 'login',
    component: LoginComponent,
  },
  {
    path: '',
    component: HeroComponent,
  },
  {
    path: 'chat',
    component: ChatComponent,
    canActivate: [authGuard, keyGuard],
  },
  {
    path: 'add-key',
    component: AddKeyComponent,
    canActivate: [authGuard],
  },
  {
    path: 'handle-callback',
    component: HandleCallbackComponent,
  },
  {
    path: 'file-share',
    component: FileShareComponent,
    canActivate: [authGuard, keyGuard],
  },
];
