#!/usr/bin/env node
import { run } from '../src/cli.js';
run().catch((e) => { console.error('reviewport:', e && e.message ? e.message : e); process.exitCode = 1; });
