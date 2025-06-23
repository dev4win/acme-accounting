import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

describe('ReportsController', () => {
  let app: INestApplication;
  let reportsService: ReportsService;

  beforeAll(async () => {
    const serviceMock = {
      state: jest.fn((scope: string) => `${scope}-state`),
      getMetrics: jest.fn().mockReturnValue({
        accounts: { lastDuration: 123, runs: 2, lastError: null },
        yearly: { lastDuration: 222, runs: 1, lastError: 'fail' },
        fs: { lastDuration: 0, runs: 0, lastError: null },
      }),
      generateAll: jest.fn(),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [ReportsController],
      providers: [{ provide: ReportsService, useValue: serviceMock }],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    reportsService = moduleFixture.get<ReportsService>(ReportsService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/v1/reports should return current report states', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/reports');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      'accounts.csv': 'accounts-state',
      'yearly.csv': 'yearly-state',
      'fs.csv': 'fs-state',
    });
    expect(reportsService.state).toHaveBeenCalledWith('accounts');
    expect(reportsService.state).toHaveBeenCalledWith('yearly');
    expect(reportsService.state).toHaveBeenCalledWith('fs');
  });

  it('GET /api/v1/reports/metrics should return metrics', async () => {
    const res = await request(app.getHttpServer()).get(
      '/api/v1/reports/metrics',
    );
    expect(res.status).toBe(200);
    expect(res.body.accounts.lastDuration).toBe(123);
    expect(res.body.yearly.lastError).toBe('fail');
    expect(res.body.fs.runs).toBe(0);
  });

  it('POST /api/v1/reports should trigger background report generation', async () => {
    const res = await request(app.getHttpServer()).post('/api/v1/reports');
    expect(res.status).toBe(202);
    expect(res.body).toEqual({
      message: 'Report generation started in background',
    });
    expect(reportsService.generateAll).toHaveBeenCalled();
  });
});
