import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { api, ApiError, friendlyError } from '../api/client';
import { Button, Card, Header, Page, typography } from '../ui/components';
import { colors } from '../ui/theme';
import { useAuth } from './AuthProvider';

type Mode = 'welcome' | 'login' | 'register' | 'forgot' | 'reset';

function Field({ label, value, onChangeText, secure = false, autoComplete }: { label: string; value: string;
  onChangeText: (value: string) => void; secure?: boolean; autoComplete?: 'email' | 'password' | 'name' }) {
  return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput accessibilityLabel={label}
    value={value} onChangeText={onChangeText} autoCapitalize="none" autoComplete={autoComplete}
    secureTextEntry={secure} placeholderTextColor="#84958C" style={styles.input} /></View>;
}

export function AuthScreen() {
  const auth = useAuth();
  const [mode, setMode] = useState<Mode>('welcome');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [success, setSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isRegister = mode === 'register';

  const submit = async () => {
    setError(null);
    setSuccess(null);
    if (!email.trim() || !password) { setError('E-posta ve şifre gerekli.'); return; }
    if (password.length < 8) { setError('Şifre en az 8 karakter olmalı.'); return; }
    setBusy(true);
    try {
      if (isRegister) await auth.register({ email: email.trim(), password, displayName: displayName.trim() || undefined });
      else await auth.signIn({ email: email.trim(), password });
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : friendlyError(caught));
    } finally { setBusy(false); }
  };

  const submitForgotPassword = async () => {
    setError(null); setSuccess(null);
    if (!email.trim()) { setError('E-posta gerekli.'); return; }
    setBusy(true);
    try {
      await api.forgotPassword({ email: email.trim() });
      setSuccess('E-posta adresi kayıtlıysa şifre sıfırlama bağlantısı gönderildi.');
      setMode('reset');
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : friendlyError(caught));
    } finally { setBusy(false); }
  };

  const submitResetPassword = async () => {
    setError(null); setSuccess(null);
    if (!resetToken.trim() || !password) { setError('Sıfırlama kodu ve yeni şifre gerekli.'); return; }
    if (password.length < 8) { setError('Şifre en az 8 karakter olmalı.'); return; }
    setBusy(true);
    try {
      await api.resetPassword({ token: resetToken.trim(), password });
      setSuccess('Şifren güncellendi. Yeni şifrenle giriş yapabilirsin.');
      setPassword('');
      setResetToken('');
      setMode('login');
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : friendlyError(caught));
    } finally { setBusy(false); }
  };

  if (auth.loading) return <Page><View style={styles.loading}><ActivityIndicator color={colors.green} size="large" /></View></Page>;
  if (mode === 'welcome') return <Page>
    <Header eyebrow="MARKET ASİSTANI" title="Hesabına devam et" subtitle="Takiplerin, fırsatların ve bildirimlerin yalnızca sana ait kalır." />
    <Card style={styles.hero}><Text style={styles.heroTitle}>Kişisel fiyat takip alanın hazır.</Text>
      <Text style={styles.heroBody}>Oturum aç veya yeni hesap oluştur; takibe aldığın ürünler bu hesaba bağlı tutulur.</Text></Card>
    <Button label="Giriş Yap" onPress={() => setMode('login')} />
    <Button label="Hesap Oluştur" onPress={() => setMode('register')} kind="secondary" />
  </Page>;

  if (mode === 'forgot') return <Page>
    <Header eyebrow="ŞİFRE YARDIMI" title="Şifreni sıfırla" subtitle="E-postanı yaz; kayıtlıysa yerel geliştirme bağlantısı oluşturulur." />
    <Card>
      <Field label="E-posta" value={email} onChangeText={setEmail} autoComplete="email" />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {success ? <Text style={styles.success}>{success}</Text> : null}
      <Button label={busy ? 'Gönderiliyor…' : 'Sıfırlama Bağlantısı Gönder'} onPress={submitForgotPassword} disabled={busy} />
    </Card>
    <Button label="Sıfırlama Kodum Var" onPress={() => setMode('reset')} kind="secondary" />
    <Button label="Geri" onPress={() => setMode('login')} kind="quiet" />
  </Page>;

  if (mode === 'reset') return <Page>
    <Header eyebrow="YENİ ŞİFRE" title="Şifreyi güncelle" subtitle="Geliştirme bağlantısındaki token değerini kullan." />
    <Card>
      <Field label="Sıfırlama Kodu" value={resetToken} onChangeText={setResetToken} />
      <Field label="Yeni Şifre" value={password} onChangeText={setPassword} secure autoComplete="password" />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {success ? <Text style={styles.success}>{success}</Text> : null}
      <Button label={busy ? 'Güncelleniyor…' : 'Şifreyi Güncelle'} onPress={submitResetPassword} disabled={busy} />
    </Card>
    <Button label="Girişe Dön" onPress={() => setMode('login')} kind="quiet" />
  </Page>;

  return <Page>
    <Header eyebrow={isRegister ? 'YENİ HESAP' : 'TEKRAR HOŞ GELDİN'} title={isRegister ? 'Hesap oluştur' : 'Giriş yap'}
      subtitle={isRegister ? 'E-posta ve şifreyle hızlıca başlayabilirsin.' : 'Takiplerine kaldığın yerden devam et.'} />
    <Card>
      {isRegister ? <Field label="Adın" value={displayName} onChangeText={setDisplayName} autoComplete="name" /> : null}
      <Field label="E-posta" value={email} onChangeText={setEmail} autoComplete="email" />
      <Field label="Şifre" value={password} onChangeText={setPassword} secure autoComplete="password" />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button label={busy ? 'Kontrol ediliyor…' : isRegister ? 'Hesap Oluştur' : 'Giriş Yap'} onPress={submit} disabled={busy} />
    </Card>
    {!isRegister ? <Pressable accessibilityRole="button" onPress={() => setMode('forgot')} style={styles.switch}>
      <Text style={typography.muted}>Şifreni mi unuttun?</Text>
    </Pressable> : null}
    <Pressable accessibilityRole="button" onPress={() => setMode(isRegister ? 'login' : 'register')} style={styles.switch}>
      <Text style={typography.muted}>{isRegister ? 'Zaten hesabın var mı? Giriş yap' : 'Hesabın yok mu? Hesap oluştur'}</Text>
    </Pressable>
    <Button label="Geri" onPress={() => setMode('welcome')} kind="quiet" />
  </Page>;
}

const styles = StyleSheet.create({
  loading: { flex: 1, minHeight: 360, alignItems: 'center', justifyContent: 'center' },
  hero: { backgroundColor: colors.darkGreen, borderColor: colors.darkGreen },
  heroTitle: { color: '#FFFFFF', fontSize: 27, fontWeight: '900', lineHeight: 34 },
  heroBody: { color: '#D6EBE0', fontSize: 15, lineHeight: 22 },
  field: { gap: 7 },
  label: { color: colors.ink, fontSize: 14, fontWeight: '800' },
  input: { minHeight: 48, paddingHorizontal: 14, color: colors.ink, fontSize: 15,
    borderWidth: 1, borderColor: colors.line, borderRadius: 12, backgroundColor: colors.surface },
  error: { color: colors.red, fontSize: 13, lineHeight: 19 },
  success: { color: colors.green, fontSize: 13, lineHeight: 19, fontWeight: '700' },
  switch: { alignSelf: 'center', padding: 8 },
});
