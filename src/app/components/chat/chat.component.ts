import { CommonModule } from '@angular/common';
import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HubConnection, HubConnectionBuilder } from '@microsoft/signalr';
import { CryptoService } from '../../services/crypto.service';

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

interface UserInRoom {
  userName: string;
  publicKey: string;
}

interface NewJoinee {
  [userName: string]: string;
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
  private usersInRoom: UserInRoom[] = [];
  private newJoinee: NewJoinee = {} as NewJoinee;
  private cryptoService = inject(CryptoService);

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

  private async setupSignalRConnection() {
    this.hubConnection = new HubConnectionBuilder()
      .withUrl('https://chatapi-jm0g.onrender.com/chat', {
        accessTokenFactory: () => localStorage.getItem('authToken') || '',
      })
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

    //store each new users in room with their public key
    this.hubConnection.on('NewJoinee', (publicKeyDetail: NewJoinee) => {
      this.newJoinee = publicKeyDetail;
      // publicKeyDetail.forEach((userDetail) => {
      //   let userInRoom: UserInRoom = {
      //     userName: Object.keys(userDetail)[0],
      //     publicKey: Object.values(userDetail)[0],
      //   };
      //   debugger;
      //   this.usersInRoom.push(userInRoom);
      // });
      // console.log('hello');
      // console.log(this.usersInRoom);
    });

    this.hubConnection.on(
      'ReceiveEncryptedMessage',
      async (user: string, message: string) => {
        try {
          //load public key
          const privateKeyDecrypted =
            await this.cryptoService.decryptPrivateKey(
              localStorage.getItem('privateKey') || ''
            );
          const privateKeyLoaded = await this.cryptoService.importPrivateKey(
            privateKeyDecrypted
          );
          const decryptedMessage = await this.cryptoService.decryptMessage(
            privateKeyLoaded,
            message
          );
          this.messages.push({
            user,
            message: `encrypted message recived -> ${message}`,
            timestamp: new Date(),
            isSystemMessage: user.toLowerCase() === 'admin',
          });
          this.messages.push({
            user,
            message: decryptedMessage,
            timestamp: new Date(),
            isSystemMessage: user.toLowerCase() === 'admin',
          });
          this.scrollToBottom();
        } catch (error) {
          console.log(error);
        }
      }
    );

    try {
      await this.hubConnection.start();
      this.isConnected = true;

      await this.hubConnection.invoke('JoinSpecificChatRoom', {
        userName: this.userDetails.userName,
        chatRoom: this.chatRoom,
        publicKey: localStorage.getItem('publicKey'),
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

  async sendMessageToRoom() {
    // for (const key in this.newJoinee) {
    //   let userInRoom: UserInRoom = {
    //     userName: key,
    //     publicKey: this.newJoinee[key] || '',
    //   };
    //   this.usersInRoom.push(userInRoom);
    // }
    for (const key in this.newJoinee) {
      const encryptedMessage = await this.encryptMessage(
        this.newJoinee[key],
        this.newMessage.trim()
      );
      await this.hubConnection.invoke(
        'SendMessageToSpecificUser',
        {
          userName: this.userDetails.userName,
          chatRoom: this.chatRoom,
        },
        encryptedMessage,
        key
      );
    }
    this.messages.push({
      user: this.userDetails.userName,
      message: this.newMessage.trim(),
      timestamp: new Date(),
      isSystemMessage: this.userDetails.userName.toLowerCase() === 'admin',
    });
    this.newMessage = '';
    // this.usersInRoom.forEach(async (userDet) => {
    //   const encryptedMessage = await this.encryptMessage(
    //     userDet.publicKey,
    //     this.newMessage.trim()
    //   );
    //   await this.hubConnection.invoke(
    //     'SendMessageToSpecificUser',
    //     {
    //       userName: this.userDetails.userName,
    //       chatRoom: this.chatRoom,
    //     },
    //     encryptedMessage,
    //     userDet.userName
    //   );
    //   const addMessage = this.newMessage;
    //   const user = this.userDetails.userName;
    //   this.messages.push({
    //     user,
    //     message: addMessage,
    //     timestamp: new Date(),
    //     isSystemMessage: user.toLowerCase() === 'admin',
    //   });
    //   this.newMessage = '';
    // });
  }
  async encryptMessage(publicKey: string, message: string) {
    const importedPublickey = await this.cryptoService.importPublicKey(
      publicKey
    );
    const encryptedMessage = await this.cryptoService.encryptMessage(
      importedPublickey,
      message
    );
    return encryptedMessage;
  }

  leave() {
    if (this.hubConnection) {
      this.hubConnection.stop();
      this.isConnected = false;
      this.hasJoined = false;
    }
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
