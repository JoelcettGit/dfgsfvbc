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

    const query = searchTerm.trim();

    // --- IMPORTANTE: Definir la expresión del tsvector EXACTAMENTE como en el índice ---
    // Esta cadena debe coincidir con la usada en CREATE INDEX
    const ftsVectorExpression = `to_tsvector('spanish', coalesce(name, '') || ' ' || coalesce(description, '') || ' ' || coalesce(category, ''))`;

    try {
        console.log(`Ejecutando textSearch con query: "${query}" sobre: ${ftsVectorExpression}`); // Log para depurar

        const { data: products, error } = await supabase
            .from('products')
            .select(`
                id, name, base_price, product_type, image_url, tag, category,
                product_variants (variant_image_url),
                bundle_links (product_variants (variant_image_url))
            `)
            // --- Usamos textSearch con la expresión correcta ---
            .textSearch(
                 ftsVectorExpression, // Pasamos la variable con la expresión exacta
                 query,
                 {
                     config: 'spanish',
                     // Probamos con 'plain' primero, que es más simple (AND entre términos)
                     // Si 'plain' no funciona bien para frases, volvemos a 'websearch'
                     type: 'plain', 
                     // Opcional: Probar con 'prefix: true' si 'plain' solo busca palabras completas
                     // plain: true // Esto haría que busque prefijos con el tipo 'plain'
                 }
            )
            .limit(50);

        if (error) {
            // Si hay error, loguearlo detalladamente
            console.error("Error detallado de Supabase textSearch:", error);
            throw new Error(error.message); // Lanza para que el catch lo maneje
        }

        console.log(`Resultados encontrados para "${query}": ${products?.length || 0}`); // Log de resultados

        return {
            props: {
                products: products || [],
                searchTerm,
            },
        };

    } catch (error) {
         // Loguea el error formateado
         console.error("Error en getServerSideProps (search.js):", error.message);
         // Devuelve el error a la página para posible feedback al usuario
         return { props: { products: [], searchTerm, error: `Error al buscar: ${error.message}` } };
    }
}