import { NextApiRequest, NextApiResponse } from 'next';
import { checkFatSecretConnection } from '../../lib/api/utils/fatsecret';

/**
 * API endpoint to diagnose FatSecret connectivity issues
 * Access via: GET /api/fatsecret-diagnostics
 * 
 * Returns:
 * - Credentials configured status
 * - Token fetch test result
 * - Search test result  
 * - Errors and action items
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    console.log('[API] FatSecret diagnostics requested');
    const diagnostics = await checkFatSecretConnection();
    
    const statusOk = diagnostics.errors.length === 0 && 
                     diagnostics.tokenAttempt?.success &&
                     diagnostics.searchAttempt?.success;
    
    res.status(statusOk ? 200 : 503).json({
      status: statusOk ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      diagnostics,
      actionItems: diagnostics.errors,
      summary: statusOk 
        ? '✅ FatSecret connection is working properly'
        : '❌ FatSecret connection has issues - see actionItems',
    });
  } catch (error: any) {
    console.error('[API] Diagnostics error:', error);
    res.status(500).json({
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
}
