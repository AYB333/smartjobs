import { useEffect, useMemo, useState } from 'react';
import { MessageCircle, Send, X } from 'lucide-react';
import api from '../api/axios';

function parseStoredUser() {
    try {
        const rawUser = localStorage.getItem('user');
        return rawUser ? JSON.parse(rawUser) : null;
    } catch {
        return null;
    }
}

function getOffer(application) {
    return application?.jobOffer ?? application?.job_offer ?? {};
}

function formatDate(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString('fr-FR', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export default function ApplicationChat({ application, onClose }) {
    const currentUser = useMemo(() => parseStoredUser(), []);
    const [messages, setMessages] = useState([]);
    const [draft, setDraft] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState('');
    const offer = getOffer(application);

    useEffect(() => {
        let active = true;

        const loadMessages = async () => {
            setLoading(true);
            setError('');

            try {
                const response = await api.get(`/postulations/${application.id}/messages`);
                if (active) {
                    setMessages(Array.isArray(response?.data?.data) ? response.data.data : []);
                }
            } catch (requestError) {
                if (active) {
                    setError(requestError?.response?.data?.message || 'Impossible de charger la discussion.');
                }
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        };

        if (application?.id) {
            loadMessages();
        }

        return () => {
            active = false;
        };
    }, [application?.id]);

    const sendMessage = async (event) => {
        event.preventDefault();
        const message = draft.trim();

        if (!message || sending) {
            return;
        }

        setSending(true);
        setError('');

        try {
            const response = await api.post(`/postulations/${application.id}/messages`, { message });
            setMessages((previous) => [...previous, response?.data?.data].filter(Boolean));
            setDraft('');
        } catch (requestError) {
            setError(requestError?.response?.data?.message || 'Message non envoye.');
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[140] flex items-end justify-center bg-black/60 px-4 py-4 backdrop-blur-sm sm:items-center">
            <div className="flex max-h-[86vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-borderGlass bg-deepNavy shadow-[0_28px_90px_rgba(0,0,0,0.45)]">
                <div className="flex items-start justify-between gap-4 border-b border-borderGlass px-5 py-4">
                    <div>
                        <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-accent">
                            <MessageCircle size={14} />
                            Discussion
                        </p>
                        <h2 className="mt-1 text-lg font-bold text-white">{offer?.titre_poste || 'Candidature acceptee'}</h2>
                        <p className="mt-1 text-sm text-white/50">Accessible uniquement apres acceptation.</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-full border border-borderGlass bg-white/5 p-2 text-white/70 transition-colors hover:border-accent/45 hover:text-white"
                        aria-label="Fermer la discussion"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="min-h-[280px] flex-1 space-y-3 overflow-y-auto px-5 py-4">
                    {loading ? (
                        <p className="py-10 text-center text-sm text-white/50">Chargement...</p>
                    ) : error ? (
                        <p className="rounded-2xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{error}</p>
                    ) : messages.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-borderGlass bg-white/5 px-5 py-8 text-center">
                            <p className="font-semibold text-white">Aucun message pour le moment.</p>
                            <p className="mt-2 text-sm text-white/55">Envoyez un premier message clair et professionnel.</p>
                        </div>
                    ) : (
                        messages.map((message) => {
                            const mine = Number(message.sender_id) === Number(currentUser?.id);

                            return (
                                <div key={message.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[78%] rounded-2xl border px-4 py-3 ${
                                        mine
                                            ? 'border-accent/35 bg-accent/15 text-white'
                                            : 'border-borderGlass bg-white/5 text-white/88'
                                    }`}>
                                        <p className="text-sm leading-6">{message.message}</p>
                                        <p className="mt-2 text-[11px] text-white/42">
                                            {message.sender?.name || (mine ? 'Vous' : 'Interlocuteur')} - {formatDate(message.created_at)}
                                        </p>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                <form onSubmit={sendMessage} className="border-t border-borderGlass p-4">
                    <div className="flex flex-col gap-3 sm:flex-row">
                        <textarea
                            value={draft}
                            onChange={(event) => setDraft(event.target.value)}
                            rows={2}
                            maxLength={1000}
                            placeholder="Ecrire un message..."
                            className="min-h-[52px] flex-1 resize-none rounded-2xl border border-borderGlass bg-obsidian/70 px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-white/35 focus:border-accent/55"
                        />
                        <button
                            type="submit"
                            disabled={sending || !draft.trim()}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-accent px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-55"
                        >
                            <Send size={16} />
                            {sending ? 'Envoi...' : 'Envoyer'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
