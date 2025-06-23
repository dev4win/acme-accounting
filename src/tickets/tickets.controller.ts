import { Body, Controller, Get, Post } from '@nestjs/common';
import { Company } from '../../db/models/Company';
import { Ticket } from '../../db/models/Ticket';
import { User } from '../../db/models/User';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { TicketDto } from './dto/ticket.dto';
import { TicketsService } from './tickets.service';
import { ResponseWrapper } from '../../src/shared/dto/response-wrapper.dto';

@Controller('api/v1/tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Get()
  async findAll() {
    return await Ticket.findAll({ include: [Company, User] });
  }

  @Post()
  async create(
    @Body() dto: CreateTicketDto,
  ): Promise<ResponseWrapper<TicketDto>> {
    const result = await this.ticketsService.createTicket(dto);
    return new ResponseWrapper(result);
  }
}
