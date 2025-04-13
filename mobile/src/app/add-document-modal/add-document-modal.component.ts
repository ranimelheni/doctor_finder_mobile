import { Component, Input } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { DoctorService } from '../services/doctor.service';

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
  filteredDoctors: any[] = [];
  searchQuery: string = '';
  uploading: boolean = false;

  constructor(
    private modalController: ModalController,
    private doctorService: DoctorService
  ) {}

  searchDoctors(event: any) {
    const query = this.searchQuery.trim();
    if (query.length === 0) {
      this.filteredDoctors = [];
      return;
    }

    this.doctorService.getDoctors(1, 5, query).subscribe({
      next: (response) => {
        this.filteredDoctors = response.doctors || [];
      },
      error: (err) => {
        console.error('Error searching doctors:', err);
        this.filteredDoctors = [];
      }
    });
  }

  onFileSelected(event: any) {
    this.document.file = event.target.files[0];
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