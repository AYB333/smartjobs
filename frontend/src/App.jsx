import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Placeholder Pages - We will map these into proper files later
const Home = () => <div className="p-10 text-2xl font-bold">Homepage - Ultra Dynamic Hero 🚀</div>;
const Jobs = () => <div className="p-10">Jobs Listing with Interactive Sidebar</div>;
const JobDetail = () => <div className="p-10">Job Detail + Postuler Button</div>;
const Auth = () => <div className="p-10">Split-screen Auth (Login/Register)</div>;

const CandidatDashboard = () => <div className="p-10">Candidat Dashboard</div>;
const CandidatProfile = () => <div className="p-10">Candidat Profile</div>;
const QuizPage = () => <div className="p-10">Isolated Quiz Page</div>;

const RecruteurDashboard = () => <div className="p-10">Recruteur Dashboard</div>;
const RecruteurOfferForm = () => <div className="p-10">Create/Edit Offer</div>;
const RecruteurCandidatures = () => <div className="p-10">Candidatures Kanban Board</div>;
const PremiumPage = () => <div className="p-10">Premium Checkout (Stripe)</div>;

const AdminDashboard = () => <div className="p-10">Admin Global Stats & Moderation</div>;

// Route Guards
const ProtectedRoute = ({ children, allowedRoles }) => {
    // Placeholder Logic: Real auth check will use localStorage and user roles.
    const token = localStorage.getItem('token');
    // if (!token) return <Navigate to="/auth" replace />;
    return children;
};

// Root Layout wrapper for the dark aesthetic
const RootLayout = ({ children }) => (
  <div className="min-h-screen bg-obsidian text-white font-sans selection:bg-accent selection:text-white">
    {children}
  </div>
);

function App() {
  return (
    <Router>
      <RootLayout>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/jobs" element={<Jobs />} />
          <Route path="/jobs/:id" element={<JobDetail />} />
          <Route path="/auth" element={<Auth />} />

          {/* Candidat Routes */}
          <Route path="/candidat" element={<ProtectedRoute allowedRoles={['candidat']}><CandidatDashboard /></ProtectedRoute>} />
          <Route path="/candidat/profile" element={<ProtectedRoute allowedRoles={['candidat']}><CandidatProfile /></ProtectedRoute>} />
          <Route path="/candidat/quiz/:id" element={<ProtectedRoute allowedRoles={['candidat']}><QuizPage /></ProtectedRoute>} />

          {/* Recruteur Routes */}
          <Route path="/recruteur" element={<ProtectedRoute allowedRoles={['recruteur']}><RecruteurDashboard /></ProtectedRoute>} />
          <Route path="/recruteur/offer/create" element={<ProtectedRoute allowedRoles={['recruteur']}><RecruteurOfferForm /></ProtectedRoute>} />
          <Route path="/recruteur/candidatures" element={<ProtectedRoute allowedRoles={['recruteur']}><RecruteurCandidatures /></ProtectedRoute>} />
          <Route path="/recruteur/premium" element={<ProtectedRoute allowedRoles={['recruteur']}><PremiumPage /></ProtectedRoute>} />

          {/* Admin Routes */}
          <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
          
          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </RootLayout>
    </Router>
  );
}

export default App;
