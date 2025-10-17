// pages/categorias.js
import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import { useState, useEffect } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function CategoriasPage({ allProducts }) {
    // ... (tus useState y useEffect sin cambios) ...

    // --- FUNCIÓN HELPER ACTUALIZADA ---
    const getProductImage = (product) => {
        switch (product.product_type) {
            case 'SIMPLE':
                return product.image_url || '/logo-vidaanimada.png';
            case 'VARIANT':
                return product.product_variants?.[0]?.variant_image_url || '/logo-vidaanimada.png';
            case 'BUNDLE':
                return '/logo-vidaanimada.png'; // Fallback para bundles
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
                        <select id="category-filter" value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
                            {uniqueCategories.map(cat => (
                                <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
                            ))}
                        </select>
                    </div>
                    <div className="product-grid">
                        {filteredProducts.map((product) => (
                            <Link href={`/productos/${product.id}`} key={product.id}>
                                <div className="product-card" style={{ cursor: 'pointer' }}>
                                    {product.tag && <span className="product-tag">{product.tag}</span>}

                                    {/* --- LÍNEA DE IMAGEN CORREGIDA --- */}
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

// --- getStaticProps ACTUALIZADO (para traer product_type) ---
export async function getStaticProps() {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    
    // --- CONSULTA CORREGIDA (SIN COMENTARIOS) ---
    const { data: allProducts, error } = await supabase
      .from('products')
      .select(`
          id, name, base_price, product_type, image_url, category, tag, 
          product_variants (variant_image_url)
      `);

    if (error) {
        console.error("Error fetching categories products:", error.message);
    }

    return { props: { allProducts: allProducts || [] }, revalidate: 60 };
}