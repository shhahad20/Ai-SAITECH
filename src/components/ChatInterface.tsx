import React, { useState, useEffect } from "react";
import {
  Send,
  Loader2,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  ThumbsDown,
  Trash2,
  CheckCircle,
} from "lucide-react";
import type { Message, UnansweredQuestion } from "../types";
import { UnansweredQuestionsService } from "../lib/unansweredQuestions";
// import { UnansweredQuestions } from '../lib/supabase/unanswered';

interface ChatInterfaceProps {
  messages: Message[];
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  onNewChat: () => void;
  activeDocument: string | null;
  activeSection: string;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  messages,
  onSendMessage,
  isLoading,
  onNewChat,
  activeDocument,
  activeSection,
}) => {
  const [input, setInput] = useState("");
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(
    new Set()
  );
  const [unansweredQuestions, setUnansweredQuestions] = useState<
    UnansweredQuestion[]
  >([]);
  const [showUnansweredTable, setShowUnansweredTable] = useState(false);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadQuestions = async () => {
      try {
        setQuestionsLoading(true);
        const data = await UnansweredQuestionsService.getUnansweredQuestions();
        setUnansweredQuestions(data);
        setError(null);
      } catch (err) {
        setError("Failed to load unanswered questions");
        console.error(err);
      } finally {
        setQuestionsLoading(false);
      }
    };
    loadQuestions();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSendMessage(input);
      setInput("");
    }
  };

  const toggleAlternativeAnswer = (messageId: string) => {
    const newExpanded = new Set(expandedMessages);
    newExpanded.has(messageId)
      ? newExpanded.delete(messageId)
      : newExpanded.add(messageId);
    setExpandedMessages(newExpanded);
  };

  const handleUnhelpfulAnswer = async (messageId: string) => {
    try {
      const message = messages.find((m) => m.id === messageId);
      if (!message || message.role === "user") return;

      const messageIndex = messages.findIndex((m) => m.id === messageId);
      const userMessage = messages[messageIndex - 1];

      if (userMessage?.role === "user") {
        const newEntry =
          await UnansweredQuestionsService.createUnansweredQuestion({
            question: userMessage.content,
            answer: message.content,
            // alternativeAnswer: message.alternativeAnswer,
            section: activeSection,
            document: activeDocument || undefined,
          });

        setUnansweredQuestions((prev) => [...prev, newEntry]);
      }
    } catch (err) {
      setError("Failed to save question");
      console.error(err);
    }
  };

  const handleDeleteQuestion = async (id: string) => {
    try {
      await UnansweredQuestionsService.deleteUnansweredQuestion(id);
      setUnansweredQuestions((prev) => prev.filter((q) => q.id !== id));
    } catch (err) {
      setError("Failed to delete question");
      console.error(err);
    }
  };

  const handleResolveQuestion = async (id: string) => {
    try {
      const updated = await UnansweredQuestionsService.markAsResolved(id);
      setUnansweredQuestions((prev) =>
        prev.map((q) => (q.id === id ? updated : q))
      );
    } catch (err) {
      setError("Failed to mark as resolved");
      console.error(err);
    }
  };

  const UnansweredTable = () => {
    const handleRowClick = (question: string) => {
      setInput(question);
      setShowUnansweredTable(false);
    };

    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-surface rounded-lg p-6 max-w-6xl w-full max-h-[90vh] overflow-auto">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Unanswered Questions</h2>
            <button
              onClick={() => setShowUnansweredTable(false)}
              className="text-text-secondary hover:text-text-primary"
            >
              ✕
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">
              {error}
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] border-collapse">
              <colgroup>
                <col className="w-[100px]" /> {/* Status */}
                <col className="w-[15%]" /> {/* Section */}
                <col className="w-[30%]" /> {/* Question */}
                <col className="w-[40%]" /> {/* Answer */}
                <col className="w-[200px]" /> {/* Document */}
                <col className="w-[120px]" /> {/* Time */}
                <col className="w-[100px]" /> {/* Actions */}
              </colgroup>

              <thead>
                <tr className="border-b border-border-light">
                  <th className="text-left p-3">Status</th>
                  <th className="text-left p-3">Section</th>
                  <th className="text-left p-3">Question</th>
                  <th className="text-left p-3">Answer</th>
                  <th className="text-left p-3">Document</th>
                  <th className="text-left p-3">Time</th>
                  <th className="text-left p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {questionsLoading ? (
                  <tr>
                    <td colSpan={6} className="p-3 text-center">
                      <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                    </td>
                  </tr>
                ) : (
                  unansweredQuestions.map((entry) => (
                    <tr
                      key={entry.id}
                      className="border-b border-border-light hover:bg-surface-secondary"
                    >
                      <td className="p-3">
                        <span
                          className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                            entry.resolved
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {entry.resolved ? "Resolved" : "Unresolved"}
                        </span>
                      </td>
                      <td className="p-3 font-medium text-brand">
                        {entry.section}
                      </td>

                      <td
                        className="p-3 cursor-pointer hover:text-brand"
                        onClick={() => handleRowClick(entry.question)}
                      >
                        {entry.question}
                      </td>
                      <td className="p-3 text-text-secondary">
                        {entry.answer.substring(0, 60)}...
                      </td>
                      <td className="p-3">
                        {entry.document || "No specific document"}
                      </td>
                      <td className="p-3 text-sm text-text-secondary">
                        {new Date(entry.timestamp).toLocaleDateString()}
                      </td>
                      <td className="p-3 flex gap-2">
                        {!entry.resolved && (
                          <button
                            onClick={() => handleResolveQuestion(entry.id)}
                            className="text-green-600 hover:text-green-700"
                            title="Mark as resolved"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteQuestion(entry.id)}
                          className="text-red-600 hover:text-red-700"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const MessageBubble = ({ message }: { message: Message }) => (
    <div
      className={`max-w-[80%] rounded-lg p-4 message-bubble ${
        message.role === "user" ? "bg-brand text-white" : "bg-surface-secondary"
      }`}
    >
      <div className="flex justify-between items-start gap-2">
        <div className="flex-1">
          {message.isHtml ? (
            <div dangerouslySetInnerHTML={{ __html: message.content }} />
          ) : (
            <div className="whitespace-pre-line">{message.content}</div>
          )}
        </div>

        {message.role !== "user" && (
          <button
            onClick={() => handleUnhelpfulAnswer(message.id)}
            className="hover:text-red-400 transition-colors pt-1"
            title="Mark as unhelpful"
          >
            <ThumbsDown className="w-4 h-4" />
          </button>
        )}
      </div>

      {message.alternativeAnswer && (
        <div className="mt-4 pt-4 border-t border-border-light">
          <div className="flex items-center justify-between">
            <button
              onClick={() => toggleAlternativeAnswer(message.id)}
              className="flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              {expandedMessages.has(message.id) ? (
                <>
                  <ChevronUp className="w-4 h-4" />
                  Hide additional context
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" />
                  Show additional context
                </>
              )}
            </button>
            <button
              onClick={() => handleUnhelpfulAnswer(message.id)}
              className="text-sm flex items-center gap-1 text-red-400 hover:text-red-500"
            >
              <ThumbsDown className="w-4 h-4" />
              Mark as unhelpful
            </button>
          </div>
          {expandedMessages.has(message.id) && (
            <div className="mt-2 text-text-secondary whitespace-pre-line">
              {message.alternativeAnswer}
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-surface">
      <div className="flex justify-between items-center p-4 border-b border-border-light bg-surface/80 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          {activeDocument && (
            <span className="text-sm text-text-secondary">
              Active context: {activeDocument}
            </span>
          )}
          <button
            onClick={() => setShowUnansweredTable(true)}
            className="text-sm hover:text-brand transition-colors"
            disabled={unansweredQuestions.length === 0}
          >
            Unanswered Questions ({unansweredQuestions.length})
          </button>
        </div>

        <button
          onClick={onNewChat}
          className="btn-secondary flex items-center gap-2 px-3 py-1 text-sm"
        >
          <RefreshCw className="w-4 h-4" />
          New Chat
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <MessageBubble message={message} />
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-surface-secondary text-text-primary rounded-lg p-3 flex items-center gap-2 message-bubble">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Thinking...</span>
            </div>
          </div>
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className="p-4 border-t border-border-light bg-surface shadow-apple"
      >
        <div className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 bg-surface-secondary text-text-primary rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-brand/30"
            disabled={isLoading}
          />
          <button
            type="submit"
            className={`rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-brand/30 ${
              isLoading || !input.trim()
                ? "bg-gray-200 cursor-not-allowed"
                : "btn-brand"
            }`}
            disabled={isLoading || !input.trim()}
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
      </form>

      {showUnansweredTable && <UnansweredTable />}
    </div>
  );
};
