import { Test, TestingModule } from '@nestjs/testing';
import { Company } from '../../db/models/Company';
import {
  Ticket,
  TicketCategory,
  TicketStatus,
  TicketType,
} from '../../db/models/Ticket';
import { User, UserRole } from '../../db/models/User';
import { DbModule } from '../db.module';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';
import { TicketAssigneeResolver } from './helpers/ticket-assignee-resolver';
import { Op } from 'sequelize';

describe('TicketsController (integration)', () => {
  let controller: TicketsController;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TicketsController],
      providers: [TicketsService, TicketAssigneeResolver],
      imports: [DbModule],
    }).compile();

    controller = module.get<TicketsController>(TicketsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('returns an array (could be empty)', async () => {
      const result = await controller.findAll();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('create', () => {
    describe('managementReport', () => {
      it('creates managementReport ticket', async () => {
        const company = await Company.create({ name: 'test' });
        const user = await User.create({
          name: 'Test User',
          role: UserRole.accountant,
          companyId: company.id,
        });

        const ticket = await controller.create({
          companyId: company.id,
          type: TicketType.managementReport,
        });

        expect(ticket.data.category).toBe(TicketCategory.accounting);
        expect(ticket.data.assigneeId).toBe(user.id);
        expect(ticket.data.status).toBe(TicketStatus.open);
      });

      it('assigns most recently created accountant', async () => {
        const company = await Company.create({ name: 'test' });
        await User.create({
          name: 'Test User 1',
          role: UserRole.accountant,
          companyId: company.id,
        });
        const user2 = await User.create({
          name: 'Test User 2',
          role: UserRole.accountant,
          companyId: company.id,
        });

        const ticket = await controller.create({
          companyId: company.id,
          type: TicketType.managementReport,
        });

        expect(ticket.data.assigneeId).toBe(user2.id);
      });

      it('throws if there is no accountant', async () => {
        const company = await Company.create({ name: 'test' });

        await expect(
          controller.create({
            companyId: company.id,
            type: TicketType.managementReport,
          }),
        ).rejects.toThrow(/accountant/);
      });
    });

    describe('registrationAddressChange', () => {
      it('creates registrationAddressChange ticket', async () => {
        const company = await Company.create({ name: 'test' });
        const user = await User.create({
          name: 'Test User',
          role: UserRole.corporateSecretary,
          companyId: company.id,
        });

        const ticket = await controller.create({
          companyId: company.id,
          type: TicketType.registrationAddressChange,
        });

        expect(ticket.data.category).toBe(TicketCategory.corporate);
        expect(ticket.data.assigneeId).toBe(user.id);
        expect(ticket.data.status).toBe(TicketStatus.open);
      });

      it('throws if multiple secretaries', async () => {
        const company = await Company.create({ name: 'test' });
        await User.create({
          name: 'Test User 1',
          role: UserRole.corporateSecretary,
          companyId: company.id,
        });
        await User.create({
          name: 'Test User 2',
          role: UserRole.corporateSecretary,
          companyId: company.id,
        });

        await expect(
          controller.create({
            companyId: company.id,
            type: TicketType.registrationAddressChange,
          }),
        ).rejects.toThrow(/Multiple users found with role: corporateSecretary/);
      });

      it('throws if there is no secretary nor director', async () => {
        const company = await Company.create({ name: 'test' });

        await expect(
          controller.create({
            companyId: company.id,
            type: TicketType.registrationAddressChange,
          }),
        ).rejects.toThrow(/No user found with role/);
      });

      it('assigns Director if no secretary exists', async () => {
        const company = await Company.create({ name: 'test' });
        const director = await User.create({
          name: 'Director',
          role: UserRole.director,
          companyId: company.id,
        });

        const ticket = await controller.create({
          companyId: company.id,
          type: TicketType.registrationAddressChange,
        });

        expect(ticket.data.assigneeId).toBe(director.id);
      });

      it('throws if multiple directors as fallback', async () => {
        const company = await Company.create({ name: 'test' });
        await User.create({
          name: 'Director 1',
          role: UserRole.director,
          companyId: company.id,
        });
        await User.create({
          name: 'Director 2',
          role: UserRole.director,
          companyId: company.id,
        });

        await expect(
          controller.create({
            companyId: company.id,
            type: TicketType.registrationAddressChange,
          }),
        ).rejects.toThrow(/Multiple users found with fallback role/);
      });

      it('throws if the company has a ticket of this type', async () => {
        const company = await Company.create({ name: 'test' });
        await Ticket.create({
          companyId: company.id,
          type: TicketType.registrationAddressChange,
          category: TicketCategory.corporate,
          assigneeId: null,
          status: TicketStatus.open,
        });

        await expect(
          controller.create({
            companyId: company.id,
            type: TicketType.registrationAddressChange,
          }),
        ).rejects.toThrow(
          /A registrationAddressChange ticket already exists for company/,
        );
      });
    });

    describe('strikeOff', () => {
      it('throws if multiple directors', async () => {
        const company = await Company.create({ name: 'test' });
        await User.create({
          name: 'Director 1',
          role: UserRole.director,
          companyId: company.id,
        });
        await User.create({
          name: 'Director 2',
          role: UserRole.director,
          companyId: company.id,
        });
        await expect(
          controller.create({
            companyId: company.id,
            type: TicketType.strikeOff,
          }),
        ).rejects.toThrow(/Multiple users found with role: director/);
      });

      it('resolves other open tickets and assigns to Director', async () => {
        const company = await Company.create({ name: 'test' });
        const director = await User.create({
          name: 'Director',
          role: UserRole.director,
          companyId: company.id,
        });

        await Ticket.create({
          companyId: company.id,
          type: TicketType.managementReport,
          assigneeId: director.id,
          category: TicketCategory.accounting,
          status: TicketStatus.open,
        });
        await Ticket.create({
          companyId: company.id,
          type: TicketType.registrationAddressChange,
          assigneeId: director.id,
          category: TicketCategory.corporate,
          status: TicketStatus.open,
        });

        const ticket = await controller.create({
          companyId: company.id,
          type: TicketType.strikeOff,
        });

        expect(ticket.data.category).toBe(TicketCategory.management);
        expect(ticket.data.assigneeId).toBe(director.id);

        const openTickets = await Ticket.findAll({
          where: {
            companyId: company.id,
            status: TicketStatus.open,
            type: { [Op.ne]: TicketType.strikeOff },
          },
        });
        expect(openTickets.length).toBe(0);
      });
    });
  });
});
