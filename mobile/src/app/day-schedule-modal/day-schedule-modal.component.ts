import { Component } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { DoctorService } from '../services/doctor.service';
import { ToastController } from '@ionic/angular';

@Component({
  selector: 'app-day-schedule-modal',
  templateUrl: './day-schedule-modal.component.html',
  styleUrls: ['./day-schedule-modal.component.scss'],
  standalone: false,
})
export class DayScheduleModalComponent {
  doctorId!: number;
  doctorName!: string;
  selectedDate!: string; // Matches DoctorProfilePage's string type
  timeSlots: { time: string; available: boolean }[] = [];
  selectedTime: string | null = null;
  loading: boolean = true;

  constructor(
    private modalController: ModalController,
    private doctorService: DoctorService,
    private toastController: ToastController
  ) {}

  ionViewWillEnter() {
    this.loadSchedule();
  }

  loadSchedule() {
    this.loading = true;
    // selectedDate is already in YYYY-MM-DD format, no conversion needed
    this.doctorService.getDaySchedule(this.doctorId, this.selectedDate).subscribe({
      next: (slots) => {
        this.timeSlots = slots;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading schedule:', err);
        this.loading = false;
        this.presentToast('Failed to load schedule', 'danger');
      }
    });
  }

  selectTime(time: string) {
    this.selectedTime = time;
  }

  async bookAppointment() {
    if (!this.selectedTime) {
      this.presentToast('Please select a time slot', 'warning');
      return;
    }

    // Combine selectedDate (YYYY-MM-DD) and selectedTime directly
    const appointmentDate = `${this.selectedDate} ${this.selectedTime}`;
    this.doctorService.bookAppointment(this.doctorId, appointmentDate).subscribe({
      next: () => {
        this.modalController.dismiss({ booked: true });
      },
      error: (err) => {
        console.error('Error booking appointment:', err);
        this.presentToast('Failed to book appointment', 'danger');
      }
    });
  }

  cancel() {
    this.modalController.dismiss();
  }

  async presentToast(message: string, color: string) {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      color,
      position: 'bottom'
    });
    await toast.present(); // Corrected from "await,他的present();"
  }
}