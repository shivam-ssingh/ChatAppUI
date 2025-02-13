import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

interface UserDetails {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  userName: string;
}

@Component({
  selector: 'app-add-key',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './add-key.component.html',
  styleUrl: './add-key.component.css',
})
export class AddKeyComponent implements OnInit {
  userDetails = {} as UserDetails;
  privateKey = '';
  githubUserName = '';
  private userDetailKey = 'userDetail';
  private router = inject(Router);

  ngOnInit(): void {
    this.userDetails = JSON.parse(
      localStorage.getItem(this.userDetailKey) || '{}'
    ); //https://stackoverflow.com/questions/46915002/argument-of-type-string-null-is-not-assignable-to-parameter-of-type-string
  }

  addKey() {
    this.router.navigate(['/chat']);
  }

  handleFileUpload(event: Event) {
    const fileInput = event.target as HTMLInputElement;
    if (fileInput.files && fileInput.files.length > 0) {
      const file = fileInput.files[0];
      const reader = new FileReader();

      reader.onload = () => {
        this.privateKey = reader.result as string;
      };

      reader.readAsText(file);
    }
  }

  //save self private key. encrypted
  //save self public key. encrypted
}
