// Boots the API and asserts that every mounted route is reachable, i.e. that no
// router was registered after the catch-all 404 handler in server.js.

import { createRequire } from 'module';

const PORT = 5199;
process.env.PORT = String(PORT);

const require = createRequire(import.meta.url);
require('../server.js');

const base = `http://127.0.0.1:${PORT}`;

// Endpoints that must never answer with the catch-all 404. Auth-protected ones
// answer 401, which still proves the route is wired up.
const ENDPOINTS = [
    ['GET', '/api/classes'],
    ['POST', '/api/admin/promo'],
    ['GET', '/api/students'],
    ['GET', '/api/lessons'],
    ['GET', '/api/schemes'],
    ['GET', '/api/attendance'],
    ['GET', '/api/subjects']
];

await new Promise(resolve => setTimeout(resolve, 1000));

const unreachable = [];

for (const [method, path] of ENDPOINTS) {
    const response = await fetch(base + path, { method });
    if (response.status === 404) unreachable.push(`${method} ${path}`);
}

// The catch-all itself must still work.
const unknown = await fetch(`${base}/api/definitely-not-a-route`);

if (unreachable.length) {
    console.error('check-routes: these endpoints hit the catch-all 404 handler:');
    for (const entry of unreachable) console.error(`  ${entry}`);
    console.error('\nTheir router is registered after the 404 handler in server.js — move it above.');
    process.exit(1);
}

if (unknown.status !== 404) {
    console.error(`check-routes: unknown paths should 404, got ${unknown.status}`);
    process.exit(1);
}

console.log('check-routes: all routers reachable');
process.exit(0);
