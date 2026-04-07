import express from 'express';
import cors from 'cors';
import { initDb } from './db';
import assignmentsRouter from './routes/assignments';
import submissionsRouter from './routes/submissions';

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json({ limit: '10mb' }));

initDb();

app.use('/api/assignments', assignmentsRouter);
app.use('/api/submissions', submissionsRouter);

app.listen(PORT, () => {
  console.log(`Authored backend running on http://localhost:${PORT}`);
});
