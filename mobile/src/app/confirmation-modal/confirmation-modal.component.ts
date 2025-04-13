import { Component, Input } from '@angular/core';
import { ModalController } from '@ionic/angular';

@Component({
  selector: 'app-confirmation-modal',
  templateUrl: './confirmation-modal.component.html',
  styleUrls: ['./confirmation-modal.component.scss'],
  standalone: false,
})
export class ConfirmationModalComponent {
  @Input() doctorId!: number;
  @Input() doctorName!: string;
  @Input() appointmentDate!: string;

  constructor(private modalController: ModalController) {}

  confirm() {
    this.modalController.dismiss({ confirmed: true });
  }

  cancel() {
    this.modalController.dismiss();
  }
}