import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  Settings, 
  DollarSign, 
  CreditCard, 
  Calendar,
  Sliders,
  Save,
  RotateCcw,
  AlertTriangle,
  CheckCircle,
  Info,
  Percent,
  Clock,
  Shield,
  Zap,
  Database,
  Bell,
  Star
} from 'lucide-react';
import { formatLKR } from '../utils/currency';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';

const PlatformSettings = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('payment');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showResetModal, setShowResetModal] = useState(false);
  const [formData, setFormData] = useState({});

  useEffect(() => {
    if (user?.email === 'admin@aio.com') {
      fetchSettings();
    }
  }, [user]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/platform-settings`, {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setSettings(data);
        setFormData(data);
      } else {
        setError('Failed to fetch platform settings');
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/platform-settings`, {
        method: 'PUT',
        credentials: "include",
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const updatedSettings = await response.json();
        setSettings(updatedSettings);
        setFormData(updatedSettings);
        setSuccess('Platform settings updated successfully!');
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to update settings');
      }
    } catch (error) {
      console.error('Error updating settings:', error);
      setError('Network error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/platform-settings/reset`, {
        method: 'POST',
        credentials: "include",
      });

      if (response.ok) {
        const defaultSettings = await response.json();
        setSettings(defaultSettings);
        setFormData(defaultSettings);
        setSuccess('Platform settings reset to defaults!');
        setShowResetModal(false);
      } else {
        setError('Failed to reset settings');
      }
    } catch (error) {
      console.error('Error resetting settings:', error);
      setError('Network error occurred');
    }
  };

  const updateFormData = (path, value) => {
    const keys = path.split('.');
    const newFormData = { ...formData };
    let current = newFormData;
    
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) current[keys[i]] = {};
      current = current[keys[i]];
    }
    
    current[keys[keys.length - 1]] = value;
    setFormData(newFormData);
  };

  const getNestedValue = (obj, path) => {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  };

  if (!user || user.email !== 'admin@aio.com') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center bg-white p-8 rounded-2xl shadow-xl max-w-md">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
          <p className="text-gray-600">Only platform administrators can access these settings.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="xl" />
      </div>
    );
  }

  const tabs = [
    { id: 'payment', name: 'Payment Settings', icon: CreditCard },
    { id: 'subscription', name: 'Subscriptions', icon: Calendar },
    { id: 'platform', name: 'Platform Config', icon: Sliders },
    { id: 'features', name: 'Feature Flags', icon: Zap }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-3">
                <Settings className="w-8 h-8" />
                <span>Platform Settings</span>
              </h1>
              <p className="text-gray-600 mt-2">Configure platform-wide settings and policies</p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowResetModal(true)}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reset to Defaults</span>
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-black text-white px-6 py-2 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center space-x-2"
              >
                {saving ? <LoadingSpinner size="sm" /> : <Save className="w-4 h-4" />}
                <span>{saving ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6 flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6 flex items-center space-x-2">
            <CheckCircle className="w-5 h-5" />
            <span>{success}</span>
          </div>
        )}

        {/* Settings Info */}
        {settings && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-2 mb-2">
              <Info className="w-5 h-5 text-blue-600" />
              <span className="font-medium text-blue-900">Settings Information</span>
            </div>
            <div className="text-sm text-blue-800">
              <p>Version: {settings.version} | Last updated: {new Date(settings.updatedAt).toLocaleString()}</p>
              {settings.lastUpdatedBy && (
                <p>Updated by: {settings.lastUpdatedBy.name} ({settings.lastUpdatedBy.email})</p>
              )}
            </div>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 overflow-x-auto">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'border-black text-black'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{tab.name}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-lg shadow-sm p-6">

          {/* Subscription Settings Tab */}
          {activeTab === 'subscription' && (
            <div className="space-y-6">
              <div className="flex items-center space-x-2 mb-4">
                <Calendar className="w-6 h-6 text-gray-600" />
                <h2 className="text-xl font-semibold text-gray-900">Subscription Settings</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Monthly Price ({getNestedValue(formData, 'subscriptionSettings.currency') || 'LKR'})
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={getNestedValue(formData, 'subscriptionSettings.monthlyPrice') || 0}
                    onChange={(e) => updateFormData('subscriptionSettings.monthlyPrice', parseFloat(e.target.value))}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                  />
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subscription Duration (days)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={getNestedValue(formData, 'subscriptionSettings.duration') || 30}
                    onChange={(e) => updateFormData('subscriptionSettings.duration', parseInt(e.target.value))}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                  />
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Currency
                  </label>
                  <select
                    value={getNestedValue(formData, 'subscriptionSettings.currency') || 'LKR'}
                    onChange={(e) => updateFormData('subscriptionSettings.currency', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                  >
                    <option value="LKR">Sri Lankan Rupee (LKR)</option>
                    <option value="USD">US Dollar (USD)</option>
                    <option value="EUR">Euro (EUR)</option>
                  </select>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Trial Period (days)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={getNestedValue(formData, 'subscriptionSettings.trialPeriod') || 0}
                    onChange={(e) => updateFormData('subscriptionSettings.trialPeriod', parseInt(e.target.value))}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Payment Settings Tab */}
          {activeTab === 'payment' && (
            <div className="space-y-6">
              <div className="flex items-center space-x-2 mb-4">
                <CreditCard className="w-6 h-6 text-gray-600" />
                <h2 className="text-xl font-semibold text-gray-900">Payment Processing Settings</h2>
              </div>

              {/* PayHere Processing Fee Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-center space-x-2 mb-3">
                  <Info className="w-5 h-5 text-blue-600" />
                  <span className="font-medium text-blue-900">PayHere Processing Fee</span>
                </div>
                <p className="text-blue-800 mb-2">
                  {getNestedValue(formData, 'paymentProcessing.description') || 'PayHere processing fee - 4% of total transaction amount'}
                </p>
                <div className="bg-white rounded px-3 py-2 text-blue-900 font-medium">
                  Fixed Rate: {((getNestedValue(formData, 'paymentProcessing.payhereProcessingFee') || 0.04) * 100).toFixed(2)}%
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Processing Fee (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={(getNestedValue(formData, 'paymentSettings.processingFee') || 0) * 100}
                    onChange={(e) => updateFormData('paymentSettings.processingFee', parseFloat(e.target.value) / 100)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                  />
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Minimum Amount (LKR)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={getNestedValue(formData, 'paymentSettings.minimumAmount') || 0}
                    onChange={(e) => updateFormData('paymentSettings.minimumAmount', parseFloat(e.target.value))}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                  />
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Maximum Amount (LKR)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={getNestedValue(formData, 'paymentSettings.maximumAmount') || 0}
                    onChange={(e) => updateFormData('paymentSettings.maximumAmount', parseFloat(e.target.value))}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                  />
                </div>
              </div>

              {/* Payment Methods */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Supported Payment Methods</h3>
                <div className="space-y-4">
                  {(getNestedValue(formData, 'paymentSettings.supportedMethods') || []).map((method, index) => (
                    <div key={method.id} className="bg-gray-50 p-4 rounded-lg">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                        <div>
                          <label className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={method.enabled}
                              onChange={(e) => {
                                const newMethods = [...(getNestedValue(formData, 'paymentSettings.supportedMethods') || [])];
                                newMethods[index].enabled = e.target.checked;
                                updateFormData('paymentSettings.supportedMethods', newMethods);
                              }}
                              className="rounded border-gray-300 text-black focus:ring-black"
                            />
                            <span className="font-medium">{method.name}</span>
                          </label>
                        </div>
                        <div>
                          <input
                            type="text"
                            value={method.description}
                            onChange={(e) => {
                              const newMethods = [...(getNestedValue(formData, 'paymentSettings.supportedMethods') || [])];
                              newMethods[index].description = e.target.value;
                              updateFormData('paymentSettings.supportedMethods', newMethods);
                            }}
                            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                            placeholder="Description"
                          />
                        </div>
                        <div>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            value={(method.processingFee || 0) * 100}
                            onChange={(e) => {
                              const newMethods = [...(getNestedValue(formData, 'paymentSettings.supportedMethods') || [])];
                              newMethods[index].processingFee = parseFloat(e.target.value) / 100;
                              updateFormData('paymentSettings.supportedMethods', newMethods);
                            }}
                            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                            placeholder="Fee %"
                          />
                        </div>
                        <div className="text-sm text-gray-500">
                          Fee: {((method.processingFee || 0) * 100).toFixed(2)}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Platform Configuration Tab */}
          {activeTab === 'platform' && (
            <div className="space-y-6">
              <div className="flex items-center space-x-2 mb-4">
                <Sliders className="w-6 h-6 text-gray-600" />
                <h2 className="text-xl font-semibold text-gray-900">Platform Configuration</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Products per Store
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={getNestedValue(formData, 'platformConfig.maxProductsPerStore') || 1000}
                    onChange={(e) => updateFormData('platformConfig.maxProductsPerStore', parseInt(e.target.value))}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                  />
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Services per Store
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={getNestedValue(formData, 'platformConfig.maxServicesPerStore') || 100}
                    onChange={(e) => updateFormData('platformConfig.maxServicesPerStore', parseInt(e.target.value))}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                  />
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Images per Product
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={getNestedValue(formData, 'platformConfig.maxImagesPerProduct') || 10}
                    onChange={(e) => updateFormData('platformConfig.maxImagesPerProduct', parseInt(e.target.value))}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                  />
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Images per Service
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={getNestedValue(formData, 'platformConfig.maxImagesPerService') || 5}
                    onChange={(e) => updateFormData('platformConfig.maxImagesPerService', parseInt(e.target.value))}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                  />
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max File Size (MB)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={(getNestedValue(formData, 'platformConfig.maxFileSize') || 10485760) / 1048576}
                    onChange={(e) => updateFormData('platformConfig.maxFileSize', parseFloat(e.target.value) * 1048576)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                  />
                </div>
              </div>

              {/* Maintenance Mode */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <Shield className="w-5 h-5 text-red-600" />
                  <span className="font-medium text-red-900">Maintenance Mode</span>
                </div>
                <label className="flex items-center space-x-2 mb-3">
                  <input
                    type="checkbox"
                    checked={getNestedValue(formData, 'platformConfig.maintenanceMode') || false}
                    onChange={(e) => updateFormData('platformConfig.maintenanceMode', e.target.checked)}
                    className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                  />
                  <span className="text-red-800">Enable maintenance mode</span>
                </label>
                <textarea
                  value={getNestedValue(formData, 'platformConfig.maintenanceMessage') || ''}
                  onChange={(e) => updateFormData('platformConfig.maintenanceMessage', e.target.value)}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="Maintenance message to display to users"
                />
              </div>
            </div>
          )}

          {/* Feature Flags Tab */}
          {activeTab === 'features' && (
            <div className="space-y-6">
              <div className="flex items-center space-x-2 mb-4">
                <Zap className="w-6 h-6 text-gray-600" />
                <h2 className="text-xl font-semibold text-gray-900">Feature Flags</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  { key: 'enableReviews', label: 'Enable Reviews', icon: Star, description: 'Allow customers to review products and services' },
                  { key: 'enableSubscriptions', label: 'Enable Subscriptions', icon: Calendar, description: 'Enable store owner subscriptions' },
                  { key: 'enableAnalytics', label: 'Enable Analytics', icon: Database, description: 'Provide analytics and reporting features' },
                  { key: 'enableNotifications', label: 'Enable Notifications', icon: Bell, description: 'Send email and push notifications' }
                ].map((feature) => {
                  const Icon = feature.icon;
                  return (
                    <div key={feature.key} className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex items-start space-x-3">
                        <Icon className="w-6 h-6 text-gray-600 mt-1" />
                        <div className="flex-1">
                          <label className="flex items-center space-x-2 mb-2">
                            <input
                              type="checkbox"
                              checked={getNestedValue(formData, `features.${feature.key}`) || false}
                              onChange={(e) => updateFormData(`features.${feature.key}`, e.target.checked)}
                              className="rounded border-gray-300 text-black focus:ring-black"
                            />
                            <span className="font-medium text-gray-900">{feature.label}</span>
                          </label>
                          <p className="text-sm text-gray-600">{feature.description}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Reset Confirmation Modal */}
        <Modal
          isOpen={showResetModal}
          onClose={() => setShowResetModal(false)}
          title="Reset Platform Settings"
        >
          <div className="space-y-4">
            <div className="flex items-center space-x-3 text-red-600">
              <AlertTriangle className="w-8 h-8" />
              <div>
                <h3 className="font-semibold">Are you sure?</h3>
                <p className="text-sm text-gray-600">This action will reset all platform settings to their default values and cannot be undone.</p>
              </div>
            </div>
            
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="font-medium text-red-900 mb-2">This will reset:</h4>
              <ul className="text-sm text-red-800 space-y-1">
                <li>• Subscription pricing and settings</li>
                <li>• Payment processing configuration</li>
                <li>• Platform limits and configuration</li>
                <li>• Feature flags</li>
              </ul>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowResetModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReset}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Reset Settings
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
};

export default PlatformSettings;