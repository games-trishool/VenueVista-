# Monitoring and recovery

The API health endpoint is a readiness signal. It is not a substitute for a
synthetic business transaction. Monitor API latency/error rate, database connection
pressure, storage failures, notification failures, and SMS quota/expenditure.

Structured request logs should include a request ID, status, and duration. Do not
log bearer tokens, OTPs, phone numbers, full enquiry text, private media URLs, or
service-account material. Restrict operator access and set documented retention.

Sentry/FCM configuration and delivery are external integrations. Do not claim they
are active merely because environment variable placeholders exist. Confirm a
staging crash report and notification end-to-end after integration is complete.

For managed PostgreSQL, enable encrypted daily backups and point-in-time recovery.
Document an RPO/RTO with the business owner. Restore into an isolated database at
least quarterly, run migrations/readiness checks, and exercise the search and
enquiry workflows. Keep object-storage versioning/lifecycle policies aligned with
database retention. A database-only backup cannot restore missing uploaded images.

On an incident, disable the affected operation or account, preserve bounded audit
evidence, rotate compromised credentials, and follow the approved notification
process. These are operating procedures to validate; no recovery drill has been
certified by this repository.
