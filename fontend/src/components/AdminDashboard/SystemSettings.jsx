import React, { useState, useEffect } from 'react';
import {
  Settings,
  Server,
  Database,
  Mail,
  Shield,
  Globe,
  Palette,
  Bell,
  CreditCard,
  Key,
  Upload,
  Download,
  Save,
  RefreshCcw,
  AlertTriangle,
  CheckCircle,
  Info,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Code,
  Zap,
  Users,
  Package
} from 'lucide-react';
import { toast } from 'react-hot-toast';

const SystemSettings = () => {
  const [activeTab, setActiveTab] = useState('general');
  const [settings, setSettings] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showSecrets, setShowSecrets] = useState({});
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  const tabs = [
    { id: 'general', label: 'General', icon: Settings },
    { id: 'email', label: 'Email', icon: Mail },
    { id: 'payment', label: 'Payment', icon: CreditCard },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'api', label: 'API Keys', icon: Key },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'system', label: 'System', icon: Server }
  ];

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/settings', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch settings');
      }

      const data = await response.json();
      setSettings(data.data || {});
      setMaintenanceMode(data.data?.system?.maintenanceMode || false);
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async (section, data) => {
    try {
      setIsSaving(true);
      const response = await fetch(`/api/admin/settings/${section}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`Failed to save ${section} settings`);
      }

      toast.success(`${section} settings saved successfully`);
      fetchSettings();
    } catch (error) {
      console.error(`Error saving ${section} settings:`, error);
      toast.error(`Failed to save ${section} settings`);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleMaintenanceMode = async () => {
    try {
      const newMode = !maintenanceMode;
      await saveSettings('system', { 
        ...settings.system, 
        maintenanceMode: newMode 
      });
      setMaintenanceMode(newMode);
      
      if (newMode) {
        toast.success('Maintenance mode enabled');
      } else {
        toast.success('Maintenance mode disabled');
      }
    } catch (error) {
      console.error('Error toggling maintenance mode:', error);
      toast.error('Failed to toggle maintenance mode');
    }
  };

  const toggleSecret = (key) => {
    setShowSecrets(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const SettingCard = ({ title, description, children, className = '' }) => (
    <div className={`bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 ${className}`}>
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {title}
        </h3>
        {description && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {description}
          </p>
        )}
      </div>
      {children}
    </div>
  );

  const FormInput = ({ label, type = 'text', value, onChange, placeholder, required = false, secret = false, helpText = null }) => (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        <input
          type={secret && !showSecrets[label] ? 'password' : type}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
        {secret && (
          <button
            type="button"
            onClick={() => toggleSecret(label)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            {showSecrets[label] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>
      {helpText && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {helpText}
        </p>
      )}
    </div>
  );

  const FormTextarea = ({ label, value, onChange, placeholder, rows = 3 }) => (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </label>
      <textarea
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
      />
    </div>
  );

  const FormToggle = ({ label, description, checked, onChange }) => (
    <div className="flex items-center justify-between">
      <div>
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
        {description && (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {description}
          </p>
        )}
      </div>
      <label className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only peer"
        />
        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
      </label>
    </div>
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
            <div className="lg:col-span-3 h-96 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  const renderGeneralSettings = () => (
    <div className="space-y-6">
      <SettingCard 
        title="Site Configuration"
        description="Basic site settings and information"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormInput
            label="Site Name"
            value={settings.general?.siteName}
            onChange={(value) => setSettings(prev => ({
              ...prev,
              general: { ...prev.general, siteName: value }
            }))}
            placeholder="Your E-commerce Site"
            required
          />
          <FormInput
            label="Site URL"
            value={settings.general?.siteUrl}
            onChange={(value) => setSettings(prev => ({
              ...prev,
              general: { ...prev.general, siteUrl: value }
            }))}
            placeholder="https://yoursite.com"
            required
          />
        </div>
        
        <FormTextarea
          label="Site Description"
          value={settings.general?.description}
          onChange={(value) => setSettings(prev => ({
            ...prev,
            general: { ...prev.general, description: value }
          }))}
          placeholder="A brief description of your platform"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormInput
            label="Contact Email"
            type="email"
            value={settings.general?.contactEmail}
            onChange={(value) => setSettings(prev => ({
              ...prev,
              general: { ...prev.general, contactEmail: value }
            }))}
            placeholder="admin@yoursite.com"
          />
          <FormInput
            label="Support Phone"
            value={settings.general?.supportPhone}
            onChange={(value) => setSettings(prev => ({
              ...prev,
              general: { ...prev.general, supportPhone: value }
            }))}
            placeholder="+1 (555) 123-4567"
          />
        </div>

        <button
          onClick={() => saveSettings('general', settings.general)}
          disabled={isSaving}
          className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          <Save className="w-4 h-4 inline mr-2" />
          {isSaving ? 'Saving...' : 'Save General Settings'}
        </button>
      </SettingCard>

      <SettingCard 
        title="Platform Settings"
        description="Core platform configuration options"
      >
        <div className="space-y-4">
          <FormToggle
            label="User Registration"
            description="Allow new users to register on the platform"
            checked={settings.general?.allowRegistration !== false}
            onChange={(value) => setSettings(prev => ({
              ...prev,
              general: { ...prev.general, allowRegistration: value }
            }))}
          />
          
          <FormToggle
            label="Store Creation"
            description="Allow users to create new stores"
            checked={settings.general?.allowStoreCreation !== false}
            onChange={(value) => setSettings(prev => ({
              ...prev,
              general: { ...prev.general, allowStoreCreation: value }
            }))}
          />

          <FormToggle
            label="Email Verification Required"
            description="Require email verification for new accounts"
            checked={settings.general?.requireEmailVerification !== false}
            onChange={(value) => setSettings(prev => ({
              ...prev,
              general: { ...prev.general, requireEmailVerification: value }
            }))}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput
              label="Default Commission Rate (%)"
              type="number"
              value={settings.general?.commissionRate}
              onChange={(value) => setSettings(prev => ({
                ...prev,
                general: { ...prev.general, commissionRate: parseFloat(value) }
              }))}
              placeholder="5.0"
              helpText="Platform commission percentage on sales"
            />
            <FormInput
              label="Currency"
              value={settings.general?.currency}
              onChange={(value) => setSettings(prev => ({
                ...prev,
                general: { ...prev.general, currency: value }
              }))}
              placeholder="USD"
            />
          </div>
        </div>
      </SettingCard>
    </div>
  );

  const renderEmailSettings = () => (
    <div className="space-y-6">
      <SettingCard 
        title="Email Configuration"
        description="Configure email service provider settings"
      >
        <div className="space-y-4">
          <FormInput
            label="Email Provider"
            value={settings.email?.provider}
            onChange={(value) => setSettings(prev => ({
              ...prev,
              email: { ...prev.email, provider: value }
            }))}
            placeholder="resend"
          />

          <FormInput
            label="API Key"
            value={settings.email?.apiKey}
            onChange={(value) => setSettings(prev => ({
              ...prev,
              email: { ...prev.email, apiKey: value }
            }))}
            placeholder="Your email service API key"
            secret
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput
              label="From Email"
              type="email"
              value={settings.email?.fromEmail}
              onChange={(value) => setSettings(prev => ({
                ...prev,
                email: { ...prev.email, fromEmail: value }
              }))}
              placeholder="noreply@yoursite.com"
            />
            <FormInput
              label="From Name"
              value={settings.email?.fromName}
              onChange={(value) => setSettings(prev => ({
                ...prev,
                email: { ...prev.email, fromName: value }
              }))}
              placeholder="Your Site Name"
            />
          </div>

          <FormToggle
            label="Email Notifications"
            description="Enable email notifications for users"
            checked={settings.email?.enabled !== false}
            onChange={(value) => setSettings(prev => ({
              ...prev,
              email: { ...prev.email, enabled: value }
            }))}
          />
        </div>

        <button
          onClick={() => saveSettings('email', settings.email)}
          disabled={isSaving}
          className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          <Save className="w-4 h-4 inline mr-2" />
          {isSaving ? 'Saving...' : 'Save Email Settings'}
        </button>
      </SettingCard>

      <SettingCard 
        title="Email Templates"
        description="Configure email template settings"
      >
        <div className="space-y-4">
          <FormToggle
            label="Welcome Email"
            description="Send welcome email to new users"
            checked={settings.email?.templates?.welcome !== false}
            onChange={(value) => setSettings(prev => ({
              ...prev,
              email: { 
                ...prev.email, 
                templates: { ...prev.email?.templates, welcome: value }
              }
            }))}
          />

          <FormToggle
            label="Order Confirmation"
            description="Send order confirmation emails"
            checked={settings.email?.templates?.orderConfirmation !== false}
            onChange={(value) => setSettings(prev => ({
              ...prev,
              email: { 
                ...prev.email, 
                templates: { ...prev.email?.templates, orderConfirmation: value }
              }
            }))}
          />

          <FormToggle
            label="Password Reset"
            description="Send password reset emails"
            checked={settings.email?.templates?.passwordReset !== false}
            onChange={(value) => setSettings(prev => ({
              ...prev,
              email: { 
                ...prev.email, 
                templates: { ...prev.email?.templates, passwordReset: value }
              }
            }))}
          />
        </div>
      </SettingCard>
    </div>
  );

  const renderPaymentSettings = () => (
    <div className="space-y-6">
      <SettingCard 
        title="PayHere Configuration"
        description="Configure PayHere payment gateway settings"
      >
        <div className="space-y-4">
          <FormInput
            label="Merchant ID"
            value={settings.payment?.payhere?.merchantId}
            onChange={(value) => setSettings(prev => ({
              ...prev,
              payment: { 
                ...prev.payment, 
                payhere: { ...prev.payment?.payhere, merchantId: value }
              }
            }))}
            placeholder="Your PayHere Merchant ID"
            required
          />

          <FormInput
            label="App ID"
            value={settings.payment?.payhere?.appId}
            onChange={(value) => setSettings(prev => ({
              ...prev,
              payment: { 
                ...prev.payment, 
                payhere: { ...prev.payment?.payhere, appId: value }
              }
            }))}
            placeholder="Your PayHere App ID"
            secret
            required
          />

          <FormInput
            label="App Secret"
            value={settings.payment?.payhere?.appSecret}
            onChange={(value) => setSettings(prev => ({
              ...prev,
              payment: { 
                ...prev.payment, 
                payhere: { ...prev.payment?.payhere, appSecret: value }
              }
            }))}
            placeholder="Your PayHere App Secret"
            secret
            required
          />

          <FormToggle
            label="Sandbox Mode"
            description="Enable for testing purposes"
            checked={settings.payment?.payhere?.sandbox !== false}
            onChange={(value) => setSettings(prev => ({
              ...prev,
              payment: { 
                ...prev.payment, 
                payhere: { ...prev.payment?.payhere, sandbox: value }
              }
            }))}
          />

          <FormInput
            label="Currency"
            value={settings.payment?.payhere?.currency}
            onChange={(value) => setSettings(prev => ({
              ...prev,
              payment: { 
                ...prev.payment, 
                payhere: { ...prev.payment?.payhere, currency: value }
              }
            }))}
            placeholder="LKR"
          />
        </div>

        <button
          onClick={() => saveSettings('payment', settings.payment)}
          disabled={isSaving}
          className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          <Save className="w-4 h-4 inline mr-2" />
          {isSaving ? 'Saving...' : 'Save Payment Settings'}
        </button>
      </SettingCard>

      <SettingCard 
        title="Additional Payment Methods"
        description="Configure other payment options"
      >
        <div className="space-y-4">
          <FormToggle
            label="Cash on Delivery (COD)"
            description="Allow cash on delivery payments"
            checked={settings.payment?.cod?.enabled !== false}
            onChange={(value) => setSettings(prev => ({
              ...prev,
              payment: { 
                ...prev.payment, 
                cod: { ...prev.payment?.cod, enabled: value }
              }
            }))}
          />

          <FormToggle
            label="Bank Transfer"
            description="Allow bank transfer payments"
            checked={settings.payment?.bankTransfer?.enabled !== false}
            onChange={(value) => setSettings(prev => ({
              ...prev,
              payment: { 
                ...prev.payment, 
                bankTransfer: { ...prev.payment?.bankTransfer, enabled: value }
              }
            }))}
          />

          <FormToggle
            label="Wallet Payments"
            description="Allow wallet-based payments"
            checked={settings.payment?.wallet?.enabled !== false}
            onChange={(value) => setSettings(prev => ({
              ...prev,
              payment: { 
                ...prev.payment, 
                wallet: { ...prev.payment?.wallet, enabled: value }
              }
            }))}
          />
        </div>
      </SettingCard>
    </div>
  );

  const renderSecuritySettings = () => (
    <div className="space-y-6">
      <SettingCard 
        title="Authentication Settings"
        description="Configure authentication and security policies"
      >
        <div className="space-y-4">
          <FormToggle
            label="Two-Factor Authentication"
            description="Enable 2FA for enhanced security"
            checked={settings.security?.twoFactorAuth !== false}
            onChange={(value) => setSettings(prev => ({
              ...prev,
              security: { ...prev.security, twoFactorAuth: value }
            }))}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput
              label="Session Timeout (minutes)"
              type="number"
              value={settings.security?.sessionTimeout}
              onChange={(value) => setSettings(prev => ({
                ...prev,
                security: { ...prev.security, sessionTimeout: parseInt(value) }
              }))}
              placeholder="120"
            />
            <FormInput
              label="Max Login Attempts"
              type="number"
              value={settings.security?.maxLoginAttempts}
              onChange={(value) => setSettings(prev => ({
                ...prev,
                security: { ...prev.security, maxLoginAttempts: parseInt(value) }
              }))}
              placeholder="5"
            />
          </div>

          <FormToggle
            label="Password Complexity Requirements"
            description="Enforce strong password policies"
            checked={settings.security?.passwordComplexity !== false}
            onChange={(value) => setSettings(prev => ({
              ...prev,
              security: { ...prev.security, passwordComplexity: value }
            }))}
          />

          <FormToggle
            label="IP-based Restrictions"
            description="Enable IP-based access control"
            checked={settings.security?.ipRestrictions !== false}
            onChange={(value) => setSettings(prev => ({
              ...prev,
              security: { ...prev.security, ipRestrictions: value }
            }))}
          />
        </div>

        <button
          onClick={() => saveSettings('security', settings.security)}
          disabled={isSaving}
          className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          <Save className="w-4 h-4 inline mr-2" />
          {isSaving ? 'Saving...' : 'Save Security Settings'}
        </button>
      </SettingCard>

      <SettingCard 
        title="Data Protection"
        description="Configure data protection and privacy settings"
      >
        <div className="space-y-4">
          <FormToggle
            label="GDPR Compliance"
            description="Enable GDPR compliance features"
            checked={settings.security?.gdprCompliance !== false}
            onChange={(value) => setSettings(prev => ({
              ...prev,
              security: { ...prev.security, gdprCompliance: value }
            }))}
          />

          <FormToggle
            label="Data Encryption"
            description="Enable data encryption at rest"
            checked={settings.security?.dataEncryption !== false}
            onChange={(value) => setSettings(prev => ({
              ...prev,
              security: { ...prev.security, dataEncryption: value }
            }))}
          />

          <FormInput
            label="Data Retention Period (days)"
            type="number"
            value={settings.security?.dataRetentionDays}
            onChange={(value) => setSettings(prev => ({
              ...prev,
              security: { ...prev.security, dataRetentionDays: parseInt(value) }
            }))}
            placeholder="365"
          />
        </div>
      </SettingCard>
    </div>
  );

  const renderSystemSettings = () => (
    <div className="space-y-6">
      {/* Maintenance Mode */}
      <SettingCard 
        title="Maintenance Mode"
        description="Control site accessibility for maintenance"
        className={maintenanceMode ? 'border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-800' : ''}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full ${maintenanceMode ? 'bg-yellow-500' : 'bg-green-500'}`}></div>
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white">
                {maintenanceMode ? 'Maintenance Mode Active' : 'Site Online'}
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {maintenanceMode 
                  ? 'Site is currently in maintenance mode' 
                  : 'Site is accessible to all users'
                }
              </p>
            </div>
          </div>
          
          <button
            onClick={toggleMaintenanceMode}
            className={`px-4 py-2 rounded-lg font-medium focus:outline-none focus:ring-2 ${
              maintenanceMode
                ? 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500'
                : 'bg-yellow-600 text-white hover:bg-yellow-700 focus:ring-yellow-500'
            }`}
          >
            {maintenanceMode ? (
              <>
                <Unlock className="w-4 h-4 inline mr-2" />
                Disable Maintenance
              </>
            ) : (
              <>
                <Lock className="w-4 h-4 inline mr-2" />
                Enable Maintenance
              </>
            )}
          </button>
        </div>
        
        {maintenanceMode && (
          <div className="mt-4 p-4 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div>
                <h5 className="font-medium text-yellow-800 dark:text-yellow-200">
                  Maintenance Mode is Active
                </h5>
                <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                  Only administrators can access the site. All other users will see a maintenance page.
                </p>
              </div>
            </div>
          </div>
        )}
      </SettingCard>

      <SettingCard 
        title="System Performance"
        description="Configure system performance settings"
      >
        <div className="space-y-4">
          <FormToggle
            label="Caching Enabled"
            description="Enable system-wide caching for better performance"
            checked={settings.system?.caching !== false}
            onChange={(value) => setSettings(prev => ({
              ...prev,
              system: { ...prev.system, caching: value }
            }))}
          />

          <FormToggle
            label="Database Indexing"
            description="Enable automatic database indexing"
            checked={settings.system?.dbIndexing !== false}
            onChange={(value) => setSettings(prev => ({
              ...prev,
              system: { ...prev.system, dbIndexing: value }
            }))}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput
              label="API Rate Limit (requests/minute)"
              type="number"
              value={settings.system?.apiRateLimit}
              onChange={(value) => setSettings(prev => ({
                ...prev,
                system: { ...prev.system, apiRateLimit: parseInt(value) }
              }))}
              placeholder="100"
            />
            <FormInput
              label="File Upload Limit (MB)"
              type="number"
              value={settings.system?.uploadLimit}
              onChange={(value) => setSettings(prev => ({
                ...prev,
                system: { ...prev.system, uploadLimit: parseInt(value) }
              }))}
              placeholder="10"
            />
          </div>
        </div>

        <button
          onClick={() => saveSettings('system', settings.system)}
          disabled={isSaving}
          className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          <Save className="w-4 h-4 inline mr-2" />
          {isSaving ? 'Saving...' : 'Save System Settings'}
        </button>
      </SettingCard>

      <SettingCard 
        title="Backup & Recovery"
        description="Configure backup and recovery options"
      >
        <div className="space-y-4">
          <FormToggle
            label="Automatic Backups"
            description="Enable daily automatic backups"
            checked={settings.system?.autoBackup !== false}
            onChange={(value) => setSettings(prev => ({
              ...prev,
              system: { ...prev.system, autoBackup: value }
            }))}
          />

          <FormInput
            label="Backup Retention (days)"
            type="number"
            value={settings.system?.backupRetentionDays}
            onChange={(value) => setSettings(prev => ({
              ...prev,
              system: { ...prev.system, backupRetentionDays: parseInt(value) }
            }))}
            placeholder="30"
          />

          <div className="flex space-x-3">
            <button className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <Download className="w-4 h-4 inline mr-2" />
              Create Backup
            </button>
            <button className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500">
              <Upload className="w-4 h-4 inline mr-2" />
              Restore Backup
            </button>
          </div>
        </div>
      </SettingCard>
    </div>
  );

  const renderApiSettings = () => (
    <div className="space-y-6">
      <SettingCard 
        title="API Configuration"
        description="Manage API keys and access controls"
      >
        <div className="space-y-4">
          <FormToggle
            label="API Access Enabled"
            description="Enable API access for external applications"
            checked={settings.api?.enabled !== false}
            onChange={(value) => setSettings(prev => ({
              ...prev,
              api: { ...prev.api, enabled: value }
            }))}
          />

          <FormInput
            label="API Version"
            value={settings.api?.version}
            onChange={(value) => setSettings(prev => ({
              ...prev,
              api: { ...prev.api, version: value }
            }))}
            placeholder="v1"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput
              label="Rate Limit (requests/hour)"
              type="number"
              value={settings.api?.rateLimit}
              onChange={(value) => setSettings(prev => ({
                ...prev,
                api: { ...prev.api, rateLimit: parseInt(value) }
              }))}
              placeholder="1000"
            />
            <FormInput
              label="Max Requests per Day"
              type="number"
              value={settings.api?.dailyLimit}
              onChange={(value) => setSettings(prev => ({
                ...prev,
                api: { ...prev.api, dailyLimit: parseInt(value) }
              }))}
              placeholder="10000"
            />
          </div>
        </div>

        <button
          onClick={() => saveSettings('api', settings.api)}
          disabled={isSaving}
          className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          <Save className="w-4 h-4 inline mr-2" />
          {isSaving ? 'Saving...' : 'Save API Settings'}
        </button>
      </SettingCard>

      <SettingCard 
        title="Third Party Services"
        description="Configure external service integrations"
      >
        <div className="space-y-4">
          <FormInput
            label="Google Analytics ID"
            value={settings.api?.googleAnalytics}
            onChange={(value) => setSettings(prev => ({
              ...prev,
              api: { ...prev.api, googleAnalytics: value }
            }))}
            placeholder="GA-XXXXXXXXX"
            helpText="Google Analytics tracking ID"
          />

          <FormInput
            label="Facebook App ID"
            value={settings.api?.facebookAppId}
            onChange={(value) => setSettings(prev => ({
              ...prev,
              api: { ...prev.api, facebookAppId: value }
            }))}
            placeholder="Your Facebook App ID"
          />

          <FormInput
            label="Google Maps API Key"
            value={settings.api?.googleMapsKey}
            onChange={(value) => setSettings(prev => ({
              ...prev,
              api: { ...prev.api, googleMapsKey: value }
            }))}
            placeholder="Your Google Maps API Key"
            secret
          />
        </div>
      </SettingCard>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'general':
        return renderGeneralSettings();
      case 'email':
        return renderEmailSettings();
      case 'payment':
        return renderPaymentSettings();
      case 'security':
        return renderSecuritySettings();
      case 'api':
        return renderApiSettings();
      case 'system':
        return renderSystemSettings();
      default:
        return (
          <div className="text-center py-12">
            <Settings className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
              Settings Section
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              This settings section is under development.
            </p>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            System Settings
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Configure platform settings and system preferences
          </p>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={fetchSettings}
            disabled={isLoading}
            className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            <RefreshCcw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Settings Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <nav className="space-y-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${
                    activeTab === tab.id
                      ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <Icon className="w-4 h-4 mr-3" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="lg:col-span-3">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default SystemSettings;