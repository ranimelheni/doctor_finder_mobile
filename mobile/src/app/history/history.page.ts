import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { DoctorService } from '../services/doctor.service';

@Component({
  selector: 'app-history',
  templateUrl: './history.page.html',
  styleUrls: ['./history.page.scss'],
  standalone:false
})
export class HistoryPage implements OnInit {
  appointments: any[] = [];
  isLoading: boolean = true;

  constructor(
    private authService: AuthService,
    private patientService: DoctorService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadConsultations();
  }

  ionViewWillEnter() {
    this.loadConsultations();
  }

  loadConsultations() {
    this.isLoading = true;
    this.patientService.getAppointments("Completed").subscribe({
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
    this.router.navigate(['/appointment-details', appointmentId]);
  }
}