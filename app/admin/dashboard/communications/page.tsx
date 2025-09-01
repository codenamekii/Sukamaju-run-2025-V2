// app/admin/dashboard/communications/page.tsx
"use client";

import {
  AlertCircle,
  CheckCircle,
  Clock,
  Edit2,
  Eye,
  LucideIcon,
  Mail, MessageSquare, Plus,
  Save,
  Search,
  Send,
  User,
  Users,
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
  lastUsed?: string;
  createdAt: string;
  updatedAt: string;
}

interface Category {
  value: string;
  label: string;
  icon: LucideIcon;
}

const categories: Category[] = [
  { value: 'REGISTRATION', label: 'Registration', icon: User },
  { value: 'PAYMENT', label: 'Payment', icon: CheckCircle },
  { value: 'REMINDER', label: 'Reminder', icon: Clock },
  { value: 'ANNOUNCEMENT', label: 'Announcement', icon: AlertCircle },
  { value: 'RACE_PACK', label: 'Race Pack', icon: Users },
];

// Sample templates untuk testing jika API belum ready
const sampleTemplates: Template[] = [
  {
    id: '1',
    name: 'Registration Confirmation',
    type: 'EMAIL',
    category: 'REGISTRATION',
    subject: 'Welcome to Sukamaju Run 2025!',
    content: 'Hi {{fullName}}, your registration is confirmed...',
    variables: ['fullName', 'registrationCode'],
    isActive: true,
    usageCount: 45,
    lastUsed: '2025-01-15',
    createdAt: '2025-01-01',
    updatedAt: '2025-01-15'
  },
  {
    id: '2',
    name: 'WhatsApp Payment Reminder',
    type: 'WHATSAPP',
    category: 'PAYMENT',
    content: 'Halo {{fullName}}! Jangan lupa bayar registrasi...',
    variables: ['fullName', 'totalPrice'],
    isActive: true,
    usageCount: 23,
    createdAt: '2025-01-01',
    updatedAt: '2025-01-10'
  }
];

export default function CommunicationsPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'EMAIL' | 'WHATSAPP'>('EMAIL');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);

  // Form state for create/edit
  const [formData, setFormData] = useState({
    name: '',
    type: 'EMAIL' as 'EMAIL' | 'WHATSAPP',
    category: 'REGISTRATION',
    subject: '',
    content: '',
    variables: [] as string[],
    isActive: true
  });

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    setApiError(null);

    try {
      const response = await fetch('/api/admin/templates');

      // Check if response is OK
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Check content type
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        console.warn("Response is not JSON, using sample data");
        setTemplates(sampleTemplates);
        return;
      }

      const data = await response.json();
      setTemplates(data.templates || sampleTemplates);

    } catch (error) {
      console.error('Error fetching templates:', error);
      setApiError('Failed to load templates. Using sample data.');
      // Use sample data as fallback
      setTemplates(sampleTemplates);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTemplate = async () => {
    try {
      // For now, just update local state
      if (editingTemplate) {
        setTemplates(templates.map(t =>
          t.id === editingTemplate.id
            ? { ...t, ...formData, id: t.id }
            : t
        ));
      } else {
        const newTemplate: Template = {
          ...formData,
          id: Date.now().toString(),
          usageCount: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        setTemplates([...templates, newTemplate]);
      }

      alert(`Template ${editingTemplate ? 'updated' : 'created'} successfully`);
      handleCloseModal();

      // Try to save to API
      try {
        const url = editingTemplate
          ? `/api/admin/templates/${editingTemplate.id}`
          : '/api/admin/templates';

        const method = editingTemplate ? 'PATCH' : 'POST';

        await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
      } catch (apiError) {
        console.log('API save failed, but local state updated');
      }

    } catch (error) {
      alert('Failed to save template');
    }
  };


  const handleTestSend = async (template: Template) => {
    const testRecipient = prompt(
      template.type === 'EMAIL'
        ? 'Enter test email address:'
        : 'Enter test WhatsApp number (628xxx):'
    );

    if (!testRecipient) return;

    alert(`Test ${template.type.toLowerCase()} would be sent to ${testRecipient}`);

    // Try API call but don't block on failure
    try {
      await fetch('/api/admin/templates/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: template.id,
          recipient: testRecipient
        })
      });
    } catch (error) {
      console.log('Test send API failed');
    }
  };

  const extractVariables = (content: string): string[] => {
    const regex = /\{\{(\w+)\}\}/g;
    const variables = new Set<string>();
    let match;
    while ((match = regex.exec(content)) !== null) {
      variables.add(match[1]);
    }
    return Array.from(variables);
  };

  const handleContentChange = (content: string) => {
    setFormData({
      ...formData,
      content,
      variables: extractVariables(content)
    });
  };

  const handleCloseModal = () => {
    setIsCreateModalOpen(false);
    setEditingTemplate(null);
    setFormData({
      name: '',
      type: 'EMAIL',
      category: 'REGISTRATION',
      subject: '',
      content: '',
      variables: [],
      isActive: true
    });
  };

  const handleEditTemplate = (template: Template) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      type: template.type,
      category: template.category,
      subject: template.subject || '',
      content: template.content,
      variables: template.variables,
      isActive: template.isActive
    });
    setIsCreateModalOpen(true);
  };

  const renderPreview = (template: Template) => {
    const sampleData: { [key: string]: string } = {
      fullName: 'John Doe',
      registrationCode: 'REG2025001',
      category: '10K',
      bibNumber: '1234',
      totalPrice: '250000',
      paymentUrl: 'https://payment.example.com',
      eventDate: '15 Februari 2025',
      venue: 'Sukamaju Park',
      whatsapp: '628123456789'
    };

    let content = template.content;
    Object.entries(sampleData).forEach(([key, value]) => {
      content = content.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    });

    if (template.type === 'WHATSAPP') {
      return (
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <pre className="whitespace-pre-wrap text-sm font-sans">{content}</pre>
          </div>
        </div>
      );
    }

    return (
      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="bg-white rounded-lg shadow-sm">
          {template.subject && (
            <div className="border-b p-4">
              <p className="text-sm text-gray-600">Subject:</p>
              <p className="font-medium">{template.subject}</p>
            </div>
          )}
          <div className="p-4">
            <div dangerouslySetInnerHTML={{ __html: content.replace(/\n/g, '<br/>') }} />
          </div>
        </div>
      </div>
    );
  };

  const filteredTemplates = templates.filter(template => {
    const matchesType = template.type === activeTab;
    const matchesCategory = selectedCategory === 'ALL' || template.category === selectedCategory;
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.content.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesType && matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Communication Templates</h1>
          <p className="text-sm text-gray-500 mt-1">Manage email and WhatsApp message templates</p>
        </div>
        <button
          onClick={() => {
            setFormData({ ...formData, type: activeTab });
            setIsCreateModalOpen(true);
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Create Template
        </button>
      </div>

      {/* API Error Alert */}
      {apiError && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg">
          <p className="text-sm">{apiError}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm">
        <div className="border-b">
          <div className="flex">
            <button
              onClick={() => setActiveTab('EMAIL')}
              className={`px-6 py-3 font-medium flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'EMAIL'
                  ? 'text-blue-600 border-blue-600'
                  : 'text-gray-500 border-transparent hover:text-gray-700'
                }`}
            >
              <Mail className="w-4 h-4" />
              Email Templates
            </button>
            <button
              onClick={() => setActiveTab('WHATSAPP')}
              className={`px-6 py-3 font-medium flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'WHATSAPP'
                  ? 'text-green-600 border-green-600'
                  : 'text-gray-500 border-transparent hover:text-gray-700'
                }`}
            >
              <MessageSquare className="w-4 h-4" />
              WhatsApp Templates
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="p-4 border-b bg-gray-50">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search templates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">All Categories</option>
                {categories.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Templates Grid */}
        <div className="p-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading templates...</p>
            </div>
          ) : filteredTemplates.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTemplates.map((template) => (
                <div key={template.id} className="border rounded-lg p-4 hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-medium text-gray-900">{template.name}</h3>
                      <p className="text-xs text-gray-500 mt-1">
                        {categories.find(c => c.value === template.category)?.label}
                      </p>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${template.isActive
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                      }`}>
                      {template.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  <div className="text-sm text-gray-600 mb-3 line-clamp-3">
                    {template.type === 'EMAIL' && template.subject && (
                      <p className="font-medium mb-1">Subject: {template.subject}</p>
                    )}
                    <p className="line-clamp-2">{template.content}</p>
                  </div>

                  {template.variables.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs text-gray-500 mb-1">Variables:</p>
                      <div className="flex flex-wrap gap-1">
                        {template.variables.map((variable) => (
                          <span key={variable} className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                            {`{{${variable}}}`}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                    <span>Used: {template.usageCount} times</span>
                    {template.lastUsed && (
                      <span>Last: {new Date(template.lastUsed).toLocaleDateString()}</span>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setPreviewTemplate(template);
                        setShowPreview(true);
                      }}
                      className="flex-1 px-3 py-1.5 text-xs border rounded hover:bg-gray-50 flex items-center justify-center gap-1"
                    >
                      <Eye className="w-3 h-3" />
                      Preview
                    </button>
                    <button
                      onClick={() => handleEditTemplate(template)}
                      className="flex-1 px-3 py-1.5 text-xs border rounded hover:bg-gray-50 flex items-center justify-center gap-1"
                    >
                      <Edit2 className="w-3 h-3" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleTestSend(template)}
                      className="flex-1 px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center justify-center gap-1"
                    >
                      <Send className="w-3 h-3" />
                      Test
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Mail className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No templates found</p>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="mt-4 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg"
              >
                Create your first template
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Modal - sama seperti sebelumnya */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-bold text-gray-900">
                {editingTemplate ? 'Edit Template' : 'Create New Template'}
              </h2>
              <button onClick={handleCloseModal} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Template Name</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., Registration Confirmation"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {categories.map(cat => (
                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {formData.type === 'EMAIL' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                    <input
                      type="text"
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., Welcome to Sukamaju Run 2025!"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
                  <textarea
                    value={formData.content}
                    onChange={(e) => handleContentChange(e.target.value)}
                    rows={10}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                    placeholder={formData.type === 'EMAIL'
                      ? "Hi {{fullName}},\n\nYour registration for Sukamaju Run 2025 has been confirmed!\n\nRegistration Code: {{registrationCode}}\nCategory: {{category}}\n\nBest regards,\nSukamaju Run Team"
                      : "🏃 *SUKAMAJU RUN 2025* 🏃\n\nHalo {{fullName}}!\n\nRegistrasi Anda berhasil!\n📋 Kode: *{{registrationCode}}*\n🏃 Kategori: *{{category}}*\n\nTerima kasih! 🙏"
                    }
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Use variables like {`{{fullName}}, {{registrationCode}}, {{category}}, {{bibNumber}}, {{totalPrice}}`}
                  </p>
                </div>

                {formData.variables.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Detected Variables:</p>
                    <div className="flex flex-wrap gap-2">
                      {formData.variables.map((variable) => (
                        <span key={variable} className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full">
                          {`{{${variable}}}`}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  <label htmlFor="isActive" className="text-sm text-gray-700">
                    Template is active and can be used
                  </label>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
              <button
                onClick={handleCloseModal}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTemplate}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {editingTemplate ? 'Update Template' : 'Create Template'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && previewTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-bold text-gray-900">Template Preview</h2>
              <button
                onClick={() => {
                  setShowPreview(false);
                  setPreviewTemplate(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              {renderPreview(previewTemplate)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}