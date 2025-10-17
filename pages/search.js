// pages/search.js
import { createClient } from '@supabase/supabase-js';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';
import Header from '../components/Header';
import Footer from '../components/Footer';

// Cliente Supabase (fuera, se usa en getServerSideProps)
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

// --- Componente de la Página de Búsqueda ---
export default function SearchPage({ products, searchTerm }) {
    const router = useRouter();

    // Helper para obtener imagen (igual que en categorias/index)
    const getProductImage = (product) => {
        switch (product.product_type) {
            case 'SIMPLE': return product.image_url || '/logo-vidaanimada.png';
            case 'VARIANT': return product.product_variants?.[0]?.variant_image_url || '/logo-vidaanimada.png';
            case 'BUNDLE': return product.bundle_links?.[0]?.product_variants?.variant_image_url || '/logo-vidaanimada.png';
            default: return '/logo-vidaanimada.png';
        }
    };

    return (
        <>
            <Head>
                <title>Resultados para &quot;{searchTerm}&quot; - Vida Animada</title>
                <link rel="icon" href="/logo-vidaanimada.png" />
            </Head>
            <Header />
            <main>
                <section className="page-section">
                    <h1>Resultados de búsqueda para: &quot;{searchTerm}&quot;</h1>

                    {products && products.length > 0 ? (
                        <div className="product-grid" style={{ marginTop: '2rem' }}>
                            {products.map((product) => (
                                <Link href={`/productos/${product.id}`} key={product.id} passHref>
                                     <div className="product-card" style={{ cursor: 'pointer' }}>
                                        {product.tag && <span className="product-tag">{product.tag}</span>}
                                        <Image
                                            src={getProductImage(product)}
                                            alt={product.name}
                                            width={300} height={280}
                                            style={{ objectFit: 'cover' }}
                                        />
                                        <h4>{product.name}</h4>
                                        <p className="price">Desde ${product.base_price}</p>
                                     </div>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <p className="subtitle" style={{ marginTop: '2rem' }}>
                            No se encontraron productos que coincidan con tu búsqueda. Intenta con otros términos.
                        </p>
                    )}
                </section>
            </main>
            <Footer />
        </>
    );
}

export async function getServerSideProps(context) {
    const searchTerm = context.query.q || '';

    if (!searchTerm.trim()) { // Verifica si el término está vacío después de quitar espacios
        return { props: { products: [], searchTerm: '' } };
    }

    // Prepara el término de búsqueda para FTS en español con coincidencia de prefijo.
    // Ej: "pantu cer" se convierte en "pantu:* & cer:*"
    // Esto busca palabras que empiecen con "pantu" Y palabras que empiecen con "cer".
    const ftsQuery = searchTerm.trim()
        .split(' ') // Separa por espacios
        .filter(Boolean) // Elimina espacios extra
        .map(term => term + ':*') // Añade ':*' para coincidencia de prefijo
        .join(' & '); // Une con ' & ' para requerir todas las palabras

    // Si ftsQuery queda vacío después de procesar (ej: solo espacios), no busca.
    if (!ftsQuery) {
         return { props: { products: [], searchTerm } };
    }


    try {
        const { data: products, error } = await supabase
            .from('products')
            .select(`
                id, name, base_price, product_type, image_url, tag, category,
                product_variants (variant_image_url),
                bundle_links (product_variants (variant_image_url))
            `)
            // --- NUEVO FILTRO FTS ---
            // Busca en el tsvector combinado (usando el índice si lo creaste)
            .filter(
                // Nombre de la columna virtual o expresión tsvector
                // IMPORTANTE: Asegúrate que esta expresión coincida EXACTAMENTE con la del índice
                'fts_vector_column', // Asume que creaste una columna o usa la expresión directa:
                // `to_tsvector('spanish', coalesce(name, '') || ' ' || coalesce(description, '') || ' ' || coalesce(category, ''))`, 
                '@@', // Operador FTS: "matches"
                // `to_tsquery('spanish', ftsQuery)` // Convierte el string de búsqueda a tipo tsquery
                 `(${to_tsvector('spanish', coalesce(name, '') || ' ' || coalesce(description, '') || ' ' || coalesce(category, ''))}) @@ (to_tsquery('spanish', '${ftsQuery}'))` // Forma directa si no hay columna fts_vector_column
            )
            // Filtro FTS usando la función textSearch (alternativa más simple si la anterior falla)
            // .textSearch(
            //     'fts_vector_column', // O la expresión directa como string
            //     searchTerm.trim(), // Pasa el término original
            //     {
            //         config: 'spanish', // Diccionario
            //         type: 'websearch' // Tipo de query que maneja mejor input de usuario
            //     }
            // )
            .limit(50);

        if (error) {
            throw error; // Lanza el error para el bloque catch
        }

        return {
            props: {
                products: products || [],
                searchTerm,
            },
        };

    } catch (error) {
         console.error("Error fetching search results (FTS):", error.message);
         // Devuelve un error para que el usuario sepa que algo falló
         return { props: { products: [], searchTerm, error: "Error al realizar la búsqueda." } };
    }
}