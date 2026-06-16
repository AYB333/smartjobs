import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User, Briefcase, ArrowRight, ArrowLeft } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import MagneticButton from '../components/MagneticButton';
import api from '../api/axios';
import { useToast } from '../context/useAppExperience';

function normalizeUser(authData) {
    if (authData?.user) {
        const role = authData.user.role;
        const profile = authData.user.profile
            ?? authData.user.candidatProfile
            ?? authData.user.candidat_profile
            ?? authData.user.recruteurProfile
            ?? authData.user.recruteur_profile
            ?? null;

        return {
            ...authData.user,
            role,
            profile,
            ...(role === 'candidat' ? { candidatProfile: profile, candidat_profile: profile } : {}),
            ...(role === 'recruteur' ? { recruteurProfile: profile, recruteur_profile: profile } : {}),
        };
    }

    if (authData?.role) {
        const profile = authData.profile ?? null;
        return {
            id: authData.user_id ?? null,
            name: authData.name ?? '',
            email: authData.email ?? '',
            role: authData.role,
            profile,
            ...(authData.role === 'candidat' ? { candidatProfile: profile, candidat_profile: profile } : {}),
            ...(authData.role === 'recruteur' ? { recruteurProfile: profile, recruteur_profile: profile } : {}),
        };
    }

    return null;
}

export default function Auth() {
    const [searchParams] = useSearchParams();
    const initialMode = searchParams.get('mode');
    const initialRole = searchParams.get('role') === 'recruteur' ? 'recruteur' : 'candidat';
    const [isLogin, setIsLogin] = useState(initialMode !== 'register');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const navigate = useNavigate();
    const { showToast, t } = useToast();

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
        role: initialRole
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const endpoint = isLogin ? '/auth/login' : '/auth/register';
            const payload = isLogin ? { email: formData.email, password: formData.password } : formData;
            
            const response = await api.post(endpoint, payload);
            const authData = response?.data ?? {};
            const token = authData.token ?? authData.access_token;
            const user = normalizeUser(authData);

            if (!token || !user) {
                throw new Error("Reponse d'authentification invalide.");
            }

            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(user));
            showToast({
                type: 'success',
                title: isLogin ? t('auth.successLogin') : t('auth.successRegister'),
                message: `Bienvenue ${user.name || ''}`.trim(),
            });

            if (user.role === 'recruteur') {
                navigate('/recruteur', { replace: true });
            } else if (user.role === 'admin') {
                navigate('/admin/dashboard', { replace: true });
            } else {
                navigate(isLogin ? '/candidat' : '/candidat/profile', { replace: true });
            }
        } catch (err) {
            const message =
                err.response?.data?.message
                || err.response?.data?.error
                || err.message
                || "Une erreur est survenue.";
            setError(message);
            showToast({
                type: 'error',
                title: t('auth.errorTitle'),
                message,
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page min-h-screen bg-obsidian flex relative overflow-hidden">
            {/* Background elements */}
            <div className="absolute top-0 right-0 -mr-[10vw] -mt-[10vw] w-[40vw] h-[40vw] rounded-full bg-accent/10 blur-[100px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 -ml-[10vw] -mb-[10vw] w-[40vw] h-[40vw] rounded-full bg-deepNavy/80 blur-[120px] pointer-events-none" />

            {/* Split Screen Container */}
            <div className="w-full flex">
                
                {/* LEFT SIDE: Form Container */}
                <div className="auth-left-panel w-full lg:w-1/2 flex flex-col justify-center px-8 sm:px-16 lg:px-24 xl:px-32 z-10 relative py-12">
                    
                    <div className="auth-back-row mb-6 w-full max-w-md mx-auto">
                    <Link to="/" className="auth-back-link inline-flex w-fit items-center gap-2 rounded-full border border-borderGlass bg-surface px-3.5 py-2 text-sm font-semibold text-white/60 transition-colors hover:border-accent/40 hover:text-white">
                        <ArrowLeft size={16} /> {t('auth.backHome')}
                    </Link>
                    </div>

                    <div className="auth-form-shell max-w-md w-full mx-auto">
                        <motion.div
                            key={isLogin ? 'login-header' : 'register-header'}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5 }}
                        >
                            <h1 className="auth-title text-4xl md:text-5xl font-black text-white mb-3">
                                {isLogin ? t('auth.loginTitle') : t('auth.registerTitle')}
                            </h1>
                            <p className="auth-subtitle text-white/50 mb-8">
                                {isLogin ? t('auth.loginSubtitle') : t('auth.registerSubtitle')}
                            </p>
                        </motion.div>

                        {error && (
                            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                                {error}
                            </motion.div>
                        )}

                        <AnimatePresence mode="wait">
                            <motion.form 
                                key={isLogin ? 'login' : 'register'}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                transition={{ duration: 0.3 }}
                                onSubmit={handleSubmit}
                                className="auth-form space-y-5"
                            >
                                {!isLogin && (
                                    <div className="space-y-5">
                                        <div>
                                            <label className="auth-label block text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">{t('auth.fullName')}</label>
                                            <div className="auth-input-shell relative group">
                                                <User className="auth-input-icon absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-accent transition-colors" size={18} />
                                                <input 
                                                    type="text" 
                                                    name="name"
                                                    required
                                                    value={formData.name}
                                                    onChange={handleChange}
                                                    className="auth-input w-full bg-surface border border-borderGlass rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-accent transition-colors"
                                                    placeholder="Jean Dupont"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <label className="auth-label block text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">Email</label>
                                    <div className="auth-input-shell relative group">
                                        <Mail className="auth-input-icon absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-accent transition-colors" size={18} />
                                        <input 
                                            type="email" 
                                            name="email"
                                            required
                                            value={formData.email}
                                            onChange={handleChange}
                                            className="auth-input w-full bg-surface border border-borderGlass rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-accent transition-colors"
                                            placeholder="jean@example.com"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="auth-label block text-xs font-semibold text-white/50 uppercase tracking-wider">{t('auth.password')}</label>
                                    </div>
                                    <div className="auth-input-shell relative group">
                                        <Lock className="auth-input-icon absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-accent transition-colors" size={18} />
                                        <input 
                                            type="password" 
                                            name="password"
                                            required
                                            value={formData.password}
                                            onChange={handleChange}
                                            className="auth-input w-full bg-surface border border-borderGlass rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-accent transition-colors"
                                            placeholder="••••••••"
                                        />
                                    </div>
                                </div>

                                {!isLogin && (
                                    <>
                                        <div>
                                            <label className="auth-label block text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">{t('auth.confirmPassword')}</label>
                                            <div className="auth-input-shell relative group">
                                                <Lock className="auth-input-icon absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-accent transition-colors" size={18} />
                                                <input 
                                                    type="password" 
                                                    name="password_confirmation"
                                                    required
                                                    value={formData.password_confirmation}
                                                    onChange={handleChange}
                                                    className="auth-input w-full bg-surface border border-borderGlass rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-accent transition-colors"
                                                    placeholder="••••••••"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="auth-label block text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">{t('auth.roleLabel')}</label>
                                            <div className="grid grid-cols-2 gap-4">
                                                <label className={`auth-role-card cursor-pointer flex flex-col items-center p-4 rounded-xl border transition-all duration-300 ${formData.role === 'candidat' ? 'auth-role-card-selected bg-accent/10 border-accent text-white' : 'bg-surface border-borderGlass text-white/50 hover:bg-white/5'}`}>
                                                    <User size={24} className={formData.role === 'candidat' ? 'text-accent mb-2' : 'mb-2'} />
                                                    <span className="font-medium text-sm">{t('auth.candidate')}</span>
                                                    <input type="radio" name="role" value="candidat" checked={formData.role === 'candidat'} onChange={handleChange} className="hidden" />
                                                </label>
                                                <label className={`auth-role-card cursor-pointer flex flex-col items-center p-4 rounded-xl border transition-all duration-300 ${formData.role === 'recruteur' ? 'auth-role-card-selected bg-accent/10 border-accent text-white' : 'bg-surface border-borderGlass text-white/50 hover:bg-white/5'}`}>
                                                    <Briefcase size={24} className={formData.role === 'recruteur' ? 'text-accent mb-2' : 'mb-2'} />
                                                    <span className="font-medium text-sm">{t('auth.recruiter')}</span>
                                                    <input type="radio" name="role" value="recruteur" checked={formData.role === 'recruteur'} onChange={handleChange} className="hidden" />
                                                </label>
                                            </div>
                                        </div>

                                        <div className="auth-after-box rounded-2xl border border-borderGlass bg-surface/80 p-4">
                                            <p className="text-xs font-semibold uppercase tracking-wider text-accent">{t('auth.afterCreation')}</p>
                                            {formData.role === 'candidat' ? (
                                                <div className="mt-3 space-y-2 text-sm text-white/65">
                                                    <p><span className="font-semibold text-white">1.</span> {t('auth.candidateStep1')}</p>
                                                    <p><span className="font-semibold text-white">2.</span> {t('auth.candidateStep2')}</p>
                                                    <p><span className="font-semibold text-white">3.</span> {t('auth.candidateStep3')}</p>
                                                </div>
                                            ) : (
                                                <div className="mt-3 space-y-2 text-sm text-white/65">
                                                    <p><span className="font-semibold text-white">1.</span> {t('auth.recruiterStep1')}</p>
                                                    <p><span className="font-semibold text-white">2.</span> {t('auth.recruiterStep2')}</p>
                                                    <p><span className="font-semibold text-white">3.</span> {t('auth.recruiterStep3')}</p>
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}

                                <MagneticButton type="submit" className="auth-submit w-full flex items-center justify-center gap-2 py-4 bg-accent hover:bg-accent/90 text-white rounded-xl font-bold shadow-[0_0_20px_rgba(232,101,26,0.3)] transition-all group mt-4">
                                    {loading ? (
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            {isLogin ? t('auth.loginCta') : t('auth.registerCta')}
                                            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                        </>
                                    )}
                                </MagneticButton>
                            </motion.form>
                        </AnimatePresence>

                        <div className="auth-switch mt-8 pt-8 border-t border-borderGlass text-center">
                            <p className="text-white/50 text-sm">
                                {isLogin ? `${t('auth.noAccount')} ` : `${t('auth.hasAccount')} `}
                                <button 
                                    type="button"
                                    onClick={() => {
                                        setIsLogin(!isLogin);
                                        setError(null);
                                    }}
                                    className="text-white font-medium hover:text-accent transition-colors"
                                >
                                    {isLogin ? t('auth.createAccount') : t('auth.loginCta')}
                                </button>
                            </p>
                        </div>
                    </div>
                </div>

                {/* RIGHT SIDE: Visual/Image Panel */}
                <div className="force-dark hidden lg:flex w-1/2 relative bg-[#071120] items-center justify-center overflow-hidden">
                    <motion.div 
                        initial={{ scale: 1.1, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                        className="pointer-events-none absolute inset-0"
                    >
                        <img 
                            src="https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=1400&q=80" 
                            alt="Luxury Resto" 
                            className="w-full h-full object-cover opacity-40 mix-blend-luminosity"
                        />
                        <div className="pointer-events-none absolute inset-0 bg-gradient-to-l from-transparent to-[rgba(7,17,32,0.96)]" />
                    </motion.div>
                    
                    <div className="relative z-10 w-full max-w-lg p-12 text-center">
                        <div className="w-16 h-16 rounded-2xl bg-surface backdrop-blur-xl border border-borderGlass mx-auto flex items-center justify-center mb-8 shadow-2xl">
                            <Briefcase className="text-accent" size={32} />
                        </div>
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={isLogin ? 'quote-login' : 'quote-reg'}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ duration: 0.5 }}
                            >
                                <h3 className="text-3xl font-bold leading-tight mb-6">
                                    {isLogin 
                                        ? t('auth.welcomeLogin')
                                        : t('auth.welcomeRegister')}
                                </h3>
                            </motion.div>
                        </AnimatePresence>
                        
                        <div className="flex justify-center gap-2 mt-8">
                            <div className={`h-1.5 rounded-full transition-all duration-500 ${isLogin ? 'w-8 bg-accent' : 'w-2 bg-white/20'}`} />
                            <div className={`h-1.5 rounded-full transition-all duration-500 ${!isLogin ? 'w-8 bg-accent' : 'w-2 bg-white/20'}`} />
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
