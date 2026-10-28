import { StyleSheet, Text, View } from 'react-native';
import type { PublicPlayer, Snapshot } from '../../../shared/index';
import { useGame } from '../GameContext';
import { ModeOptions } from '../MatchModes';
import { color, space } from '../tokens';
import { Button, Heading, s } from '../ui';
import { Restart } from './Restart';

function RoomCodeCard({ state, count }: { state: Snapshot; count: number }) {
  return <View style={[s.panel, { alignItems: 'center', paddingVertical: space.xxl }]}>
    <Text style={s.eyebrow}>A SUA MESA ESTÁ ABERTA</Text><Heading>{count < 4 ? 'Só falta a companhia.' : 'Mesa completa.'}</Heading>
    <Text style={s.body}>Partilhe este código com os seus amigos.</Text><Text selectable testID="room-code" style={styles.roomCode}>{state.roomCode}</Text>
    <Text style={s.body}>{count} de 4 lugares ocupados</Text>
    {state.players.some(p => p?.bot) && <Text style={s.label}>Mesa de treino · inclui bots</Text>}
  </View>;
}

function seatStatus(player: PublicPlayer | null) {
  return player ? player.bot ? '◇ Bot · treino' : player.connected ? '● Pronto para jogar' : '○ Sem ligação · reservado' : '○ Livre';
}

function LobbySeat({ state, player, seat }: { state: Snapshot; player: PublicPlayer | null; seat: number }) {
  const { act, busy, connection } = useGame();
  return <View style={[s.panel, { flex: 1, minWidth: 135 }]}>
    <Text style={s.eyebrow}>LUGAR {seat + 1}{seat === state.creator ? ' · ANFITRIÃO' : ''}</Text>
    <Text style={s.label}>{player ? `${player.nickname}${seat === state.you ? ' (eu)' : ''}` : 'À espera de um amigo'}</Text>
    <Text style={s.body}>{seatStatus(player)}</Text>
    {state.you === state.creator && (!player || player.bot) && <Button secondary title={player?.bot ? `Retirar bot do lugar ${seat + 1}` : `Adicionar bot ao lugar ${seat + 1}`} disabled={busy || connection !== 'ready'} onPress={() => void act({ type: player?.bot ? 'removeBot' : 'addBot', seat })} />}
  </View>;
}

function modeSummary(state: Snapshot) {
  return state.format.mode === 'infinite' ? 'Pode continuar abaixo de zero.' : state.format.mode === 'competitive' ? `A competição termina às ${state.format.linesToWin * 4} vitórias.` : 'Ganha quem chegar a zero.';
}

export function Lobby({ state }: { state: Snapshot }) {
  const { act, busy, connection } = useGame();
  const count = state.players.filter(Boolean).length;
  const ready = state.players.every(p => p?.connected);
  return <>
    <ModeOptions state={state} />
    <RoomCodeCard state={state} count={count} />
    <View style={styles.seats}>{state.players.map((player, seat) => <LobbySeat key={seat} state={state} player={player} seat={seat} />)}</View>
    {state.you === state.creator ? <Button title="Começar partida" disabled={!ready || busy || connection !== 'ready'} onPress={() => void act({ type: 'start' })} /> : <Text style={[s.body, { textAlign: 'center' }]}>A aguardar que o anfitrião comece a partida.</Text>}
    <Text style={[s.body, { textAlign: 'center' }]}>Cada pessoa começa com 20 pontos. {modeSummary(state)}</Text>
    <Restart state={state} />
  </>;
}

const styles = StyleSheet.create({
  roomCode: { fontSize: 40, fontWeight: '800', letterSpacing: 8, color: color.green, paddingVertical: space.md },
  seats: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
});
