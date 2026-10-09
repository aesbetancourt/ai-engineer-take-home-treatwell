# Venue Backoffice

The backoffice a beauty venue uses to run its day: the appointment calendar, its customers and the treatments it offers.

## Language

### Booking

**Venue**:
The salon, spa or barber that uses the backoffice. All local times are in the venue time zone, Europe/Berlin.
_Avoid_: Shop, store, location

**Customer**:
A person the venue books appointments for.
_Avoid_: Client, user, guest

**Treatment**:
A service the venue offers, with a price and a duration.
_Avoid_: Service, product

**Appointment**:
A booking of one customer for one treatment at a start time. It ends when the duration of the treatment is up.
_Avoid_: Booking (as a noun for the record), reservation, slot

**Price**:
The amount in euros copied from the treatment when the appointment is booked. A later change to the treatment does not change it.

**Notes**:
Free text on an appointment for staff only. A customer never sees it.
_Avoid_: Comment, remark

### Status

**Status**:
The state of an appointment: pending, confirmed, completed or cancelled.

**Cancelled**:
The final status of an appointment that will not take place. A cancelled appointment cannot get another status.
_Avoid_: Canceled (the legacy spelling), deleted

### Rules

**Overlap**:
Two appointments of the same customer overlap when one starts before the other ends and ends after the other starts. Cancelled appointments do not count.
_Avoid_: Clash, conflict, collision

**Double-booking**:
A customer with two appointments that overlap. The venue never allows it.

**Back-to-back**:
Two appointments of the same customer where one ends at the instant the other starts. This is not an overlap.

**Reminder**:
The one email a customer gets in the 24 hours before a confirmed appointment.
_Avoid_: Notification, alert

### Staff

**Staff member**:
A person who works at the venue. A staff member is active or inactive, and has an email that is unique without regard to letter case.
_Avoid_: Employee, user, stylist

### Deletion and audit

**Deleted appointment**:
An appointment a staff member removed. It is absent from reads, lists, the summary and the overlap check, and it keeps its audit trail. Deletion is not cancellation.
_Avoid_: Removed, archived, cancelled

**Audit entry**:
A record of one create, update or delete of an appointment, with the time and the changed fields.
_Avoid_: Log line, event, history record

**Audit trail**:
All audit entries of one appointment, oldest first.
_Avoid_: History, changelog

### Legacy data

**Legacy appointment**:
An appointment imported from the previous booking system of the venue. Its start time is recorded in venue time, and its status can use the spelling `canceled`.
_Avoid_: Old appointment, imported row
