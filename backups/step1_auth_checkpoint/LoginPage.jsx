import React, { useState } from 'react';
import {
  Shield,
  Lock,
  User,
  Key,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Eye,
  EyeOff,
  Mail,
  Smartphone,
  RefreshCw,
} from 'lucide-react';
import { apiService } from '../../services/apiService';

export const LoginPage = ({ onLoginSuccess }) => {
  // Authentication Method: 'PASSWORD' or 'GMAIL_OTP'
  const [authMethod, setAuthMethod] = useState('PASSWORD');

  // Role Tab: 'ADMIN', 'PATROL_OFFICER', 'VIEWER'
  const [selectedRoleTab, setSelectedRoleTab] = useState('ADMIN');

  // Password Login State
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Gmail OTP Login State
  const [gmailAddress, setGmailAddress] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [otpMessage, setOtpMessage] = useState('');

  // Status & Error
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleRoleTabChange = (role) => {
    setSelectedRoleTab(role);
    setError('');
    setPassword('');
    if (role === 'ADMIN') {
      setUsername('admin');
    } else if (role === 'PATROL_OFFICER') {
      setUsername('officer');
    } else {
      setUsername('viewer');
    }
  };

  // 1. Password Login Handler
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!password) {
      setError('Please enter your security access password.');
      return;
    }
    setError('');
    setIsLoading(true);

    try {
      const res = await apiService.login(username, password);
      if (res.status === 'SUCCESS' && res.user) {
        onLoginSuccess(res.user, res.token);
      } else {
        setError('Login failed. Please verify credentials.');
      }
    } catch (err) {
      setError(err.message || 'Authentication error.');
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Send OTP to Gmail Handler
  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!gmailAddress.trim() || !gmailAddress.includes('@')) {
      setError('Please enter a valid personal Gmail address.');
      return;
    }

    setError('');
    setOtpMessage('');
    setIsLoading(true);

    try {
      const uname = selectedRoleTab === 'ADMIN' ? 'admin' : selectedRoleTab === 'PATROL_OFFICER' ? 'officer' : 'viewer';
      const res = await apiService.sendOtp(gmailAddress.trim(), selectedRoleTab, uname);
      setIsOtpSent(true);
      setOtpMessage(res.message || `OTP dispatched to ${gmailAddress}`);
    } catch (err) {
      setError(err.message || 'Failed to send OTP to Gmail.');
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Verify OTP Handler
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (otpCode.trim().length !== 6) {
      setError('Please enter the 6-digit numeric OTP code.');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      const uname = selectedRoleTab === 'ADMIN' ? 'admin' : selectedRoleTab === 'PATROL_OFFICER' ? 'officer' : 'viewer';
      const res = await apiService.verifyOtp(gmailAddress.trim(), otpCode.trim(), selectedRoleTab, uname);
      if (res.status === 'SUCCESS' && res.user) {
        onLoginSuccess(res.user, res.token);
      } else {
        setError('Verification failed. Please check the code.');
      }
    } catch (err) {
      setError(err.message || 'Invalid or expired OTP.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectEvaluationRole = async (targetRole, uname, defaultPwd) => {
    setSelectedRoleTab(targetRole);
    setUsername(uname);
    setPassword(defaultPwd);
    setError('');
    setIsLoading(true);
    try {
      const res = await apiService.login(uname, defaultPwd);
      if (res.status === 'SUCCESS' && res.user) {
        onLoginSuccess(res.user, res.token);
      }
    } catch (err) {
      setError(err.message || 'Evaluation login failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen w-full flex flex-col justify-center items-center p-4 relative overflow-hidden select-none bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: `linear-gradient(rgba(6, 10, 20, 0.78), rgba(6, 10, 20, 0.88)), url('/lpu_campus_bg.jpg')`,
      }}
    >
      {/* Background Soft Glow Accents */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-blue-600/15 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md z-10 animate-in fade-in zoom-in-95 duration-300">
        {/* LPU Branding Header */}
        <div className="text-center mb-5">
          <div className="inline-flex p-3 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 shadow-2xl shadow-blue-500/30 mb-2.5 ring-4 ring-blue-500/20 backdrop-blur-md">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-xl font-extrabold tracking-tight text-white flex items-center justify-center gap-2 drop-shadow-md">
            <span>CAMPUS SECURITY AI</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/30 text-blue-300 border border-blue-400/40">
              LPU
            </span>
          </h1>
          <p className="text-xs text-slate-300 font-medium drop-shadow mt-1">
            Lovely Professional University • Block 1 Security Command
          </p>
        </div>

        {/* Main Card with Frosted Glassmorphism */}
        <div className="bg-slate-900/85 border border-slate-700/80 rounded-3xl p-6 shadow-2xl backdrop-blur-xl relative">
          {/* Auth Method Switcher: Password vs Gmail OTP */}
          <div className="flex border-b border-slate-800 pb-3 mb-4 gap-2">
            <button
              type="button"
              onClick={() => {
                setAuthMethod('PASSWORD');
                setError('');
              }}
              className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                authMethod === 'PASSWORD'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'bg-slate-800/60 text-slate-400 hover:text-white'
              }`}
            >
              <Key className="w-3.5 h-3.5" />
              <span>Password Login</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setAuthMethod('GMAIL_OTP');
                setError('');
              }}
              className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                authMethod === 'GMAIL_OTP'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'bg-slate-800/60 text-slate-400 hover:text-white'
              }`}
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Gmail OTP 2FA</span>
            </button>
          </div>

          {/* Role Selection Tabs */}
          <div className="grid grid-cols-3 gap-1 bg-slate-950/70 p-1 rounded-xl border border-slate-800/80 mb-4 text-xs font-semibold">
            <button
              type="button"
              onClick={() => handleRoleTabChange('ADMIN')}
              className={`py-1.5 rounded-lg transition flex flex-col items-center gap-0.5 ${
                selectedRoleTab === 'ADMIN'
                  ? 'bg-blue-600/90 text-white shadow-md shadow-blue-600/30 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>Admin (CSO)</span>
              <span className="text-[9px] font-mono opacity-80">Full Authority</span>
            </button>

            <button
              type="button"
              onClick={() => handleRoleTabChange('PATROL_OFFICER')}
              className={`py-1.5 rounded-lg transition flex flex-col items-center gap-0.5 ${
                selectedRoleTab === 'PATROL_OFFICER'
                  ? 'bg-indigo-600/90 text-white shadow-md shadow-indigo-600/30 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>Patrol Officer</span>
              <span className="text-[9px] font-mono opacity-80">Field Guard</span>
            </button>

            <button
              type="button"
              onClick={() => handleRoleTabChange('VIEWER')}
              className={`py-1.5 rounded-lg transition flex flex-col items-center gap-0.5 ${
                selectedRoleTab === 'VIEWER'
                  ? 'bg-slate-700 text-white shadow-md font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>Campus User</span>
              <span className="text-[9px] font-mono opacity-80">Observer</span>
            </button>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mb-4 p-2.5 bg-red-950/70 border border-red-700/70 rounded-xl text-red-200 text-xs flex items-center gap-2 animate-in fade-in">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Success / OTP Dispatched Banner */}
          {otpMessage && (
            <div className="mb-4 p-2.5 bg-emerald-950/70 border border-emerald-700/70 rounded-xl text-emerald-200 text-xs flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{otpMessage}</span>
            </div>
          )}

          {/* MODE 1: GMAIL OTP AUTHENTICATION */}
          {authMethod === 'GMAIL_OTP' && (
            <div>
              {!isOtpSent ? (
                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 mb-1.5 block">
                      Your Personal Gmail Address
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Mail className="w-4 h-4" />
                      </div>
                      <input
                        type="email"
                        value={gmailAddress}
                        onChange={(e) => setGmailAddress(e.target.value)}
                        placeholder="e.g. yourname@gmail.com"
                        className="w-full pl-9 pr-3 py-2.5 bg-slate-950/90 border border-slate-700/80 focus:border-blue-500 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none transition"
                        required
                      />
                    </div>
                    <span className="text-[10px] text-slate-400 block mt-1">
                      A single-use 6-digit OTP will be dispatched to your Gmail address.
                    </span>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-blue-600/30 transition flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <span>{isLoading ? 'Dispatching OTP...' : 'Send OTP to Gmail'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-4 animate-in fade-in">
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="text-xs font-semibold text-slate-300">
                        Enter 6-Digit Verification Code
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setIsOtpSent(false);
                          setOtpCode('');
                          setOtpMessage('');
                        }}
                        className="text-[10px] text-blue-400 hover:underline"
                      >
                        Change Gmail
                      </button>
                    </div>

                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Smartphone className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        maxLength="6"
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                        placeholder="••••••"
                        className="w-full pl-9 pr-3 py-2.5 bg-slate-950/90 border border-slate-700/80 focus:border-blue-500 rounded-xl text-lg text-white font-mono tracking-[8px] text-center placeholder-slate-600 focus:outline-none transition"
                        autoFocus
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || otpCode.length !== 6}
                    className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-emerald-600/30 transition flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <span>{isLoading ? 'Verifying...' : 'Verify OTP & Log In'}</span>
                    <CheckCircle2 className="w-4 h-4" />
                  </button>

                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={isLoading}
                      className="text-[11px] text-slate-400 hover:text-white flex items-center justify-center gap-1 mx-auto"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Resend OTP Code</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* MODE 2: TRADITIONAL PASSWORD AUTHENTICATION */}
          {authMethod === 'PASSWORD' && (
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 mb-1.5 block">Username / Badge ID</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter username"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-950/90 border border-slate-700/80 focus:border-blue-500 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none transition"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 mb-1.5 block">Access Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter security access password"
                    className="w-full pl-9 pr-10 py-2.5 bg-slate-950/90 border border-slate-700/80 focus:border-blue-500 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none transition font-mono"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-blue-600/30 transition flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
              >
                <span>{isLoading ? 'Authenticating...' : 'Sign In with Password'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* Quick Demo Access for Evaluation & Course Presentation */}
          <div className="mt-5 pt-3.5 border-t border-slate-800/80">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-2 text-center">
              Quick Role Switch for Course Evaluation
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleSelectEvaluationRole('ADMIN', 'admin', 'lpu@security2026')}
                className="py-1.5 px-2 bg-slate-800/70 hover:bg-slate-800 border border-slate-700/70 rounded-lg text-left transition group"
              >
                <div className="text-[11px] font-bold text-blue-400 group-hover:text-blue-300">🛡️ Admin (CSO)</div>
                <div className="text-[9px] text-slate-400">Full Access</div>
              </button>

              <button
                type="button"
                onClick={() => handleSelectEvaluationRole('PATROL_OFFICER', 'officer', 'patrol@lpu')}
                className="py-1.5 px-2 bg-slate-800/70 hover:bg-slate-800 border border-slate-700/70 rounded-lg text-left transition group"
              >
                <div className="text-[11px] font-bold text-indigo-400 group-hover:text-indigo-300">👮 Officer</div>
                <div className="text-[9px] text-slate-400">Patrol Guard</div>
              </button>

              <button
                type="button"
                onClick={() => handleSelectEvaluationRole('VIEWER', 'viewer', 'lpu@guest')}
                className="py-1.5 px-2 bg-slate-800/70 hover:bg-slate-800 border border-slate-700/70 rounded-lg text-left transition group"
              >
                <div className="text-[11px] font-bold text-slate-300 group-hover:text-white">👁️ Viewer</div>
                <div className="text-[9px] text-slate-400">Read-Only</div>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 text-center text-[11px] text-slate-400 font-medium drop-shadow">
          Lovely Professional University • AI Foundation Course Project
        </div>
      </div>
    </div>
  );
};
