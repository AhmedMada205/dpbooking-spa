import { TestBed } from '@angular/core/testing';

import { ReportprintService } from './reportprint.service';

describe('ReportprintService', () => {
  let service: ReportprintService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ReportprintService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
