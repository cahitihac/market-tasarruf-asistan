import type { ReactNode } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RecommendationLabel } from '@market/contracts';
import { recommendation } from '../lib/presentation';
import { colors } from './theme';

export function Page({ children, refreshing, onRefresh }: { children: ReactNode; refreshing?: boolean; onRefresh?: () => void }) {
  return <SafeAreaView style={styles.page} edges={['top']}><KeyboardAvoidingView style={styles.page}
    behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag"
    refreshControl={onRefresh ? <RefreshControl refreshing={Boolean(refreshing)} onRefresh={onRefresh} tintColor={colors.green} /> : undefined}>
    <View style={styles.column}>{children}</View>
  </ScrollView></KeyboardAvoidingView></SafeAreaView>;
}

export function Header({ eyebrow, title, subtitle, action }: { eyebrow?: string; title: string; subtitle?: string; action?: ReactNode }) {
  return <View style={styles.header}>
    {eyebrow ? <Text style={styles.eyebrow}>{eyebrow.toUpperCase()}</Text> : null}
    <View style={styles.headerRow}><Text style={styles.title}>{title}</Text>{action}</View>
    {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
  </View>;
}

export function Card({ children, onPress, style }: { children: ReactNode; onPress?: () => void; style?: object }) {
  return onPress ? <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [styles.card, style, pressed && styles.pressed]}>{children}</Pressable>
    : <View style={[styles.card, style]}>{children}</View>;
}

export function Button({ label, onPress, kind = 'primary', disabled = false }: { label: string; onPress: () => void;
  kind?: 'primary' | 'secondary' | 'quiet' | 'danger'; disabled?: boolean }) {
  return <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" style={({ pressed }) => [styles.button,
    kind === 'primary' ? styles.primary : kind === 'secondary' ? styles.secondary : kind === 'danger' ? styles.danger : styles.quiet,
    pressed && styles.pressed, disabled && styles.disabled]}>
    <Text style={[styles.buttonText, kind === 'primary' ? styles.primaryText : kind === 'danger' ? styles.dangerText : styles.otherText]}>{label}</Text>
  </Pressable>;
}

export function DealBadge({ label }: { label: RecommendationLabel }) {
  const presentation = recommendation(label);
  const palette = presentation.tone === 'great' ? { background: colors.paleGold, foreground: colors.gold }
    : presentation.tone === 'buy' ? { background: colors.paleGreen, foreground: colors.darkGreen }
      : presentation.tone === 'good' ? { background: colors.paleBlue, foreground: colors.blue }
        : presentation.tone === 'bad' ? { background: colors.paleRed, foreground: colors.red }
          : { background: colors.background, foreground: colors.muted };
  return <View style={[styles.badge, { backgroundColor: palette.background }]}><Text style={[styles.badgeText, { color: palette.foreground }]}>
    {presentation.icon}  {presentation.text}</Text></View>;
}

export function SectionTitle({ title, hint }: { title: string; hint?: string }) {
  return <View style={styles.sectionRow}><Text style={styles.sectionTitle}>{title}</Text>{hint ? <Text style={styles.hint}>{hint}</Text> : null}</View>;
}

export function DataState({ loading, error, empty, emptyTitle, emptyBody, onRetry, children }: { loading: boolean;
  error?: unknown; empty?: boolean; emptyTitle?: string; emptyBody?: string; onRetry: () => void; children: ReactNode }) {
  if (loading) return <View style={styles.state}><ActivityIndicator color={colors.green} size="large" /><Text style={styles.stateBody}>Senin için fırsatları kontrol ediyoruz…</Text></View>;
  if (error) return <View style={styles.state}><Text style={styles.stateIcon}>↻</Text><Text style={styles.stateTitle}>Şu anda bilgileri alamıyoruz</Text>
    <Text style={styles.stateBody}>Bağlantını kontrol edip yeniden deneyebilirsin.</Text>
    <Button label="Yeniden Dene" onPress={onRetry} kind="secondary" /></View>;
  if (empty) return <View style={styles.state}><Text style={styles.stateIcon}>◇</Text><Text style={styles.stateTitle}>{emptyTitle ?? 'Henüz burada bir şey yok'}</Text>
    <Text style={styles.stateBody}>{emptyBody ?? 'Yeni fırsatlar bulunduğunda burada görünecek.'}</Text>
    <Button label="Yenile" onPress={onRetry} kind="secondary" /></View>;
  return <>{children}</>;
}

export const typography = StyleSheet.create({
  h2: { color: colors.ink, fontSize: 20, fontWeight: '700' },
  body: { color: colors.ink, fontSize: 15, lineHeight: 22 },
  muted: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  price: { color: colors.ink, fontSize: 26, fontWeight: '800' },
  caption: { color: colors.muted, fontSize: 12, fontWeight: '600', letterSpacing: 0.2 },
});

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1, paddingHorizontal: 20, paddingBottom: 36 },
  column: { alignSelf: 'center', width: '100%', maxWidth: 680, gap: 18 },
  header: { paddingTop: 24, paddingBottom: 8, gap: 8 },
  eyebrow: { color: colors.green, fontSize: 12, fontWeight: '800', letterSpacing: 2 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  title: { color: colors.ink, fontSize: 32, fontWeight: '800', flexShrink: 1, letterSpacing: -0.8 },
  subtitle: { color: colors.muted, fontSize: 15, lineHeight: 22 },
  card: { backgroundColor: colors.surface, borderRadius: 20, padding: 20, gap: 10, borderWidth: 1, borderColor: colors.line },
  pressed: { opacity: 0.76 },
  button: { minHeight: 46, borderRadius: 14, paddingHorizontal: 16, justifyContent: 'center', alignItems: 'center' },
  primary: { backgroundColor: colors.green }, secondary: { backgroundColor: colors.paleGreen },
  quiet: { backgroundColor: colors.background }, danger: { backgroundColor: colors.paleRed },
  disabled: { opacity: 0.5 },
  buttonText: { fontSize: 14, fontWeight: '700' }, primaryText: { color: '#FFFFFF' },
  otherText: { color: colors.darkGreen }, dangerText: { color: colors.red },
  badge: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7 },
  badgeText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.6 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { color: colors.ink, fontSize: 19, fontWeight: '800' },
  hint: { color: colors.muted, fontSize: 13 },
  state: { alignItems: 'center', justifyContent: 'center', minHeight: 230, padding: 24, gap: 12 },
  stateIcon: { color: colors.green, fontSize: 32 },
  stateTitle: { color: colors.ink, fontSize: 18, fontWeight: '700', textAlign: 'center' },
  stateBody: { color: colors.muted, fontSize: 14, lineHeight: 20, textAlign: 'center' },
});
