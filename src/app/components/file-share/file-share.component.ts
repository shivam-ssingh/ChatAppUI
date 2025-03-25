import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FileshareService } from '../../services/fileshare.service';
import { Clipboard, ClipboardModule } from '@angular/cdk/clipboard';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-file-share',
  standalone: true,
  imports: [CommonModule, FormsModule, ClipboardModule],
  templateUrl: './file-share.component.html',
  styleUrl: './file-share.component.css',
})
export class FileShareComponent {
  public fileShareService = inject(FileshareService);
  sessionId = signal<string>('');
  isCreatingSession = signal<boolean>(false);
  sessionInputValue = signal<string>('');
  isJoiningSession = signal<boolean>(false);
  selectedFile = signal<File | null>(null);
  receivedFiles = signal<{ name: string; url: string; size: string }[]>([]);
  private route = inject(ActivatedRoute);
  // connectedUsersComputed = computed(() =>
  //   this.fileShareService.connectedUsers()
  // );
  readonly sessionWatcher = this.route.queryParams
    .pipe(takeUntilDestroyed())
    .subscribe((params) => {
      if (params['session']) {
        this.sessionInputValue.set(params['session']);
        this.joinSession();
      }
    });
  constructor(private clipboard: Clipboard) {
    effect(
      () => {
        const fileData = this.fileShareService.receivedFile();
        if (fileData) {
          this.handleReceivedFile(fileData);
        }
      },
      { allowSignalWrites: true }
    );
  }

  async createNewSession(): Promise<void> {
    this.isCreatingSession.set(true);
    this.fileShareService.errorMessage.set('');

    try {
      const id = await this.fileShareService.createSession();
      this.sessionId.set(id);
    } catch (error) {
      console.error('Failed to create session:', error);
    } finally {
      this.isCreatingSession.set(false);
    }
  }

  shareableLink = computed(() => {
    if (!this.sessionId()) return '';
    return `${window.location.origin}${
      window.location.pathname
    }?session=${this.sessionId()}`;
  });

  async joinSession(): Promise<void> {
    if (!this.sessionInputValue()) {
      this.fileShareService.errorMessage.set('Please enter a session ID');
      return;
    }

    this.isJoiningSession.set(true);
    this.fileShareService.errorMessage.set('');

    try {
      const success = await this.fileShareService.joinSession(
        this.sessionInputValue()
      );

      if (success) {
        this.sessionId.set(this.sessionInputValue());
      }
    } catch (error) {
      console.error('Failed to join session:', error);
    } finally {
      this.isJoiningSession.set(false);
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;

    if (input.files && input.files.length > 0) {
      this.selectedFile.set(input.files[0]);
    }
  }

  sendFile(): void {
    if (!this.selectedFile()) {
      this.fileShareService.errorMessage.set('Please select a file first');
      return;
    }

    const status = this.fileShareService.connectionStatus();
    if (status !== 'connected' && status !== 'data_channel_open') {
      this.fileShareService.errorMessage.set(
        'No connection available to send file'
      );
      return;
    }

    // this.fileShareService.sendFile(this.selectedFile()!);
    this.fileShareService.sendEncryptedFile(this.selectedFile()!);
  }

  private handleReceivedFile(file: { name: string; data: Blob }): void {
    // Create a URL for the blob
    const url = URL.createObjectURL(file.data);

    // Format the file size
    const size = this.formatFileSize(file.data.size);

    // Add to received files list
    this.receivedFiles.update((files) => [
      ...files,
      {
        name: file.name,
        url: url,
        size: size,
      },
    ]);
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  disconnect(): void {
    this.sessionId.set('');
    this.selectedFile.set(null);
    this.fileShareService.connectedUsers.set([]);
    this.fileShareService.connectedUserPublicKeys = [];
  }

  copySessionId() {
    this.clipboard.copy(this.sessionId());
  }

  copySessionLink() {
    this.clipboard.copy(this.shareableLink());
  }

  connectionStatusUIValue() {
    let uiValue = '';

    switch (this.fileShareService.connectionStatus()) {
      case 'peer_joined':
        uiValue = 'Peer Joined';
        break;
      case 'connecting':
        uiValue = 'Connecting';
        break;
      case 'waiting_for_peer':
        uiValue = 'Waiting for Peer';
        break;
      case 'signalr_connected':
        uiValue = 'SignalR Connected';
        break;
      case 'error':
        uiValue = 'Error';
        break;
      case 'joining_session':
        uiValue = 'Joining Session';
        break;
      case 'disconnected':
        uiValue = 'Disconnected';
        break;
      case 'connected':
        uiValue = 'Connected';
        break;
      case 'data_channel_open':
        uiValue = 'Data Channel Open';
        break;
      case 'closed':
        uiValue = 'Closed';
        break;
      case 'data_channel_closed':
        uiValue = 'Data Channel Closed';
        break;
      default:
        uiValue = this.fileShareService.connectionStatus();
        break;
    }
    return uiValue;
  }
}
