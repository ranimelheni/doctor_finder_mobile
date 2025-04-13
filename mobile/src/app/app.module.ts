import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouteReuseStrategy } from '@angular/router';

import { IonicModule, IonicRouteStrategy } from '@ionic/angular';

import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { HTTP_INTERCEPTORS, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { AuthInterceptor } from './auth.interceptor';
import { BookingModalComponent } from './booking-modal/booking-modal.component';
import { ConfirmationModalComponent } from './confirmation-modal/confirmation-modal.component';
import { DayScheduleModalComponent } from './day-schedule-modal/day-schedule-modal.component';
import { AddDocumentModalComponent } from './add-document-modal/add-document-modal.component';

import { FormsModule } from '@angular/forms';

@NgModule({
  declarations: [AppComponent,BookingModalComponent,ConfirmationModalComponent,DayScheduleModalComponent,AddDocumentModalComponent],
  imports: [BrowserModule, IonicModule.forRoot(), AppRoutingModule,FormsModule],
  providers: [{ provide: RouteReuseStrategy, useClass: IonicRouteStrategy }, provideHttpClient(withInterceptorsFromDi()) ,{ provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true }],
  bootstrap: [AppComponent],
})
export class AppModule {}
