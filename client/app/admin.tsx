import { useEffect, useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { Link } from 'expo-router';
import { useAccount } from '../src/AccountContext';
import { Button, s } from '../src/ui';

type User = { id: string; name: string; email: string; role: string; disabled: number };
type Audit = { id: number; action: string; target: string; reason: string; createdAt: number };
export default function Admin() {
  const account = useAccount();
  const [users, setUsers] = useState<User[]>([]), [events, setEvents] = useState<Audit[]>([]), [offset, setOffset] = useState(0);
  const [error, setError] = useState(''), [reason, setReason] = useState(''), [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<{ user: User; action: 'ban' | 'unban' | 'revoke' } | null>(null);
  async function load() {
    setBusy(true);
    try { const [list, audit] = await Promise.all([account.request(`/api/admin/users?offset=${offset}`), account.request('/api/admin/audit')]); setUsers(list.users); setEvents(audit.events); }
    catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível carregar a administração.'); }
    finally { setBusy(false); }
  }
  useEffect(() => { if (account.user?.role === 'admin') void load(); }, [account.user?.id, offset]);
  async function apply() {
    if (!confirm) return;
    setBusy(true); setError('');
    try { await account.request(`/api/admin/users/${confirm.user.id}/${confirm.action}`, { reason }); setConfirm(null); setReason(''); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : 'A operação falhou.'); }
    finally { setBusy(false); }
  }
  if (account.user?.role !== 'admin') return <View style={s.page}><Text style={s.heading}>Acesso reservado</Text><Link href="/account" style={s.label}>Entrar numa conta com permissões</Link></View>;
  return <ScrollView contentContainerStyle={s.page}><Text style={s.heading}>Administração</Text>
    {!!error && <Text accessibilityRole="alert" style={s.body}>{error}</Text>}
    <Button title="Atualizar" disabled={busy} onPress={() => void load()} />
    {confirm && <View style={s.notice}><Text style={s.label}>Confirmar {confirm.action === 'ban' ? 'suspensão' : confirm.action === 'unban' ? 'reativação' : 'fim das sessões'} de {confirm.user.name}?</Text><TextInput accessibilityLabel="Motivo da moderação" placeholder="Motivo (obrigatório)" value={reason} onChangeText={setReason} maxLength={200} style={s.input} /><Button title="Confirmar ação" disabled={busy || reason.trim().length < 3} onPress={() => void apply()} /><Button secondary title="Cancelar" disabled={busy} onPress={() => setConfirm(null)} /></View>}
    {users.map(user => <View key={user.id} style={s.panel}><Text style={s.label}>{user.name} · {user.role === 'admin' ? 'Administrador' : 'Utilizador'}{user.disabled ? ' · Suspenso' : ''}</Text><Text style={s.body}>{user.email}</Text>{user.id !== account.user!.id && <View style={s.row}><Button title={user.disabled ? 'Reativar' : 'Suspender'} disabled={busy} onPress={() => setConfirm({ user, action: user.disabled ? 'unban' : 'ban' })} /><Button secondary title="Terminar sessões" disabled={busy} onPress={() => setConfirm({ user, action: 'revoke' })} /></View>}</View>)}
    <View style={s.row}><Button title="Anteriores" disabled={busy || offset === 0} onPress={() => setOffset(n => Math.max(0, n - 50))} /><Button title="Seguintes" disabled={busy || users.length < 50} onPress={() => setOffset(n => n + 50)} /></View>
    <Text style={s.heading}>Últimas ações administrativas</Text>
    {events.map(event => <View key={event.id} style={s.panel}><Text style={s.label}>{({ ban: 'Suspensão', unban: 'Reativação', revoke: 'Fim de sessões', promote: 'Atribuição de administração' } as Record<string, string>)[event.action] ?? 'Ação administrativa'}</Text><Text style={s.body}>{event.reason} · {new Date(event.createdAt).toLocaleString('pt-PT')}</Text></View>)}
  </ScrollView>;
}
