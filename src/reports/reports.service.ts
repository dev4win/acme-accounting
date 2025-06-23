import { Injectable, Logger } from '@nestjs/common';
import fs from 'fs';
import path from 'path';
import { performance } from 'perf_hooks';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  private states = {
    accounts: 'idle',
    yearly: 'idle',
    fs: 'idle',
  };

  private readonly metrics = {
    accounts: {
      lastDuration: 0,
      lastRunAt: null as null | Date,
      runs: 0,
      lastError: null as null | string,
    },
    yearly: {
      lastDuration: 0,
      lastRunAt: null as null | Date,
      runs: 0,
      lastError: null as null | string,
    },
    fs: {
      lastDuration: 0,
      lastRunAt: null as null | Date,
      runs: 0,
      lastError: null as null | string,
    },
  };

  state(scope: keyof ReportsService['states']): string {
    return this.states[scope];
  }

  generateAll() {
    this.runAsync(() => this.accounts(), 'accounts');
    this.runAsync(() => this.yearly(), 'yearly');
    this.runAsync(() => this.fs(), 'fs');
  }

  getMetrics() {
    return {
      accounts: {
        ...this.metrics.accounts,
        lastRunAt: this.metrics.accounts.lastRunAt
          ? this.metrics.accounts.lastRunAt.toISOString()
          : null,
      },
      yearly: {
        ...this.metrics.yearly,
        lastRunAt: this.metrics.yearly.lastRunAt
          ? this.metrics.yearly.lastRunAt.toISOString()
          : null,
      },
      fs: {
        ...this.metrics.fs,
        lastRunAt: this.metrics.fs.lastRunAt
          ? this.metrics.fs.lastRunAt.toISOString()
          : null,
      },
    };
  }

  private runAsync(fn: () => void, scope: keyof ReportsService['states']) {
    setTimeout(() => {
      try {
        fn();
      } catch (err) {
        this.states[scope] = 'failed';
        if (err instanceof Error) {
          this.logger.error(
            `Failed to generate '${scope}' report: ${err.message}`,
            err.stack,
          );
        } else {
          this.logger.error(
            `Unknown error generating '${scope}' report: ${JSON.stringify(err)}`,
          );
        }
      }
    }, 0);
  }

  accounts() {
    try {
      this.states.accounts = 'starting';
      const start = performance.now();
      const accountBalances = this.calculateAccountBalances('tmp');
      this.writeAccountsReport('out/accounts.csv', accountBalances);

      const duration = performance.now() - start;
      this.metrics.accounts.lastDuration = duration;
      this.metrics.accounts.lastRunAt = new Date();
      this.metrics.accounts.runs += 1;
      this.metrics.accounts.lastError = null;

      this.states.accounts = `finished in ${((performance.now() - start) / 1000).toFixed(2)}`;
    } catch (err) {
      this.metrics.accounts.lastError =
        err instanceof Error ? err.message : String(err);
      this.states.accounts = 'failed';
      this.logError('accounts', err);
      throw err;
    }
  }

  private calculateAccountBalances(tmpDir: string): Record<string, number> {
    const accountBalances: Record<string, number> = {};
    fs.readdirSync(tmpDir).forEach((file) => {
      if (file.endsWith('.csv')) {
        const lines = this.readCsvLines(path.join(tmpDir, file));
        for (const line of lines) {
          const [, account, , debit, credit] = line.split(',');
          if (!accountBalances[account]) {
            accountBalances[account] = 0;
          }
          accountBalances[account] +=
            parseFloat(debit || '0') - parseFloat(credit || '0');
        }
      }
    });
    return accountBalances;
  }

  private writeAccountsReport(
    outputFile: string,
    accountBalances: Record<string, number>,
  ) {
    const output = ['Account,Balance'];
    for (const [account, balance] of Object.entries(accountBalances)) {
      output.push(`${account},${balance.toFixed(2)}`);
    }
    fs.writeFileSync(outputFile, output.join('\n'));
  }

  private readCsvLines(filepath: string): string[] {
    return fs.readFileSync(filepath, 'utf-8').trim().split('\n');
  }

  yearly() {
    try {
      this.states.yearly = 'starting';
      const start = performance.now();
      const cashByYear = this.calculateYearlyCash('tmp');
      this.writeYearlyReport('out/yearly.csv', cashByYear);

      const duration = performance.now() - start;
      this.metrics.yearly.lastDuration = duration;
      this.metrics.yearly.lastRunAt = new Date();
      this.metrics.yearly.runs += 1;
      this.metrics.yearly.lastError = null;

      this.states.yearly = `finished in ${((performance.now() - start) / 1000).toFixed(2)}`;
    } catch (err) {
      this.metrics.yearly.lastError =
        err instanceof Error ? err.message : String(err);
      this.states.yearly = 'failed';
      this.logError('yearly', err);
      throw err;
    }
  }

  private calculateYearlyCash(tmpDir: string): Record<string, number> {
    const cashByYear: Record<string, number> = {};
    fs.readdirSync(tmpDir).forEach((file) => {
      if (file.endsWith('.csv') && file !== 'yearly.csv') {
        const lines = this.readCsvLines(path.join(tmpDir, file));
        for (const line of lines) {
          const [date, account, , debit, credit] = line.split(',');
          if (account === 'Cash') {
            const year = new Date(date).getFullYear();
            if (!cashByYear[year]) {
              cashByYear[year] = 0;
            }
            cashByYear[year] +=
              parseFloat(debit || '0') - parseFloat(credit || '0');
          }
        }
      }
    });
    return cashByYear;
  }

  private writeYearlyReport(
    outputFile: string,
    cashByYear: Record<string, number>,
  ) {
    const output = ['Financial Year,Cash Balance'];
    Object.keys(cashByYear)
      .sort()
      .forEach((year) => {
        output.push(`${year},${cashByYear[year].toFixed(2)}`);
      });
    fs.writeFileSync(outputFile, output.join('\n'));
  }

  fs() {
    try {
      this.states.fs = 'starting';
      const start = performance.now();
      const balances = this.calculateFsBalances('tmp');
      this.writeFsReport('out/fs.csv', balances);

      const duration = performance.now() - start;
      this.metrics.fs.lastDuration = duration;
      this.metrics.fs.lastRunAt = new Date();
      this.metrics.fs.runs += 1;
      this.metrics.fs.lastError = null;

      this.states.fs = `finished in ${((performance.now() - start) / 1000).toFixed(2)}`;
    } catch (err) {
      this.metrics.fs.lastError =
        err instanceof Error ? err.message : String(err);
      this.states.fs = 'failed';
      this.logError('fs', err);
      throw err;
    }
  }

  private calculateFsBalances(tmpDir: string): Record<string, number> {
    const categories = this.getFsCategories();
    const balances: Record<string, number> = {};
    for (const section of Object.values(categories)) {
      for (const group of Object.values(section)) {
        for (const account of group) {
          balances[account] = 0;
        }
      }
    }
    fs.readdirSync(tmpDir).forEach((file) => {
      if (file.endsWith('.csv') && file !== 'fs.csv') {
        const lines = this.readCsvLines(path.join(tmpDir, file));
        for (const line of lines) {
          const [, account, , debit, credit] = line.split(',');
          if (balances.hasOwnProperty(account)) {
            balances[account] +=
              parseFloat(debit || '0') - parseFloat(credit || '0');
          }
        }
      }
    });
    return balances;
  }

  private writeFsReport(outputFile: string, balances: Record<string, number>) {
    const categories = this.getFsCategories();
    const output: string[] = [];
    output.push('Basic Financial Statement');
    output.push('');
    output.push('Income Statement');
    let totalRevenue = 0;
    let totalExpenses = 0;
    for (const account of categories['Income Statement']['Revenues']) {
      const value = balances[account] || 0;
      output.push(`${account},${value.toFixed(2)}`);
      totalRevenue += value;
    }
    for (const account of categories['Income Statement']['Expenses']) {
      const value = balances[account] || 0;
      output.push(`${account},${value.toFixed(2)}`);
      totalExpenses += value;
    }
    output.push(`Net Income,${(totalRevenue - totalExpenses).toFixed(2)}`);
    output.push('');
    output.push('Balance Sheet');
    let totalAssets = 0;
    let totalLiabilities = 0;
    let totalEquity = 0;
    output.push('Assets');
    for (const account of categories['Balance Sheet']['Assets']) {
      const value = balances[account] || 0;
      output.push(`${account},${value.toFixed(2)}`);
      totalAssets += value;
    }
    output.push(`Total Assets,${totalAssets.toFixed(2)}`);
    output.push('');
    output.push('Liabilities');
    for (const account of categories['Balance Sheet']['Liabilities']) {
      const value = balances[account] || 0;
      output.push(`${account},${value.toFixed(2)}`);
      totalLiabilities += value;
    }
    output.push(`Total Liabilities,${totalLiabilities.toFixed(2)}`);
    output.push('');
    output.push('Equity');
    for (const account of categories['Balance Sheet']['Equity']) {
      const value = balances[account] || 0;
      output.push(`${account},${value.toFixed(2)}`);
      totalEquity += value;
    }
    output.push(
      `Retained Earnings (Net Income),${(totalRevenue - totalExpenses).toFixed(2)}`,
    );
    totalEquity += totalRevenue - totalExpenses;
    output.push(`Total Equity,${totalEquity.toFixed(2)}`);
    output.push('');
    output.push(
      `Assets = Liabilities + Equity, ${totalAssets.toFixed(2)} = ${(totalLiabilities + totalEquity).toFixed(2)}`,
    );
    fs.writeFileSync(outputFile, output.join('\n'));
  }

  private getFsCategories() {
    return {
      'Income Statement': {
        Revenues: ['Sales Revenue'],
        Expenses: [
          'Cost of Goods Sold',
          'Salaries Expense',
          'Rent Expense',
          'Utilities Expense',
          'Interest Expense',
          'Tax Expense',
        ],
      },
      'Balance Sheet': {
        Assets: [
          'Cash',
          'Accounts Receivable',
          'Inventory',
          'Fixed Assets',
          'Prepaid Expenses',
        ],
        Liabilities: [
          'Accounts Payable',
          'Loan Payable',
          'Sales Tax Payable',
          'Accrued Liabilities',
          'Unearned Revenue',
          'Dividends Payable',
        ],
        Equity: ['Common Stock', 'Retained Earnings'],
      },
    };
  }

  private logError(scope: string, err: unknown) {
    if (err instanceof Error) {
      this.logger.error(
        `Error generating ${scope} report: ${err.message}`,
        err.stack,
      );
    } else {
      this.logger.error(
        `Unknown error generating ${scope} report: ${JSON.stringify(err)}`,
      );
    }
  }
}
