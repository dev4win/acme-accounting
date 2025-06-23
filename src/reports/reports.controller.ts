import { Controller, Get, Post, HttpCode } from '@nestjs/common';
import { ReportsService } from './reports.service';

@Controller('api/v1/reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get()
  report() {
    return {
      'accounts.csv': this.reportsService.state('accounts'),
      'yearly.csv': this.reportsService.state('yearly'),
      'fs.csv': this.reportsService.state('fs'),
    };
  }

  @Get('metrics')
  metrics() {
    return this.reportsService.getMetrics();
  }

  @Post()
  @HttpCode(202) // Use 202 Accepted to indicate async processing
  generate() {
    this.reportsService.generateAll();
    return { message: 'Report generation started in background' };
  }
}
