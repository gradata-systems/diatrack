import { TestBed } from '@angular/core/testing';

import { BglStatsService } from './bgl-stats.service';

describe('BglStatsService', () => {
  let service: BglStatsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BglStatsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
