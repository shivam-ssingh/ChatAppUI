import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { RegisterComponent } from './components/register/register.component';
import { ChatComponent } from './components/chat/chat.component';
import { AddKeyComponent } from './components/add-key/add-key.component';

export const routes: Routes = [
  {
    path: 'login',
    component: LoginComponent,
  },
  {
    path: 'register',
    component: RegisterComponent,
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
];
