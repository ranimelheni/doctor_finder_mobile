import { Component, OnInit } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { DoctorService } from '../services/doctor.service';
import { ToastController, AlertController } from '@ionic/angular';
import { forkJoin, of } from 'rxjs';

@Component({
  selector: 'app-appointments',
  templateUrl: './appointments.page.html',
  styleUrls: ['./appointments.page.scss'],
  standalone: false,
})
export class AppointmentsPage {
  appointments: any[] = [];
  loading: boolean = false;

  constructor(
    private authService: AuthService,
    private doctorService: DoctorService,
    private toastController: ToastController,
    private alertController: AlertController
  ) {}

  ionViewWillEnter() {
    this.loadAppointments();
  }

  loadAppointments() {
    this.loading = true;
    this.doctorService.getAppointments().subscribe({
      next: (data) => {
        this.appointments = data || []; // Ensure array even if null/undefined
        console.log('Appointments loaded:', this.appointments); // Debug
        this.fetchDoctorNames();
      },
      error: (err) => {
        console.error('Error loading appointments:', err);
        this.presentToast('Failed to load appointments', 'danger');
        this.loading = false;
      }
    });
  }

  fetchDoctorNames() {
    if (this.appointments.length === 0) {
      console.log('No appointments, skipping doctor name fetch');
      this.loading = false;
      return;
    }

    const doctorRequests = this.appointments.map(appointment =>
      this.doctorService.getDoctorById(appointment.doctor_id)
    );
    forkJoin(doctorRequests).subscribe({
      next: (doctors) => {
        this.appointments = this.appointments.map((appointment, index) => ({
          ...appointment,
          doctorName: doctors[index]?.name || 'Unknown Doctor'
        }));
        console.log('Doctor names fetched:', this.appointments); // Debug
        this.loading = false;
      },
      error: (err) => {
        console.error('Error fetching doctor names:', err);
        this.appointments = this.appointments.map(appointment => ({
          ...appointment,
          doctorName: 'Unknown Doctor'
        }));
        this.loading = false;
      }
    });
  }

  async deleteAppointment(appointmentId: number) {
    const alert = await this.alertController.create({
      header: 'Confirm Deletion',
      message: 'Are you sure you want to delete this appointment?',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          cssClass: 'secondary'
        },
        {
          text: 'Delete',
          cssClass: 'danger',
          handler: () => {
            this.doctorService.deleteAppointment(appointmentId).subscribe({
              next: () => {
                this.appointments = this.appointments.filter(app => app.id !== appointmentId);
                this.presentToast('Appointment deleted successfully', 'success');
              },
              error: (err) => {
                console.error('Error deleting appointment:', err);
                this.presentToast('Failed to delete appointment', 'danger');
              }
            });
          }
        }
      ]
    });
    await alert.present();
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