'use client';

import { useEffect, useState } from 'react';
import type { AppointmentSummary } from '@venue/contract';

export default function Home() {
  const [summary, setSummary] = useState<AppointmentSummary | null>(null);

  useEffect(() => {
    fetch('/api/appointments/summary').then(async (r) => {
      if (r.ok) setSummary(await r.json());
    });
  }, []);

  return (
    <div>
      <h1>Overview</h1>
      <div className="stats">
        <div className="panel stat">
          <strong>{summary ? summary.total : '...'}</strong>
          <span>appointments booked</span>
        </div>
        <div className="panel stat">
          <strong>{summary ? '€' + summary.revenue : '...'}</strong>
          <span>revenue from confirmed and completed</span>
        </div>
      </div>
      <h2>By status</h2>
      <div className="panel">
        {summary &&
          Object.keys(summary.byStatus).map((s) => (
            <p key={s}>
              <span className={'badge ' + s}>{s}</span> {summary.byStatus[s]}
            </p>
          ))}
      </div>
    </div>
  );
}
