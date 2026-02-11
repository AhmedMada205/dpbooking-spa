import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class PrintService {
  
  printContent(content: string, title: string = 'طباعة'): void {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(content);
      printWindow.document.close();
      
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
        printWindow.close();
      }, 500);
    }
  }

  generateStationPrint(bookings: any[], title: string): void {
    // استدعاء الدالة السابقة
    const content = this.generateStationContent(bookings, title);
    this.printContent(content, title);
  }

  private generateStationContent(bookings: any[], title: string): string {
    // ضع كود الـ station هنا
    return '';
  }
}