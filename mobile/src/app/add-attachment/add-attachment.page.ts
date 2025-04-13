import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DoctorService } from '../services/doctor.service';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-add-attachment',
  templateUrl: './add-attachment.page.html',
  styleUrls: ['./add-attachment.page.scss'],
  standalone:false
})
export class AddAttachmentPage implements OnInit {
  appointmentId: number|null=null;
  attachmentType: 'note' | 'file' = 'note'; // Default to 'note'
  attachmentName: string = '';
  attachmentDescription: string = '';
  attachmentContent: string = '';
  doctorId:number|null=null;

  constructor(
    private authService:AuthService,
    private route: ActivatedRoute,
    private router: Router,
    private doctorService: DoctorService
  ) {}

  ngOnInit() {
    this.resetForm();
    this.route.queryParams.subscribe(params => {
      this.appointmentId = +params['appointmentId'];
    });
  }

  ionViewWillEnter() {
    this.doctorId=this.authService.getDoctorId();
    if (!this.doctorId) {
      this.router.navigate(['/']);
      return;
    }
    this.resetForm(); // Reset fields when entering the page
  }

  onTypeChange() {
    this.attachmentContent = ''; // Reset content when type changes
  }

  onFileSelected(event: any) {
    const file: File = event.target.files[0];
    if (file) {
      this.attachmentName = file.name;
      const reader = new FileReader();
      reader.onload = () => {
        this.attachmentContent = (reader.result as string).split(',')[1];
      };
      reader.readAsDataURL(file);
    }
  }

  isFormValid(): boolean {
    if (!this.attachmentName || !this.attachmentType) return false;
    if (this.attachmentType === 'file' && !this.attachmentContent) return false;
    return true;
  }

  addAttachment() {
    const attachmentData = {
      name: this.attachmentName,
      type: this.attachmentType,
      description: this.attachmentDescription,
      content: this.attachmentType === 'note' ? 'note' : this.attachmentContent, // Set 'note' for notes
      appid: this.appointmentId
    };

    this.doctorService.addAttachment(attachmentData).subscribe({
      next: () => {
        this.router.navigate(['/appointment-details', this.appointmentId], { queryParams: { refresh: true } });
      },
      error: (err) => {
        console.error('Error adding attachment:', err);
      }
    });
  }

  private resetForm() {
    this.attachmentType = 'note';
    this.attachmentName = '';
    this.attachmentDescription = '';
    this.attachmentContent = '';
  }
}