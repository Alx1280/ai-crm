-- Tasks had no place on the timeline.
--
-- `occurredAt` was written as NULL for TASK rows on the grounds that a task is
-- scheduled rather than logged. The timeline orders by it DESC NULLS LAST, so
-- every task sank beneath the entire history and stayed there — a task added a
-- second ago appeared at the bottom of today, under things from that morning.
--
-- The write path now stamps every activity, tasks included. This is the same
-- fix for the rows written before it: where a task sits on the timeline is when
-- it was written down. `dueAt` is when it is *for*, and stays untouched.
UPDATE "activity"
SET "occurredAt" = "createdAt"
WHERE "occurredAt" IS NULL;
