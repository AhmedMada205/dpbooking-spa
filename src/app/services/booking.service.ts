import { Injectable } from '@angular/core';
import {
  HttpClient,
  HttpErrorResponse,
  HttpHeaders,
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';
import { environment } from 'src/environments/environment';

// ================= ENUMS =================
export enum BookingStatus {
  Pending = 0, // قيد الانتظار
  Confirmed = 1, // مؤكد
  Complete = 2, //مكتمل
  Cancelled = 3, // ملغي
  Postponed = 4, // اتأجل
  CancelledWithRefund = 5, // ا    // ملغي وتم الاسترداد ✅✅✅
}

export enum BookingType {
  Wedding = 1,
  ShipTrip = 2,
  Engagement = 3,
  Birthday = 4,
  RamadanIftar = 5,
  RamadanSuhoor = 6,
  GardenParty = 7,
  Conference = 8,
  Other = 9,
}

// ================= MODELS =================
export interface BookingMealRequest {
  MealId: number;
  Quantity: number;
  UnitPrice: number;
}

export interface CreateBookingRequest {
  ClientName: string;
  ClientPhone: string;
  ClientMobile?: string;
  BookingType: BookingType; // ✅ Enum
  VenueId?: number;
  BookingDate: string; // YYYY-MM-DD
  BookingTime: string; // HH:mm:ss
  GuestsCount: number;
  TotalAmount: number;
  ReceiptNumber: string;
  Note?: string;
  DepositAmount?: number | null;
  Meals?: BookingMealRequest[];
  VenueExtraPrice?: number;
}

export interface Booking {
  bookingId?: number;
  clientName: string;
  clientPhone: string;
  clientMobile?: string;
  guestsCount: number;
  bookingType: BookingType | string;
  bookingDate: string;
  bookingTime: string;
  venueId?: number;
  totalAmount: number;
  depositAmount: number;
  bookingStatus: BookingStatus;
  createdByUserId: number;
  createdByUserName?: string; // ✅ الجديد
  createdAt?: string;
  venuePrice?: number;
  bookingMeals?: BookingMealRequest[];
}

export interface GetBookingDto {
  bookingId: number;
  clientName: string;
  clientPhone: string;
  guestsCount: number;
  venueId?: number;
  venueName?: string;
  bookingDate: string; // أو Date حسب الـ API
  bookingTime: string;
  bookingType: number; // 0 = Iftar, 1 = Suhur
  paymentMethod?: number;
  receiptNumber: string;
  depositAmount?: number;
  createdByUserName?: string; // ✅ الجديد
venuePrice?: number;
  note?: string;
  bookingMeals?: {
    mealId: number;
    quantity: number;
    unitPrice: number;
  }[];
}

// ================= SERVICE =================
@Injectable({
  providedIn: 'root',
})
export class BookingService {
  private readonly apiUrl = `${environment.apiUrl}/api/bookings`;

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('dpbooking_token'); // أو مكان تخزين التوكن
    return new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    });
  }
  constructor(
    private http: HttpClient,
    private toastr: ToastrService,
  ) {}

  // ================= CREATE BOOKING =================
  createBooking(request: CreateBookingRequest): Observable<Booking> {
    return this.http
      .post<Booking>(`${this.apiUrl}/create`, request, {
        headers: this.getHeaders(),
      })
      .pipe(
        tap((res) => {
          console.log('Booking response:', res);
        }),
        catchError((err: HttpErrorResponse) => {
          this.toastr.error(err.error.message);
          // console.error('Service HTTP error:', err);
          // رجع error نفسه بدون تحويله
          return throwError(() => err);
        }),
      );
  }
  // ================= GET ALL BOOKINGS =================
  getAllBookings(): Observable<Booking[]> {
    return this.http
      .post<Booking[]>(`${this.apiUrl}/all`, {})
      .pipe(catchError(this.handleError));
  }

  // ================= GET BOOKINGS BY VENUE =================
  getBookingsByVenue(venueId: number): Observable<Booking[]> {
    return this.http
      .post<Booking[]>(`${this.apiUrl}/by-venue`, venueId)
      .pipe(catchError(this.handleError));
  }

  // ================= DELETE BOOKING =================
  deleteBooking(bookingId: number): Observable<void> {
    return this.http
      .post<void>(`${this.apiUrl}/delete`, bookingId)
      .pipe(catchError(this.handleError));
  }

  // ================= ERROR HANDLING =================
  private handleError(error: HttpErrorResponse) {
    console.error('HTTP Error:', error);

    let errorMessage = 'حدث خطأ غير متوقع';

    switch (error.status) {
      case 0:
        errorMessage = 'تعذر الاتصال بالسيرفر (تأكد أن الـ API شغال)';
        break;

      case 400:
        errorMessage = 'بيانات غير صحيحة';
        break;

      case 401:
        errorMessage = 'غير مصرح لك — التوكن غير صالح أو منتهي';
        break;

      case 403:
        errorMessage = 'ليس لديك صلاحية لتنفيذ هذا الإجراء';
        break;

      case 404:
        errorMessage = 'الـ API غير موجود';
        break;

      case 500:
        errorMessage = 'خطأ داخلي في السيرفر';
        break;

      default:
        errorMessage = `خطأ ${error.status}: ${error.message}`;
    }

    return throwError(() => errorMessage);
  }

  updateBookingStatus(
    bookingId: number,
    status: 'Confirmed' | 'Cancelled' | 'Postponed',
    newDate?: string,
  ): Observable<Booking> {
    const payload: any = { status };
    if (status === 'Postponed' && newDate) {
      payload.newDate = newDate;
    }

    const headers = new HttpHeaders({
      Authorization: `Bearer ${localStorage.getItem('dpbooking_token') || ''}`,
      'Content-Type': 'application/json',
    });

    console.log('Calling URL:', `${this.apiUrl}/${bookingId}/updatestatus`);

    return this.http
      .post<Booking>(`${this.apiUrl}/${bookingId}/updatestatus`, payload, {
        headers,
      })
      .pipe(
        catchError((error) => {
          console.error('Error in updateBookingStatus:', error);
          throw error;
        }),
      );
  }

  getBookingDetails(id: number): Observable<Booking> {
    return this.http
      .post<Booking>(
        `${this.apiUrl}/details`,
        { bookingId: id },
        { headers: this.getHeaders() },
      )
      .pipe(catchError(this.handleError));
  }

  getBookingById(id: number) {
    return this.http.post<any>(`${this.apiUrl}/getbyId`, { BookingId: id });
  }
  updateBooking(request: any): Observable<any> {
    return this.http
      .post(`${this.apiUrl}/updatebooking`, request, {
        headers: this.getHeaders(),
      })
      .pipe(
        tap((res) => console.log('Update booking response:', res)),
        catchError((error: HttpErrorResponse) => {
          console.error('Update booking HTTP error:', error);
          return throwError(() => error);
        }),
      );
  }
}
