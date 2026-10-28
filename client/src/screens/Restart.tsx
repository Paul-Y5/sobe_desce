import { useState } from 'react';
import type { Snapshot } from '../../../shared/index';
import { ConfirmDialog } from '../Dialog';
import { useGame } from '../GameContext';
import { Button } from '../ui';

export function Restart({ state }: { state: Snapshot }) {
  const { act, busy, connection } = useGame();
  const [confirm, setConfirm] = useState(false);
  if (state.you !== state.creator) return null;
  if (state.phase === 'lobby' && !state.players.some(p => p && !p.connected)) return null;
  const title = state.format.mode === 'competitive' ? state.competitionWinners.length ? 'Nova competição' : 'Recomeçar competição' : state.phase === 'matchComplete' ? 'Nova partida' : 'Recomeçar partida';
  return <>
    <Button secondary title={title} disabled={busy || connection !== 'ready'} onPress={() => setConfirm(true)} />
    <ConfirmDialog visible={confirm} title="Recomeçar a partida?" body="As pontuações, vitórias da competição e cartas serão apagadas. Todos voltam à sala de espera. Os lugares de quem está sem ligação ficam livres." confirmLabel="Sim, recomeçar" cancelLabel="Continuar nesta partida" onCancel={() => setConfirm(false)} onConfirm={() => { setConfirm(false); void act({ type: 'restart', confirmed: true }); }} />
  </>;
}
