import { createServer as createHttpServer } from 'node:http';
import { randomBytes, randomInt } from 'node:crypto';
import { Server, type Socket } from 'socket.io';
import { z } from 'zod';
import { chooseBotAction } from './bot.js';
import type { ChatMessage, Command } from '../shared/contracts.js';
import type { Metrics } from './metrics.js';
import type { Accounts } from './accounts.js';
import { applyAction, createDeck, createGame, GameError, legalCards } from '../shared/engine.js';
import { BASE_FORMAT, INFINITE_RULES, SUITS, TRADITIONAL_RULES, type MatchFormat, type ClientEvents, type ServerEvents, type Snapshot, type GameState, type Session, type Reply } from '../shared/index.js';

const nickname = z.string().trim().min(1).max(24).refine(s => !/[\u0000-\u001f\u007f]/u.test(s));
const roomCode = z.string().regex(/^[A-Z2-9]{6}$/);
const entrySchema = z.strictObject({ nickname, roomCode: roomCode.optional() });
const sessionSchema = z.strictObject({ roomCode, token: z.string().regex(/^[a-f0-9]{64}$/), returnFromInactivity: z.boolean().optional() });
const commandSchema = z.strictObject({
  requestId: z.string().min(8).max(100), expectedRevision: z.number().int().nonnegative(),
  action: z.discriminatedUnion('type', [
    z.strictObject({ type: z.literal('start') }),
    z.strictObject({ type: z.literal('nextGame') }),
    z.strictObject({ type: z.literal('finishInfinite'), confirmed: z.literal(true) }),
    z.strictObject({ type: z.literal('setFormat'), format: z.strictObject({ mode: z.enum(['base', 'competitive', 'infinite']), linesToWin: z.number().int().min(1).max(10) }) }),
    z.strictObject({ type: z.literal('addBot'), seat: z.number().int().min(0).max(3) }),
    z.strictObject({ type: z.literal('removeBot'), seat: z.number().int().min(0).max(3) }),
    z.strictObject({ type: z.literal('chooseTrump'), suit: z.enum(SUITS) }),
    z.strictObject({ type: z.literal('exchange'), cardIds: z.array(z.string().max(32)).max(5) }),
    z.strictObject({ type: z.literal('sitOut') }),
    z.strictObject({ type: z.literal('play'), cardId: z.string().max(32) }),
    z.strictObject({ type: z.literal('nextHand') }),
    z.strictObject({ type: z.literal('restart'), confirmed: z.literal(true) }),
  ]),
});
const chatSchema = z.strictObject({ requestId: z.string().min(8).max(100), text: z.string().trim().min(1).max(500).refine(s => !/[\u0000-\u0008\u000b-\u001f\u007f]/u.test(s)) });
const moderationSchema = z.strictObject({ requestId: z.string().min(8).max(100), seat: z.number().int().min(0).max(3), muted: z.boolean() });
const messages: Record<string, string> = {
  INVALID_FORMAT: 'Escolha um modo válido e entre uma e dez linhas no Competitivo.',
  ACCOUNT_REQUIRED: 'Entre na conta que reservou este lugar para regressar à partida.',
  CHAT_MUTED: 'O anfitrião silenciou as suas mensagens nesta sala.',
  INVALID_PAYLOAD: 'O pedido não é válido.', INVALID_ACTION: 'Esta ação não é válida.',
  NOT_MEMBER: 'Entre numa sala para jogar.', INVALID_SESSION: 'A sessão terminou. Entre novamente numa sala.',
  ROOM_NOT_FOUND: 'Não encontrámos essa sala. Confirme o código.', ROOM_FULL: 'Esta sala já tem quatro jogadores.',
  MATCH_STARTED: 'A partida já começou.', ALREADY_JOINED: 'Já está numa sala.',
  CREATOR_ONLY: 'Só quem criou a sala pode fazer isso.', NEED_FOUR: 'São necessários quatro jogadores ligados.',
  DUPLICATE: 'Este pedido já foi processado.', STALE: 'A mesa mudou. Reveja o estado atual e tente novamente.',
  NOT_YOUR_TURN: 'Aguarde pela sua vez.', WRONG_PHASE: 'Esta ação não está disponível nesta fase.',
  MUST_PARTICIPATE: 'Nesta mão tem de participar.', INVALID_EXCHANGE: 'Selecione até cinco cartas da sua mão, sem repetir.',
  ILLEGAL_CARD: 'Essa carta não pode ser jogada agora.', RATE_LIMIT: 'Demasiados pedidos. Aguarde um momento.',
  CAPACITY: 'O servidor está cheio. Tente mais tarde.', REQUEST_LIMIT: 'Foi atingido o limite de ações desta sessão.',
  INTERNAL: 'Não foi possível concluir o pedido. Tente novamente.',
  INACTIVE_SESSION: 'Foi desligado por inatividade. Carregue em «Voltar à partida» para regressar.',
};
type Member = { nickname: string; token: string; socketId: string | null; requests: Set<string>; inactive: boolean; userId?: string; bot: boolean; chatRequests: Set<string>; chatTimes: number[] };
type Room = { format: MatchFormat; code: string; creator: number; revision: number; members: (Member | null)[]; game: GameState | null; lastActivity: number; turnDeadline: number | null; warned: boolean; cancelTimer?: () => void; cancelBot?: () => void; chatMessages: ChatMessage[]; mutedSeats: Set<number>; chatSequence: number };
type Data = { session?: Session; seat?: number; userId?: string };
type GameSocket = Socket<ClientEvents, ServerEvents, Record<string, never>, Data>;
type Options = { botDelayMs?: number; metrics?: Metrics; accounts?: Accounts; origins?: string[]; rateLimit?: number; maxRooms?: number; roomTtlMs?: number; now?: () => number; schedule?: (run: () => void, delay: number) => () => void };
const TURN_DURATION_MS = 5 * 60 * 1000;
const GRACE_DURATION_MS = 60 * 1000;

export function shuffledDeck() {
  const deck = createDeck();
  for (let i = deck.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

export function createServer(options: Options = {}) {
  const now = options.now ?? Date.now;
  const schedule = options.schedule ?? ((run, delay) => {
    const timer = setTimeout(run, delay); timer.unref();
    return () => clearTimeout(timer);
  });
  const rooms = new Map<string, Room>();
  const origins = options.origins ?? ['http://localhost:8081'];
  const http = createHttpServer(async (req, res) => {
    const route = req.url?.split('?')[0] ?? '';
    res.once('finish', () => options.metrics?.http(route === '/health' ? 'health' : route === '/metrics' ? 'metrics' : route.startsWith('/api/auth/') ? 'auth' : route.startsWith('/api/admin/') ? 'admin' : 'other', res.statusCode));
    if (route === '/metrics' && options.metrics) { await options.metrics.handle(req, res); return; }
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    try { if (await options.accounts?.handle(req, res)) return; }
    catch { res.writeHead(500); res.end(JSON.stringify({ error: 'Não foi possível concluir o pedido.' })); return; }
    res.writeHead(req.url === '/health' ? 200 : 404);
    res.end(JSON.stringify(req.url === '/health' ? { ok: true } : { error: 'Não encontrado.' }));
  });
  const io = new Server<ClientEvents, ServerEvents, Record<string, never>, Data>(http, {
    cors: { origin: origins, credentials: true }, maxHttpBufferSize: 8192,
    // Native clients have no Origin; browser origins must match even for WebSocket transport.
    allowRequest: (req, done) => done(null, !req.headers.origin || origins.includes(req.headers.origin)),
  });
  options.metrics?.setTotals(() => ({ rooms: rooms.size, connections: io.sockets.sockets.size, matches: [...rooms.values()].filter(r => r.game && r.game.phase !== 'matchComplete').length }));
  const accountHeaders = (socket: GameSocket) => ({ ...socket.handshake.headers,
    ...(typeof socket.handshake.auth.accountToken === 'string' ? { authorization: `Bearer ${socket.handshake.auth.accountToken}` } : {}) });
  io.use(async (socket, next) => {
    try {
      const user = await options.accounts?.authenticate(accountHeaders(socket));
      if (socket.handshake.auth.accountToken && !user) return next(new Error('Sessão de conta terminada.'));
      socket.data.userId = user?.id;
      next();
    } catch { next(new Error('Não foi possível validar a conta.')); }
  });
  options.accounts?.setOnRevoke(id => {
    for (const socket of io.sockets.sockets.values()) if (socket.data.userId === id) { socket.emit('accountRevoked'); socket.disconnect(true); }
  });
  function snapshot(room: Room, seat: number): Snapshot {
    const g = room.game;
    const hand = g?.players[seat].hand ?? [];
    return {
      format: g?.format ?? room.format, gameNumber: g?.gameNumber ?? 1, gameWins: g?.gameWins ?? [0, 0, 0, 0], competitionWinners: g?.competitionWinners ?? [],
      roomCode: room.code, revision: room.revision, you: seat, creator: room.creator,
      serverTime: now(), turnDeadline: room.turnDeadline,
      turnDisconnectAt: room.turnDeadline === null ? null : room.turnDeadline + GRACE_DURATION_MS,
      rulesetId: g?.rulesetId ?? (room.format.mode === 'infinite' ? INFINITE_RULES.id : TRADITIONAL_RULES.id), rules: g?.rules ?? (room.format.mode === 'infinite' ? INFINITE_RULES : TRADITIONAL_RULES),
      phase: g?.phase ?? 'lobby', dealer: g?.dealer ?? 0, chooser: g?.chooser ?? 1,
      turn: g?.turn ?? null, handNumber: g?.handNumber ?? 0, trump: g?.trump ?? null,
      players: room.members.map((m, i) => m ? {
        seat: i, nickname: m.nickname, connected: m.bot || m.socketId !== null, inactive: m.inactive, bot: m.bot,
        score: g?.players[i].score ?? TRADITIONAL_RULES.initialScore,
        tricks: g?.players[i].tricks ?? 0, participating: g?.players[i].participating ?? null,
        cardCount: g?.players[i].hand.length ?? 0,
      } : null),
      hand,
      legalCardIds: g?.phase === 'trickPlay' && g.turn === seat ? legalCards(hand, g.trick, g.trump!, g.rules).map(c => c.id) : [],
      canSitOut: !!g && g.phase === 'participationExchange' && g.turn === seat && seat !== g.chooser && !g.rules.compulsoryParticipationSuits.includes(g.trump!),
      trick: g?.trick ?? [], completedTricks: g?.completedTricks ?? [], winners: g?.winners ?? [], scoreChanges: g?.scoreChanges ?? [],
    };
  }
  function publishChat(room: Room) {
    for (const member of room.members) if (member?.socketId) io.to(member.socketId).emit('chatState', { messages: room.chatMessages, mutedSeats: [...room.mutedSeats] });
  }
  function scheduleBot(room: Room) {
    room.cancelBot?.(); room.cancelBot = undefined;
    const seat = room.game?.turn;
    if (seat == null || !room.members[seat]?.bot || !room.members.some(m => m?.socketId)) return;
    const revision = room.revision;
    room.cancelBot = schedule(() => {
      room.cancelBot = undefined;
      if (room.revision !== revision || !room.members[seat]?.bot || room.game?.turn !== seat) return;
      const action = chooseBotAction(snapshot(room, seat));
      if (action) {
        try {
          execute(room, seat, commandSchema.parse({ requestId: `bot-action-${revision}-${seat}`, expectedRevision: revision, action }));
          options.metrics?.event('bot_action');
        } catch {
          options.metrics?.command('command', 'INTERNAL', 0);
          console.error(JSON.stringify({ event: 'bot_action_failed' }));
        }
      }
    }, options.botDelayMs ?? 700);
  }
  function publish(room: Room) {
    room.members.forEach((member, seat) => {
      if (member?.socketId) io.to(member.socketId).emit('snapshot', snapshot(room, seat));
    });
    scheduleBot(room);
  }
  function membership(socket: GameSocket) {
    const room = rooms.get(socket.data.session?.roomCode ?? '');
    const seat = socket.data.seat;
    const member = seat === undefined ? null : room?.members[seat];
    if (!room || seat === undefined || !member || member.token !== socket.data.session?.token || member.socketId !== socket.id) throw new GameError('NOT_MEMBER');
    return { room, seat, member };
  }
  function checkInactivity(room: Room) {
    room.cancelTimer?.(); room.cancelTimer = undefined;
    if (room.turnDeadline === null || room.game?.turn == null) return;
    const member = room.members[room.game.turn]!;
    if (member.inactive) return;
    if (now() >= room.turnDeadline + GRACE_DURATION_MS) {
      member.inactive = true; options.metrics?.event('inactivity');
      const current = member.socketId ? io.sockets.sockets.get(member.socketId) : undefined;
      if (current) { current.emit('inactive'); current.disconnect(true); }
      else { room.revision++; room.lastActivity = now(); publish(room); }
      return;
    }
    if (now() >= room.turnDeadline && !room.warned) {
      room.warned = true; options.metrics?.event('warning');
      if (member.socketId) io.to(member.socketId).emit('inactivityWarning');
      // Refresh clock anchors without changing the game revision or decision deadline.
      publish(room);
    }
    const next = room.warned ? room.turnDeadline + GRACE_DURATION_MS : room.turnDeadline;
    room.cancelTimer = schedule(() => checkInactivity(room), Math.max(0, next - now()));
  }
  function beginTurnTimer(room: Room) {
    room.turnDeadline = room.game?.turn != null && !room.members[room.game.turn]?.bot ? now() + TURN_DURATION_MS : null;
    room.warned = false;
    checkInactivity(room);
  }
  function bind(socket: GameSocket, room: Room, seat: number) {
    const member = room.members[seat]!;
    const old = member.socketId ? io.sockets.sockets.get(member.socketId) : undefined;
    member.socketId = socket.id;
    socket.data.session = { roomCode: room.code, token: member.token };
    socket.data.seat = seat;
    // Assign first, so the old socket's disconnect handler cannot mark this seat offline.
    if (old && old.id !== socket.id) { old.emit('replaced'); old.disconnect(true); }
    room.revision++; room.lastActivity = now(); publish(room);
    socket.emit('chatState', { messages: room.chatMessages, mutedSeats: [...room.mutedSeats] });
  }
  function execute(room: Room, seat: number, command: Command) {
    const member = room.members[seat]!;
    // Enforce the same deadline even when an event arrives before a delayed timer callback.
    checkInactivity(room);
    if (member.inactive) throw new GameError('INACTIVE_SESSION');
    if (member.requests.has(command.requestId)) throw new GameError('DUPLICATE');
    if (command.expectedRevision !== room.revision) throw new GameError('STALE');
    if (member.requests.size >= 10000) throw new GameError('REQUEST_LIMIT');
    const action = command.action;
    const previousPhase = room.game?.phase;
    if (['start', 'nextHand', 'nextGame', 'finishInfinite', 'restart', 'addBot', 'removeBot', 'setFormat'].includes(action.type) && seat !== room.creator) throw new GameError('CREATOR_ONLY');
    // No await inside this handler: validation + pure transition + commit is atomic per room
    // on this single Node event loop. Never add asynchronous work inside this boundary.
    if (action.type === 'setFormat') {
      if (room.game) throw new GameError('WRONG_PHASE');
      createGame(action.format.mode === 'infinite' ? INFINITE_RULES : TRADITIONAL_RULES, action.format);
      room.format = Object.freeze({ ...action.format });
    } else if (action.type === 'addBot' || action.type === 'removeBot') {
      if (room.game) throw new GameError('WRONG_PHASE');
      if (action.type === 'addBot') {
        if (room.members[action.seat]) throw new GameError('INVALID_ACTION');
        room.members[action.seat] = { nickname: `Bot ${action.seat + 1}`, token: randomBytes(32).toString('hex'), socketId: null, requests: new Set(), inactive: false, bot: true, chatRequests: new Set(), chatTimes: [] };
      } else {
        if (!room.members[action.seat]?.bot) throw new GameError('INVALID_ACTION');
        room.members[action.seat] = null;
      }
    } else if (action.type === 'restart') {
      room.game = null; options.metrics?.event('restart');
      room.chatMessages = []; room.mutedSeats.clear(); publishChat(room);
      room.members = room.members.map(m => m?.socketId || m?.bot ? m : null);
    } else {
      if (action.type === 'start' && !room.members.every(m => m && (m.bot || m.socketId))) throw new GameError('NEED_FOUR');
      room.game = applyAction(room.game ?? createGame(room.format.mode === 'infinite' ? INFINITE_RULES : TRADITIONAL_RULES, room.format), seat, action,
        action.type === 'start' || action.type === 'nextHand' || action.type === 'nextGame' ? shuffledDeck() : undefined);
    }
    if (previousPhase === 'trickPlay' && ['handComplete', 'matchComplete'].includes(room.game?.phase ?? '')) options.metrics?.event('hand_complete');
    if (previousPhase !== 'matchComplete' && room.game?.phase === 'matchComplete') options.metrics?.event('match_complete');
    if (member.bot) member.requests.clear(); // Revision guards make older synthetic bot IDs unnecessary.
    member.requests.add(command.requestId);
    beginTurnTimer(room);
    room.revision++; room.lastActivity = now(); publish(room);
  }
  io.on('connection', socket => {
    options.metrics?.event('connect');
    socket.use(async (_packet, next) => {
      if (!socket.data.userId) { next(); return; }
      try {
        const user = await options.accounts?.authenticate(accountHeaders(socket));
        if (user?.id !== socket.data.userId) { socket.emit('accountRevoked'); socket.disconnect(true); return; }
        next();
      } catch { socket.emit('accountRevoked'); socket.disconnect(true); }
    });
    let windowStart = Date.now(), count = 0;
    function handle<T>(event: 'create' | 'join' | 'resume' | 'command' | 'chat' | 'moderateChat', ack: unknown, operation: () => T) {
      if (typeof ack !== 'function') return;
      const started = performance.now();
      try {
        if (Date.now() - windowStart > 10000) { windowStart = Date.now(); count = 0; }
        if (++count > (options.rateLimit ?? 120)) throw new GameError('RATE_LIMIT');
        const data = operation();
        options.metrics?.command(event, 'accepted', (performance.now() - started) / 1000);
        ack({ ok: true, data } satisfies Reply<T>);
      } catch (error) {
        const code = error instanceof z.ZodError ? 'INVALID_PAYLOAD' : error instanceof GameError ? error.code : 'INTERNAL';
        options.metrics?.command(event, code in messages ? code : 'INTERNAL', (performance.now() - started) / 1000);
        ack({ ok: false, code, message: messages[code] ?? messages.INTERNAL });
        // A stale command gets a fresh, authorized state, with no game mutation.
        if (code === 'STALE') {
          const { room, seat } = membership(socket);
          socket.emit('snapshot', snapshot(room, seat));
        }
      }
    }
    for (const event of ['create', 'join'] as const) socket.on(event, (raw, ack) => handle(event, ack, () => {
      const entry = entrySchema.parse(raw);
      if (socket.data.session) throw new GameError('ALREADY_JOINED');
      let room: Room;
      if (event === 'create') {
        if (rooms.size >= (options.maxRooms ?? 100)) throw new GameError('CAPACITY');
        let code: string;
        const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        do { code = Array.from({ length: 6 }, () => alphabet[randomInt(alphabet.length)]).join(''); } while (rooms.has(code));
        room = { format: BASE_FORMAT, code, creator: 0, revision: 0, members: [null, null, null, null], game: null, lastActivity: now(), turnDeadline: null, warned: false, chatMessages: [], mutedSeats: new Set(), chatSequence: 0 };
        rooms.set(code, room);
      } else {
        const found = rooms.get(entry.roomCode ?? '');
        if (!found) throw new GameError('ROOM_NOT_FOUND');
        if (found.game) throw new GameError('MATCH_STARTED');
        room = found;
      }
      const seat = room.members.findIndex(m => !m);
      if (seat < 0) throw new GameError('ROOM_FULL');
      room.members[seat] = { nickname: entry.nickname, token: randomBytes(32).toString('hex'), socketId: null, requests: new Set(), inactive: false, userId: socket.data.userId, bot: false, chatRequests: new Set(), chatTimes: [] };
      bind(socket, room, seat);
      return socket.data.session!;
    }));
    socket.on('resume', (raw, ack) => handle('resume', ack, () => {
      const session = sessionSchema.parse(raw);
      if (socket.data.session) throw new GameError('ALREADY_JOINED');
      const room = rooms.get(session.roomCode);
      const seat = room?.members.findIndex(m => m?.token === session.token) ?? -1;
      if (!room || seat < 0) throw new GameError('INVALID_SESSION');
      if (room.members[seat]!.userId && room.members[seat]!.userId !== socket.data.userId) throw new GameError('ACCOUNT_REQUIRED');
      checkInactivity(room);
      if (room.members[seat]!.inactive) {
        if (!session.returnFromInactivity) throw new GameError('INACTIVE_SESSION');
        room.members[seat]!.inactive = false;
        if (room.game?.turn === seat) beginTurnTimer(room);
      }
      bind(socket, room, seat); options.metrics?.event('resume');
    }));
    socket.on('command', (raw, ack) => handle('command', ack, () => {
      const command = commandSchema.parse(raw);
      const { room, seat, member } = membership(socket);
      execute(room, seat, command);
    }));
    socket.on('chat', (raw, ack) => handle('chat', ack, () => {
      const message = chatSchema.parse(raw);
      const { room, seat, member } = membership(socket);
      if (member.inactive) throw new GameError('INACTIVE_SESSION');
      if (member.chatRequests.has(message.requestId)) throw new GameError('DUPLICATE');
      if (room.mutedSeats.has(seat)) throw new GameError('CHAT_MUTED');
      if (member.chatRequests.size >= 1000) throw new GameError('REQUEST_LIMIT');
      const recent = member.chatTimes.filter(time => now() - time < 10000);
      if (recent.length >= 5) throw new GameError('RATE_LIMIT');
      member.chatTimes = [...recent, now()]; member.chatRequests.add(message.requestId);
      room.chatMessages.push({ id: ++room.chatSequence, seat, nickname: member.nickname, text: message.text, sentAt: now() });
      room.chatMessages = room.chatMessages.slice(-50);
      publishChat(room);
    }));
    socket.on('moderateChat', (raw, ack) => handle('moderateChat', ack, () => {
      const command = moderationSchema.parse(raw);
      const { room, seat, member } = membership(socket);
      if (seat !== room.creator) throw new GameError('CREATOR_ONLY');
      if (member.chatRequests.has(command.requestId)) throw new GameError('DUPLICATE');
      if (member.chatRequests.size >= 1000) throw new GameError('REQUEST_LIMIT');
      if (command.seat === seat || !room.members[command.seat] || room.members[command.seat]?.bot) throw new GameError('INVALID_ACTION');
      if (command.muted) room.mutedSeats.add(command.seat); else room.mutedSeats.delete(command.seat);
      member.chatRequests.add(command.requestId); publishChat(room);
    }));
    socket.on('disconnect', () => {
      options.metrics?.event('disconnect');
      try {
        const { room, member } = membership(socket);
        member.socketId = null; room.revision++; room.lastActivity = now(); publish(room);
      } catch { /* Superseded connection or expired room. */ }
    });
  });
  const sweep = setInterval(() => {
    for (const [code, room] of rooms) if (room.members.every(m => !m?.socketId) && now() - room.lastActivity > (options.roomTtlMs ?? 86400000)) { room.cancelTimer?.(); room.cancelBot?.(); rooms.delete(code); }
  }, 60000);
  sweep.unref();
  return {
    listen: (port: number, host = '127.0.0.1') => new Promise<string>((resolve, reject) => {
      http.once('error', reject);
      http.listen(port, host, () => { const address = http.address(); resolve(`http://${host}:${typeof address === 'object' && address ? address.port : port}`); });
    }),
    close: () => new Promise<void>(resolve => { clearInterval(sweep); for (const room of rooms.values()) { room.cancelTimer?.(); room.cancelBot?.(); } io.close(() => resolve()); }),
  };
}
