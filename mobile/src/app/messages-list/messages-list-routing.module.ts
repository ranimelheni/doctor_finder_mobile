import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { MessagesListPage } from './messages-list.page';

const routes: Routes = [
  {
    path: '',
    component: MessagesListPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class MessagesListPageRoutingModule {}
