// pages/api/revalidate.js

export default async function handler(req, res) {
    // 1. Verifica que la contraseña secreta sea correcta
    if (req.query.secret !== process.env.REVALIDATE_TOKEN) {
        return res.status(401).json({ message: 'Token de revalidación inválido' });
    }

    try {
        // 2. Revalida la página de inicio y la de categorías
        await res.revalidate('/');
        await res.revalidate('/categorias');
        
        console.log("Revalidación completada para la página de inicio y categorías.");
        return res.json({ revalidated: true });
    } catch (err) {
        console.error("Error durante la revalidación:", err);
        return res.status(500).send('Error al revalidar');
    }
}
