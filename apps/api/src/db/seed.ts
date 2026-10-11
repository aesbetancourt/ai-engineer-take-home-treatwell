import { db } from './index';
import { appointmentAudit, appointments, customers, staff, treatments } from './schema';

const day = (n: number) => `2026-10-${String(n).padStart(2, '0')}`;
const created = 1759300000000;

export function seed() {
  // The seed gives the appointments their ids again, so each audit trail from before the seed must go.
  db.delete(appointmentAudit).run();
  // The seed replaces all data. Staff members have no sample data, so the table is empty after it.
  db.delete(staff).run();
  db.delete(appointments).run();
  db.delete(customers).run();
  db.delete(treatments).run();

  db.insert(customers)
    .values([
      { id: 1, name: 'Emma Schneider', email: 'emma.schneider@example.com', phone: '+49 30 5550101', createdAt: '2026-03-02T10:15:00.000Z' },
      { id: 2, name: 'Luca Romano', email: 'luca.romano@example.com', phone: '+39 06 5550102', createdAt: '2026-03-14T08:40:00.000Z' },
      { id: 3, name: 'Sophie Martin', email: 'sophie.martin@example.com', phone: '+33 1 5550103', createdAt: '2026-04-01T13:05:00.000Z' },
      { id: 4, name: 'Jonas Weber', email: 'jonas.weber@example.com', phone: null, createdAt: '2026-04-19T16:30:00.000Z' },
      { id: 5, name: 'Amira Haddad', email: 'amira.haddad@example.com', phone: '+44 20 5550105', createdAt: '2026-05-07T09:00:00.000Z' },
      { id: 6, name: 'Noah Jansen', email: 'noah.jansen@example.com', phone: '+31 20 5550106', createdAt: '2026-05-21T11:45:00.000Z' },
      { id: 7, name: 'Isabel Costa', email: 'isabel.costa@example.com', phone: '+34 91 5550107', createdAt: '2026-06-11T15:20:00.000Z' },
      { id: 8, name: 'Mia Kowalski', email: 'mia.kowalski@example.com', phone: '+48 22 5550108', createdAt: '2026-07-03T12:10:00.000Z' },
    ])
    .run();

  db.insert(treatments)
    .values([
      { id: 1, name: "Women's Cut & Blow-dry", category: 'Hair', price: 54.9, durationMin: 60 },
      { id: 2, name: "Men's Haircut", category: 'Hair', price: 29, durationMin: 30 },
      { id: 3, name: 'Root Colour', category: 'Hair', price: 64.5, durationMin: 90 },
      { id: 4, name: 'Gel Manicure', category: 'Nails', price: 39.99, durationMin: 45 },
      { id: 5, name: 'Classic Pedicure', category: 'Nails', price: 35, durationMin: 50 },
      { id: 6, name: 'Deep Tissue Massage', category: 'Massage', price: 79.9, durationMin: 60 },
      { id: 7, name: 'Eyebrow Shape & Tint', category: 'Brows & Lashes', price: 19.99, durationMin: 20 },
      { id: 8, name: 'Hydrating Facial', category: 'Facial', price: 59, durationMin: 60 },
    ])
    .run();

  // Rows imported from the old booking system use 'YYYY-MM-DD HH:mm' and 'canceled'.
  db.insert(appointments)
    .values([
      { id: 1, customerId: 1, treatmentId: 1, startsAt: `${day(5)}T09:00:00.000Z`, status: 'confirmed', price: 49.9, notes: 'Prefers stylist Anna', createdAt: created },
      { id: 2, customerId: 2, treatmentId: 2, startsAt: `${day(5)}T10:00:00.000Z`, status: 'confirmed', price: 29, notes: null, createdAt: created + 1000 },
      { id: 3, customerId: 3, treatmentId: 4, startsAt: `${day(5)}T11:00:00.000Z`, status: 'pending', price: 39.99, notes: 'First visit, nervous about gel', createdAt: created + 2000 },
      { id: 4, customerId: 4, treatmentId: 6, startsAt: `${day(6)}T14:00:00.000Z`, status: 'confirmed', price: 79.9, notes: 'Sensitive lower back', createdAt: created + 3000 },
      { id: 5, customerId: 5, treatmentId: 7, startsAt: `${day(6)} 15:00`, status: 'confirmed', price: 19.99, notes: null, createdAt: created + 4000 },
      { id: 6, customerId: 6, treatmentId: 3, startsAt: `${day(6)}T09:00:00.000Z`, status: 'cancelled', price: 64.5, notes: 'Cancelled by customer by phone', createdAt: created + 5000 },
      { id: 7, customerId: 7, treatmentId: 8, startsAt: `${day(7)} 10:00`, status: 'pending', price: 59, notes: null, createdAt: created + 6000 },
      { id: 8, customerId: 8, treatmentId: 5, startsAt: `${day(7)}T13:00:00.000Z`, status: 'confirmed', price: 35, notes: null, createdAt: created + 7000 },
      { id: 9, customerId: 1, treatmentId: 4, startsAt: `${day(8)}T11:00:00.000Z`, status: 'confirmed', price: 39.99, notes: null, createdAt: created + 8000 },
      { id: 10, customerId: 2, treatmentId: 1, startsAt: `${day(8)}T14:00:00.000Z`, status: 'pending', price: 54.9, notes: 'Wants a fringe trim too', createdAt: created + 9000 },
      { id: 11, customerId: 3, treatmentId: 7, startsAt: `${day(8)} 09:30`, status: 'canceled', price: 19.99, notes: null, createdAt: created + 10000 },
      { id: 12, customerId: 5, treatmentId: 8, startsAt: `${day(9)} 16:00`, status: 'canceled', price: 59, notes: 'No-show', createdAt: created + 11000 },
      { id: 13, customerId: 4, treatmentId: 2, startsAt: `${day(9)}T10:30:00.000Z`, status: 'completed', price: 29, notes: null, createdAt: created + 12000 },
      { id: 14, customerId: 6, treatmentId: 6, startsAt: `${day(9)}T12:00:00.000Z`, status: 'completed', price: 79.9, notes: 'Booked a 90 min upgrade next time', createdAt: created + 13000 },
    ])
    .run();
}
