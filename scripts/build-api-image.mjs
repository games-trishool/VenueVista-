import { lookup } from 'node:dns/promises';
import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Forward the operator's existing proxy through Docker's standard transient
// build arguments. Resolve its hostname for a separate BuildKit DNS namespace.
// The optional trusted CA is mounted as a BuildKit secret, never copied into
// image layers. TLS and Corepack package-signature verification stay enabled.
const args = [
  'build',
  '--progress=plain',
  '-f',
  'infrastructure/docker/api.Dockerfile',
  '-t',
  'venuevista-api:local',
];
const hosts = new Set();
for (const name of ['HTTP_PROXY', 'HTTPS_PROXY', 'ALL_PROXY', 'NO_PROXY']) {
  if (!process.env[name]) continue;
  args.push('--build-arg', name);
  if (name === 'NO_PROXY') continue;
  let host;
  try {
    host = new URL(process.env[name]).hostname;
  } catch {
    throw new Error(`Invalid ${name} proxy setting.`);
  }
  if (!hosts.has(host)) {
    hosts.add(host);
    const resolved = await lookup(host, { family: 4 });
    args.push('--add-host', `${host}:${resolved.address}`);
  }
}
if (process.env.NODE_EXTRA_CA_CERTS) {
  if (!existsSync(process.env.NODE_EXTRA_CA_CERTS))
    throw new Error('The configured trusted build CA file is missing.');
  args.push('--secret', `id=build_ca,src=${process.env.NODE_EXTRA_CA_CERTS}`);
}
args.push('.');
const child = spawn('docker', args, {
  cwd: fileURLToPath(new URL('../', import.meta.url)),
  stdio: 'inherit',
  env: process.env,
});
child.on('error', (error) => {
  console.error(error.message);
  process.exitCode = 1;
});
child.on('exit', (code, signal) => {
  process.exitCode = code ?? (signal ? 1 : 0);
});
