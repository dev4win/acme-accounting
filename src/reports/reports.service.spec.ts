import { ReportsService } from './reports.service';
import * as fsp from 'node:fs/promises';

jest.mock('node:fs/promises');

describe('ReportsService', () => {
  let service: ReportsService;

  beforeEach(() => {
    service = new ReportsService();
    jest.clearAllMocks();
  });

  describe('accounts()', () => {
    it('updates state and metrics on success', async () => {
      (fsp.readdir as jest.Mock).mockResolvedValue(['one.csv']);
      (fsp.readFile as jest.Mock).mockResolvedValue(
        'a,AccountA,,100,20\nb,AccountB,,50,10',
      );
      (fsp.writeFile as jest.Mock).mockResolvedValue(undefined);

      await service.accounts();

      expect(service.state('accounts')).toMatch(/^finished in/);
      const metrics = service.getMetrics().accounts;
      expect(metrics.runs).toBe(1);
      expect(metrics.lastError).toBeNull();
      expect(fsp.writeFile).toHaveBeenCalledWith(
        'out/accounts.csv',
        expect.stringContaining('Account,Balance'),
      );
    });

    it('updates state and metrics on error', async () => {
      (fsp.readdir as jest.Mock).mockRejectedValue(new Error('fail read'));
      await expect(service.accounts()).rejects.toThrow('fail read');
      expect(service.state('accounts')).toBe('failed');
      expect(service.getMetrics().accounts.lastError).toBe('fail read');
    });
  });

  describe('yearly()', () => {
    it('writes yearly report and updates metrics', async () => {
      (fsp.readdir as jest.Mock).mockResolvedValue(['2024.csv']);
      (fsp.readFile as jest.Mock).mockResolvedValue(
        '2024-01-01,Cash,,50,20\n2024-01-02,Cash,,30,10',
      );
      (fsp.writeFile as jest.Mock).mockResolvedValue(undefined);

      await service.yearly();

      expect(service.state('yearly')).toMatch(/^finished in/);
      const metrics = service.getMetrics().yearly;
      expect(metrics.runs).toBe(1);
      expect(metrics.lastError).toBeNull();
      expect(fsp.writeFile).toHaveBeenCalledWith(
        'out/yearly.csv',
        expect.stringContaining('Financial Year,Cash Balance'),
      );
    });

    it('updates state and metrics on error', async () => {
      (fsp.readdir as jest.Mock).mockRejectedValue(new Error('fail yearly'));
      await expect(service.yearly()).rejects.toThrow('fail yearly');
      expect(service.state('yearly')).toBe('failed');
      expect(service.getMetrics().yearly.lastError).toBe('fail yearly');
    });
  });

  describe('fs()', () => {
    it('writes FS report and updates metrics', async () => {
      (fsp.readdir as jest.Mock).mockResolvedValue(['fs1.csv']);
      (fsp.readFile as jest.Mock).mockResolvedValue(
        '2024-01-01,Sales Revenue,,200,0\n2024-01-01,Cost of Goods Sold,,0,50',
      );
      (fsp.writeFile as jest.Mock).mockResolvedValue(undefined);

      await service.fs();

      expect(service.state('fs')).toMatch(/^finished in/);
      const metrics = service.getMetrics().fs;
      expect(metrics.runs).toBe(1);
      expect(metrics.lastError).toBeNull();
      expect(fsp.writeFile).toHaveBeenCalledWith(
        'out/fs.csv',
        expect.stringContaining('Basic Financial Statement'),
      );
    });

    it('updates state and metrics on error', async () => {
      (fsp.readdir as jest.Mock).mockRejectedValue(new Error('fail fs'));
      await expect(service.fs()).rejects.toThrow('fail fs');
      expect(service.state('fs')).toBe('failed');
      expect(service.getMetrics().fs.lastError).toBe('fail fs');
    });
  });

  describe('generateAll()', () => {
    it('runs all reports in background', async () => {
      const spyAccounts = jest
        .spyOn(service, 'accounts')
        .mockResolvedValue(undefined);
      const spyYearly = jest
        .spyOn(service, 'yearly')
        .mockResolvedValue(undefined);
      const spyFs = jest.spyOn(service, 'fs').mockResolvedValue(undefined);

      service.generateAll();

      // Wait a bit for microtasks (background triggers) to run
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(spyAccounts).toHaveBeenCalled();
      expect(spyYearly).toHaveBeenCalled();
      expect(spyFs).toHaveBeenCalled();
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
