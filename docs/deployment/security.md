# Security and privacy release gates

This checklist records implementation and operating requirements. It is not a
penetration-test report, security certification, or legal compliance statement.
Use the implementation checklist for current automated-test evidence.

## Authentication and authorization

- [ ] Configure Firebase phone authentication and verify actual OTP delivery in
      the intended Indian market, including abuse controls, quotas and expiry.
- [ ] Provision administrators outside public signup; enforce and test MFA.
- [ ] Disable every development persona flag in production and assert the
      development login endpoint fails closed.
- [ ] Validate revoked/expired Firebase credentials, suspended accounts, JWT
      lifetime, sign-out semantics and session revocation requirements.
- [ ] Test customer/owner/admin separation and object ownership for each route,
      including media, spaces, quotes, site visits, notifications and bookings.
- [ ] Confirm admin cookies are HTTP-only, SameSite and Secure over HTTPS; protect
      state-changing requests from cross-origin submission.

## API and data

- [ ] Terminate HTTPS using valid managed certificates; restrict CORS to deployed
      application origins. Do not use wildcard privileged origins.
- [ ] Validate DTOs and bounded pagination, sort fields, coordinates, dates,
      capacities and integer paise. Exercise malicious and unexpected fields.
- [ ] Verify rate limits operate correctly behind the chosen reverse proxy;
      configure trusted proxy hops deliberately rather than trusting all clients.
- [ ] Reject publication before approval; exclude suspended/deleted records from
      public search and public media access.
- [ ] Prevent overlapping confirmed bookings at the database layer and verify
      concurrent-request behavior.
- [ ] Verify idempotent enquiry retries cannot replay one user's payload into
      another user's records.
- [ ] Audit administrator decisions without logging OTPs, tokens, secrets,
      unnecessary contact details or private message bodies.

## Media and external integrations

- [ ] Implement and verify the production storage adapter; local development
      uploads do not provide production durability or access controls.
- [ ] Restrict extensions, inspect file signatures, enforce size/count limits,
      disallow arbitrary remote fetches, and verify venue ownership before upload.
- [ ] Strip metadata/re-encode images where required, scan uploads, and serve
      approved content using controlled MIME/security headers and a separate domain.
- [ ] Restrict Google Maps keys by application/API; keep server-side keys separate.
- [ ] Verify FCM delivery permissions and preference controls; notification records
      in PostgreSQL alone do not prove push delivery.
- [ ] Verify error monitoring redacts personal data and credentials before upload.

## Infrastructure and operations

- [ ] Use secret management and distinct environment credentials; scan the final
      bundle, image, repository and archive for accidental secrets.
- [ ] Use a least-privilege database runtime identity and separate migration role.
- [ ] Run dependency/security analysis against the committed lockfile and triage
      findings; passing builds do not imply absence of vulnerabilities.
- [ ] Enable database/object backups, access logging and a tested restore process.
- [ ] Assign incident, moderation and support owners with access review.

## Privacy and account deletion

Before launch, document which data is collected: phone identity, profile/business
details, venue media, optional coordinates, wishlist and enquiry content,
notification tokens, audit events and diagnostics. Explain purpose, processors,
retention, rights/support contact, optional permissions, and deletion behavior in
an accessible privacy policy. Location must be optional for browsing.

Implement authenticated account deletion and an external deletion-request path
required by Google Play. Define what is deleted immediately, what is anonymized,
and what is retained under a documented lawful need. Do not silently remove audit
or booking records needed for dispute handling. Example retention periods are
business/legal decisions; this repository does not invent or certify them.

Require a completed inventory, approved retention schedule, processor agreements,
and reviewed Data Safety disclosures before production rollout. Applicable Indian
privacy obligations and user-facing notices need legal review; no compliance
claim is made here.
