import { useState } from 'react';
import { Modal, Text, View } from 'react-native';
import type { MatchFormat, Snapshot } from '../../shared/index';
import { useGame } from './GameContext';
import { Button, colors, s } from './ui';

export const modeNames = { base: 'Base', competitive: 'Competitivo', infinite: 'Infinito' };
export function ModeOptions({ state }: { state: Snapshot }) {
  const game = useGame();
  const disabled = game.busy || game.connection !== 'ready' || state.you !== state.creator;
  function select(mode: MatchFormat['mode'], linesToWin = 1) { void game.act({ type: 'setFormat', format: { mode, linesToWin } }); }
  return <View style={s.panel}>
    <Text style={s.heading}>Modo de jogo</Text>
    <View style={s.row}>{(['base', 'competitive', 'infinite'] as const).map(mode => <Button key={mode} title={modeNames[mode]} secondary={state.format.mode !== mode} disabled={disabled} onPress={() => select(mode)} />)}</View>
    <Text style={s.body}>{state.format.mode === 'base' ? 'Uma partida. Todos começam com 20 pontos; ganha quem chegar a zero.' : state.format.mode === 'competitive' ? 'Cada jogo começa com 20 pontos. Uma vitória por jogo ganho; quatro vitórias fecham uma linha.' : 'Os pontos podem subir ou descer abaixo de zero. O anfitrião termina entre mãos; ganha quem tiver menos pontos.'}</Text>
    {state.format.mode === 'competitive' && <><Text testID="competition-target" style={s.label}>{state.format.linesToWin} {state.format.linesToWin === 1 ? 'linha' : 'linhas'} · Primeiro a {state.format.linesToWin * 4} vitórias</Text><View style={s.row}><Button secondary title="Menos uma linha" disabled={disabled || state.format.linesToWin === 1} onPress={() => select('competitive', state.format.linesToWin - 1)} /><Button secondary title="Mais uma linha" disabled={disabled || state.format.linesToWin === 10} onPress={() => select('competitive', state.format.linesToWin + 1)} /></View></>}
    <Text style={s.body}>{state.you === state.creator ? 'O modo fica fixo quando começar. Para alterar, terá de recomeçar a partida.' : 'O anfitrião escolhe o modo antes de começar.'}</Text>
  </View>;
}

export function CompetitionBoard({ state }: { state: Snapshot }) {
  if (state.format.mode !== 'competitive') return null;
  return <View style={{ gap: 12 }} testID="competition-board"><Text style={s.label}>Competitivo · primeiro a {state.format.linesToWin * 4} vitórias</Text>
    {state.players.map((player, seat) => player && <View key={seat} style={{ gap: 5 }}><View style={s.header}><Text style={s.label}>{player.nickname}</Text><Text testID={`game-wins-${seat}`} style={s.body}>{state.gameWins[seat]} / {state.format.linesToWin * 4}</Text></View>
      <View style={[s.row, { gap: 8 }]}>{Array.from({ length: state.format.linesToWin }, (_, line) => {
        const marks = Math.max(0, Math.min(4, state.gameWins[seat] - line * 4));
        return <Text key={line} accessibilityLabel={`Linha ${line + 1}: ${marks} de 4 vitórias`} style={{ fontSize: 16, letterSpacing: 3, fontWeight: '800', color: marks === 4 ? colors.green : colors.muted, padding: 6, borderWidth: 1, borderColor: marks === 4 ? colors.green : colors.line, borderRadius: 6 }}>{'✓'.repeat(marks)}{'·'.repeat(4 - marks)}</Text>;
      })}</View>
    </View>)}
  </View>;
}

export function FinishInfinite({ state }: { state: Snapshot }) {
  const [confirm, setConfirm] = useState(false);
  const { act, busy, connection } = useGame();
  if (state.format.mode !== 'infinite' || state.phase !== 'handComplete' || state.you !== state.creator) return null;
  return <>
    <Button secondary title="Terminar modo Infinito" disabled={busy || connection !== 'ready'} onPress={() => setConfirm(true)} />
    <Modal visible={confirm} transparent onRequestClose={() => setConfirm(false)}><View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#071a11aa' }}><View style={[s.panel, { width: '100%', maxWidth: 480 }]}>
      <Text style={s.heading}>Terminar a partida?</Text><Text style={s.body}>Ganha quem tiver menos pontos neste momento. Em caso de empate, a vitória é partilhada.</Text>
      <Button title="Sim, terminar" disabled={busy || connection !== 'ready'} onPress={() => { setConfirm(false); void act({ type: 'finishInfinite', confirmed: true }); }} />
      <Button secondary title="Continuar a jogar" onPress={() => setConfirm(false)} />
    </View></View></Modal>
  </>;
}
