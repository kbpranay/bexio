import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { Key, CheckCircle, AlertCircle, Eye, EyeOff, RefreshCw, Save } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

interface SettingsProps {
  user: User;
}

export function Settings({ user }: SettingsProps) {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  async function getToken() {
    return user.getIdToken();
  }

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        const res = await fetch('/api/settings/status', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        setIsConfigured(data.configured);
      } catch {
        setIsConfigured(false);
      }
    })();
  }, []);

  const handleSave = async () => {
    if (!apiKey.trim()) return;
    setIsSaving(true);
    setStatusMessage(null);
    try {
      const token = await getToken();
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ bexioApiKey: apiKey.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');
      setIsConfigured(true);
      setApiKey('');
      setStatusMessage({ type: 'success', text: 'API key saved securely.' });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = async () => {
    setIsTesting(true);
    setStatusMessage(null);
    try {
      const token = await getToken();
      const res = await fetch('/api/test-bexio', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Test failed');
      setStatusMessage({ type: 'success', text: `Connection successful — ${data.totalInvoices} invoices found.` });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
        <p className="text-sm text-gray-500 mt-1">Manage your Bexio integration credentials.</p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm space-y-6"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
            <Key className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900">Bexio API Key</h3>
            <p className="text-xs text-gray-500">Stored securely server-side — never exposed to the browser.</p>
          </div>
          {isConfigured !== null && (
            <div className={cn(
              "ml-auto flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border",
              isConfigured
                ? "text-green-600 bg-green-50 border-green-200"
                : "text-orange-500 bg-orange-50 border-orange-200"
            )}>
              {isConfigured
                ? <><CheckCircle className="w-3.5 h-3.5" /> Key configured</>
                : <><AlertCircle className="w-3.5 h-3.5" /> Not configured</>
              }
            </div>
          )}
        </div>

        <div className="space-y-3">
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest">
            {isConfigured ? 'Replace API Key' : 'Enter API Key'}
          </label>
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              placeholder={isConfigured ? '••••••••••••••••••••  (enter new key to replace)' : 'Paste your Bexio API key here'}
              className="w-full pr-12 pl-4 py-3 border border-gray-200 rounded-xl text-sm font-mono bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              type="button"
              onClick={() => setShowKey(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-xs text-gray-400">
            Find your key in Bexio under <span className="font-medium text-gray-500">Settings → Profiles → API Tokens</span>.
          </p>
        </div>

        {statusMessage && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "flex items-center gap-2 px-4 py-3 rounded-xl text-sm border",
              statusMessage.type === 'success'
                ? "text-green-700 bg-green-50 border-green-200"
                : "text-red-600 bg-red-50 border-red-200"
            )}
          >
            {statusMessage.type === 'success'
              ? <CheckCircle className="w-4 h-4 shrink-0" />
              : <AlertCircle className="w-4 h-4 shrink-0" />
            }
            {statusMessage.text}
          </motion.div>
        )}

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={handleSave}
            disabled={isSaving || !apiKey.trim()}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm disabled:opacity-50"
          >
            {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isSaving ? 'Saving…' : 'Save Key'}
          </button>

          {isConfigured && (
            <button
              onClick={handleTest}
              disabled={isTesting}
              className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-5 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-50"
            >
              {isTesting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              {isTesting ? 'Testing…' : 'Test Connection'}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
