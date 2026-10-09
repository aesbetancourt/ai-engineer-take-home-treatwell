import { sendEmail } from '../mailer';
import { toUtcStart } from '../modules/appointments/appointments.mapper';
import * as repository from '../modules/appointments/appointments.repository';

const EVERY_MINUTE = 60 * 1000;
const DAY = 24 * 60 * 60 * 1000;

type SendEmail = typeof sendEmail;

/** Emails the customer once, during the 24 hours before a confirmed appointment. */
export async function sendDueReminders(send: SendEmail = sendEmail, now: number = Date.now()) {
  for (const { appointment, customer, treatment } of repository.listConfirmedAppointmentRowsWithoutReminder()) {
    const startsIn = new Date(toUtcStart(appointment)).getTime() - now;
    if (startsIn < 0 || startsIn > DAY) continue;
    // Each replica runs this job. The claim comes before the email, so only one replica sends it (ADR 0001).
    if (!repository.claimReminder(appointment.id, now)) continue;

    await send(
      customer.email,
      'See you tomorrow',
      'Hi ' + customer.name + ', this is a reminder of your ' + treatment.name + ' on ' + new Date(appointment.startsAt).toLocaleString()
    );
  }
}

export function startReminderJob() {
  setInterval(() => {
    sendDueReminders().catch((e) => console.log('reminders failed', e));
  }, EVERY_MINUTE);
}
