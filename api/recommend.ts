import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Solo permitimos POST (que es lo que enviará tu App)
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const data = req.body;
    console.log("Datos recibidos de la App:", data);

    // Respuesta temporal para validar que el puente funciona
    return res.status(200).json({ 
      success: true, 
      message: "Backend en Vercel activo. Listo para sustituir a n8n." 
    });
  } catch (error) {
    return res.status(500).json({ error: "Error interno del servidor" });
  }
}
