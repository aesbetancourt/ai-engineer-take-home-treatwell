'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { errorBodySchema, errorCodes, type Appointment, type AppointmentStatus } from '@venue/contract';

// The customer and treatment lists have no schema of their own yet. They return the shapes that an appointment embeds.
type Customer = Appointment['customer'];
type Treatment = Appointment['treatment'];

let customerCache: Customer[] | null = null;

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [status, setStatus] = useState('');
  const [date, setDate] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [customerId, setCustomerId] = useState('');
  const [treatmentId, setTreatmentId] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');

  function load() {
    let url = '/api/appointments?';
    if (status) url += 'status=' + status + '&';
    if (date) url += 'date=' + date;
    fetch(url).then(async (r) => {
      if (r.ok) setAppointments(await r.json());
    });
  }

  useEffect(() => {
    load();
  }, [status, date]);

  useEffect(() => {
    if (customerCache) {
      setCustomers(customerCache);
    } else {
      fetch('/api/customers')
        .then((r) => r.json())
        .then((d) => {
          customerCache = d;
          setCustomers(d);
        });
    }
    fetch('/api/treatments')
      .then((r) => r.json())
      .then((d) => setTreatments(d));
  }, []);

  function create() {
    fetch('/api/appointments', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        customerId: Number(customerId),
        treatmentId: Number(treatmentId),
        // An empty start time goes to the API as it is, and the API rejects it.
        startsAt: startsAt ? new Date(startsAt).toISOString() : '',
        notes,
      }),
    }).then(async (r) => {
      if (!r.ok) {
        // The API rejected the appointment. Keep the form open, with the values, and show the reason.
        const body = errorBodySchema.safeParse(await r.json());
        if (!body.success) {
          setFormError('The appointment was not created');
        } else if (body.data.error.code === errorCodes.VALIDATION_ERROR) {
          setFormError('Choose a customer, a treatment and a start time');
        } else {
          setFormError(body.data.error.message);
        }
        return;
      }
      setFormError('');
      setShowForm(false);
      setCustomerId('');
      setTreatmentId('');
      setStartsAt('');
      setNotes('');
      load();
    }).catch(() => setFormError('The appointment was not created'));
  }

  function toggleForm() {
    setFormError('');
    setShowForm(!showForm);
  }

  function setAppointmentStatus(id: number, newStatus: AppointmentStatus) {
    fetch('/api/appointments/' + id, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    }).then(() => load());
  }

  return (
    <div>
      <h1>Appointments</h1>

      <div className="filters">
        <label>
          Status
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="cancelled">Cancelled</option>
            <option value="completed">Completed</option>
          </select>
        </label>
        <label>
          Date
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <button className="secondary" onClick={toggleForm}>
          {showForm ? 'Close form' : 'New appointment'}
        </button>
      </div>

      {showForm && (
        <div className="panel" style={{ marginBottom: 20 }}>
          <div className="form-grid">
            <label>
              Customer
              <select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
                <option value="">Choose a customer</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Treatment
              <select value={treatmentId} onChange={(e) => setTreatmentId(e.target.value)}>
                <option value="">Choose a treatment</option>
                {treatments.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.durationMin} min, €{t.price})
                  </option>
                ))}
              </select>
            </label>
            <label>
              Starts at
              <input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
            </label>
            <label>
              Notes
              <input value={notes} onChange={(e) => setNotes(e.target.value)} />
            </label>
          </div>
          {formError && (
            <p className="form-error" role="alert">
              {formError}
            </p>
          )}
          <button onClick={create}>Create appointment</button>
        </div>
      )}

      <table>
        <thead>
          <tr>
            <th>When</th>
            <th>Customer</th>
            <th>Treatment</th>
            <th>Status</th>
            <th>Price</th>
            <th>Notes</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {appointments.map((a) => (
            <tr key={a.id}>
              <td>{new Date(a.startsAt).toLocaleString()}</td>
              <td>
                {a.customer.name}
                <br />
                <small>{a.customer.email}</small>
              </td>
              <td>
                {a.treatment.name}
                <br />
                <small>{a.treatment.durationMin} min</small>
              </td>
              <td>
                <span className={'badge ' + a.status}>{a.status}</span>
              </td>
              <td>€{a.price}</td>
              <td>{a.notes}</td>
              <td>
                {a.status === 'pending' && (
                  <button className="small" onClick={() => setAppointmentStatus(a.id, 'confirmed')}>
                    Confirm
                  </button>
                )}{' '}
                {a.status !== 'cancelled' && a.status !== 'completed' && (
                  <button className="small secondary" onClick={() => setAppointmentStatus(a.id, 'cancelled')}>
                    Cancel
                  </button>
                )}{' '}
                <Link href={'/appointments/' + a.id + '/confirmation'}>Confirmation</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
