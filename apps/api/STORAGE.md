# Private venue media storage

The API supports local development files and a real S3-compatible private object
store. Images still pass server-side decoding, pixel/size limits, metadata removal,
ownership checks, and moderation rules before storage. Client bundles never receive
storage credentials. Production requires the S3 driver; it cannot fall back to a
local directory.

## Configuration

Configure these names only on the API server, using secure environment settings:

| Variable                                   | Purpose                                                                    |
| ------------------------------------------ | -------------------------------------------------------------------------- |
| `MEDIA_STORAGE_DRIVER`                     | `local` for development, `s3` for production/private object storage        |
| `MEDIA_STORAGE_PATH`                       | Development-only local upload directory                                    |
| `S3_REGION`                                | Object-store region, for example `ap-south-1`                              |
| `S3_BUCKET`                                | An existing private bucket provisioned by the operator                     |
| `S3_ENDPOINT`                              | Optional compatible-service HTTPS endpoint; omit for standard AWS S3       |
| `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | Server-only credentials, or use a supported workload identity when omitted |
| `S3_SESSION_TOKEN`                         | Optional session token for temporary credentials                           |
| `S3_FORCE_PATH_STYLE`                      | Optional `true`/`false` override for compatible-service addressing         |
| `S3_ALLOW_INSECURE_LOCAL`                  | Explicit `true` only for non-production loopback MinIO tests               |

The AWS SDK calculates SigV4 signatures inside the API process. It needs real local
credential material or a supported workload identity. A network-proxy-only secret
placeholder is insufficient for that local cryptographic operation. Supply this
configuration through the deployment's secure runtime identity/secret mechanism;
never copy credentials into scripts, logs, source files, or client bundles.

Do not enable public bucket policies or public object ACLs. The application serves
images through `/api/v1/media/:id`; unpublished media requires an authorized owner
or administrator session. Public approved listings can expose their image through
that API route without exposing object-store credentials or private bucket URLs.
Storage keys are generated UUID image filenames, never client-provided paths.

Give the production API identity only the object permissions it needs for the
configured bucket/prefix: `s3:PutObject`, `s3:GetObject`, and `s3:DeleteObject`.
Provision the bucket separately; the production application does not create buckets
or change access policies. Enable server-side encryption through bucket policy,
appropriate regional data placement, versioning/lifecycle rules, and monitored
backups. Test restore procedures and deletion/retention policies before release.

Uploads are written before the database transaction; a failed transaction removes
the newly created object. Removal withdraws/deletes the database record before
deleting the object, preserving moderation access controls if storage cleanup fails.
If deletion cannot finish after the record is removed, the response includes
`storageCleanupPending: true` and the API emits a redacted
`media_orphan_cleanup_failed` event. Operators must monitor those events and
reconcile orphaned private objects; an automatic cleanup worker is not implemented.
Switching drivers does not migrate old image files: copy and verify existing keys
before changing the deployment's driver.

## Local object-service validation

The optional Docker overlay is in
`infrastructure/docker/compose.storage.yaml`. Generate unique local credentials in
an ignored, private file; never use production keys for tests. Starting MinIO does
not automatically switch the running API driver or create a production bucket.

For the isolated storage adapter test, set a private test configuration containing
the following names, with generated credential values supplied securely:

```dotenv
NODE_ENV=test
MEDIA_STORAGE_DRIVER=s3
S3_ENDPOINT=http://127.0.0.1:9000
S3_ALLOW_INSECURE_LOCAL=true
S3_REGION=us-east-1
S3_BUCKET=venuevista-integration
S3_ACCESS_KEY_ID=<generated-local-user>
S3_SECRET_ACCESS_KEY=<generated-local-password>
ENABLE_STORAGE_INTEGRATION_TESTS=true
```

Run from the repository root with the private test configuration path:

```sh
pnpm exec dotenv -e /absolute/private/path/storage.env -- pnpm --filter @venuevista/api exec vitest run test/storage.integration.test.ts
```

The suite is opt-in and refuses production or non-loopback endpoints. It creates
only the named disposable test bucket when absent and cleans up only UUID objects
created by that run. It checks actual signed uploads/reads/deletes, upload size
limits, and unsafe key rejection. With a real provider, a fourth check requires
anonymous reads to return 403.

### Executed in this cloud instance

The official MinIO Docker Hub image returned a pull-access denial, the official
Quay image returned an authorization denial, and the direct official binary/checksum
destination was blocked by the network policy. MinIO was therefore **not** started
or qualified here. No TLS, artifact-checksum, or request-signature verification was
disabled to work around those failures.

The wire-protocol checks instead ran against the explicitly labelled local
`s3rver@3.7.1` development emulator, installed outside the repository using normal
npm integrity verification. The SDK made actual signed HTTP requests to a
disk-backed loopback service. Signature mismatches were not permitted. Its
well-known `S3RVER` test credentials are emulator constants, not production keys.

Result: **3 passed, 1 skipped**. Exact upload/download bytes and metadata,
delete/missing-object behavior, oversized-upload rejection, and unsafe-key rejection
passed. The emulator does not enforce private bucket policies, so the real-provider
anonymous-read qualification was explicitly skipped, with its 403 assertion
retained for MinIO/AWS testing. Do not treat the emulator as private production
storage or expose it beyond loopback. The normal development API continued to use
its local driver throughout; these checks did not change its configuration.

To label an emulator run explicitly, set
`STORAGE_TEST_SERVICE=s3rver-emulator` in the separate private test configuration.
Leave that variable unset for actual MinIO qualification.

These results do not establish MinIO/AWS IAM, remote network access, production
bucket policy, conditional-write semantics, encryption, or end-to-end deployed-media
readiness. Verify those in staging with the actual deployment identity, including
anonymous-access denial and bucket policy review.
