'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { formatVenueTime, type PublicAppointment } from '@venue/contract';

// Shareable page: the customer opens it from the confirmation email.
export default function ConfirmationPage() {
  const params = useParams<{ id: string }>();
  const [appointment, setAppointment] = useState<PublicAppointment | null>(null);
  const [hasFailed, setHasFailed] = useState(false);

  useEffect(() => {
    fetch('/api/appointments/' + params.id + '/confirmation').then(async (r) => {
      if (r.ok) {
        setAppointment(await r.json());
      } else {
        setHasFailed(true);
      }
    });
  }, [params.id]);

  if (hasFailed) return <p>We could not load this appointment.</p>;
  if (!appointment) return <p>Loading...</p>;

  return (
    <div className="confirmation panel">
      <h1>Your booking</h1>
      <dl>
        <dt>Name</dt>
        <dd>{appointment.customer.name}</dd>
        <dt>Treatment</dt>
        <dd>
          {appointment.treatment.name} ({appointment.treatment.durationMin} min)
        </dd>
        <dt>When</dt>
        <dd>{formatVenueTime(appointment.startsAt)}</dd>
        <dt>Price</dt>
        <dd>€{appointment.price}</dd>
        <dt>Status</dt>
        <dd>
          <span className={'badge ' + appointment.status}>{appointment.status}</span>
        </dd>
      </dl>
    </div>
  );
}
