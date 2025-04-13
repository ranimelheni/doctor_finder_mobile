import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { DocumentDetailsPage } from './document-details.page';

const routes: Routes = [
  {
    path: '',
    component: DocumentDetailsPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class DocumentDetailsPageRoutingModule {}
