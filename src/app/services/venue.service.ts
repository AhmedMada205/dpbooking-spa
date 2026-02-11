import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface Venue {
  venueId: number;
  venueName: string;
  capacity: number;
  description?: string;
  basePrice: number;
  isAvailable: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class VenueService {

  private apiUrl =  `${environment.apiUrl}/api/venue`; 


  constructor(private http: HttpClient) { }

  // 🟢 جلب كل الأماكن
  getAll(): Observable<Venue[]> {
    return this.http.post<Venue[]>(`${this.apiUrl}/getall`, {});
  }

  // 🟢 جلب الأماكن المتاحة فقط
  getAvailable(): Observable<Venue[]> {
    return this.http.post<Venue[]>(`${this.apiUrl}/getavailable`, {});
  }

  // 🟢 جلب مكان بالـ ID
  getById(id: number): Observable<Venue> {
    return this.http.post<Venue>(`${this.apiUrl}/getbyid`, id);
  }

  // 🟢 إضافة مكان
  create(venue: Venue): Observable<Venue> {
    return this.http.post<Venue>(`${this.apiUrl}/create`, venue);
  }

  // 🟢 تعديل مكان
  update(venue: Venue): Observable<Venue> {
    return this.http.post<Venue>(`${this.apiUrl}/update`, venue);
  }

  // 🟢 حذف مكان
  delete(id: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/delete`, id);
  }

  // 🟢 تغيير حالة التوفر
  toggleAvailability(venueId: number, isAvailable: boolean): Observable<any> {
    return this.http.post(`${this.apiUrl}/toggle-availability`, {
      venueId,
      isAvailable
    });
  }
}
