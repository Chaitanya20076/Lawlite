import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { useNavigate } from "react-router-dom";

import {
  ArrowUp,
  Check,
  ChevronDown,
  FileText,
  LogOut,
  Menu,
  Moon,
  MoreHorizontal,
  Paperclip,
  Plus,
  Scale,
  Search,
  Settings,
  Shield,
  Sparkles,
  Sun,
  X,
} from "lucide-react";

import { signOut } from "firebase/auth";
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

const Chat = () => {
  const navigate = useNavigate();

  const textareaRef = useRef(null);
  const messagesEndRef = useRef(null);
  const typingIntervalsRef = useRef([]);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");

  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

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
   * SARVAM CHAT RESPONSE
   * =========================================
   */

  const getSarvamResponse = async (
    conversation
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
      const answer =
        await getSarvamResponse(
          conversation
        );

      const assistantMessage = {
        id: assistantMessageId,
        role: "assistant",
        text: "",
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