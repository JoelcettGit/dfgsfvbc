// pages/api/products.js
import { createClient } from '@supabase/supabase-js';

// Cliente Admin (Service Key) para poder leer aunque RLS lo oculte a anónimos si es necesario
// Si tus productos son públicos para leer, puedes usar el cliente normal (anon key)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY // O NEXT_PUBLIC_SUPABASE_ANON_KEY si la lectura es pública
);

const PRODUCTS_PER_PAGE = 12; // Debe coincidir con el valor en categorias.js

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  // Obtener parámetros de la query: ?page=X&category=Y
  const page = parseInt(req.query.page || '1', 10);
  const category = req.query.category || 'todos';

  // Validar página
  if (isNaN(page) || page < 1) {
    return res.status(400).json({ message: 'Número de página inválido.' });
  }

  // Calcular el rango para Supabase
  const startIndex = (page - 1) * PRODUCTS_PER_PAGE;
  const endIndex = startIndex + PRODUCTS_PER_PAGE - 1;

  try {
    let query = supabase
      .from('products')
      .select(`
          id, name, base_price, product_type, image_url, category, tag,
          product_variants (variant_image_url),
          bundle_links ( product_variants ( variant_image_url ) )
      `, { count: 'exact' }) // Pedimos el count para saber el total filtrado
      .order('id', { ascending: false })
      .range(startIndex, endIndex);

    // Aplicar filtro de categoría si no es 'todos'
    if (category !== 'todos') {
      query = query.eq('category', category);
    }

    const { data: products, error, count } = await query;

    if (error) throw error;

    // Devolver productos y el conteo total (filtrado)
    res.status(200).json({
        products: products || [],
        totalProducts: count || 0,
        currentPage: page,
        hasNextPage: endIndex < (count || 0) - 1 // Indica si hay más páginas
    });

  } catch (error) {
    console.error("API Error fetching products:", error.message);
    res.status(500).json({ message: 'Error interno del servidor', details: error.message });
  }
}