import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { X, Mail, Lock, User, Eye, EyeOff, CheckCircle2, ArrowRight } from 'lucide-react';
import './AuthModal.css';

const AuthModal = () => {
  const { 
    isLoginModalOpen, 
    isRegisterModalOpen, 
    closeModals, 
    login, 
    register,
  } = useAuth();

  const [isLoginView, setIsLoginView] = useState(isLoginModalOpen);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const timeoutRef = useRef(null);

  // Sync state with open modal type
  useEffect(() => {
    if (isLoginModalOpen) setIsLoginView(true);
    if (isRegisterModalOpen) setIsLoginView(false);
    // Reset forms
    setError('');
    setSuccess(false);
  }, [isLoginModalOpen, isRegisterModalOpen]);

  useEffect(() => {
    return () => clearTimeout(timeoutRef.current);
  }, []);

  if (!isLoginModalOpen && !isRegisterModalOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    // Simple Validations
    if (!email || !password) {
      setError('Please fill in all required fields.');
      return;
    }
    
    if (!isLoginView && !name) {
      setError('Please enter your name.');
      return;
    }

    if (!isLoginView && password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);

    try {
      let result;
      if (isLoginView) {
        result = await login(email, password);
      } else {
        result = await register(name, email, password);
      }

      if (result.success) {
        setSuccess(true);
        timeoutRef.current = setTimeout(() => {
          setEmail('');
          setPassword('');
          setName('');
          setConfirmPassword('');
          setSuccess(false);
          closeModals();
          window.location.href = '/dashboard';
        }, 500);
      } else {
        setError(result.error);
        setLoading(false);
      }
    } catch (err) {
      setError('An unexpected network error occurred.');
      setLoading(false);
    }
  };

  return (
    <div className="auth-overlay" onClick={closeModals}>
      <div className="auth-overlay-orbs" aria-hidden="true">
        <span className="auth-orb auth-orb-1" />
        <span className="auth-orb auth-orb-2" />
      </div>
      <div 
        className="auth-card" 
        onClick={(e) => e.stopPropagation()}
      >
        <button className="auth-close" onClick={closeModals} aria-label="Close">
          <X size={20} />
        </button>

        {success ? (
          <div className="auth-success-screen animate-fade-in">
            <div className="success-icon-wrapper">
              <CheckCircle2 size={64} className="success-icon" />
            </div>
            <h3>{isLoginView ? 'Welcome Back!' : 'Account Created!'}</h3>
            <p>
              {isLoginView 
                ? 'Logging you in securely...' 
                : 'Your profile has been created successfully.'}
            </p>
          </div>
        ) : (
          <>
            <div className="auth-header">
              <span className="auth-brand-mark">BS</span>
              <h2>Billing SaaS</h2>
              <p className="auth-subtitle">
                {isLoginView ? 'Access your dashboard' : 'Create your free account'}
              </p>
            </div>

            <div className="auth-tabs">
              <button 
                className={`auth-tab-btn ${isLoginView ? 'active' : ''}`}
                onClick={() => { setIsLoginView(true); setError(''); }}
              >
                Sign In
              </button>
              <button 
                className={`auth-tab-btn ${!isLoginView ? 'active' : ''}`}
                onClick={() => { setIsLoginView(false); setError(''); }}
              >
                Sign Up
              </button>
              <div className={`tab-indicator ${isLoginView ? 'left' : 'right'}`}></div>
            </div>

            {error && <div className="auth-error animate-slide-down">{error}</div>}

            <form onSubmit={handleSubmit} className="auth-form">
              {!isLoginView && (
                <div className="form-group">
                  <label htmlFor="auth-name">Full Name</label>
                  <div className="input-wrapper">
                    <User size={18} className="input-icon" />
                    <input 
                      type="text" 
                      id="auth-name" 
                      placeholder="John Doe"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required={!isLoginView}
                    />
                  </div>
                </div>
              )}

              <div className="form-group">
                <label htmlFor="auth-email">Email Address</label>
                <div className="input-wrapper">
                  <Mail size={18} className="input-icon" />
                  <input 
                    type="email" 
                    id="auth-email" 
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="auth-password">Password</label>
                <div className="input-wrapper">
                  <Lock size={18} className="input-icon" />
                  <input 
                    type={showPassword ? 'text' : 'password'} 
                    id="auth-password" 
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button 
                    type="button" 
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {!isLoginView && (
                <div className="form-group animate-slide-down">
                  <label htmlFor="auth-confirm-password">Confirm Password</label>
                  <div className="input-wrapper">
                    <Lock size={18} className="input-icon" />
                    <input 
                      type={showPassword ? 'text' : 'password'} 
                      id="auth-confirm-password" 
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required={!isLoginView}
                    />
                  </div>
                </div>
              )}

              {isLoginView && (
                <div className="forgot-password-link">
                  <a href="#forgot" onClick={(e) => { e.preventDefault(); setError('Password reset is not available in this demo.'); }}>Forgot password?</a>
                </div>
              )}

              <button 
                type="submit" 
                className={`auth-submit-btn ${loading ? 'loading' : ''}`}
                disabled={loading}
              >
                {loading ? (
                  <span className="spinner"></span>
                ) : (
                  <>
                    <span>{isLoginView ? 'Sign In' : 'Get Started'}</span>
                    <ArrowRight size={18} className="btn-arrow" />
                  </>
                )}
              </button>
            </form>

            <div className="auth-footer">
              {isLoginView ? (
                <p>
                  Don't have an account?{' '}
                  <button onClick={() => { setIsLoginView(false); setError(''); }} className="toggle-view-btn">
                    Create one here
                  </button>
                </p>
              ) : (
                <p>
                  Already have an account?{' '}
                  <button onClick={() => { setIsLoginView(true); setError(''); }} className="toggle-view-btn">
                    Sign in here
                  </button>
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AuthModal;
