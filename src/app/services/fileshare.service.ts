import { Injectable, NgZone, signal } from '@angular/core';
import { HubConnection, HubConnectionBuilder } from '@microsoft/signalr';

interface UserDetails {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  userName: string;
}

@Injectable({
  providedIn: 'root',
})
export class FileshareService {
  private hubConnection: HubConnection;
  private sessionId: string = '';
  private isInitiator: boolean = false;
  public connectionStatus = signal<string>('disconnected');
  public transferProgress = signal<number>(0);
  public receivedFile = signal<{ name: string; data: Blob } | null>(null);
  public errorMessage = signal<string>('');
  private peerConnection: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private receiveBuffer: Blob[] = [];
  private receivedSize: number = 0;
  private fileSize: number = 0;
  private currentFile: File | null = null;
  connectedUsers = signal<string[]>([]);

  userDetails = {} as UserDetails;
  private userDetailKey = 'userDetail';

  constructor(private zone: NgZone) {
    this.userDetails = JSON.parse(
      localStorage.getItem(this.userDetailKey) || '{}'
    );
    console.log(this.userDetails);

    this.hubConnection = new HubConnectionBuilder()
      .withUrl(`https://localhost:7247/fileHub`)
      .withAutomaticReconnect()
      .build();

    this.setupSignalRHandlers();
  }

  private setupSignalRHandlers() {
    this.hubConnection.on('PeerJoined', (peerId, userIdentifier: string) => {
      console.log('Peer joined session:', peerId, userIdentifier);
      this.connectionStatus.set('peer_joined');

      this.zone.run(() => {
        this.connectedUsers.update((users) => [...users, userIdentifier]);
        console.log('Connected users..........', this.connectedUsers());
      });

      if (this.isInitiator) {
        this.createOffer();
      }
    });

    this.hubConnection.on('ReceiveOffer', async (offer, peerId) => {
      console.log('Received WebRTC offer:', offer);

      //do we need this?
      if (!this.peerConnection) {
        this.createPeerConnection();
      }

      // Set the remote description from the offer
      await this.peerConnection!.setRemoteDescription(
        new RTCSessionDescription(offer)
      );

      // Create an answer
      const answer = await this.peerConnection!.createAnswer();
      await this.peerConnection!.setLocalDescription(answer);

      // Send the answer back through SignalR
      await this.hubConnection.invoke('SendAnswer', this.sessionId, answer);

      this.connectionStatus.set('connecting');
    });

    this.hubConnection.on('ReceiveAnswer', async (answer, peerId) => {
      console.log('Received WebRTC answer:', answer);

      if (this.peerConnection) {
        await this.peerConnection.setRemoteDescription(
          new RTCSessionDescription(answer)
        );
      }
    });

    this.hubConnection.on('ReceiveIceCandidate', async (candidate, peerId) => {
      console.log('Received ICE candidate:', candidate);

      if (this.peerConnection) {
        await this.peerConnection.addIceCandidate(
          new RTCIceCandidate(candidate)
        );
      }
    });
  }

  private async createOffer(): Promise<void> {
    if (!this.peerConnection) {
      this.createPeerConnection();
    }

    try {
      const offer = await this.peerConnection!.createOffer();
      await this.peerConnection!.setLocalDescription(offer);

      // Send the offer to the other peer via SignalR
      await this.hubConnection.invoke('SendOffer', this.sessionId, offer);
    } catch (err) {
      console.error('Error creating offer:', err);
      this.errorMessage.set('Failed to create connection offer');
    }
  }

  public async createSession() {
    try {
      if (this.hubConnection.state !== 'Connected') {
        await this.connect();
      }

      this.sessionId = await this.hubConnection.invoke('CreateSession');
      console.log('Created new session with ID:', this.sessionId);

      this.isInitiator = true;
      this.connectionStatus.set('waiting_for_peer');

      return this.sessionId;
    } catch (err) {
      console.error('Error creating session:', err);
      this.errorMessage.set('Failed to create sharing session');
      throw err;
    }
  }

  public async connect(): Promise<void> {
    try {
      await this.hubConnection.start();
      console.log('SignalR connection established');
      this.connectionStatus.set('signalr_connected');
    } catch (err) {
      console.error('Error starting SignalR connection:', err);
      this.errorMessage.set('Failed to connect to signaling server');
      this.connectionStatus.set('error');
    }
  }

  public async joinSession(sessionId: string): Promise<boolean> {
    try {
      if (this.hubConnection.state !== 'Connected') {
        await this.connect();
      }

      const result = await this.hubConnection.invoke(
        'JoinSpecificSession',
        sessionId,
        this.userDetails.userName
      );

      if (result.success) {
        this.sessionId = sessionId;
        this.isInitiator = false;
        this.connectionStatus.set('joining_session');

        this.createPeerConnection();

        return true;
      } else {
        this.errorMessage.set(result.message || 'Session not found');
        return false;
      }
    } catch (err) {
      console.error('Error joining session:', err);
      this.errorMessage.set('Failed to join session');
      return false;
    }
  }

  private createPeerConnection(): void {
    // ICE servers configuration (STUN/TURN)
    const configuration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        // Add TURN servers here for production use
      ],
    };

    // Create the peer connection
    this.peerConnection = new RTCPeerConnection(configuration);

    // Handle ICE candidate generation
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        // Send the ICE candidate to the other peer via SignalR
        this.hubConnection.invoke(
          'SendIceCandidate',
          this.sessionId,
          event.candidate
        );
      }
    };

    // Handle connection state changes
    this.peerConnection.onconnectionstatechange = () => {
      console.log(
        'RTC Connection state:',
        this.peerConnection?.connectionState
      );

      switch (this.peerConnection?.connectionState) {
        case 'connected':
          this.connectionStatus.set('connected');
          break;
        case 'disconnected':
        case 'failed':
          this.connectionStatus.set('disconnected');
          break;
        case 'closed':
          this.connectionStatus.set('closed');
          break;
      }
    };

    // If we're the initiator, create the data channel
    if (this.isInitiator) {
      this.createDataChannel();
    } else {
      // Otherwise, wait for the data channel from the other peer
      this.peerConnection.ondatachannel = (event) => {
        this.dataChannel = event.channel;
        this.setupDataChannelHandlers();
      };
    }
  }

  private createDataChannel(): void {
    if (!this.peerConnection) return;

    // Create with optimized settings for file transfer
    this.dataChannel = this.peerConnection.createDataChannel('fileTransfer', {
      ordered: true,
      // Adjust these based on your needs:
      maxRetransmits: 30,
    });

    this.setupDataChannelHandlers();
  }

  private setupDataChannelHandlers(): void {
    if (!this.dataChannel) return;

    this.dataChannel.onopen = () => {
      console.log('Data channel opened');
      this.connectionStatus.set('data_channel_open');
    };

    this.dataChannel.onclose = () => {
      console.log('Data channel closed');
      this.connectionStatus.set('data_channel_closed');
    };

    this.dataChannel.onerror = (error) => {
      console.error('Data channel error:', error);
      this.errorMessage.set('Data channel error');
    };

    // Handle incoming file data
    this.dataChannel.onmessage = (event) => {
      // Check if it's a control message (JSON) or file data (ArrayBuffer)
      if (typeof event.data === 'string') {
        const message = JSON.parse(event.data);

        if (message.type === 'file-info') {
          // New file transfer is starting
          this.resetFileReceive();
          this.fileSize = message.size;
          console.log(
            `Receiving file: ${message.name}, size: ${message.size} bytes`
          );
        } else if (message.type === 'file-complete') {
          // File transfer is complete, assemble the chunks
          const receivedBlob = new Blob(this.receiveBuffer);
          this.receiveBuffer = [];
          // Notify the UI that a file has been received
          this.receivedFile.set({
            name: message.name,
            data: receivedBlob,
          });

          this.transferProgress.set(0);
        }
      } else {
        // Handle binary chunk data
        this.receiveBuffer.push(event.data);
        this.receivedSize += event.data.byteLength;

        // Update progress
        const progress = Math.min(
          100,
          Math.floor((this.receivedSize / this.fileSize) * 100)
        );
        this.transferProgress.set(progress);
        console.log(
          `Received ${this.receivedSize} / ${this.fileSize} bytes (${progress}%)`
        );
      }
    };
  }

  private resetFileReceive(): void {
    this.receiveBuffer = [];
    this.receivedSize = 0;
  }

  public async sendFile(file: File): Promise<void> {
    if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
      this.errorMessage.set('No connection available to send file');
      return;
    }

    this.currentFile = file;

    // Send file metadata first
    const fileInfo = {
      type: 'file-info',
      name: file.name,
      size: file.size,
      contentType: file.type,
    };

    this.dataChannel.send(JSON.stringify(fileInfo));

    // Read and chunk the file
    const chunkSize = 16384; // 16 KB chunks
    const fileReader = new FileReader();
    let offset = 0;

    fileReader.onload = async (event) => {
      if (event.target?.result && this.dataChannel?.readyState === 'open') {
        const dataChunk = event.target.result as ArrayBuffer;
        while (this.dataChannel.bufferedAmount > 65535) {
          await new Promise((resolve) => setTimeout(resolve, 100)); // Small delay
        }
        this.dataChannel.send(dataChunk);
        offset += dataChunk.byteLength;
        const progress = Math.floor((offset / file.size) * 100);
        this.transferProgress.set(progress);
        console.log(`Sent ${offset} / ${file.size} bytes (${progress}%)`);

        // Check if we've sent the entire file
        if (offset < file.size) {
          readSlice(offset);
        } else {
          // Signal that the file is complete
          this.dataChannel.send(
            JSON.stringify({
              type: 'file-complete',
              name: file.name,
            })
          );
          console.log(`File "${file.name}" sent successfully`);
          this.currentFile = null;
        }
      }
    };

    fileReader.onerror = (error) => {
      console.error('Error reading file:', error);
      this.errorMessage.set('Error reading file');
    };

    const readSlice = (offset: number) => {
      const slice = file.slice(offset, offset + chunkSize);
      fileReader.readAsArrayBuffer(slice);
    };

    // Start reading the first chunk
    readSlice(0);
  }
}
