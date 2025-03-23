import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { ChatComponent } from './components/chat/chat.component';
import { AddKeyComponent } from './components/add-key/add-key.component';
import { HandleCallbackComponent } from './components/handle-callback/handle-callback.component';
import { FileShareComponent } from './components/file-share/file-share.component';

export const routes: Routes = [
  {
    path: 'login',
    component: LoginComponent,
  },
  {
    path: '',
    component: LoginComponent,
  },
  {
    path: 'chat',
    component: ChatComponent,
  },
  {
    path: 'add-key',
    component: AddKeyComponent,
  },
  {
    path: 'handle-callback',
    component: HandleCallbackComponent,
  },
  {
    path: 'file-share',
    component: FileShareComponent,
  },
];
