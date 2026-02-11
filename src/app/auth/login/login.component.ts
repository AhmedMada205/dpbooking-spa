import { Component, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { trigger, transition, style, animate } from '@angular/animations';
import { NgForm } from '@angular/forms';
import { environment } from 'src/environments/environment';

export interface LoginRequest {
  userName: string;
  password: string;
}

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  animations: [
    trigger('fadeInOut', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(-10px)' }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ]),
      transition(':leave', [
        animate('300ms ease-in', style({ opacity: 0, transform: 'translateY(-10px)' }))
      ])
    ]),
    trigger('slideInOut', [
      transition(':enter', [
        style({ transform: 'translateY(100px)', opacity: 0 }),
        animate('300ms ease-out', style({ transform: 'translateY(0)', opacity: 1 }))
      ]),
      transition(':leave', [
        animate('300ms ease-in', style({ transform: 'translateY(100px)', opacity: 0 }))
      ])
    ])
  ]
})

export class LoginComponent implements OnInit {
    @ViewChild('loginForm') loginForm!: NgForm;
  // User credentials
  credentials: LoginRequest = {
    userName: '',
    password: ''
  };
  
  // UI state
  showPassword = false;
  usernameFocused = false;
  passwordFocused = false;
  rememberMe = true;
  secureMode = false;
  isLoading = false;
  errorMessage = '';
  language = 'ar';
  currentYear = new Date().getFullYear();
  showDemo = true;
  showToast = false;
  toastMessage = '';
  
  private apiUrl = environment.apiUrl;

  constructor(
    private router: Router,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    // إذا كان المستخدم مسجل دخول بالفعل، توجيه إلى Dashboard
    const token = localStorage.getItem('dpbooking_token');
    if (token) {
      this.router.navigate(['/dashboard']);
      return;
    }

    // Load saved credentials if "remember me" was checked
    const savedUsername = localStorage.getItem('dpbooking_username');
    const savedRememberMe = localStorage.getItem('dpbooking_rememberMe');
    
    if (savedUsername && savedRememberMe === 'true') {
      this.credentials.userName = savedUsername;
      this.rememberMe = true;
    }
    
    // Load language preference
    const savedLang = localStorage.getItem('dpbooking_lang');
    if (savedLang) {
      this.language = savedLang;
    }
    
    // Load security mode
    const savedSecureMode = localStorage.getItem('dpbooking_secureMode');
    if (savedSecureMode) {
      this.secureMode = savedSecureMode === 'true';
    }
  }

  login(): void {
    // Reset error message
    this.errorMessage = '';
    
    // Validate form
    if (!this.credentials.userName || !this.credentials.password) {
      this.errorMessage = 'يرجى ملء جميع الحقول المطلوبة';
      return;
    }

    this.isLoading = true;

    // Save preferences
    this.savePreferences();

    // Call real authentication API
    const loginUrl = this.secureMode 
      ? `${this.apiUrl}/api/account/login-secure` 
      : `${this.apiUrl}/api/account/login`;

    this.http.post(loginUrl, this.credentials)
      .subscribe({
        next: (response: any) => {
          console.log('Login successful:', response);
          
          // Save user data
          this.saveUserData(response);
          
          // Show success toast
          this.showSuccessToast('تم تسجيل الدخول بنجاح!');
          
          // Navigate to dashboard after delay
          setTimeout(() => {
            this.router.navigate(['/dashboard']);
          }, 1500);
        },
        error: (error) => {
          console.error('Login error:', error);
          this.handleLoginError(error);
          this.isLoading = false;
        },
        complete: () => {
          this.isLoading = false;
        }
      });
  }

  private savePreferences(): void {
    if (this.rememberMe) {
      localStorage.setItem('dpbooking_username', this.credentials.userName);
      localStorage.setItem('dpbooking_rememberMe', 'true');
    } else {
      localStorage.removeItem('dpbooking_username');
      localStorage.removeItem('dpbooking_rememberMe');
    }
    
    localStorage.setItem('dpbooking_secureMode', this.secureMode.toString());
  }

  private saveUserData(response: any): void {
    localStorage.setItem('currentUser', JSON.stringify(response));
    localStorage.setItem('dpbooking_token', response.token);
    localStorage.setItem('dpbooking_user', response.userName);
    localStorage.setItem('dpbooking_userId', response.id.toString());
    localStorage.setItem('dpbooking_userRole', response.role);
    
    if (response.firstName && response.lastName) {
      localStorage.setItem('dpbooking_fullName', `${response.firstName} ${response.lastName}`);
    }
  }

  private handleLoginError(error: any): void {
    if (error.status === 401) {
      this.errorMessage = 'اسم المستخدم أو كلمة المرور غير صحيحة';
    } else if (error.status === 403) {
      this.errorMessage = 'الحساب غير مفعل أو محظور';
    } else if (error.status === 429) {
      this.errorMessage = 'تم تجاوز عدد المحاولات المسموح بها. حاول مرة أخرى بعد دقيقة';
    } else if (error.status === 0) {
      this.errorMessage = 'لا يمكن الاتصال بالخادم. تحقق من اتصال الشبكة';
    } else if (error.status === 500) {
      this.errorMessage = 'خطأ في الخادم الداخلي. حاول مرة أخرى لاحقاً';
    } else {
      this.errorMessage = error.error?.message || 'حدث خطأ غير متوقع أثناء تسجيل الدخول';
    }
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  getPasswordStrength(): number {
    const password = this.credentials.password;
    if (!password) return 0;
    
    let strength = 0;
    
    // Length check
    if (password.length >= 8) strength += 25;
    if (password.length >= 12) strength += 15;
    
    // Character variety
    if (/[A-Z]/.test(password)) strength += 20;
    if (/[a-z]/.test(password)) strength += 20;
    if (/[0-9]/.test(password)) strength += 20;
    if (/[^A-Za-z0-9]/.test(password)) strength += 20;
    
    return Math.min(strength, 100);
  }

  getPasswordStrengthText(): string {
    const strength = this.getPasswordStrength();
    if (strength < 40) return 'ضعيفة';
    if (strength < 70) return 'متوسطة';
    if (strength < 90) return 'جيدة';
    return 'قوية جداً';
  }

  changeLanguage(lang: string): void {
    this.language = lang;
    localStorage.setItem('dpbooking_lang', lang);
    this.showSuccessToast(`تم تغيير اللغة إلى ${lang === 'ar' ? 'العربية' : 'الإنجليزية'}`);
  }

  retryLogin(): void {
    this.errorMessage = '';
    this.login();
  }





  copyToClipboard(text: string): void {
    navigator.clipboard.writeText(text).then(() => {
      this.showSuccessToast('تم نسخ النص إلى الحافظة');
    }).catch(err => {
      console.error('Failed to copy: ', err);
      this.showErrorToast('فشل في نسخ النص');
    });
  }

  showSuccessToast(message: string): void {
    this.toastMessage = message;
    this.showToast = true;
    
    setTimeout(() => {
      this.showToast = false;
    }, 3000);
  }

  showErrorToast(message: string): void {
    this.toastMessage = message;
    this.showToast = true;
    
    setTimeout(() => {
      this.showToast = false;
    }, 3000);
  }

  showInfoToast(message: string): void {
    this.toastMessage = message;
    this.showToast = true;
    
    setTimeout(() => {
      this.showToast = false;
    }, 3000);
  }
}