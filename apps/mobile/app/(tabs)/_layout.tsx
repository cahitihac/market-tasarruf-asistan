import { useQuery } from '@tanstack/react-query';
import { Tabs } from 'expo-router';
import { Text, type ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../../src/api/client';
import { keys } from '../../src/api/keys';
import { colors } from '../../src/ui/theme';

function TabIcon({ symbol, color }: { symbol: string; color: ColorValue }) {
  return <Text style={{ color, fontSize: 21, fontWeight: '700' }}>{symbol}</Text>;
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const notifications = useQuery({ queryKey: keys.notifications, queryFn: api.notifications, refetchInterval: 30000 });
  const unread = notifications.data?.notifications.filter(item => !item.readAt).length ?? 0;
  return <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.green,
    tabBarInactiveTintColor: colors.muted, tabBarStyle: { backgroundColor: '#FFFFFF', borderTopColor: colors.line,
      height: 58 + insets.bottom, paddingBottom: insets.bottom },
    tabBarLabelStyle: { fontSize: 10, fontWeight: '700', paddingBottom: 6 } }}>
    <Tabs.Screen name="index" options={{ title: 'Ana Sayfa', tabBarIcon: ({ color }) => <TabIcon symbol="⌂" color={color} /> }} />
    <Tabs.Screen name="needs" options={{ title: 'Takiplerim', tabBarIcon: ({ color }) => <TabIcon symbol="☷" color={color} /> }} />
    <Tabs.Screen name="deals" options={{ title: 'Fırsatlar', tabBarIcon: ({ color }) => <TabIcon symbol="◇" color={color} /> }} />
    <Tabs.Screen name="notifications" options={{ title: 'Bildirimler', tabBarBadge: unread || undefined,
      tabBarIcon: ({ color }) => <TabIcon symbol="◉" color={color} /> }} />
    <Tabs.Screen name="settings" options={{ title: 'Ayarlar', tabBarIcon: ({ color }) => <TabIcon symbol="⚙" color={color} /> }} />
  </Tabs>;
}
