-- Removes email confirmation entirely.
--
-- Accounts are usable the moment they are created, so the verification tokens
-- and the confirmation timestamp carry no meaning. Deliberate data loss:
-- the accounts themselves are untouched, only the verification bookkeeping goes.
-- See plans/12-remove-email-verification.md.

DROP TABLE "EmailVerificationToken";

ALTER TABLE "User" DROP COLUMN "emailVerifiedAt";
