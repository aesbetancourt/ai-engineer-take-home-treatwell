import type { StaffMember } from '@venue/contract';
import type { StaffRow } from './staff.repository';

export function toStaffMember(row: StaffRow): StaffMember {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    active: row.active,
    createdAt: row.createdAt,
  };
}
