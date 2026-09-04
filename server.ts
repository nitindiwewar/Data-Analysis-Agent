/**
 * Full-Stack Production Express Server
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import { createApiRouter } from './backend/serverRoutes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// API Routes
app.use('/api', createApiRouter());

// Static React Client (Production Build)
const distPath = path.resolve(__dirname, 'dist');
app.use(express.static(distPath));

app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`[Server] Data Analyst AI Agent active on http://0.0.0.0:${PORT}`);
});
