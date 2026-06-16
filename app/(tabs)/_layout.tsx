import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import {
  MessageCircle,
  Calendar,
  GraduationCap,
  UtensilsCrossed,
  Dumbbell,
  User,
} from 'lucide-react-native';
import { dark, gold } from '@/lib/theme';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 88,
          paddingBottom: 20,
          paddingTop: 8,
          backgroundColor: dark.surface,
          borderTopWidth: 1,
          borderTopColor: `${gold[400]}40`,
          elevation: 0,
        },
        tabBarActiveTintColor: gold[400],
        tabBarInactiveTintColor: dark.textMuted,
        tabBarLabelStyle: {
          fontFamily: 'Inter_500Medium',
          fontSize: 11,
          marginTop: 4,
        },
        tabBarItemStyle: {
          gap: 4,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Chat',
          tabBarIcon: ({ color, size }) => (
            <MessageCircle color={color} size={size} strokeWidth={2} />
          ),
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Calendar',
          tabBarIcon: ({ color, size }) => (
            <Calendar color={color} size={size} strokeWidth={2} />
          ),
        }}
      />
      <Tabs.Screen
        name="study"
        options={{
          title: 'Study',
          tabBarIcon: ({ color, size }) => (
            <GraduationCap color={color} size={size} strokeWidth={2} />
          ),
        }}
      />
      <Tabs.Screen
        name="meals"
        options={{
          title: 'Meals',
          tabBarIcon: ({ color, size }) => (
            <UtensilsCrossed color={color} size={size} strokeWidth={2} />
          ),
        }}
      />
      <Tabs.Screen
        name="fitness"
        options={{
          title: 'Fitness',
          tabBarIcon: ({ color, size }) => (
            <Dumbbell color={color} size={size} strokeWidth={2} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <User color={color} size={size} strokeWidth={2} />
          ),
        }}
      />
    </Tabs>
  );
}
