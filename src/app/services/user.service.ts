import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

// ============================
// Interfaces / Models
// ============================

export interface User {
  id: number;
  userName: string;
  firstName: string;
  lastName: string;
  role: string;
  createdAt: string;
  
  // هذه الخصائص قد تكون فارغة أو بالقيمة الافتراضية
  email?: string;
  phone?: string;
  isActive?: boolean;
}
export interface UserDto {
  id?: number;
  userName: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  role?: string;
  password?: string;
  confirmPassword?: string;
}

export interface LoginRequest {
  userName: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  id: number;
  userName: string;
  firstName: string;
  lastName: string;
  role: string;
  token: string;
}

export interface ChangePasswordRequest {
  userId: number;
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface ResetPasswordRequest {
  userId: number;
  newPassword: string;
  confirmPassword: string;
}

export interface UpdateRoleRequest {
  userId: number;
  role: string;
}

export interface UpdateStatusRequest {
  userId: number;
  isActive: boolean;
}

export interface SearchRequest {
  searchTerm: string;
  role?: string;
  page?: number;
  pageSize?: number;
}

export interface Pagination {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  pagination?: Pagination;
  count?: number;
}

export interface UserStatistics {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  roleStatistics: { [role: string]: { total: number; active: number; inactive: number } };
  lastUpdated: string;
}

// ============================
// User Service
// ============================

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private baseUrl =  `${environment.apiUrl}/api/user`;

  constructor(private http: HttpClient) {}

  // ============================
  // Helper Methods
  // ============================

  private getHeaders(): HttpHeaders {
    const token = this.getToken();
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  private getToken(): string {
    return localStorage.getItem('dpbooking_token') || '';
  }

  private handleResponse<T>(response: any): ApiResponse<T> {
    return response as ApiResponse<T>;
  }

  // ============================
  // Auth Methods
  // ============================

  login(credentials: LoginRequest): Observable<ApiResponse<LoginResponse>> {
    return this.http.post<ApiResponse<LoginResponse>>(
      `${this.baseUrl}/login`,
      credentials
    ).pipe(
      tap(response => {
        if (response.success && response.data) {
          // Save token and user info
          localStorage.setItem('dpbooking_token', response.data.token);
          localStorage.setItem('dpbooking_user', JSON.stringify({
            id: response.data.id,
            userName: response.data.userName,
            firstName: response.data.firstName,
            lastName: response.data.lastName,
            role: response.data.role
          }));
        }
      })
    );
  }

  logout(): void {
    localStorage.removeItem('dpbooking_token');
    localStorage.removeItem('dpbooking_user');
    localStorage.removeItem('dpbooking_username');
    localStorage.removeItem('dpbooking_rememberMe');
  }

verifyToken(token: string): Observable<ApiResponse<User>> {
  return this.http.post<ApiResponse<User>>(
    `${this.baseUrl}/verify-token`,
    { token }
  );
}

  getCurrentUser(): Observable<ApiResponse<User>> {
    const headers = this.getHeaders();
    return this.http.post<ApiResponse<User>>(
      `${this.baseUrl}/me`,
      { token: this.getToken() },
      { headers }
    );
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  getUserInfo(): any {
    const userStr = localStorage.getItem('dpbooking_user');
    return userStr ? JSON.parse(userStr) : null;
  }

  getUserId(): number {
    const user = this.getUserInfo();
    return user ? user.id : 0;
  }

  getUserRole(): string {
    const user = this.getUserInfo();
    return user ? user.role : '';
  }

  isAdmin(): boolean {
    return this.getUserRole() === 'Admin';
  }

  // ============================
  // User CRUD Operations
  // ============================

  // CREATE USER
  createUser(userData: UserDto): Observable<ApiResponse<User>> {
    const headers = this.getHeaders();
    return this.http.post<ApiResponse<User>>(
      `${this.baseUrl}/create`,
      userData,
      { headers }
    );
  }

  // GET USER BY ID
  getUserById(id: number): Observable<ApiResponse<User>> {
    const headers = this.getHeaders();
    return this.http.post<ApiResponse<User>>(
      `${this.baseUrl}/get`,
      { id },
      { headers }
    );
  }

  // UPDATE USER
  updateUser(id: number, userData: UserDto): Observable<ApiResponse<User>> {
    const headers = this.getHeaders();
    const updateData = {
      id,
      ...userData
    };
    return this.http.post<ApiResponse<User>>(
      `${this.baseUrl}/update`,
      updateData,
      { headers }
    );
  }

  // DELETE USER
 deleteUser(id: number): Observable<ApiResponse<null>> {
  const headers = this.getHeaders();
  return this.http.post<ApiResponse<null>>(
    `${this.baseUrl}/delete`,
    { id },
    { headers }
  );
}

  // ============================
  // User List & Search
  // ============================

  // GET ALL USERS
getAllUsers(page: number = 1, pageSize: number = 20): Observable<ApiResponse<User[]>> {
  const headers = this.getHeaders();
  return this.http.post<ApiResponse<User[]>>(
    `${this.baseUrl}/all`,
    { page, pageSize }, // pagination request
    { headers }
  );
}

  // SEARCH USERS
  searchUsers(searchTerm: string, role?: string): Observable<ApiResponse<User[]>> {
    const headers = this.getHeaders();
    const request: SearchRequest = { searchTerm };
    if (role) request.role = role;
    
    return this.http.post<ApiResponse<User[]>>(
      `${this.baseUrl}/search`,
      request,
      { headers }
    );
  }

  // SEARCH USERS BY ROLE
  searchUsersByRole(searchTerm: string, role: string): Observable<ApiResponse<User[]>> {
    const headers = this.getHeaders();
    return this.http.post<ApiResponse<User[]>>(
      `${this.baseUrl}/search-role`,
      { searchTerm, role },
      { headers }
    );
  }

  // GET ACTIVE USERS
  getActiveUsers(): Observable<ApiResponse<User[]>> {
    const headers = this.getHeaders();
    return this.http.post<ApiResponse<User[]>>(
      `${this.baseUrl}/search`,
      { searchTerm: '', role: 'Active' },
      { headers }
    );
  }

  // GET INACTIVE USERS
  getInactiveUsers(): Observable<ApiResponse<User[]>> {
    const headers = this.getHeaders();
    return this.http.post<ApiResponse<User[]>>(
      `${this.baseUrl}/search`,
      { searchTerm: '', role: 'Inactive' },
      { headers }
    );
  }

  // ============================
  // Password Management
  // ============================

  // CHANGE PASSWORD
  // changePassword(userId: number, oldPassword: string, newPassword: string): Observable<ApiResponse> {
  //   const headers = this.getHeaders();
  //   const request: ChangePasswordRequest = {
  //     userId,
  //     oldPassword,
  //     newPassword,
  //     confirmPassword: newPassword
  //   };
    
  //   return this.http.post<ApiResponse>(
  //     `${this.baseUrl}/change-password`,
  //     request,
  //     { headers }
  //   );
  // }

  // RESET PASSWORD (Admin only)
  // resetPassword(userId: number, newPassword: string): Observable<ApiResponse> {
  //   const headers = this.getHeaders();
  //   const request: ResetPasswordRequest = {
  //     userId,
  //     newPassword,
  //     confirmPassword: newPassword
  //   };
    
  //   return this.http.post<ApiResponse>(
  //     `${this.baseUrl}/reset-password`,
  //     request,
  //     { headers }
  //   );
  // }

  // ============================
  // Role & Status Management
  // ============================

  // UPDATE USER ROLE
  // updateUserRole(userId: number, role: string): Observable<ApiResponse> {
  //   const headers = this.getHeaders();
  //   const request: UpdateRoleRequest = { userId, role };
    
  //   return this.http.post<ApiResponse>(
  //     `${this.baseUrl}/update-role`,
  //     request,
  //     { headers }
  //   );
  // }

  // UPDATE USER STATUS
  // updateUserStatus(userId: number, isActive: boolean): Observable<ApiResponse> {
  //   const headers = this.getHeaders();
  //   const request: UpdateStatusRequest = { userId, isActive };
    
  //   return this.http.post<ApiResponse>(
  //     `${this.baseUrl}/update-status`,
  //     request,
  //     { headers }
  //   );
  // }

  // BULK UPDATE ROLES
  // bulkUpdateRoles(updates: { userId: number; role: string }[]): Observable<ApiResponse> {
  //   const headers = this.getHeaders();
  //   return this.http.post<ApiResponse>(
  //     `${this.baseUrl}/bulk-update-roles`,
  //     { updates },
  //     { headers }
  //   );
  // }

  // ============================
  // Statistics & Reports
  // ============================

  // GET USER STATISTICS
  getUserStatistics(): Observable<ApiResponse<UserStatistics>> {
    const headers = this.getHeaders();
    return this.http.post<ApiResponse<UserStatistics>>(
      `${this.baseUrl}/statistics`,
      {},
      { headers }
    );
  }

  // GET USER COUNT BY ROLE
  getUserCountByRole(): Observable<ApiResponse<{ [role: string]: number }>> {
    const headers = this.getHeaders();
    return this.http.post<ApiResponse<{ [role: string]: number }>>(
      `${this.baseUrl}/count-by-role`,
      {},
      { headers }
    );
  }

  // ============================
  // Utility Methods
  // ============================

  // CHECK USERNAME AVAILABILITY
  checkUsernameAvailability(username: string): Observable<ApiResponse<{ available: boolean }>> {
    const headers = this.getHeaders();
    return this.http.post<ApiResponse<{ available: boolean }>>(
      `${this.baseUrl}/check-username`,
      { username },
      { headers }
    );
  }

  // CHECK EMAIL AVAILABILITY
  checkEmailAvailability(email: string): Observable<ApiResponse<{ available: boolean }>> {
    const headers = this.getHeaders();
    return this.http.post<ApiResponse<{ available: boolean }>>(
      `${this.baseUrl}/check-email`,
      { email },
      { headers }
    );
  }

  // GET USER ACTIVITY LOG
  getUserActivityLog(userId: number, limit: number = 50): Observable<ApiResponse<any[]>> {
    const headers = this.getHeaders();
    return this.http.post<ApiResponse<any[]>>(
      `${this.baseUrl}/activity-log`,
      { userId, limit },
      { headers }
    );
  }

  // EXPORT USERS TO EXCEL
  exportUsersToExcel(filters?: any): Observable<Blob> {
    const headers = this.getHeaders();
    return this.http.post(
      `${this.baseUrl}/export`,
      filters || {},
      {
        headers,
        responseType: 'blob'
      }
    );
  }

  // ============================
  // Profile Management
  // ============================

  // UPDATE PROFILE
  updateProfile(userData: Partial<UserDto>): Observable<ApiResponse<User>> {
    const currentUser = this.getUserInfo();
    if (!currentUser) {
      throw new Error('User not logged in');
    }
    
    return this.updateUser(currentUser.id, userData as UserDto);
  }

  // CHANGE MY PASSWORD
  // changeMyPassword(oldPassword: string, newPassword: string): Observable<ApiResponse> {
  //   const currentUser = this.getUserInfo();
  //   if (!currentUser) {
  //     throw new Error('User not logged in');
  //   }
    
  //   return this.changePassword(currentUser.id, oldPassword, newPassword);
  // }

  // UPLOAD PROFILE PICTURE
  uploadProfilePicture(userId: number, file: File): Observable<ApiResponse<{ imageUrl: string }>> {
    const headers = new HttpHeaders();
    const formData = new FormData();
    formData.append('file', file);
    formData.append('userId', userId.toString());

    return this.http.post<ApiResponse<{ imageUrl: string }>>(
      `${this.baseUrl}/upload-profile-picture`,
      formData,
      { headers }
    );
  }

  // ============================
  // Session Management
  // ============================

  // REMEMBER ME
  setRememberMe(username: string, remember: boolean): void {
    if (remember) {
      localStorage.setItem('dpbooking_username', username);
      localStorage.setItem('dpbooking_rememberMe', 'true');
    } else {
      localStorage.removeItem('dpbooking_username');
      localStorage.removeItem('dpbooking_rememberMe');
    }
  }

  getRememberedUsername(): string | null {
    return localStorage.getItem('dpbooking_username');
  }

  shouldRememberMe(): boolean {
    return localStorage.getItem('dpbooking_rememberMe') === 'true';
  }

  // ============================
  // Error Handling
  // ============================

  private handleError(error: any): Observable<never> {
    console.error('API Error:', error);
    
    let errorMessage = 'حدث خطأ غير متوقع';
    
    if (error.status === 401) {
      errorMessage = 'غير مصرح بالوصول. يرجى تسجيل الدخول مرة أخرى';
      this.logout();
    } else if (error.status === 403) {
      errorMessage = 'غير مصرح لك بتنفيذ هذا الإجراء';
    } else if (error.status === 404) {
      errorMessage = 'لم يتم العثور على المورد المطلوب';
    } else if (error.status === 500) {
      errorMessage = 'خطأ في الخادم الداخلي';
    } else if (error.error?.message) {
      errorMessage = error.error.message;
    }
    
    throw new Error(errorMessage);
  }
}