export function extractSavedOfferIds(payload) {
    if (Array.isArray(payload?.offer_ids)) {
        return payload.offer_ids.map((id) => Number(id));
    }

    const source = payload?.data;
    const rows = Array.isArray(source?.data) ? source.data : Array.isArray(source) ? source : [];

    return rows
        .map((row) => Number(row?.job_offer_id ?? row?.jobOffer?.id ?? row?.job_offer?.id))
        .filter((id) => Number.isFinite(id));
}

export function extractSavedOffers(payload) {
    const source = payload?.data;
    const rows = Array.isArray(source?.data) ? source.data : Array.isArray(source) ? source : [];

    return rows
        .map((row) => row?.jobOffer ?? row?.job_offer ?? row?.offer)
        .filter(Boolean);
}
