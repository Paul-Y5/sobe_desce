import { useState } from 'react';
import { Link } from 'expo-router';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { useAccount } from '../src/AccountContext';
import { Button, s } from '../src/ui';

export default function Account() {
  const account = useAccount();
  const [signup, setSignup] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [name, setName] = useState(''), [email, setEmail] = useState(''), [password, setPassword] = useState('');
  async function submit() {
    setBusy(true); setError('');
    try {
      await account.request(signup ? '/api/auth/sign-up/email' : '/api/auth/sign-in/email', { email: email.trim(), password, ...(signup ? { name: name.trim() } : {}) });
      setPassword(''); await account.refresh();
    } catch (error) { setError(error instanceof Error ? error.message : 'Não foi possível ligar ao servidor.'); }
    finally { setBusy(false); }
  }
  return <ScrollView contentContainerStyle={s.page} keyboardShouldPersistTaps="handled"><View style={s.panel}>
    <Text style={s.heading}>{account.user ? 'A sua conta' : signup ? 'Criar conta' : 'Entrar na conta'}</Text>
    {!!error && <Text accessibilityRole="alert" style={s.body}>{error}</Text>}
    {account.user ? <>
      <Text style={s.label}>{account.user.name}</Text><Text style={s.body}>{account.user.email}</Text>
      <Text style={s.body}>A conta é opcional. Os lugares criados com esta conta exigem a mesma conta para regressar à partida.</Text>
      {account.user.role === 'admin' && <Link href="/admin" style={s.label}>Abrir administração →</Link>}
      <Button title="Terminar sessão" disabled={busy} onPress={() => { setBusy(true); void account.signOut().catch(() => setError('Não foi possível terminar a sessão.')).finally(() => setBusy(false)); }} />
    </> : <>
      <Text style={s.body}>Pode continuar a jogar como convidado. Não usamos o seu endereço de correio eletrónico como nome na mesa.</Text>
      {signup && <><Text style={s.label}>Nome da conta</Text><TextInput accessibilityLabel="Nome da conta" value={name} onChangeText={setName} maxLength={80} style={s.input} /></>}
      <Text style={s.label}>Correio eletrónico</Text><TextInput accessibilityLabel="Correio eletrónico" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" maxLength={254} style={s.input} />
      <Text style={s.label}>Palavra-passe</Text><TextInput accessibilityLabel="Palavra-passe" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" autoComplete={signup ? 'new-password' : 'current-password'} maxLength={128} style={s.input} />
      {signup && <Text style={s.body}>Use pelo menos 12 caracteres. Nesta versão ainda não há recuperação por correio eletrónico.</Text>}
      <Button title={busy ? 'A aguardar…' : signup ? 'Registar conta' : 'Entrar'} disabled={busy || !email.trim() || !password || (signup && !name.trim())} onPress={() => void submit()} />
      <Button secondary title={signup ? 'Já tenho conta' : 'Quero criar uma conta'} disabled={busy} onPress={() => { setSignup(!signup); setError(''); }} />
    </>}
    <Link href="/" style={s.label}>Voltar à mesa →</Link>
  </View></ScrollView>;
}
