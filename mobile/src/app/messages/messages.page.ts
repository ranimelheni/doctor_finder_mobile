import { Component, OnInit, ViewChild, OnDestroy } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { DoctorService } from '../services/doctor.service';
import { IonContent, ToastController, IonTextarea } from '@ionic/angular';
import { ActivatedRoute } from '@angular/router';
import { io, Socket } from 'socket.io-client';
import { Keyboard, KeyboardInfo } from '@capacitor/keyboard';

@Component({
  selector: 'app-messages',
  templateUrl: './messages.page.html',
  styleUrls: ['./messages.page.scss'],
  standalone: false,
})
export class MessagesPage implements OnInit, OnDestroy {
  @ViewChild(IonContent) content: IonContent | undefined;
  @ViewChild('messageInput') messageInput: IonTextarea | undefined;
  messages: any[] = [];
  newMessage: string = '';
  otherUserId: number | null = null;
  otherUserName: string = '';
  otherUserAvatar: string | null = null;
  currentUser: any;
  loading: boolean = false;
  private socket: Socket;
  private keyboardHeight: number = 0;

  constructor(
    private authService: AuthService,
    private doctorService: DoctorService,
    private toastController: ToastController,
    private route: ActivatedRoute
  ) {
    const token = this.authService.getToken();
    this.socket = io('https://doctor-finder-3lrk.onrender.com', {
      auth: { token: token }
    });

    this.socket.on('connect', () => {
      console.log('Connected to WebSocket');
      if (this.currentUser?.id) {
        this.socket.emit('join', this.currentUser.id, { token: token });
      }
    });

    this.socket.on('connect_error', (err) => {
      console.error('WebSocket connection error:', err);
    });

    this.socket.on('error', (data) => {
      console.error('WebSocket error:', data);
      this.presentToast(data.message, 'danger');
    });

    this.socket.on('new_message', (message) => {
      console.log('New message received:', message);
      if (
        (message.sender_id === this.otherUserId && message.receiver_id === this.currentUser?.id) ||
        (message.sender_id === this.currentUser?.id && message.receiver_id === this.otherUserId)
      ) {
        if (!this.messages.some(m => m.id === message.id)) {
          this.messages.push(message);
          this.messages = [...this.messages];
          this.scrollToBottom();
        }
      }
    });
  }

  async ngOnInit() {
    this.currentUser = this.authService.getUser();
    console.log('Current user:', this.currentUser);
    this.route.queryParams.subscribe(params => {
      this.otherUserId = params['user_id'] ? parseInt(params['user_id'], 10) : null;
      console.log('Other user ID:', this.otherUserId);
      if (this.otherUserId) {
        this.loadMessages();
        this.loadOtherUserName();
        if (this.socket.connected) {
          this.socket.emit('join', this.currentUser.id, { token: this.authService.getToken() });
        }
        this.joinChatRoom(); 
      }
    });

    if (Keyboard) {
      Keyboard.addListener('keyboardWillShow', (info: KeyboardInfo) => {
        console.log('Keyboard will show with height:', info.keyboardHeight);
        this.keyboardHeight = info.keyboardHeight;
        this.adjustForKeyboard();
      });

      Keyboard.addListener('keyboardWillHide', () => {
        console.log('Keyboard will hide');
        this.keyboardHeight = 0;
        this.adjustForKeyboard();
      });

      Keyboard.addListener('keyboardDidShow', (info: KeyboardInfo) => {
        console.log('Keyboard did show with height:', info.keyboardHeight);
        this.adjustForKeyboard();
      });

      Keyboard.addListener('keyboardDidHide', () => {
        console.log('Keyboard did hide');
        this.adjustForKeyboard();
      });
    }
  }

  ngOnDestroy() {
    this.leaveChatRoom(); 
    this.socket.disconnect();
    if (Keyboard) {
      Keyboard.removeAllListeners();
    }
  }

  loadMessages() {
    if (!this.otherUserId) return;
    this.loading = true;
    this.doctorService.getMessages(this.otherUserId).subscribe({
      next: (data) => {
        this.messages = data;
        this.loading = false;
        this.scrollToBottom();
        this.markAsRead();
      },
      error: (err) => {
        console.error('Error loading messages:', err);
        this.presentToast('Failed to load messages', 'danger');
        this.loading = false;
      }
    });
  }

  loadOtherUserName() {
    if (!this.otherUserId) return;
    console.log('Fetching name for user ID:', this.otherUserId);
    this.doctorService.getUserProfile(this.otherUserId).subscribe({
      next: (user) => {
        this.otherUserName = `${user.first_name} ${user.last_name}`;
        this.otherUserAvatar = user.avatar || null;
        console.log('Other user name:', this.otherUserName);
      },
      error: (err) => {
        console.error('Error fetching other user name:', err);
        this.otherUserName = 'Unknown User';
        this.presentToast('Failed to load user name', 'warning');
      }
    });
  }

  sendMessage() {
    if (!this.newMessage.trim()) {
      this.presentToast('Message cannot be empty', 'warning');
      return;
    }
    if (!this.otherUserId) {
      this.presentToast('No recipient selected', 'warning');
      return;
    }

    console.log('Sending message to:', this.otherUserId);
    this.doctorService.sendMessage(this.otherUserId, this.newMessage).subscribe({
      next: () => {
        this.newMessage = '';
        this.scrollToBottom();
        setTimeout(() => this.messageInput?.setFocus(), 100);
      },
      error: (err) => {
        console.error('Send message error:', err);
        this.presentToast('Failed to send message', 'danger');
      }
    });
  }

  markAsRead() {
    if (this.otherUserId) {
      this.doctorService.markMessagesRead(this.otherUserId).subscribe({
        error: (err) => console.error('Error marking messages as read:', err)
      });
    }
  }

  scrollToBottom() {
    setTimeout(() => {
      if (this.content) {
        this.content.scrollToBottom(300);
      }
    }, 100);
  }

  async presentToast(message: string, color: string) {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      color,
      position: 'bottom'
    });
    await toast.present();
  }

  adjustForKeyboard() {
    if (this.content && this.messageInput) {
      this.content.scrollToBottom(300);
    }
  }

  onInputFocus() {
    setTimeout(() => {
      this.adjustForKeyboard();
    }, 300);
  }

  onInputBlur() {
    setTimeout(() => {
      this.adjustForKeyboard();
    }, 300);
  }

  joinChatRoom() {
    if (!this.otherUserId || !this.currentUser?.id) return;
    const chatRoom = this.getChatRoomName(this.currentUser.id, this.otherUserId);
    this.socket.emit('join_chat', { room: chatRoom });
    console.log(`Joined chat room: ${chatRoom}`);
  }

  leaveChatRoom() {
    if (!this.otherUserId || !this.currentUser?.id) return;
    const chatRoom = this.getChatRoomName(this.currentUser.id, this.otherUserId);
    this.socket.emit('leave_chat', { room: chatRoom });
    console.log(`Left chat room: ${chatRoom}`);
  }

  getChatRoomName(userId: number, otherUserId: number): string {
    const ids = [userId, otherUserId].sort((a, b) => a - b); 
    return `chat_${ids[0]}_${ids[1]}`;
  }
}