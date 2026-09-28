import { useQuery } from '@tanstack/react-query';
import { StyleSheet, Text } from 'react-native';
import { api } from '../../src/api/client';
import { useAuth } from '../../src/auth/AuthProvider';
import { keys } from '../../src/api/keys';
import { Button, Card, Header, Page, SectionTitle, typography } from '../../src/ui/components';
import { colors } from '../../src/ui/theme';

export default function SettingsScreen() {
  const auth = useAuth();
  const health = useQuery({ queryKey: keys.health, queryFn: api.health, retry: false });
  return <Page>
    <Header eyebrow="HESABIN" title="Ayarlar" subtitle="Market alışveriş deneyimini buradan yönet." />
    <SectionTitle title="Profil" />
    <Card><Text style={typography.h2}>{auth.user?.displayName ?? 'Market alışverişçisi'}</Text>
      <Text style={typography.muted}>{auth.user?.email}</Text>
      <Text style={typography.muted}>Tercihlerin ve takiplerin bu profile bağlı.</Text></Card>
    <SectionTitle title="Veri bağlantısı" />
    <Card><Text style={typography.body}>Fiyat servisi</Text>
      <Text style={[styles.status, { color: health.data?.status === 'ok' ? colors.green : colors.red }]}>
        {health.isPending ? 'Kontrol ediliyor…' : health.data?.status === 'ok' ? '● Bağlı' : '● Bağlantı yok'}</Text>
      {health.error ? <Text style={styles.error}>Fiyat servisine şu anda ulaşılamıyor.</Text> : null}
      <Button label="Bağlantıyı Kontrol Et" onPress={() => { void health.refetch(); }} kind="secondary" /></Card>
    <Button label="Çıkış Yap" onPress={() => { void auth.signOut(); }} kind="danger" />
    <Card><Text style={typography.h2}>Market Asistanı Hakkında</Text>
      <Text style={typography.muted}>İhtiyaçlarını takip eder, güncel fiyatları karşılaştırır ve alışveriş için doğru zamanı anlamana yardımcı olur.</Text></Card>
  </Page>;
}

const styles = StyleSheet.create({ status: { fontSize: 14, fontWeight: '800' }, error: { color: colors.red, fontSize: 12 } });
