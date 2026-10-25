# API

The REST prefix is `/api/v1`. The API exposes generated Swagger/OpenAPI
documentation; use the running server's route descriptions and DTOs as the
executable source of endpoint details. All private requests carry
`Authorization: Bearer <accessToken>` over HTTPS in staging/production.

Public and admin venue lists use `page` and `limit`; enquiry/notification feeds currently cap their results at100 and need cursor pagination before large-scale use. Search accepts city and supported
filters; changing city must change the query key and clear results from the prior
city. Do not present an old cached city result as a response to a new location.
Money is represented in integer paise, not floating-point rupees.

## Main route groups

| Group                               | Purpose                                      | Access                                |
| ----------------------------------- | -------------------------------------------- | ------------------------------------- |
| `GET /health`                       | Service and database readiness               | Public, no secrets                    |
| `POST /auth/firebase`               | Exchange a server-verified Firebase ID token | Valid external identity               |
| `POST /auth/dev-session`            | Isolated fixed test personas                 | Explicit development mode only        |
| `GET /me`                           | Current user and role                        | Authenticated                         |
| `GET /locations`                    | Supported selectable locations               | Public                                |
| `GET /venues`, `GET /venues/:id`    | Approved, active public discovery/details    | Public                                |
| `/organizations`, `/partner/venues` | Owner business and listing workflow          | Owner and object ownership            |
| `/admin/overview`, `/admin/venues`  | Moderation overview and review               | Administrator with session/MFA policy |
| `/wishlist`                         | Personal saved venues                        | Customer ownership                    |
| `/enquiries`                        | Customer/owner enquiry collaboration         | Scoped customer or venue owner        |
| Quote/site-visit/booking routes     | Explicit enquiry progression                 | Role and object checks                |
| Media routes                        | Validated owner-controlled image uploads     | Role, venue ownership, file limits    |

## Errors and safe clients

Treat 401 as a missing/expired session and prompt reauthentication. Treat 403 as
an authorization denial; retrying with client-supplied owner/role IDs cannot fix
it. Invalid DTOs must produce 400 responses, missing private objects must not
leak another user's data, and booking conflicts must produce a stable conflict
response. Do not automatically retry non-idempotent mutations. An enquiry
idempotency key lets a client recover from a lost response without creating
duplicate records.

Never send Firebase service-account JSON from mobile. Never record bearer tokens
in screenshots, analytics, crash reports, CI output or issue reports. Public venue
responses must not expose customer contact details or private organization data.

## Scope

The repository implements its priority workflow first. Consult the current DTOs
and implementation checklist before building against an advanced endpoint; this
overview is not a promise that every item in the master brief is complete.
