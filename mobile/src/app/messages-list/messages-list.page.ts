import { Component, OnInit } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { DoctorService } from '../services/doctor.service';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';

@Component({
  selector: 'app-messages-list',
  templateUrl: './messages-list.page.html',
  styleUrls: ['./messages-list.page.scss'],
  standalone: false,
})
export class MessagesListPage implements OnInit {
  conversations: any[] = [];
  loading: boolean = false;
  currentUser: any;

  constructor(
    private authService: AuthService,
    private doctorService: DoctorService,
    private router: Router,
    private toastController: ToastController
  ) {}

  ngOnInit() {
    this.currentUser = this.authService.getUser();
    this.loadConversations();
  }

  ionViewWillEnter() {
    this.loadConversations();
  }

  loadConversations() {
    this.loading = true;
    this.doctorService.getConversations().subscribe({
      next: (data) => {
        this.conversations = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading conversations:', err);
        this.presentToast('Failed to load conversations', 'danger');
        this.loading = false;
      }
    });
  }

  openConversation(userId: number) {
    this.router.navigate(['/messages'], { queryParams: { user_id: userId } });
  }

  doRefresh(event: any) {
    this.loadConversations();
    setTimeout(() => {
      event.target.complete();
    }, 1000); 
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
}