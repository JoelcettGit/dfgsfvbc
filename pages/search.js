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
                <title>Resultados para "{searchTerm}" - Vida Animada</title>
                <link rel="icon" href="/logo-vidaanimada.png" />
            </Head>
            <Header />
            <main>
                <section className="page-section">
                    <h1>Resultados de búsqueda para: "{searchTerm}"</h1>

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

// --- getServerSideProps (Se ejecuta en cada petición) ---
export async function getServerSideProps(context) {
    const searchTerm = context.query.q || ''; // Obtiene el término de búsqueda de la URL (?q=...)

    if (!searchTerm) {
        // Si no hay término de búsqueda, devuelve props vacíos o redirige
        return { props: { products: [], searchTerm: '' } };
    }

    // Prepara el término para búsqueda 'ilike' (case-insensitive, partial match)
    const searchQuery = `%${searchTerm}%`;

    // Consulta a Supabase buscando en 'name' O 'description'
    const { data: products, error } = await supabase
        .from('products')
        .select(`
            id, name, base_price, product_type, image_url, tag,
            product_variants (variant_image_url),
            bundle_links (product_variants (variant_image_url))
        `)
        // Busca si el nombre O la descripción contienen el término
        .or(`name.ilike.${searchQuery},description.ilike.${searchQuery}`)
        .limit(50); // Limita resultados para no sobrecargar

    if (error) {
        console.error("Error fetching search results:", error.message);
        // Podrías devolver una prop de error para mostrar un mensaje en la UI
        return { props: { products: [], searchTerm, error: error.message } };
    }

    // Pasa los productos encontrados y el término de búsqueda como props a la página
    return {
        props: {
            products: products || [],
            searchTerm,
        },
    };
}