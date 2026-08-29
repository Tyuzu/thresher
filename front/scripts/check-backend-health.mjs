import http from 'node:http';

const backendUrl = process.env.VITE_BACKEND_URL || 'http://localhost:4000';
const target = `${backendUrl.replace(/\/$/, '')}/ready`;

const req = http.get(target, (res) => {
  const status = res.statusCode || 0;
  if (status >= 200 && status < 300) {
    console.log(`Backend health OK: ${target} -> ${status}`);
    process.exit(0);
  }

  console.error(`Backend health check failed: ${target} -> ${status}`);
  process.exit(1);
});

req.on('error', (err) => {
  console.error(`Backend health check failed: ${target}`);
  console.error(err.message);
  process.exit(1);
});
