import { Link, Stack } from 'expo-router';
import { StyleSheet, Text, View, Platform } from 'react-native';
import { useTheme } from './context/theme';

export default function NotFoundScreen() {
  const { currentTheme } = useTheme();
  const theme = {
    background: currentTheme === 'dark' ? '#000' : '#f0f0f0',
    text: currentTheme === 'dark' ? '#fff' : '#000',
    link: '#007AFF',
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Text style={[styles.title, { color: theme.text }]}>This page doesn't exist.</Text>
        <Link href="/" style={styles.link}>
          <Text style={[styles.linkText, { color: theme.link }]}>Go to home screen!</Text>
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
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
    flexWrap: 'wrap',
    fontFamily: Platform.select({
      ios: '-apple-system',
      android: 'sans-serif-medium',
      default: 'system-ui'
    }),
  },
  link: {
    marginTop: 16,
    paddingVertical: 8,
  },
  linkText: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    fontFamily: Platform.select({
      ios: '-apple-system',
      android: 'sans-serif-medium',
      default: 'system-ui'
    }),
  },
});
