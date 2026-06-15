import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import AppExperienceContext from './AppExperienceContext';

const languages = {
    fr: {
        code: 'fr',
        dir: 'ltr',
        label: 'FR',
        name: 'Francais',
        messages: {
            'nav.jobs': 'Voir les offres',
            'nav.dashboard': 'Dashboard',
            'nav.myOffers': 'Mes offres',
            'nav.profile': 'Mon profil',
            'nav.login': 'Connexion',
            'nav.signup': 'Inscription',
            'nav.recruiterSpace': 'Espace recruteur',
            'nav.logout': 'Deconnexion',
            'nav.createOffer': 'Creer une offre',
            'nav.applications': 'Mes candidatures',
            'nav.admin': 'Gestion admin',
            'nav.menu': 'Ouvrir le menu',
            'toolbar.theme.light': 'Mode clair',
            'toolbar.theme.dark': 'Mode sombre',
            'toolbar.language': 'Langue',
            'toolbar.command': 'Actions rapides',
            'command.title': 'Actions rapides',
            'command.subtitle': 'Accedez aux ecrans importants sans chercher.',
            'command.search': 'Rechercher une action...',
            'command.empty': 'Aucune action trouvee.',
            'command.hint': 'Ctrl K',
            'command.home': 'Accueil',
            'command.jobs': 'Explorer les offres',
            'command.candidatDashboard': 'Dashboard candidat',
            'command.profile': 'Profil candidat',
            'command.recruteurDashboard': 'Dashboard recruteur',
            'command.createOffer': 'Creer une offre',
            'command.recruteurApplications': 'Candidatures recruteur',
            'command.admin': 'Dashboard admin',
            'toast.saved': 'Action effectuee avec succes.',
            'onboarding.title': 'Prochaines actions',
            'onboarding.subtitle': 'Checklist pour avancer sans friction.',
            'onboarding.completed': 'Complet',
            'onboarding.candidat.profile': 'Completer le profil',
            'onboarding.candidat.cv': 'Ajouter le CV',
            'onboarding.candidat.apply': 'Postuler a une offre',
            'onboarding.recruteur.profile': 'Verifier l etablissement',
            'onboarding.recruteur.offer': 'Publier une offre',
            'onboarding.recruteur.quiz': 'Ajouter un quiz',
            'matching.label': 'Match',
            'matching.strong': 'Tres compatible',
            'matching.good': 'Compatible',
            'matching.low': 'A verifier',
            'home.hero.title': 'Trouvez un emploi dans l’hôtellerie et la restauration',
            'home.hero.subtitle': 'SmartJobs connecte les candidats et les recruteurs du secteur CHR grâce aux offres ciblées, aux profils CV et aux quiz métier.',
            'home.hero.cta.jobs': 'Trouver une offre',
            'home.hero.cta.recruiter': 'Publier une offre',
            'home.search.keyword': 'Métier, établissement, mot-clé',
            'home.search.location': 'Ville ou région',
            'home.search.cta': 'Rechercher',
            'home.discover': 'Decouvrir',
            'home.stats.offers': 'Offres ciblées CHR',
            'home.stats.establishments': 'Profils CV centralisés',
            'home.stats.candidates': 'Quiz métier intégrés',
            'home.featured.live': 'Marche CHR en direct',
            'home.featured.title': 'Offres a la une',
            'home.featured.subtitle': "Selection d'opportunites actives, recentes et pretes a recevoir des candidatures.",
            'home.featured.explore': 'Voir toutes les offres',
            'home.featured.opportunities': 'Opportunites',
            'home.featured.cities': 'Villes',
            'home.featured.averageSalary': 'Salaire moyen',
        },
    },
    en: {
        code: 'en',
        dir: 'ltr',
        label: 'EN',
        name: 'English',
        messages: {
            'nav.jobs': 'Browse jobs',
            'nav.dashboard': 'Dashboard',
            'nav.myOffers': 'My jobs',
            'nav.profile': 'My profile',
            'nav.login': 'Sign in',
            'nav.signup': 'Sign up',
            'nav.recruiterSpace': 'Recruiter area',
            'nav.logout': 'Sign out',
            'nav.createOffer': 'Create job',
            'nav.applications': 'My applications',
            'nav.admin': 'Admin console',
            'nav.menu': 'Open menu',
            'toolbar.theme.light': 'Light mode',
            'toolbar.theme.dark': 'Dark mode',
            'toolbar.language': 'Language',
            'toolbar.command': 'Quick actions',
            'command.title': 'Quick actions',
            'command.subtitle': 'Jump to key screens without searching.',
            'command.search': 'Search an action...',
            'command.empty': 'No action found.',
            'command.hint': 'Ctrl K',
            'command.home': 'Home',
            'command.jobs': 'Explore jobs',
            'command.candidatDashboard': 'Candidate dashboard',
            'command.profile': 'Candidate profile',
            'command.recruteurDashboard': 'Recruiter dashboard',
            'command.createOffer': 'Create job',
            'command.recruteurApplications': 'Recruiter applications',
            'command.admin': 'Admin dashboard',
            'toast.saved': 'Action completed successfully.',
            'onboarding.title': 'Next actions',
            'onboarding.subtitle': 'Checklist to move forward smoothly.',
            'onboarding.completed': 'Complete',
            'onboarding.candidat.profile': 'Complete your profile',
            'onboarding.candidat.cv': 'Add your CV',
            'onboarding.candidat.apply': 'Apply to a job',
            'onboarding.recruteur.profile': 'Check your establishment',
            'onboarding.recruteur.offer': 'Publish a job',
            'onboarding.recruteur.quiz': 'Add a quiz',
            'matching.label': 'Match',
            'matching.strong': 'Strong fit',
            'matching.good': 'Good fit',
            'matching.low': 'Review fit',
            'home.hero.title': 'Find a job in hospitality and food service',
            'home.hero.subtitle': 'SmartJobs connects candidates and CHR recruiters through targeted jobs, CV profiles, and role-based quizzes.',
            'home.hero.cta.jobs': 'Find a job',
            'home.hero.cta.recruiter': 'Post a job',
            'home.search.keyword': 'Role, establishment, keyword',
            'home.search.location': 'City or region',
            'home.search.cta': 'Search',
            'home.discover': 'Discover',
            'home.stats.offers': 'Targeted CHR jobs',
            'home.stats.establishments': 'Centralized CV profiles',
            'home.stats.candidates': 'Role-based quizzes',
            'home.featured.live': 'Live hospitality market',
            'home.featured.title': 'Featured jobs',
            'home.featured.subtitle': 'Active, recent opportunities ready to receive applications.',
            'home.featured.explore': 'Explore all',
            'home.featured.opportunities': 'Opportunities',
            'home.featured.cities': 'Cities',
            'home.featured.averageSalary': 'Average salary',
        },
    },
    ar: {
        code: 'ar',
        dir: 'rtl',
        label: 'AR',
        name: 'العربية',
        messages: {
            'nav.jobs': 'تصفح العروض',
            'nav.dashboard': 'لوحة التحكم',
            'nav.myOffers': 'عروضي',
            'nav.profile': 'ملفي',
            'nav.login': 'تسجيل الدخول',
            'nav.signup': 'إنشاء حساب',
            'nav.recruiterSpace': 'فضاء المشغل',
            'nav.logout': 'تسجيل الخروج',
            'nav.createOffer': 'إنشاء عرض',
            'nav.applications': 'ترشيحاتي',
            'nav.admin': 'إدارة المنصة',
            'nav.menu': 'فتح القائمة',
            'toolbar.theme.light': 'الوضع الفاتح',
            'toolbar.theme.dark': 'الوضع الداكن',
            'toolbar.language': 'اللغة',
            'toolbar.command': 'إجراءات سريعة',
            'command.title': 'إجراءات سريعة',
            'command.subtitle': 'انتقل إلى الشاشات المهمة بسرعة.',
            'command.search': 'ابحث عن إجراء...',
            'command.empty': 'لا توجد نتيجة.',
            'command.hint': 'Ctrl K',
            'command.home': 'الرئيسية',
            'command.jobs': 'استكشاف العروض',
            'command.candidatDashboard': 'لوحة المرشح',
            'command.profile': 'ملف المرشح',
            'command.recruteurDashboard': 'لوحة المشغل',
            'command.createOffer': 'إنشاء عرض',
            'command.recruteurApplications': 'ترشيحات العروض',
            'command.admin': 'لوحة الإدارة',
            'toast.saved': 'تم تنفيذ العملية بنجاح.',
            'onboarding.title': 'الخطوات التالية',
            'onboarding.subtitle': 'قائمة مختصرة للتقدم بسهولة.',
            'onboarding.completed': 'مكتمل',
            'onboarding.candidat.profile': 'أكمل الملف الشخصي',
            'onboarding.candidat.cv': 'أضف السيرة الذاتية',
            'onboarding.candidat.apply': 'ترشح لعرض عمل',
            'onboarding.recruteur.profile': 'راجع بيانات المؤسسة',
            'onboarding.recruteur.offer': 'انشر عرض عمل',
            'onboarding.recruteur.quiz': 'أضف اختبارا',
            'matching.label': 'تطابق',
            'matching.strong': 'مناسب جدا',
            'matching.good': 'مناسب',
            'matching.low': 'يحتاج مراجعة',
            'home.hero.title': 'اعثر على مكانك في قطاع الفنادق والمطاعم',
            'home.hero.subtitle': 'المؤسسات المميزة تحتاج إلى مواهب مميزة.',
            'home.hero.cta.jobs': 'البحث عن عرض',
            'home.hero.cta.recruiter': 'نشر عرض',
            'home.search.keyword': 'منصب، مؤسسة، كلمة مفتاحية...',
            'home.search.location': 'مدينة أو جهة',
            'home.search.cta': 'بحث',
            'home.discover': 'اكتشف',
            'home.stats.offers': 'عروض نشطة',
            'home.stats.establishments': 'مؤسسات',
            'home.stats.candidates': 'مرشحون',
            'home.featured.live': 'سوق العمل مباشر',
            'home.featured.title': 'عروض مميزة',
            'home.featured.subtitle': 'فرص نشطة وحديثة جاهزة لاستقبال الترشيحات.',
            'home.featured.explore': 'استكشف الكل',
            'home.featured.opportunities': 'فرص',
            'home.featured.cities': 'مدن',
            'home.featured.averageSalary': 'متوسط الأجر',
        },
    },
};

function getInitialValue(key, fallback, allowedValues) {
    if (typeof window === 'undefined') {
        return fallback;
    }

    const stored = window.localStorage.getItem(key);
    return allowedValues.includes(stored) ? stored : fallback;
}

function ToastIcon({ type }) {
    if (type === 'success') return <CheckCircle2 size={18} className="text-emerald-300" />;
    if (type === 'error') return <AlertTriangle size={18} className="text-rose-300" />;
    return <Info size={18} className="text-sky-300" />;
}

function ToastViewport({ toasts, dismissToast }) {
    return (
        <div className="pointer-events-none fixed bottom-5 right-5 z-[90] flex w-[min(380px,calc(100vw-32px))] flex-col gap-3">
            <AnimatePresence initial={false}>
                {toasts.map((toast) => (
                    <motion.div
                        key={toast.id}
                        initial={{ opacity: 0, y: 18, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 12, scale: 0.96 }}
                        className="pointer-events-auto rounded-2xl border border-borderGlass bg-deepNavy/95 p-4 text-white shadow-[0_20px_70px_rgba(0,0,0,0.35)] backdrop-blur-xl"
                    >
                        <div className="flex items-start gap-3">
                            <ToastIcon type={toast.type} />
                            <div className="min-w-0 flex-1">
                                {toast.title && <p className="font-semibold text-white">{toast.title}</p>}
                                {toast.message && <p className="mt-0.5 text-sm text-white/65">{toast.message}</p>}
                            </div>
                            <button
                                type="button"
                                onClick={() => dismissToast(toast.id)}
                                className="rounded-full p-1 text-white/45 transition-colors hover:bg-white/10 hover:text-white"
                                aria-label="Fermer"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
}

export function AppExperienceProvider({ children }) {
    const [theme, setTheme] = useState(() => getInitialValue('smartjobs-theme', 'dark', ['dark', 'light']));
    const [language, setLanguage] = useState(() => getInitialValue('smartjobs-language', 'fr', Object.keys(languages)));
    const [toasts, setToasts] = useState([]);

    useEffect(() => {
        const metaTheme = theme === 'light' ? '#f7f8fb' : '#0B0F19';
        document.documentElement.dataset.theme = theme;
        window.localStorage.setItem('smartjobs-theme', theme);

        let meta = document.querySelector('meta[name="theme-color"]');
        if (!meta) {
            meta = document.createElement('meta');
            meta.setAttribute('name', 'theme-color');
            document.head.appendChild(meta);
        }
        meta.setAttribute('content', metaTheme);
    }, [theme]);

    useEffect(() => {
        const activeLanguage = languages[language] ?? languages.fr;
        document.documentElement.lang = activeLanguage.code;
        document.documentElement.dir = activeLanguage.dir;
        window.localStorage.setItem('smartjobs-language', activeLanguage.code);
    }, [language]);

    const toggleTheme = useCallback(() => {
        setTheme((current) => (current === 'dark' ? 'light' : 'dark'));
    }, []);

    const t = useCallback((key) => {
        return languages[language]?.messages?.[key] ?? languages.fr.messages[key] ?? key;
    }, [language]);

    const showToast = useCallback((toast) => {
        const id = typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random()}`;
        const nextToast = {
            id,
            type: toast.type ?? 'info',
            title: toast.title ?? '',
            message: toast.message ?? '',
        };

        setToasts((current) => [...current, nextToast]);
        window.setTimeout(() => {
            setToasts((current) => current.filter((item) => item.id !== id));
        }, toast.duration ?? 4200);

        return id;
    }, []);

    const dismissToast = useCallback((id) => {
        setToasts((current) => current.filter((item) => item.id !== id));
    }, []);

    const value = useMemo(() => ({
        language,
        languages,
        setLanguage,
        theme,
        toggleTheme,
        setTheme,
        t,
        showToast,
    }), [language, theme, toggleTheme, t, showToast]);

    return (
        <AppExperienceContext.Provider value={value}>
            {children}
            <ToastViewport toasts={toasts} dismissToast={dismissToast} />
        </AppExperienceContext.Provider>
    );
}
