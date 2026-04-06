import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../../src/utils/theme';
import { useAppSelector } from '../../src/hooks/redux';
import { api } from '../../src/services/api';

export default function ChannelMembersScreen() {
  const { channelId, workspaceId } = useLocalSearchParams<{ channelId: string; workspaceId: string }>();
  const me = useAppSelector(s => s.auth.user);
  const [channel, setChannel] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [workspaceMembers, setWorkspaceMembers] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    fetchData();
  }, [channelId]);

  const fetchData = async () => {
    try {
      if (!channelId || !workspaceId) return;
      setLoading(true);
      const [chRes, wmRes] = await Promise.all([
        api.channels.get(channelId),
        api.workspaces.members(workspaceId)
      ]);
      setChannel(chRes.channel);
      setWorkspaceMembers(wmRes.members);
    } catch (e) {
      Alert.alert('Error', 'Failed to load channel details');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = (userId: string) => {
    Alert.alert('Remove Member', 'Are you sure you want to remove this member?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        try {
          await api.channels.removeMember(channelId!, userId);
          setChannel((prev: any) => ({
            ...prev,
            members: prev.members.filter((m: any) => m.user._id !== userId)
          }));
        } catch (e: any) {
          Alert.alert('Error', e.message || 'Failed to remove member');
        }
      }}
    ]);
  };

  const handleAdd = async (userId: string) => {
    try {
      await api.channels.invite(channelId!, [userId]);
      await fetchData();
      setShowAddModal(false);
      Alert.alert('Success', 'Member successfully added.');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to add member');
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  if (!channel) return null;

  const myMemberInfo = channel.members.find((m: any) => m.user._id === me?._id);
  const isAdmin = myMemberInfo?.role === 'admin';

  const nonMembers = workspaceMembers.filter(wm => !channel.members.some((cm: any) => cm.user._id === wm.user._id));

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>{showAddModal ? 'Add Member' : 'Channel Members'}</Text>
        {isAdmin && (
          <TouchableOpacity onPress={() => setShowAddModal(!showAddModal)}>
            <Ionicons name={showAddModal ? "close" : "person-add"} size={22} color={Colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      {showAddModal ? (
        <View style={{flex: 1}}>
           <Text style={styles.subtext}>Select members to add to the channel:</Text>
           <FlatList
             data={nonMembers}
             keyExtractor={i => i.user._id}
             renderItem={({item}) => (
               <View style={styles.memberRow}>
                  <View style={styles.avatarWrap}>
                    {item.user.avatar ? (
                      <Image source={{ uri: item.user.avatar }} style={styles.avatar} />
                    ) : (
                      <View style={styles.avatarFallback}><Text style={styles.avatarText}>{item.user.displayName?.[0] || '?'}</Text></View>
                    )}
                  </View>
                 <View style={styles.memberInfo}>
                   <Text style={styles.name}>{item.user.displayName}</Text>
                   <Text style={styles.email}>@{item.user.username}</Text>
                 </View>
                 <TouchableOpacity style={styles.addBtn} onPress={() => handleAdd(item.user._id)}>
                   <Text style={styles.addBtnText}>Add</Text>
                 </TouchableOpacity>
               </View>
             )}
             ListEmptyComponent={<Text style={{padding: Spacing.md}}>All workspace members are already in this channel.</Text>}
           />
        </View>
      ) : (
        <FlatList
          data={channel.members}
          keyExtractor={i => i.user._id}
          renderItem={({item}) => {
             const isMe = item.user._id === me?._id;
             return (
               <View style={styles.memberRow}>
                  <View style={styles.avatarWrap}>
                    {item.user.avatar ? (
                      <Image source={{ uri: item.user.avatar }} style={styles.avatar} />
                    ) : (
                      <View style={styles.avatarFallback}><Text style={styles.avatarText}>{item.user.displayName?.[0] || '?'}</Text></View>
                    )}
                  </View>
                 <View style={styles.memberInfo}>
                   <Text style={styles.name}>{item.user.displayName} {isMe ? '(You)' : ''}</Text>
                   <Text style={styles.roleText}>{item.role}</Text>
                 </View>
                 {isAdmin && !isMe && (
                   <TouchableOpacity style={styles.removeBtn} onPress={() => handleRemove(item.user._id)}>
                     <Ionicons name="remove-circle-outline" size={22} color={Colors.error} />
                   </TouchableOpacity>
                 )}
               </View>
             )
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.surface },
  header: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.surfaceContainerLow },
  backBtn: { paddingRight: Spacing.sm },
  title: { fontSize: 18, fontWeight: '700', color: Colors.primary, flex: 1 },
  subtext: { padding: Spacing.md, color: Colors.onSurfaceVariant },
  memberRow: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.surfaceContainerLow, gap: 12 },
  avatarWrap: { width: 40, height: 40 },
  avatar: { width: 40, height: 40, borderRadius: 12 },
  avatarFallback: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.surfaceContainerHigh, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 16, fontWeight: '700', color: Colors.onSurfaceVariant },
  memberInfo: { flex: 1 },
  name: { fontSize: 16, fontWeight: '500', color: Colors.primary },
  email: { fontSize: 14, color: Colors.onSurfaceVariant },
  roleText: { fontSize: 12, color: Colors.onSurfaceVariant, marginTop: 2, textTransform: 'capitalize' },
  addBtn: { backgroundColor: Colors.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: BorderRadius.md },
  addBtnText: { color: 'white', fontWeight: '600' },
  removeBtn: { padding: 8 }
});
