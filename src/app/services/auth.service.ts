import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private TOKEN_KEY = 'dpbooking_token';
  private USER_KEY = 'dpbooking_user';
  private ROLE_KEY = 'dpbooking_userRole';

isLoggedIn(): boolean {
  const token = localStorage.getItem(this.TOKEN_KEY);
  if (!token) return false;

  const payload = JSON.parse(atob(token.split('.')[1]));
  const expired = payload.exp * 1000 < Date.now();

  return !expired;
}
  getUserRole(): string | null {
    return localStorage.getItem(this.ROLE_KEY);
  }

logout(): void {
  localStorage.removeItem(this.TOKEN_KEY);
  localStorage.removeItem(this.USER_KEY);
  localStorage.removeItem(this.ROLE_KEY);
}
}

