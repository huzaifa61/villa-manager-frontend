import React, { useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { AppDispatch, RootState } from '../store';
import {
  fetchNotifications,
  markAllRead,
  markOneRead,
  NotificationItem,
} from '../store/slices/notificationsSlice';
import { useAppPreferences } from '../context/AppPreferences';

const TYPE_ICON: Record<string, { icon: string; color: string }> = {
  EXPENSE:         { icon: 'receipt-outline',      color: '#EF4444' },
  PAYMENT:         { icon: 'cash-outline',          color: '#10B981' },
  SERVICE_REQUEST: { icon: 'construct-outline',     color: '#F59E0B' },
  GENERAL:         { icon: 'notifications-outline', color: '#6366F1' },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function NotificationsScreen() {
  const { theme } = useAppPreferences();
  const s = makeStyles(theme);
  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation();
  const { items, loading, unreadCount } = useSelector((state: RootState) => state.notifications);

  const load = useCallback(() => {
    dispatch(fetchNotifications());
  }, [dispatch]);

  useEffect(() => { load(); }, [load]);

  const handleMarkAllRead = () => {
    dispatch(markAllRead());
  };

  const handleTap = (item: NotificationItem) => {
    if (!item.isRead) dispatch(markOneRead(item.id));
  };

  const renderItem = ({ item }: { item: NotificationItem }) => {
    const meta = TYPE_ICON[item.type] || TYPE_ICON.GENERAL;
    return (
      <TouchableOpacity
        style={[s.item, !item.isRead && s.itemUnread]}
        onPress={() => handleTap(item)}
        activeOpacity={0.7}
      >
        <View style={[s.iconWrap, { backgroundColor: meta.color + '22' }]}>
          <Ionicons name={meta.icon as any} size={22} color={meta.color} />
        </View>
        <View style={s.content}>
          <View style={s.row}>
            <Text style={s.title} numberOfLines={1}>{item.title}</Text>
            <Text style={s.time}>{timeAgo(item.createdAt)}</Text>
          </View>
          <Text style={s.body} numberOfLines={2}>{item.body}</Text>
        </View>
        {!item.isRead && <View style={s.dot} />}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>
          Notifications {unreadCount > 0 ? `(${unreadCount})` : ''}
        </Text>
        {unreadCount > 0 ? (
          <TouchableOpacity onPress={handleMarkAllRead}>
            <Text style={s.markAll}>Mark all read</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 80 }} />
        )}
      </View>

      {loading && items.length === 0 ? (
        <ActivityIndicator style={{ marginTop: 60 }} size="large" color={theme.primary} />
      ) : items.length === 0 ? (
        <View style={s.empty}>
          <Ionicons name="notifications-off-outline" size={64} color={theme.muted} />
          <Text style={s.emptyText}>No notifications yet</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 24 }}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={load}
              tintColor={theme.primary}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const makeStyles = (theme: any) => StyleSheet.create({
  container:   { flex: 1, backgroundColor: theme.background },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.border },
  headerTitle: { fontSize: 18, fontWeight: '800', color: theme.text },
  markAll:     { fontSize: 13, color: theme.primary, fontWeight: '700' },
  item:        { flexDirection: 'row', alignItems: 'flex-start', padding: 16, borderBottomWidth: 1, borderBottomColor: theme.border, gap: 12 },
  itemUnread:  { backgroundColor: theme.primary + '0A' },
  iconWrap:    { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  content:     { flex: 1 },
  row:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  title:       { fontSize: 14, fontWeight: '700', color: theme.text, flex: 1 },
  body:        { fontSize: 13, color: theme.muted, lineHeight: 18 },
  time:        { fontSize: 11, color: theme.muted, marginLeft: 8 },
  dot:         { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.primary, marginTop: 6 },
  empty:       { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  emptyText:   { color: theme.muted, fontSize: 16 },
});
