import { Link } from 'react-router-dom';

export default function Footer() {
    return (
        <footer className="bg-obsidian border-t border-borderGlass py-12 text-white/50 text-sm">
            <div className="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
                <div>&copy; 2026 SmartJobs. Tous droits réservés.</div>
                <div className="flex gap-6">
                    <Link to="/jobs" className="hover:text-accent transition-colors">Emplois</Link>
                    <a href="#" className="hover:text-accent transition-colors">Mentions légales</a>
                    <a href="#" className="hover:text-accent transition-colors">Contact</a>
                </div>
            </div>
        </footer>
    );
}