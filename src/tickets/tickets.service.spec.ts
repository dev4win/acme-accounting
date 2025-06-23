import { TicketsService } from './tickets.service';
import { Ticket, TicketStatus, TicketType } from '../../db/models/Ticket';
import { TicketAssigneeResolver } from './helpers/ticket-assignee-resolver';

jest.mock('../../db/models/Ticket');
const TicketMock = Ticket as jest.Mocked<typeof Ticket>;

describe('TicketsService', () => {
  let service: TicketsService;
  let resolver: TicketAssigneeResolver;

  beforeEach(() => {
    resolver = {
      resolve: jest.fn(),
    } as unknown as jest.Mocked<TicketAssigneeResolver>;
    service = new TicketsService(resolver);
    jest.clearAllMocks();
  });

  it('should throw if unsupported ticket type', async () => {
    await expect(
      service.createTicket({ type: 'somethingElse' as any, companyId: 9004 }),
    ).rejects.toThrow('Unsupported ticket type');
  });

  it('should throw if duplicate ticket exists', async () => {
    TicketMock.findOne = jest.fn().mockResolvedValue({ id: 9001 });
    await expect(
      service.createTicket({
        type: TicketType.registrationAddressChange,
        companyId: 9001,
      }),
    ).rejects.toThrow('already exists');
  });

  it('should assign user from resolver and create ticket', async () => {
    (resolver.resolve as jest.Mock).mockResolvedValue({ id: 9002 });
    TicketMock.findOne = jest.fn().mockResolvedValue(null);
    TicketMock.create = jest.fn().mockResolvedValue({
      id: 5,
      type: TicketType.managementReport,
      assigneeId: 9002,
      status: TicketStatus.open,
      category: 'accounting',
      companyId: 1,
    });

    const result = await service.createTicket({
      type: TicketType.managementReport,
      companyId: 1,
    });

    expect(resolver.resolve).toHaveBeenCalled();
    expect(result.assigneeId).toBe(9002);
    expect(TicketMock.create).toHaveBeenCalled();
  });

  it('should resolve open tickets on strikeOff', async () => {
    (resolver.resolve as jest.Mock).mockResolvedValue({ id: 9003 });
    TicketMock.findOne = jest.fn().mockResolvedValue(null);
    TicketMock.update = jest.fn().mockResolvedValue([1]);
    TicketMock.create = jest.fn().mockResolvedValue({
      id: 8,
      type: TicketType.strikeOff,
      assigneeId: 9003,
      status: TicketStatus.open,
      category: 'management',
      companyId: 2,
    });

    const result = await service.createTicket({
      type: TicketType.strikeOff,
      companyId: 2,
    });

    expect(TicketMock.update).toHaveBeenCalledWith(
      { status: TicketStatus.resolved },
      expect.objectContaining({
        where: expect.objectContaining({
          companyId: 2,
          status: TicketStatus.open,
        }),
      }),
    );
    expect(result.assigneeId).toBe(9003);
    expect(result.type).toBe(TicketType.strikeOff);
  });
});
