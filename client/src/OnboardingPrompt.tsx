import { useEffect, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { hasAnsweredTutorial, rememberTutorialAnswer } from './preferences';
import { useReducedMotion } from './motion';
import { Button, colors, PlayingCard, s } from './ui';

export function OnboardingPrompt({ eligible }: { eligible: boolean }) {
  const [show, setShow] = useState(false);
  const router = useRouter();
  const reduced = useReducedMotion();
  useEffect(() => {
    let mounted = true;
    void hasAnsweredTutorial().then(answered => { if (mounted) setShow(!answered); }).catch(() => { if (mounted) setShow(true); });
    return () => { mounted = false; };
  }, []);
  function answer(learn: boolean) {
    setShow(false);
    void rememberTutorialAnswer().catch(() => {}); // Preference only; storage failure must not block entry.
    if (learn) router.push('/tutorial');
  }
  return <Modal visible={eligible && show} transparent animationType={reduced ? 'none' : 'fade'} onRequestClose={() => answer(false)}>
    <View style={styles.backdrop}><View style={styles.dialog}><ScrollView contentContainerStyle={{ padding: 24, gap: 20 }}>
      <View style={[s.row, { justifyContent: 'center', paddingVertical: 12 }]}><PlayingCard card={{ id: 'clubs-A', suit: 'clubs', rank: 'A' }} /><PlayingCard card={{ id: 'hearts-7', suit: 'hearts', rank: '7' }} /></View>
      <Text style={s.eyebrow}>BEM-VINDO À MESA</Text>
      <Text style={s.heading}>Já sabe jogar Sobe e Desce?</Text>
      <Text style={s.body}>Aprenda com cartas à vista e uma jogada de treino. São seis passos curtos, ao seu ritmo.</Text>
      <Button title="Quero aprender" onPress={() => answer(true)} />
      <Button secondary title="Sim, já conheço" onPress={() => answer(false)} />
      <Text style={[s.body, { fontSize: 12 }]}>Pode voltar ao tutorial em «Como jogar». Usamos a variante traditional-pt-v1.</Text>
    </ScrollView></View></View>
  </Modal>;
}
const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: '#001b12b8', padding: 20, alignItems: 'center', justifyContent: 'center' },
  dialog: { width: '100%', maxWidth: 440, maxHeight: '90%', borderRadius: 22, backgroundColor: colors.white, overflow: 'hidden' },
});
