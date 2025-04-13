import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { MessagesListPageRoutingModule } from './messages-list-routing.module';

import { MessagesListPage } from './messages-list.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    MessagesListPageRoutingModule
  ],
  declarations: [MessagesListPage]
})
export class MessagesListPageModule {}
