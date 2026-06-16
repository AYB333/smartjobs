import { ArrowRight, CheckCircle2, Circle, Lock, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useI18n } from '../context/useAppExperience';

export default function OnboardingPanel({
    items = [],
    eyebrow = 'Smart guide',
    title,
    subtitle,
    nextAction = null,
    columns = 'md:grid-cols-4',
}) {
    const { t } = useI18n();
    const completed = items.filter((item) => item.done).length;
    const progress = items.length ? Math.round((completed / items.length) * 100) : 0;
    const activeIndex = items.findIndex((item) => !item.done && !item.locked);

    return (
        <section className="rounded-3xl border border-borderGlass bg-surface p-6 md:p-7">
            <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                    <p className="mb-2 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-accent">
                        <Sparkles size={13} />
                        {eyebrow}
                    </p>
                    <h2 className="text-xl font-bold text-white">{title || t('onboarding.title')}</h2>
                    <p className="mt-1 max-w-2xl text-sm text-white/55">{subtitle || t('onboarding.subtitle')}</p>
                </div>

                <div className="text-right">
                    <p className="text-2xl font-black text-white">{progress}%</p>
                    <p className="text-xs uppercase tracking-wider text-white/45">{t('onboarding.completed')}</p>
                </div>
            </div>

            <div className="mb-5 h-2 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${progress}%` }} />
            </div>

            {nextAction && (
                <div className="mb-5 flex flex-col gap-4 rounded-2xl border border-accent/30 bg-accent/10 p-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-accent">{t('onboarding.nextAction')}</p>
                        <h3 className="mt-1 text-lg font-bold text-white">{nextAction.title}</h3>
                        <p className="mt-1 text-sm text-white/65">{nextAction.description}</p>
                    </div>
                    {nextAction.to && (
                        <Link
                            to={nextAction.to}
                            className="inline-flex w-fit items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent/90"
                        >
                            {nextAction.label || t('common.continue')}
                            <ArrowRight size={15} />
                        </Link>
                    )}
                </div>
            )}

            <div className={`grid gap-3 ${columns}`}>
                {items.map((item, index) => {
                    const Icon = item.icon || (item.done ? CheckCircle2 : item.locked ? Lock : Circle);
                    const active = activeIndex === index;
                    const content = (
                        <span className={`flex h-full flex-col justify-between gap-4 rounded-2xl border px-4 py-4 text-sm transition-colors ${
                            item.done
                                ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200'
                                : item.locked
                                    ? 'border-borderGlass bg-white/[0.03] text-white/35'
                                    : active
                                        ? 'border-accent/50 bg-accent/10 text-white hover:bg-accent/15'
                                        : 'border-borderGlass bg-white/5 text-white/75 hover:border-accent/40 hover:text-white'
                        }`}
                        >
                            <span className="flex items-start gap-3">
                                <span className={`mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${
                                    item.done
                                        ? 'border-emerald-400/30 bg-emerald-500/15 text-emerald-300'
                                        : item.locked
                                            ? 'border-borderGlass bg-white/5 text-white/35'
                                            : 'border-accent/40 bg-accent/15 text-accent'
                                }`}
                                >
                                    <Icon size={16} />
                                </span>
                                <span>
                                    <span className="block font-semibold">{item.label}</span>
                                    {item.description && (
                                        <span className="mt-1 block text-xs leading-relaxed opacity-75">{item.description}</span>
                                    )}
                                </span>
                            </span>

                            <span className="flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-wider">
                                <span>
                                    {item.done ? t('common.completed') : item.locked ? t('common.blocked') : item.actionLabel || t('common.continue')}
                                </span>
                                {!item.done && !item.locked && <ArrowRight size={13} />}
                            </span>
                        </span>
                    );

                    if (item.done || item.locked || !item.to) {
                        return <div key={item.label}>{content}</div>;
                    }

                    return (
                        <Link key={item.label} to={item.to}>
                            {content}
                        </Link>
                    );
                })}
            </div>
        </section>
    );
}
