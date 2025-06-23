import { ReportsService } from './reports.service';
import fs from 'fs';

jest.mock('fs');

describe('ReportsService', () => {
  let service: ReportsService;

  beforeEach(() => {
    service = new ReportsService();
    jest.clearAllMocks();
  });

  describe('accounts()', () => {
    it('updates state and metrics on success', () => {
      (fs.readdirSync as jest.Mock).mockReturnValue(['one.csv']);
      (fs.readFileSync as jest.Mock).mockReturnValue(
        'a,AccountA,,100,20\nb,AccountB,,50,10',
      );
      (fs.writeFileSync as jest.Mock).mockImplementation(() => {});

      service.accounts();

      expect(service.state('accounts')).toMatch(/^finished in/);
      const metrics = service.getMetrics().accounts;
      expect(metrics.runs).toBe(1);
      expect(metrics.lastError).toBeNull();
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        'out/accounts.csv',
        expect.stringContaining('Account,Balance'),
      );
    });

    it('updates state and metrics on error', () => {
      (fs.readdirSync as jest.Mock).mockImplementation(() => {
        throw new Error('fail read');
      });
      expect(() => service.accounts()).toThrow('fail read');
      expect(service.state('accounts')).toBe('failed');
      expect(service.getMetrics().accounts.lastError).toBe('fail read');
    });
  });

  describe('yearly()', () => {
    it('writes yearly report and updates metrics', () => {
      (fs.readdirSync as jest.Mock).mockReturnValue(['yearly.csv']);
      (fs.readFileSync as jest.Mock).mockReturnValue(
        '2024-01-01,Cash,,50,20\n2024-01-02,Cash,,30,10',
      );
      (fs.writeFileSync as jest.Mock).mockImplementation(() => {});

      service.yearly();

      expect(service.state('yearly')).toMatch(/^finished in/);
      const metrics = service.getMetrics().yearly;
      expect(metrics.runs).toBe(1);
      expect(metrics.lastError).toBeNull();
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        'out/yearly.csv',
        expect.stringContaining('Financial Year,Cash Balance'),
      );
    });

    it('updates state and metrics on error', () => {
      (fs.readdirSync as jest.Mock).mockImplementation(() => {
        throw new Error('fail yearly');
      });
      expect(() => service.yearly()).toThrow('fail yearly');
      expect(service.state('yearly')).toBe('failed');
      expect(service.getMetrics().yearly.lastError).toBe('fail yearly');
    });
  });

  describe('fs()', () => {
    it('writes FS report and updates metrics', () => {
      (fs.readdirSync as jest.Mock).mockReturnValue(['fs1.csv']);
      (fs.readFileSync as jest.Mock).mockReturnValue(
        '2024-01-01,Sales Revenue,,200,0\n2024-01-01,Cost of Goods Sold,,0,50',
      );
      (fs.writeFileSync as jest.Mock).mockImplementation(() => {});

      service.fs();

      expect(service.state('fs')).toMatch(/^finished in/);
      const metrics = service.getMetrics().fs;
      expect(metrics.runs).toBe(1);
      expect(metrics.lastError).toBeNull();
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        'out/fs.csv',
        expect.stringContaining('Basic Financial Statement'),
      );
    });

    it('updates state and metrics on error', () => {
      (fs.readdirSync as jest.Mock).mockImplementation(() => {
        throw new Error('fail fs');
      });
      expect(() => service.fs()).toThrow('fail fs');
      expect(service.state('fs')).toBe('failed');
      expect(service.getMetrics().fs.lastError).toBe('fail fs');
    });
  });

  describe('generateAll()', () => {
    it('runs all reports in background (calls runAsync)', (done) => {
      const spyAccounts = jest.spyOn(service, 'accounts');
      const spyYearly = jest.spyOn(service, 'yearly');
      const spyFs = jest.spyOn(service, 'fs');
      service.generateAll();
      setTimeout(() => {
        expect(spyAccounts).toHaveBeenCalled();
        expect(spyYearly).toHaveBeenCalled();
        expect(spyFs).toHaveBeenCalled();
        done();
      }, 10);
    });
  });

  describe('getMetrics()', () => {
    it('returns metrics with lastRunAt as ISO string or null', () => {
      const metrics = service.getMetrics();
      expect(metrics.accounts).toHaveProperty('lastRunAt');
      expect([null, expect.stringMatching(/\d{4}-\d{2}-\d{2}T/)]).toContain(
        metrics.accounts.lastRunAt,
      );
    });
  });
});
