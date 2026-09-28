import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colors } from '../src/ui/theme';
import { AuthProvider, useAuth } from '../src/auth/AuthProvider';
import { AuthScreen } from '../src/auth/AuthScreen';
import { PushNotificationRouter } from '../src/push/PushNotificationRouter';

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 15000, retry: 1 } } });

function AppStack() {
  const auth = useAuth();
  if (!auth.user) return <AuthScreen />;
  return <>
    <PushNotificationRouter />
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="need-form" options={{ presentation: 'modal' }} />
      <Stack.Screen name="needs/[id]" />
      <Stack.Screen name="deals/[id]" />
    </Stack>
  </>;
}

export default function RootLayout() {
  return <SafeAreaProvider><QueryClientProvider client={queryClient}>
    <AuthProvider>
      <StatusBar style="dark" />
      <AppStack />
    </AuthProvider>
  </QueryClientProvider></SafeAreaProvider>;
}
