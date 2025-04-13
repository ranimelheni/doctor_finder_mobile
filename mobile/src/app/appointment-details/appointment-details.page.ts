import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DoctorService } from '../services/doctor.service';
import { AuthService } from '../services/auth.service';
import { forkJoin } from 'rxjs'; // For parallel API calls

@Component({
  selector: 'app-appointment-details',
  templateUrl: './appointment-details.page.html',
  styleUrls: ['./appointment-details.page.scss'],
  standalone: false
})
export class AppointmentDetailsPage implements OnInit {
  doctorId: number | null = null;
  appointment: any = null;
  attachments: any[] = [];
  appointmentId: number= +this.route.snapshot.paramMap.get('id')!;
  expandedAttachments: { [key: number]: boolean } = {};
  isLoading: boolean = true; // Loading state
  isLoggedIn: boolean=false;
  userName: any;
  isDoctor: any;

  constructor(
    private route: ActivatedRoute,
    private doctorService: DoctorService,
    private authService: AuthService,
    private router: Router
  ) {}
  checkLoginStatus() {
    this.isLoggedIn = this.authService.isLoggedIn();
    const user = this.authService.getUser();
    this.userName = user?.first_name || 'User';
    this.isDoctor = user?.is_doctor || false;
  }
  ngOnInit() {
    this.checkLoginStatus();

    this.appointmentId = +this.route.snapshot.paramMap.get('id')!;
    this.doctorId = this.authService.getDoctorId();
    if (this.isLoggedIn && this.isDoctor) {
      this.loadData();
    }
    else if(this.isLoggedIn && !this.isDoctor)
       {
        this.loadPatientAppointment();
       }
    else {
      this.router.navigate(['/']);
      this.isLoading = false;
      return;
      
    } 

    this.route.queryParams.subscribe(params => {
      if (params['refresh']) {
        this.isLoading = true;
        this.loadAttachments(this.appointmentId);
      }
    });
  }
  
  

  ionViewWillEnter() {
   
    this.checkLoginStatus();
    if (this.isLoggedIn && this.isDoctor) {
      this.loadData();
    }
    else if(this.isLoggedIn && !this.isDoctor)
       {
        this.loadPatientAppointment();
       }
    else {
      this.router.navigate(['/']);
      this.isLoading = false;
      return;
      
    } 
  }

  loadData() {
    this.isLoading = true;
    // Use forkJoin to wait for both API calls to complete
    forkJoin([
      this.doctorService.getDoctorAppointments(this.doctorId!, undefined, this.appointmentId),
      this.doctorService.getAttachments(this.appointmentId)
    ]).subscribe({
      next: ([appointmentData, attachmentsData]) => {
        this.appointment = appointmentData;
        this.attachments = attachmentsData.attachments || [];
        this.isLoading = false; // Hide spinner when both are loaded
      },
      error: (err) => {
        console.error('Error loading data:', err);
        this.isLoading = false; // Hide spinner even if there’s an error
      }
    });
  }

  loadAppointmentDetails(appointmentId: number) {
    if (this.doctorId) {
      return this.doctorService.getDoctorAppointments(this.doctorId, undefined, appointmentId);
    }
    return null;
  }

  loadAttachments(appointmentId: number) {
    this.isLoading = true;
    this.doctorService.getAttachments(appointmentId).subscribe({
      next: (data) => {
        this.attachments = data.attachments || [];
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading attachments:', err);
        this.isLoading = false;
      }
    });
  }

  downloadAttachment(attachment: any) {
    const link = document.createElement('a');
    link.href = `data:application/octet-stream;base64,${attachment.content}`;
    link.download = attachment.extension ? `${attachment.name}${attachment.extension}` : attachment.name;
    link.click();
  }

  toggleDescription(attachmentId: number) {
    this.expandedAttachments[attachmentId] = !this.expandedAttachments[attachmentId];
  }

  deleteAttachment(attachmentId: number) {
    if (confirm('Are you sure you want to delete this attachment?')) {
      this.doctorService.deleteAttachment(attachmentId).subscribe({
        next: () => {
          this.loadAttachments(this.appointmentId);
        },
        error: (err) => {
          console.error('Error deleting attachment:', err);
        }
      });
    }
  }

  navigateToAddAttachment() {
    this.router.navigate(['/add-attachment'], { queryParams: { appointmentId: this.appointmentId } });
  }

  needsSeeMore(description: string): boolean {
    return  description.length > 50;
  }
  loadPatientAppointment()
  {
    forkJoin([
      this.doctorService.getAppointments("Completed",this.appointmentId),
      this.doctorService.getAttachments(this.appointmentId)

    ])
    .subscribe({
      next: ([appointmentData,attachmentsData]) => {
        this.appointment=appointmentData;
        this.attachments=attachmentsData.attachments;
        this.isLoading = false; 
      },
      error: (err) => {
        console.error('Error loading patient appointment:', err);
        this.isLoading = false; 
      }
    });
  }
}