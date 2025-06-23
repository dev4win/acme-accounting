import { Ticket, TicketStatus, TicketType } from '../../db/models/Ticket';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { TicketDto } from './dto/ticket.dto';
import { ConflictException, Injectable } from '@nestjs/common';
import { Op } from 'sequelize';
import { TicketTypeMap } from './config/ticket-type.config';
import { TicketAssigneeResolver } from './helpers/ticket-assignee-resolver';

@Injectable()
export class TicketsService {
  constructor(private readonly assigneeResolver: TicketAssigneeResolver) {}

  async createTicket(dto: CreateTicketDto): Promise<TicketDto> {
    const { type, companyId } = dto;

    const config = TicketTypeMap[type];
    if (!config) {
      throw new ConflictException(`Unsupported ticket type: ${type}`);
    }

    if (config.preventDuplicate) {
      const existing = await Ticket.findOne({
        where: {
          companyId,
          type,
          status: TicketStatus.open,
        },
      });

      if (existing) {
        throw new ConflictException(
          `A ${type} ticket already exists for company ${companyId}`,
        );
      }
    }

    const assignee = await this.assigneeResolver.resolve(config, companyId);

    if (type === TicketType.strikeOff) {
      await Ticket.update(
        { status: TicketStatus.resolved },
        {
          where: {
            companyId,
            status: TicketStatus.open,
            type: { [Op.not]: TicketType.strikeOff },
          },
        },
      );
    }

    const ticket = await Ticket.create({
      companyId,
      assigneeId: assignee.id,
      category: config.category,
      type,
      status: TicketStatus.open,
    });

    return {
      id: ticket.id,
      type: ticket.type,
      assigneeId: ticket.assigneeId,
      status: ticket.status,
      category: ticket.category,
      companyId: ticket.companyId,
    };
  }
}
