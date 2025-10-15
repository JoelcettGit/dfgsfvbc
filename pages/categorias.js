// pages/categorias.js
import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import { useState, useEffect } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function CategoriasPage({ allProducts }) {
    // ... (la lógica del filtro no cambia)
    const [selectedCategory, setSelectedCategory] = useState('todos');
    const [uniqueCategories, setUniqueCategories] = useState([]);
    const [filteredProducts, setFilteredProducts] = useState(allProducts);

    useEffect(() => {
        const categories = ['todos', ...new Set(allProducts.map(p => p.category).filter(Boolean))];
        setUniqueCategories(categories);
    }, [allProducts]);

    useEffect(() => {
        if (selectedCategory === 'todos') { setFilteredProducts(allProducts); }
        else { setFilteredProducts(allProducts.filter(p => p.category === selectedCategory)); }
    }, [selectedCategory, allProducts]);

    return (
        <>
            <Head><title>Productos - Vida Animada</title> <link rel="icon" href="/logo-vidaanimada.png" /></Head>
            <Header />
            <main>
                <section className="page-section">
                    <h1>Explora Nuestros Productos</h1>
                    <div className="filter-container">{/* ... */}</div>
                    <div className="product-grid">
                        {products.map((product) => (
                            <Link href={`/productos/${product.id}`} key={product.id}>
                                <div className="product-card" style={{ cursor: 'pointer' }}>

                                    {/* --- LA LÍNEA VA AQUÍ, DENTRO DE LA TARJETA --- */}
                                    {product.tag && <span className="product-tag">{product.tag}</span>}

                                    <Image
                                        src={product.product_variants[0]?.image_url || '/placeholder.png'}
                                        alt={product.name}
                                        width={300}
                                        height={280}
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

export async function getStaticProps() {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    const { data: allProducts } = await supabase.from('products').select('*, product_variants(*)');
    return { props: { allProducts: allProducts || [] }, revalidate: 10 };
}