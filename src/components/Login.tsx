import React, { useState } from 'react';
import { useAsana } from '../context/AsanaContext';
import * as Icons from 'lucide-react';

export const Login: React.FC = () => {
  const { loginUser } = useAsana();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const testAccounts = [
    { name: 'CEO', email: 'ceo@parakkat.com', desc: 'Broadcast voice guidelines to entire group' },
    { name: 'Zonal Manager (Central)', email: 'zonal.central@parakkat.com', desc: 'Listen to CEO and delegate to stores' },
    { name: 'Store Manager (Ernakulam)', email: 'mgr.ekm@parakkat.com', desc: 'Oversee store task logs and employee lists' },
    { name: 'Employee (Ernakulam)', email: 'emp1@parakkat.com', desc: 'View voice tasks and check off daily lists' },
    { name: 'System Admin', email: 'admin@parakkat.com', desc: 'Add outlets, manage zones and users' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    const success = await loginUser(email.trim());
    setLoading(false);

    if (success) {
      setEmail('');
    }
  };

  const handleQuickLogin = async (testEmail: string) => {
    setLoading(true);
    await loginUser(testEmail);
    setLoading(false);
  };

  return (
    <div className="login-screen-overlay">
      <div className="login-card-container animate-scale-up">
        {/* Branding header */}
        <div className="login-branding-header">
          <div className="brand-badge">PJ</div>
          <h2>PARAKKAT</h2>
          <p className="brand-subtitle">JEWELERY OUTLET MANAGEMENT</p>
          <div className="brand-divider"></div>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="login-auth-form">
          <div className="login-form-group">
            <label htmlFor="login-email">Sign in with Employee Email</label>
            <div className="email-input-wrapper">
              <Icons.Mail className="mail-field-icon" size={16} />
              <input
                type="email"
                id="login-email"
                placeholder="e.g. name@parakkat.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
          </div>
          <button 
            type="submit" 
            className="primary-btn login-submit-btn"
            disabled={loading}
          >
            {loading ? 'Authenticating...' : 'Sign In'}
            {!loading && <Icons.ArrowRight size={16} />}
          </button>
        </form>

        {/* Quick Demo Access Credentials */}
        <div className="quick-access-section">
          <h4>Quick demo access roles:</h4>
          <div className="test-accounts-grid">
            {testAccounts.map(account => (
              <button
                type="button"
                key={account.email}
                className="test-account-row-btn"
                onClick={() => handleQuickLogin(account.email)}
                disabled={loading}
              >
                <div className="account-tag">{account.name}</div>
                <div className="account-info">
                  <span className="acc-email">{account.email}</span>
                  <span className="acc-desc">{account.desc}</span>
                </div>
                <Icons.ChevronRight size={14} className="acc-arrow" />
              </button>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        .login-screen-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background-color: var(--bg-secondary);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow-y: auto;
          padding: 24px;
        }

        .login-card-container {
          background-color: var(--bg-primary);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-xl);
          width: 460px;
          padding: 40px 32px;
          display: flex;
          flex-direction: column;
          gap: 28px;
        }

        .login-branding-header {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }

        .brand-badge {
          background: var(--primary-gradient);
          color: white;
          width: 48px;
          height: 48px;
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: var(--font-display);
          font-weight: 700;
          font-size: 20px;
          border: 2px solid var(--accent);
          margin-bottom: 12px;
          box-shadow: 0 4px 10px rgba(var(--primary-rgb), 0.2);
        }

        .login-branding-header h2 {
          font-family: var(--font-display);
          font-size: 22px;
          font-weight: 700;
          letter-spacing: 0.1em;
          color: var(--primary);
        }

        .brand-subtitle {
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.15em;
          color: var(--accent);
          margin-top: 4px;
        }

        .brand-divider {
          width: 60px;
          height: 3px;
          background-color: var(--accent);
          border-radius: var(--radius-full);
          margin-top: 16px;
        }

        .login-auth-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .login-form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .login-form-group label {
          font-size: 12px;
          font-weight: 600;
          color: var(--text-secondary);
        }

        .email-input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .mail-field-icon {
          position: absolute;
          left: 12px;
          color: var(--text-muted);
          pointer-events: none;
        }

        .email-input-wrapper input {
          width: 100%;
          padding: 10px 12px 10px 36px;
          font-size: 14px;
          border-radius: var(--radius-sm);
          border: 1px solid var(--border-color);
          background-color: var(--bg-secondary);
        }

        .email-input-wrapper input:focus {
          outline: none;
          border-color: var(--primary);
          box-shadow: 0 0 0 2px rgba(var(--primary-rgb), 0.1);
        }

        .login-submit-btn {
          width: 100%;
          justify-content: center;
          padding: 12px;
          font-weight: 600;
          font-size: 14px;
        }

        .quick-access-section {
          border-top: 1px solid var(--border-color);
          padding-top: 20px;
        }

        .quick-access-section h4 {
          font-size: 11px;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 12px;
          font-weight: 600;
        }

        .test-accounts-grid {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .test-account-row-btn {
          display: flex;
          align-items: center;
          width: 100%;
          padding: 10px 12px;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
          background-color: var(--bg-secondary);
          transition: background-color var(--transition-fast), border-color var(--transition-fast);
          text-align: left;
          cursor: pointer;
        }

        .test-account-row-btn:hover {
          background-color: var(--bg-hover);
          border-color: var(--accent);
        }

        .account-tag {
          font-size: 9px;
          background-color: var(--primary);
          color: white;
          padding: 2px 6px;
          border-radius: 4px;
          font-weight: 700;
          width: 110px;
          text-align: center;
          flex-shrink: 0;
          text-transform: uppercase;
          letter-spacing: 0.02em;
        }

        .account-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          padding-left: 12px;
          overflow: hidden;
        }

        .acc-email {
          font-size: 12px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .acc-desc {
          font-size: 10px;
          color: var(--text-muted);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .acc-arrow {
          color: var(--text-muted);
          transition: transform var(--transition-fast);
        }

        .test-account-row-btn:hover .acc-arrow {
          color: var(--primary);
          transform: translateX(2px);
        }
      `}</style>
    </div>
  );
};
