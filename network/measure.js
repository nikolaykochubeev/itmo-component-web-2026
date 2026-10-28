import { writeFile } from 'node:fs/promises';
import { measureRequests } from './public/exercises.js';

const result = { measuredAt: new Date().toISOString(), ...(await measureRequests()) };
await writeFile(new URL('./evidence/measurements.json', import.meta.url), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));
