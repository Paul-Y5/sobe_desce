import type { RoomAction, Snapshot } from './types.js';

export type Session = { roomCode: string; token: string };
export type Entry = { nickname: string; roomCode?: string };
export type Command = { requestId: string; expectedRevision: number; action: RoomAction };
export type Reply<T = undefined> = { ok: true; data: T } | { ok: false; code: string; message: string };
export type Ack<T = undefined> = (reply: Reply<T>) => void;
export interface ClientEvents {
  create: (entry: Entry, ack: Ack<Session>) => void;
  join: (entry: Entry, ack: Ack<Session>) => void;
  resume: (session: Session & { returnFromInactivity?: boolean }, ack: Ack) => void;
  command: (command: Command, ack: Ack) => void;
}
export interface ServerEvents {
  snapshot: (snapshot: Snapshot) => void;
  replaced: () => void;
  inactivityWarning: () => void;
  inactive: () => void;
}
