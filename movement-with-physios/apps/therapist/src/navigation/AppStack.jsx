import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import BootstrapScreen from '../screens/BootstrapScreen';
import PersonalInfoScreen from '../screens/auth/PersonalInfoScreen';
import OnboardingNext from '../screens/auth/OnboardingNext';
import ProfessionalCredentialsScreen from '../screens/auth/ProfessionalCredentialsScreen';
import GovernmentIDVerificationScreen from '../screens/auth/GovernmentIDVerificationScreen';
import ProfilePhotoScreen from '../screens/auth/ProfilePhotoScreen';
import ScheduleVerificationCallScreen from '../screens/auth/ScheduleVerificationCallScreen';
import BookingConfirmedScreen from '../screens/auth/BookingConfirmedScreen';
import PendingVerificationDashboard from '../screens/dashboard/PendingVerificationDashboard';
import DashboardScreen from '../screens/dashboard/DashboardScreen';
import AllClientsScreen from '../screens/dashboard/AllClientsScreen';
import ExerciseLibraryScreen from '../screens/exercises/ExerciseLibraryScreen';
import MessagesScreen from '../screens/messages/MessagesScreen';
import ChatScreen from '../screens/messages/ChatScreen';
import ExerciseDetailScreen from '../screens/exercises/ExerciseDetailScreen';
import AssignFlowNavigator from './AssignFlowNavigator';
// Phase 3B — bookings + video calling
import BookingsScreen from '../screens/bookings/BookingsScreen';
import BookingDetailScreen from '../screens/bookings/BookingDetailScreen';
import PreCallLobbyScreen from '../screens/video/PreCallLobbyScreen';
import VideoCallScreen from '../screens/video/VideoCallScreen';
import SessionEndedScreen from '../screens/video/SessionEndedScreen';
import { ROUTES } from '../constants/routes';

const SCREEN_OPTIONS = {
  headerShown: false,
  animation: 'slide_from_right',
  animationDuration: 280,
  freezeOnBlur: true,
};

// Signed-IN navigator. Default landing is the Dashboard. Onboarding screens
// stay here so users who haven't finished can still navigate to them from
// inside the app (a future improvement: route new users to PersonalInfo
// automatically based on user.onboardingCompleted).
const Stack = createNativeStackNavigator();

const AppStack = () => (
  <Stack.Navigator initialRouteName="Bootstrap" screenOptions={SCREEN_OPTIONS}>
    {/* Routes to Dashboard or PersonalInfo once ClerkTokenBridge finishes
        provisioning the User doc. Prevents query races and onboarding skip. */}
    <Stack.Screen name="Bootstrap" component={BootstrapScreen} options={{ animation: 'none' }} />
    <Stack.Screen name="Dashboard" component={DashboardScreen} />
    <Stack.Screen name="AllClients" component={AllClientsScreen} />
    <Stack.Screen name="ExerciseLibrary" component={ExerciseLibraryScreen} />
    <Stack.Screen name="Messages" component={MessagesScreen} />
    <Stack.Screen name="Chat" component={ChatScreen} />
    <Stack.Screen name="ExerciseDetail" component={ExerciseDetailScreen} />
    <Stack.Screen name={ROUTES.ASSIGN_FLOW} component={AssignFlowNavigator} />

    {/* Phase 3B — Bookings tab + video calling flow */}
    <Stack.Screen name={ROUTES.BOOKINGS} component={BookingsScreen} />
    <Stack.Screen name={ROUTES.BOOKING_DETAIL} component={BookingDetailScreen} />
    <Stack.Screen name={ROUTES.PRE_CALL_LOBBY} component={PreCallLobbyScreen} />
    {/* Disable swipe-back gesture during an active video call so a stray
        edge swipe can't tear down the session mid-conversation. */}
    <Stack.Screen
      name={ROUTES.VIDEO_CALL}
      component={VideoCallScreen}
      options={{ gestureEnabled: false }}
    />
    <Stack.Screen name={ROUTES.SESSION_ENDED} component={SessionEndedScreen} />

    {/* Onboarding (reachable post-signup if needed) */}
    <Stack.Screen name="PersonalInfo" component={PersonalInfoScreen} />
    <Stack.Screen name="OnboardingNext" component={OnboardingNext} />
    <Stack.Screen name="ProfessionalCredentials" component={ProfessionalCredentialsScreen} />
    <Stack.Screen name="GovernmentIDVerification" component={GovernmentIDVerificationScreen} />
    <Stack.Screen name="ProfilePhoto" component={ProfilePhotoScreen} />
    <Stack.Screen name="ScheduleVerificationCall" component={ScheduleVerificationCallScreen} />
    <Stack.Screen name="BookingConfirmed" component={BookingConfirmedScreen} />
    <Stack.Screen name="PendingVerificationDashboard" component={PendingVerificationDashboard} />
  </Stack.Navigator>
);

export default AppStack;
