import * as SecureStore from 'expo-secure-store';

const tutorialKey = 'sobe-e-desce.tutorial.v1';
export async function hasAnsweredTutorial(): Promise<boolean> {
  return (await SecureStore.getItemAsync(tutorialKey)) === 'yes';
}
export async function rememberTutorialAnswer() {
  await SecureStore.setItemAsync(tutorialKey, 'yes');
}
