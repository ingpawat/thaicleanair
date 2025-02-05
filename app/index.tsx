import { View, Text, TouchableOpacity, Platform, StyleSheet, Animated, ActivityIndicator, Dimensions } from 'react-native';
import { 
  FadeIn, 
  FadeOut, 
  useAnimatedStyle, 
  withSpring, 
  withTiming 
} from 'react-native-reanimated';
import { useEffect, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from './context/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';

interface AirQualityData {
  aqi: number;
  station: string;
  temperature: number;
  humidity: number;
  lastUpdate: string;
}

interface WAQIResponse {
  status: string;
  data: {
    aqi: number;
    idx: number;
    city: {
      name: string;
      geo: number[];
    };
    iaqi: {
      pm25: { v: number };
      pm10: { v: number };
      o3: { v: number };
      no2: { v: number };
      so2: { v: number };
      co: { v: number };
      t: { v: number };
      h: { v: number };
    };
    time: {
      iso: string;
    };
  };
}

function getAQIColor(aqiValue: number) {
  if (aqiValue >= 0 && aqiValue <= 50) {
    return {
      color: '#00A651',
      level: 'Good'
    };
  } else if (aqiValue <= 100) {
    return {
      color: '#FFF200',
      level: 'Moderate'
    };
  } else if (aqiValue <= 150) {
    return {
      color: '#F7941D',
      level: 'Unhealthy for Sensitive Groups'
    };
  } else if (aqiValue <= 200) {
    return {
      color: '#ED1C24',
      level: 'Unhealthy'
    };
  } else if (aqiValue <= 300) {
    return {
      color: '#662D91',
      level: 'Very Unhealthy'
    };
  } else {
    return {
      color: '#800000',
      level: 'Hazardous'
    };
  }
}

const createStyles = (colors: any, width: number) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: colors.background,
  },
  card: {
    flex: 1,
    borderRadius: 24,
    backgroundColor: colors.card,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: colors.text,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  content: {
    flex: 1,
    padding: width * 0.06,
    gap: width * 0.06,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
  },
  stationName: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: colors.subText,
    marginTop: 4,
  },
  aqiContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  aqiValue: {
    fontSize: 120,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -2,
  },
  status: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.text,
    marginTop: 8,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statBox: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    backgroundColor: colors.cardBlur,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 13,
    color: colors.subText,
    fontWeight: '500',
  },
  statValue: {
    fontSize: 20,
    color: colors.text,
    fontWeight: '600',
  },
  refreshButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.cardBlur,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
    marginTop: 8,
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingText: {
    color: colors.subText,
    fontSize: 16,
    textAlign: 'center',
  },
  errorText: {
    color: colors.error,
    fontSize: 16,
    textAlign: 'center',
    marginVertical: 20,
  },
  lastUpdate: {
    color: colors.subText,
    fontSize: 13,
    textAlign: 'center',
  },
  aqiGradient: {
    flex: 1,
  },
  stationInfo: {
    flex: 1,
  },
});

const useStyles = () => {
  const { colors } = useTheme();
  const { width } = Dimensions.get('window');
  return createStyles(colors, width);
};

export default function AirQualityScreen() {
  const [airData, setAirData] = useState<AirQualityData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);
  const { colors } = useTheme();
  const styles = useStyles();

  const spinValue = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        damping: 15,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  const handleRefresh = async () => {
    if (!isRefreshing && coordinates) {
      // Only use haptics on native platforms
      if (Platform.OS !== 'web') {
        try {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } catch (error) {
          console.log('Haptics not available');
        }
      }

      setIsRefreshing(true);
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }).start(() => {
        spinValue.setValue(0);
      });
      fetchAirData(coordinates.latitude, coordinates.longitude)
        .finally(() => {
          setIsRefreshing(false);
        });
    }
  };

  const getLocation = async () => {
    try {
      // Check for cached coordinates
      const cachedCoords = await AsyncStorage.getItem('lastCoordinates');
      if (cachedCoords) {
        const coords = JSON.parse(cachedCoords);
        setCoordinates(coords);
      }

      // Fallback coordinates for Bangkok
      const fallbackCoords = { latitude: 13.7563, longitude: 100.5018 };

      if (!cachedCoords) {
        // Save fallback coordinates if no cached coordinates
        await AsyncStorage.setItem('lastCoordinates', JSON.stringify(fallbackCoords));
        setCoordinates(fallbackCoords);
      }
    } catch (error) {
      console.error('Error getting location:', error);
      setError('Unable to get location. Please try again.');
    }
  };

  const fetchAirData = async (latitude: number, longitude: number): Promise<void> => {
    const maxRetries = 3;
    let retryCount = 0;
    const cacheKey = `airData_${latitude}_${longitude}`;

    try {
      // Check cache first
      const cachedData = await AsyncStorage.getItem(cacheKey);
      if (cachedData) {
        const { data, timestamp } = JSON.parse(cachedData);
        const cacheAge = Date.now() - timestamp;
        // Use cache if less than 5 minutes old
        if (cacheAge < 5 * 60 * 1000) {
          setAirData(data);
          setIsLoading(false);
          return;
        }
      }

      while (retryCount < maxRetries) {
        try {
          const response = await fetch(
            `https://api.waqi.info/feed/geo:${latitude};${longitude}/?token=demo`
          );

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const data: WAQIResponse = await response.json();

          if (data.status !== 'ok' || !data.data) {
            throw new Error('Invalid data received from API');
          }

          const transformedData: AirQualityData = {
            aqi: data.data.aqi,
            station: data.data.city.name,
            temperature: data.data.iaqi.t?.v || 0,
            humidity: data.data.iaqi.h?.v || 0,
            lastUpdate: data.data.time.iso,
          };

          // Cache the new data
          await AsyncStorage.setItem(cacheKey, JSON.stringify({
            data: transformedData,
            timestamp: Date.now()
          }));

          setAirData(transformedData);
          setIsLoading(false);
          setError(null);
          return;
        } catch (error) {
          retryCount++;
          if (retryCount === maxRetries) {
            throw error;
          }
          // Wait before retrying (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
        }
      }
    } catch (error) {
      console.error('Error fetching air data:', error);
      setError('Unable to fetch air quality data. Please try again.');
      setIsLoading(false);
    }
  };

  useEffect(() => {
    getLocation();
  }, []);

  useEffect(() => {
    if (coordinates) {
      fetchAirData(coordinates.latitude, coordinates.longitude);
    }
  }, [coordinates]);

  const stationName = airData?.station || 'Unknown Location';
  const aqi = airData?.aqi || 0;
  const aqiInfo = getAQIColor(aqi);

  if (isLoading && !airData) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Animated.Text
            style={[
              styles.loadingText,
              {
                color: colors.text,
                opacity: fadeAnim,
                marginTop: 16
              }
            ]}
          >
            Loading air quality data...
          </Animated.Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.errorContainer}>
          <Ionicons name="warning-outline" size={48} color={colors.error} />
          <Text style={[styles.errorText, { color: colors.text }]}>{error}</Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            onPress={async () => {
              // Only use haptics on native platforms
              if (Platform.OS !== 'web') {
                try {
                  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                } catch (error) {
                  console.log('Haptics not available');
                }
              }
              setError(null);
              getLocation();
            }}
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const getAQIGradient = (aqiValue: number) => {
    if (aqiValue <= 50) return ['#00A651', '#4CD964']; // Good (Green)
    if (aqiValue <= 100) return ['#FFF200', '#FFD60A']; // Moderate (Yellow)
    if (aqiValue <= 150) return ['#F7941D', '#FF9F0A']; // Unhealthy for Sensitive Groups (Orange)
    if (aqiValue <= 200) return ['#ED1C24', '#FF453A']; // Unhealthy (Red)
    if (aqiValue <= 300) return ['#662D91', '#BF5AF2']; // Very Unhealthy (Purple)
    return ['#800000', '#FF453A']; // Hazardous (Maroon)
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Animated.View
        style={[
          styles.card,
          {
            backgroundColor: colors.card,
            shadowColor: colors.text,
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 3
          }
        ]}
        entering={FadeIn.duration(500)}
        exiting={FadeOut.duration(300)}
      >
        <LinearGradient
          colors={getAQIGradient(aqi)}
          style={styles.aqiGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.content}>
            <View style={styles.header}>
              <View style={styles.stationInfo}>
                <Text 
                  style={[styles.stationName, { color: colors.text }]} 
                  numberOfLines={2}
                  accessibilityLabel={`Station: ${stationName}`}
                >
                  {stationName}
                </Text>
                <Text style={[styles.subtitle, { color: colors.subText }]}>
                  Air Quality Index
                </Text>
              </View>
              <TouchableOpacity
                onPress={handleRefresh}
                disabled={isRefreshing}
                style={[
                  styles.refreshButton, 
                  { backgroundColor: colors.cardBlur }
                ]}
                accessibilityLabel="Refresh Air Quality"
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Animated.View 
                  style={{ 
                    transform: [{ 
                      rotate: isRefreshing 
                        ? spin 
                        : '0deg' 
                    }] 
                  }}
                >
                  <Ionicons
                    name="refresh"
                    size={22}
                    color={colors.text}
                  />
                </Animated.View>
              </TouchableOpacity>
            </View>
   
            <View style={styles.aqiContainer}>
              <Animated.Text
                style={[
                  styles.aqiValue,
                  { 
                    color: colors.text,
                    opacity: fadeAnim,
                    transform: [{ scale: scaleAnim }]
                  }
                ]}
              >
                {aqi || '-'}
              </Animated.Text>
   
              <Animated.Text
                style={[
                  styles.status,
                  { 
                    color: colors.text,
                    opacity: fadeAnim 
                  }
                ]}
              >
                {aqiInfo.level}
              </Animated.Text>
            </View>
   
            <View style={styles.statsGrid}>
              {[
                {
                  label: 'AQI',
                  value: aqi || '-',
                  icon: 'leaf-outline'
                },
                {
                  label: 'Temperature',
                  value: `${airData?.temperature || '-'}°C`,
                  icon: 'thermometer-outline'
                },
                {
                  label: 'Humidity',
                  value: `${airData?.humidity || '-'}%`,
                  icon: 'water-outline'
                }
              ].map((stat) => (
                <Animated.View
                  key={stat.label}
                  style={[
                    styles.statBox,
                    { 
                      backgroundColor: colors.cardBlur,
                      opacity: fadeAnim,
                      transform: [{ scale: scaleAnim }]
                    }
                  ]}
                >
                  <Ionicons 
                    name={stat.icon} 
                    size={20} 
                    color={colors.text} 
                  />
                  <Text style={[styles.statLabel, { color: colors.subText }]}>
                    {stat.label}
                  </Text>
                  <Text style={[styles.statValue, { color: colors.text }]}>
                    {stat.value}
                  </Text>
                </Animated.View>
              ))}
            </View>
   
            <Animated.Text
              style={[
                styles.lastUpdate,
                { 
                  color: colors.subText,
                  opacity: fadeAnim 
                }
              ]}
            >
              Last updated: {airData?.lastUpdate ? new Date(airData.lastUpdate).toLocaleTimeString() : '-'}
            </Animated.Text>
          </View>
        </LinearGradient>
      </Animated.View>
    </View>
   );
}