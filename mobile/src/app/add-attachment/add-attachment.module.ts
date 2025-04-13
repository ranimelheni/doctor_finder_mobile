import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { AddAttachmentPageRoutingModule } from './add-attachment-routing.module';

import { AddAttachmentPage } from './add-attachment.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    AddAttachmentPageRoutingModule
  ],
  declarations: [AddAttachmentPage]
})
export class AddAttachmentPageModule {}
