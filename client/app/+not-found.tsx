import { Link } from 'expo-router';
import { Text, View } from 'react-native';
import { s } from '../src/ui';

export default function NotFound() {
  return <View style={s.page}><Text style={s.heading}>Esta página não existe.</Text><Link href="/" style={s.body}>Voltar à mesa</Link></View>;
}
