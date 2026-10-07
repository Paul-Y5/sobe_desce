import { useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { useGame } from './GameContext';
import { Button, s } from './ui';

export function Chat() {
  const game = useGame();
  const [text, setText] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false), [open, setOpen] = useState(false);
  const state = game.snapshot;
  if (!state) return null;
  const muted = game.chat.mutedSeats.includes(state.you);
  async function run(action: () => Promise<void>) {
    setBusy(true); setError('');
    try { await action(); }
    catch (e) { setError(e instanceof Error && !/(timeout|timed out)/i.test(e.message) ? e.message : 'Sem confirmação. A mensagem pode ter sido enviada; confirme no histórico antes de repetir.'); }
    finally { setBusy(false); }
  }
  return <View style={s.panel}><Button secondary title={open ? 'Fechar conversa' : `Conversa da sala (${game.chat.messages.length})`} onPress={() => setOpen(v => !v)} />
    {open && <>
      <Text style={s.body}>Só os participantes desta sala veem as mensagens. Não partilhe as suas cartas. Guardamos as últimas 50 mensagens até recomeçar a partida.</Text>
      <ScrollView style={{ maxHeight: 280 }} contentContainerStyle={{ gap: 12, paddingVertical: 8 }} nestedScrollEnabled>
        {game.chat.messages.length === 0 && <Text style={s.body}>Diga olá à mesa.</Text>}
        {game.chat.messages.map(message => <View key={message.id}><Text style={s.label}>{message.nickname}{message.seat === state.you ? ' (eu)' : ''}</Text><Text selectable style={s.body}>{message.text}</Text></View>)}
      </ScrollView>
      {!!error && <Text accessibilityRole="alert" style={s.body}>{error}</Text>}
      {muted ? <Text style={s.body}>O anfitrião silenciou as suas mensagens nesta sala.</Text> : <>
        <TextInput accessibilityLabel="Mensagem para a sala" placeholder="Escreva uma mensagem…" value={text} onChangeText={setText} maxLength={500} multiline style={s.input} editable={!busy} />
        <Button title={busy ? 'A enviar…' : 'Enviar mensagem'} disabled={busy || !text.trim() || game.connection !== 'ready'} onPress={() => void run(async () => { await game.sendChat(text); setText(''); })} />
      </>}
      {state.you === state.creator && <><Text style={s.label}>Moderação da conversa</Text>{state.players.filter(p => p && !p.bot && p.seat !== state.you).map(p => <Button key={p!.seat} secondary title={`${game.chat.mutedSeats.includes(p!.seat) ? 'Permitir mensagens de' : 'Silenciar'} ${p!.nickname}`} disabled={busy || game.connection !== 'ready'} onPress={() => void run(() => game.moderateChat(p!.seat, !game.chat.mutedSeats.includes(p!.seat)))} />)}</>}
    </>}
  </View>;
}
