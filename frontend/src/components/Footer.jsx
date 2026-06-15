import { Link } from 'react-router-dom';

export default function Footer() {
    return (
        <footer className="site-footer border-t border-borderGlass bg-obsidian py-12 text-sm text-white/55">
            <div className="container mx-auto grid gap-8 px-6 md:grid-cols-[1.4fr_1fr] md:items-start">
                <div>
                    <Link to="/" className="inline-flex items-center gap-1 text-2xl font-black tracking-tight text-white">
                        SmartJobs
                        <span className="h-2 w-2 rounded-full bg-accent" />
                    </Link>
                    <p className="mt-3 max-w-xl leading-relaxed">
                        Plateforme de recrutement CHR pour publier des offres, suivre les candidatures,
                        consulter les CV et qualifier les profils avec des quiz metier.
                    </p>
                    <p className="mt-5 text-xs uppercase tracking-wider text-white/35">
                        &copy; 2026 SmartJobs. Tous droits reserves.
                    </p>
                </div>

                <nav className="grid gap-3 sm:grid-cols-2 md:justify-self-end">
                    <Link to="/jobs" className="transition-colors hover:text-accent">Offres</Link>
                    <Link to="/auth?role=recruteur&mode=register" className="transition-colors hover:text-accent">Recruteurs</Link>
                    <a href="mailto:contact@smartjobs.ma" className="transition-colors hover:text-accent">Contact</a>
                    <span className="text-white/45">Mentions legales</span>
                </nav>
            </div>
        </footer>
    );
}
