import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { LoginComponent } from './auth/login/login.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { UsersComponent } from './pages/users/users.component';
import { BookingsComponent } from './pages/bookings/bookings.component';
import { NewBookingComponent } from './pages/bookings/new-booking/new-booking.component';
import { CalendarComponent } from './pages/calendar/calendar.component';
import { ReportsComponent } from './pages/reports/reports.component';
import { SettingsComponent } from './pages/settings/settings.component';
import { AuthGuard } from './guards/auth.guard'

import { BookingsprintComponent } from './pages/bookings/bookingsprint/bookingsprint.component';
import { EditBookingComponent } from './pages/bookings/edit-booking/edit-booking.component';
const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  
  // Protected Routes (require authentication)
  { 
    path: 'dashboard', 
    component: DashboardComponent,
    canActivate: [AuthGuard]
  },
  { 
    path: 'users', 
    component: UsersComponent,
    canActivate: [AuthGuard]
  },
  { 
    path: 'bookings', 
    component: BookingsComponent,
    canActivate: [AuthGuard]
  },
  { 
    path: 'bookings/new', 
    component: NewBookingComponent,
    canActivate: [AuthGuard]
  },
    {
    path: 'bookings/edit/:id',
    component: EditBookingComponent
  },
  { 
      path: 'bookings/print',
    component: BookingsprintComponent
  },

  { 
    path: 'calendar', 
    component: CalendarComponent,
    canActivate: [AuthGuard]
  },
  { 
    path: 'reports', 
    component: ReportsComponent,
    canActivate: [AuthGuard]
  },
  { 
    path: 'settings', 
    component: SettingsComponent,
    canActivate: [AuthGuard]
  },
  
  // Wildcard route - redirect to dashboard
  { path: '**', redirectTo: 'dashboard' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }