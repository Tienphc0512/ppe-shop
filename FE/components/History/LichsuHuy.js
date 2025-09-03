import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    ActivityIndicator,
    RefreshControl,
    TouchableOpacity
} from 'react-native';
import { useAuth } from '../../context/Auth';
import { fetchCancelDetailsHis } from '../../service/api';
import Thongtingiaohang from '../Modal/Thongtingiaohang';
import { useRoute } from "@react-navigation/native";

export default function DonHangDaHuy() {
  //lấy thông tin từ top tabs và hightlight
    const route = useRoute();
  const { highlightId } = route.params || {};
    const { token } = useAuth();
    const [orders, setOrders] = useState([]);
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);

    //modal thông tin giao hàng 
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedOrderInfo, setSelectedOrderInfo] = useState(null);
    //mở rộng đơn hàng
      const [expandedOrders, setExpandedOrders] = useState([]);

    const loadCancelledOrders = async () => {
        try {
            setRefreshing(true);
            const result = await fetchCancelDetailsHis(token); // Gọi API lấy lịch sử huỷ
            console.log('Dữ liệu trả về:', result); //debug
            setOrders(result || []);
        } catch (error) {
            console.error('Lỗi khi tải đơn hàng đã huỷ:', error);
        } finally {
            setRefreshing(false);
            setLoading(false);
        }
    };

    useEffect(() => {
        loadCancelledOrders();
    }, []);

    //xử lý modal
    const showShippingInfo = (orderInfo) => {
  setSelectedOrderInfo({
    username: orderInfo.username || 'Không xác định',
    sdt: orderInfo.sdt || 'Chưa có',
    diachi: orderInfo.diachi || 'Chưa cung cấp',
  });
  setModalVisible(true);
};


// Nhóm đơn hàng
const groupedOrders = orders.reduce((acc, item) => {
  const existing = acc.find(o => o.dathang_id === item.dathang_id);
  if (existing) {
    existing.sanpham.push({
      ten: item.tensanpham || item.ten || 'Chưa có tên',
      soluong: item.soluong || 0,
      dongia: item.dongia || 0,
      tongtien: item.tongtien || 0,
    });
    existing.tongtien += item.tongtien || 0;
  } else {
    acc.push({
      dathang_id: item.dathang_id,
      username: item.username,
      sdt: item.sdt,
      diachi: item.diachi,
      ngayhuy: item.ngayhuy,
      lydo: item.lydo || 'Không có ',
      tongtien: item.tongtien || 0,
      sanpham: [{
        ten: item.tensanpham || item.ten || 'Chưa có tên',
        soluong: item.soluong || 0,
        dongia: item.dongia || 0,
        tongtien: item.tongtien || 0,
      }],
    });
  }
  return acc;
}, []);



const toggleExpand = (dathang_id) => {
  setExpandedOrders(prev =>
    prev.includes(dathang_id)
      ? prev.filter(id => id !== dathang_id)
      : [...prev, dathang_id]
  );
};

const renderItem = ({ item }) => {
  const sanpham = item.sanpham || [];
  const isExpanded = expandedOrders.includes(item.dathang_id);
  const isHighlighted = item.dathang_id === highlightId;

  return (
    <View style={[styles.orderItem, isHighlighted && styles.highlight]}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.orderCode}>Mã đơn: {item.dathang_id}</Text>
        <View style={[styles.statusBadge, { backgroundColor: '#e74c3c' }]}>
          <Text style={styles.statusText}>Đã huỷ</Text>
        </View>
      </View>

      {/* SẢN PHẨM */}
      <View style={styles.productContainer}>
        {sanpham.slice(0, 1).map((sp, idx) => (
          <View key={idx} style={styles.productItem}>
            <Text style={styles.productName}>{sp.ten}</Text>
            <Text style={{ color: '#7f8c8d' }}>x{sp.soluong} - {Number(sp.dongia).toLocaleString()}đ</Text>
          </View>
        ))}

        {sanpham.length > 1 && !isExpanded && (
          <Text style={styles.moreText}>...và {sanpham.length - 1} sản phẩm khác</Text>
        )}

        {isExpanded &&
          sanpham.slice(1).map((sp, idx) => (
            <View key={idx + 1} style={styles.productItem}>
              <Text style={styles.productName}>{sp.ten}</Text>
              <Text style={{ color: '#7f8c8d' }}>x{sp.soluong} - {Number(sp.dongia).toLocaleString()}đ</Text>
            </View>
          ))}

        {sanpham.length > 1 && (
          <TouchableOpacity onPress={() => toggleExpand(item.dathang_id)}>
            <Text style={styles.toggleText}>{isExpanded ? 'Thu gọn' : 'Xem thêm'}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* THÔNG TIN ĐƠN HÀNG */}
      <View style={{ marginBottom: 8 }}>
        <Text style={styles.infoText}>Tổng tiền: {Number(item.sanpham[0].tongtien).toLocaleString()}đ</Text>
        <Text style={styles.infoText}>Ngày huỷ: {new Date(item.ngayhuy).toLocaleString()}</Text>
        <Text style={styles.infoText}>Lý do: {item.lydo || 'Không có'}</Text>
      </View>

      {/* THÔNG TIN GIAO HÀNG */}
      <TouchableOpacity onPress={() => showShippingInfo(item)}>
        <Text style={styles.linkText}>Thông tin giao hàng</Text>
      </TouchableOpacity>
    </View>
  );
};

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#3498db" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <FlatList
                data={groupedOrders}
                 keyExtractor={(item) => item.dathang_id.toString()} 
                renderItem={renderItem}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={loadCancelledOrders} />
                }
                ListEmptyComponent={<Text style={styles.empty}>Không có đơn hàng đã huỷ.</Text>}
            />
            <Thongtingiaohang
                visible={modalVisible}
                onClose={() => setModalVisible(false)}
                orderInfo={selectedOrderInfo}
            />
        </View>
    );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f2f4f8', padding: 12 },
  orderItem: {
    backgroundColor: '#fff',
    padding: 16,
    marginVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  orderCode: { fontWeight: 'bold', fontSize: 16, color: '#2c3e50' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 14 },
  statusText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  productContainer: { marginBottom: 12, padding: 12, backgroundColor: '#f8f9fa', borderRadius: 10 },
  productItem: { marginBottom: 8, paddingBottom: 4, borderBottomColor: '#dcdde1', borderBottomWidth: 0.5 },
  productName: { fontWeight: '600', fontSize: 15, color: '#34495e' },
  moreText: { color: '#7f8c8d', fontStyle: 'italic', marginTop: 4 },
  toggleText: { color: '#2980b9', textDecorationLine: 'underline', marginTop: 6, fontWeight: '500' },
  infoText: { fontSize: 14, color: '#2f3640', marginBottom: 4 },
  linkText: { color: '#2980b9', marginTop: 6, fontWeight: 'bold' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { textAlign: 'center', color: '#95a5a6', marginTop: 20, fontSize: 16 },
  highlight: { backgroundColor: "#fff8e1", borderColor: "#f39c12", borderWidth: 2 },
});
