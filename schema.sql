CREATE EXTENSION "pgcrypto";

CREATE TABLE IF NOT EXISTS events (
  uid bigint NOT NULL PRIMARY KEY,
  uri text NOT NULL,
  format text NOT NULL,
  type text NOT NULL,
  date text NOT NULL
);

CREATE INDEX events_uid on events (uid);
CREATE INDEX events_format on events (format);
CREATE INDEX events_date on events (date);

CREATE TABLE IF NOT EXISTS results (
  uid uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  username text NOT NULL,
  event bigint NOT NULL REFERENCES events (uid) ON DELETE CASCADE,
  url text NOT NULL,
  deck jsonb NOT NULL,
  stats jsonb NOT NULL,
  archetype jsonb NOT NULL
);

CREATE INDEX results_uid on results (uid);
CREATE INDEX results_username on results (username);
CREATE INDEX results_event on results (event);
CREATE INDEX results_archetype on results (archetype);