import {
  TicketType,
  TicketStatus,
  TicketCategory,
} from '../../../db/models/Ticket';

export class TicketDto {
  id: number;
  type: TicketType;
  companyId: number;
  assigneeId: number;
  status: TicketStatus;
  category: TicketCategory;
}
