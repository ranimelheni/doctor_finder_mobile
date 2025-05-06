import { Component, OnInit, OnDestroy } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { io, Socket } from 'socket.io-client';
import { NavController } from '@ionic/angular';
import { Router } from '@angular/router';

@Component({
  selector: 'app-notifications',
  templateUrl: './notifications.page.html',
  styleUrls: ['./notifications.page.scss'],
  standalone: false,
})
export class NotificationsPage implements OnInit, OnDestroy {
  notifications: any[] = [];
  unreadCount: number = 0;
  expandedNotifications: Set<number> = new Set();
  private socket: Socket;
  

  constructor(
    private authService: AuthService,
    private navCtrl: NavController,
    private router: Router
  ) {
    this.socket = io('https://doctor-finder-3lrk.onrender.com', { autoConnect: false });
  }

  ngOnInit() {
    this.loadNotifications();
    this.setupSocket();
  }

  ngOnDestroy() {
    this.socket.disconnect();
  }

  loadNotifications() {
    if (!this.authService.isLoggedIn()) {
      this.notifications = [];
      this.unreadCount = 0;
      return;
    }

    this.authService.getNotifications().subscribe({
      next: (data) => {
        this.notifications = data.sort((a: { created_at: string | number | Date; }, b: { created_at: string | number | Date; }) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        this.updateUnreadCount();
      },
      error: (err) => {
        console.error('Error loading notifications:', err);
      },
    });
  }

  setupSocket() {
    if (!this.authService.isLoggedIn()) return;
    const token = this.authService.getToken();
    const userId = this.authService.getUser().id;

    this.socket.auth = { token };
    this.socket.connect();

    this.socket.on('connect', () => {
      console.log('Connected to SocketIO');
      this.socket.emit('join', userId, { token });
    });

    this.socket.on('connect_error', (err) => {
      console.error('SocketIO connection error:', err);
    });

    this.socket.on('new_notification', (notification) => {
      console.log('New notification received:', notification);
      if (!this.notifications.some(n => n.id === notification.id)) {
        this.notifications.unshift(notification);
        this.updateUnreadCount();
      }
    });
  }

  markAsRead(notificationId: number) {
    this.authService.markNotificationAsRead(notificationId).subscribe({
      next: () => {
        const notification = this.notifications.find(n => n.id === notificationId);
        if (notification) {
          notification.is_read = true;
          this.updateUnreadCount();
        }
      },
      error: (err) => {
        console.error('Error marking as read:', err);
      },
    });
  }

  updateUnreadCount() {
    this.unreadCount = this.notifications.filter(n => !n.is_read).length;
    this.authService.loadUnreadCount();
  }

  doRefresh(event: any) {
    this.loadNotifications();
    setTimeout(() => {
      event.target.complete();
    }, 1000);
  }

  handleNotificationClick(notification: any) {
    this.markAsRead(notification.id);
    const isDoctor = this.authService.isDoctor();

    if (notification.sender_id) {
      if (isDoctor && (notification.notification_type === 'appointment_booked' || notification.notification_type === 'appointment_canceled')) {
        // Doctor clicking appointment notification -> go to user profile
        this.router.navigate(['/profile'], {
          queryParams: { user_id: notification.sender_id }
        });
      } else if (notification.notification_type === 'message') {
        // Message notification -> go to messages
        this.router.navigate(['/messages'], {
          queryParams: { user_id: notification.sender_id }
        });
      }
    }
  }

  toggleFullMessage(notificationId: number, event: Event) {
    event.stopPropagation();
    if (this.expandedNotifications.has(notificationId)) {
      this.expandedNotifications.delete(notificationId);
    } else {
      this.expandedNotifications.add(notificationId);
    }
  }

  isExpanded(notificationId: number): boolean {
    return this.expandedNotifications.has(notificationId);
  }
}