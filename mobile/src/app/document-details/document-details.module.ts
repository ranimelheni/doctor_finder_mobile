import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { DocumentDetailsPageRoutingModule } from './document-details-routing.module';

import { DocumentDetailsPage } from './document-details.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    DocumentDetailsPageRoutingModule
  ],
  declarations: [DocumentDetailsPage]
})
export class DocumentDetailsPageModule {}
