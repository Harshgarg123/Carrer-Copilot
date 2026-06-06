import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, Send, User, Bot, Trash2, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { sendMentorMessage } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Alert } from '../components/ui/Alert';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: Date;
}

const WELCOME_MESSAGE: Message = {
  id: 'welcome',
  role: 'assistant',
  content: "Hello! I'm your AI Career Mentor. I can help you with:\n\n- Resume optimization\n- Interview preparation\n- Career advice\n- Technical skills guidance\n- Job search strategies\n\nWhat would you like to discuss?",
  createdAt: new Date(),
};

export function MentorPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      createdAt: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    setError('');

    try {
      const history = messages.slice(-6).map(m => ({
        role: m.role,
        content: m.content,
      }));

      const response = await sendMentorMessage(userMessage.content, history);

      if (response.error) {
        throw new Error(response.error);
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.data.response || "I apologize, I couldn't generate a response.",
        createdAt: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (err: any) {
      setError(err.message || 'Failed to send message');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
  if (textareaRef.current) {
    textareaRef.current.style.height = 'auto';
    textareaRef.current.style.height =
      textareaRef.current.scrollHeight + 'px';
  }
}, [input]);


  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([
      {
        ...WELCOME_MESSAGE,
        id: Date.now().toString(),
        content: "Chat cleared. How can I help you with your career today?",
      },
    ]);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-6 overflow-x-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-secondary-900 dark:text-white mb-2">
            AI Career Mentor
          </h1>
          <p className="text-secondary-600 dark:text-secondary-400">
            Get personalized career advice and guidance
          </p>
        </div>
        <Button
        variant="ghost"
        onClick={clearChat}
        leftIcon={<Trash2 className="w-4 h-4" />}
        className="w-full sm:w-auto"
        >
          Clear
        </Button>
      </div>

      {error && <Alert variant="error" onClose={() => setError('')}>{error}</Alert>}

      <Card className="h-[calc(100vh-220px)] sm:h-[calc(100vh-280px)] flex flex-col overflow-hidden">
        <CardContent className="flex-1 overflow-y-auto overflow-x-hidden pt-4 sm:pt-6">
          <div className="space-y-4 break-words">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex flex-col sm:flex-row gap-3 ${message.role === 'user' ? 'justify-end' : ''}`}
              >
                {message.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                  </div>
                )}
                <div
                  className={`max-w-[92%] sm:max-w-[80%] rounded-xl px-4 py-3 overflow-hidden ${
                    message.role === 'user'
                      ? 'bg-primary-600 text-white'
                      : 'bg-secondary-100 dark:bg-secondary-800 text-secondary-900 dark:text-secondary-100'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap break-words overflow-hidden leading-relaxed">{message.content}</p>
                  <p className={`text-xs mt-2 break-words ${
                    message.role === 'user'
                      ? 'text-primary-200'
                      : 'text-secondary-500 dark:text-secondary-400'
                  }`}>
                    {message.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                {message.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-secondary-200 dark:bg-secondary-700 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-secondary-600 dark:text-secondary-400" />
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                </div>
                <div className="bg-secondary-100 dark:bg-secondary-800 rounded-xl px-4 py-3 shadow-sm">
                  <Loader2 className="w-5 h-5 animate-spin text-secondary-400" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </CardContent>

        <div className="p-3 sm:p-4 border-t border-secondary-200 dark:border-secondary-700 bg-white dark:bg-secondary-900">
          <div className="flex flex-col sm:flex-row gap-3">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about resumes, interviews, or career advice..."
              className="w-full flex-1 min-h-[52px] max-h-[180px] px-4 py-3 bg-white dark:bg-secondary-800 border border-secondary-300 dark:border-secondary-600 rounded-xl text-secondary-900 dark:text-secondary-100 placeholder-secondary-400 dark:placeholder-secondary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-y"
              rows={1}
              disabled={loading}
            />
            <Button
              onClick={sendMessage}
              disabled={!input.trim() || loading}
              className="w-full sm:w-auto self-end"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-xs text-secondary-400 mt-2 text-center">
            AI-generated responses may not always be accurate. Use your judgment for important decisions.
          </p>
        </div>
      </Card>
    </div>
  );
}
