import { TicketAssigneeResolver } from './ticket-assignee-resolver';
import { User, UserRole } from '../../../db/models/User';
import { TicketTypeConfig } from '../config/ticket-type.config';
import { TicketCategory } from '../../../db/models/Ticket';

jest.mock('../../../db/models/User');
const UserMock = User as jest.Mocked<typeof User>;

describe('TicketAssigneeResolver', () => {
  let resolver: TicketAssigneeResolver;

  beforeEach(() => {
    resolver = new TicketAssigneeResolver();
    jest.clearAllMocks();
  });

  it('returns the latest user if available', async () => {
    UserMock.findAll = jest.fn().mockResolvedValue([
      { id: 2, name: 'B', createdAt: new Date('2024-06-22') },
      { id: 1, name: 'A', createdAt: new Date('2024-06-21') },
    ] as any);
    const config: TicketTypeConfig = {
      primaryRole: UserRole.accountant,
      category: TicketCategory.accounting,
      allowMultiple: true,
    };
    const user = await resolver.resolve(config, 1);
    expect(user.id).toBe(2);
    expect(UserMock.findAll).toHaveBeenCalledWith({
      where: { companyId: 1, role: UserRole.accountant },
      order: [['createdAt', 'DESC']],
    });
  });

  it('throws if no users found and no fallback', async () => {
    UserMock.findAll = jest.fn().mockResolvedValue([]);
    const config: TicketTypeConfig = {
      primaryRole: UserRole.accountant,
      category: TicketCategory.accounting,
      allowMultiple: true,
    };
    await expect(resolver.resolve(config, 1)).rejects.toThrow(
      /No user found with role: accountant/,
    );
  });

  it('calls fallback and returns if fallback user found', async () => {
    UserMock.findAll = jest
      .fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 42, name: 'Director' }] as any);
    const config: TicketTypeConfig = {
      primaryRole: UserRole.corporateSecretary,
      fallbackRole: UserRole.director,
      category: TicketCategory.corporate,
      allowMultiple: false,
    };
    const user = await resolver.resolve(config, 123);
    expect(user.id).toBe(42);
    expect(() => UserMock.findAll).not.toThrow();
    expect(UserMock.findAll).toHaveBeenNthCalledWith(1, {
      where: { companyId: 123, role: 'corporateSecretary' },
      order: [['createdAt', 'DESC']],
    });
    expect(UserMock.findAll).toHaveBeenNthCalledWith(2, {
      where: { companyId: 123, role: 'director' },
      order: [['createdAt', 'DESC']],
    });
  });

  it('throws if multiple users found and allowMultiple is false', async () => {
    UserMock.findAll = jest
      .fn()
      .mockResolvedValue([{ id: 1 }, { id: 2 }] as any);
    const config: TicketTypeConfig = {
      primaryRole: UserRole.corporateSecretary,
      category: TicketCategory.corporate,
      allowMultiple: false,
    };
    await expect(resolver.resolve(config, 1)).rejects.toThrow(
      /Multiple users found with role: corporateSecretary/,
    );
  });

  it('throws if fallback users is empty', async () => {
    UserMock.findAll = jest
      .fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    const config: TicketTypeConfig = {
      primaryRole: UserRole.corporateSecretary,
      fallbackRole: UserRole.director,
      category: TicketCategory.corporate,
      allowMultiple: false,
    };
    await expect(resolver.resolve(config, 1)).rejects.toThrow(
      /No user found with role: corporateSecretary or fallback: director/,
    );
  });

  it('throws if multiple fallback users', async () => {
    UserMock.findAll = jest
      .fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 1 }, { id: 2 }] as any);
    const config: TicketTypeConfig = {
      primaryRole: UserRole.corporateSecretary,
      fallbackRole: UserRole.director,
      category: TicketCategory.corporate,
      allowMultiple: false,
    };
    await expect(resolver.resolve(config, 1)).rejects.toThrow(
      /Multiple users found with fallback role: director/,
    );
  });
});
