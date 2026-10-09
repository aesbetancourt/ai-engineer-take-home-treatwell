import type { CreateStaffBody, StaffMember, UpdateStaffBody } from '@venue/contract';
import { NotFoundError } from '../../shared/errors';
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

/** Returns one staff member. An unknown id is a not-found error. */
export function getStaffMember(id: number): StaffMember {
  const row = repository.findStaffRow(id);
  if (!row) {
    throw new NotFoundError('Staff member not found');
  }
  return toStaffMember(row);
}

/** Changes the name, the email or the active flag of a staff member. The email must stay unique. */
export function updateStaff(id: number, body: UpdateStaffBody): StaffMember {
  const row = repository.updateStaff(id, body);
  if (!row) {
    throw new NotFoundError('Staff member not found');
  }
  return toStaffMember(row);
}
