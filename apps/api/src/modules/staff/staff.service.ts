import type { CreateStaffBody, StaffMember } from '@venue/contract';
import { toStaffMember } from './staff.mapper';
import * as repository from './staff.repository';

/** Lists each staff member, ordered by name. */
export function listStaff(): StaffMember[] {
  return repository.listStaffRows().map(toStaffMember);
}

/** Creates an active staff member. The email must be unique without regard to letter case. */
export function createStaff(body: CreateStaffBody): StaffMember {
  const row = repository.insertStaff({ name: body.name, email: body.email, createdAt: new Date().toISOString() });
  return toStaffMember(row);
}
