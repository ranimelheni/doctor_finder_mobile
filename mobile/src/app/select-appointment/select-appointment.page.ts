import { Component, OnInit } from '@angular/core';
import { DoctorService } from '../services/doctor.service';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-select-appointment',
  templateUrl: './select-appointment.page.html',
  styleUrls: ['./select-appointment.page.scss'],
  standalone: false
})

export class SelectAppointmentPage implements OnInit {
  doctorId: number | null = null;
  appointments: any[] = [];
  selectedAppointmentId: number | null = null;
  notes: string = '';

  constructor( private authService: AuthService,
      private doctorService: DoctorService,
      private router: Router  ) {
  
  }
  ionViewWillEnter() {
    this.loadAppointmentsC();
    this.doctorId = this.authService.getDoctorId();
   
  }
  ngOnInit() {
    this.loadAppointmentsC();
  }

  loadAppointmentsC() {
    if (this.doctorId){
    this.doctorService.getDoctorAppointments(this.doctorId,"Completed").subscribe({
      next: (data) => {
        this.appointments = data;
      },
      error: (err) => {
        console.error('Error loading appointments:', err);
      }
    });
  }
  }

  addConsultation() {
    if (!this.selectedAppointmentId) return;
    const selectedAppointment = this.appointments.find(a => a.id === this.selectedAppointmentId);
    const data = {
      patient_id: selectedAppointment.user_id,
      appointment_id: this.selectedAppointmentId,
      notes: this.notes
    };
    this.doctorService.addConsultation(data).subscribe({
      next: () => {
        this.router.navigate(['/consultations'], { queryParams: { refresh: true } });
      },
      error: (err) => {
        console.error('Error adding consultation:', err);
      }
    });
  }
}