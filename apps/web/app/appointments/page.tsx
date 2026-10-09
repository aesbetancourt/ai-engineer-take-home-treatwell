'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import {
  DEFAULT_PAGE_SIZE,
  appointmentSortFieldSchema,
  appointmentStatusSchema,
  errorBodySchema,
  errorCodes,
  formatVenueTime,
  sortDirectionSchema,
  venueTimeToUtc,
  type Appointment,
  type AppointmentStatus,
  type ListAppointmentsResponse,
} from '@venue/contract';

// The customer and treatment lists have no schema of their own yet. They return the shapes that an appointment embeds.
type Customer = Appointment['customer'];
type Treatment = Appointment['treatment'];

let customerCache: Customer[] | null = null;

const PAGE_SIZES = [10, DEFAULT_PAGE_SIZE, 50, 100];
const STATUS_LABELS = { pending: 'Pending', confirmed: 'Confirmed', completed: 'Completed', cancelled: 'Cancelled' };
const SORT_LABELS = { startsAt: 'Start time', createdAt: 'Creation time', price: 'Price' };
const DIRECTION_LABELS = { asc: 'Ascending', desc: 'Descending' };

// `useSearchParams` needs a Suspense boundary, because the URL is not known when Next renders the page ahead of time.
export default function AppointmentsPage() {
  return (
    <Suspense fallback={<p>Loading...</p>}>
      <AppointmentList />
    </Suspense>
  );
}

function AppointmentList() {
  // The URL holds the page, the filters and the sort, so a reload or a shared link shows the same list.
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams.toString();
  const status = searchParams.get('status') ?? '';
  const from = searchParams.get('from') ?? '';
  const to = searchParams.get('to') ?? '';
  const sortBy = searchParams.get('sortBy') ?? appointmentSortFieldSchema.enum.startsAt;
  const sortDir = searchParams.get('sortDir') ?? sortDirectionSchema.enum.asc;
  const pageSize = searchParams.get('pageSize') ?? String(DEFAULT_PAGE_SIZE);

  const [list, setList] = useState<ListAppointmentsResponse | null>(null);
  const [hasInvalidQuery, setHasInvalidQuery] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [customerId, setCustomerId] = useState('');
  const [treatmentId, setTreatmentId] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');

  function load() {
    fetch('/api/appointments?' + query).then(async (r) => {
      // The BFF answers 400 when the URL holds a value that the contract does not accept.
      setHasInvalidQuery(r.status === 400);
      if (r.ok) setList(await r.json());
    });
  }

  useEffect(() => {
    load();
  }, [query]);

  function replaceQuery(next: URLSearchParams) {
    const nextQuery = next.toString();
    router.replace(nextQuery ? pathname + '?' + nextQuery : pathname);
  }

  // A new filter, sort or page size gives another list, so the page number starts again.
  function changeControl(name: string, value: string) {
    const next = new URLSearchParams(searchParams);
    if (value) {
      next.set(name, value);
    } else {
      next.delete(name);
    }
    next.delete('page');
    replaceQuery(next);
  }

  function goToPage(page: number) {
    const next = new URLSearchParams(searchParams);
    next.set('page', String(page));
    replaceQuery(next);
  }

  const appointments = list?.items ?? [];
  const lastPage = list ? Math.max(1, Math.ceil(list.total / list.pageSize)) : 1;

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
        startsAt: startsAt ? venueTimeToUtc(startsAt) : '',
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
          <select value={status} onChange={(e) => changeControl('status', e.target.value)}>
            <option value="">All</option>
            {appointmentStatusSchema.options.map((option) => (
              <option key={option} value={option}>
                {STATUS_LABELS[option]}
              </option>
            ))}
          </select>
        </label>
        <label>
          From
          <input type="date" value={from} onChange={(e) => changeControl('from', e.target.value)} />
        </label>
        <label>
          To
          <input type="date" value={to} onChange={(e) => changeControl('to', e.target.value)} />
        </label>
        <label>
          Sort by
          <select value={sortBy} onChange={(e) => changeControl('sortBy', e.target.value)}>
            {appointmentSortFieldSchema.options.map((option) => (
              <option key={option} value={option}>
                {SORT_LABELS[option]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Order
          <select value={sortDir} onChange={(e) => changeControl('sortDir', e.target.value)}>
            {sortDirectionSchema.options.map((option) => (
              <option key={option} value={option}>
                {DIRECTION_LABELS[option]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Per page
          <select value={pageSize} onChange={(e) => changeControl('pageSize', e.target.value)}>
            {PAGE_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
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
              Starts at (venue time)
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

      {hasInvalidQuery && (
        <p className="form-error" role="alert">
          The address holds a filter that is not valid. <Link href={pathname}>Show all appointments</Link>
        </p>
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
              <td>{formatVenueTime(a.startsAt)}</td>
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

      {list && (
        <div className="pagination">
          <button className="small secondary" disabled={list.page <= 1} onClick={() => goToPage(list.page - 1)}>
            Previous
          </button>
          <span>
            Page {list.page} of {lastPage} ({list.total} appointments)
          </span>
          <button className="small secondary" disabled={list.page >= lastPage} onClick={() => goToPage(list.page + 1)}>
            Next
          </button>
        </div>
      )}
    </div>
  );
}
