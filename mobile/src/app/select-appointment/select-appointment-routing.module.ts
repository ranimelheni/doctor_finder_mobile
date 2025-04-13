import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { SelectAppointmentPage } from './select-appointment.page';

const routes: Routes = [
  {
    path: '',
    component: SelectAppointmentPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SelectAppointmentPageRoutingModule {}
