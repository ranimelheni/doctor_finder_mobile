import { Component, OnDestroy } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { DoctorService } from '../services/doctor.service';
import { ActivatedRoute, Router } from '@angular/router';
import { RefresherCustomEvent, ModalController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { AddDocumentModalComponent } from '../add-document-modal/add-document-modal.component';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  standalone: false,
})
export class ProfilePage implements OnDestroy {
  user: any = {};
  doctorDetails: any = null;
  isDoctor: boolean = false;
  loading: boolean = true;
  viewedUserId: number | null = null;
  isOwnProfile: boolean = true;
  documents: any[] = [];
  displayedDocuments: any[] = [];
  showAll: boolean = false;
  private routeSubscription: Subscription;

  constructor(
    private authService: AuthService,
    private doctorService: DoctorService,
    private route: ActivatedRoute,
    private router: Router,
    private modalController: ModalController
  ) {
    this.routeSubscription = this.route.queryParamMap.subscribe(params => {
      this.viewedUserId = params.get('user_id') 
        ? parseInt(params.get('user_id')!, 10) 
        : null;
      this.loadProfile();
    });
  }

  ionViewWillEnter() {
    this.loadProfile();
  }

  ngOnDestroy() {
    if (this.routeSubscription) {
      this.routeSubscription.unsubscribe();
    }
  }

  async loadProfile() {
    this.loading = true;
    this.showAll = false; // Reset showAll on refresh
    this.isDoctor = this.authService.isDoctor();
    const currentUser = this.authService.getUser();
  
    if (this.viewedUserId && this.isDoctor) {
      this.isOwnProfile = false;
      this.doctorService.getUserProfile(this.viewedUserId).subscribe({
        next: (data) => {
          this.user = data;
          this.doctorDetails = null;
          if(this.viewedUserId)
          this.loadDocuments(this.viewedUserId);
        },
        error: (err) => {
          console.error('Error loading patient profile:', err);
          this.loading = false;
        }
      });
    } else if (this.isDoctor) {
      this.isOwnProfile = true;
      this.user = currentUser;
      this.doctorService.getDoctorById(this.user.doctor_id).subscribe({
        next: (data) => {
          this.doctorDetails = data;
          this.documents = [];
          this.displayedDocuments = [];
          this.loading = false;
        },
        error: (err) => {
          console.error('Error loading doctor details:', err);
          this.loading = false;
        }
      });
    } else {
      this.isOwnProfile = true;
      this.user = currentUser;
      this.doctorDetails = null;
      this.loadDocuments(this.user.id);
    }
  }

  loadDocuments(userId: number) {
    this.doctorService.getUserDocuments(userId).subscribe({
      next: (data) => {
        this.documents = data.documents || [];
        this.updateDisplayedDocuments();
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading documents:', err);
        this.documents = [];
        this.displayedDocuments = [];
        this.loading = false;
      }
    });
  }

  updateDisplayedDocuments() {
    this.displayedDocuments = this.showAll ? this.documents : this.documents.slice(0, 5);
  }

  async openAddDocumentModal() {
    const modal = await this.modalController.create({
      component: AddDocumentModalComponent,
      componentProps: { userId: this.user.id }
    });
    modal.onDidDismiss().then((result) => {
      if (result.data?.success) {
        this.loadDocuments(this.user.id);
      }
    });
    await modal.present();
  }

  viewDocument(documentId: number) {
    this.router.navigate(['/document-details', documentId]);
  }

  async doRefresh(event: RefresherCustomEvent) {
    this.viewedUserId = null;
    await this.loadProfile();
    event.target.complete();
  }
}