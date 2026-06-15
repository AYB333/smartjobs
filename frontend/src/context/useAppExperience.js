import { useContext } from 'react';
import AppExperienceContext from './AppExperienceContext';

export function useAppExperience() {
    const context = useContext(AppExperienceContext);

    if (!context) {
        throw new Error('useAppExperience must be used inside AppExperienceProvider');
    }

    return context;
}

export function useI18n() {
    return useAppExperience();
}

export function useTheme() {
    return useAppExperience();
}

export function useToast() {
    return useAppExperience();
}
