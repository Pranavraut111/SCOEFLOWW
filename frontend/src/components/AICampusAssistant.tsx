import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Bot, Send, User, Sparkles, Brain, Loader2 } from "lucide-react";
import axios from 'axios';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  memoriesUsed?: number;
  timestamp: Date;
}

interface AICampusAssistantProps {
  studentId: string;
  studentName: string;
}

const QUICK_SUGGESTIONS = [
  "What events should I attend?",
  "Which clubs match my interests?",
  "Where is the robotics lab?",
  "What are the upcoming deadlines?",
  "Suggest activities based on my profile",
  "Tell me about campus facilities",
];

const AICampusAssistant = ({ studentId, studentName }: AICampusAssistantProps) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'assistant',
      content: `Hey ${studentName}! 👋 I'm your Smart Campus AI Assistant. I remember your interests, clubs, and events to give you personalized recommendations. Ask me anything about campus life!`,
      timestamp: new Date(),
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await axios.post(import.meta.env.VITE_API_URL + '/api/v1/assistant/chat', {
        student_id: studentId,
        message: text,
      });

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.data.response,
        memoriesUsed: response.data.memories_used,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error: any) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "Sorry, I couldn't process that. Please make sure the backend is running and try again! 🔧",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <Card className="shadow-card h-[600px] flex flex-col">
      <CardHeader className="pb-3 border-b bg-gradient-to-r from-primary/5 to-primary/10">
        <CardTitle className="flex items-center gap-2">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Bot className="h-5 w-5 text-primary" />
          </div>
          <div>
            <span className="text-lg">AI Campus Assistant</span>
            <div className="flex items-center gap-1 mt-0.5">
              <Brain className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground font-normal">
                Powered by Hindsight Memory + Gemini AI
              </span>
            </div>
          </div>
          <Badge variant="secondary" className="ml-auto text-xs">
            <Sparkles className="h-3 w-3 mr-1" />
            Learns from you
          </Badge>
        </CardTitle>
      </CardHeader>

      {/* Messages Area */}
      <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
              msg.role === 'user' 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-gradient-to-br from-violet-500 to-blue-500 text-white'
            }`}>
              {msg.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
            </div>
            <div className={`max-w-[80%] ${msg.role === 'user' ? 'text-right' : ''}`}>
              <div className={`rounded-2xl px-4 py-3 ${
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground rounded-tr-sm'
                  : 'bg-muted rounded-tl-sm'
              }`}>
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              </div>
              {msg.memoriesUsed !== undefined && msg.memoriesUsed > 0 && (
                <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                  <Brain className="h-3 w-3" />
                  <span>{msg.memoriesUsed} memories used</span>
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3">
            <div className="shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-blue-500 text-white flex items-center justify-center">
              <Bot className="h-4 w-4" />
            </div>
            <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Thinking with your memories...
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </CardContent>

      {/* Quick Suggestions */}
      {messages.length <= 2 && (
        <div className="px-4 pb-2">
          <p className="text-xs text-muted-foreground mb-2">Try asking:</p>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_SUGGESTIONS.map((suggestion, i) => (
              <button
                key={i}
                onClick={() => sendMessage(suggestion)}
                className="text-xs px-3 py-1.5 rounded-full border border-primary/20 text-primary hover:bg-primary/5 transition-colors"
                disabled={isLoading}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 border-t bg-card">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me about events, clubs, campus navigation..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button
            onClick={() => sendMessage(input)}
            disabled={isLoading || !input.trim()}
            size="icon"
            className="bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-700"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default AICampusAssistant;
