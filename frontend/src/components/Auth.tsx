import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/Supabase';
import './Auth.css';


type AuthMode = 'login' | 'signup' | 'verify' | 'forgot';

interface AuthProps {
  onSuccess: () => void;
}

export default function Auth({ onSuccess }: AuthProps) {
  const [mode, setMode]           = useState<AuthMode>('login');
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [fullName, setFullName]   = useState('');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [success, setSuccess]     = useState('');
  const [showPass, setShowPass]   = useState(false);
  const [mounted, setMounted]     = useState(false);
 
  
  // Code de vérification OTP (6 chiffres)
  const [otpCode, setOtpCode]     = useState(['', '', '', '', '', '']);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 80);
    return () => clearTimeout(t);
  }, []);

  const clearMessages = () => { setError(''); setSuccess(''); };

  // ── OTP input handler ──────────────────────────────────────
  const handleOtpChange = (index: number, value: string) => {
    const cleaned = value.replace(/\D/g, '').slice(-1);
    const next = [...otpCode];
    next[index] = cleaned;
    setOtpCode(next);
    if (cleaned && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otpCode[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowLeft' && index > 0) otpRefs.current[index - 1]?.focus();
    if (e.key === 'ArrowRight' && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setOtpCode(pasted.split(''));
      otpRefs.current[5]?.focus();
    }
    e.preventDefault();
  };

  // ── SIGNUP OTP ──────────────────────────────────────────────
const handleSignup = async () => {
  clearMessages();

  if (!fullName.trim()) {
    setError('Veuillez entrer votre nom complet.');
    return;
  }

  if (!email.includes('@')) {
    setError('Adresse email invalide.');
    return;
  }

  if (password.length < 8) {
    setError('Le mot de passe doit contenir au moins 8 caractères.');
    return;
  }

  setLoading(true);

  try {

    // Envoie OTP par email
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) throw error;

    setSuccess(`Code OTP envoyé à ${email}`);
    setMode('verify');

  } catch (err: unknown) {

    const msg = err instanceof Error ? err.message : String(err);

    if (msg.includes('already registered')) {
      setError('Cet email est déjà utilisé.');
    } else {
      setError(msg || 'Erreur lors de l’inscription.');
    }

  } finally {
    setLoading(false);
  }
};


// ── VERIFY OTP ──────────────────────────────────────────────
const handleVerify = async () => {

  clearMessages();

  const code = otpCode.join('');

  if (code.length < 6) {
    setError('Entrez le code à 6 chiffres.');
    return;
  }

  setLoading(true);

  try {

    // Vérification OTP
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: 'email',
    });

    if (error) throw error;

    // Ajout mot de passe après validation OTP
    await supabase.auth.updateUser({
      password,
    });

    // Création profil utilisateur
    if (data.user) {

      await supabase.from('profiles').upsert({
        id: data.user.id,
        email,
        full_name: fullName,
        created_at: new Date().toISOString(),
      });

    }

    setSuccess('Compte vérifié avec succès !');

    setTimeout(() => {
      onSuccess();
    }, 1200);

  } catch (err: unknown) {

    const msg = err instanceof Error ? err.message : String(err);

    if (msg.includes('expired')) {
      setError('Code expiré.');
    } else if (msg.includes('invalid')) {
      setError('Code incorrect.');
    } else {
      setError(msg || 'Erreur de vérification.');
    }

  } finally {
    setLoading(false);
  }
};


// ── RESEND OTP ──────────────────────────────────────────────
const handleResend = async () => {

  clearMessages();

  setLoading(true);

  try {

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
    });

    if (error) throw error;

    setSuccess('Nouveau code envoyé !');

    setOtpCode(['', '', '', '', '', '']);

    otpRefs.current[0]?.focus();

  } catch (err: unknown) {

    setError('Impossible de renvoyer le code.');

  } finally {

    setLoading(false);

  }
};
  // ── LOGIN ──────────────────────────────────────────────────
  const handleLogin = async () => {
    clearMessages();
    if (!email.includes('@')) { setError('Adresse email invalide.'); return; }
    if (!password) { setError('Mot de passe requis.'); return; }

    setLoading(true);
    try {
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (loginError) throw loginError;

      setSuccess('Connexion réussie !');
      setTimeout(() => onSuccess(), 800);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('Invalid login')) {
        setError('Email ou mot de passe incorrect.');
      } else if (msg.includes('Email not confirmed')) {
        setError('Email non confirmé. Vérifiez votre boîte mail.');
        setMode('verify');
      } else {
        setError(msg || 'Erreur de connexion.');
      }
    } finally {
      setLoading(false);
      
    }
  };

  // ── FORGOT PASSWORD ────────────────────────────────────────
  const handleForgot = async () => {
    clearMessages();
    if (!email.includes('@')) { setError('Entrez votre adresse email.'); return; }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setSuccess('Lien de réinitialisation envoyé à votre email.');
    } catch (err: unknown) {
      setError('Impossible d\'envoyer le lien.');
    } finally {
      setLoading(false);
    }
  };

  // ── Submit par touche Entrée ───────────────────────────────
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'Enter') return;
    if (mode === 'login')  handleLogin();
    if (mode === 'signup') handleSignup();
    if (mode === 'forgot') handleForgot();
  };

  const switchMode = (m: AuthMode) => {
    clearMessages();
    setOtpCode(['', '', '', '', '', '']);
    setMode(m);
  };

  return (
    <div className={`auth-page ${mounted ? 'mounted' : ''}`}>

      {/* Fond */}
      <div className="auth-bg">

        <div className="auth-glow g1" />
        <div className="auth-glow g2" />
        <div className="auth-glow g3" />
      </div>

      {/* Carte */}
      <div className="auth-card">
      <div className="auth-page">
      <div className="auth-top">

{/* Logo gauche */}
<div className="auth-logo">
  <span className="auth-logo-hex">⬡</span>
  <span className="auth-logo-text">VulnéraScope</span>
</div>

{/* Tabs droite */}
{(mode === 'login' || mode === 'signup') && (
  <div className="auth-tabs">
    <button
      className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
      onClick={() => switchMode('login')}
    >
      Connexion
    </button>

    <button
      className={`auth-tab ${mode === 'signup' ? 'active' : ''}`}
      onClick={() => switchMode('signup')}
    >
      Inscription
    </button>

    <div
      className={`auth-tab-slider ${
        mode === 'signup' ? 'right' : 'left'
      }`}
    />
  </div>
)}
</div>
<div className="auth-content">
        {/* ── Titre contextuel ── */}
        <div className="auth-heading">
          {mode === 'login'  && <><h2>Bon retour</h2><p>Connectez-vous à votre espace</p></>}
          {mode === 'signup' && <><h2>Créer un compte</h2><p>Rejoignez VulnéraScope gratuitement</p></>}
          {mode === 'verify' && (
            <>
              <div className="verify-icon">✉</div>
              <h2>Vérifiez votre email</h2>
              <p>Code envoyé à <strong>{email}</strong></p>
            </>
          )}
          {mode === 'forgot' && <><h2>Mot de passe oublié</h2><p>On vous envoie un lien de réinitialisation</p></>}
        </div>

        {/* ── Formulaire ── */}
        <div className="auth-form" onKeyDown={handleKeyDown}>

          {/* Nom (signup) */}
          {mode === 'signup' && (
            <div className="auth-field">
              <label>Nom complet</label>
              <div className="auth-input-wrap">
                <span className="auth-input-icon">◎</span>
                <input
                  type="text"
                  placeholder="Jean Dupont"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  autoFocus
                />
              </div>
            </div>
          )}

          {/* Email */}
          {mode !== 'verify' && (
            <div className="auth-field">
              <label>Email</label>
              <div className="auth-input-wrap">
                <span className="auth-input-icon">◈</span>
                <input
                  type="email"
                  placeholder="vous@exemple.fr"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoFocus={mode === 'login' || mode === 'forgot'}
                />
              </div>
            </div>
          )}

          {/* Mot de passe */}
          {(mode === 'login' || mode === 'signup') && (
            <div className="auth-field">
              <div className="auth-field-row">
                <label>Mot de passe</label>
                {mode === 'login' && (
                  <button className="auth-link-sm" onClick={() => switchMode('forgot')}>
                    Oublié ?
                  </button>
                )}
              </div>
              <div className="auth-input-wrap">
                <span className="auth-input-icon">◉</span>
                <input
                  type={showPass ? 'text' : 'password'}
                  placeholder={mode === 'signup' ? 'Min. 8 caractères' : '••••••••'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
                <button
                  className="auth-eye"
                  onClick={() => setShowPass(p => !p)}
                  tabIndex={-1}
                  type="button"
                >
                  {showPass ? '○' : '●'}
                </button>
              </div>
              {/* Force du mot de passe */}
              {mode === 'signup' && password.length > 0 && (
                <div className="pass-strength">
                  <div className={`ps-bar ${password.length >= 8 ? 'ok' : 'weak'}`} />
                  <div className={`ps-bar ${password.length >= 10 && /[A-Z]/.test(password) ? 'ok' : password.length >= 8 ? 'mid' : 'weak'}`} />
                  <div className={`ps-bar ${password.length >= 12 && /[A-Z]/.test(password) && /[0-9]/.test(password) ? 'ok' : 'weak'}`} />
                  <span className="ps-label">
                    {password.length < 8 ? 'Trop court' : password.length < 10 ? 'Acceptable' : 'Fort'}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* ── Code OTP ── */}
          {mode === 'verify' && (
            <div className="otp-section">
              <p className="otp-label">Code à 6 chiffres</p>
              <div className="otp-inputs" onPaste={handleOtpPaste}>
                {otpCode.map((digit, i) => (
                  <input
                    key={i}
                    ref={el => { otpRefs.current[i] = el; }}
                    className={`otp-input ${digit ? 'filled' : ''}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={e => handleOtpChange(i, e.target.value)}
                    onKeyDown={e => handleOtpKeyDown(i, e)}
                    autoFocus={i === 0}
                  />
                ))}
              </div>
              <p className="otp-hint">Vérifiez vos spams si vous ne voyez pas l'email</p>
            </div>
          )}

          {/* Messages */}
          {error   && <div className="auth-error"><span>⚠</span>{error}</div>}
          {success && <div className="auth-success"><span>✓</span>{success}</div>}

          {/* ── Bouton principal ── */}
          {mode === 'login' && (
            <button className="auth-btn" onClick={handleLogin} disabled={loading}>
              {loading ? <span className="auth-spinner" /> : 'Se connecter →'}
            </button>
          )}
          {mode === 'signup' && (
            <button className="auth-btn" onClick={handleSignup} disabled={loading}>
              {loading ? <span className="auth-spinner" /> : 'Créer mon compte →'}
            </button>
          )}
          {mode === 'verify' && (
            <>
              <button
                className="auth-btn"
                onClick={handleVerify}
                disabled={loading || otpCode.join('').length < 6}
              >
                {loading ? <span className="auth-spinner" /> : 'Vérifier le code →'}
              </button>
              <button className="auth-link-center" onClick={handleResend} disabled={loading}>
                Renvoyer le code
              </button>
            </>
          )}
          {mode === 'forgot' && (
            <>
              <button className="auth-btn" onClick={handleForgot} disabled={loading}>
                {loading ? <span className="auth-spinner" /> : 'Envoyer le lien →'}
              </button>
              <button className="auth-link-center" onClick={() => switchMode('login')}>
                ← Retour à la connexion
              </button>
            </>
          )}
        </div>

        {/* Séparateur */}
        {(mode === 'login' || mode === 'signup') && (
          <div className="auth-sep">
            <span />
            <p>ou</p>
            <span />
          </div>
        )}

        {/* Switch mode */}
        {mode === 'login' && (
          <p className="auth-switch">
            Pas encore de compte ?{' '}
            <button onClick={() => switchMode('signup')}>Créer un compte</button>
          </p>
        )}
        {mode === 'signup' && (
          <p className="auth-switch">
            Déjà inscrit ?{' '}
            <button onClick={() => switchMode('login')}>Se connecter</button>
          </p>
        )}

        {/* Footer */}
        <p className="auth-footer-note">
          Vos données sont stockées en sécurité. Nous respectons votre vie privée.
        </p>
        </div>
      </div>
    </div>
    </div>
  );
}