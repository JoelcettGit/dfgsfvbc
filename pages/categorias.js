// pages/categorias.js
import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import { useState, useEffect } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';

// Supabase client initialization (outside component)
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export default function CategoriasPage({ allProducts }) {
    const [selectedCategory, setSelectedCategory] = useState('todos'); // Initialized correctly
    const [uniqueCategories, setUniqueCategories] = useState([]);
    const [filteredProducts, setFilteredProducts] = useState(allProducts || []); // Ensure initial state is array

    // Effect to derive unique categories
    useEffect(() => {
        if (allProducts && allProducts.length > 0) {
            const categories = ['todos', ...new Set(allProducts.map(p => p.category).filter(Boolean))];
            setUniqueCategories(categories);
        } else {
            setUniqueCategories(['todos']); // Default if no products
        }
    }, [allProducts]);

    // Effect to filter products when category changes
    useEffect(() => {
        if (!allProducts) return; // Guard clause

        if (selectedCategory === 'todos') {
            setFilteredProducts(allProducts);
        } else {
            setFilteredProducts(allProducts.filter(p => p.category === selectedCategory));
        }
    }, [selectedCategory, allProducts]);

    // --- FUNCIÓN HELPER ACTUALIZADA ---
    const getProductImage = (product) => {
        switch (product.product_type) {
            case 'SIMPLE':
                return product.image_url || '/logo-vidaanimada.png';
            case 'VARIANT':
                return product.product_variants?.[0]?.variant_image_url || '/logo-vidaanimada.png';
            case 'BUNDLE':
                return product.bundle_links?.[0]?.product_variants?.variant_image_url || '/logo-vidaanimada.png';
            default:
                return '/logo-vidaanimada.png';
        }
    };

    return (
        <>
            <Head>
                <title>Productos - Vida Animada</title>
                <link rel="icon" href="/logo-vidaanimada.png" />
            </Head>
            <Header />
            <main>
                <section className="page-section">
                    <h1>Explora Nuestros Productos</h1>
                    <p className="subtitle">Utiliza el filtro para encontrar tus productos favoritos.</p>
                    <div className="filter-container">
                        <select
                            id="category-filter"
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                        >
                            {uniqueCategories.map(cat => (
                                <option key={cat} value={cat}>
                                    {/* Capitalize first letter */}
                                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="product-grid">
                        {/* Ensure filteredProducts is always an array before mapping */}
                        {(filteredProducts || []).map((product) => (
                            <Link href={`/productos/${product.id}`} key={product.id}>
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
                </section>
            </main>
            <Footer />
        </>
    );
}

// --- getStaticProps ACTUALIZADO (para traer imagen de bundles) ---
export async function getStaticProps() {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

    const { data: allProducts, error } = await supabase
      .from('products')
      .select(`
          id, name, base_price, product_type, image_url, category, tag,
          product_variants ( variant_image_url ),
          bundle_links ( product_variants ( variant_image_url ) )
      `);

    if (error) {
        console.error("Error fetching categories products:", error.message);
        return { props: { allProducts: [] }, revalidate: 60 };
    }

    // --- AÑADIR ESTE LOG ---
    console.log("All Products Data:", JSON.stringify(allProducts, null, 2));
    // -----------------------

    return { props: { allProducts: allProducts || [] }, revalidate: 60 };
}