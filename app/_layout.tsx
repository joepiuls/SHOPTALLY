import { QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { queryClient } from "@/lib/query-client";
import { ShopProvider, useShop } from "@/lib/shop-context";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { ToastProvider, useToast } from "@/lib/toast-context";
import { startPaymentListener } from "@/lib/payment-listener";
import { formatCurrency } from "@/lib/format";
import i18n from '@/lib/i18n';
import { useFonts, Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold } from "@expo-google-fonts/poppins";

SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const { session, user, isLoading, isOnboardingDone } = useAuth();
  const { shopProfile } = useShop();
  const toast = useToast();
  const segments = useSegments();
  const router = useRouter();

  // Restore saved language on startup
  useEffect(() => {
    if (shopProfile?.language) {
      i18n.changeLanguage(shopProfile.language);
    }
  }, [shopProfile?.language]);

  // Realtime payment listener — fires when a payment webhook is received
  useEffect(() => {
    if (!user?.shop_id) return;
    const unsubscribe = startPaymentListener(user.shop_id, (payment) => {
      const provider = payment.provider
        ? payment.provider.charAt(0).toUpperCase() + payment.provider.slice(1)
        : 'Gateway';
      toast.success(`${formatCurrency(payment.amount)} via ${provider}`, 'Payment Received');
    });
    return unsubscribe;
  }, [user?.shop_id]);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === 'auth';
    // confirm-email handles its own setup + navigation — don't interfere
    const isConfirmEmailScreen = segments[1] === 'confirm-email';

    if (!isOnboardingDone && !isConfirmEmailScreen) {
      // First launch — go to onboarding (replace so Back doesn't loop)
      router.replace('/auth/onboarding');
    } else if (!session && !inAuthGroup) {
      // Onboarding done but not signed in
      router.replace('/auth/login');
    } else if (session && inAuthGroup && isOnboardingDone && !isConfirmEmailScreen) {
      // Signed in while on an auth screen — go to main app
      router.replace('/(tabs)');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, isOnboardingDone, session]);

  // Keep splash visible until auth state resolves
  if (isLoading) return null;

  return (
    <Stack screenOptions={{ headerBackTitle: "Back" }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="auth" options={{ headerShown: false }} />
      <Stack.Screen
        name="settings"
        options={{
          headerShown: false,
          presentation: "modal",
          animation: "slide_from_bottom",
        }}
      />
      <Stack.Screen
        name="new-sale"
        options={{
          headerShown: false,
          presentation: "modal",
          animation: "slide_from_bottom",
        }}
      />
      <Stack.Screen
        name="add-product"
        options={{
          headerShown: false,
          presentation: "modal",
          animation: "slide_from_bottom",
        }}
      />
      <Stack.Screen
        name="edit-product"
        options={{
          headerShown: false,
          presentation: "modal",
          animation: "slide_from_bottom",
        }}
      />
      <Stack.Screen
        name="sale-receipt"
        options={{
          headerShown: false,
          presentation: "modal",
          animation: "slide_from_bottom",
        }}
      />
      <Stack.Screen
        name="staff-management"
        options={{
          headerShown: false,
          presentation: "modal",
          animation: "slide_from_bottom",
        }}
      />
      <Stack.Screen
        name="payment-account"
        options={{
          headerShown: false,
          presentation: "modal",
          animation: "slide_from_bottom",
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <KeyboardProvider>
            <ToastProvider>
              <AuthProvider>
                <ShopProvider>
                  <RootLayoutNav />
                </ShopProvider>
              </AuthProvider>
            </ToastProvider>
          </KeyboardProvider>
        </GestureHandlerRootView>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
