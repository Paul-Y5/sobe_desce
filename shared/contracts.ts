import type { RoomAction, Snapshot } from './types.js';

export type Session = { roomCode: string; token: string };
export type Entry = { nickname: string; roomCode?: string };
export type Command = { requestId: string; expectedRevision: number; action: RoomAction };
export type Reply<T = undefined> = { ok: true; data: T } | { ok: false; code: string; message: string };
export type Ack<T = undefined> = (reply: Reply<T>) => void;
export type ChatMessage = { id: number; seat: number; nickname: string; text: string; sentAt: number };
export type ChatState = { messages: ChatMessage[]; mutedSeats: number[] };
export interface ClientEvents {
  chat: (message: { requestId: string; text: string }, ack: Ack) => void;
  moderateChat: (command: { requestId: string; seat: number; muted: boolean }, ack: Ack) => void;
  create: (entry: Entry, ack: Ack<Session>) => void;
  join: (entry: Entry, ack: Ack<Session>) => void;
  resume: (session: Session & { returnFromInactivity?: boolean }, ack: Ack) => void;
  command: (command: Command, ack: Ack) => void;
}
export interface ServerEvents {
  chatState: (state: ChatState) => void;
  accountRevoked: () => void;
  snapshot: (snapshot: Snapshot) => void;
  replaced: () => void;
  inactivityWarning: () => void;
  inactive: () => void;
}
