import { Component, OnInit } from '@angular/core';
import { DoctorService } from '../services/doctor.service';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-consultations',
  templateUrl: './consultations.page.html',
  styleUrls: ['./consultations.page.scss'],
  standalone:false
})
export class ConsultationsPage implements OnInit {
  doctorId: number | null = null;
  appointments: any[] = [];
  isLoading: boolean = true;

  constructor(
    private doctorService: DoctorService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    this.doctorId = this.authService.getDoctorId();
    if (!this.doctorId) {
      this.router.navigate(['/']);
      this.isLoading = false;
      return;
    }
    this.loadConsultations();
  }

  ionViewWillEnter() {
    if (this.doctorId) {
      this.loadConsultations();
    }
  }

  loadConsultations() {
    this.isLoading = true;
    this.doctorService.getDoctorAppointments(this.doctorId!, 'Completed').subscribe({
      next: (data) => {
        this.appointments = data;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading consultations:', err);
        this.isLoading = false;
      }
    });
  }

  viewDetails(appointmentId: number) {
    this.router.navigate(['/appointment-details'], { queryParams: { id: appointmentId } });
  }
}