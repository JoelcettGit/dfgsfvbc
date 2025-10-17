// pages/categorias.js
import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import { useState, useEffect } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function CategoriasPage({ allProducts }) {
    const [selectedCategory, setSelectedCategory] = useState('todos');
    const [uniqueCategories, setUniqueCategories] = useState([]);
    const [filteredProducts, setFilteredProducts] = useState(allProducts);

    useEffect(() => {
        const categories = ['todos', ...new Set(allProducts.map(p => p.category).filter(Boolean))];
        setUniqueCategories(categories);
    }, [allProducts]);

    useEffect(() => {
        if (selectedCategory === 'todos') {
            setFilteredProducts(allProducts);
        } else {
            setFilteredProducts(allProducts.filter(p => p.category === selectedCategory));
        }
    }, [selectedCategory, allProducts]);

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
                                    <Image src={product.product_colors[0]?.image_url || '/logo-vidaanimada.png'} alt={product.name} width={300} height={280} style={{ objectFit: 'cover' }} />
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
    
    // LA CORRECCIÓN CLAVE ESTÁ AQUÍ
    const { data: allProducts } = await supabase
      .from('products')
      .select(`
        *,
        product_colors (
            *,
            product_variants (*)
        )
      `);

    return { props: { allProducts: allProducts || [] }, revalidate: 10 };
}