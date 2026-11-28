import { HttpStatus, Injectable } from '@nestjs/common';
import type { InviteResult, InviteTeacher, StaffList, StaffMember } from '@blurt/shared/schemas';
import { AuthAdmin, AuthAdminError } from '../auth/auth-admin.js';
import { apiError } from '../common/errors.js';
import { UsersRepository, type UserRecord } from '../users/users.repository.js';

const toStaff = (u: UserRecord): StaffMember => ({
  id: u.id,
  name: u.name,
  email: u.email,
  role: u.role,
});

/** Admin actions (role: ADMIN). Teacher accounts only come from here, never from sign-up. */
@Injectable()
export class AdminService {
  constructor(
    private readonly users: UsersRepository,
    private readonly authAdmin: AuthAdmin,
  ) {}

  async inviteTeacher(body: InviteTeacher): Promise<InviteResult> {
    const email = body.email.toLowerCase();
    const existing = await this.users.findByEmail(email);
    if (existing) {
      if (existing.role !== 'STUDENT')
        return { status: 'already-staff', teacher: toStaff(existing) };
      return {
        status: 'promoted',
        teacher: toStaff(await this.users.setRole(existing.id, 'TEACHER')),
      };
    }

    const name = body.name ?? nameFromEmail(email);
    try {
      const { id } = await this.authAdmin.invite(email);
      const created = await this.users.create({ id, name, email, role: 'TEACHER' });
      return { status: 'invited', teacher: toStaff(created) };
    } catch (e) {
      // A Supabase account without a Blurt! profile yet: give it one, as a teacher.
      if (e instanceof AuthAdminError && e.code === 'email_exists') {
        const id = await this.authAdmin.findIdByEmail(email);
        if (id) {
          const row = (await this.users.create({
            id,
            name,
            email,
            role: 'TEACHER',
          })) satisfies UserRecord;
          const teacher = row.role === 'TEACHER' ? row : await this.users.setRole(id, 'TEACHER');
          return { status: 'promoted', teacher: toStaff(teacher) };
        }
      }
      throw apiError(
        HttpStatus.BAD_GATEWAY,
        'INVITE_FAILED',
        "Couldn't send the invite. Check the email address and try again.",
      );
    }
  }

  async staff(): Promise<StaffList> {
    return { staff: (await this.users.listByRole(['TEACHER', 'ADMIN'])).map(toStaff) };
  }
}

function nameFromEmail(email: string): string {
  const local =
    email
      .split('@')[0]
      ?.replace(/[._-]+/g, ' ')
      .trim() ?? '';
  return local ? local.charAt(0).toUpperCase() + local.slice(1, 60) : 'Teacher';
}
