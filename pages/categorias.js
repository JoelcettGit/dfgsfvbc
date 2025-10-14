// pages/categorias.js
import Head from 'next/head';
import Image from 'next/image';
import { createClient } from '@supabase/supabase-js';
import { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function CategoriasPage({ allProducts }) {
    const { addToCart } = useCart();
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
            <Head><title>Productos - Vida Animada</title></Head>
            <Header />
            <main>
                <section className="page-section">
                    <h1>Explora Nuestros Productos</h1>
                    <p className="subtitle">Utiliza el filtro para encontrar tus productos favoritos.</p>
                    <div className="filter-container">
                        <select id="category-filter" value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
                            {uniqueCategories.map(cat => (<option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>))}
                        </select>
                    </div>
                    <div className="product-grid">
                        {filteredProducts.map((product) => (
                            <div key={product.id} className="product-card">
                                <Image src={product.image_url} alt={product.name} width={300} height={280} style={{ objectFit: 'cover' }}/>
                                <h4>{product.name}</h4>
                                <p className="price">${product.price}</p>
                                <div className="product-card-actions">
                                    <a href={`https://wa.me/3804882298?text=Hola!%20Me%20interesa%20el%20producto:%20${encodeURIComponent(product.name)}`} target="_blank" rel="noopener noreferrer" className="btn-secondary">
                                        ¡Lo quiero!
                                    </a>
                                    <button onClick={() => addToCart(product)} className="btn-primary">
                                        Agregar al Carrito
                                    </button>
                                </div>
                            </div>
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
    const { data: allProducts } = await supabase.from('products').select('*');
    return { props: { allProducts: allProducts || [] }, revalidate: 10 };
}
