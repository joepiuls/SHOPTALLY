import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TextInput,
  FlatList,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useThemeColors } from '@/constants/colors';
import { chatWithAssistant } from '@/lib/ai';
import type { Product, Sale } from '@/lib/types';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
}

const SUGGESTED = [
  'What sold best today?',
  'Which products are low on stock?',
  'How is my revenue this week?',
  'What payment method do customers prefer?',
];

interface Props {
  visible: boolean;
  products: Product[];
  sales: Sale[];
  shopName: string;
  colors: ReturnType<typeof useThemeColors>;
  onClose: () => void;
}

export function AIChatModal({ visible, products, sales, shopName, colors, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const bottomInset = Platform.OS === 'web' ? 20 : insets.bottom;
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const listRef = useRef<FlatList>(null);

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setInput('');

    const userMsg: Message = { id: Date.now().toString(), role: 'user', text: trimmed };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const reply = await chatWithAssistant(trimmed, { products, sales, shopName });
      const assistantMsg: Message = { id: (Date.now() + 1).toString(), role: 'assistant', text: reply };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (e: any) {
      const errMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: `Sorry, I couldn't process that. ${e.message ?? 'Please try again.'}`,
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setLoading(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const handleClose = () => {
    setMessages([]);
    setInput('');
    onClose();
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[styles.messageRow, isUser && styles.messageRowUser]}>
        {!isUser && (
          <View style={[styles.avatar, { backgroundColor: '#FEF3C7' }]}>
            <Ionicons name="sparkles" size={14} color="#D97706" />
          </View>
        )}
        <View
          style={[
            styles.bubble,
            isUser
              ? [styles.bubbleUser, { backgroundColor: colors.primary }]
              : [styles.bubbleAssistant, { backgroundColor: colors.card, borderColor: colors.cardBorder }],
          ]}
        >
          <Text style={[styles.bubbleText, { color: isUser ? '#fff' : colors.text }]}>
            {item.text}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <View style={[styles.topBar, { paddingTop: topInset + 8, backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <View style={[styles.avatarLarge, { backgroundColor: '#FEF3C7' }]}>
            <Ionicons name="sparkles" size={20} color="#D97706" />
          </View>
          <View style={styles.topBarInfo}>
            <Text style={[styles.topBarTitle, { color: colors.text }]}>Shop Assistant</Text>
            <Text style={[styles.topBarSub, { color: colors.textMuted }]}>Powered by Claude</Text>
          </View>
          <Pressable onPress={handleClose} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color={colors.textSecondary} />
          </Pressable>
        </View>

        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={item => item.id}
          renderItem={renderMessage}
          contentContainerStyle={[styles.messagesList, messages.length === 0 && styles.messagesListEmpty]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <View style={[styles.emptyIcon, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="sparkles" size={28} color="#D97706" />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>Ask me anything about your shop</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                I have access to your sales, products, and stock data.
              </Text>
              <View style={styles.suggestions}>
                {SUGGESTED.map(s => (
                  <Pressable
                    key={s}
                    onPress={() => sendMessage(s)}
                    style={[styles.suggestionChip, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  >
                    <Text style={[styles.suggestionText, { color: colors.textSecondary }]}>{s}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          }
        />

        {loading && (
          <View style={[styles.typingRow, { backgroundColor: colors.background }]}>
            <View style={[styles.avatar, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="sparkles" size={14} color="#D97706" />
            </View>
            <View style={[styles.typingBubble, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <ActivityIndicator size="small" color={colors.textMuted} />
              <Text style={[styles.typingText, { color: colors.textMuted }]}>Thinking…</Text>
            </View>
          </View>
        )}

        <View style={[styles.inputRow, { borderTopColor: colors.border, backgroundColor: colors.surface, paddingBottom: bottomInset + 8 }]}>
          <TextInput
            style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
            value={input}
            onChangeText={setInput}
            placeholder="Ask about your sales, stock, revenue…"
            placeholderTextColor={colors.textMuted}
            multiline
            maxLength={300}
            onSubmitEditing={() => sendMessage(input)}
            returnKeyType="send"
            blurOnSubmit
          />
          <Pressable
            onPress={() => sendMessage(input)}
            disabled={!input.trim() || loading}
            style={[styles.sendBtn, { backgroundColor: input.trim() && !loading ? colors.primary : colors.border }]}
          >
            <Ionicons name="arrow-up" size={18} color="#fff" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    gap: 10,
  },
  avatarLarge: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topBarInfo: { flex: 1 },
  topBarTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 16 },
  topBarSub: { fontFamily: 'Poppins_400Regular', fontSize: 11 },
  closeBtn: { padding: 4 },
  messagesList: { padding: 16, gap: 12 },
  messagesListEmpty: { flex: 1 },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, gap: 10 },
  emptyIcon: { width: 60, height: 60, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  emptyTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 17, textAlign: 'center' },
  emptySubtitle: { fontFamily: 'Poppins_400Regular', fontSize: 13, textAlign: 'center', lineHeight: 20 },
  suggestions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 8 },
  suggestionChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  suggestionText: { fontFamily: 'Poppins_400Regular', fontSize: 12 },
  messageRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-end', marginBottom: 4 },
  messageRowUser: { flexDirection: 'row-reverse' },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  bubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
  },
  bubbleUser: {
    borderBottomRightRadius: 4,
  },
  bubbleAssistant: {
    borderBottomLeftRadius: 4,
    borderWidth: 1,
  },
  bubbleText: { fontFamily: 'Poppins_400Regular', fontSize: 14, lineHeight: 22 },
  typingRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
  },
  typingText: { fontFamily: 'Poppins_400Regular', fontSize: 13 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    gap: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    maxHeight: 100,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
