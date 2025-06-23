import { TicketType } from '../../../db/models/Ticket';
import { IsEnum, IsInt } from 'class-validator';

export class CreateTicketDto {
  @IsEnum(TicketType)
  type: TicketType;

  @IsInt()
  companyId: number;
}
