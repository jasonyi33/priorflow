import type { ChatData, ChatConversation, ChatUser } from "@/types/chat";

// Current user
const currentUser: ChatUser = {
  id: "schen",
  name: "DR. S. CHEN",
  username: "@SCHEN",
  avatar: "/avatars/user_krimson.png",
  isOnline: true,
};

// Other users
const users: Record<string, ChatUser> = {
  alpha: {
    id: "alpha",
    name: "AGENT ALPHA",
    username: "@ALPHA",
    avatar: "/avatars/user_mati.png",
    isOnline: true,
  },
  rivera: {
    id: "rivera",
    name: "DR. RIVERA",
    username: "@MRIVERA",
    avatar: "/avatars/user_pek.png",
    isOnline: false,
  },
  beta: {
    id: "beta",
    name: "AGENT BETA",
    username: "@BETA",
    avatar: "/avatars/user_joyboy.png",
    isOnline: true,
  },
  nurse_mike: {
    id: "nurse_mike",
    name: "NURSE MIKE",
    username: "@NMIKE",
    avatar: "/avatars/user_krimson.png",
    isOnline: false,
  },
  ops: {
    id: "ops",
    name: "OPS TEAM",
    username: "@OPS",
    avatar: "/avatars/user_mati.png",
    isOnline: false,
  },
};

// Mock conversations
const conversations: ChatConversation[] = [
  {
    id: "conv-alpha",
    participants: [currentUser, users.alpha],
    unreadCount: 1,
    lastMessage: {
      id: "msg-alpha-1",
      content: "PA #4821 SUBMITTED TO AETNA",
      timestamp: "2025-02-28T16:00:00Z",
      senderId: "alpha",
      isFromCurrentUser: false,
    },
    messages: [
      {
        id: "msg-alpha-1",
        content: "PA #4821 SUBMITTED TO AETNA",
        timestamp: "2025-02-28T16:00:00Z",
        senderId: "alpha",
        isFromCurrentUser: false,
      },
    ],
  },
  {
    id: "conv-rivera",
    participants: [currentUser, users.rivera],
    unreadCount: 0,
    lastMessage: {
      id: "msg-rivera-1",
      content: "NEED CHART REVIEW FOR DOE, JANE",
      timestamp: "2025-02-27T14:30:00Z",
      senderId: "rivera",
      isFromCurrentUser: false,
    },
    messages: [
      {
        id: "msg-rivera-1",
        content: "NEED CHART REVIEW FOR DOE, JANE",
        timestamp: "2025-02-27T14:30:00Z",
        senderId: "rivera",
        isFromCurrentUser: false,
      },
    ],
  },
  {
    id: "conv-beta",
    participants: [currentUser, users.beta],
    unreadCount: 0,
    lastMessage: {
      id: "msg-beta-last",
      content: "RUN ELIGIBILITY CHECK",
      timestamp: "2025-02-27T12:15:00Z",
      senderId: "schen",
      isFromCurrentUser: true,
    },
    messages: [
      {
        id: "msg-beta-1",
        content: "MRN-00421 READY FOR REVIEW",
        timestamp: "2025-02-27T12:05:00Z",
        senderId: "beta",
        isFromCurrentUser: false,
      },
      {
        id: "msg-beta-2",
        content: "COVERAGE: UNITED HEALTHCARE",
        timestamp: "2025-02-27T12:05:00Z",
        senderId: "beta",
        isFromCurrentUser: false,
      },
      {
        id: "msg-beta-3",
        content: "OK",
        timestamp: "2025-02-27T12:08:00Z",
        senderId: "schen",
        isFromCurrentUser: true,
      },
      {
        id: "msg-beta-4",
        content: "WHAT PROCEDURE",
        timestamp: "2025-02-27T12:08:00Z",
        senderId: "schen",
        isFromCurrentUser: true,
      },
      {
        id: "msg-beta-5",
        content: "MRI LUMBAR SPINE",
        timestamp: "2025-02-27T12:11:00Z",
        senderId: "beta",
        isFromCurrentUser: false,
      },
      {
        id: "msg-beta-6",
        content: "CPT 72148",
        timestamp: "2025-02-27T12:11:00Z",
        senderId: "beta",
        isFromCurrentUser: false,
      },
      {
        id: "msg-beta-last",
        content: "RUN ELIGIBILITY CHECK",
        timestamp: "2025-02-27T12:15:00Z",
        senderId: "schen",
        isFromCurrentUser: true,
      },
    ],
  },
  {
    id: "conv-nurse-mike",
    participants: [currentUser, users.nurse_mike],
    unreadCount: 0,
    lastMessage: {
      id: "msg-nm-1",
      content: "PATIENT SMITH LABS ARE IN",
      timestamp: "2025-02-26T10:00:00Z",
      senderId: "nurse_mike",
      isFromCurrentUser: false,
    },
    messages: [
      {
        id: "msg-nm-1",
        content: "PATIENT SMITH LABS ARE IN",
        timestamp: "2025-02-26T10:00:00Z",
        senderId: "nurse_mike",
        isFromCurrentUser: false,
      },
    ],
  },
  {
    id: "conv-ops",
    participants: [currentUser, users.ops],
    unreadCount: 0,
    lastMessage: {
      id: "msg-ops-1",
      content: "QUEUE CLEARED FOR WEEKEND",
      timestamp: "2025-02-25T09:30:00Z",
      senderId: "ops",
      isFromCurrentUser: false,
    },
    messages: [
      {
        id: "msg-ops-1",
        content: "QUEUE CLEARED FOR WEEKEND",
        timestamp: "2025-02-25T09:30:00Z",
        senderId: "ops",
        isFromCurrentUser: false,
      },
    ],
  },
];

export const mockChatData: ChatData = {
  currentUser,
  conversations,
};
