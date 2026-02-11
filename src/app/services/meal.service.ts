import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface Meal {
  mealId: number;
  mealName: string;
  price: number;
    specialPrice?: number | null;
}

@Injectable({
  providedIn: 'root'
})
export class MealService {
  private apiUrl = `${environment.apiUrl}/api/meals`; // عدّل على حسب السيرفر عندك

  constructor(private http: HttpClient) { }

  // جلب كل الوجبات
getAllMeals(): Observable<Meal[]> {
  return this.http.post<Meal[]>(`${this.apiUrl}/all`, {});
}

  // جلب وجبة واحدة بالـ ID
  getMealById(id: number): Observable<Meal> {
    return this.http.get<Meal>(`${this.apiUrl}/${id}`);
  }
}
