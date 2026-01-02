import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/useColorScheme';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ 
        headerShadowVisible: false,
        headerTitleStyle: { fontWeight: '800' },
      }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="tree" options={{ title: 'Family Tree' }} />
        <Stack.Screen name="add-relation" options={{ presentation: 'modal', title: 'Add Relation' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
