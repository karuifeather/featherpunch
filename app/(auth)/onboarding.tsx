import { useRouter } from 'expo-router';
import {
  View, Text, FlatList, Pressable, Animated, Dimensions,
  NativeSyntheticEvent, NativeScrollEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
  faUserClock, faChartPie, faHeart,
  type IconDefinition,
} from '@fortawesome/free-solid-svg-icons';
import { useRef, useState } from 'react';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useDispatch } from 'react-redux';
import { authenticate } from '@/state/userSlice';

const { width } = Dimensions.get('window');
const ACCENT = '#8b5cf6';

interface Slide {
  id: string;
  title: string;
  description: string;
  icon: IconDefinition;
}

const slides: Slide[] = [
  {
    id: '1',
    title: 'Punch into your roles',
    description: 'Sleeper, builder, student, friend — live the roles you care about and see where your time goes.',
    icon: faUserClock,
  },
  {
    id: '2',
    title: 'See where life goes',
    description: 'Charts and insights show how much of your time belongs to you.',
    icon: faChartPie,
  },
  {
    id: '3',
    title: 'Reflective, not pushy',
    description: 'No hustle culture. No streak pressure. Just a calm, private mirror for your life.',
    icon: faHeart,
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { bg, text, subtext } = useThemeColors();
  const insets = useSafeAreaInsets();
  const scrollX = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef<FlatList<Slide> | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleScroll = Animated.event<NativeSyntheticEvent<NativeScrollEvent>>(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    { useNativeDriver: false }
  );

  const handleViewableItemsChanged = ({
    viewableItems,
  }: {
    viewableItems: Array<{ index: number | null }>;
  }) => {
    if (viewableItems.length > 0 && viewableItems[0].index !== null) {
      setCurrentIndex(viewableItems[0].index);
    }
  };

  const viewabilityConfig = { itemVisiblePercentThreshold: 50 };

  const finishOnboarding = () => {
    dispatch(authenticate());
    router.replace('/(root)/(tabs)/home');
  };

  const goToNext = () => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
    } else {
      finishOnboarding();
    }
  };

  return (
    <View className={`flex-1 ${bg}`}>
      <View className="absolute inset-0">
        <View
          className="absolute top-[-10%] right-[-5%] w-64 h-64 rounded-full opacity-[0.05]"
          style={{ backgroundColor: ACCENT }}
        />
      </View>

      <Animated.FlatList
        ref={flatListRef}
        data={slides}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        onViewableItemsChanged={handleViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        renderItem={({ item }) => (
          <View
            style={{ width }}
            className="flex-1 items-center justify-center px-10"
          >
            <View
              className="w-28 h-28 rounded-3xl items-center justify-center mb-8"
              style={{ backgroundColor: `${ACCENT}18` }}
            >
              <FontAwesomeIcon icon={item.icon} size={44} color={ACCENT} />
            </View>
            <Text className={`${text} text-2xl font-bold text-center max-w-[280px]`}>
              {item.title}
            </Text>
            <Text className={`${subtext} text-base text-center mt-3 max-w-[300px] leading-6`}>
              {item.description}
            </Text>
          </View>
        )}
      />

      {/* Progress bar */}
      <View
        className="absolute left-0 right-0 px-10"
        style={{ bottom: insets.bottom + 80 }}
      >
        <View
          className="h-1 rounded-full overflow-hidden"
          style={{ backgroundColor: `${ACCENT}22` }}
        >
          <Animated.View
            className="h-full rounded-full"
            style={{
              width: `${((currentIndex + 1) / slides.length) * 100}%`,
              backgroundColor: ACCENT,
            }}
          />
        </View>
      </View>

      <View
        className="absolute left-0 right-0 flex-row justify-between items-center px-8"
        style={{ bottom: insets.bottom + 16 }}
      >
        <Pressable
          onPress={finishOnboarding}
          className="py-3.5 px-5 rounded-xl active:opacity-70"
          style={{ minHeight: 48 }}
        >
          <Text className={`text-base font-medium ${subtext}`}>Skip</Text>
        </Pressable>
        <Pressable
          onPress={goToNext}
          className="py-3.5 px-8 rounded-xl active:opacity-90"
          style={{ backgroundColor: ACCENT, minHeight: 48 }}
        >
          <Text className="text-base font-semibold text-white">
            {currentIndex === slides.length - 1 ? 'Start' : 'Next'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
