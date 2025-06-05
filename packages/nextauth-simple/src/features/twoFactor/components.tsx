'use client';

import React, { useState } from 'react';
import { TwoFactorSetupResult, TwoFactorStatus } from './types';

interface TwoFactorSetupProps {
  setupResult: TwoFactorSetupResult;
  onVerify: (code: string) => Promise<void>;
  onCancel: () => void;
}

/**
 * Two-Factor Authentication setup component
 * 
 * This component displays the QR code and secret for setting up 2FA,
 * and provides a form for verifying the setup with a code from the authenticator app.
 */
export function TwoFactorSetup({ setupResult, onVerify, onCancel }: TwoFactorSetupProps) {
  const [code, setCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifying(true);
    setError(null);

    try {
      await onVerify(code);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="two-factor-setup">
      <h2>Set up Two-Factor Authentication</h2>

      <div className="setup-instructions">
        <p>Scan this QR code with your authenticator app:</p>
        <div className="qr-code">
          <img src={setupResult.qrCodeUrl} alt="QR Code for 2FA setup" />
        </div>

        <p>Or enter this code manually:</p>
        <div className="secret-code">
          <code>{setupResult.secret}</code>
        </div>

        {setupResult.recoveryCodes && (
          <>
            <p>Save these recovery codes in a safe place. You can use them to access your account if you lose your authenticator device:</p>
            <div className="recovery-codes">
              <ul>
                {setupResult.recoveryCodes.map((code, index) => (
                  <li key={index}><code>{code}</code></li>
                ))}
              </ul>
            </div>
          </>
        )}
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="verification-code">Enter the 6-digit code from your authenticator app:</label>
          <input
            id="verification-code"
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="000000"
            maxLength={6}
            required
            pattern="[0-9]{6}"
            disabled={isVerifying}
          />
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="form-actions">
          <button type="button" onClick={onCancel} disabled={isVerifying}>
            Cancel
          </button>
          <button type="submit" disabled={isVerifying || code.length !== 6}>
            {isVerifying ? 'Verifying...' : 'Verify'}
          </button>
        </div>
      </form>
    </div>
  );
}

interface TwoFactorChallengeProps {
  userId: string;
  challengeToken: string;
  onVerify: (code: string) => Promise<void>;
  onCancel: () => void;
}

/**
 * Two-Factor Authentication challenge component
 * 
 * This component provides a form for entering a verification code
 * during the login process when 2FA is enabled.
 */
export function TwoFactorChallenge({ userId, challengeToken, onVerify, onCancel }: TwoFactorChallengeProps) {
  const [code, setCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifying(true);
    setError(null);

    try {
      await onVerify(code);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="two-factor-challenge">
      <h2>Two-Factor Authentication Required</h2>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="verification-code">Enter the 6-digit code from your authenticator app:</label>
          <input
            id="verification-code"
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="000000"
            maxLength={6}
            required
            pattern="[0-9]{6}"
            disabled={isVerifying}
            autoFocus
          />
        </div>

        <p className="recovery-code-info">
          Or enter a recovery code if you've lost access to your authenticator app.
        </p>

        {error && <div className="error-message">{error}</div>}

        <div className="form-actions">
          <button type="button" onClick={onCancel} disabled={isVerifying}>
            Cancel
          </button>
          <button type="submit" disabled={isVerifying || code.length < 6}>
            {isVerifying ? 'Verifying...' : 'Verify'}
          </button>
        </div>
      </form>
    </div>
  );
}

interface TwoFactorStatusProps {
  status: TwoFactorStatus;
  onDisable: () => Promise<void>;
}

/**
 * Two-Factor Authentication status component
 * 
 * This component displays the current 2FA status and provides
 * options to disable it.
 */
export function TwoFactorStatusDisplay({ status, onDisable }: TwoFactorStatusProps) {
  const [isDisabling, setIsDisabling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDisable = async () => {
    if (!window.confirm('Are you sure you want to disable two-factor authentication? This will make your account less secure.')) {
      return;
    }

    setIsDisabling(true);
    setError(null);

    try {
      await onDisable();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disable two-factor authentication');
    } finally {
      setIsDisabling(false);
    }
  };

  return (
    <div className="two-factor-status">
      <h2>Two-Factor Authentication</h2>

      <div className="status-info">
        <p>
          Status: <strong>{status.enabled ? 'Enabled' : 'Disabled'}</strong>
        </p>
        {status.enabled && (
          <>
            <p>
              Verified: <strong>{status.verified ? 'Yes' : 'No'}</strong>
            </p>
            {status.createdAt && (
              <p>
                Enabled on: <strong>{new Date(status.createdAt).toLocaleDateString()}</strong>
              </p>
            )}
          </>
        )}
      </div>

      {status.enabled && (
        <div className="actions">
          <button
            onClick={handleDisable}
            disabled={isDisabling}
            className="danger-button"
          >
            {isDisabling ? 'Disabling...' : 'Disable Two-Factor Authentication'}
          </button>

          {error && <div className="error-message">{error}</div>}
        </div>
      )}
    </div>
  );
}
