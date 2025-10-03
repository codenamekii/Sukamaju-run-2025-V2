"use client";

import {
  Clock,
  Edit2,
  Eye,
  Filter,
  Loader2,
  Mail,
  MessageSquare,
  Plus,
  RefreshCw,
  RotateCw,
  Save,
  Search,
  Send,
  Trash2,
  User,
  Users,
  Variable,
  X
} from 'lucide-react';
import { useEffect, useState } from 'react';

interface Template {
  id: string;
  name: string;
  type: 'EMAIL' | 'WHATSAPP';
  category: string;
  subject?: string;
  content: string;
  variables: string[];
  isActive: boolean;
  usageCount: number;
  lastUsedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface Participant {
  id: string;
  fullName: string;
  email: string;
  whatsapp: string;
  bibNumber: string | null;
  category: string;
  registrationCode: string;
  registrationStatus: string;
  payments: Array<{ status: string }>;
  racePack?: { isCollected: boolean } | null;
}

interface CommunicationStats {
  today: MessageStats;
  week: MessageStats;
  month: MessageStats;
}

interface MessageStats {
  email: { sent: number; failed: number; pending: number; total: number };
  whatsapp: { sent: number; failed: number; pending: number; total: number };
  total: { sent: number; failed: number; pending: number; total: number };
}

interface CommunicationLog {
  id: string;
  templateId?: string;
  template?: { name: string; type: string };
  recipientName?: string;
  recipientEmail?: string;
  recipientPhone?: string;
  messageType: string;
  category: string;
  subject?: string;
  content: string;
  status: string;
  sentAt?: string;
  failedAt?: string;
  errorMessage?: string;
  batchId?: string;
  createdAt: string;
}

const CATEGORIES = [
  { value: 'PAYMENT_REMINDER', label: 'Payment Reminder', priority: 2 },
  { value: 'REGISTRATION_SUCCESS', label: 'Registration Success', priority: 2 },
  { value: 'RACE_PACK', label: 'Race Pack Collection', priority: 1 },
  { value: 'ANNOUNCEMENT', label: 'General Announcement', priority: 0 }
];

const AVAILABLE_VARIABLES = [
  { name: 'fullName', description: 'Full name' },
  { name: 'firstName', description: 'First name only' },
  { name: 'email', description: 'Email address' },
  { name: 'whatsapp', description: 'WhatsApp number' },
  { name: 'bibNumber', description: 'BIB number' },
  { name: 'category', description: 'Race category (5K/10K)' },
  { name: 'registrationCode', description: 'Registration code' },
  { name: 'totalPrice', description: 'Total payment amount' },
  { name: 'jerseySize', description: 'Jersey size' },
  { name: 'eventDate', description: 'Event date' },
  { name: 'collectionDate', description: 'Race pack collection dates' },
  { name: 'venue', description: 'Event venue' },
  { name: 'paymentStatus', description: 'Payment status' },
  { name: 'racePackStatus', description: 'Race pack collection status' }
];

export default function CommunicationsPage() {
  // State management
  const [templates, setTemplates] = useState<Template[]>([]);
  const [stats, setStats] = useState<CommunicationStats | null>(null);
  const [history, setHistory] = useState<CommunicationLog[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [loadingParticipants, setLoadingParticipants] = useState(false);

  // UI state
  const [activeTab, setActiveTab] = useState<'templates' | 'send' | 'history'>('templates');
  const [messageType, setMessageType] = useState<'EMAIL' | 'WHATSAPP' | 'BOTH'>('WHATSAPP');
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [participantSearch, setParticipantSearch] = useState('');
  const [historyPage] = useState(1);

  // Form state
  const [templateForm, setTemplateForm] = useState({
    id: '',
    name: '',
    type: 'WHATSAPP' as 'EMAIL' | 'WHATSAPP',
    category: 'ANNOUNCEMENT',
    subject: '',
    content: '',
    isActive: true
  });

  const [sendForm, setSendForm] = useState({
    templateId: '',
    messageType: 'WHATSAPP' as 'EMAIL' | 'WHATSAPP' | 'BOTH',
    category: 'ANNOUNCEMENT',
    subject: '',
    content: '',
    recipientType: 'FILTER' as 'INDIVIDUAL' | 'FILTER' | 'ALL',
    participantIds: [] as string[],
    filters: {
      category: [] as string[],
      paymentStatus: [] as string[],
      racePackStatus: '' as '' | 'COLLECTED' | 'NOT_COLLECTED'
    },
    rateLimit: 20,
    priority: 0
  });

  const [preview, setPreview] = useState({
    content: '',
    subject: ''
  });

  // Fetch data on mount
  useEffect(() => {
    fetchTemplates();
    fetchStats();
    if (activeTab === 'history') {
      fetchHistory();
    }
  }, [activeTab]);

  // Fetch participants when modal opens
  useEffect(() => {
    if (showSendModal && sendForm.recipientType === 'INDIVIDUAL') {
      fetchParticipants();
    }
  }, [showSendModal, sendForm.recipientType]);

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/admin/templates');
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates || []);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/communications/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchHistory = async (page = 1) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/communications/history?page=${page}&limit=20`);
      if (response.ok) {
        const data = await response.json();
        setHistory(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchParticipants = async (search = '') => {
    try {
      setLoadingParticipants(true);
      const params = new URLSearchParams({
        limit: '50'
        // REMOVED status filter - now searches ALL participants
      });

      // Add search parameter if provided
      if (search) {
        params.append('search', search);
      }

      const response = await fetch(`/api/admin/participants?${params}`);
      if (response.ok) {
        const data = await response.json();
        setParticipants(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching participants:', error);
    } finally {
      setLoadingParticipants(false);
    }
  };

  const handleSaveTemplate = async () => {
    try {
      const url = '/api/admin/templates';
      const method = templateForm.id ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(templateForm)
      });

      if (response.ok) {
        await fetchTemplates();
        setShowTemplateModal(false);
        resetTemplateForm();
      }
    } catch (error) {
      console.error('Error saving template:', error);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      const response = await fetch(`/api/admin/templates?id=${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await fetchTemplates();
      }
    } catch (error) {
      console.error('Error deleting template:', error);
    }
  };

  const handleSendMessage = async () => {
    setSending(true);
    try {
      const response = await fetch('/api/admin/communications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: sendForm.templateId,
          messageType: sendForm.messageType,
          category: sendForm.category,
          subject: sendForm.subject,
          content: sendForm.content,
          recipients: {
            type: sendForm.recipientType,
            participantIds: sendForm.participantIds,
            filters: sendForm.filters
          },
          rateLimit: sendForm.rateLimit,
          priority: sendForm.priority
        })
      });

      const data = await response.json();

      if (response.ok) {
        alert(`✅ Messages queued successfully!\n\nBatch ID: ${data.batchId}\nRecipients: ${data.queued}`);
        setShowSendModal(false);
        resetSendForm();
        fetchStats(); // Refresh stats
      } else {
        alert(`❌ Failed to send: ${data.error}`);
      }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      alert('Failed to send messages');
    } finally {
      setSending(false);
    }
  };

  const handlePreview = async () => {
    try {
      const response = await fetch('/api/admin/communications/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: sendForm.content || templateForm.content,
          subject: sendForm.subject || templateForm.subject
        })
      });

      if (response.ok) {
        const data = await response.json();
        setPreview({
          content: data.preview,
          subject: data.previewSubject
        });
        setShowPreview(true);
      }
    } catch (error) {
      console.error('Error generating preview:', error);
    }
  };

  const handleResendFailed = async (logIds: string[]) => {
    try {
      const response = await fetch('/api/admin/communications/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logIds })
      });

      if (response.ok) {
        alert('Messages queued for resend');
        fetchHistory(historyPage);
      }
    } catch (error) {
      console.error('Error resending messages:', error);
    }
  };

  const insertVariable = (variable: string) => {
    const cursorPosition = (document.activeElement as HTMLTextAreaElement)?.selectionStart || 0;
    const content = templateForm.content || sendForm.content;
    const newContent =
      content.slice(0, cursorPosition) +
      `{{${variable}}}` +
      content.slice(cursorPosition);

    if (showTemplateModal) {
      setTemplateForm({ ...templateForm, content: newContent });
    } else {
      setSendForm({ ...sendForm, content: newContent });
    }
  };

  const resetTemplateForm = () => {
    setTemplateForm({
      id: '',
      name: '',
      type: 'WHATSAPP',
      category: 'ANNOUNCEMENT',
      subject: '',
      content: '',
      isActive: true
    });
  };

  const resetSendForm = () => {
    setSendForm({
      templateId: '',
      messageType: 'WHATSAPP',
      category: 'ANNOUNCEMENT',
      subject: '',
      content: '',
      recipientType: 'FILTER',
      participantIds: [],
      filters: {
        category: [],
        paymentStatus: [],
        racePackStatus: ''
      },
      rateLimit: 20,
      priority: 0
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Communications Center</h1>
          <p className="text-sm text-gray-500 mt-1">Manage and send messages to participants</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => {
              fetchStats();
              if (activeTab === 'history') fetchHistory();
            }}
            className="px-4 py-2 border rounded-lg hover:bg-gray-50 flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={() => {
              setShowSendModal(true);
              setSendForm({ ...sendForm, messageType });
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            Send Message
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <h3 className="text-sm font-medium text-gray-500 mb-3">Today</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>WhatsApp:</span>
                <span className="font-medium">
                  {stats.today.whatsapp.sent}/{stats.today.whatsapp.total}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Email:</span>
                <span className="font-medium">
                  {stats.today.email.sent}/{stats.today.email.total}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4">
            <h3 className="text-sm font-medium text-gray-500 mb-3">This Week</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Total Sent:</span>
                <span className="font-medium text-green-600">{stats.week.total.sent}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Failed:</span>
                <span className="font-medium text-red-600">{stats.week.total.failed}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4">
            <h3 className="text-sm font-medium text-gray-500 mb-3">This Month</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Total Messages:</span>
                <span className="font-medium">{stats.month.total.total}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Success Rate:</span>
                <span className="font-medium">
                  {stats.month.total.total > 0
                    ? Math.round((stats.month.total.sent / stats.month.total.total) * 100)
                    : 0}%
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm">
        <div className="border-b">
          <div className="flex">
            <button
              onClick={() => setActiveTab('templates')}
              className={`px-6 py-3 font-medium flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'templates'
                  ? 'text-blue-600 border-blue-600'
                  : 'text-gray-500 border-transparent hover:text-gray-700'
                }`}
            >
              <MessageSquare className="w-4 h-4" />
              Templates
            </button>
            <button
              onClick={() => setActiveTab('send')}
              className={`px-6 py-3 font-medium flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'send'
                  ? 'text-blue-600 border-blue-600'
                  : 'text-gray-500 border-transparent hover:text-gray-700'
                }`}
            >
              <Send className="w-4 h-4" />
              Quick Send
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-6 py-3 font-medium flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'history'
                  ? 'text-blue-600 border-blue-600'
                  : 'text-gray-500 border-transparent hover:text-gray-700'
                }`}
            >
              <Clock className="w-4 h-4" />
              History
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'templates' && (
            <div>
              {/* Template Filters */}
              <div className="flex gap-3 mb-6">
                <button
                  onClick={() => setShowTemplateModal(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Create Template
                </button>
                <select
                  value={messageType}
                  onChange={(e) => setMessageType(e.target.value as 'EMAIL' | 'WHATSAPP' | 'BOTH')}
                  className="px-4 py-2 border rounded-lg"
                >
                  <option value="WHATSAPP">WhatsApp</option>
                  <option value="EMAIL">Email</option>
                  <option value="BOTH">Both</option>
                </select>
              </div>

              {/* Templates Grid */}
              {loading ? (
                <div className="text-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {templates
                    .filter(t => messageType === 'BOTH' || t.type === messageType)
                    .map((template) => (
                      <div key={template.id} className="border rounded-lg p-4 hover:shadow-lg transition-shadow">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-medium text-gray-900">{template.name}</h3>
                            <div className="flex items-center gap-2 mt-1">
                              {template.type === 'EMAIL' ? (
                                <Mail className="w-3 h-3 text-gray-400" />
                              ) : (
                                <MessageSquare className="w-3 h-3 text-gray-400" />
                              )}
                              <span className="text-xs text-gray-500">
                                {CATEGORIES.find(c => c.value === template.category)?.label}
                              </span>
                            </div>
                          </div>
                          {template.isActive ? (
                            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                              Active
                            </span>
                          ) : (
                            <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">
                              Inactive
                            </span>
                          )}
                        </div>

                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                          {template.content}
                        </p>

                        {template.variables.length > 0 && (
                          <div className="mb-3">
                            <div className="flex flex-wrap gap-1">
                              {template.variables.slice(0, 3).map((v) => (
                                <span key={v} className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                                  {v}
                                </span>
                              ))}
                              {template.variables.length > 3 && (
                                <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                                  +{template.variables.length - 3}
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                          <span>Used: {template.usageCount} times</span>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setSendForm({
                                ...sendForm,
                                templateId: template.id,
                                content: template.content,
                                subject: template.subject || '',
                                category: template.category,
                                messageType: template.type
                              });
                              setShowSendModal(true);
                            }}
                            className="flex-1 px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                          >
                            Use
                          </button>
                          <button
                            onClick={() => {
                              setTemplateForm({
                                id: template.id,
                                name: template.name,
                                type: template.type,
                                category: template.category,
                                subject: template.subject || '',
                                content: template.content,
                                isActive: template.isActive
                              });
                              setShowTemplateModal(true);
                            }}
                            className="px-3 py-1.5 text-xs border rounded hover:bg-gray-50"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleDeleteTemplate(template.id)}
                            className="px-3 py-1.5 text-xs border border-red-200 text-red-600 rounded hover:bg-red-50"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'send' && (
            <div className="max-w-2xl mx-auto">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Message Type</label>
                  <select
                    value={sendForm.messageType}
                    onChange={(e) => setSendForm({ ...sendForm, messageType: e.target.value as 'EMAIL' | 'WHATSAPP' | 'BOTH' })}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="WHATSAPP">WhatsApp Only</option>
                    <option value="EMAIL">Email Only</option>
                    <option value="BOTH">Both WhatsApp & Email</option>
                  </select>
                </div>

                {(sendForm.messageType === 'EMAIL' || sendForm.messageType === 'BOTH') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                    <input
                      type="text"
                      value={sendForm.subject}
                      onChange={(e) => setSendForm({ ...sendForm, subject: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="Email subject..."
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Message Content</label>
                  <textarea
                    value={sendForm.content}
                    onChange={(e) => setSendForm({ ...sendForm, content: e.target.value })}
                    rows={10}
                    className="w-full px-3 py-2 border rounded-lg font-mono text-sm"
                    placeholder="Type your message here..."
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handlePreview}
                    className="px-4 py-2 border rounded-lg hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    Preview
                  </button>
                  <button
                    onClick={() => setShowSendModal(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    Select Recipients & Send
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div>
              {loading ? (
                <div className="text-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" />
                </div>
              ) : history.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Clock className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No communication history yet</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Recipient
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Type
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Category
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Sent At
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {history.map((log) => (
                        <tr key={log.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <div>
                              <div className="font-medium text-gray-900">{log.recipientName}</div>
                              <div className="text-gray-500">
                                {log.recipientEmail || log.recipientPhone}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <div className="flex items-center gap-1">
                              {log.messageType === 'EMAIL' ? (
                                <Mail className="w-4 h-4" />
                              ) : (
                                <MessageSquare className="w-4 h-4" />
                              )}
                              <span>{log.messageType}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {CATEGORIES.find(c => c.value === log.category)?.label || log.category}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {log.status === 'SENT' ? (
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                Sent
                              </span>
                            ) : log.status === 'FAILED' ? (
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                                Failed
                              </span>
                            ) : log.status === 'SENDING' ? (
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                Sending
                              </span>
                            ) : (
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                Queued
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {log.sentAt
                              ? new Date(log.sentAt).toLocaleString('id-ID')
                              : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {log.status === 'FAILED' && (
                              <button
                                onClick={() => handleResendFailed([log.id])}
                                className="text-blue-600 hover:text-blue-900 flex items-center gap-1"
                              >
                                <RotateCw className="w-4 h-4" />
                                Resend
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Template Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-bold text-gray-900">
                {templateForm.id ? 'Edit Template' : 'Create Template'}
              </h2>
              <button onClick={() => {
                setShowTemplateModal(false);
                resetTemplateForm();
              }}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                    <input
                      type="text"
                      value={templateForm.name}
                      onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="Template name..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                    <select
                      value={templateForm.category}
                      onChange={(e) => setTemplateForm({ ...templateForm, category: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      {CATEGORIES.map(cat => (
                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                    <select
                      value={templateForm.type}
                      onChange={(e) => setTemplateForm({ ...templateForm, type: e.target.value as 'EMAIL' | 'WHATSAPP' })}
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="WHATSAPP">WhatsApp</option>
                      <option value="EMAIL">Email</option>
                    </select>
                  </div>
                  {templateForm.type === 'EMAIL' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                      <input
                        type="text"
                        value={templateForm.subject}
                        onChange={(e) => setTemplateForm({ ...templateForm, subject: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg"
                        placeholder="Email subject..."
                      />
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-gray-700">Content</label>
                    <button
                      type="button"
                      className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                      onClick={() => {
                        const dropdown = document.getElementById('variable-dropdown');
                        if (dropdown) {
                          dropdown.classList.toggle('hidden');
                        }
                      }}
                    >
                      <Variable className="w-3 h-3" />
                      Insert Variable
                    </button>
                  </div>

                  <div id="variable-dropdown" className="hidden mb-2 p-2 bg-gray-50 rounded-lg">
                    <div className="grid grid-cols-3 gap-1">
                      {AVAILABLE_VARIABLES.map(v => (
                        <button
                          key={v.name}
                          type="button"
                          onClick={() => insertVariable(v.name)}
                          className="text-xs px-2 py-1 bg-white border rounded hover:bg-blue-50 text-left"
                          title={v.description}
                        >
                          {`{{${v.name}}}`}
                        </button>
                      ))}
                    </div>
                  </div>

                  <textarea
                    value={templateForm.content}
                    onChange={(e) => setTemplateForm({ ...templateForm, content: e.target.value })}
                    rows={10}
                    className="w-full px-3 py-2 border rounded-lg font-mono text-sm"
                    placeholder={templateForm.type === 'EMAIL'
                      ? "Hi {{fullName}},\n\nYour message here..."
                      : "Halo {{fullName}}! 👋\n\nPesan Anda di sini..."}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={templateForm.isActive}
                    onChange={(e) => setTemplateForm({ ...templateForm, isActive: e.target.checked })}
                    className="rounded"
                  />
                  <label htmlFor="isActive" className="text-sm text-gray-700">
                    Template is active
                  </label>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
              <button
                onClick={() => {
                  setShowTemplateModal(false);
                  resetTemplateForm();
                }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handlePreview}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50 flex items-center gap-2"
              >
                <Eye className="w-4 h-4" />
                Preview
              </button>
              <button
                onClick={handleSaveTemplate}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {templateForm.id ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Send Modal */}
      {showSendModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-bold text-gray-900">Select Recipients</h2>
              <button onClick={() => setShowSendModal(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Recipient Type</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setSendForm({ ...sendForm, recipientType: 'FILTER' })}
                      className={`px-4 py-2 rounded-lg border ${sendForm.recipientType === 'FILTER'
                          ? 'bg-blue-50 border-blue-500 text-blue-700'
                          : 'hover:bg-gray-50'
                        }`}
                    >
                      <Filter className="w-4 h-4 mx-auto mb-1" />
                      <span className="text-xs">By Filter</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSendForm({ ...sendForm, recipientType: 'INDIVIDUAL' })}
                      className={`px-4 py-2 rounded-lg border ${sendForm.recipientType === 'INDIVIDUAL'
                          ? 'bg-blue-50 border-blue-500 text-blue-700'
                          : 'hover:bg-gray-50'
                        }`}
                    >
                      <User className="w-4 h-4 mx-auto mb-1" />
                      <span className="text-xs">Individual</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSendForm({ ...sendForm, recipientType: 'ALL' })}
                      className={`px-4 py-2 rounded-lg border ${sendForm.recipientType === 'ALL'
                          ? 'bg-blue-50 border-blue-500 text-blue-700'
                          : 'hover:bg-gray-50'
                        }`}
                    >
                      <Users className="w-4 h-4 mx-auto mb-1" />
                      <span className="text-xs">All</span>
                    </button>
                  </div>
                </div>

                {sendForm.recipientType === 'FILTER' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                      <div className="flex gap-2">
                        {['5K', '10K'].map(cat => (
                          <label key={cat} className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={sendForm.filters.category.includes(cat)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSendForm({
                                    ...sendForm,
                                    filters: {
                                      ...sendForm.filters,
                                      category: [...sendForm.filters.category, cat]
                                    }
                                  });
                                } else {
                                  setSendForm({
                                    ...sendForm,
                                    filters: {
                                      ...sendForm.filters,
                                      category: sendForm.filters.category.filter(c => c !== cat)
                                    }
                                  });
                                }
                              }}
                              className="rounded"
                            />
                            <span className="text-sm">{cat}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Payment Status</label>
                      <div className="flex gap-2">
                        {['SUCCESS', 'PENDING', 'FAILED'].map(status => (
                          <label key={status} className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={sendForm.filters.paymentStatus.includes(status)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSendForm({
                                    ...sendForm,
                                    filters: {
                                      ...sendForm.filters,
                                      paymentStatus: [...sendForm.filters.paymentStatus, status]
                                    }
                                  });
                                } else {
                                  setSendForm({
                                    ...sendForm,
                                    filters: {
                                      ...sendForm.filters,
                                      paymentStatus: sendForm.filters.paymentStatus.filter(s => s !== status)
                                    }
                                  });
                                }
                              }}
                              className="rounded"
                            />
                            <span className="text-sm">{status}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Race Pack Status</label>
                      <select
                        value={sendForm.filters.racePackStatus}
                        onChange={(e) => setSendForm({
                          ...sendForm,
                          filters: {
                            ...sendForm.filters,
                            racePackStatus: e.target.value as '' | 'COLLECTED' | 'NOT_COLLECTED'
                          }
                        })}
                        className="w-full px-3 py-2 border rounded-lg"
                      >
                        <option value="">All</option>
                        <option value="COLLECTED">Collected</option>
                        <option value="NOT_COLLECTED">Not Collected</option>
                      </select>
                    </div>
                  </div>
                )}

                {sendForm.recipientType === 'INDIVIDUAL' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Search Participants
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={participantSearch}
                        onChange={(e) => {
                          setParticipantSearch(e.target.value);
                          fetchParticipants(e.target.value);
                        }}
                        placeholder="Search by name, email, or BIB number..."
                        className="w-full px-3 py-2 border rounded-lg pr-10"
                      />
                      <Search className="absolute right-3 top-3 w-4 h-4 text-gray-400" />
                    </div>

                    {loadingParticipants ? (
                      <div className="mt-2 text-center py-4">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                      </div>
                    ) : participants.length > 0 ? (
                      <div className="mt-2 max-h-40 overflow-y-auto border rounded-lg">
                        {participants.map(p => (
                          <label key={p.id} className="flex items-center gap-2 p-2 hover:bg-gray-50">
                            <input
                              type="checkbox"
                              checked={sendForm.participantIds.includes(p.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSendForm({
                                    ...sendForm,
                                    participantIds: [...sendForm.participantIds, p.id]
                                  });
                                } else {
                                  setSendForm({
                                    ...sendForm,
                                    participantIds: sendForm.participantIds.filter(id => id !== p.id)
                                  });
                                }
                              }}
                              className="rounded"
                            />
                            <div className="flex-1">
                              <div className="text-sm font-medium">{p.fullName}</div>
                              <div className="text-xs text-gray-500">
                                {p.category} - BIB: {p.bibNumber || 'TBA'}
                              </div>
                            </div>
                          </label>
                        ))}
                      </div>
                    ) : participantSearch ? (
                      <p className="text-xs text-gray-500 mt-2">No participants found</p>
                    ) : null}

                    {sendForm.participantIds.length > 0 && (
                      <p className="text-xs text-blue-600 mt-2">
                        {sendForm.participantIds.length} participant(s) selected
                      </p>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rate Limit (messages per batch)
                  </label>
                  <input
                    type="number"
                    value={sendForm.rateLimit}
                    onChange={(e) => setSendForm({ ...sendForm, rateLimit: parseInt(e.target.value) || 20 })}
                    min="1"
                    max="100"
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Maximum number of messages to send in this batch (default: 20)
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select
                    value={sendForm.priority}
                    onChange={(e) => setSendForm({ ...sendForm, priority: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="0">Low</option>
                    <option value="1">Medium</option>
                    <option value="2">High</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
              <button
                onClick={() => setShowSendModal(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSendMessage}
                disabled={sending || (sendForm.recipientType === 'INDIVIDUAL' && sendForm.participantIds.length === 0)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
              >
                {sending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Send Messages
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-bold text-gray-900">Message Preview</h2>
              <button onClick={() => setShowPreview(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              {preview.subject && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subject:</label>
                  <p className="p-3 bg-gray-50 rounded-lg">{preview.subject}</p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Content:</label>
                <div className="p-4 bg-gray-50 rounded-lg whitespace-pre-wrap">
                  {preview.content}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end p-6 border-t bg-gray-50">
              <button
                onClick={() => setShowPreview(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}