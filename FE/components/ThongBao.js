import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { fetchNotifications } from '../service/api';
import { useAuth } from '../context/Auth';
import { useNavigation } from '@react-navigation/native';

export default function ThongBao() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { token } = useAuth();
  const navigation = useNavigation();

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError('');
      try {
        const data = await fetchNotifications(token);
        setNotifications(data);
      } catch (err) {
        setError(err.message || 'Lỗi khi tải thông báo');
      }
      setLoading(false);
    }
    loadData();
  }, [token]);

  const renderItem = ({ item }) => {
    const isCancelled = item.noidung?.toLowerCase().includes('hủy') || item.noidung?.toLowerCase().includes('huỷ');

    return (
      <TouchableOpacity
        style={[styles.item, isCancelled && styles.cancelledItem]}
        onPress={() => {
          if (isCancelled) {
            navigation.navigate('Lịch sử hủy', { highlightId: item.dathang_id });
          } else {
            navigation.navigate('Đơn hàng', { highlightId: item.dathang_id });
          }
        }}
      >
        <View style={styles.itemHeader}>
          <View style={styles.dot} />
          <Text style={styles.noidung} numberOfLines={2}>
            {item.noidung || 'Không có nội dung'}
          </Text>
        </View>
        <Text style={styles.date}>
          {item.created_at ? new Date(item.created_at).toLocaleString('vi-VN') : ''}
        </Text>
        <Text style={styles.linkText}>Xem chi tiết</Text>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={{ marginTop: 10 }}>Đang tải thông báo...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (notifications.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>Không có thông báo nào.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 16 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f6f8',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  item: {
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 10,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cancelledItem: {
    borderLeftWidth: 4,
    borderLeftColor: '#e74c3c',
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#007AFF',
    marginTop: 6,
    marginRight: 8,
  },
  noidung: {
    fontSize: 15,
    color: '#2c3e50',
    flex: 1,
  },
  date: {
    fontSize: 12,
    color: '#999',
  },
  linkText: {
    marginTop: 6,
    color: '#007AFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  errorText: {
    color: 'red',
    fontSize: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#888',
  },
});
