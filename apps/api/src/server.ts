import { buildApp } from './app.js';
import { loadConfig } from '@market/config';

const config = loadConfig();
const app = await buildApp();
try { await app.listen({ host: config.HOST, port: config.PORT }); }
catch (error) { app.log.error(error); process.exitCode = 1; await app.close(); }
