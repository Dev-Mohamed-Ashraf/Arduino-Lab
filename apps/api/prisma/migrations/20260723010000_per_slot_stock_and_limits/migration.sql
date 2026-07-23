-- Stock becomes per lab session instead of a global counter.
--
-- Parts are returned to the shelf when a period ends, so "reserved" only means
-- anything inside one (date, slot). Availability is now derived from the
-- bookings themselves, which removes the counter and the drift it could suffer.
-- See plans/13-per-slot-stock.md.

-- The old CHECK referenced reservedQuantity, so it has to go first.
ALTER TABLE "Component" DROP CONSTRAINT "component_quantities_valid";

ALTER TABLE "Component" DROP COLUMN "reservedQuantity";

-- Ceiling on how many of one part a single group may take.
ALTER TABLE "Component" ADD COLUMN "maxPerBooking" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "Component"
  ADD CONSTRAINT "component_total_quantity_valid" CHECK ("totalQuantity" >= 0);

ALTER TABLE "Component"
  ADD CONSTRAINT "component_max_per_booking_positive" CHECK ("maxPerBooking" > 0);

-- No new index: the availability query narrows by Booking(bookingDate,
-- timeSlotId, status) and then joins BookingComponent on bookingId, which the
-- existing unique(bookingId, componentId) already covers. Indexes declared only
-- in SQL would be dropped by the next `prisma migrate dev` anyway.
