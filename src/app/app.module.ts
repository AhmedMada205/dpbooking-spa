import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { UsersComponent } from './pages/users/users.component';
import { LoginComponent } from './auth/login/login.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { BookingsComponent } from './pages/bookings/bookings.component';
import { NewBookingComponent } from './pages/bookings/new-booking/new-booking.component';
import { CalendarComponent } from './pages/calendar/calendar.component';
import { ReportsComponent } from './pages/reports/reports.component';
import { SettingsComponent } from './pages/settings/settings.component';
import { AuthGuard } from './guards/auth.guard';
import { ToastrModule } from 'ngx-toastr';
import { BookingsprintComponent } from './pages/bookings/bookingsprint/bookingsprint.component';
import { EditBookingComponent } from './pages/bookings/edit-booking/edit-booking.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { BsDatepickerModule } from 'ngx-bootstrap/datepicker';
import { RouterModule } from '@angular/router';

@NgModule({
  declarations: [
    AppComponent,
    UsersComponent,
    LoginComponent,
    DashboardComponent,
    BookingsComponent,
    NewBookingComponent,
    CalendarComponent,
    ReportsComponent,
    SettingsComponent,
    BookingsprintComponent,
    EditBookingComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule ,
    ReactiveFormsModule, // ⬅️ مهم للفورمز التفاعلية
    FormsModule,    // 👈 لازم
    BrowserAnimationsModule,   // ⬅️ مهم
    ToastrModule.forRoot(),
    BrowserAnimationsModule,
      BsDatepickerModule.forRoot(), // 👈 مهم جداً

  
  ],
  providers: [AuthGuard, Location ],
  bootstrap: [AppComponent]
})
export class AppModule { }
