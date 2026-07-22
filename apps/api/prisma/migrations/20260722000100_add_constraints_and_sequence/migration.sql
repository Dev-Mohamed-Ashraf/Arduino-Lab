-- Database-level guarantees that Prisma's schema language cannot express.
--
-- Only objects Prisma does not model are declared here (CHECK constraints,
-- sequences, functions, triggers). Indexes are deliberately left out: Prisma
-- models indexes, so any index created here but absent from schema.prisma
-- would be dropped by the next `prisma migrate dev`.

-- ─────────────────────────────────────────────────────────────
--  Inventory integrity
-- ─────────────────────────────────────────────────────────────

-- Stock can never go negative, and no more units may be reserved than exist.
-- This is the last line of defence behind the atomic conditional UPDATE in
-- BookingsService.
ALTER TABLE "Component"
  ADD CONSTRAINT "component_quantities_valid"
  CHECK (
    "totalQuantity" >= 0
    AND "reservedQuantity" >= 0
    AND "reservedQuantity" <= "totalQuantity"
  );

-- A booking must request at least one unit of any component it lists.
ALTER TABLE "BookingComponent"
  ADD CONSTRAINT "booking_component_quantity_positive"
  CHECK ("quantity" > 0);

-- ─────────────────────────────────────────────────────────────
--  Slot integrity
-- ─────────────────────────────────────────────────────────────

ALTER TABLE "TimeSlot"
  ADD CONSTRAINT "timeslot_capacity_positive"
  CHECK ("capacity" > 0);

-- ─────────────────────────────────────────────────────────────
--  Booking integrity
-- ─────────────────────────────────────────────────────────────

ALTER TABLE "Booking"
  ADD CONSTRAINT "booking_group_number_positive"
  CHECK ("groupNumber" > 0);

-- Lab policy: at most six students per group. Enforced by zod on input and by
-- BookingsService, with this trigger as the final backstop.
CREATE OR REPLACE FUNCTION enforce_max_group_members()
RETURNS TRIGGER AS $$
DECLARE
  member_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO member_count
  FROM "BookingMember"
  WHERE "bookingId" = NEW."bookingId";

  IF member_count > 6 THEN
    RAISE EXCEPTION 'Booking % exceeds the 6 member limit', NEW."bookingId"
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER booking_member_limit
  AFTER INSERT OR UPDATE OF "bookingId" ON "BookingMember"
  FOR EACH ROW
  EXECUTE FUNCTION enforce_max_group_members();

-- ─────────────────────────────────────────────────────────────
--  Booking numbers
-- ─────────────────────────────────────────────────────────────

-- Human-readable receipt identifiers (ARD-2026-0001).
-- A database sequence is used rather than a counter in application code:
-- concurrent transactions would otherwise hand out duplicate numbers.
CREATE SEQUENCE IF NOT EXISTS booking_number_seq START 1;

CREATE OR REPLACE FUNCTION next_booking_number(booking_year INTEGER)
RETURNS TEXT AS $$
BEGIN
  RETURN 'ARD-' || booking_year::TEXT || '-' || LPAD(nextval('booking_number_seq')::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;
