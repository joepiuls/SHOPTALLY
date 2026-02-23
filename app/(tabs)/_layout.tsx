import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs } from "expo-router";
import { NativeTabs, Icon, Label } from "expo-router/unstable-native-tabs";
import { BlurView } from "expo-blur";
import { Platform, StyleSheet, useColorScheme, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import Colors from "@/constants/colors";
import { useAuth } from "@/lib/auth-context";

function NativeTabLayout() {
  const { user, permissions } = useAuth();
  const isOwner = user?.role === 'owner';

  const canSeeDashboard = isOwner || permissions?.can_access_dashboard;
  const canSeeProducts = isOwner || permissions?.can_access_products;
  const canSeeMarketplace = isOwner || permissions?.can_access_marketplace;
  const canSeeOrders = isOwner || permissions?.can_access_orders;

  return (
    <NativeTabs>
      {canSeeDashboard && (
        <NativeTabs.Trigger name="index">
          <Icon sf={{ default: "house", selected: "house.fill" }} />
          <Label>Home</Label>
        </NativeTabs.Trigger>
      )}
      {canSeeProducts && (
        <NativeTabs.Trigger name="products">
          <Icon sf={{ default: "bag", selected: "bag.fill" }} />
          <Label>Products</Label>
        </NativeTabs.Trigger>
      )}
      {canSeeMarketplace && (
        <NativeTabs.Trigger name="marketplace">
          <Icon sf={{ default: "storefront", selected: "storefront.fill" }} />
          <Label>Marketplace</Label>
        </NativeTabs.Trigger>
      )}
      {canSeeOrders && (
        <NativeTabs.Trigger name="orders">
          <Icon sf={{ default: "shippingbox", selected: "shippingbox.fill" }} />
          <Label>Orders</Label>
        </NativeTabs.Trigger>
      )}
      <NativeTabs.Trigger name="myshop">
        <Icon sf={{ default: "gearshape", selected: "gearshape.fill" }} />
        <Label>My Shop</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicTabLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const isWeb = Platform.OS === "web";
  const isIOS = Platform.OS === "ios";
  const colors = isDark ? Colors.dark : Colors.light;
  const { user, permissions } = useAuth();

  const isOwner = user?.role === 'owner';
  const canSeeDashboard = isOwner || permissions?.can_access_dashboard;
  const canSeeProducts = isOwner || permissions?.can_access_products;
  const canSeeMarketplace = isOwner || permissions?.can_access_marketplace;
  const canSeeOrders = isOwner || permissions?.can_access_orders;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.tabIconDefault,
        tabBarLabelStyle: {
          fontFamily: 'Poppins_500Medium',
          fontSize: 10,
        },
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : colors.tabBar,
          borderTopWidth: isWeb ? 1 : 0,
          borderTopColor: colors.border,
          elevation: 0,
          paddingBottom: isWeb ? 0 : undefined,
          ...(isWeb ? { height: 84 } : {}),
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={100}
              tint={isDark ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
            />
          ) : isWeb ? (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.tabBar }]} />
          ) : null,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          href: canSeeDashboard ? undefined : null,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="products"
        options={{
          title: "Products",
          href: canSeeProducts ? undefined : null,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="bag-handle" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="marketplace"
        options={{
          title: "Market",
          href: canSeeMarketplace ? undefined : null,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="storefront" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: "Orders",
          href: canSeeOrders ? undefined : null,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cube" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="myshop"
        options={{
          title: "My Shop",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen name="sales" options={{ href: null }} />
      <Tabs.Screen name="reports" options={{ href: null }} />
    </Tabs>
  );
}

export default function TabLayout() {
  if (isLiquidGlassAvailable()) {
    return <NativeTabLayout />;
  }
  return <ClassicTabLayout />;
}
