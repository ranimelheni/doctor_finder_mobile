import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { AddAttachmentPage } from './add-attachment.page';

const routes: Routes = [
  {
    path: '',
    component: AddAttachmentPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AddAttachmentPageRoutingModule {}
