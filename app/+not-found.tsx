import { Link, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '@/lib/theme';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <View style={styles.container}>
        <Text style={styles.title}>404</Text>
        <Text style={styles.text}>This screen doesn't exist.</Text>
        <Link href="/" asChild>
          <Text style={styles.link}>Go to home screen</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: colors.background,
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 48,
    color: colors.primary[500],
    marginBottom: 8,
  },
  text: {
    fontFamily: 'Inter_400Regular',
    fontSize: 18,
    color: colors.secondary[600],
    marginBottom: 24,
  },
  link: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: colors.primary[500],
  },
});
