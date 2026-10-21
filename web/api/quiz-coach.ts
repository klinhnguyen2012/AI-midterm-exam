import type { IncomingMessage, ServerResponse } from 'node:http';
import { handleQuizCoach } from '../server/quizCoach.js';

export default function quizCoach(req: IncomingMessage & { body?: unknown }, res: ServerResponse) {
  return handleQuizCoach(req, res);
}
