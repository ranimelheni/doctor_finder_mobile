import { Component } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { DoctorService } from '../services/doctor.service';
import { Router } from '@angular/router'; // Add Router for navigation

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
    private router: Router // Inject Router
  ) {}

  ionViewWillEnter() {
    this.doctorId = this.authService.getDoctorId();
    this.initializeWeek();
    this.loadAppointments();
  }

  initializeWeek() {
    this.daysOfWeek = [];
    const start = new Date(this.currentWeekStart);
    start.setHours(0, 0, 0, 0); // Start at midnight
    for (let i = 0; i < 7; i++) { // 6 days (Mon-Sat)
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

    return appointment ? `Booked (User ${appointment.user_id})` : 'Free';
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
}