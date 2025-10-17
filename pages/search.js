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
                <title>Resultados para &quot;{searchTerm}&quot; | Vida Animada</title>
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
                                        {/* Contenedor de Imagen */}
                                        <div className="product-card-image-container">
                                            <Image
                                                src={getProductImage(product)}
                                                alt={product.name || 'Producto'}
                                                fill // Usa 'fill' para que la imagen llene el contenedor
                                                style={{ objectFit: 'cover' }} // 'cover' para llenar, 'contain' para mostrar todo
                                                sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw" // Ayuda a Next/Image a optimizar
                                            />
                                        </div>
                                        {/* Contenedor de Contenido */}
                                        <div className="product-card-content">
                                            <h4>{product.name}</h4>
                                            <p className="price">Desde ${product.base_price}</p>
                                        </div>
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

    if (!searchTerm.trim()) {
        return { props: { products: [], searchTerm: '' } };
    }

    // Prepara el término para búsqueda 'ilike' (case-insensitive, partial match)
    const searchQuery = `%${searchTerm.trim()}%`;

    try {
        const { data: products, error } = await supabase
            .from('products')
            .select(`
                id, name, base_price, product_type, image_url, tag, category,
                product_variants (variant_image_url),
                bundle_links (product_variants (variant_image_url))
            `)
            // --- Usa .or() para buscar en name, description, O category ---
            .or(`name.ilike.${searchQuery},description.ilike.${searchQuery},category.ilike.${searchQuery}`)
            .limit(50); // Mantiene el límite

        if (error) {
            // Manejo de errores estándar
            console.error("Error fetching search results (ilike):", error.message);
            throw new Error(error.message);
        }

        return {
            props: {
                products: products || [],
                searchTerm: searchTerm.trim(), // Pasa el término limpio
            },
        };

    } catch (error) {
        console.error("Error en getServerSideProps (search.js - ilike):", error.message);
        return { props: { products: [], searchTerm: searchTerm.trim(), error: `Error al buscar.` } }; // Mensaje de error genérico
    }
}