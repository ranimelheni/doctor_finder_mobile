import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { Router } from '@angular/router';

@Component({
  selector: 'app-appointment-action-modal',
  templateUrl: './appointment-action-modal.component.html',
  styleUrls: ['./appointment-action-modal.component.scss'],
  standalone: false
})
export class AppointmentActionModalComponent implements OnInit {
  @Input() appointment: any;
  @Input() isPast: boolean = false;

  constructor(
    private modalController: ModalController,
    private router: Router
  ) {}

  ngOnInit() {
    console.log('AppointmentActionModalComponent initialized');
    console.log('Input - appointment:', this.appointment);
    console.log('Input - isPast:', this.isPast);
  }

  confirm() {
    console.log('Confirm action triggered');
    this.modalController.dismiss({ action: 'Confirm' });
  }

  cancel() {
    console.log('Cancel action triggered');
    this.modalController.dismiss({ action: 'Cancel' });
  }

  markCompleted() {
    console.log('MarkCompleted action triggered');
    this.modalController.dismiss({ action: 'Completed' });
  }

  markCancelled() {
    console.log('MarkCancelled action triggered');
    this.modalController.dismiss({ action: 'Cancelled' });
  }

  dismiss() {
    console.log('Dismiss action triggered');
    this.modalController.dismiss();
  }

  viewPatientProfile() {
    console.log('View Patient Profile action triggered');
    this.modalController.dismiss().then(() => {
      this.router.navigate(['/profile'], { queryParams: { user_id: this.appointment.user_id } });
    });
  }
  viewAppointmentDetails() {
    this.modalController.dismiss().then(() => {
      this.router.navigate(['/appointment-details', this.appointment.id]);
    });
  }
  getStatusClass(): string {
    const status = this.appointment?.status?.toLowerCase() || '';
    switch (status) {
      case 'pending':
        return 'status-pending';
      case 'confirmed':
        return 'status-confirmed';
      case 'completed':
        return 'status-completed';
      case 'cancelled':
        return 'status-cancelled';
      default:
        return 'status-default';
    }
  }
}