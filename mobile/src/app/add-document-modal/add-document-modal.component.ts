import { Component, Input } from '@angular/core';
import { ModalController, Platform, ToastController } from '@ionic/angular';
import { DoctorService } from '../services/doctor.service';
import { Camera, CameraResultType, CameraSource, Photo } from '@capacitor/camera';

@Component({
  selector: 'app-add-document-modal',
  templateUrl: './add-document-modal.component.html',
  styleUrls: ['./add-document-modal.component.scss'],
  standalone: false,
})
export class AddDocumentModalComponent {
  @Input() userId!: number;
  document = {
    name: '',
    description: '',
    doctor_id: null as number | null,
    file: null as File | null
  };
  recentDoctors: any[] = [];
  uploading: boolean = false;
  fileSource: string = '';
  isNativePlatform: boolean = false;

  constructor(
    private modalController: ModalController,
    private doctorService: DoctorService,
    private platform: Platform,
    private toastController: ToastController
  ) {
    this.isNativePlatform = this.platform.is('cordova') || this.platform.is('capacitor');
    console.log('Platform details:', {
      isNative: this.isNativePlatform,
      isDesktop: this.platform.is('desktop'),
      isMobileWeb: this.platform.is('mobileweb'),
      platforms: this.platform.platforms()
    });

    this.fetchRecentDoctors();
  }

  fetchRecentDoctors() {
    this.doctorService.getRecentDoctors().subscribe({
      next: (response) => {
        this.recentDoctors = response.doctors || [];
        if (this.recentDoctors.length === 0) {
          this.presentToast('No recent consultations found. Please consult a doctor first.', 'warning');
        }
      },
      error: (err) => {
        console.error('Error fetching recent doctors:', err);
        this.recentDoctors = [];
        this.presentToast('Failed to load recent doctors. Please try again.', 'danger');
      }
    });
  }

  onFileSelected(event: any) {
    this.document.file = event.target.files[0];
    this.fileSource = 'file';
  }

  async takePhoto() {
    console.log('takePhoto() called'); 
    if (!this.isNativePlatform) {
      await this.presentToast('Camera access is only available on mobile devices.', 'warning');
      return;
    }

    try {
      const permission = await Camera.requestPermissions({ permissions: ['camera'] });
      console.log('Camera permission status:', permission);
      if (permission.camera !== 'granted') {
        await this.presentToast('Camera access is required to take a photo. Please enable it in your device settings.', 'danger');
        return;
      }

      let image: Photo;
      try {
        image = await Camera.getPhoto({
          quality: 90,
          allowEditing: false,
          resultType: CameraResultType.Uri,
          source: CameraSource.Camera,
          promptLabelHeader: 'Take a Photo',
          promptLabelPhoto: '',
          promptLabelPicture: 'Take Photo'
        });
      } catch (cameraError: unknown) {
        console.warn('Direct camera access failed, falling back to prompt:', cameraError);
        image = await Camera.getPhoto({
          quality: 90,
          allowEditing: false,
          resultType: CameraResultType.Uri,
          source: CameraSource.Prompt,
          promptLabelHeader: 'Select Photo Source',
          promptLabelPhoto: 'Choose from Gallery',
          promptLabelPicture: 'Take Photo'
        });
      }

      const response = await fetch(image.webPath!);
      const blob = await response.blob();
      const fileName = `photo-${Date.now()}.jpg`;
      this.document.file = new File([blob], fileName, { type: 'image/jpeg' });
      this.fileSource = 'camera';
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error taking photo:', error);
      await this.presentToast(
        `Failed to access the camera: ${errorMessage}. Please ensure camera access is enabled.`,
        'danger'
      );
    }
  }

  async presentToast(message: string, color: string) {
    const toast = await this.toastController.create({
      message: message,
      duration: 3000,
      position: 'top',
      color: color,
      buttons: [
        {
          text: 'Dismiss',
          role: 'cancel'
        }
      ]
    });
    await toast.present();
  }

  uploadDocument() {
    if (!this.document.name || !this.document.doctor_id || !this.document.file) {
      return;
    }

    this.uploading = true;
    const formData = new FormData();
    formData.append('name', this.document.name);
    formData.append('description', this.document.description || '');
    formData.append('doctor_id', this.document.doctor_id.toString());
    formData.append('file', this.document.file);
    formData.append('user_id', this.userId.toString());

    this.doctorService.uploadDocument(formData).subscribe({
      next: (response) => {
        this.uploading = false;
        this.dismiss(true);
      },
      error: (err) => {
        console.error('Error uploading document:', err);
        this.uploading = false;
      }
    });
  }

  dismiss(success: boolean = false) {
    this.modalController.dismiss({ success });
  }
}