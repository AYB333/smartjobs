function normalize(value) {
    return String(value ?? '')
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
}

function parseStoredUser() {
    try {
        const rawUser = localStorage.getItem('user');
        return rawUser ? JSON.parse(rawUser) : null;
    } catch {
        return null;
    }
}

export function getCandidateProfile() {
    const user = parseStoredUser();

    if (user?.role !== 'candidat') {
        return null;
    }

    return user?.candidatProfile ?? user?.candidat_profile ?? user?.profile ?? null;
}

export function calculateMatchScore(job, profile = getCandidateProfile()) {
    if (!job || !profile) {
        return null;
    }

    let score = 42;
    const jobCity = normalize(job.ville);
    const profileCity = normalize(profile.ville);
    const jobTitle = normalize(job.titre_poste);
    const wantedPosition = normalize(profile.poste_recherche);
    const experience = normalize(profile.experience);
    const preferredContract = normalize(profile.contrat_prefere);
    const jobContract = normalize(job.type_contrat);

    if (jobCity && profileCity && jobCity === profileCity) {
        score += 25;
    }

    if (jobTitle && wantedPosition) {
        const titleWords = jobTitle.split(/\s+/).filter((word) => word.length > 2);
        const positionWords = wantedPosition.split(/\s+/).filter((word) => word.length > 2);
        const hasSharedWord = titleWords.some((word) => positionWords.includes(word));

        if (hasSharedWord || jobTitle.includes(wantedPosition) || wantedPosition.includes(jobTitle)) {
            score += 24;
        }
    }

    if (experience) {
        score += 9;
    }

    if (preferredContract && jobContract && preferredContract === jobContract) {
        score += 8;
    }

    return Math.max(35, Math.min(score, 98));
}

export function getMatchReasons(job, profile = getCandidateProfile()) {
    if (!job || !profile) {
        return [];
    }

    const reasons = [];
    const jobCity = normalize(job.ville);
    const profileCity = normalize(profile.ville);
    const jobTitle = normalize(job.titre_poste);
    const wantedPosition = normalize(profile.poste_recherche);
    const preferredContract = normalize(profile.contrat_prefere);
    const jobContract = normalize(job.type_contrat);

    if (jobCity && profileCity && jobCity === profileCity) {
        reasons.push('Dans votre ville');
    }

    if (jobTitle && wantedPosition) {
        const titleWords = jobTitle.split(/\s+/).filter((word) => word.length > 2);
        const positionWords = wantedPosition.split(/\s+/).filter((word) => word.length > 2);
        const hasSharedWord = titleWords.some((word) => positionWords.includes(word));

        if (hasSharedWord || jobTitle.includes(wantedPosition) || wantedPosition.includes(jobTitle)) {
            reasons.push('Correspond a votre poste recherche');
        }
    }

    if (preferredContract && jobContract && preferredContract === jobContract) {
        reasons.push('Contrat prefere');
    }

    if (calculateMatchScore(job, profile) >= 82) {
        reasons.push('Score matching eleve');
    }

    return [...new Set(reasons)].slice(0, 3);
}

export function getMatchTone(score) {
    if (score >= 82) {
        return 'strong';
    }

    if (score >= 62) {
        return 'good';
    }

    return 'low';
}
