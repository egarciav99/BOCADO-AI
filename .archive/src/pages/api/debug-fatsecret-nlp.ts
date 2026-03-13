/**
 * 🔍 DEBUG ENDPOINT: Probar FatSecret NLP API
 * 
 * Uso: GET /api/debug-fatsecret-nlp?text=un%20pan%20con%20queso
 * 
 */

import { analyzeNaturalLanguage } from '../../lib/api/utils/fatsecret';

export default async function handler(req: any, res: any) {
    // Solo en desarrollo
    if (process.env.NODE_ENV === 'production') {
        return res.status(403).json({ error: 'Not available in production' });
    }

    const { text, region = 'ES', language = 'es' } = req.query;

    if (!text) {
        return res.status(400).json({ error: 'Missing text parameter' });
    }

    try {
        const results = await analyzeNaturalLanguage(text, region, language);
        return res.status(200).json({
            success: true,
            input: text,
            region,
            language,
            results
        });
    } catch (error: any) {
        return res.status(500).json({
            error: 'FatSecret NLP failed',
            message: error.message
        });
    }
}
