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

// --- getServerSideProps (ACTUALIZADO con .textSearch()) ---
export async function getServerSideProps(context) {
    const searchTerm = context.query.q || '';

    if (!searchTerm.trim()) {
        return { props: { products: [], searchTerm: '' } };
    }

    // Preparamos el término para websearch_to_tsquery (maneja espacios y operadores simples)
    const query = searchTerm.trim(); 

    // Definir la expresión tsvector EXACTAMENTE como en el índice GIN
    const ftsVectorExpression = `to_tsvector('spanish', coalesce(name, '') || ' ' || coalesce(description, '') || ' ' || coalesce(category, ''))`;

    try {
        console.log(`Ejecutando FTS filter con query: "${query}"`); // Log

        const { data: products, error } = await supabase
            .from('products')
            .select(`
                id, name, base_price, product_type, image_url, tag, category,
                product_variants (variant_image_url),
                bundle_links (product_variants (variant_image_url))
            `)
            // --- CAMBIO AQUÍ: Usamos .filter() con @@ y websearch_to_tsquery ---
            .filter(
                // La columna/expresión a buscar (nuestra expresión tsvector)
                // Usamos comillas dobles aquí si la expresión contiene caracteres especiales,
                // pero en este caso no son estrictamente necesarias. Las quitamos por simplicidad.
                `(${ftsVectorExpression})`, // Envolvemos la expresión entre paréntesis por claridad
                // Operador FTS: @@ significa "matches" (coincide con)
                '@@', 
                // El valor de búsqueda, convertido a tsquery usando websearch_to_tsquery
                // websearch_to_tsquery es bueno para input de usuario (maneja AND/OR implícitos)
                `websearch_to_tsquery('spanish', '${query.replace(/'/g, "''")}')` // Escapamos comillas simples en la query!
            )
            .limit(50);

        if (error) {
            console.error("Error detallado de Supabase FTS filter:", error);
            throw new Error(error.message); 
        }

        console.log(`Resultados encontrados para "${query}": ${products?.length || 0}`); 

        return {
            props: {
                products: products || [],
                searchTerm,
            },
        };

    } catch (error) {
         console.error("Error en getServerSideProps (search.js):", error.message);
         return { props: { products: [], searchTerm, error: `Error al buscar: ${error.message}` } };
    }
}