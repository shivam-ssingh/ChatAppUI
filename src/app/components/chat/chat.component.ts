import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HubConnection, HubConnectionBuilder } from '@microsoft/signalr';

interface ChatMessage {
  user: string;
  message: string;
  timestamp: Date;
  isSystemMessage?: boolean;
}

interface UserDetails {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  userName: string;
}

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.css',
})
export class ChatComponent implements OnInit, OnDestroy {
  // username = '';
  chatRoom = '';
  hasJoined = false;

  private hubConnection!: HubConnection;
  messages: ChatMessage[] = [];
  newMessage = '';
  isConnected = false;
  userDetails = {} as UserDetails;
  private userDetailKey = 'userDetail';

  ngOnInit(): void {
    this.userDetails = JSON.parse(
      localStorage.getItem(this.userDetailKey) || '{}'
    ); //https://stackoverflow.com/questions/46915002/argument-of-type-string-null-is-not-assignable-to-parameter-of-type-string
  }

  async joinChat() {
    if (this.chatRoom.trim()) {
      this.hasJoined = true;
      await this.setupSignalRConnection();
    }
  }

  onLeaveChat() {
    this.hasJoined = false;
    // this.username = '';
    this.chatRoom = '';
  }

  private async setupSignalRConnection() {
    this.hubConnection = new HubConnectionBuilder()
      .withUrl('https://localhost:7247/chat')
      .withAutomaticReconnect()
      .build();

    this.hubConnection.on('ReceiveMessage', (user: string, message: string) => {
      this.messages.push({
        user,
        message,
        timestamp: new Date(),
        isSystemMessage: user.toLowerCase() === 'admin',
      });
      this.scrollToBottom();
    });

    try {
      await this.hubConnection.start();
      this.isConnected = true;

      await this.hubConnection.invoke('JoinSpecificChatRoom', {
        userName: this.userDetails.userName,
        chatRoom: this.chatRoom,
      });
    } catch (err) {
      console.error('Error while connecting to chat: ', err);
      this.isConnected = false;
    }
  }

  async sendMessage() {
    if (this.newMessage.trim() && this.isConnected) {
      try {
        await this.hubConnection.invoke(
          'SendMessage',
          {
            userName: this.userDetails.userName,
            chatRoom: this.chatRoom,
          },
          this.newMessage.trim()
        );
        this.newMessage = '';
      } catch (err) {
        console.error('Error while sending message: ', err);
      }
    }
  }

  leave() {
    if (this.hubConnection) {
      this.hubConnection.stop();
    }
    // this.leaveChat.emit();
  }

  private scrollToBottom() {
    setTimeout(() => {
      const container = document.querySelector('.messages-container');
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    });
  }

  ngOnDestroy() {
    if (this.hubConnection) {
      this.hubConnection.stop();
    }
  }
}
