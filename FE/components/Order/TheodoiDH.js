import React, { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import { useNavigation , useRoute } from "@react-navigation/native";
import { useAuth } from "../../context/Auth";
import { fetchOrderDetails } from "../../service/api";
import DhTopTabs from "./DhTopTabs"; 

const Tab = createMaterialTopTabNavigator();

export default function TheodoiDH() {
  const { token, userId } = useAuth();
  const route = useRoute();
  const { orderInfo } = route.params || {};

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation();

  const loadOrders = async (id) => {
    try {
      setRefreshing(true);
      const result = await fetchOrderDetails(id, token);
      setOrders(result || []);
    } catch (error) {
      console.error("Lỗi khi tải đơn hàng:", error);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!orderInfo) {
      loadOrders(userId);
    } else {
      setOrders([orderInfo]);
      setLoading(false);
    }
  }, [userId]);

  const initialTab = orderInfo
  ? orderInfo.trangthai === 'choxuly' ? 'Chờ xử lý' :
    orderInfo.trangthai === 'dangchuanbi' ? 'Đang chuẩn bị' :
    orderInfo.trangthai === 'danggiao' ? 'Đang giao' :
    orderInfo.trangthai === 'hoanthanh' ? 'Đã giao' :
    orderInfo.trangthai === 'dahuy' ? 'Đã huỷ' :
    'Tất cả'
  : 'Tất cả';

  // nhận params và điều tới tab chỉ định
 useEffect(() => {
    if (route.params?.targetTab) {
      // Điều hướng tới tab  muốn
      navigation.navigate(route.params.targetTab);
    }
  }, [route.params?.targetTab]);


  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#2980b9" />
      </View>
    );
  }

  return (
    <Tab.Navigator
    initialRouteName={initialTab}
 screenOptions={{
  tabBarScrollEnabled: true,
    tabBarStyle: {
      backgroundColor: "#fff",   // nền trắng gọn gàng
      elevation: 0,              // bỏ bóng đổ mặc định
    },
    tabBarItemStyle: {
       width: "auto", 
       paddingHorizontal: 16,     
    },
    tabBarLabelStyle: {
      fontSize: 14,
      textTransform: "none",
      fontWeight: "bold",
      color: "#2980b9", // màu chữ tab
    },
    tabBarIndicatorStyle: {
      backgroundColor: "#2980b9",
      height: 2,
    },
  }}
>
  <Tab.Screen
    name="Tất cả"
     initialParams={{
    orders: orders,
    refreshing,
    onRefresh: () => loadOrders(userId),
  }}
  />
  <Tab.Screen
  name="Chờ xử lý"
   initialParams={{
    orders: orders.filter(o => o.trangthai === "choxuly"),
    refreshing,
    onRefresh: () => loadOrders(userId),
  }}
  />
   <Tab.Screen
  name="Đang chuẩn bị"
   initialParams={{
    orders: orders.filter(o => o.trangthai === "dangchuanbi"),
    refreshing,
    onRefresh: () => loadOrders(userId),
  }}
  />
  <Tab.Screen
    name="Đang giao"
     initialParams={{
    orders: orders.filter(o => o.trangthai === "danggiao"),
    refreshing,
    onRefresh: () => loadOrders(userId),
  }}
  />
    <Tab.Screen
    name="Đã giao"
     initialParams={{
    orders: orders.filter(o => o.trangthai === "hoanthanh"),
    refreshing,
    onRefresh: () => loadOrders(userId),
  }}

  />
  <Tab.Screen
    name="Đã huỷ"
     initialParams={{
    orders: orders.filter(o => o.trangthai === "dahuy"),
    refreshing,
    onRefresh: () => loadOrders(userId),
  }}
        />
</Tab.Navigator>

  );
}
