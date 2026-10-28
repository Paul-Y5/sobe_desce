import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Dialog } from './Dialog';
import { hasAnsweredTutorial, rememberTutorialAnswer } from './preferences';
import { color, radius, space } from './tokens';
import { Button, Heading, PlayingCard, s } from './ui';

export function OnboardingPrompt({ eligible }: { eligible: boolean }) {
  const [show, setShow] = useState(false);
  const router = useRouter();
  useEffect(() => {
    let mounted = true;
    void hasAnsweredTutorial().then(answered => { if (mounted) setShow(!answered); }).catch(() => { if (mounted) setShow(true); });
    return () => { mounted = false; };
  }, []);
  function answer(learn: boolean) {
    setShow(false);
    void rememberTutorialAnswer().catch(() => {}); // Preference only; storage failure must not block entry.
    if (learn) router.push('/rules');
  }
  return <Dialog visible={eligible && show} onClose={() => answer(false)} label="Bem-vindo à mesa">
    <View style={styles.dialog}><ScrollView contentContainerStyle={{ padding: 24, gap: space.xl }}>
      <View accessibilityElementsHidden aria-hidden style={[s.row, { justifyContent: 'center', paddingVertical: space.md }]}><PlayingCard decorative card={{ id: 'clubs-A', suit: 'clubs', rank: 'A' }} /><PlayingCard decorative card={{ id: 'hearts-7', suit: 'hearts', rank: '7' }} /></View>
      <Text style={s.eyebrow}>BEM-VINDO À MESA</Text>
      <Heading>Já sabe jogar Sobe e Desce?</Heading>
      <Text style={s.body}>Aprenda com cartas à vista e uma jogada de treino. São seis passos curtos, ao seu ritmo.</Text>
      <Button title="Quero aprender" onPress={() => answer(true)} />
      <Button secondary title="Sim, já conheço" onPress={() => answer(false)} />
      <Text style={s.small}>Pode voltar ao tutorial em «Como jogar». Jogamos a variante tradicional portuguesa.</Text>
    </ScrollView></View>
  </Dialog>;
}
const styles = StyleSheet.create({
  dialog: { width: '100%', maxHeight: '100%', borderRadius: radius.xl, backgroundColor: color.white, overflow: 'hidden' },
});
