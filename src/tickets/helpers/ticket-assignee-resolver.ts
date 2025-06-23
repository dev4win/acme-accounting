import { ConflictException, Injectable } from '@nestjs/common';
import { User } from '../../../db/models/User';
import { TicketTypeConfig } from '../config/ticket-type.config';

@Injectable()
export class TicketAssigneeResolver {
  async resolve(config: TicketTypeConfig, companyId: number): Promise<User> {
    const assignees = await this.findUsers(companyId, config.primaryRole);

    if (assignees.length === 0 && config.fallbackRole) {
      return this.resolveFromFallback(companyId, config);
    }

    this.assertValidAssignees(
      assignees,
      config.primaryRole,
      config.allowMultiple,
    );
    return assignees[0];
  }

  private async findUsers(companyId: number, role: string): Promise<User[]> {
    return await User.findAll({
      where: { companyId, role },
      order: [['createdAt', 'DESC']],
    });
  }

  private async resolveFromFallback(
    companyId: number,
    config: TicketTypeConfig,
  ): Promise<User> {
    const fallbackUsers = await this.findUsers(companyId, config.fallbackRole!);

    if (fallbackUsers.length === 0) {
      throw new ConflictException(
        `No user found with role: ${config.primaryRole} or fallback: ${config.fallbackRole}`,
      );
    }

    if (fallbackUsers.length > 1) {
      throw new ConflictException(
        `Multiple users found with fallback role: ${config.fallbackRole}`,
      );
    }

    return fallbackUsers[0];
  }

  private assertValidAssignees(
    assignees: User[],
    role: string,
    allowMultiple = true,
  ): void {
    if (assignees.length === 0) {
      throw new ConflictException(`No user found with role: ${role}`);
    }

    if (!allowMultiple && assignees.length > 1) {
      throw new ConflictException(
        `Multiple users found with role: ${role}. Cannot assign.`,
      );
    }
  }
}
