// pages/api/revalidate.js

export default async function handler(req, res) {
    // 1. Verifica el token secreto
    if (req.query.secret !== process.env.REVALIDATE_TOKEN) {
        return res.status(401).json({ message: 'Token de revalidación inválido' });
    }

    try {
        // 2. Revalida las páginas estáticas (Home y Categorías)
        await res.revalidate('/');
        await res.revalidate('/categorias');
        console.log("Revalidación completada para la página de inicio y categorías.");

        // 3. (NUEVO) Revalida la página de producto individual si se pasó un ID
        if (req.query.id) {
            const productPath = `/productos/${req.query.id}`;
            await res.revalidate(productPath);
            console.log(`Revalidación completada para: ${productPath}`);
        }
        
        return res.json({ revalidated: true });

    } catch (err) {
        console.error("Error durante la revalidación:", err);
        return res.status(500).send('Error al revalidar');
    }
}