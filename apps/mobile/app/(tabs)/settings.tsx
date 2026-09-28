import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { api, ApiError, friendlyError } from '../../src/api/client';
import { keys } from '../../src/api/keys';
import { useAuth } from '../../src/auth/AuthProvider';
import { currentPushStatus, registerCurrentDeviceForPush, type PushStatus } from '../../src/push/notifications';
import { Button, Card, DataState, Header, Page, SectionTitle, typography } from '../../src/ui/components';
import { colors } from '../../src/ui/theme';

function Field({ label, value, onChangeText, secure = false }: { label: string; value: string;
  onChangeText: (value: string) => void; secure?: boolean }) {
  return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput accessibilityLabel={label}
    value={value} onChangeText={onChangeText} autoCapitalize="none" secureTextEntry={secure}
    placeholderTextColor="#84958C" style={styles.input} /></View>;
}

function message(error: unknown) {
  return error instanceof ApiError ? error.message : friendlyError(error);
}

function pushStatusLabel(status: PushStatus, enabled: boolean) {
  if (status === 'unsupported') return 'Unsupported';
  if (status === 'denied') return 'Permission denied';
  if (status === 'enabled' && enabled) return 'Enabled';
  return 'Disabled';
}

export default function SettingsScreen() {
  const auth = useAuth();
  const client = useQueryClient();
  const health = useQuery({ queryKey: keys.health, queryFn: api.health, retry: false });
  const sessions = useQuery({ queryKey: keys.sessions, queryFn: api.sessions });
  const pushDevices = useQuery({ queryKey: keys.pushDevices, queryFn: api.pushDevices });
  const preferences = useQuery({ queryKey: keys.notificationPreferences, queryFn: api.notificationPreferences });
  const [pushStatus, setPushStatus] = useState<PushStatus>('disabled');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refreshAccount = async () => {
    const current = await api.me();
    auth.updateUser(current.user);
    await client.invalidateQueries({ queryKey: keys.sessions });
  };
  const refreshPushStatus = async () => {
    setPushStatus(await currentPushStatus());
    await Promise.all([
      client.invalidateQueries({ queryKey: keys.pushDevices }),
      client.invalidateQueries({ queryKey: keys.notificationPreferences }),
    ]);
  };

  useEffect(() => { void currentPushStatus().then(setPushStatus); }, []);

  const resendVerification = useMutation({ mutationFn: api.resendVerification,
    onSuccess: () => { setError(null); setStatus('Doğrulama bağlantısı oluşturuldu. Geliştirme e-posta kutusunu kontrol et.'); },
    onError: caught => { setStatus(null); setError(message(caught)); } });
  const changePassword = useMutation({ mutationFn: api.changePassword,
    onSuccess: () => { setError(null); setStatus('Şifren güncellendi. Diğer oturumların kapatıldı.');
      setCurrentPassword(''); setNewPassword(''); void client.invalidateQueries({ queryKey: keys.sessions }); },
    onError: caught => { setStatus(null); setError(message(caught)); } });
  const revoke = useMutation({ mutationFn: api.revokeSession,
    onSuccess: () => { setError(null); setStatus('Oturum kapatıldı.'); void client.invalidateQueries({ queryKey: keys.sessions }); },
    onError: caught => { setStatus(null); setError(message(caught)); } });
  const logoutOthers = useMutation({ mutationFn: () => api.logoutAll(false),
    onSuccess: () => { setError(null); setStatus('Diğer oturumların kapatıldı.'); void client.invalidateQueries({ queryKey: keys.sessions }); },
    onError: caught => { setStatus(null); setError(message(caught)); } });
  const logoutAll = useMutation({ mutationFn: () => api.logoutAll(true),
    onSuccess: () => { void auth.clearLocalSession(); },
    onError: caught => { setStatus(null); setError(message(caught)); } });
  const deleteAccount = useMutation({ mutationFn: api.deleteAccount,
    onSuccess: () => { void auth.clearLocalSession(); },
    onError: caught => { setStatus(null); setError(message(caught)); } });
  const enablePush = useMutation({ mutationFn: registerCurrentDeviceForPush,
    onSuccess: result => {
      setError(null);
      setStatus(result.status === 'enabled' ? 'Bildirimler açıldı.' :
        result.status === 'denied' ? 'Bildirim izni kapalı görünüyor.' : 'Bu cihazda anlık bildirim desteklenmiyor.');
      void refreshPushStatus();
    },
    onError: caught => { setStatus(null); setError(message(caught)); } });
  const updatePreferences = useMutation({ mutationFn: api.updateNotificationPreferences,
    onSuccess: () => { setError(null); setStatus('Bildirim tercihlerin güncellendi.'); void refreshPushStatus(); },
    onError: caught => { setStatus(null); setError(message(caught)); } });
  const disablePush = useMutation({ mutationFn: async () => {
    await api.updateNotificationPreferences({ dealAlertsEnabled: false, greatDealEnabled: false, buyEnabled: false });
    const devices = await api.pushDevices();
    await Promise.all(devices.devices.map(device => api.unregisterPushDevice(device.id)));
  }, onSuccess: () => { setError(null); setStatus('Bildirimler kapatıldı.'); void refreshPushStatus(); },
  onError: caught => { setStatus(null); setError(message(caught)); } });
  const requestEnablePush = () => {
    Alert.alert('İyi bir fiyat yakaladığımızda haber verelim mi?',
      'Takip ettiğin ürünlerde gerçekten iyi bir fırsat oluştuğunda bildirim gönderebiliriz.',
      [{ text: 'Şimdilik Değil', style: 'cancel' }, { text: 'Bildirimleri Aç', onPress: () => enablePush.mutate() }]);
  };
  const prefs = preferences.data;
  const pushEnabled = Boolean(prefs?.dealAlertsEnabled && pushStatus === 'enabled' && (pushDevices.data?.devices.length ?? 0) > 0);

  return <Page>
    <Header eyebrow="HESABIN" title="Ayarlar" subtitle="Hesap güvenliğini ve oturumlarını buradan yönet." />
    {status ? <Text style={styles.success}>{status}</Text> : null}
    {error ? <Text style={styles.error}>{error}</Text> : null}

    <SectionTitle title="Account" />
    <Card>
      <Text style={typography.h2}>{auth.user?.displayName ?? 'Market alışverişçisi'}</Text>
      <Text style={typography.muted}>{auth.user?.email}</Text>
      <Text style={[styles.status, { color: auth.user?.emailVerifiedAt ? colors.green : colors.gold }]}>
        {auth.user?.emailVerifiedAt ? '● E-posta doğrulandı' : '● E-posta doğrulanmadı'}
      </Text>
      {!auth.user?.emailVerifiedAt ? <Button label={resendVerification.isPending ? 'Gönderiliyor…' : 'Doğrulama Bağlantısı Gönder'}
        onPress={() => resendVerification.mutate()} disabled={resendVerification.isPending} kind="secondary" /> : null}
      <Button label="Hesabı Yenile" onPress={() => { void refreshAccount(); }} kind="quiet" />
    </Card>

    <SectionTitle title="Push notifications" />
    <Card>
      <View style={styles.row}><Text style={typography.h2}>Push notifications</Text>
        <Text style={[styles.badge, pushEnabled ? styles.enabledBadge : styles.neutralBadge]}>
          {pushStatusLabel(pushStatus, pushEnabled)}</Text></View>
      <Text style={typography.muted}>
        {pushStatus === 'unsupported' ? 'Cihaz push bildirimleri desteklenen iOS veya Android uygulamasında çalışır.' :
          pushStatus === 'denied' ? 'Bildirim izni kapalı. İstersen cihaz ayarlarından tekrar açabilirsin.' :
          'Takip ettiğin ürünlerde gerçekten iyi bir fırsat olduğunda haber verebiliriz.'}</Text>
      <DataState loading={preferences.isPending || pushDevices.isPending} error={preferences.error ?? pushDevices.error}
        onRetry={() => { void refreshPushStatus(); }}>
        <View style={styles.preferenceRow}><Text style={typography.body}>GREAT_DEAL</Text>
          <Switch value={Boolean(prefs?.greatDealEnabled)} disabled={!prefs?.dealAlertsEnabled || updatePreferences.isPending}
            onValueChange={greatDealEnabled => updatePreferences.mutate({ greatDealEnabled })} /></View>
        <View style={styles.preferenceRow}><Text style={typography.body}>BUY</Text>
          <Switch value={Boolean(prefs?.buyEnabled)} disabled={!prefs?.dealAlertsEnabled || updatePreferences.isPending}
            onValueChange={buyEnabled => updatePreferences.mutate({ buyEnabled })} /></View>
      </DataState>
      <View style={styles.buttonRow}>
        <Button label={enablePush.isPending ? 'Açılıyor…' : 'Bildirimleri Aç'} onPress={requestEnablePush}
          disabled={enablePush.isPending || pushStatus === 'unsupported'} />
        <Button label={disablePush.isPending ? 'Kapatılıyor…' : 'Bildirimleri Kapat'} kind="secondary"
          onPress={() => disablePush.mutate()} disabled={disablePush.isPending || !prefs?.dealAlertsEnabled} />
      </View>
    </Card>

    <SectionTitle title="Security" />
    <Card>
      <Field label="Mevcut Şifre" value={currentPassword} onChangeText={setCurrentPassword} secure />
      <Field label="Yeni Şifre" value={newPassword} onChangeText={setNewPassword} secure />
      <Button label={changePassword.isPending ? 'Güncelleniyor…' : 'Şifreyi Değiştir'} disabled={changePassword.isPending}
        onPress={() => changePassword.mutate({ currentPassword, newPassword })} />
    </Card>

    <SectionTitle title="Active Sessions" />
    <DataState loading={sessions.isPending} error={sessions.error} empty={sessions.data?.sessions.length === 0}
      emptyTitle="Aktif oturum yok" onRetry={() => { void sessions.refetch(); }}>
      {sessions.data?.sessions.map(session => <Card key={session.id}>
        <View style={styles.row}><Text style={typography.h2}>{session.current ? 'Bu oturum' : 'Diğer oturum'}</Text>
          <Text style={styles.badge}>{session.revokedAt ? 'Kapalı' : session.current ? 'Mevcut' : 'Aktif'}</Text></View>
        <Text style={typography.muted}>{session.clientLabel ?? 'Bilinmeyen cihaz'}</Text>
        <Text style={typography.caption}>Son kullanım: {new Date(session.lastUsedAt).toLocaleString('tr-TR')}</Text>
        {!session.current && !session.revokedAt ? <Button label="Bu Oturumu Kapat" kind="secondary"
          onPress={() => revoke.mutate(session.id)} disabled={revoke.isPending} /> : null}
      </Card>)}
    </DataState>
    <Button label="Diğer Oturumları Kapat" kind="secondary" onPress={() => logoutOthers.mutate()} disabled={logoutOthers.isPending} />
    <Button label="Tüm Oturumlardan Çık" kind="danger" onPress={() => logoutAll.mutate()} disabled={logoutAll.isPending} />

    <SectionTitle title="Veri bağlantısı" />
    <Card><Text style={typography.body}>Fiyat servisi</Text>
      <Text style={[styles.status, { color: health.data?.status === 'ok' ? colors.green : colors.red }]}>
        {health.isPending ? 'Kontrol ediliyor…' : health.data?.status === 'ok' ? '● Bağlı' : '● Bağlantı yok'}</Text>
      {health.error ? <Text style={styles.error}>Fiyat servisine şu anda ulaşılamıyor.</Text> : null}
      <Button label="Bağlantıyı Kontrol Et" onPress={() => { void health.refetch(); }} kind="secondary" /></Card>

    <SectionTitle title="Account Actions" />
    <Card style={styles.dangerZone}>
      <Text style={typography.h2}>Hesabı sil</Text>
      <Text style={typography.muted}>Bu işlem hesabı devre dışı bırakır, e-postanı anonimleştirir ve tüm oturumlarını kapatır.</Text>
      <Field label="Şifre" value={deletePassword} onChangeText={setDeletePassword} secure />
      <Field label="Onay" value={deleteConfirmation} onChangeText={setDeleteConfirmation} />
      <Button label={deleteAccount.isPending ? 'Siliniyor…' : 'Hesabı Sil'} kind="danger"
        disabled={deleteAccount.isPending || deleteConfirmation !== 'DELETE MY ACCOUNT'}
        onPress={() => deleteAccount.mutate({ currentPassword: deletePassword,
          confirmation: deleteConfirmation as 'DELETE MY ACCOUNT' })} />
      {deleteConfirmation !== 'DELETE MY ACCOUNT' ? <Text style={typography.caption}>Onay alanına DELETE MY ACCOUNT yaz.</Text> : null}
    </Card>

    <Button label="Çıkış Yap" onPress={() => { void auth.signOut(); }} kind="danger" />
  </Page>;
}

const styles = StyleSheet.create({
  field: { gap: 7 },
  label: { color: colors.ink, fontSize: 14, fontWeight: '800' },
  input: { minHeight: 48, paddingHorizontal: 14, color: colors.ink, fontSize: 15,
    borderWidth: 1, borderColor: colors.line, borderRadius: 12, backgroundColor: colors.surface },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  preferenceRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  buttonRow: { gap: 10 },
  status: { fontSize: 14, fontWeight: '800' },
  badge: { color: colors.darkGreen, backgroundColor: colors.paleGreen, paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 999, fontSize: 12, fontWeight: '800' },
  enabledBadge: { color: colors.darkGreen, backgroundColor: colors.paleGreen },
  neutralBadge: { color: colors.ink, backgroundColor: colors.background },
  success: { color: colors.green, fontSize: 13, fontWeight: '800' },
  error: { color: colors.red, fontSize: 13, lineHeight: 19 },
  dangerZone: { borderColor: colors.red },
});
