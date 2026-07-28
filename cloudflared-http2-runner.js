import { execFileSync, spawn } from 'node:child_process';

const pathName = execFileSync(
  'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe',
  [
    '-NoProfile',
    '-Command',
    "(Get-CimInstance Win32_Service -Filter \"Name='cloudflared'\").PathName",
  ],
  { encoding: 'utf8', windowsHide: true },
).trim();

const exeMatch = pathName.match(/^(.*?cloudflared\.exe)/i);
const tokenMatch = pathName.match(/--token\s+([^\s]+)/i);

if (!exeMatch || !tokenMatch) {
  console.error('cloudflared service command/token could not be read.');
  process.exit(1);
}

const exe = exeMatch[1].replace(/^"|"$/g, '');
const env = { ...process.env, TUNNEL_TOKEN: tokenMatch[1] };

const child = spawn(exe, ['tunnel', '--protocol', 'http2', 'run'], {
  env,
  stdio: 'inherit',
  shell: false,
  windowsHide: true,
});

child.on('close', (code) => {
  console.log(`cloudflared exited with code ${code}`);
  process.exit(code ?? 0);
});

child.on('error', (err) => {
  console.error('Failed to start cloudflared', err);
  process.exit(1);
});
