import React, { useState, useEffect } from 'react';
import { Logo } from './components/Logo';
import { Tabs } from './components/Tabs';
import { FileUpload } from './components/FileUpload';
import { ChatInterface } from './components/ChatInterface';
import { AuthModal } from './components/AuthModal';
import { DocumentList } from './components/DocumentList';
import { DocumentHistory } from './components/DocumentHistory';
import { AdminTab } from './components/AdminTab';
import { FAQTab } from './components/FAQTab';
import { supabase } from './lib/supabase';
import { isSupabaseConfigured } from './lib/supabase';
import { getAIResponse, analyzeDocument } from './lib/openai';
import { uploadDocument, getDocuments, deleteDocument } from './lib/documents';
import { getCurrentUser, signOut } from './lib/auth';
import { processExcelFile } from './lib/excel';
import type { Message, Document, ChatSession } from './types';
import { LogOut, AlertCircle, RefreshCw } from 'lucide-react';
import { GOVERNANCE_TABS, DEFAULT_SECTION } from './lib/constants';

function App() {
  const [activeTab, setActiveTab] = useState('governance');
  const [activeSubTab, setActiveSubTab] = useState(DEFAULT_SECTION);
  const [chatSession, setChatSession] = useState<ChatSession>({
    messages: [],
    activeDocumentId: null,
    documentName: null,
    isNewChat: true,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [showHistory, setShowHistory] = useState<string | null>(null);

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (user) {
      loadDocuments();
    } else {
      setDocuments([]);
    }
  }, [user]);

  const checkUser = async () => {
    try {
      if (!isSupabaseConfigured()) {
        setError(
          'Please connect to Supabase using the "Connect to Supabase" button in the top right corner.'
        );
        return;
      }

      const currentUser = await getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      console.error('Error checking user:', error);
      setUser(null);
      if (error instanceof Error && error.message.includes('Supabase')) {
        setError(error.message);
      }
    }
  };

  const loadDocuments = async () => {
    try {
      if (!isSupabaseConfigured()) {
        setError(
          'Please connect to Supabase using the "Connect to Supabase" button in the top right corner.'
        );
        return;
      }

      setIsRetrying(true);
      const docs = await getDocuments();
      setDocuments(docs);
      setError(null);
    } catch (error) {
      console.error('Error loading documents:', error);
      if (error instanceof Error && error.message.includes('Supabase')) {
        setError(error.message);
      } else {
        setError('Failed to load documents. Please try again.');
      }
    } finally {
      setIsRetrying(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      setUser(null);
      setChatSession({
        messages: [],
        activeDocumentId: null,
        documentName: null,
        isNewChat: true,
      });
      setDocuments([]);
      setError(null);
    } catch (error) {
      console.error('Error signing out:', error);
      if (error instanceof Error) {
        setError(error.message);
      }
    }
  };

  const handleTabChange = (tab: string, subTab?: string) => {
    setActiveTab(tab);
    if (subTab) {
      setActiveSubTab(subTab);
    } else {
      setActiveSubTab(DEFAULT_SECTION);
    }
  };

  const startNewChat = () => {
    setChatSession({
      messages: [],
      activeDocumentId: null,
      documentName: null,
      isNewChat: true,
    });
  };

  const handleFileUpload = async (
    files: File[],
    isUniversal: boolean = false
  ) => {
    try {
      if (!isSupabaseConfigured()) {
        throw new Error(
          'Please connect to Supabase first using the "Connect to Supabase" button in the top right corner.'
        );
      }

      if (!user) {
        setShowAuthModal(true);
        return;
      }

      if (!user.is_admin) {
        throw new Error('Only administrators can upload documents');
      }

      const file = files[0];
      setIsLoading(true);
      setError(null);

      if (activeTab === 'data-analysis') {
        const {
          data,
          visualizations: vizData,
          analysis: analysisData,
        } = await processExcelFile(file);

        const uploadMessage: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: `
Analysis Summary: ${analysisData.summary}

Key Insights:
${analysisData.insights.map((insight) => `• ${insight}`).join('\n')}
          `,
          timestamp: new Date(),
        };
        setChatSession((prev) => ({
          ...prev,
          messages: [...prev.messages, uploadMessage],
        }));
      } else {
        const uploadMessage: Message = {
          id: Date.now().toString(),
          role: 'user',
          content: `Uploading file: ${file.name}`,
          timestamp: new Date(),
        };

        setChatSession((prev) => ({
          ...prev,
          messages: [...prev.messages, uploadMessage],
        }));

        try {
          const document = await uploadDocument(
            file.name,
            file,
            activeSubTab || DEFAULT_SECTION,
            isUniversal
          );
          setDocuments((prev) => [document, ...prev]);

          const analysis = await analyzeDocument(document.content);

          const responseMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content:
              analysis +
              '\n\nYou can now ask me questions about this document.',
            timestamp: new Date(),
          };
          setChatSession((prev) => ({
            ...prev,
            messages: [...prev.messages, responseMessage],
          }));
        } catch (error) {
          console.error('Error processing document:', error);
          const errorMessage: Message = {
            id: Date.now().toString(),
            role: 'assistant',
            content:
              error instanceof Error
                ? error.message
                : 'Sorry, there was an error processing the document. Please try again.',
            timestamp: new Date(),
          };
          setChatSession((prev) => ({
            ...prev,
            messages: [...prev.messages, errorMessage],
          }));
          throw error;
        }
      }
    } catch (error) {
      console.error('Error processing file:', error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Sorry, there was an error processing the file. Please try again.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteDocument = async (id: string) => {
    try {
      await deleteDocument(id);
      setDocuments((prev) => prev.filter((doc) => doc.id !== id));
    } catch (error) {
      console.error('Error deleting document:', error);
      if (error instanceof Error) {
        setError(error.message);
      }
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!isSupabaseConfigured()) {
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content:
          'Please connect to Supabase first using the "Connect to Supabase" button in the top right corner.',
        timestamp: new Date(),
      };
      setChatSession((prev) => ({
        ...prev,
        messages: [...prev.messages, errorMessage],
      }));
      return;
    }

    if (!user) {
      setShowAuthModal(true);
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
    };

    setChatSession((prev) => ({
      ...prev,
      messages: [...prev.messages, userMessage],
      isNewChat: false,
    }));
    setIsLoading(true);
    setError(null);

    try {
      const response = await getAIResponse(
        content,
        chatSession.activeDocumentId || undefined,
        activeSubTab,
        !chatSession.isNewChat
      );

      if (response) {
        const responseMessage: Message = {
          id: Date.now() + Math.random().toString(),
          role: 'assistant',
          content: `${response.bestAnswer}\n<span class="text-gray-400 text-sm">Source: ${response.source}</span>`,
          timestamp: new Date(),
          isHtml: true,
          alternativeAnswer: response.alternativeAnswer,
        };

        setChatSession((prev) => ({
          messages: [...prev.messages, responseMessage],
          activeDocumentId: response.documentId,
          documentName: response.source,
          isNewChat: false,
        }));
      } else {
        const noAnswerMessage: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content:
            'I could not find a relevant answer to your question in the available documents.',
          timestamp: new Date(),
        };
        setChatSession((prev) => ({
          ...prev,
          messages: [...prev.messages, noAnswerMessage],
        }));
      }
    } catch (error) {
      console.error('Error getting AI response:', error);
      throw error instanceof Error
        ? error
        : new Error('Error processing your request. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-secondary text-text-primary">
      {/* Top Navigation */}
      <header className="fixed top-0 left-0 right-0 bg-surface/80 backdrop-blur-md border-b border-border-light z-10">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <Logo />
          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-4">
                <span className="text-sm text-text-secondary">
                  {user.email}
                </span>
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-2 px-4 py-2 bg-surface-secondary rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex h-screen pt-16">
        {/* Left Sidebar */}
        <div className="w-64 bg-surface border-r border-border-light p-4 overflow-y-auto shadow-apple">
          <Tabs
            tabs={GOVERNANCE_TABS}
            activeTab={activeTab}
            activeSubTab={activeSubTab}
            onTabChange={handleTabChange}
          />
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col">
          {error && (
            <div className="p-4">
              <div className="flex items-start gap-3 text-brand bg-brand/5 p-4 rounded-lg border border-brand">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium">{error}</p>
                  {error.includes('Supabase') && (
                    <p className="mt-1 text-sm opacity-80">
                      Click the "Connect to Supabase" button in the top right
                      corner to connect to the database.
                    </p>
                  )}
                </div>
                {error.includes('load') && (
                  <button
                    onClick={loadDocuments}
                    disabled={isRetrying}
                    className="flex items-center gap-2 px-3 py-1 bg-brand/10 rounded hover:bg-brand/20 disabled:opacity-50"
                  >
                    <RefreshCw
                      className={`w-4 h-4 ${isRetrying ? 'animate-spin' : ''}`}
                    />
                    Retry
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="flex-1 flex">
            {activeTab === 'admin' ? (
              <div className="flex-1 p-6">
                <AdminTab onUpload={handleFileUpload} />
              </div>
            ) : activeTab === 'faq' ? (
              <div className="flex-1 p-6">
                <FAQTab />
              </div>
            ) : (
              <>
                {/* Chat Area */}
                <div className="flex-1 flex flex-col p-4 bg-surface">
                  <ChatInterface
                    messages={chatSession.messages}
                    onSendMessage={handleSendMessage}
                    isLoading={isLoading}
                    onNewChat={startNewChat}
                    activeDocument={chatSession.documentName}
                    activeSection={activeSubTab}
                  />
                </div>

                {/* Right Sidebar */}
                <div className="w-80 border-l border-border-light p-4 bg-surface shadow-apple">
                  <DocumentList
                    documents={documents}
                    onDelete={handleDeleteDocument}
                    onViewHistory={setShowHistory}
                    activeSection={activeSubTab}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}

      {showHistory && (
        <DocumentHistory
          documentId={showHistory}
          onClose={() => setShowHistory(null)}
        />
      )}
    </div>
  );
}

export default App;