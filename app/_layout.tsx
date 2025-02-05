import { Stack } from 'expo-router';
import { TouchableOpacity, Platform, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeProvider, useTheme } from './context/theme';

function ThemeToggleButton() {
  const { theme, toggleTheme, colors } = useTheme();
  const iconName = theme === 'light' ? 'sunny' : theme === 'dark' ? 'moon' : 'contrast';

  return (
    <TouchableOpacity 
      onPress={toggleTheme} 
      style={[
        styles.themeButton, 
        { backgroundColor: colors.cardBlur }
      ]}
    >
      <Ionicons 
        name={iconName} 
        size={24} 
        color={colors.text} 
      />
    </TouchableOpacity>
  );
}

function StackNavigator() {
  const { currentTheme, colors } = useTheme();

  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: 'Air Quality',
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerTintColor: colors.text,
          headerTitleStyle: {
            fontWeight: '600',
            fontSize: 18,
            color: colors.text,
            fontFamily: Platform.select({
              ios: 'system',
              android: 'sans-serif-medium',
              default: 'system-ui'
            }),
          },
          headerRight: () => <ThemeToggleButton />,
          headerShadowVisible: false,
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <StackNavigator />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  themeButton: {
    marginRight: 15,
    padding: 8,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});