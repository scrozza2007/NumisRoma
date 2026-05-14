import React, { useState, useEffect, useContext, useRef, useCallback } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import NotificationToast from '../components/NotificationToast';
import Navbar from '../components/Navbar';
import { apiClient, ApiError } from '../utils/apiClient';
import {
  encryptMessage,
  decryptMessage,
  storeMessagePlaintext,
  getMessagePlaintext,
  hasMessagePlaintext,
  computeSafetyNumber,
  getIdentityBundle,
} from '../utils/e2ee';

const COMMON_EMOJIS = [
  '😊','😂','❤️','👍','🎉','🙏','👋','🔥',
  '😍','🤔','😎','😢','😡','🤗','👏','💪',
  '😴','🤣','😭','😱','🤩','😇','🤪','😅',
];

const formatTime = (dateString) =>
  new Date(dateString).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

const Messages = () => {
  const [conversations, setConversations]           = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages]                     = useState([]);
  const [newMessage, setNewMessage]                 = useState('');
  const [searchUsers, setSearchUsers]               = useState('');
  const [foundUsers, setFoundUsers]                 = useState([]);
  const [loading, setLoading]                       = useState(false);
  const [showUserSearch, setShowUserSearch]         = useState(false);
  const [notifications, setNotifications]           = useState([]);
  const [readConversationIds, setReadConversationIds] = useState(new Set());
  const [showEmojiPicker, setShowEmojiPicker]       = useState(false);
  const [safetyNumber, setSafetyNumber]             = useState(null);
  const [showSafetyNumber, setShowSafetyNumber]     = useState(false);
  const [theirKeyVersion, setTheirKeyVersion]       = useState(null);
  const [keyVersionWarning, setKeyVersionWarning]   = useState(false);
  const [mobileChatOpen, setMobileChatOpen]         = useState(false);

  // Rate-limit backoff: suppress polls until this timestamp.
  const pollBackoffUntilRef  = useRef(0);
  const pollingRef           = useRef(null);
  const convPollingRef       = useRef(null);
  const sseRef               = useRef(null);
  const sseBackoffRef        = useRef(2000);
  const sseTimerRef          = useRef(null);
  const selectedConvRef      = useRef(null);
  const emojiPickerRef       = useRef(null);
  const inputRef             = useRef(null);
  const messagesEndRef       = useRef(null);
  // Track the newest server message ID we have seen for the open conversation.
  const lastSeenMsgIdRef     = useRef(null);
  // Pre-key bundle cache { [userId]: { bundle, fetchedAt } }
  const preKeyCacheRef       = useRef({});

  const { user, isLoading: authLoading, e2eeReady } = useContext(AuthContext);
  const router = useRouter();

  useEffect(() => { selectedConvRef.current = selectedConversation; }, [selectedConversation]);

  // ── Notifications ───────────────────────────────────────────────────────────

  const addNotification = (message, type = 'info') => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type }]);
  };
  const removeNotification = (id) => setNotifications(prev => prev.filter(n => n.id !== id));

  // ── Pre-key bundle cache ────────────────────────────────────────────────────

  const getPreKeyBundle = useCallback(async (userId) => {
    const id    = String(userId);
    const entry = preKeyCacheRef.current[id];
    const now   = Date.now();
    // 1-hour TTL — refreshes on key rotation
    if (entry && now - entry.fetchedAt < 3_600_000) return entry.bundle;
    try {
      const data = await apiClient.get(`/api/e2ee/pre-keys/${id}`);
      if (data?.identityPublicKey) {
        if (entry && data.keyVersion > entry.bundle.keyVersion) setKeyVersionWarning(true);
        setTheirKeyVersion(data.keyVersion);
        preKeyCacheRef.current[id] = { bundle: data, fetchedAt: now };
        return data;
      }
    } catch { /* no-op — caller handles null */ }
    return null;
  }, []);

  // ── Core: process a single server message object ────────────────────────────
  //
  // This is the ONLY place decryption happens.
  // Returns a display-ready message object { ...serverMsg, content }.
  // Writes plaintext to IDB so it survives page reloads.

  const processMessage = useCallback(async (serverMsg) => {
    const myId        = String(user?._id ?? user?.id);
    const senderId    = String(serverMsg.sender?._id ?? serverMsg.sender);
    const convId      = String(serverMsg.conversation ?? serverMsg._id);
    const msgId       = String(serverMsg._id);

    // ── v2 Signal Protocol ────────────────────────────────────────────────────
    if (serverMsg.encryptedPayload) {
      // Check IDB first — never decrypt the same message twice
      const stored = await getMessagePlaintext(msgId);
      if (stored !== null) return { ...serverMsg, content: stored };

      if (senderId === myId) {
        // Own outgoing message: plaintext was written to IDB at send time.
        // If it's somehow missing (shouldn't happen), show a neutral indicator.
        return { ...serverMsg, content: serverMsg.content ?? '✓ Sent' };
      }

      // Incoming message — decrypt and persist
      if (!e2eeReady) return { ...serverMsg, content: null, _pending: true };

      const plaintext = await decryptMessage(msgId, convId, serverMsg.encryptedPayload);
      if (plaintext === null) {
        // Decryption failed — show a neutral indicator rather than hiding the message.
        // This keeps the chat usable and prevents the "blank screen" when ratchet
        // state is being established for the first time.
        return { ...serverMsg, content: '🔒', _decryptFailed: true };
      }

      // Persist so this message never needs decryption again
      await storeMessagePlaintext(msgId, plaintext, senderId, convId, serverMsg.createdAt);
      return { ...serverMsg, content: plaintext };
    }

    // Plaintext fallback — recipient has no E2EE keys registered yet
    return serverMsg;
  }, [e2eeReady, user]);

  // ── Fetch and display messages for a conversation ───────────────────────────

  const renderMessages = useCallback(async (serverMsgs) => {
    const processed = await Promise.all(serverMsgs.map(m => processMessage(m)));
    // Only hide messages that are pending because e2eeReady isn't true yet.
    // Messages where decryption failed (_decryptFailed) are still shown.
    setMessages(processed.filter(m => !m._pending));
    if (processed.length > 0) {
      lastSeenMsgIdRef.current = processed[processed.length - 1]._id;
    }
  }, [processMessage]);

  const fetchMessages = useCallback(async (conversationId, silent = false) => {
    if (typeof window === 'undefined') return;
    if (Date.now() < pollBackoffUntilRef.current) return;
    try {
      const data = await apiClient.get(`/api/messages/${conversationId}`);
      await renderMessages(data);
      if (!silent) markAsRead(conversationId);
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) {
        pollBackoffUntilRef.current = Date.now() + 60_000;
        if (!silent) addNotification('Too many requests — pausing for 60 s.', 'error');
      } else if (err instanceof ApiError && err.status === 403) {
        // Conversation no longer exists or user was removed — clear it
        setSelectedConversation(null);
        setMessages([]);
        fetchConversations(true);
      } else if (!silent) {
        addNotification('Error loading messages', 'error');
      }
    }
  }, [renderMessages]);

  // When e2eeReady flips to true, re-render the open conversation so pending
  // messages (those that arrived before keys were ready) get decrypted.
  useEffect(() => {
    if (!e2eeReady || !selectedConversation) return;
    fetchMessages(selectedConversation._id, true);
  }, [e2eeReady]); // intentionally not including fetchMessages to avoid loop

  // ── Conversations ───────────────────────────────────────────────────────────

  const fetchConversations = useCallback(async (silent = false) => {
    if (typeof window === 'undefined') return;
    if (Date.now() < pollBackoffUntilRef.current) return;
    try {
      if (!silent) setLoading(true);
      const data = await apiClient.get('/api/messages/conversations');
      setConversations(Array.isArray(data) ? data : data.conversations ?? []);
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) {
        pollBackoffUntilRef.current = Date.now() + 60_000;
        if (!silent) addNotification('Too many requests — pausing for 60 s.', 'error');
      } else if (!silent) {
        addNotification('Error loading conversations', 'error');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  // ── Mark as read ────────────────────────────────────────────────────────────

  const markAsRead = (conversationId) => {
    setReadConversationIds(prev => new Set([...prev, conversationId]));
    apiClient.put(`/api/messages/${conversationId}/read`).catch(() => {});
  };

  // ── Send message ────────────────────────────────────────────────────────────

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;
    const plaintext  = newMessage.trim();
    const convId     = selectedConversation._id;
    const otherUser  = getOtherUser(selectedConversation);

    let payload;
    if (e2eeReady) {
      try {
        const { encryptedPayload } = await encryptMessage(
          convId,
          plaintext,
          String(otherUser._id),
          (uid) => getPreKeyBundle(uid),
        );
        payload = { encryptedPayload };
      } catch {
        // Recipient has no pre-key bundle yet — fall back to plaintext
        payload = { content: plaintext, messageType: 'text' };
      }
    } else {
      payload = { content: plaintext, messageType: 'text' };
    }

    try {
      const serverMsg = await apiClient.post(`/api/messages/${convId}`, payload);

      // If we encrypted, store plaintext in IDB now (keyed by server-assigned message ID)
      // so processMessage can serve it back without ever trying to decrypt own messages.
      if (payload.encryptedPayload && serverMsg._id) {
        await storeMessagePlaintext(
          String(serverMsg._id),
          plaintext,
          String(user._id ?? user.id),
          convId,
          serverMsg.createdAt,
        );
      }

      setMessages(prev => [...prev, { ...serverMsg, content: plaintext }]);
      setNewMessage('');
      lastSeenMsgIdRef.current = serverMsg._id;
      fetchConversations(true);
    } catch {
      addNotification('Error sending message', 'error');
    }
  };

  // ── Auth guard ──────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!authLoading && !user) {
      if (router.pathname !== '/login') router.replace('/login');
    }
  }, [user, authLoading, router]);

  // ── Initial load ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (typeof window !== 'undefined' && user) fetchConversations();
  }, [user, fetchConversations]);

  // Open conversation specified via URL query param (from notification click)
  const pendingConvIdRef = useRef(
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('conversationId')
      : null,
  );
  useEffect(() => {
    if (!user || conversations.length === 0 || !pendingConvIdRef.current) return;
    const id   = pendingConvIdRef.current;
    pendingConvIdRef.current = null;
    const conv = conversations.find(c => c._id === id);
    if (conv) openConversation(conv);
  }, [user, conversations]);

  useEffect(() => {
    const h = (err) => { if (err.message?.includes('Invariant')) return; };
    router.events.on('routeChangeError', h);
    return () => router.events.off('routeChangeError', h);
  }, [router]);

  // ── SSE ─────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (typeof window === 'undefined' || !user) return;
    let es, cancelled = false;

    const connect = () => {
      if (cancelled) return;
      try {
        es = new EventSource(
          `${process.env.NEXT_PUBLIC_API_URL}/api/notifications/stream`,
          { withCredentials: true },
        );
        sseRef.current = es;

        es.onopen = () => { sseBackoffRef.current = 2000; };

        es.onmessage = (e) => {
          try {
            const data = JSON.parse(e.data);
            if (typeof data.messages === 'number') {
              const conv = selectedConvRef.current;
              if (conv) {
                fetchMessages(conv._id, true);
              } else {
                setReadConversationIds(new Set());
              }
              fetchConversations(true);
            }
          } catch {}
        };

        es.onerror = () => {
          es.close();
          if (cancelled) return;
          const delay = sseBackoffRef.current;
          sseBackoffRef.current = Math.min(delay * 2, 30_000);
          sseTimerRef.current = setTimeout(() => { if (!cancelled) connect(); }, delay);
        };
      } catch {}
    };

    connect();
    return () => {
      cancelled = true;
      if (sseTimerRef.current) clearTimeout(sseTimerRef.current);
      if (es) es.close();
    };
  }, [user, fetchMessages, fetchConversations]);

  // ── Fallback polling ────────────────────────────────────────────────────────

  useEffect(() => {
    if (!user || !selectedConversation) return;
    const tick = () => {
      if (!document.hidden && Date.now() >= pollBackoffUntilRef.current)
        fetchMessages(selectedConversation._id, true);
    };
    pollingRef.current = setInterval(tick, 20_000);
    return () => clearInterval(pollingRef.current);
  }, [user, selectedConversation, fetchMessages]);

  useEffect(() => {
    if (!user) return;
    const tick = () => {
      if (!document.hidden && Date.now() >= pollBackoffUntilRef.current)
        fetchConversations(true);
    };
    convPollingRef.current = setInterval(tick, 30_000);
    return () => clearInterval(convPollingRef.current);
  }, [user, fetchConversations]);

  // ── Scroll to bottom ────────────────────────────────────────────────────────

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // ── Helpers ─────────────────────────────────────────────────────────────────

  const getOtherUser = (conversation) =>
    conversation.participants.find(p => p._id !== (user?._id ?? user?.id));

  const openConversation = (conversation) => {
    setSelectedConversation(conversation);
    setMessages([]);
    setSafetyNumber(null);
    setShowSafetyNumber(false);
    setKeyVersionWarning(false);
    setMobileChatOpen(true);
    lastSeenMsgIdRef.current = null;
    fetchMessages(conversation._id);
    markAsRead(conversation._id);
    const other = getOtherUser(conversation);
    if (other) getPreKeyBundle(String(other._id));
  };

  const searchUsersForChat = async (query) => {
    if (!query || query.length < 2) { setFoundUsers([]); return; }
    try {
      const data = await apiClient.get(`/api/messages/search/users?query=${encodeURIComponent(query)}`);
      setFoundUsers(data);
    } catch { addNotification('Error searching users', 'error'); }
  };

  const startConversation = async (otherUserId) => {
    try {
      const conversation = await apiClient.get(`/api/messages/conversations/${otherUserId}`);
      openConversation(conversation);
      fetchConversations();
      setShowUserSearch(false);
      setSearchUsers('');
      setFoundUsers([]);
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        addNotification('This account is private. Follow them first to send messages.', 'error');
      } else {
        addNotification('Error creating conversation', 'error');
      }
    }
  };

  const computeAndShowSafetyNumber = useCallback(async (theirUserId) => {
    try {
      const myBundle  = await getIdentityBundle();
      const theirData = await apiClient.get(`/api/e2ee/identity/${theirUserId}`);
      if (!myBundle || !theirData?.identityPublicKey) return;
      setSafetyNumber(computeSafetyNumber(myBundle.ikSignPub, theirData.identityPublicKey));
      setShowSafetyNumber(true);
    } catch {}
  }, []);

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const onEmojiClick = (emoji) => {
    setNewMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  };

  useEffect(() => {
    const h = (e) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target))
        setShowEmojiPicker(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const isConversationUnread = (conversation) => {
    if (!conversation.lastMessage) return false;
    if (selectedConversation?._id === conversation._id) return false;
    if (readConversationIds.has(conversation._id)) return false;
    const sid = conversation.lastMessage.sender?._id ?? conversation.lastMessage.sender;
    return String(sid) !== String(user?._id ?? user?.id);
  };

  const getReadReceipt = () => {
    if (!selectedConversation || messages.length === 0) return null;
    const other = getOtherUser(selectedConversation);
    if (!other) return null;
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (String(msg.sender._id) === String(user._id ?? user.id)) {
        const rb = msg.readBy?.find(r => String(r.user?._id ?? r.user) === String(other._id));
        if (rb) return { messageId: msg._id, readAt: rb.readAt };
      }
    }
    return null;
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-amber border-t-transparent" />
      </div>
    );
  }

  if (!user) return null;

  const readReceipt = getReadReceipt();

  return (
    <>
      <Head>
        <title>Messages — NumisRoma</title>
        <meta name="description" content="Direct messaging between collectors" />
      </Head>

      <div className="fixed top-4 right-4 z-50 space-y-2">
        {notifications.map(n => (
          <NotificationToast key={n.id} message={n.message} type={n.type} onClose={() => removeNotification(n.id)} />
        ))}
      </div>

      <div className="h-full w-full bg-canvas">
        <div className="flex h-full w-full">

          {/* ── Sidebar ─────────────────────────────────────────────────────── */}
          <div className={`flex flex-col shrink-0 bg-card border-r border-border w-full md:w-72 ${mobileChatOpen ? 'hidden md:flex' : 'flex'}`}>
            <div className="p-4 border-b border-border">
              <div className="flex items-center justify-between">
                <h1 className="font-display font-semibold text-xl text-text-primary">Messages</h1>
                <button
                  onClick={() => setShowUserSearch(v => !v)}
                  className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors duration-150 ${showUserSearch ? 'bg-amber-bg text-amber' : 'bg-surface-alt text-text-secondary hover:bg-amber-bg hover:text-amber'}`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </button>
              </div>

              {showUserSearch && (
                <div className="mt-3">
                  <input
                    type="text" placeholder="Search users…" value={searchUsers}
                    onChange={e => { setSearchUsers(e.target.value); searchUsersForChat(e.target.value); }}
                    className="w-full px-3 py-2 font-sans text-sm bg-surface border border-border rounded outline-none focus:border-amber transition-colors duration-150 text-text-primary"
                  />
                  {foundUsers.length > 0 && (
                    <div className="mt-1.5 max-h-40 overflow-y-auto border border-border rounded-md bg-card">
                      {foundUsers.map(fu => (
                        <div
                          key={fu._id} onClick={() => startConversation(fu._id)}
                          className="flex items-center gap-2.5 p-2.5 cursor-pointer transition-colors duration-100 hover:bg-surface-alt"
                        >
                          <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-amber-bg overflow-hidden">
                            {fu.avatar
                              ? <Image src={fu.avatar} alt={fu.username} width={32} height={32} className="rounded-full" />
                              : <span className="font-display font-semibold text-sm text-amber">{fu.username.charAt(0).toUpperCase()}</span>}
                          </div>
                          <div>
                            <p className="font-sans text-sm font-medium text-text-primary">{fu.username}</p>
                            {fu.fullName && <p className="font-sans text-xs text-text-muted">{fu.fullName}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="p-4 text-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-amber border-t-transparent mx-auto" />
                </div>
              ) : conversations.length === 0 ? (
                <div className="p-6 text-center">
                  <p className="font-sans text-sm text-text-muted">No conversations yet.</p>
                  <p className="font-sans text-xs mt-1 text-text-muted">Start a new conversation!</p>
                </div>
              ) : conversations.map(conv => {
                const other      = getOtherUser(conv);
                const isSelected = selectedConversation?._id === conv._id;
                const hasUnread  = isConversationUnread(conv);
                return (
                  <div
                    key={conv._id} onClick={() => openConversation(conv)}
                    className={`flex items-center gap-3 p-3.5 cursor-pointer transition-colors duration-100 border-b border-border ${isSelected ? 'bg-amber-bg border-l-[3px] border-l-amber' : 'hover:bg-surface-alt border-l-[3px] border-l-transparent'}`}
                  >
                    <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-amber-bg overflow-hidden">
                      {other?.avatar
                        ? <Image src={other.avatar} alt={other.username} width={40} height={40} className="rounded-full object-cover" />
                        : <span className="font-display font-semibold text-amber">{other?.username?.charAt(0).toUpperCase()}</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-sans text-sm font-medium truncate text-text-primary">{other?.fullName || other?.username}</p>
                      {conv.lastMessage && !conv.lastMessage.encryptedPayload && (
                        <p className="font-sans text-xs truncate text-text-muted">
                          {conv.lastMessage.isDeleted ? 'Message deleted' : conv.lastMessage.content}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {conv.lastActivity && (
                        <span className="font-sans text-xs text-text-muted">{formatTime(conv.lastActivity)}</span>
                      )}
                      {hasUnread && <span className="w-2 h-2 rounded-full bg-amber inline-block" aria-label="Unread message" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Chat area ───────────────────────────────────────────────────── */}
          <div className={`flex-1 flex-col bg-canvas ${mobileChatOpen ? 'flex' : 'hidden md:flex'}`}>
            {selectedConversation ? (
              <>
                {/* Header */}
                <div className="flex items-center gap-3 p-4 border-b border-border bg-card">
                  <button
                    onClick={() => setMobileChatOpen(false)}
                    className="md:hidden flex items-center justify-center w-8 h-8 rounded text-text-muted hover:text-text-primary transition-colors duration-150 shrink-0"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <Link
                    href={`/profile?id=${getOtherUser(selectedConversation)?._id}`}
                    className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 bg-amber-bg overflow-hidden hover:opacity-80 transition-opacity duration-150"
                  >
                    {getOtherUser(selectedConversation)?.avatar
                      ? <Image src={getOtherUser(selectedConversation).avatar} alt={getOtherUser(selectedConversation).username} width={36} height={36} className="rounded-full object-cover" />
                      : <span className="font-display font-semibold text-amber">{getOtherUser(selectedConversation)?.username?.charAt(0).toUpperCase()}</span>}
                  </Link>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <Link
                        href={`/profile?id=${getOtherUser(selectedConversation)?._id}`}
                        className="font-sans text-sm font-semibold text-text-primary hover:text-amber transition-colors duration-150"
                      >
                        {getOtherUser(selectedConversation)?.fullName || getOtherUser(selectedConversation)?.username}
                      </Link>
                      {e2eeReady && (
                        <button
                          title="End-to-end encrypted — click to verify safety number"
                          onClick={() => computeAndShowSafetyNumber(getOtherUser(selectedConversation)?._id)}
                          className="text-amber hover:text-amber-hover transition-colors duration-150"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                        </button>
                      )}
                    </div>
                    <p className="font-sans text-xs text-text-muted">@{getOtherUser(selectedConversation)?.username}</p>
                    {keyVersionWarning && (
                      <p className="font-sans text-xs text-amber mt-0.5">⚠ Safety number changed — verify with recipient</p>
                    )}
                    {showSafetyNumber && safetyNumber && (
                      <div className="mt-1 p-2 bg-surface border border-border rounded text-xs font-mono text-text-primary">
                        <span className="font-sans text-text-muted mr-1">Safety number:</span>
                        {safetyNumber}
                        <button className="ml-2 text-text-muted hover:text-amber" onClick={() => setShowSafetyNumber(false)}>✕</button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {messages.map((msg, idx) => {
                    const isOwn  = String(msg.sender._id) === String(user._id ?? user.id);
                    const isLast = idx === messages.length - 1;
                    return (
                      <div key={msg._id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                        <div>
                          <div className={`max-w-[75%] sm:max-w-xs lg:max-w-md px-4 py-2 rounded-md ${isOwn ? 'bg-text-primary text-canvas' : 'bg-card border border-border text-text-primary'}`}>
                            <p className="font-sans text-sm">{msg.content}</p>
                            <p className={`font-sans text-xs mt-1 ${isOwn ? 'text-[rgba(253,248,240,0.6)]' : 'text-text-muted'}`}>
                              {formatTime(msg.createdAt)}
                            </p>
                          </div>
                          {isOwn && isLast && readReceipt?.messageId === msg._id && (
                            <p className="font-sans text-[10px] text-text-muted text-right mt-0.5">
                              Seen {readReceipt.readAt ? formatTime(readReceipt.readAt) : ''}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="p-4 flex items-center gap-2 border-t border-border bg-card">
                  <div className="relative" ref={emojiPickerRef}>
                    <button
                      onClick={() => setShowEmojiPicker(v => !v)}
                      className={`p-2 transition-colors duration-150 ${showEmojiPicker ? 'text-amber' : 'text-text-muted hover:text-amber'}`}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </button>
                    {showEmojiPicker && (
                      <div className="absolute bottom-11 left-0 z-50 p-4 bg-card border border-border rounded-lg shadow-lg min-w-[300px]">
                        <div className="grid grid-cols-6 gap-2">
                          {COMMON_EMOJIS.map((emoji, i) => (
                            <button key={i} onClick={() => onEmojiClick(emoji)} className="w-10 h-10 flex items-center justify-center rounded text-2xl hover:bg-surface-alt transition-colors duration-100">
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <input
                    ref={inputRef}
                    type="text" value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Write a message…"
                    className="flex-1 px-3.5 py-2 font-sans text-sm bg-surface border border-border rounded-md outline-none focus:border-amber transition-colors duration-150 text-text-primary"
                  />
                  <button
                    onClick={sendMessage} disabled={!newMessage.trim()}
                    className="flex items-center gap-1.5 px-4 py-2 font-sans text-sm font-semibold rounded-md bg-amber text-[#fdf8f0] hover:bg-amber-hover transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Send
                    <svg className="w-4 h-4 transform rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-14 h-14 mx-auto mb-4 flex items-center justify-center rounded-full bg-surface-alt">
                    <svg className="w-7 h-7 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <p className="font-display font-semibold text-xl mb-1 text-text-primary">Select a conversation</p>
                  <p className="font-sans text-sm text-text-muted">Choose a conversation or start a new one</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

Messages.getLayout = function getLayout(page) {
  return (
    <div className="h-screen w-screen flex flex-col bg-canvas">
      <Navbar />
      <main className="flex-1 overflow-hidden">
        {page}
      </main>
    </div>
  );
};

export default Messages;
