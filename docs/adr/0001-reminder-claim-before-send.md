# The reminder job claims an appointment before it sends the email

The business rule is exactly one reminder per confirmed appointment, and the job runs in each of the three API replicas. The job first claims the appointment with one atomic `UPDATE … WHERE reminder_sent_at IS NULL`, and it sends the email only when that update changed one row. A crash between the claim and the send means the customer gets no reminder. A send that the email provider rejects has the same result, because the job does not release the claim: the provider can fail after it sent the email, and a retry then sends a second one. We accept this, because a second reminder breaks the rule in normal operation, and a missed one happens only on a crash or a failed send.

## Considered options

- **Send, then mark.** Each replica that reads the row before the mark sends an email. This gives duplicates in normal operation.
- **Outbox table with retry.** This gives one reminder and survives a crash. It needs a new table, a worker and an idempotent email provider. It is the correct design for production, and it is out of scope here.
