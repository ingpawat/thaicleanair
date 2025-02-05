import { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme, Platform } from 'react-native';

export type ThemeType = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: ThemeType;
  currentTheme: 'light' | 'dark';
  toggleTheme: () => void;
  colors: {
    [key: string]: string;
    background: string;
    card: string;
    cardBlur: string;
    text: string;
    subText: string;
    border: string;
    primary: string;
    success: string;
    warning: string;
    error: string;
  };
}

const lightColors = {
  background: '#F2F2F7',
  card: 'rgba(255, 255, 255, 0.8)',
  cardBlur: 'rgba(242, 242, 247, 0.9)',
  text: '#000000',
  subText: 'rgba(60, 60, 67, 0.6)',
  border: 'rgba(0, 0, 0, 0.1)',
};

const darkColors = {
  background: '#000000',
  card: 'rgba(28, 28, 30, 0.8)',
  cardBlur: 'rgba(44, 44, 46, 0.9)',
  text: '#FFFFFF',
  subText: 'rgba(255, 255, 255, 0.6)',
  border: 'rgba(255, 255, 255, 0.1)',
};

const constantColors = {
  primary: '#007AFF',
  success: '#34C759',
  warning: '#FF9500',
  error: '#FF3B30',
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [theme, setTheme] = useState<ThemeType>('system');

  const currentTheme = theme === 'system' ? systemColorScheme || 'light' : theme;

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('theme');
      if (savedTheme) {
        setTheme(savedTheme as ThemeType);
      }
    } catch (error) {
      console.error('Error loading theme:', error);
    }
  };

  const saveTheme = async (newTheme: ThemeType) => {
    try {
      await AsyncStorage.setItem('theme', newTheme);
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  };

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light';
    setTheme(newTheme);
    saveTheme(newTheme);
  };

  const colors = {
    ...(currentTheme === 'dark' ? darkColors : lightColors),
    ...constantColors,
  };

  return (
    <ThemeContext.Provider value={{ theme, currentTheme, toggleTheme, colors }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}