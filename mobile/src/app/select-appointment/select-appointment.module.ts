import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { SelectAppointmentPageRoutingModule } from './select-appointment-routing.module';

import { SelectAppointmentPage } from './select-appointment.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    SelectAppointmentPageRoutingModule
  ],
  declarations: [SelectAppointmentPage]
})
export class SelectAppointmentPageModule {}
