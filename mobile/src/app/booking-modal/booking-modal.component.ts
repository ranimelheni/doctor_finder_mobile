import { Component, Input } from '@angular/core';
import { ModalController, ToastController } from '@ionic/angular';
import { DoctorService } from '../services/doctor.service';
import { AuthService } from '../services/auth.service';
import { ConfirmationModalComponent } from '../confirmation-modal/confirmation-modal.component';

@Component({
  selector: 'app-booking-modal',
  templateUrl: './booking-modal.component.html',
  styleUrls: ['./booking-modal.component.scss'],
  standalone : false,
})
export class BookingModalComponent {
  @Input() doctorId!: number;
  @Input() doctorName!: string;

  currentWeekStart: Date = new Date();
  daysOfWeek: Date[] = [];
  availableSlots: any[] = [];
  userAppointments: any[] = [];
  hours: string[] = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];
  loading: boolean = true;
  currentUserId: number;

  constructor(
    private modalController: ModalController,
    private doctorService: DoctorService,
    private authService: AuthService,
    private toastController: ToastController
  ) {
    this.currentUserId = this.authService.getUser().id;
    console.log('Current User ID:', this.currentUserId);
  }

  ionViewWillEnter() {
    this.initializeWeek();
    this.loadData();
  }

  initializeWeek() {
    this.daysOfWeek = [];
    const start = new Date(this.currentWeekStart);
    start.setHours(0, 0, 0, 0);
    for (let i = 0; i < 6; i++) {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      this.daysOfWeek.push(day);
    }
    console.log('Days of Week:', this.daysOfWeek.map(d => d.toISOString()));
  }

  loadData() {
    this.loading = true;
    const weekStart = this.daysOfWeek[0].toISOString().split('T')[0];
    
    this.doctorService.getDoctorAvailableSlots(this.doctorId, weekStart).subscribe({
      next: (slots) => {
        this.availableSlots = slots;
        console.log('Available Slots:', this.availableSlots);
        this.doctorService.getAppointments().subscribe({
          next: (appointments) => {
            this.userAppointments = appointments.filter(app => app.doctor_id === this.doctorId);
            console.log('User Appointments:', this.userAppointments);
            this.loading = false;
          },
          error: (err) => {
            console.error('Error loading user appointments:', err);
            this.loading = false;
            this.presentToast('Error loading your appointments', 'danger');
          }
        });
      },
      error: (err) => {
        console.error('Error loading available slots:', err);
        this.loading = false;
        this.presentToast('Error loading available slots', 'danger');
      }
    });
  }

  async bookSlot(slot: any) {
    const confirmationModal = await this.modalController.create({
      component: ConfirmationModalComponent,
      componentProps: {
        doctorId: this.doctorId,
        doctorName: this.doctorName,
        appointmentDate: slot.date
      }
    });

    confirmationModal.onDidDismiss().then((result) => {
      if (result.data && result.data.confirmed) {
        this.doctorService.bookAppointment(this.doctorId, slot.date).subscribe({
          next: (response) => {
            this.modalController.dismiss({ booked: true });
          },
          error: (err) => {
            console.error('Error booking appointment:', err);
            this.presentToast(err.error.message || 'Error booking appointment', 'danger');
          }
        });
      }
    });

    await confirmationModal.present();
  }

  previousWeek() {
    this.currentWeekStart.setDate(this.currentWeekStart.getDate() - 7);
    this.initializeWeek();
    this.loadData();
  }

  nextWeek() {
    this.currentWeekStart.setDate(this.currentWeekStart.getDate() + 7);
    this.initializeWeek();
    this.loadData();
  }

  dismiss() {
    this.modalController.dismiss();
  }

  async presentToast(message: string, color: string) {
    const toast = await this.toastController.create({
      message: message,
      duration: 2000,
      position: 'bottom',
      color: color
    });
    await toast.present();
  }

  public isSlotAvailable(day: Date, hour: string): boolean {
    const slotTime = this.getSlotTime(day, hour);
    const isBooked = this.userAppointments.some(app => 
      new Date(app.appointment_date).getTime() === slotTime.getTime()
    );
    const isAvailable = this.availableSlots.some(slot => 
      new Date(slot.date).getTime() === slotTime.getTime()
    );
    return isAvailable && !isBooked;
  }

  public getSlotText(day: Date, hour: string): string {
    const slotTime = this.getSlotTime(day, hour);
    const userAppointment = this.userAppointments.find(app => 
      new Date(app.appointment_date).getTime() === slotTime.getTime()
    );
    if (userAppointment) {
      return `Booked (Me)`;
    }
    const isAvailable = this.availableSlots.some(slot => 
      new Date(slot.date).getTime() === slotTime.getTime()
    );
    return isAvailable ? 'Free' : 'Booked';
  }

  public getSlotClass(day: Date, hour: string): string {
    const slotTime = this.getSlotTime(day, hour);
    const userAppointment = this.userAppointments.find(app => 
      new Date(app.appointment_date).getTime() === slotTime.getTime()
    );
    if (userAppointment) {
      return 'own-booked-slot';
    }
    const isAvailable = this.availableSlots.some(slot => 
      new Date(slot.date).getTime() === slotTime.getTime()
    );
    return isAvailable ? 'free-slot' : 'booked-slot';
  }

  public getSlot(day: Date, hour: string): any {
    const slotTime = this.getSlotTime(day, hour);
    return this.availableSlots.find(slot => new Date(slot.date).getTime() === slotTime.getTime());
  }

  private getSlotTime(day: Date, hour: string): Date {
    const slotTime = new Date(day);
    const [hourNum] = hour.split(':');
    slotTime.setHours(parseInt(hourNum, 10), 0, 0, 0);
    return slotTime;
  }
}