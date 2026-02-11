import { Component, OnInit } from '@angular/core';
import { UserService } from '../../services/user.service';

@Component({
  selector: 'app-users',
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.scss']
})
export class UsersComponent implements OnInit {
  users: any[] = [];
  loading = false;
  error = '';
  
  // متغيرات للتقسيم (Pagination)
  currentPage = 1;
  pageSize = 10;
  totalUsers = 0;
  totalPages = 1;

  constructor(private userService: UserService) {}

  ngOnInit(): void {
    this.loadUsers();
  }

 loadUsers(): void {
  this.loading = true;
  this.error = '';

  this.userService.getAllUsers(this.currentPage, this.pageSize)
    .subscribe({
      next: (response) => {
        if (response.success && response.data) {
          // معالجة البيانات المتاحة
          this.users = response.data.map(user => ({
            ...user,
            // تعيين قيم افتراضية للخصائص غير الموجودة
            email: user.email || 'غير محدد',
            phone: user.phone || 'غير محدد',
            isActive: user.isActive !== undefined ? user.isActive : true
          }));
          
          if (response.pagination) {
            this.totalUsers = response.pagination.totalCount;
            this.totalPages = response.pagination.totalPages;
          } else if (response.count) {
            this.totalUsers = response.count;
            this.totalPages = Math.ceil(this.totalUsers / this.pageSize);
          }
        } else {
          this.error = response.message || 'فشل تحميل المستخدمين';
          this.users = [];
        }
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading users:', err);
        this.error = 'حدث خطأ أثناء تحميل المستخدمين';
        this.loading = false;
        this.users = [];
      }
    });
}

  // دالة للبحث
  searchUsers(searchTerm: string): void {
    if (!searchTerm.trim()) {
      this.loadUsers();
      return;
    }

    this.loading = true;
    this.userService.searchUsers(searchTerm)
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.users = response.data;
            this.totalUsers = response.data.length;
            this.totalPages = 1;
            this.currentPage = 1;
          } else {
            this.error = response.message || 'فشل البحث';
          }
          this.loading = false;
        },
        error: (err) => {
          this.error = err.message || 'حدث خطأ أثناء البحث';
          this.loading = false;
        }
      });
  }

  // دوال التقسيم
  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.loadUsers();
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadUsers();
    }
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.loadUsers();
    }
  }

  // // تحديث حالة المستخدم
  // toggleUserStatus(user: any): void {
  //   if (confirm(`هل تريد ${user.isActive ? 'تعطيل' : 'تفعيل'} المستخدم ${user.userName}؟`)) {
  //     this.userService.updateUserStatus(user.id, !user.isActive)
  //       .subscribe({
  //         next: (response) => {
  //           if (response.success) {
  //             alert('تم تحديث حالة المستخدم بنجاح');
  //             this.loadUsers(); // إعادة تحميل القائمة
  //           } else {
  //             alert(response.message || 'فشل تحديث الحالة');
  //           }
  //         },
  //         error: (err) => {
  //           alert(err.message || 'حدث خطأ أثناء التحديث');
  //         }
  //       });
  //   }
  // }

  // حذف مستخدم
  deleteUser(user: any): void {
    if (confirm(`هل أنت متأكد من حذف المستخدم ${user.userName}؟`)) {
      this.userService.deleteUser(user.id)
        .subscribe({
          next: (response) => {
            if (response.success) {
              alert('تم حذف المستخدم بنجاح');
              this.loadUsers(); // إعادة تحميل القائمة
            } else {
              alert(response.message || 'فشل حذف المستخدم');
            }
          },
          error: (err) => {
            alert(err.message || 'حدث خطأ أثناء الحذف');
          }
        });
    }


    
  }

  // دالة لإنشاء أرقام الصفحات المعروضة
getPageNumbers(): number[] {
  const pages: number[] = [];
  const maxPagesToShow = 5;
  
  if (this.totalPages <= maxPagesToShow) {
    // إذا كان إجمالي الصفحات أقل من أو يساوي 5، اعرض كل الصفحات
    for (let i = 1; i <= this.totalPages; i++) {
      pages.push(i);
    }
  } else {
    // اعرض مجموعة من الصفحات حول الصفحة الحالية
    let startPage = Math.max(1, this.currentPage - 2);
    let endPage = Math.min(this.totalPages, this.currentPage + 2);
    
    // تأكد من عرض 5 صفحات دائماً
    if (endPage - startPage < 4) {
      if (startPage === 1) {
        endPage = Math.min(this.totalPages, startPage + 4);
      } else if (endPage === this.totalPages) {
        startPage = Math.max(1, endPage - 4);
      }
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
  }
  
  return pages;
}
}