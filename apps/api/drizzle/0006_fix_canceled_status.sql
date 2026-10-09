-- Data fix: the previous booking system wrote the status `canceled`. The API uses `cancelled`.
-- It changes only the rows that have the legacy spelling, so a second run changes nothing.
-- The previous API version reads both spellings, so it works before and after this migration.
UPDATE `appointments` SET `status` = 'cancelled' WHERE `status` = 'canceled';
