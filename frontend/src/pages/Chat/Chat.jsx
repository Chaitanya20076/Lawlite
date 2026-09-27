import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { useNavigate } from "react-router-dom";

import {
  ArrowUp,
  Check,
  ChevronDown,
  Clipboard,
  Download,
  FileText,
  LogOut,
  Menu,
  Moon,
  MoreHorizontal,
  Paperclip,
  Play,
  Plus,
  RotateCcw,
  Share2,
  Archive,
  Scale,
  Search,
  Settings,
  Shield,
  Sparkles,
  Sun,
  ThumbsDown,
  Cable,
  ThumbsUp,
  Trash2,
  Unplug,
  X,
} from "lucide-react";

import {
  SiDropbox,
  SiGithub,
  SiGmail,
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
  const chatNoticeTimeoutRef = useRef(null);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [chatMenuOpenId, setChatMenuOpenId] = useState(null);
  const [deleteChatTarget, setDeleteChatTarget] = useState(null);
  const [capsuleChatTarget, setCapsuleChatTarget] = useState(null);
  const [chatActionNotice, setChatActionNotice] = useState("");
  const [openVideoReferencesId, setOpenVideoReferencesId] = useState(null);
  const [activeVideoByMessageId, setActiveVideoByMessageId] = useState({});
  const [connectorsOpen, setConnectorsOpen] = useState(false);
  
const [connectorNotice, setConnectorNotice] = useState("");

  const [searchQuery, setSearchQuery] = useState("");

  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [responseFeedback, setResponseFeedback] = useState({});
const [copiedResponseId, setCopiedResponseId] = useState(null);
const [copiedCodeBlockId, setCopiedCodeBlockId] = useState(null);

  const [connectorStatus, setConnectorStatus] = useState({
  "google-drive": false,
  dropbox: false,
  notion: false,
  gmail: false,
  github: false,
});
  const [connectorLoading, setConnectorLoading] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState(null);

  const getFirebaseIdToken = async () => {
  /*
   * Prefer the Firebase auth instance directly.
   * This avoids relying only on React state, which may
   * briefly still be null immediately after page load.
   */
  let user = auth.currentUser;

  /*
   * Fall back to the React state if Firebase has already
   * resolved the authenticated user there.
   */
  if (!user) {
    user = firebaseUser;
  }

  /*
   * If auth state has not resolved yet, wait for it once.
   */
  if (!user) {
    user = await new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(
        auth,
        (currentUser) => {
          unsubscribe();
          resolve(currentUser);
        }
      );
    });
  }

  if (!user) {
    throw new Error(
      "You must be logged in to connect a service."
    );
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

const checkDropboxStatus = async () => {
  try {
    const idToken = await getFirebaseIdToken();
    const response = await fetch(
      `${API_BASE_URL}/api/connectors/dropbox/status`,
      {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      }
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(
        data?.message || "Unable to check Dropbox status."
      );
    }

    const connected = Boolean(data.connected);

    setConnectorStatus((previous) => ({
      ...previous,
      dropbox: connected,
    }));

    return connected;
  } catch (error) {
    console.error("Dropbox status error:", error);
    setConnectorStatus((previous) => ({
      ...previous,
      dropbox: false,
    }));
    return false;
  }
};

const handleDropboxConnect = async () => {
  try {
    setConnectorLoading(true);
    setConnectorNotice("Preparing Dropbox connection...");

    const idToken = await getFirebaseIdToken();
    const response = await fetch(
      `${API_BASE_URL}/api/connectors/dropbox/authorize`,
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
        data?.message || "Unable to start Dropbox connection."
      );
    }

    window.location.href = data.authorizationUrl;
  } catch (error) {
    console.error("Dropbox connection error:", error);
    setConnectorNotice(
      error.message || "Unable to connect Dropbox."
    );
    setConnectorLoading(false);
  }
};

const handleDropboxDisconnect = async () => {
  try {
    setConnectorLoading(true);
    setConnectorNotice("Disconnecting Dropbox...");

    const idToken = await getFirebaseIdToken();
    const response = await fetch(
      `${API_BASE_URL}/api/connectors/dropbox/disconnect`,
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
        data?.message || "Unable to disconnect Dropbox."
      );
    }

    setConnectorStatus((previous) => ({
      ...previous,
      dropbox: false,
    }));

    setConnectorNotice("Dropbox disconnected.");
  } catch (error) {
    console.error("Dropbox disconnect error:", error);
    setConnectorNotice(
      error.message || "Unable to disconnect Dropbox."
    );
  } finally {
    setConnectorLoading(false);
  }
};

const checkNotionStatus = async () => {
  try {
    const idToken = await getFirebaseIdToken();
    const response = await fetch(
      `${API_BASE_URL}/api/connectors/notion/status`,
      {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      }
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(
        data?.message ||
          "Unable to check Notion status."
      );
    }

    const connected = Boolean(data.connected);

    setConnectorStatus((previous) => ({
      ...previous,
      notion: connected,
    }));

    return connected;
  } catch (error) {
    console.error("Notion status error:", error);
    setConnectorStatus((previous) => ({
      ...previous,
      notion: false,
    }));
    return false;
  }
};

const handleNotionConnect = async () => {
  try {
    setConnectorLoading(true);
    setConnectorNotice(
      "Preparing Notion connection..."
    );

    const idToken = await getFirebaseIdToken();

    const response = await fetch(
      `${API_BASE_URL}/api/connectors/notion/authorize`,
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
          "Unable to start Notion connection."
      );
    }

    window.location.href = data.authorizationUrl;
  } catch (error) {
    console.error("Notion connection error:", error);
    setConnectorNotice(
      error.message ||
        "Unable to connect Notion."
    );
    setConnectorLoading(false);
  }
};

const handleNotionDisconnect = async () => {
  try {
    setConnectorLoading(true);
    setConnectorNotice("Disconnecting Notion...");

    const idToken = await getFirebaseIdToken();

    const response = await fetch(
      `${API_BASE_URL}/api/connectors/notion/disconnect`,
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
        data?.message ||
          "Unable to disconnect Notion."
      );
    }

    setConnectorStatus((previous) => ({
      ...previous,
      notion: false,
    }));

    setConnectorNotice("Notion disconnected.");
  } catch (error) {
    console.error("Notion disconnect error:", error);
    setConnectorNotice(
      error.message ||
        "Unable to disconnect Notion."
    );
  } finally {
    setConnectorLoading(false);
  }
};

const checkGmailStatus = async () => {
  try {
    const idToken = await getFirebaseIdToken();
    const response = await fetch(
      `${API_BASE_URL}/api/connectors/gmail/status`,
      {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      }
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(
        data?.message ||
          "Unable to check Gmail status."
      );
    }

    const connected = Boolean(data.connected);

    setConnectorStatus((previous) => ({
      ...previous,
      gmail: connected,
    }));

    return connected;
  } catch (error) {
    console.error("Gmail status error:", error);
    setConnectorStatus((previous) => ({
      ...previous,
      gmail: false,
    }));
    return false;
  }
};

const handleGmailConnect = async () => {
  try {
    setConnectorLoading(true);
    setConnectorNotice(
      "Preparing Gmail connection..."
    );

    const idToken = await getFirebaseIdToken();

    const response = await fetch(
      `${API_BASE_URL}/api/connectors/gmail/authorize`,
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
          "Unable to start Gmail connection."
      );
    }

    window.location.href = data.authorizationUrl;
  } catch (error) {
    console.error("Gmail connection error:", error);
    setConnectorNotice(
      error.message ||
        "Unable to connect Gmail."
    );
    setConnectorLoading(false);
  }
};

const handleGmailDisconnect = async () => {
  try {
    setConnectorLoading(true);
    setConnectorNotice("Disconnecting Gmail...");

    const idToken = await getFirebaseIdToken();

    const response = await fetch(
      `${API_BASE_URL}/api/connectors/gmail/disconnect`,
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
        data?.message ||
          "Unable to disconnect Gmail."
      );
    }

    setConnectorStatus((previous) => ({
      ...previous,
      gmail: false,
    }));

    setConnectorNotice("Gmail disconnected.");
  } catch (error) {
    console.error("Gmail disconnect error:", error);
    setConnectorNotice(
      error.message ||
        "Unable to disconnect Gmail."
    );
  } finally {
    setConnectorLoading(false);
  }
};
const checkGithubStatus = async () => {
  try {
    const idToken =
      await getFirebaseIdToken();

    const response =
      await fetch(
        `${API_BASE_URL}/api/connectors/github/status`,
        {
          headers: {
            Authorization:
              `Bearer ${idToken}`,
          },
        }
      );

    const data =
      await response.json();

    if (
      !response.ok ||
      !data.success
    ) {
      throw new Error(
        data?.message ||
          "Unable to check GitHub status."
      );
    }

    const connected =
      Boolean(data.connected);

    setConnectorStatus(
      (previous) => ({
        ...previous,
        github: connected,
      })
    );

    return connected;
  } catch (error) {
    console.error(
      "GitHub status error:",
      error
    );

    setConnectorStatus(
      (previous) => ({
        ...previous,
        github: false,
      })
    );

    return false;
  }
};


const handleGithubConnect =
  async () => {
    try {
      setConnectorLoading(true);

      setConnectorNotice(
        "Preparing GitHub connection..."
      );

      const idToken =
        await getFirebaseIdToken();

      const response =
        await fetch(
          `${API_BASE_URL}/api/connectors/github/authorize`,
          {
            method: "GET",

            headers: {
              Authorization:
                `Bearer ${idToken}`,
            },
          }
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data?.message ||
            "Unable to start GitHub connection."
        );
      }

      window.location.href =
        data.authorizationUrl;
    } catch (error) {
      console.error(
        "GitHub connection error:",
        error
      );

      setConnectorNotice(
        error.message ||
          "Unable to connect GitHub."
      );

      setConnectorLoading(false);
    }
  };


const handleGithubDisconnect =
  async () => {
    try {
      setConnectorLoading(true);

      setConnectorNotice(
        "Disconnecting GitHub..."
      );

      const idToken =
        await getFirebaseIdToken();

      const response =
        await fetch(
          `${API_BASE_URL}/api/connectors/github/disconnect`,
          {
            method: "DELETE",

            headers: {
              Authorization:
                `Bearer ${idToken}`,
            },
          }
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data?.message ||
            "Unable to disconnect GitHub."
        );
      }

      setConnectorStatus(
        (previous) => ({
          ...previous,
          github: false,
        })
      );

      setConnectorNotice(
        "GitHub disconnected."
      );
    } catch (error) {
      console.error(
        "GitHub disconnect error:",
        error
      );

      setConnectorNotice(
        error.message ||
          "Unable to disconnect GitHub."
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

  if (connector.id === "dropbox") {
    if (connectorStatus.dropbox) {
      handleDropboxDisconnect();
    } else {
      handleDropboxConnect();
    }
    return;
  }

  if (connector.id === "notion") {
    if (connectorStatus.notion) {
      handleNotionDisconnect();
    } else {
      handleNotionConnect();
    }
    return;
  }

  if (connector.id === "gmail") {
    if (connectorStatus.gmail) {
      handleGmailDisconnect();
    } else {
      handleGmailConnect();
    }
    return;
  }
  if (connector.id === "github") {
  if (connectorStatus.github) {
    handleGithubDisconnect();
  } else {
    handleGithubConnect();
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

    const syncConnectorStatus = async () => {
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
      } else if (connector === "dropbox" && status === "connected") {
        setConnectorsOpen(true);
        setConnectorNotice("Dropbox connected successfully.");
      } else if (connector === "dropbox" && status === "cancelled") {
        setConnectorsOpen(true);
        setConnectorNotice("Dropbox connection was cancelled.");
      } else if (connector === "dropbox" && status === "error") {
        setConnectorsOpen(true);
        setConnectorNotice("Dropbox could not be connected.");
      } else if (connector === "notion" && status === "connected") {
        setConnectorsOpen(true);
        setConnectorNotice("Notion connected successfully.");
      } else if (connector === "notion" && status === "cancelled") {
        setConnectorsOpen(true);
        setConnectorNotice("Notion connection was cancelled.");
      } else if (connector === "notion" && status === "error") {
        setConnectorsOpen(true);
        setConnectorNotice("Notion could not be connected.");
      } else if (
        connector === "gmail" &&
        status === "connected"
      ) {
        setConnectorsOpen(true);
        setConnectorNotice(
          "Gmail connected successfully."
        );
      } else if (
        connector === "gmail" &&
        status === "cancelled"
      ) {
        setConnectorsOpen(true);
        setConnectorNotice(
          "Gmail connection was cancelled."
        );
      } else if (
        connector === "gmail" &&
        status === "error"
      ) {
        setConnectorsOpen(true);
        setConnectorNotice(
          "Gmail could not be connected."
        );
      } else if (
        connector === "github" &&
        status === "connected"
      ) {
        setConnectorsOpen(true);
        setConnectorNotice(
          "GitHub connected successfully."
        );
      } else if (
        connector === "github" &&
        status === "cancelled"
      ) {
        setConnectorsOpen(true);
        setConnectorNotice(
          "GitHub connection was cancelled."
        );
      } else if (
        connector === "github" &&
        status === "error"
      ) {
        setConnectorsOpen(true);
        setConnectorNotice(
          "GitHub could not be connected."
        );
      }

      if (!firebaseUser) {
        console.warn("Connector status check skipped: no Firebase user.");
        if (connector || status) {
          window.history.replaceState({}, document.title, "/chat");
        }
        return;
      }

      const googleConnected = await checkGoogleDriveStatus();
      const dropboxConnected = await checkDropboxStatus();
      const notionConnected = await checkNotionStatus();
      const gmailConnected = await checkGmailStatus();
      const githubConnected =
  await checkGithubStatus();

      if (!mounted) return;

      if (
        connector === "google-drive" &&
        status === "connected" &&
        googleConnected
      ) {
        setConnectorNotice(
          "Google Drive connected successfully. Lawlite can now use your Drive documents."
        );
      }

      if (
        connector === "dropbox" &&
        status === "connected" &&
        dropboxConnected
      ) {
        setConnectorNotice(
          "Dropbox connected successfully. Lawlite can now use your Dropbox files."
        );
      }

      if (
        connector === "notion" &&
        status === "connected" &&
        notionConnected
      ) {
        setConnectorNotice(
          "Notion connected successfully. Lawlite can now use your Notion pages."
        );
      }

            if (
        connector === "gmail" &&
        status === "connected" &&
        gmailConnected
      ) {
        setConnectorNotice(
          "Gmail connected successfully. Lawlite can now search your emails."
        );
      }

      if (
        connector === "github" &&
        status === "connected" &&
        githubConnected
      ) {
        setConnectorNotice(
          "GitHub connected successfully. Lawlite can now search your repositories."
        );
      }

      if (connector || status) {
        window.history.replaceState(
          {},
          document.title,
          "/chat"
        );
      }
    };
    

    syncConnectorStatus();

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
        setChatMenuOpenId(null);
        setDeleteChatTarget(null);
        setCapsuleChatTarget(null);
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

      if (chatNoticeTimeoutRef.current) {
        window.clearTimeout(
          chatNoticeTimeoutRef.current
        );
      }
    };
  }, []);

  /*
   * =========================================
   * AUTO SCROLL
   * =========================================
   */

  useEffect(() => {
  messagesEndRef.current?.scrollIntoView({
    behavior: "auto",
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
    setOpenVideoReferencesId(null);
    setActiveVideoByMessageId({});

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
   * DELETE CHAT
   * =========================================
   */

  const handleDeleteChat = (chatId) => {
    setHistory((previous) => {
      const updated =
        previous.filter(
          (chat) =>
            String(chat.id) !==
            String(chatId)
        );

      localStorage.setItem(
        HISTORY_STORAGE_KEY,
        JSON.stringify(updated)
      );

      return updated;
    });

    /*
     * If the deleted chat is currently open,
     * clear the active conversation.
     */
    if (
      String(currentChatId) ===
      String(chatId)
    ) {
      typingIntervalsRef.current.forEach(
        (interval) =>
          clearInterval(interval)
      );

      typingIntervalsRef.current = [];

      setMessages([]);
      setCurrentChatId(null);
      setMessage("");
      setIsSending(false);
      setOpenVideoReferencesId(null);
      setActiveVideoByMessageId({});

      localStorage.removeItem(
        ACTIVE_CHAT_STORAGE_KEY
      );
    }

    setChatMenuOpenId(null);
    setDeleteChatTarget(null);

    if (
      capsuleChatTarget &&
      String(capsuleChatTarget.id) ===
        String(chatId)
    ) {
      setCapsuleChatTarget(null);
    }

    setTimeout(() => {
      textareaRef.current?.focus();
    }, 100);
  };

  /*
   * =========================================
   * CHAT SHARING
   * =========================================
   */

  const buildChatShareText = (chat) => {
    const chatMessages = Array.isArray(chat?.messages)
      ? chat.messages.filter(
          (item) =>
            (item?.role === "user" ||
              item?.role === "assistant") &&
            typeof item?.text === "string" &&
            item.text.trim()
        )
      : [];

    const lines = [
      `LAWLITE — ${chat?.title || "Legal conversation"}`,
      "",
      `Date: ${chat?.date || "Today"}`,
      "",
    ];

    chatMessages.forEach((item) => {
      const speaker =
        item.role === "user"
          ? "You"
          : "Lawlite";

      lines.push(`${speaker}:`);
      lines.push(item.text.trim());
      lines.push("");
    });

    lines.push("Shared from Lawlite.");

    return lines.join("\n");
  };

  const copyTextToClipboard = async (text) => {
    if (
      navigator.clipboard &&
      typeof navigator.clipboard.writeText === "function"
    ) {
      await navigator.clipboard.writeText(text);
      return true;
    }

    const temporaryTextArea =
      document.createElement("textarea");

    temporaryTextArea.value = text;
    temporaryTextArea.setAttribute(
      "readonly",
      ""
    );
    temporaryTextArea.style.position = "fixed";
    temporaryTextArea.style.opacity = "0";
    temporaryTextArea.style.pointerEvents = "none";

    document.body.appendChild(temporaryTextArea);
    temporaryTextArea.select();

    let copied = false;

    try {
      copied = Boolean(
        document.execCommand("copy")
      );
    } catch {
      copied = false;
    }

    document.body.removeChild(temporaryTextArea);

    return copied;
  };

  const showChatActionNotice = (notice) => {
    setChatActionNotice(notice);

    if (chatNoticeTimeoutRef.current) {
      window.clearTimeout(
        chatNoticeTimeoutRef.current
      );
    }

    chatNoticeTimeoutRef.current =
      window.setTimeout(() => {
        setChatActionNotice("");
        chatNoticeTimeoutRef.current = null;
      }, 2600);
  };

  const handleShareChat = async (chat) => {
    setChatMenuOpenId(null);

    if (!chat) {
      return;
    }

    const chatMessages = Array.isArray(chat.messages)
      ? chat.messages.filter(
          (item) =>
            (item?.role === "user" ||
              item?.role === "assistant") &&
            typeof item?.text === "string" &&
            item.text.trim()
        )
      : [];

    if (!chatMessages.length) {
      showChatActionNotice(
        "There is nothing to share in this conversation yet."
      );
      return;
    }

    const shareText =
      buildChatShareText(chat);

    if (
      navigator.share &&
      typeof navigator.share === "function"
    ) {
      try {
        await navigator.share({
          title:
            chat.title ||
            "Lawlite conversation",
          text: shareText,
        });

        showChatActionNotice(
          "Conversation shared successfully."
        );
        return;
      } catch (error) {
        if (error?.name === "AbortError") {
          return;
        }
      }
    }

    try {
      const copied =
        await copyTextToClipboard(
          shareText
        );

      if (copied) {
        showChatActionNotice(
          "Conversation copied. You can paste it anywhere to share."
        );
      } else {
        showChatActionNotice(
          "Could not copy the conversation. Please try again."
        );
      }
    } catch (error) {
      console.error(
        "Share chat error:",
        error
      );
      showChatActionNotice(
        "Could not share this conversation right now."
      );
    }
  };

  /*
   * =========================================
   * CHAT CAPSULE
   * =========================================
   *
   * A capsule is a compact, portable snapshot
   * of a conversation. It is built locally from
   * the saved chat history, so it does not create
   * another AI request.
   */

  const buildChatCapsule = (chat) => {
    const chatMessages = Array.isArray(chat?.messages)
      ? chat.messages.filter(
          (item) =>
            (item?.role === "user" ||
              item?.role === "assistant") &&
            typeof item?.text === "string" &&
            item.text.trim()
        )
      : [];

    const userQuestions =
      chatMessages
        .filter((item) => item.role === "user")
        .map((item) => item.text.trim())
        .filter(Boolean);

    const assistantMessages =
      chatMessages
        .filter((item) => item.role === "assistant")
        .map((item) => item.text.trim())
        .filter(Boolean);

    const coreIssue =
      userQuestions[0] ||
      "No user question recorded.";

    const latestGuidance =
      assistantMessages[assistantMessages.length - 1] ||
      "No Lawlite response recorded yet.";

    return {
      title:
        chat?.title ||
        "Lawlite Legal Conversation",
      date: chat?.date || "Today",
      messageCount: chatMessages.length,
      coreIssue,
      questions: userQuestions
        .slice(1, 4)
        .map((question) =>
          question.length > 260
            ? `${question.slice(0, 257)}...`
            : question
        ),
      latestGuidance,
    };
  };

  const getCapsuleText = (capsule) => {
    const lines = [
      "LAWLITE — CHAT CAPSULE",
      "",
      `Title: ${capsule.title}`,
      `Date: ${capsule.date}`,
      `Messages: ${capsule.messageCount}`,
      "",
      "CORE ISSUE",
      capsule.coreIssue,
      "",
    ];

    if (capsule.questions.length) {
      lines.push("OTHER QUESTIONS");

      capsule.questions.forEach(
        (question, index) => {
          lines.push(
            `${index + 1}. ${question}`
          );
        }
      );

      lines.push("");
    }

    lines.push("LATEST LAWLITE GUIDANCE");
    lines.push(capsule.latestGuidance);
    lines.push("");
    lines.push(
      "This capsule is a compact record of the conversation and is not a substitute for professional legal advice."
    );

    return lines.join("\n");
  };

  const handleCreateCapsule = (chat) => {
    setChatMenuOpenId(null);

    if (!chat) {
      return;
    }

    const chatMessages = Array.isArray(chat.messages)
      ? chat.messages.filter(
          (item) =>
            (item?.role === "user" ||
              item?.role === "assistant") &&
            typeof item?.text === "string" &&
            item.text.trim()
        )
      : [];

    if (!chatMessages.length) {
      showChatActionNotice(
        "There is nothing to capsule in this conversation yet."
      );
      return;
    }

    setCapsuleChatTarget(chat);
  };

  const handleCopyCapsule = async () => {
    if (!capsuleChatTarget) {
      return;
    }

    try {
      const capsule =
        buildChatCapsule(
          capsuleChatTarget
        );

      const copied =
        await copyTextToClipboard(
          getCapsuleText(capsule)
        );

      if (copied) {
        showChatActionNotice(
          "Chat capsule copied to your clipboard."
        );
      } else {
        showChatActionNotice(
          "Could not copy the chat capsule."
        );
      }
    } catch (error) {
      console.error(
        "Copy capsule error:",
        error
      );
    }
  };

  const handleDownloadCapsule = () => {
    if (!capsuleChatTarget) {
      return;
    }

    const capsule =
      buildChatCapsule(
        capsuleChatTarget
      );

    const pdf = new jsPDF({
      unit: "mm",
      format: "a4",
    });

    const pageWidth =
      pdf.internal.pageSize.getWidth();
    const pageHeight =
      pdf.internal.pageSize.getHeight();
    const margin = 18;
    const usableWidth =
      pageWidth - margin * 2;
    let y = 20;

    const addWrappedText = (
      text,
      fontSize = 10,
      lineHeight = 5.5
    ) => {
      pdf.setFontSize(fontSize);

      const lines = pdf.splitTextToSize(
        String(text || ""),
        usableWidth
      );

      lines.forEach((line) => {
        if (y > pageHeight - 20) {
          pdf.addPage();
          y = 20;
        }

        pdf.text(
          line,
          margin,
          y
        );

        y += lineHeight;
      });
    };

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(18);
    pdf.text("LAWLITE", margin, y);
    y += 8;

    pdf.setFontSize(13);
    pdf.text(
      "Chat Capsule",
      margin,
      y
    );
    y += 7;

    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(110, 110, 110);
    pdf.setFontSize(9);
    pdf.text(
      `${capsule.date} • ${capsule.messageCount} messages`,
      margin,
      y
    );
    y += 8;

    pdf.setTextColor(30, 30, 30);
    pdf.setDrawColor(220, 220, 220);
    pdf.line(
      margin,
      y,
      pageWidth - margin,
      y
    );
    y += 9;

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    pdf.text("TITLE", margin, y);
    y += 6;

    pdf.setFont("helvetica", "normal");
    addWrappedText(
      capsule.title,
      10,
      5.5
    );
    y += 3;

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    pdf.text("CORE ISSUE", margin, y);
    y += 6;

    pdf.setFont("helvetica", "normal");
    addWrappedText(
      capsule.coreIssue,
      10,
      5.5
    );
    y += 3;

    if (capsule.questions.length) {
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(11);
      pdf.text(
        "OTHER QUESTIONS",
        margin,
        y
      );
      y += 6;

      pdf.setFont("helvetica", "normal");

      capsule.questions.forEach(
        (question, index) => {
          addWrappedText(
            `${index + 1}. ${question}`,
            10,
            5.5
          );
          y += 1;
        }
      );

      y += 3;
    }

    if (y > pageHeight - 70) {
      pdf.addPage();
      y = 20;
    }

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    pdf.text(
      "LATEST LAWLITE GUIDANCE",
      margin,
      y
    );
    y += 6;

    pdf.setFont("helvetica", "normal");
    addWrappedText(
      capsule.latestGuidance,
      10,
      5.5
    );

    pdf.setTextColor(130, 130, 130);
    pdf.setFontSize(7.5);

    const footerText =
      "Lawlite Chat Capsule • For reference only • Not a substitute for professional legal advice";

    const totalPages =
      pdf.internal.getNumberOfPages();

    for (let page = 1; page <= totalPages; page += 1) {
      pdf.setPage(page);
      pdf.text(
        footerText,
        margin,
        pageHeight - 10
      );
      pdf.text(
        `Page ${page} of ${totalPages}`,
        pageWidth - margin,
        pageHeight - 10,
        { align: "right" }
      );
    }

    const safeFileName =
      capsule.title
        .slice(0, 60)
        .replace(/[^a-z0-9]+/gi, "-")
        .replace(/^-|-$/g, "")
        .toLowerCase() ||
      "chat-capsule";

    pdf.save(
      `lawlite-${safeFileName}-capsule.pdf`
    );

    showChatActionNotice(
      "Chat capsule downloaded as PDF."
    );
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
    setOpenVideoReferencesId(null);
    setActiveVideoByMessageId({});

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
   * YOUTUBE VIDEO REFERENCES
   * =========================================
   *
   * Frontend contract:
   * POST /api/chat/youtube
   *
   * The backend can use Serper to search YouTube for
   * the current legal context. The frontend accepts
   * several common response shapes so the backend can
   * stay flexible while we finish the integration.
   */

  const getYouTubeVideoId = (value) => {
    if (!value || typeof value !== "string") {
      return "";
    }

    const input = value.trim();

    if (/^[A-Za-z0-9_-]{11}$/.test(input)) {
      return input;
    }

    try {
      const url = new URL(input);
      const hostname = url.hostname.toLowerCase();

      if (hostname === "youtu.be") {
        return url.pathname
          .split("/")
          .filter(Boolean)[0] || "";
      }

      if (
        hostname === "youtube.com" ||
        hostname === "www.youtube.com" ||
        hostname === "m.youtube.com"
      ) {
        const queryId = url.searchParams.get("v");

        if (queryId) {
          return queryId;
        }

        const pathParts = url.pathname
          .split("/")
          .filter(Boolean);

        const videoIndex = pathParts.findIndex(
          (part) =>
            part === "shorts" ||
            part === "embed" ||
            part === "live"
        );

        if (videoIndex !== -1) {
          return pathParts[videoIndex + 1] || "";
        }
      }
    } catch {
      return "";
    }

    const fallbackMatch = input.match(
      /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/
    );

    return fallbackMatch?.[1] || "";
  };

  const normalizeYouTubeReferences = (references) => {
    if (!Array.isArray(references)) {
      return [];
    }

    const seen = new Set();

    return references
      .map((item) => {
        if (!item) {
          return null;
        }

        const link =
          item.link ||
          item.url ||
          item.youtubeUrl ||
          item.videoUrl ||
          "";

        const videoId =
          item.videoId ||
          item.id ||
          getYouTubeVideoId(link);

        const cleanId = getYouTubeVideoId(videoId);

        if (!cleanId || seen.has(cleanId)) {
          return null;
        }

        seen.add(cleanId);

        return {
          id: cleanId,
          title:
            item.title ||
            "YouTube video reference",
          channel:
            item.channel ||
            item.channelName ||
            item.source ||
            "YouTube",
          description:
            item.snippet ||
            item.description ||
            "",
          thumbnail:
            item.thumbnail ||
            item.thumbnailUrl ||
            item.imageUrl ||
            `https://i.ytimg.com/vi/${cleanId}/hqdefault.jpg`,
          duration: item.duration || "",
          publishedAt:
            item.publishedAt ||
            item.date ||
            "",
        };
      })
      .filter(Boolean)
      .slice(0, 5);
  };

  const getYouTubeReferences = async (conversation) => {
    if (!Array.isArray(conversation) || !conversation.length) {
      return [];
    }

    try {
      const idToken = await getFirebaseIdToken();

      const response = await fetch(
        `${API_BASE_URL}/api/chat/youtube`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            conversation,
          }),
        }
      );

      /*
       * The frontend is intentionally tolerant while the
       * backend Serper route is being added. A missing route
       * simply means there are currently no video references.
       */
      if (!response.ok) {
        return [];
      }

      const data = await response.json();

      if (!data?.success) {
        return [];
      }

      const rawReferences =
        data.videos ||
        data.videoReferences ||
        data.youtubeVideos ||
        data.youtube ||
        data.results ||
        [];

      return normalizeYouTubeReferences(
        rawReferences
      );
    } catch (error) {
      console.warn(
        "YouTube references unavailable:",
        error
      );
      return [];
    }
  };

  const attachYouTubeReferences = async (
    messageId,
    conversation
  ) => {
    if (!messageId) {
      return [];
    }

    const references =
      await getYouTubeReferences(
        conversation
      );

    if (!references.length) {
      return [];
    }

    setMessages((previous) =>
      previous.map((item) =>
        item.id === messageId
          ? {
              ...item,
              videoReferences: references,
            }
          : item
      )
    );

    return references;
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
    const idToken = await getFirebaseIdToken();

const response = await fetch(
  `${API_BASE_URL}/api/chat`,
  {
    method: "POST",

    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },

    body: JSON.stringify({
      conversation,
    }),
  }
);
/**
 * Convert the Drive tree into a clean human-readable
 * response for Lawlite.
 */
const formatDriveTree = (
  node,
  depth = 0
) => {
  if (!node) {
    return "";
  }

  const indent = "  ".repeat(depth);

  let output = "";

  if (node.type === "folder") {
    if (depth === 0) {
      output += `📁 ${node.name}\n`;
    } else {
      output += `${indent}📁 ${node.name}\n`;
    }
  } else {
    output += `${indent}📄 ${node.name}`;

    if (node.mimeType) {
      output += ` — ${node.mimeType}`;
    }

    output += "\n";

    return output;
  }

  if (Array.isArray(node.children)) {
    for (const child of node.children) {
      output += formatDriveTree(
        child,
        depth + 1
      );
    }
  }

  return output;
};

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
  conversation
) => {
  const idToken =
    await getFirebaseIdToken();

  const response =
    await fetch(
      `${API_BASE_URL}/api/chat/title`,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",

          Authorization:
            `Bearer ${idToken}`,
        },

        body: JSON.stringify({
          conversation,
        }),
      }
    );

  const data =
    await response.json();

  if (
    !response.ok ||
    !data.success
  ) {
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
/*
 * =========================================
 * COPY MARKDOWN CODE BLOCK
 * =========================================
 */

const handleCopyCodeBlock = async (
  code,
  blockId
) => {
  if (!code) {
    return;
  }

  try {
    if (
      navigator.clipboard &&
      typeof navigator.clipboard.writeText === "function"
    ) {
      await navigator.clipboard.writeText(code);
    } else {
      const textArea = document.createElement("textarea");
      textArea.value = code;
      textArea.setAttribute("readonly", "");
      textArea.style.position = "fixed";
      textArea.style.opacity = "0";
      textArea.style.pointerEvents = "none";
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
    }

    setCopiedCodeBlockId(blockId);

    setTimeout(() => {
      setCopiedCodeBlockId((current) =>
        current === blockId ? null : current
      );
    }, 1800);
  } catch (error) {
    console.error(
      "Copy code block failed:",
      error
    );
  }
};
  const typeAssistantMessage = (
  fullText,
  messageId
) => {
  return new Promise((resolve) => {
    let currentIndex = 0;

    const interval = setInterval(() => {
      currentIndex += 4;

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

    const finalAnswer =
      newAnswer ||
      "I wasn't able to generate a response right now.";

    const updatedResponse = {
      ...response,
      text: finalAnswer,
      typing: true,
      videoReferences: [],
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

    try {
      await attachYouTubeReferences(
        response.id,
        [
          ...conversation,
          {
            role: "assistant",
            content: finalAnswer,
          },
        ]
      );
    } catch (videoError) {
      console.warn(
        "YouTube reference lookup failed after regeneration:",
        videoError
      );
    }
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
  videoReferences: [],
};

      setMessages((previous) => [
        ...previous,
        assistantMessage,
      ]);

      const finalAnswer =
        answer ||
        "I wasn't able to generate a response right now.";

      await typeAssistantMessage(
        finalAnswer,
        assistantMessageId
      );

      /*
       * Look for YouTube references using the complete
       * context, including Lawlite's latest answer.
       * This never blocks the main legal response.
       */

      try {
        await attachYouTubeReferences(
          assistantMessageId,
          [
            ...conversation,
            {
              role: "assistant",
              content: finalAnswer,
            },
          ]
        );
      } catch (videoError) {
        console.warn(
          "YouTube reference lookup failed:",
          videoError
        );
      }

      /*
 * Generate the conversation title only
 * after Lawlite has produced the response.
 *
 * This gives the title generator both:
 * - the user's question
 * - Lawlite's response
 *
 * Title generation must never break
 * the actual chat response.
 */

if (
  existingMessages.length === 0
) {
  try {
    const titleConversation = [
      ...conversation,
      {
        role: "assistant",
        content:
          answer ||
          "I wasn't able to generate a response right now.",
      },
    ];

    const generatedTitle =
      await getSarvamTitle(
        titleConversation
      );

    if (
      generatedTitle &&
      generatedTitle.trim()
    ) {
      setHistory((previous) => {
        const updated =
          previous.map((chat) =>
            String(chat.id) ===
            String(chatId)
              ? {
                  ...chat,
                  title:
                    generatedTitle.trim(),
                }
              : chat
          );

        localStorage.setItem(
          HISTORY_STORAGE_KEY,
          JSON.stringify(updated)
        );

        return updated;
      });
    }
  } catch (error) {
    console.error(
      "Chat title generation failed:",
      error
    );
  }
}
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
              <div
                className="chat-history-item-wrapper"
                key={item.id}
              >
                <button
                  type="button"
                  className={`chat-history-item ${
                    String(item.id) ===
                    String(currentChatId)
                      ? "active"
                      : ""
                  }`}
                  onClick={() => {
                    setChatMenuOpenId(null);

                    handleSelectHistory(
                      item
                    );
                  }}
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
                </button>

                <button
                  type="button"
                  className="chat-history-more-button"
                  aria-label={`Options for ${
                    item.title ||
                    "New conversation"
                  }`}
                  onClick={(event) => {
                    event.stopPropagation();

                    setChatMenuOpenId(
                      (current) =>
                        String(current) ===
                        String(item.id)
                          ? null
                          : item.id
                    );
                  }}
                >
                  <MoreHorizontal
                    size={15}
                  />
                </button>

                {String(chatMenuOpenId) ===
                  String(item.id) && (
                  <div
                    className="chat-history-menu"
                    onClick={(event) =>
                      event.stopPropagation()
                    }
                  >
                    <button
                      type="button"
                      className="chat-history-menu-item"
                      onClick={() =>
                        handleShareChat(item)
                      }
                    >
                      <Share2 size={14} />

                      <span>
                        Share chat
                      </span>
                    </button>

                    <button
                      type="button"
                      className="chat-history-menu-item"
                      onClick={() =>
                        handleCreateCapsule(item)
                      }
                    >
                      <Archive size={14} />

                      <span>
                        Capsule chat
                      </span>
                    </button>

                    <button
                      type="button"
                      className="chat-history-menu-item delete"
                      onClick={() => {
                        setChatMenuOpenId(null);
                        setDeleteChatTarget(
                          item
                        );
                      }}
                    >
                      <Trash2 size={14} />

                      <span>
                        Delete chat
                      </span>
                    </button>
                  </div>
                )}
              </div>
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
    <ReactMarkdown
      components={{
        pre({ children }) {
          const blockId = `${item.id}-code`;

          let codeText = "";

          const codeElement =
            Array.isArray(children)
              ? children.find(
                  (child) =>
                    child?.props?.children != null
                )
              : children;

          if (codeElement) {
            const rawCode =
              codeElement.props?.children;

            codeText = Array.isArray(rawCode)
              ? rawCode.join("")
              : String(rawCode ?? "");
          }

          const isCopied =
            copiedCodeBlockId === blockId;

          return (
            <div className="chat-code-block">
              <div className="chat-code-block-header">
                <span>Copyable text</span>

                <button
                  type="button"
                  className="chat-code-copy-button"
                  onClick={() =>
                    handleCopyCodeBlock(
                      codeText,
                      blockId
                    )
                  }
                  title={
                    isCopied
                      ? "Copied"
                      : "Copy"
                  }
                  aria-label={
                    isCopied
                      ? "Copied"
                      : "Copy code block"
                  }
                >
                  {isCopied ? (
                    <Check size={13} />
                  ) : (
                    <Clipboard size={13} />
                  )}

                  <span>
                    {isCopied
                      ? "Copied"
                      : "Copy"}
                  </span>
                </button>
              </div>

              <pre>{children}</pre>
            </div>
          );
        },
      }}
    >
      {item.text}
    </ReactMarkdown>

    {item.typing && (
      <span className="chat-typing-cursor">
        ▌
      </span>
    )}
  </div>

  {item.role === "assistant" &&
    !item.typing &&
    Array.isArray(item.videoReferences) &&
    item.videoReferences.length > 0 && (
      <div className="chat-video-references">

        <button
          type="button"
          className={`chat-video-reference-toggle ${
            String(openVideoReferencesId) ===
            String(item.id)
              ? "open"
              : ""
          }`}
          onClick={() => {
            const isOpen =
              String(openVideoReferencesId) ===
              String(item.id);

            if (isOpen) {
              setOpenVideoReferencesId(null);
              return;
            }

            setOpenVideoReferencesId(item.id);

            setActiveVideoByMessageId(
              (previous) => ({
                ...previous,
                [item.id]:
                  previous[item.id] ||
                  item.videoReferences[0]?.id,
              })
            );
          }}
          aria-expanded={
            String(openVideoReferencesId) ===
            String(item.id)
          }
        >
          <span className="chat-video-reference-icon">
            <Play size={13} fill="currentColor" />
          </span>

          <span className="chat-video-reference-label">
            Video references
          </span>

          <span className="chat-video-reference-count">
            {item.videoReferences.length}
          </span>

          <ChevronDown
            size={14}
            className="chat-video-reference-chevron"
          />
        </button>

        {String(openVideoReferencesId) ===
          String(item.id) && (
          <div className="chat-video-reference-panel">

            <div className="chat-video-reference-list">
              {item.videoReferences.map(
                (video) => {
                  const isActive =
                    String(
                      activeVideoByMessageId[
                        item.id
                      ]
                    ) ===
                    String(video.id);

                  return (
                    <button
                      type="button"
                      className={`chat-video-reference-item ${
                        isActive
                          ? "active"
                          : ""
                      }`}
                      key={video.id}
                      onClick={() =>
                        setActiveVideoByMessageId(
                          (previous) => ({
                            ...previous,
                            [item.id]: video.id,
                          })
                        )
                      }
                    >
                      <img
                        src={video.thumbnail}
                        alt=""
                        className="chat-video-reference-thumbnail"
                        loading="lazy"
                        onError={(event) => {
                          event.currentTarget.style.visibility =
                            "hidden";
                        }}
                      />

                      <span className="chat-video-reference-info">
                        <strong>
                          {video.title}
                        </strong>

                        <span>
                          {video.channel ||
                            "YouTube"}
                          {video.duration
                            ? ` • ${video.duration}`
                            : ""}
                        </span>
                      </span>
                    </button>
                  );
                }
              )}
            </div>

            {(() => {
              const activeVideo =
                item.videoReferences.find(
                  (video) =>
                    String(video.id) ===
                    String(
                      activeVideoByMessageId[
                        item.id
                      ]
                    )
                ) || item.videoReferences[0];

              if (!activeVideo?.id) {
                return null;
              }

              return (
                <div className="chat-video-player-wrap">
                  <div className="chat-video-player">
                    <iframe
                      src={`https://www.youtube.com/embed/${activeVideo.id}?rel=0&modestbranding=1`}
                      title={
                        activeVideo.title ||
                        "YouTube video reference"
                      }
                      loading="lazy"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                      referrerPolicy="strict-origin-when-cross-origin"
                    />
                  </div>

                  <div className="chat-video-player-meta">
                    <div>
                      <strong>
                        {activeVideo.title}
                      </strong>

                      <span>
                        {activeVideo.channel ||
                          "YouTube"}
                      </span>
                    </div>

                    <a
                      href={`https://www.youtube.com/watch?v=${activeVideo.id}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open on YouTube
                    </a>
                  </div>
                </div>
              );
            })()}

          </div>
        )}

      </div>
    )}

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
          DELETE CHAT CONFIRMATION
      ========================================= */}

      {deleteChatTarget && (
        <div
          className="chat-modal-backdrop"
          onClick={() =>
            setDeleteChatTarget(null)
          }
        >
          <div
            className="chat-delete-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="chat-delete-icon">
              <Trash2 size={18} />
            </div>

            <h3>
              Delete this conversation?
            </h3>

            <p>
              This conversation will be
              permanently removed from your
              chat history.
            </p>

            <div className="chat-delete-actions">
              <button
                type="button"
                className="chat-delete-cancel"
                onClick={() =>
                  setDeleteChatTarget(null)
                }
              >
                Cancel
              </button>

              <button
                type="button"
                className="chat-delete-confirm"
                onClick={() =>
                  handleDeleteChat(
                    deleteChatTarget.id
                  )
                }
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================
          CHAT CAPSULE MODAL
      ========================================= */}

      {capsuleChatTarget && (() => {
        const capsule =
          buildChatCapsule(
            capsuleChatTarget
          );

        return (
          <div
            className="chat-modal-backdrop"
            onClick={() =>
              setCapsuleChatTarget(null)
            }
          >
            <div
              className="chat-delete-modal chat-capsule-modal"
              style={{
                width: "min(720px, 92vw)",
                maxWidth: "720px",
                maxHeight: "82vh",
                overflowY: "auto",
              }}
              onClick={(event) =>
                event.stopPropagation()
              }
            >
              <div
                className="chat-modal-heading"
                style={{
                  marginBottom: "18px",
                }}
              >
                <div>
                  <div
                    style={{
                      width: "34px",
                      height: "34px",
                      borderRadius: "10px",
                      display: "grid",
                      placeItems: "center",
                      border: "1px solid rgba(184, 134, 11, 0.25)",
                      background:
                        "rgba(184, 134, 11, 0.08)",
                      marginRight: "10px",
                    }}
                  >
                    <Archive size={17} />
                  </div>

                  <strong>
                    Chat Capsule
                  </strong>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setCapsuleChatTarget(null)
                  }
                  aria-label="Close chat capsule"
                >
                  <X size={17} />
                </button>
              </div>

              <div
                style={{
                  marginBottom: "18px",
                }}
              >
                <div
                  style={{
                    fontSize: "12px",
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    opacity: 0.58,
                    marginBottom: "7px",
                  }}
                >
                  {capsule.date} • {capsule.messageCount} messages
                </div>

                <h3
                  style={{
                    margin: 0,
                    fontSize: "22px",
                    lineHeight: 1.25,
                  }}
                >
                  {capsule.title}
                </h3>
              </div>

              <div
                style={{
                  display: "grid",
                  gap: "14px",
                }}
              >
                <section
                  style={{
                    padding: "15px",
                    borderRadius: "14px",
                    border: "1px solid rgba(127, 127, 127, 0.18)",
                    background:
                      "rgba(127, 127, 127, 0.045)",
                  }}
                >
                  <strong
                    style={{
                      display: "block",
                      fontSize: "12px",
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      marginBottom: "7px",
                      opacity: 0.62,
                    }}
                  >
                    Core issue
                  </strong>

                  <p
                    style={{
                      margin: 0,
                      lineHeight: 1.65,
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {capsule.coreIssue}
                  </p>
                </section>

                {capsule.questions.length > 0 && (
                  <section
                    style={{
                      padding: "15px",
                      borderRadius: "14px",
                      border: "1px solid rgba(127, 127, 127, 0.18)",
                      background:
                        "rgba(127, 127, 127, 0.045)",
                    }}
                  >
                    <strong
                      style={{
                        display: "block",
                        fontSize: "12px",
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        marginBottom: "9px",
                        opacity: 0.62,
                      }}
                    >
                      Other questions
                    </strong>

                    <ol
                      style={{
                        margin: 0,
                        paddingLeft: "20px",
                      }}
                    >
                      {capsule.questions.map(
                        (question, index) => (
                          <li
                            key={`${capsule.title}-${index}`}
                            style={{
                              marginBottom: "8px",
                              lineHeight: 1.55,
                            }}
                          >
                            {question}
                          </li>
                        )
                      )}
                    </ol>
                  </section>
                )}

                <section
                  style={{
                    padding: "15px",
                    borderRadius: "14px",
                    border: "1px solid rgba(184, 134, 11, 0.22)",
                    background:
                      "rgba(184, 134, 11, 0.055)",
                  }}
                >
                  <strong
                    style={{
                      display: "block",
                      fontSize: "12px",
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      marginBottom: "7px",
                    }}
                  >
                    Latest Lawlite guidance
                  </strong>

                  <div
                    style={{
                      lineHeight: 1.7,
                      whiteSpace: "pre-wrap",
                      maxHeight: "280px",
                      overflowY: "auto",
                      paddingRight: "4px",
                    }}
                  >
                    {capsule.latestGuidance}
                  </div>
                </section>
              </div>

              <p
                style={{
                  margin: "16px 0 0",
                  fontSize: "12px",
                  lineHeight: 1.55,
                  opacity: 0.58,
                }}
              >
                This capsule is a compact record of the conversation. It does not replace professional legal advice.
              </p>

              <div
                className="chat-delete-actions"
                style={{
                  marginTop: "20px",
                }}
              >
                <button
                  type="button"
                  className="chat-delete-cancel"
                  onClick={handleCopyCapsule}
                >
                  <Clipboard size={15} />
                  Copy capsule
                </button>

                <button
                  type="button"
                  className="chat-delete-confirm"
                  onClick={handleDownloadCapsule}
                >
                  <Download size={15} />
                  Download PDF
                </button>
              </div>
            </div>
          </div>
        );
      })()}

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
                      (
                        connector.id === "google-drive" ||
                        connector.id === "dropbox" ||
                        connector.id === "notion" ||
                        connector.id === "gmail" ||
                        connector.id === "github"
                        
                      )
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

      {chatActionNotice && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: "fixed",
            left: "50%",
            bottom: "24px",
            transform: "translateX(-50%)",
            zIndex: 5000,
            maxWidth: "min(92vw, 520px)",
            padding: "11px 15px",
            borderRadius: "12px",
            border: "1px solid rgba(184, 134, 11, 0.24)",
            background:
              theme === "dark"
                ? "rgba(24, 20, 14, 0.96)"
                : "rgba(255, 252, 244, 0.98)",
            color:
              theme === "dark"
                ? "#f7efe1"
                : "#3b2b12",
            boxShadow:
              "0 12px 32px rgba(0, 0, 0, 0.16)",
            fontSize: "13px",
            fontWeight: 600,
            lineHeight: 1.4,
            textAlign: "center",
            backdropFilter: "blur(12px)",
          }}
        >
          {chatActionNotice}
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