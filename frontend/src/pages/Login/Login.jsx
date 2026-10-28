import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, CheckCircle2, ArrowRight, X } from 'lucide-react';
import './Login.css';

const Login = () => {
  const { user, login, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const timeoutRef = useRef(null);

  useEffect(() => {
    return () => clearTimeout(timeoutRef.current);
  }, []);

  // If already logged in (and auth is resolved), redirect to dashboard
  useEffect(() => {
    if (!authLoading && user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, authLoading, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);

    try {
      const result = await login(email, password);
      if (result.success) {
        navigate('/dashboard', { replace: true });
      } else if (result.isAdmin) {
        // Redirect admin to admin portal automatically
        setError(result.error);
        timeoutRef.current = setTimeout(() => navigate('/admin/login'), 1800);
      } else {
        setError(result.error || 'Login failed. Please check your credentials.');
        timeoutRef.current = setTimeout(() => setError(""), 2500);
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-background">
        <div className="login-grid" aria-hidden="true" />
        <div className="bg-circle bg-circle-1"></div>
        <div className="bg-circle bg-circle-2"></div>
        <div className="bg-circle bg-circle-3"></div>
      </div>

      <div className="login-card">
        <button
          className="login-close-btn"
          onClick={() => navigate("/")}
          type="button"
        >
          <X size={22} />
        </button>
        {success ? (
          <div className="auth-success-screen">
            <div className="success-icon-wrapper">
              <CheckCircle2 size={64} className="success-icon" />
            </div>
            <h3>Welcome Back!</h3>
            <p>Logging you in securely...</p>
          </div>
        ) : (
          <>
            <div className="login-header">
              <span className="auth-brand-mark">BS</span>
              <h2>Billing SaaS</h2>
              <p>Welcome back! Please enter your details.</p>
            </div>

            {error && <div className="login-error animate-slide-down">{error}</div>}

            <form onSubmit={handleSubmit} className="login-form">
              <div className="login-group">
                <label>Email Address</label>
                <div className="login-input-wrapper">
                  <Mail size={18} className="login-input-icon" />
                  <input
                    type="email"
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="login-group">
                <label>Password</label>
                <div className="login-input-wrapper">
                  <Lock size={18} className="login-input-icon" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="login-password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="login-options">
                <label className="remember-me">
                  <input type="checkbox" />
                  <span>Remember me</span>
                </label>
                <span
                  className="forgot"
                  onClick={() => navigate("/forgot-password")}
                  style={{ cursor: "pointer" }} >
                  Forgot password?
                </span>
              </div>

              <button type="submit" className="login-submit-btn" disabled={loading}>
                {loading ? <span className="spinner"></span> : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight size={18} style={{ marginLeft: '4px' }} />
                  </>
                )}
              </button>
            </form>

           <div className="login-footer">

              <p>
                  Don't have an account?
                  <Link to="/register">
                      Create account
                  </Link>
              </p>


              <div className="divider">

                  <span>OR</span>

              </div>


              <Link 
                  to="/admin/login" 
                  className="admin-link"
              >

                  Admin Portal

              </Link>


            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Login;