const tutorialKey = 'sobe-e-desce.tutorial.v1';
export async function hasAnsweredTutorial(): Promise<boolean> {
  return typeof window !== 'undefined' && window.localStorage.getItem(tutorialKey) === 'yes';
}
export async function rememberTutorialAnswer() {
  window.localStorage.setItem(tutorialKey, 'yes');
}
