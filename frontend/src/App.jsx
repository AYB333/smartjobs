import React, { Suspense, lazy, useEffect, useState } from 'react';
import { BrowserRouter as Router, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import CommandPalette from './components/CommandPalette';
import { AppExperienceProvider } from './context/AppExperience';

const Home = lazy(() => import('./pages/Home'));
const Jobs = lazy(() => import('./pages/Jobs'));
const Auth = lazy(() => import('./pages/Auth'));
const RecruteurDashboard = lazy(() => import('./pages/RecruteurDashboard'));
const CandidatDashboard = lazy(() => import('./pages/CandidatDashboard'));
const JobDetail = lazy(() => import('./pages/JobDetail'));
const RecruteurOfferForm = lazy(() => import('./pages/RecruteurOfferForm'));
const RecruteurCandidatures = lazy(() => import('./pages/RecruteurCandidatures'));
const CandidatProfile = lazy(() => import('./pages/CandidatProfile'));
const RecruteurProfile = lazy(() => import('./pages/RecruteurProfile'));
const QuizPage = lazy(() => import('./pages/QuizPage'));
const PremiumPage = lazy(() => import('./pages/PremiumPage'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));

const ProtectedRoute = ({ children, allowedRoles }) => {
    const rawUser = localStorage.getItem('user');

    if (!rawUser) {
        return <Navigate to="/auth" replace />;
    }

    let user = null;
    let invalidStoredUser = false;

    try {
        user = JSON.parse(rawUser);
    } catch {
        invalidStoredUser = true;
    }

    if (invalidStoredUser) {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        return <Navigate to="/auth" replace />;
    }

    if (allowedRoles?.length && !allowedRoles.includes(user?.role)) {
        return <Navigate to="/" replace />;
    }

    return children;
};

const AnimatedRoutes = () => (
    <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/jobs" element={<Jobs />} />
        <Route path="/jobs/:id" element={<JobDetail />} />
        <Route path="/auth" element={<Auth />} />

        <Route path="/candidat" element={<Navigate to="/candidat/dashboard" replace />} />
        <Route path="/candidat/dashboard" element={<ProtectedRoute allowedRoles={['candidat']}><CandidatDashboard /></ProtectedRoute>} />
        <Route path="/candidat/profile" element={<ProtectedRoute allowedRoles={['candidat']}><CandidatProfile /></ProtectedRoute>} />
        <Route path="/candidat/quiz/:id" element={<ProtectedRoute allowedRoles={['candidat']}><QuizPage /></ProtectedRoute>} />

        <Route path="/recruteur" element={<Navigate to="/recruteur/dashboard" replace />} />
        <Route path="/recruteur/dashboard" element={<ProtectedRoute allowedRoles={['recruteur']}><RecruteurDashboard /></ProtectedRoute>} />
        <Route path="/recruteur/profile" element={<ProtectedRoute allowedRoles={['recruteur']}><RecruteurProfile /></ProtectedRoute>} />
        <Route path="/recruteur/offer/create" element={<ProtectedRoute allowedRoles={['recruteur']}><RecruteurOfferForm /></ProtectedRoute>} />
        <Route path="/recruteur/offer/edit/:id" element={<ProtectedRoute allowedRoles={['recruteur']}><RecruteurOfferForm /></ProtectedRoute>} />
        <Route path="/recruteur/candidatures" element={<ProtectedRoute allowedRoles={['recruteur']}><RecruteurCandidatures /></ProtectedRoute>} />
        <Route path="/recruteur/premium" element={<ProtectedRoute allowedRoles={['recruteur']}><PremiumPage /></ProtectedRoute>} />

        <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="/admin/dashboard" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />

        <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
);

function LoadingScreen() {
    return (
        <div className="min-h-screen flex items-center justify-center text-white">
            <div className="w-8 h-8 border-2 border-white/20 border-t-accent rounded-full animate-spin" />
        </div>
    );
}

export default function App() {
    return (
        <Router>
            <AppExperienceProvider>
                <div className="min-h-screen bg-obsidian text-white font-sans selection:bg-accent selection:text-white">
                    <Suspense fallback={<LoadingScreen />}>
                        <AnimatedRoutes />
                    </Suspense>
                    <CommandPaletteController />
                </div>
            </AppExperienceProvider>
        </Router>
    );
}

function CommandPaletteController() {
    const [commandOpen, setCommandOpen] = useState(false);
    const location = useLocation();

    useEffect(() => {
        const onKeyDown = (event) => {
            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
                event.preventDefault();
                setCommandOpen((current) => !current);
            }
        };
        const openCommand = () => setCommandOpen(true);

        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('smartjobs:open-command', openCommand);

        return () => {
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('smartjobs:open-command', openCommand);
        };
    }, []);

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            setCommandOpen(false);
        }, 0);

        return () => window.clearTimeout(timeoutId);
    }, [location.pathname, location.search]);

    return (
        <CommandPalette open={commandOpen} onClose={() => setCommandOpen(false)} />
    );
}
