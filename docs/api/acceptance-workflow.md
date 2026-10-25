# First complete business workflow

Use an isolated database and genuine uploaded test photographs with permission.
Development personas are acceptable for local database acceptance testing; they
do not validate production phone OTP or MFA.

1. Start PostgreSQL/PostGIS, apply migrations, start the API and all three clients.
   Confirm health includes database readiness.
2. Sign in as an owner. Create a business profile. Create a function-hall draft
   with city, locality, address, coordinates, capacities, facilities and paise
   prices. Save and reopen it to prove persistence.
3. Upload valid images. Verify invalid/oversized uploads are rejected. Submit the
   complete venue for moderation. Confirm the public search does not show it yet.
4. Sign in to the admin dashboard as an administrator. Inspect the venue and
   photographs, then approve. Verify a rejection requires a reason and an audit
   record exists for each review.
5. Browse the Customer app in the submitted city. Confirm the approved venue
   appears. Switch to another city and verify it disappears; return and open its
   details.
6. Sign in as a customer, save the venue, and submit a future dated enquiry with
   event type, guest count, approximate budget and requirements. Retry with the
   same idempotency key and check only one enquiry exists.
7. Return to Partner. Verify the enquiry and owner notification record are
   present. Respond with a quote.
8. Return to Customer. Refresh enquiries and verify `QUOTE_SENT`, the quoted
   amount and message. The enquiry must not become a confirmed booking merely
   because a quotation was issued.
9. Attempt another owner's venue changes, another customer's enquiry access,
   and customer access to admin routes. Every operation must be denied.
10. For booking-capable routes, attempt overlapping confirmations for one space
    and adjacent non-overlapping intervals. Verify PostgreSQL rejects the former
    even under concurrent requests.

Record commands, test names/counts, runtime versions, and any blocked integration
in the implementation checklist. A database test is not a native navigation test;
run the device checks separately before release.
