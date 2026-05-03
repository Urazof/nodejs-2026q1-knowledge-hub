import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

interface Message {
  role: 'user' | 'model';
  text: string;
}

interface Session {
  messages: Message[];
  lastAccessedAt: number;
}

const SESSION_TTL_MS = 30 * 60 * 1000; // 30 min

@Injectable()
export class AiSessionService {
  private readonly sessions = new Map<string, Session>();

  createSession(): string {
    const id = uuidv4();
    this.sessions.set(id, { messages: [], lastAccessedAt: Date.now() });
    return id;
  }

  getHistory(sessionId: string): Message[] {
    const session = this.sessions.get(sessionId);
    if (!session) return [];
    session.lastAccessedAt = Date.now();
    return session.messages;
  }

  addMessage(sessionId: string, role: 'user' | 'model', text: string): void {
    let session = this.sessions.get(sessionId);
    if (!session) {
      session = { messages: [], lastAccessedAt: Date.now() };
      this.sessions.set(sessionId, session);
    }
    session.messages.push({ role, text });
    session.lastAccessedAt = Date.now();
    this.evictExpired();
  }

  private evictExpired(): void {
    const cutoff = Date.now() - SESSION_TTL_MS;
    for (const [id, session] of this.sessions) {
      if (session.lastAccessedAt < cutoff) {
        this.sessions.delete(id);
      }
    }
  }
}
