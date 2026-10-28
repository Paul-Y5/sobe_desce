import { useState } from 'react';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { RANKS, SUITS, type Card, type Suit } from '../../shared/index';
import { MotionEntry } from './motion';
import { rememberTutorialAnswer } from './preferences';
import { color } from './tokens';
import { Button, Heading, PlayingCard, s, suitNames, suitSymbols } from './ui';

const card = (suit: Suit, rank: Card['rank']): Card => ({ id: `${suit}-${rank}`, suit, rank });
const exampleHand = [card('clubs', '6'), card('hearts', '7'), card('spades', 'A'), card('diamonds', 'K'), card('clubs', '2')];
const replacements = [card('spades', '7'), card('diamonds', 'A'), card('hearts', 'K'), card('clubs', 'Q'), card('diamonds', 'J')];
const titles = ['Ganhar é chegar a zero.', 'O 7 vale mais do que o Rei.', 'Três cartas. Um trunfo. Mais duas.', 'Uma oportunidade para trocar.', 'Assistir, cortar e subir.', 'Copas muda as contas.'];
const labels = ['Objetivo', 'Cartas', 'Trunfo', 'Trocas', 'Uma jogada', 'Pontuação'];

export default function Tutorial() {
  const router = useRouter();
  const [step, setStep] = useState(0), [score, setScore] = useState(20);
  const [trump, setTrump] = useState<Suit | null>(null);
  const [hand, setHand] = useState(exampleHand), [selected, setSelected] = useState<string[]>([]);
  const [swapped, setSwapped] = useState(false), [feedback, setFeedback] = useState('');
  function leave() {
    void rememberTutorialAnswer().catch(() => {});
    router.dismissTo('/');
  }
  function exchange() {
    let next = 0;
    setHand(hand.map(c => selected.includes(c.id) ? replacements[next++] : c));
    setSelected([]); setSwapped(true);
  }
  return <View style={{ gap: 20 }}>
    <View style={s.header}><Text style={s.eyebrow}>PASSO {step + 1} DE 6 · {labels[step].toUpperCase()}</Text><Button secondary title="Sair do tutorial" onPress={leave} /></View>
    <View accessibilityElementsHidden aria-hidden style={styles.progress}>{labels.map((label, i) => <View key={label} style={[styles.segment, i <= step && { backgroundColor: color.green }]} />)}</View>
    <Heading>{titles[step]}</Heading>
    <Text style={s.body}>Aprenda as regras do modo Base. Estas cartas são de treino e não alteram a sua partida.</Text>
    <MotionEntry eventKey={step}>
      <View style={s.panel}>
        {step === 0 && <>
          <Text style={s.body}>Quatro amigos, cada um por si. Começa com 20 pontos e desce um ponto por vaza ganha. Cada mão tem cinco vazas.</Text>
          <View style={styles.felt}><Text style={styles.lightLabel}>A SUA PONTUAÇÃO</Text><MotionEntry eventKey={score}><Text style={styles.bigScore} testID="tutorial-score">{score}</Text></MotionEntry><Text style={styles.lightLabel}>{score === 20 ? 'Ganhe vazas para descer até zero.' : '20 − 3 vazas = 17 pontos'}</Text></View>
          <Button title="Ganhar 3 vazas" disabled={score === 17} onPress={() => setScore(17)} />
          <Text style={s.body}>Se participar e não ganhar nenhuma vaza, sobe cinco pontos. Quem chegar a zero ganha!</Text>
        </>}
        {step === 1 && <>
          <Text style={s.body}>Da mais forte à mais fraca. Repare no 7 e na posição do Valete: Ás → 7 → Rei → Valete → Dama.</Text>
          <View style={[s.row, { justifyContent: 'center' }]}>{[...RANKS].reverse().map((rank, i) => <MotionEntry key={rank} eventKey={rank} delay={i * 45} kind="deal"><PlayingCard card={card('spades', rank)} small /></MotionEntry>)}</View>
          <View style={styles.ruleTile}><Text style={s.label}>40 cartas · 4 naipes</Text><Text style={s.body}>Sem 8, 9, 10 nem jokers. Contam as vazas, não os valores das cartas.</Text></View>
        </>}
        {step === 2 && <>
          <Text style={s.body}>O jogador a seguir a quem dá as cartas escolhe o trunfo com as suas três primeiras cartas. Imagine que é a sua vez.</Text>
          <View testID="tutorial-hand" style={[s.row, { justifyContent: 'center' }]}>{exampleHand.slice(0, trump ? 5 : 3).map((c, i) => <MotionEntry key={c.id} eventKey={c.id} delay={i * 60} kind="deal"><View testID={`example-${c.id}`}><PlayingCard card={c} compact /></View></MotionEntry>)}</View>
          <View style={s.row}>{SUITS.map(suit => <Button key={suit} title={`${suitSymbols[suit]} ${suitNames[suit]}`} secondary={suit !== trump} selected={suit === trump} onPress={() => setTrump(suit)} />)}</View>
          <Text accessibilityLiveRegion="polite" style={s.label}>{trump ? `${suitSymbols[trump]} ${suitNames[trump]} é trunfo. Recebeu mais duas cartas!` : 'Escolha um naipe para receber as duas cartas que faltam.'}</Text>
          <Text style={s.body}>Quem escolhe o trunfo tem de participar e abre a primeira vaza. Um trunfo bate qualquer carta de outro naipe.</Text>
        </>}
        {step === 3 && <>
          <Text style={s.body}>Selecione as cartas que quer trocar. Pode trocar de zero a cinco, uma única vez. As novas cartas vêm do baralho restante.</Text>
          <View testID="tutorial-hand" style={[s.row, { justifyContent: 'center', gap: 4, paddingTop: 8 }]}>{hand.map((c, i) => <MotionEntry key={c.id} eventKey={c.id} kind="deal" delay={i * 50}><PlayingCard card={c} compact selected={selected.includes(c.id)} disabled={swapped} onPress={() => setSelected(ids => ids.includes(c.id) ? ids.filter(id => id !== c.id) : [...ids, c.id])} /></MotionEntry>)}</View>
          <Button title={selected.length === 1 ? 'Trocar 1 carta' : selected.length ? `Trocar ${selected.length} cartas` : 'Manter estas cartas'} disabled={swapped} onPress={exchange} />
          {swapped && <Text accessibilityLiveRegion="polite" style={s.label}>{hand.some(c => replacements.some(r => r.id === c.id)) ? 'Carta trocada. A descartada não volta ao baralho.' : 'Mão mantida. Também pode participar sem trocar.'}</Text>}
          <View style={styles.ruleTile}><Text style={s.label}>♣ Paus: todos jogam</Text><Text style={s.body}>Nos outros naipes pode ficar de fora, exceto quem escolheu o trunfo. Quem fica de fora não joga nem muda de pontuação.</Text></View>
        </>}
        {step === 4 && <>
          <Text style={s.body}>Espadas é trunfo. A primeira carta da vaza foi o 7 de copas. Qual deve jogar?</Text>
          <View style={styles.felt}><Text style={styles.lightLabel}>NA MESA</Text><PlayingCard card={card('hearts', '7')} /><Text style={styles.lightLabel}>Trunfo: ♠ Espadas</Text></View>
          <View style={[s.row, { justifyContent: 'center', paddingTop: 8 }]}>{[card('hearts', '2'), card('hearts', 'A'), card('spades', 'A')].map(c => <PlayingCard key={c.id} card={c} legal={feedback.startsWith('Certo') && c.id === 'hearts-A'} onPress={() => setFeedback(c.suit === 'spades' ? 'Ainda tem copas: tem de assistir ao naipe.' : c.rank === '2' ? 'Tem o Ás de copas: tem de bater o 7 quando pode.' : 'Certo! Assiste a copas e bate o 7 com o Ás.')} />)}</View>
          {!!feedback && <Text accessibilityLiveRegion="polite" style={s.label}>{feedback}</Text>}
          <Text style={s.body}>Sem cartas do naipe, tem de cortar com trunfo. Entre as cartas permitidas, deve subir se puder. Ao abrir uma vaza, se tiver o Ás de trunfo, é obrigatório jogá-lo.</Text>
        </>}
        {step === 5 && <>
          <Text style={s.body}>Copas duplica tanto as descidas como as penalizações. Compare três resultados a partir de 20 pontos.</Text>
          {[['♠ 3 vazas', '20 − 3', '17'], ['♥ 3 vazas', '20 − 6', '14'], ['♥ Nenhuma vaza', '20 + 10', '30']].map(([label, calculation, result]) => <View key={label} style={[styles.ruleTile, s.header]}><View><Text style={s.label}>{label}</Text><Text style={s.body}>{calculation}</Text></View><Text style={styles.result}>{result}</Text></View>)}
          <Text style={s.body}>Quem fica de fora mantém a pontuação. Calculamos os pontos de todos antes de decidir a vitória: se vários chegarem a zero na mesma mão, partilham a vitória.</Text>
          <View style={styles.ruleTile}><Text style={s.label}>E durante a partida?</Text><Text style={s.body}>Tem cinco minutos por decisão. Recebe um aviso e mais um minuto; depois é desligado por inatividade. Pode voltar ao seu lugar, sem perder cartas nem pontos.</Text></View>
        </>}
      </View>
    </MotionEntry>
    <View style={[s.row, { justifyContent: 'space-between' }]}><Button secondary title="Anterior" disabled={step === 0} onPress={() => setStep(step - 1)} /><Button title={step === 5 ? 'Vamos jogar' : 'Seguinte'} onPress={() => step === 5 ? leave() : setStep(step + 1)} /></View>
  </View>;
}
const styles = StyleSheet.create({
  progress: { flexDirection: 'row', gap: 6 },
  segment: { flex: 1, height: 5, borderRadius: 3, backgroundColor: color.track },
  felt: { backgroundColor: color.green, borderRadius: 18, padding: 22, gap: 16, alignItems: 'center' },
  lightLabel: { color: color.onFeltSoft, fontSize: 14, textAlign: 'center' },
  bigScore: { color: color.gold, fontSize: 76, lineHeight: 88, fontWeight: '800', fontVariant: ['tabular-nums'] },
  ruleTile: { backgroundColor: color.tile, borderRadius: 12, padding: 16, gap: 6 },
  result: { color: color.green, fontSize: 34, fontWeight: '800' },
});
