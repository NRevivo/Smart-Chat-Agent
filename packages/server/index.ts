// Server entry point - loads conversation history on startup
import express from 'express';
import dotenv from 'dotenv';
import router from './routes';
import { memoryManager } from './services/memory.manager';

dotenv.config();

const app = express();
app.use(express.json());
app.use(router);

const PORT = process.env.PORT || 3000;

// Load conversation history on server startup
app.listen(PORT, async () => {
   console.log(`Server is running on http://localhost:${PORT}`);

   // Load history to check if previous conversation exists
   await memoryManager.loadHistory();
});
