import { Component } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { DoctorService } from '../services/doctor.service';
import { Router } from '@angular/router';
import { ModalController, AlertController } from '@ionic/angular';
import { AppointmentActionModalComponent } from '../appointment-action-modal/appointment-action-modal.component';

@Component({
  selector: 'app-schedule',
  templateUrl: './schedule.page.html',
  styleUrls: ['./schedule.page.scss'],
  standalone: false,
})
export class SchedulePage {
  doctorId: number | null = null;
  currentWeekStart: Date = new Date();
  daysOfWeek: Date[] = [];
  appointments: any[] = [];
  loading: boolean = true;
  hours: string[] = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];

  constructor(
    private authService: AuthService,
    private doctorService: DoctorService,
    private router: Router,
    private modalController: ModalController,
    private alertController: AlertController
  ) {}

  ionViewWillEnter() {
    this.doctorId = this.authService.getDoctorId();
    this.initializeWeek();
    this.loadAppointments();
    this.checkPastAppointments();
  }

  initializeWeek() {
    this.daysOfWeek = [];
    const start = new Date(this.currentWeekStart);
    start.setHours(0, 0, 0, 0);
    for (let i = 0; i < 7; i++) {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      this.daysOfWeek.push(day);
    }
  }

  loadAppointments() {
    this.loading = true;
    if (this.doctorId) {
      this.doctorService.getDoctorAppointments(this.doctorId).subscribe({
        next: (data) => {
          const weekStart = this.daysOfWeek[0];
          const weekEnd = new Date(this.daysOfWeek[6]);
          weekEnd.setDate(weekEnd.getDate() + 1);
          weekEnd.setHours(0, 0, 0, 0);

          this.appointments = data.filter(app => {
            const appDate = new Date(app.appointment_date);
            return appDate >= weekStart && appDate < weekEnd;
          });
          this.loading = false;
          console.log('Doctor appointments:', this.appointments);
        },
        error: (err) => {
          console.error('Error loading doctor appointments:', err);
          this.loading = false;
        }
      });
    } else {
      this.loading = false;
    }
  }

  getSlotText(day: Date, hour: string): string {
    const slotTime = new Date(day);
    const [hourNum] = hour.split(':');
    slotTime.setHours(parseInt(hourNum, 10), 0, 0, 0);

    const appointment = this.appointments.find(app => {
      const appDate = new Date(app.appointment_date);
      return appDate.getHours() === slotTime.getHours() && appDate.toDateString() === day.toDateString();
    });

    if (appointment) {
      return `✔`;
    }
    return 'Free';
  }

  getSlotClass(day: Date, hour: string): string {
    const slotTime = new Date(day);
    const [hourNum] = hour.split(':');
    slotTime.setHours(parseInt(hourNum, 10), 0, 0, 0);

    const appointment = this.appointments.find(app => {
      const appDate = new Date(app.appointment_date);
      return appDate.getHours() === slotTime.getHours() && appDate.toDateString() === day.toDateString();
    });

    return appointment ? 'booked-slot clickable' : 'free-slot';
  }

  async manageAppointment(day: Date, hour: string) {
    console.log('Using updated manageAppointment version (no redirect to profile)');
  
    const slotTime = new Date(day);
    const [hourNum] = hour.split(':');
    slotTime.setHours(parseInt(hourNum, 10), 0, 0, 0);
  
    const appointment = this.appointments.find(app => {
      const appDate = new Date(app.appointment_date);
      return appDate.getHours() === slotTime.getHours() && appDate.toDateString() === day.toDateString();
    });
  
    if (!appointment) {
      console.log('No appointment found for this slot:', { day, hour });
      return;
    }
  
    console.log('Selected appointment:', appointment);
    console.log('Appointment status:', appointment.status);
  
    const now = new Date();
    const isPast = slotTime < now;
    console.log('Is appointment past?', isPast);
  
    console.log('Opening modal for appointment');
    const modal = await this.modalController.create({
      component: AppointmentActionModalComponent,
      componentProps: {
        appointment,
        isPast: isPast
      }
    });
  
    await modal.present();
    const { data } = await modal.onWillDismiss();
    if (data?.action) {
      let status: string;
      if (data.action === 'Confirm') {
        status = 'Confirmed';
      } else if (data.action === 'Cancel') {
        status = 'Cancelled';
      } else if (data.action === 'Completed') {
        status = 'Completed';
      } else if (data.action === 'Cancelled') {
        status = 'Cancelled';
      } else {
        console.log('Unknown action:', data.action);
        return;
      }
      this.updateAppointmentStatus(appointment.id, status);
    } else {
      console.log('Modal dismissed without action');
    }
  }
  updateAppointmentStatus(appointmentId: number, status: string) {
    const token = this.authService.getToken();
    if (!token) {
      this.presentAlert('Error', 'You need to be logged in to update appointment status.');
      return;
    }

    this.doctorService.updateAppointmentStatus(appointmentId, status, token).subscribe({
      next: () => {
        this.presentAlert('Success', `Appointment has been ${status.toLowerCase()}.`);
        this.loadAppointments();
      },
      error: (err) => {
        this.presentAlert('Error', err.message || 'Failed to update appointment status.');
      }
    });
  }

  viewPatientProfile(day: Date, hour: string) {
    const slotTime = new Date(day);
    const [hourNum] = hour.split(':');
    slotTime.setHours(parseInt(hourNum, 10), 0, 0, 0);

    const appointment = this.appointments.find(app => {
      const appDate = new Date(app.appointment_date);
      return appDate.getHours() === slotTime.getHours() && appDate.toDateString() === day.toDateString();
    });

    if (appointment) {
      this.router.navigate(['/profile'], { queryParams: { user_id: appointment.user_id } });
    }
  }

  checkPastAppointments() {
    const token = this.authService.getToken();
    if (!token) return;

    this.doctorService.checkPastAppointments(token).subscribe({
      next: (response) => {
        console.log('Past appointments notifications:', response.notifications);
      },
      error: (err) => {
        console.error('Error checking past appointments:', err);
      }
    });
  }

  previousWeek() {
    this.currentWeekStart.setDate(this.currentWeekStart.getDate() - 7);
    this.initializeWeek();
    this.loadAppointments();
  }

  nextWeek() {
    this.currentWeekStart.setDate(this.currentWeekStart.getDate() + 7);
    this.initializeWeek();
    this.loadAppointments();
  }

  async presentAlert(header: string, message: string) {
    const alert = await this.alertController.create({
      header,
      message,
      buttons: ['OK']
    });
    await alert.present();
  }
}