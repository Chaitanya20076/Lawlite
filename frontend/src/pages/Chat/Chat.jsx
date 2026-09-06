import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { useNavigate } from "react-router-dom";

import {
  ArrowUp,
  Check,
  ChevronDown,
  Cloud,
  Clipboard,
  Download,
  FileText,
  LogOut,
  Menu,
  Moon,
  MoreHorizontal,
  Paperclip,
  Plus,
  RotateCcw,
  Scale,
  Search,
  Settings,
  Shield,
  Sparkles,
  Sun,
  ThumbsDown,
  Cable,
  ThumbsUp,
  Unplug,
  X,
} from "lucide-react";
import {
  SiDropbox,
  SiGithub,
  SiGmail,
  SiGooglecalendar,
  SiGoogledrive,
  SiNotion,
} from "react-icons/si";
import { jsPDF } from "jspdf";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "../../config/firebase";

import "./Chat.css";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000";

const HISTORY_STORAGE_KEY = "lawlite-chat-history";
const ACTIVE_CHAT_STORAGE_KEY = "lawlite-active-chat-id";

const interestOptions = [
  {
    id: "property",
    label: "Property & Housing",
  },
  {
    id: "work",
    label: "Work & Employment",
  },
  {
    id: "finance",
    label: "Finance & Taxes",
  },
  {
    id: "family",
    label: "Family & Relationships",
  },
  {
    id: "consumer",
    label: "Consumer Rights",
  },
  {
    id: "traffic",
    label: "Traffic & Vehicles",
  },
  {
    id: "business",
    label: "Business & Startups",
  },
  {
    id: "general",
    label: "General Law",
  },
];
const connectorGroups = [
  {
    title: "Documents",
    items: [
      {
        id: "google-drive",
        name: "Google Drive",
        description: "Import documents and PDFs",
        icon: SiGoogledrive,
      },
      {
        id: "dropbox",
        name: "Dropbox",
        description: "Access files from Dropbox",
        icon: SiDropbox,
      },
      {
        id: "onedrive",
        name: "OneDrive",
        description: "Access Microsoft files",
        icon: Cloud,
      },
      {
        id: "notion",
        name: "Notion",
        description: "Connect pages and databases",
        icon: SiNotion,
      },
    ],
  },

  {
    title: "Communication",
    items: [
      {
        id: "gmail",
        name: "Gmail",
        description: "Find emails and attachments",
        icon: SiGmail,
      },
      {
  id: "slack",
  name: "Slack",
  description: "Search permitted workspace content",
  icon: Cable,
},
    ],
  },

  {
    title: "Productivity",
    items: [
      {
        id: "google-calendar",
        name: "Google Calendar",
        description: "Access events and deadlines",
        icon: SiGooglecalendar,
      },
    ],
  },

  {
    title: "Developer",
    items: [
      {
        id: "github",
        name: "GitHub",
        description: "Access repositories and files",
        icon: SiGithub,
      },
    ],
  },
];



const Chat = () => {
  const navigate = useNavigate();

  const textareaRef = useRef(null);
  const messagesEndRef = useRef(null);
  const typingIntervalsRef = useRef([]);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [connectorsOpen, setConnectorsOpen] = useState(false);
  
const [connectorNotice, setConnectorNotice] = useState("");

  const [searchQuery, setSearchQuery] = useState("");

  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [responseFeedback, setResponseFeedback] = useState({});
const [copiedResponseId, setCopiedResponseId] = useState(null);

  const [connectorStatus, setConnectorStatus] = useState({
    "google-drive": false,
  });
  const [connectorLoading, setConnectorLoading] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState(null);

  const getFirebaseIdToken = async () => {
  const user = firebaseUser || auth.currentUser;

  if (!user) {
    throw new Error("You must be logged in.");
  }

  return user.getIdToken();
};

const checkGoogleDriveStatus = async () => {
  try {
    const idToken = await getFirebaseIdToken();
    const response = await fetch(
      `${API_BASE_URL}/api/connectors/google/status`,
      {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      }
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(
        data?.message || "Unable to check Google Drive status."
      );
    }

    const connected = Boolean(data.connected);

    setConnectorStatus((previous) => ({
      ...previous,
      "google-drive": connected,
    }));

    return connected;
  } catch (error) {
    console.error("Google Drive status error:", error);
    setConnectorStatus((previous) => ({
      ...previous,
      "google-drive": false,
    }));
    return false;
  }
};

const handleGoogleDriveConnect = async () => {
  try {
    setConnectorLoading(true);
    setConnectorNotice("Preparing Google Drive connection...");

    const idToken = await getFirebaseIdToken();

    const response = await fetch(
      `${API_BASE_URL}/api/connectors/google/authorize`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      }
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(
        data?.message ||
          "Unable to start Google Drive connection."
      );
    }

    window.location.href = data.authorizationUrl;
  } catch (error) {
    console.error("Google Drive connection error:", error);
    setConnectorNotice(
      error.message || "Unable to connect Google Drive."
    );
    setConnectorLoading(false);
  }
};

const handleGoogleDriveDisconnect = async () => {
  try {
    setConnectorLoading(true);
    setConnectorNotice("Disconnecting Google Drive...");

    const idToken = await getFirebaseIdToken();

    const response = await fetch(
      `${API_BASE_URL}/api/connectors/google/disconnect`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      }
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(
        data?.message || "Unable to disconnect Google Drive."
      );
    }

    setConnectorStatus((previous) => ({
      ...previous,
      "google-drive": false,
    }));
    setConnectorNotice("Google Drive disconnected.");
  } catch (error) {
    console.error("Google Drive disconnect error:", error);
    setConnectorNotice(
      error.message || "Unable to disconnect Google Drive."
    );
  } finally {
    setConnectorLoading(false);
  }
};

const handleConnectorClick = (connector) => {
  if (connector.id === "google-drive") {
    if (connectorStatus["google-drive"]) {
      handleGoogleDriveDisconnect();
    } else {
      handleGoogleDriveConnect();
    }
    return;
  }

  setConnectorNotice(
    `${connector.name} connection will be available soon.`
  );
};

  const [theme, setTheme] = useState(() => {
    return (
      localStorage.getItem("lawlite-theme") ||
      document.documentElement.getAttribute("data-theme") ||
      "light"
    );
  });

  const [profile, setProfile] = useState(() => {
    const savedProfile =
      localStorage.getItem("lawlite-onboarding");

    if (savedProfile) {
      try {
        return JSON.parse(savedProfile);
      } catch {
        return {
          name: "there",
          dob: "",
          interests: [],
        };
      }
    }

    return {
      name: "there",
      dob: "",
      interests: [],
    };
  });

  const [history, setHistory] = useState(() => {
    const savedHistory = localStorage.getItem(
      HISTORY_STORAGE_KEY
    );

    if (!savedHistory) {
      return [];
    }

    try {
      return JSON.parse(savedHistory);
    } catch {
      return [];
    }
  });

  const [currentChatId, setCurrentChatId] = useState(() => {
    return localStorage.getItem(
      ACTIVE_CHAT_STORAGE_KEY
    );
  });

  const [messages, setMessages] = useState(() => {
    const savedHistory = localStorage.getItem(
      HISTORY_STORAGE_KEY
    );

    const savedActiveId = localStorage.getItem(
      ACTIVE_CHAT_STORAGE_KEY
    );

    if (!savedHistory || !savedActiveId) {
      return [];
    }

    try {
      const parsedHistory = JSON.parse(savedHistory);

      const activeChat = parsedHistory.find(
        (item) => String(item.id) === String(savedActiveId)
      );

      return activeChat?.messages || [];
    } catch {
      return [];
    }
  });

  /*
   * =========================================
   * GOOGLE DRIVE CONNECTION STATUS
   * =========================================
   */

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log(
        "Firebase auth state:",
        user ? user.email : "No user"
      );

      setFirebaseUser(user);
      setAuthReady(true);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!authReady) return;

    let mounted = true;

    const syncGoogleDriveStatus = async () => {
      const params = new URLSearchParams(window.location.search);
      const connector = params.get("connector");
      const status = params.get("status");

      if (connector === "google-drive" && status === "connected") {
        setConnectorsOpen(true);
        setConnectorNotice("Google Drive connected successfully.");
      } else if (connector === "google-drive" && status === "cancelled") {
        setConnectorsOpen(true);
        setConnectorNotice("Google Drive connection was cancelled.");
      } else if (connector === "google-drive" && status === "error") {
        setConnectorsOpen(true);
        setConnectorNotice("Google Drive could not be connected.");
      }

      if (!firebaseUser) {
        console.warn("Google Drive status check skipped: no Firebase user.");
        if (connector || status) {
          window.history.replaceState({}, document.title, "/chat");
        }
        return;
      }

      const connected = await checkGoogleDriveStatus();

      if (!mounted) return;

      if (connector === "google-drive" && status === "connected" && connected) {
        setConnectorNotice(
          "Google Drive connected successfully. Lawlite can now use your Drive documents."
        );
      }

      if (connector || status) {
        window.history.replaceState({}, document.title, "/chat");
      }
    };

    syncGoogleDriveStatus();

    return () => {
      mounted = false;
    };
  }, [authReady, firebaseUser]);

  /*
   * =========================================
   * THEME
   * =========================================
   */

  useEffect(() => {
    document.documentElement.setAttribute(
      "data-theme",
      theme
    );

    localStorage.setItem(
      "lawlite-theme",
      theme
    );
  }, [theme]);

  /*
   * =========================================
   * SAVE ACTIVE CHAT
   * =========================================
   */

  useEffect(() => {
    if (!currentChatId) {
      return;
    }

    setHistory((previous) => {
      const updated = previous.map((chat) =>
        String(chat.id) === String(currentChatId)
          ? {
              ...chat,
              messages,
            }
          : chat
      );

      localStorage.setItem(
        HISTORY_STORAGE_KEY,
        JSON.stringify(updated)
      );

      return updated;
    });

    localStorage.setItem(
      ACTIVE_CHAT_STORAGE_KEY,
      String(currentChatId)
    );
  }, [messages, currentChatId]);

  /*
   * =========================================
   * KEYBOARD SHORTCUTS
   * =========================================
   */

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (
        event.key === "/" &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA"
      ) {
        event.preventDefault();
        setSearchOpen(true);
      }

      if (event.key === "Escape") {
        setSidebarOpen(false);
        setSearchOpen(false);
        setSettingsOpen(false);
        setConnectorsOpen(false);
setConnectorNotice("");
      }
    };

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, []);

  /*
   * =========================================
   * CLEANUP TYPEWRITER INTERVALS
   * =========================================
   */

  useEffect(() => {
    return () => {
      typingIntervalsRef.current.forEach(
        (interval) => clearInterval(interval)
      );
    };
  }, []);

  /*
   * =========================================
   * AUTO SCROLL
   * =========================================
   */

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages]);

  /*
   * =========================================
   * PROFILE
   * =========================================
   */

  const firstName = useMemo(() => {
    const name = profile?.name?.trim();

    if (!name) {
      return "there";
    }

    return name.split(" ")[0];
  }, [profile]);

  const getGreeting = () => {
    const hour = new Date().getHours();

    if (hour < 5) {
      return "You're up late";
    }

    if (hour < 12) {
      return "Good morning";
    }

    if (hour < 17) {
      return "Good afternoon";
    }

    if (hour < 22) {
      return "Good evening";
    }

    return "Good night";
  };

  /*
   * =========================================
   * THEME
   * =========================================
   */

  const toggleTheme = () => {
    setTheme((current) =>
      current === "dark"
        ? "light"
        : "dark"
    );
  };

  /*
   * =========================================
   * NEW CHAT
   * =========================================
   */

  const handleNewChat = () => {
    typingIntervalsRef.current.forEach(
      (interval) => clearInterval(interval)
    );

    typingIntervalsRef.current = [];

    setMessages([]);
    setMessage("");
    setIsSending(false);
    setCurrentChatId(null);

    localStorage.removeItem(
      ACTIVE_CHAT_STORAGE_KEY
    );

    setSidebarOpen(false);

    setTimeout(() => {
      textareaRef.current?.focus();
    }, 100);
  };

  /*
   * =========================================
   * CREATE CHAT
   * =========================================
   */

  const createChat = () => {
    const id = Date.now();

    const newChat = {
      id,
      title: "New conversation",
      date: "Today",
      messages: [],
    };

    setHistory((previous) => {
      const updated = [
        newChat,
        ...previous,
      ];

      localStorage.setItem(
        HISTORY_STORAGE_KEY,
        JSON.stringify(updated)
      );

      return updated;
    });

    setCurrentChatId(id);

    localStorage.setItem(
      ACTIVE_CHAT_STORAGE_KEY,
      String(id)
    );

    return id;
  };

  /*
   * =========================================
   * LOAD CHAT
   * =========================================
   */

  const handleSelectHistory = (chat) => {
    typingIntervalsRef.current.forEach(
      (interval) => clearInterval(interval)
    );

    typingIntervalsRef.current = [];

    setCurrentChatId(chat.id);
    setMessages(chat.messages || []);
    setMessage("");
    setIsSending(false);

    localStorage.setItem(
      ACTIVE_CHAT_STORAGE_KEY,
      String(chat.id)
    );

    setSearchOpen(false);
    setSidebarOpen(false);
  };

  /*
   * =========================================
   * GOOGLE DRIVE CONTEXT FOR SARVAM
   * =========================================
   */

  const getGoogleDriveContext = async (query) => {
    if (!connectorStatus["google-drive"] || !query?.trim()) {
      return "";
    }

    try {
      const idToken = await getFirebaseIdToken();

      const response = await fetch(
        `${API_BASE_URL}/api/connectors/google/context`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({ query: query.trim() }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        console.error(
          "Google Drive context error:",
          data?.message || "Unable to retrieve Drive context."
        );
        return "";
      }

      return data.context || "";
    } catch (error) {
      console.error("Google Drive context error:", error);
      return "";
    }
  };

  /*
   * =========================================
   * SARVAM CHAT RESPONSE
   * =========================================
   */

  const getSarvamResponse = async (
    conversation,
    connectedContext = ""
  ) => {
    const response = await fetch(
      `${API_BASE_URL}/api/chat`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          conversation,
          connectedContext,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(
        data?.message ||
          "Unable to generate a response."
      );
    }

    return data.message;
  };

  /*
   * =========================================
   * SARVAM CHAT TITLE
   * =========================================
   */

  const getSarvamTitle = async (
    firstMessage
  ) => {
    const response = await fetch(
      `${API_BASE_URL}/api/chat/title`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: firstMessage,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(
        data?.message ||
          "Unable to generate chat title."
      );
    }

    return data.title;
  };

  /*
   * =========================================
   * TYPEWRITER EFFECT
   * =========================================
   */

  const typeAssistantMessage = (
    fullText,
    messageId
  ) => {
    return new Promise((resolve) => {
      let currentIndex = 0;

      const interval = setInterval(() => {
        currentIndex += 2;

        setMessages((previous) =>
          previous.map((item) =>
            item.id === messageId
              ? {
                  ...item,
                  text: fullText.slice(
                    0,
                    currentIndex
                  ),
                  typing:
                    currentIndex <
                    fullText.length,
                }
              : item
          )
        );

        if (
          currentIndex >=
          fullText.length
        ) {
          clearInterval(interval);

          typingIntervalsRef.current =
            typingIntervalsRef.current.filter(
              (item) => item !== interval
            );

          resolve();
        }
      }, 18);

      typingIntervalsRef.current.push(
        interval
      );
    });
  };

  /*
   * =========================================
   * SEND MESSAGE
   * =========================================
   */
  /*
 * =========================================
 * RESPONSE ACTIONS
 * =========================================
 */

const handleCopyResponse = async (response) => {
  if (!response?.text) {
    return;
  }

  try {
    await navigator.clipboard.writeText(response.text);

    setCopiedResponseId(response.id);

    setTimeout(() => {
      setCopiedResponseId((current) =>
        current === response.id ? null : current
      );
    }, 1800);
  } catch (error) {
    console.error("Copy response failed:", error);
  }
};

const handleFeedback = (messageId, type) => {
  setResponseFeedback((previous) => ({
    ...previous,
    [messageId]:
      previous[messageId] === type
        ? null
        : type,
  }));
};

const handleDownloadResponse = (response) => {
  if (!response?.text) {
    return;
  }

  const pdf = new jsPDF({
    unit: "mm",
    format: "a4",
  });

  const pageWidth = 210;
  const pageHeight = 297;

  const margin = 20;
  const contentWidth =
    pageWidth - margin * 2;

  let y = 22;

  /*
   * HEADER
   */

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(18);
  pdf.text("LAWLITE", margin, y);

  y += 8;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(110, 110, 110);
  pdf.text(
    "AI-assisted legal understanding",
    margin,
    y
  );

  y += 12;

  /*
   * DIVIDER
   */

  pdf.setDrawColor(220, 220, 220);
  pdf.line(
    margin,
    y,
    pageWidth - margin,
    y
  );

  y += 12;

  /*
   * PROMPT
   */

  pdf.setTextColor(30, 30, 30);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11);
  pdf.text("Your prompt", margin, y);

  y += 7;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);

  const promptText =
    response.prompt ||
    "Prompt unavailable.";

  const promptLines =
    pdf.splitTextToSize(
      promptText,
      contentWidth
    );

  pdf.text(promptLines, margin, y);

  y +=
    promptLines.length * 5 +
    12;

  /*
   * RESPONSE
   */

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11);
  pdf.setTextColor(30, 30, 30);

  pdf.text(
    "Lawlite's response",
    margin,
    y
  );

  y += 7;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);

  /*
   * Convert markdown-ish formatting
   * into readable PDF text.
   */

  const cleanResponse =
    response.text
      .replace(/^#{1,6}\s*/gm, "")
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/\*(.*?)\*/g, "$1")
      .replace(/`([^`]+)`/g, "$1");

  const responseLines =
    pdf.splitTextToSize(
      cleanResponse,
      contentWidth
    );

  /*
   * PAGE BREAK SUPPORT
   */

  responseLines.forEach((line) => {
    if (y > pageHeight - 20) {
      pdf.addPage();
      y = 22;
    }

    pdf.text(line, margin, y);
    y += 5;
  });

  /*
   * FOOTER
   */

  const totalPages =
    pdf.internal.getNumberOfPages();

  for (
    let page = 1;
    page <= totalPages;
    page += 1
  ) {
    pdf.setPage(page);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7);
    pdf.setTextColor(145, 145, 145);

    pdf.text(
      "Lawlite provides AI-assisted legal information and is not a substitute for qualified legal advice.",
      margin,
      pageHeight - 12
    );

    pdf.text(
      `Page ${page} of ${totalPages}`,
      pageWidth - margin,
      pageHeight - 12,
      {
        align: "right",
      }
    );
  }

  /*
   * FILE NAME
   */

  const fileName =
    response.prompt
      ?.slice(0, 40)
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase() ||
    "lawlite-response";

  pdf.save(
    `lawlite-${fileName}.pdf`
  );
};

const handleRegenerateResponse = async (
  response
) => {
  if (
    !response ||
    response.role !== "assistant" ||
    isSending
  ) {
    return;
  }

  const responseIndex =
    messages.findIndex(
      (item) => item.id === response.id
    );

  if (responseIndex === -1) {
    return;
  }

  /*
   * Everything before this response.
   * This includes the user prompt that
   * originally generated the response.
   */

  const previousMessages =
    messages.slice(0, responseIndex);

  const conversation =
    previousMessages
      .filter(
        (item) =>
          (item.role === "user" ||
            item.role === "assistant") &&
          typeof item.text === "string" &&
          item.text.trim()
      )
      .map((item) => ({
        role: item.role,
        content: item.text.trim(),
      }));

  if (!conversation.length) {
    return;
  }

  setIsSending(true);

  try {
    const latestUserMessage =
      [...previousMessages]
        .reverse()
        .find((item) => item.role === "user")?.text || "";

    const connectedContext =
      await getGoogleDriveContext(latestUserMessage);

    const newAnswer =
      await getSarvamResponse(
        conversation,
        connectedContext
      );

    const updatedResponse = {
      ...response,
      text:
        newAnswer ||
        "I wasn't able to generate a response right now.",
      typing: true,
    };

    setMessages((previous) =>
      previous.map((item) =>
        item.id === response.id
          ? updatedResponse
          : item
      )
    );

    await typeAssistantMessage(
      updatedResponse.text,
      response.id
    );
  } catch (error) {
    console.error(
      "Regenerate response failed:",
      error
    );
  } finally {
    setIsSending(false);
  }
};

  const handleSend = async () => {
    const trimmedMessage =
      message.trim();

    if (
      !trimmedMessage ||
      isSending
    ) {
      return;
    }

    let chatId = currentChatId;

    /*
     * If this is the first message of a
     * completely new conversation, create
     * the conversation first.
     */

    if (!chatId) {
      chatId = createChat();
    }

    const userMessage = {
      id: Date.now(),
      role: "user",
      text: trimmedMessage,
    };

    const existingMessages = messages;

    const updatedMessages = [
      ...existingMessages,
      userMessage,
    ];

    setMessages(updatedMessages);
    setMessage("");
    setIsSending(true);

    /*
     * Generate Sarvam title only for the
     * first user message.
     */

    if (existingMessages.length === 0) {
      try {
        const generatedTitle =
          await getSarvamTitle(
            trimmedMessage
          );

        setHistory((previous) => {
          const updated = previous.map(
            (chat) =>
              String(chat.id) ===
              String(chatId)
                ? {
                    ...chat,
                    title:
                      generatedTitle ||
                      "New conversation",
                  }
                : chat
          );

          localStorage.setItem(
            HISTORY_STORAGE_KEY,
            JSON.stringify(updated)
          );

          return updated;
        });
      } catch (error) {
        console.error(
          "Chat title generation failed:",
          error
        );
      }
    }

    /*
     * Convert frontend message structure
     * into Sarvam's role/content structure.
     */

    const conversation =
      updatedMessages
        .filter(
          (item) =>
            (item.role === "user" ||
              item.role ===
                "assistant") &&
            typeof item.text ===
              "string" &&
            item.text.trim()
        )
        .map((item) => ({
          role: item.role,
          content: item.text.trim(),
        }));

    const assistantMessageId =
      Date.now() + 1;

    try {
      const connectedContext =
        await getGoogleDriveContext(trimmedMessage);

      const answer =
        await getSarvamResponse(
          conversation,
          connectedContext
        );

      const assistantMessage = {
  id: assistantMessageId,
  role: "assistant",
  text: "",
  prompt: trimmedMessage,
  typing: true,
};

      setMessages((previous) => [
        ...previous,
        assistantMessage,
      ]);

      await typeAssistantMessage(
        answer ||
          "I wasn't able to generate a response right now.",
        assistantMessageId
      );
    } catch (error) {
      console.error(
        "Lawlite chat error:",
        error
      );

      setMessages((previous) => [
        ...previous,
        {
          id: assistantMessageId,
          role: "assistant",
          text:
            "Sorry, I couldn't process that right now. Please make sure the Lawlite backend is running and try again.",
        },
      ]);
    } finally {
      setIsSending(false);

      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
    }
  };

  /*
   * =========================================
   * TEXTAREA
   * =========================================
   */

  const handleTextareaKeyDown = (
    event
  ) => {
    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();
      handleSend();
    }
  };

  /*
   * =========================================
   * LOGOUT
   * =========================================
   */

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error(
        "Logout error:",
        error
      );
    }

    localStorage.removeItem(
      ACTIVE_CHAT_STORAGE_KEY
    );

    navigate("/login");
  };

  /*
   * =========================================
   * SAVE PROFILE
   * =========================================
   */

  const handleSaveProfile = () => {
    const updatedProfile = {
      ...profile,
      name: profile?.name?.trim() || "there",
      interests:
        profile?.interests || [],
    };

    localStorage.setItem(
      "lawlite-onboarding",
      JSON.stringify(updatedProfile)
    );

    setProfile(updatedProfile);
    setSettingsOpen(false);
  };

  /*
   * =========================================
   * TOGGLE INTEREST
   * =========================================
   */

  const toggleInterest = (interestId) => {
    setProfile((previous) => {
      const currentInterests =
        previous?.interests || [];

      const alreadySelected =
        currentInterests.includes(
          interestId
        );

      return {
        ...previous,
        interests: alreadySelected
          ? currentInterests.filter(
              (item) =>
                item !== interestId
            )
          : [
              ...currentInterests,
              interestId,
            ],
      };
    });
  };

  /*
   * =========================================
   * SEARCH RESULTS
   * =========================================
   */

  const filteredHistory =
    useMemo(() => {
      const query =
        searchQuery.trim().toLowerCase();

      if (!query) {
        return history;
      }

      return history.filter((chat) => {
        const title =
          chat.title?.toLowerCase() ||
          "";

        const chatText =
          chat.messages
            ?.map((item) => item.text)
            .join(" ")
            .toLowerCase() || "";

        return (
          title.includes(query) ||
          chatText.includes(query)
        );
      });
    }, [history, searchQuery]);

  /*
   * =========================================
   * RENDER
   * =========================================
   */

  return (
    <main className="chat-page">

      {/* =========================================
          MOBILE SIDEBAR OVERLAY
      ========================================= */}

      {sidebarOpen && (
        <div
          className="chat-sidebar-overlay"
          onClick={() =>
            setSidebarOpen(false)
          }
        />
      )}

      {/* =========================================
          SIDEBAR
      ========================================= */}

      <aside
        className={`chat-sidebar ${
          sidebarOpen
            ? "chat-sidebar-open"
            : ""
        }`}
      >

        <div className="chat-sidebar-top">

          {/* Brand */}

          <div className="chat-sidebar-brand">

            <div className="chat-brand-mark">
              <Shield size={16} />
            </div>

            <span>LAWLITE</span>

            <button
              type="button"
              className="chat-mobile-close"
              onClick={() =>
                setSidebarOpen(false)
              }
            >
              <X size={17} />
            </button>

          </div>

          {/* New chat */}

          <button
            type="button"
            className="chat-new-button"
            onClick={handleNewChat}
          >
            <Plus size={16} />
            <span>
              New conversation
            </span>
          </button>

          {/* Search */}

          <button
            type="button"
            className="chat-search-button"
            onClick={() =>
              setSearchOpen(true)
            }
          >
            <Search size={16} />

            <span>
              Search chats
            </span>

            <kbd>/</kbd>
          </button>

        </div>

        {/* =====================================
            HISTORY
        ===================================== */}

        <div className="chat-history">

          <div className="chat-history-heading">
            <span>
              RECENT
            </span>

            <span>
              {history.length}
            </span>
          </div>

          {history.length === 0 ? (
            <div className="chat-history-empty">
              <span>
                Your conversations will
                appear here.
              </span>
            </div>
          ) : (
            history.map((item) => (
              <button
                type="button"
                className={`chat-history-item ${
                  String(item.id) ===
                  String(currentChatId)
                    ? "active"
                    : ""
                }`}
                key={item.id}
                onClick={() =>
                  handleSelectHistory(
                    item
                  )
                }
              >
                <FileText size={15} />

                <div className="chat-history-text">
                  <span>
                    {item.title ||
                      "New conversation"}
                  </span>

                  <small>
                    {item.date ||
                      "Today"}
                  </small>
                </div>

                <MoreHorizontal
                  size={15}
                  className="chat-history-more"
                />
              </button>
            ))
          )}

        </div>

        {/* =====================================
            SIDEBAR BOTTOM
        ===================================== */}

        <div className="chat-sidebar-bottom">
<button
  type="button"
  className="chat-sidebar-action"
  onClick={() => {
    setConnectorsOpen(true);
    setConnectorNotice("");
    setSidebarOpen(false);
  }}
>
  <Cable size={16} />

  <span>
    Connectors
  </span>
</button>
  <button
    type="button"
    className="chat-sidebar-action logout"
    onClick={handleLogout}
  >
    <LogOut size={16} />

    <span>
      Log out
    </span>
  </button>

  <div className="chat-sidebar-profile">

    <div className="chat-avatar">
      {firstName
        .charAt(0)
        .toUpperCase()}
    </div>

    <div>
      <strong>
        {profile?.name ||
          "Lawlite user"}
      </strong>

      <span>
        Personal workspace
      </span>
    </div>

  </div>

</div>

</aside>

{/* =========================================
    MAIN CHAT AREA
========================================= */}

<section className="chat-main">

  {/* =====================================
      HEADER
  ===================================== */}

  <header className="chat-header">

    <div className="chat-header-left">

      <button
        type="button"
        className="chat-menu-button"
        onClick={() =>
          setSidebarOpen(true)
        }
      >
        <Menu size={19} />
      </button>

      <div className="chat-header-title">

        <div className="chat-header-icon">
          <Sparkles size={15} />
        </div>

        <div>
          <strong>
            Lawlite
          </strong>

          <span>
            AI legal assistant
          </span>
        </div>

      </div>

    </div>

    <div className="chat-header-actions">

      <button
        type="button"
        className="chat-settings-button"
        onClick={() =>
          setSettingsOpen(true)
        }
        title="Settings"
        aria-label="Open settings"
      >
        <Settings size={17} />
      </button>

    </div>

  </header>

        {/* =====================================
            CHAT BODY
        ===================================== */}

        <div className="chat-body">

          <div className="chat-conversation">

            {/* =================================
                WELCOME
            ================================= */}

            {messages.length === 0 && (
              <>
                <div className="chat-welcome">

                  <div className="chat-welcome-mark">

                    <div>
                      <ScaleMark />
                    </div>

                  </div>

                  <span className="chat-welcome-eyebrow">
                    LAWLITE AI
                  </span>

                  <h1>
                    {getGreeting()},
                    <br />
                    <em>{firstName}.</em>
                  </h1>

                  <p>
                    What would you like to
                    understand today?
                  </p>

                </div>

                {/* Starter suggestions */}

                <div className="chat-suggestions">

                  <button
                    type="button"
                    onClick={() => {
                      setMessage(
                        "Help me understand a legal notice"
                      );

                      setTimeout(() => {
                        textareaRef.current?.focus();
                      }, 50);
                    }}
                  >
                    <FileText size={15} />

                    <span>
                      Understand a legal notice
                    </span>

                    <ChevronDown
                      size={14}
                    />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMessage(
                        "Explain an Act in simple language"
                      );

                      setTimeout(() => {
                        textareaRef.current?.focus();
                      }, 50);
                    }}
                  >
                    <Scale size={15} />

                    <span>
                      Explain an Act simply
                    </span>

                    <ChevronDown
                      size={14}
                    />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMessage(
                        "What should I know about my legal rights?"
                      );

                      setTimeout(() => {
                        textareaRef.current?.focus();
                      }, 50);
                    }}
                  >
                    <Shield size={15} />

                    <span>
                      Understand my rights
                    </span>

                    <ChevronDown
                      size={14}
                    />
                  </button>

                </div>
              </>
            )}

            {/* =================================
                MESSAGES
            ================================= */}

            <div className="chat-messages">

              {messages.map((item) => (
                <div
                  className={`chat-message-row ${
                    item.role === "user"
                      ? "chat-message-user"
                      : "chat-message-assistant"
                  }`}
                  key={item.id}
                >

                  {item.role ===
                    "assistant" && (
                    <div className="chat-message-avatar">
                      <Sparkles size={14} />
                    </div>
                  )}

                  <div className="chat-message-content">
  <span className="chat-message-role">
    {item.role === "user"
      ? firstName
      : "Lawlite"}
  </span>

  <div className="chat-message-markdown">
    <ReactMarkdown>
      {item.text}
    </ReactMarkdown>

    {item.typing && (
      <span className="chat-typing-cursor">
        ▌
      </span>
    )}
  </div>

  {item.role === "assistant" &&
    item.text &&
    !item.typing && (
      <div className="chat-response-actions">

        <button
          type="button"
          className="chat-response-action"
          onClick={() =>
            handleCopyResponse(item)
          }
          title="Copy response"
        >
          {copiedResponseId === item.id ? (
            <Check size={14} />
          ) : (
            <Clipboard size={14} />
          )}

          <span>
            {copiedResponseId === item.id
              ? "Copied"
              : "Copy"}
          </span>
        </button>

        <button
          type="button"
          className={`chat-response-action ${
            responseFeedback[item.id] ===
            "good"
              ? "selected"
              : ""
          }`}
          onClick={() =>
            handleFeedback(item.id, "good")
          }
          title="Good response"
        >
          <ThumbsUp size={14} />
          <span>Good</span>
        </button>

        <button
          type="button"
          className={`chat-response-action ${
            responseFeedback[item.id] ===
            "bad"
              ? "selected"
              : ""
          }`}
          onClick={() =>
            handleFeedback(item.id, "bad")
          }
          title="Bad response"
        >
          <ThumbsDown size={14} />
          <span>Bad</span>
        </button>

        <button
          type="button"
          className="chat-response-action"
          onClick={() =>
            handleRegenerateResponse(item)
          }
          disabled={isSending}
          title="Regenerate response"
        >
          <RotateCcw size={14} />
          <span>Re-respond</span>
        </button>

        <button
          type="button"
          className="chat-response-action"
          onClick={() =>
            handleDownloadResponse(item)
          }
          title="Download response as PDF"
        >
          <Download size={14} />
          <span>Download</span>
        </button>

      </div>
    )}
</div>

                  </div>

                
              ))}

              {isSending &&
                messages[
                  messages.length - 1
                ]?.role === "user" && (
                  <div className="chat-message-row chat-message-assistant">

                    <div className="chat-message-avatar">
                      <Sparkles size={14} />
                    </div>

                    <div className="chat-message-content">

                      <span className="chat-message-role">
                        Lawlite
                      </span>

                      <p className="chat-thinking">
                        <span />
                        <span />
                        <span />
                      </p>

                    </div>

                  </div>
                )}

              <div
                ref={messagesEndRef}
              />

            </div>

          </div>

        </div>

        {/* =====================================
            COMPOSER
        ===================================== */}

        <div className="chat-composer-area">

          <div className="chat-composer">

            <button
              type="button"
              className="chat-attach-button"
              title="Attach document"
            >
              <Paperclip size={18} />
            </button>

            <textarea
              ref={textareaRef}
              value={message}
              onChange={(event) =>
                setMessage(
                  event.target.value
                )
              }
              onKeyDown={
                handleTextareaKeyDown
              }
              placeholder="Ask Lawlite anything about the law..."
              rows={1}
              disabled={isSending}
            />

            <button
              type="button"
              className={`chat-send-button ${
                message.trim() &&
                !isSending
                  ? "chat-send-active"
                  : ""
              }`}
              onClick={handleSend}
              disabled={
                !message.trim() ||
                isSending
              }
            >
              <ArrowUp size={17} />
            </button>

          </div>

        </div>

      </section>

      {/* =========================================
          SEARCH MODAL
      ========================================= */}

      {searchOpen && (
        <div
          className="chat-modal-backdrop"
          onClick={() =>
            setSearchOpen(false)
          }
        >
          <div
            className="chat-search-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <div className="chat-modal-heading">

              <div>
                <Search size={17} />

                <strong>
                  Search conversations
                </strong>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSearchOpen(false)
                }
              >
                <X size={17} />
              </button>

            </div>

            <div className="chat-modal-search-input">

              <Search size={16} />

              <input
                autoFocus
                value={searchQuery}
                onChange={(event) =>
                  setSearchQuery(
                    event.target.value
                  )
                }
                placeholder="Search your chats..."
              />

              <kbd>
                ESC
              </kbd>

            </div>

            <div className="chat-search-results">

              {filteredHistory.length === 0 ? (
                <div className="chat-search-empty">
                  <Search size={18} />

                  <span>
                    {history.length === 0
                      ? "No conversations yet."
                      : "No matching conversations found."}
                  </span>
                </div>
              ) : (
                filteredHistory.map(
                  (item) => (
                    <button
                      type="button"
                      className="chat-search-result"
                      key={item.id}
                      onClick={() =>
                        handleSelectHistory(
                          item
                        )
                      }
                    >
                      <FileText size={16} />

                      <div>
                        <strong>
                          {item.title ||
                            "New conversation"}
                        </strong>

                        <span>
                          {item.date ||
                            "Today"}
                        </span>
                      </div>
                    </button>
                  )
                )
              )}

            </div>

          </div>
        </div>
      )}

      {/* =========================================
          SETTINGS MODAL
      ========================================= */}

      {settingsOpen && (
        <div
          className="chat-modal-backdrop"
          onClick={() =>
            setSettingsOpen(false)
          }
        >
          <div
            className="chat-settings-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <div className="chat-modal-heading">

              <div>
                <Settings size={17} />

                <strong>
                  Profile & settings
                </strong>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSettingsOpen(false)
                }
              >
                <X size={17} />
              </button>

            </div>

            {/* Profile */}

            <div className="chat-profile-editor">

              <div className="chat-large-avatar">
                {firstName
                  .charAt(0)
                  .toUpperCase()}
              </div>

              <div>
                <strong>
                  {profile?.name ||
                    "Lawlite user"}
                </strong>

                <span>
                  Your personal Lawlite profile
                </span>
              </div>

            </div>

            {/* Name */}

            <label className="chat-setting-field">

              <span>
                Name
              </span>

              <input
                value={
                  profile?.name || ""
                }
                onChange={(event) =>
                  setProfile({
                    ...profile,
                    name: event.target.value,
                  })
                }
              />

            </label>

            {/* DOB */}

            <label className="chat-setting-field">

              <span>
                Date of birth
              </span>

              <input
                type="date"
                value={
                  profile?.dob || ""
                }
                onChange={(event) =>
                  setProfile({
                    ...profile,
                    dob: event.target.value,
                  })
                }
              />

            </label>

            {/* Interests */}

            <div className="chat-setting-interests">

              <div className="chat-setting-section-title">

                <span>
                  Interests
                </span>

                <small>
                  Choose what you care about
                </small>

              </div>

              <div className="chat-interest-grid">

                {interestOptions.map(
                  (interest) => {
                    const selected =
                      (
                        profile?.interests ||
                        []
                      ).includes(
                        interest.id
                      );

                    return (
                      <button
                        type="button"
                        key={interest.id}
                        className={`chat-interest-option ${
                          selected
                            ? "selected"
                            : ""
                        }`}
                        onClick={() =>
                          toggleInterest(
                            interest.id
                          )
                        }
                      >
                        <span>
                          {interest.label}
                        </span>

                        {selected && (
                          <Check
                            size={13}
                          />
                        )}
                      </button>
                    );
                  }
                )}

              </div>

            </div>

            {/* Appearance */}

            <div className="chat-setting-option">

              <div>
                {theme === "dark" ? (
                  <Moon size={16} />
                ) : (
                  <Sun size={16} />
                )}

                <div>
                  <strong>
                    Appearance
                  </strong>

                  <span>
                    {theme === "dark"
                      ? "Dark mode"
                      : "Light mode"}
                  </span>
                </div>
              </div>

              <button
                type="button"
                className="chat-setting-toggle"
                onClick={toggleTheme}
              >
                <span
                  className={
                    theme === "dark"
                      ? "dark"
                      : ""
                  }
                />
              </button>

            </div>

            {/* Save */}

            <button
              type="button"
              className="chat-save-button"
              onClick={
                handleSaveProfile
              }
            >
              <Check size={15} />
              Save changes
            </button>

          </div>
        </div>
      )}
      {/* =========================================
    CONNECTORS MODAL
========================================= */}

{connectorsOpen && (
  <div
    className="chat-modal-backdrop"
    onClick={() => {
      setConnectorsOpen(false);
      setConnectorNotice("");
    }}
  >
    <div
      className="chat-connectors-modal"
      onClick={(event) =>
        event.stopPropagation()
      }
    >

      {/* HEADER */}

      <div className="chat-modal-heading">
        <div>
          <Cable size={17} />

          <strong>
            Connectors
          </strong>
        </div>

        <button
          type="button"
          onClick={() => {
            setConnectorsOpen(false);
            setConnectorNotice("");
          }}
          aria-label="Close connectors"
        >
          <X size={17} />
        </button>
      </div>


      {/* INTRO */}

      <div className="chat-connectors-intro">
        <h2>
          Connect your tools.
        </h2>

        <p>
          Bring information from the apps you
          already use into your Lawlite workspace.
        </p>
      </div>


      {/* CONNECTOR GROUPS */}

      <div className="chat-connectors-list">

        {connectorGroups.map((group) => (
          <section
            className="chat-connector-group"
            key={group.title}
          >

            <div className="chat-connector-group-title">
              {group.title}
            </div>

            <div className="chat-connector-grid">

              {group.items.map((connector) => {
                const Icon =
                  connector.icon;

                return (
                  <button
                    type="button"
                    className={`chat-connector-card ${
                      connectorStatus[connector.id]
                        ? "connected"
                        : ""
                    }`}
                    disabled={
                      connectorLoading &&
                      connector.id === "google-drive"
                    }
                    key={connector.id}
                    onClick={() =>
                      handleConnectorClick(
                        connector
                      )
                    }
                  >

                    <div className="chat-connector-icon">
                      <Icon size={22} />
                    </div>

                    <div className="chat-connector-info">
                      <strong>
                        {connector.name}
                      </strong>

                      <span>
                        {connectorStatus[connector.id]
                          ? "Connected — Lawlite can use this source"
                          : connector.description}
                      </span>
                    </div>

                    <span className="chat-connector-arrow">
                      {connectorStatus[connector.id] ? (
                        <Unplug size={18} />
                      ) : (
                        "→"
                      )}
                    </span>

                  </button>
                );
              })}

            </div>

          </section>
        ))}

      </div>


      {/* NOTICE */}

      {connectorNotice && (
        <div className="chat-connector-notice">
          <span>
            {connectorNotice}
          </span>

          <button
            type="button"
            onClick={() =>
              setConnectorNotice("")
            }
          >
            <X size={13} />
          </button>
        </div>
      )}


      {/* FOOTER */}

      <div className="chat-connectors-footer">
        <Shield size={13} />

        <span>
          You control which services Lawlite can access.
        </span>
      </div>

    </div>
  </div>
)}

    </main>
  );
};

/* =============================================
   SMALL CUSTOM SCALE MARK
============================================= */

const ScaleMark = () => {
  return (
    <div className="chat-scale-mark">

      <span className="scale-pole" />

      <span className="scale-beam" />

      <span className="scale-left">
        <i />
      </span>

      <span className="scale-right">
        <i />
      </span>

      <span className="scale-base" />

    </div>
  );
};

export default Chat;