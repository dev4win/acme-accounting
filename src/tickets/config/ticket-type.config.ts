import { TicketCategory, TicketType } from '../../../db/models/Ticket';
import { UserRole } from '../../../db/models/User';

export interface TicketTypeConfig {
  category: TicketCategory;
  primaryRole: UserRole;
  fallbackRole?: UserRole;
  allowMultiple?: boolean;
  preventDuplicate?: boolean;
}

export const TicketTypeMap: Record<TicketType, TicketTypeConfig> = {
  [TicketType.managementReport]: {
    category: TicketCategory.accounting,
    primaryRole: UserRole.accountant,
    allowMultiple: true,
  },
  [TicketType.registrationAddressChange]: {
    category: TicketCategory.corporate,
    primaryRole: UserRole.corporateSecretary,
    fallbackRole: UserRole.director,
    allowMultiple: false,
    preventDuplicate: true,
  },
  [TicketType.strikeOff]: {
    category: TicketCategory.management,
    primaryRole: UserRole.director,
    allowMultiple: false,
  },
};
