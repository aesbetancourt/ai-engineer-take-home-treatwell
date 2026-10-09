'use client';

import { useEffect, useState } from 'react';
import { errorBodySchema, errorCodes, type StaffMember } from '@venue/contract';

export default function StaffPage() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [formError, setFormError] = useState('');

  function load() {
    fetch('/api/staff').then(async (r) => {
      if (r.ok) setStaff(await r.json());
    });
  }

  useEffect(() => {
    load();
  }, []);

  function create() {
    fetch('/api/staff', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name, email }),
    })
      .then(async (r) => {
        if (!r.ok) {
          // The API rejected the staff member. Keep the values, and show the reason.
          const body = errorBodySchema.safeParse(await r.json());
          if (!body.success) {
            setFormError('The staff member was not created');
          } else if (body.data.error.code === errorCodes.VALIDATION_ERROR) {
            setFormError('Enter a name and an email address');
          } else {
            setFormError(body.data.error.message);
          }
          return;
        }
        setFormError('');
        setName('');
        setEmail('');
        load();
      })
      .catch(() => setFormError('The staff member was not created'));
  }

  return (
    <div>
      <h1>Staff</h1>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {staff.map((member) => (
            <tr key={member.id}>
              <td>{member.name}</td>
              <td>{member.email}</td>
              <td>{member.active ? 'Active' : 'Inactive'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h2>Add a staff member</h2>
      <div className="panel">
        <div className="form-grid">
          <label>
            Name
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label>
            Email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
        </div>
        {formError && (
          <p className="form-error" role="alert">
            {formError}
          </p>
        )}
        <button onClick={create}>Add staff member</button>
      </div>
    </div>
  );
}
