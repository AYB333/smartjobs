import { Link } from 'react-router-dom';
import { useI18n } from '../context/useAppExperience';

export default function Footer() {
    const { t } = useI18n();

    return (
        <footer className="site-footer border-t border-borderGlass bg-obsidian py-12 text-sm text-white/55">
            <div className="container mx-auto grid gap-8 px-6 md:grid-cols-[1.4fr_1fr] md:items-start">
                <div>
                    <Link to="/" className="inline-flex items-center gap-1 text-2xl font-black tracking-tight text-white">
                        SmartJobs
                        <span className="h-2 w-2 rounded-full bg-accent" />
                    </Link>
                    <p className="mt-3 max-w-xl leading-relaxed">
                        {t('footer.description')}
                    </p>
                    <p className="mt-5 text-xs uppercase tracking-wider text-white/35">
                        {t('footer.rights')}
                    </p>
                </div>

                <nav className="grid gap-3 sm:grid-cols-2 md:justify-self-end">
                    <Link to="/jobs" className="transition-colors hover:text-accent">{t('nav.jobs')}</Link>
                    <Link to="/auth?role=recruteur&mode=register" className="transition-colors hover:text-accent">{t('common.recruiters')}</Link>
                    <a href="mailto:contact@smartjobs.ma" className="transition-colors hover:text-accent">{t('common.contact')}</a>
                    <span className="text-white/45">{t('common.legal')}</span>
                </nav>
            </div>
        </footer>
    );
}
