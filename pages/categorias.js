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
// --- CONSTANTE PARA PAGINACIÓN ---
const PRODUCTS_PER_PAGE = 12; // Define cuántos productos cargar por página
export default function CategoriasPage({ initialProducts, totalProducts, error: initialError }) { // <-- Recibe nuevas props
    const [selectedCategory, setSelectedCategory] = useState('todos');
    const [uniqueCategories, setUniqueCategories] = useState([]);

    // --- ESTADOS PARA PAGINACIÓN ---
    const [products, setProducts] = useState(initialProducts || []); // Lista acumulada de productos
    const [currentPage, setCurrentPage] = useState(1);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [hasMorePages, setHasMorePages] = useState((initialProducts?.length || 0) < totalProducts); // ¿Hay más desde el inicio?
    const [currentTotal, setCurrentTotal] = useState(totalProducts); // Total (puede cambiar con filtro)

    // Efecto para obtener categorías únicas (solo se ejecuta una vez al inicio)
    useEffect(() => {
        const fetchCategories = async () => {
            // Podríamos hacer una query distinct a Supabase, pero si ya tenemos todos los productos
            // en algún punto (o podemos traerlos rápido), esto funciona.
            // O MEJOR: hacer una query específica para categorías distintas.
            try {
                // Query para obtener categorías distintas directamente
                const supabaseClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
                const { data: categoriesData, error } = await supabaseClient
                    .from('products')
                    .select('category')

                if (error) throw error;

                const categories = ['todos', ...new Set(categoriesData.map(p => p.category).filter(Boolean))];
                setUniqueCategories(categories);

            } catch (err) {
                console.error("Error fetching distinct categories:", err);
                setUniqueCategories(['todos']); // Fallback
            }
        };
        fetchCategories();
    }, []); // Array vacío para que corra solo al montar

    // --- FUNCIÓN PARA CARGAR MÁS PRODUCTOS ---
    const loadMoreProducts = async () => {
        if (isLoadingMore || !hasMorePages) return; // Evita cargas múltiples

        setIsLoadingMore(true);
        const nextPage = currentPage + 1;

        try {
            // Llama a nuestra nueva API
            const response = await fetch(`/api/products?page=${nextPage}&category=${selectedCategory}`);
            if (!response.ok) throw new Error('Error al cargar más productos');

            const data = await response.json();

            // Añade los nuevos productos a la lista existente
            setProducts(prevProducts => [...prevProducts, ...data.products]);
            setCurrentPage(nextPage);
            setHasMorePages(data.hasNextPage); // Actualiza si hay más páginas
            setCurrentTotal(data.totalProducts); // Actualiza el total (por si cambió el filtro)

        } catch (error) {
            console.error("Error en loadMoreProducts:", error);
            // Podríamos mostrar un mensaje de error al usuario
        } finally {
            setIsLoadingMore(false);
        }
    };

    // --- FUNCIÓN PARA MANEJAR CAMBIO DE CATEGORÍA ---
    const handleCategoryChange = async (newCategory) => {
        setSelectedCategory(newCategory);
        setProducts([]); // Limpia productos actuales
        setCurrentPage(1); // Resetea a página 1
        setIsLoadingMore(true); // Muestra estado de carga
        setHasMorePages(false); // Asume que no hay más hasta que la API responda

        try {
            // Llama a la API para la página 1 de la nueva categoría
            const response = await fetch(`/api/products?page=1&category=${newCategory}`);
            if (!response.ok) throw new Error('Error al cambiar categoría');

            const data = await response.json();

            setProducts(data.products || []);
            setHasMorePages(data.hasNextPage);
            setCurrentTotal(data.totalProducts);

        } catch (error) {
            console.error("Error en handleCategoryChange:", error);
            setProducts(initialProducts || []); // Fallback a los iniciales si falla
            setHasMorePages((initialProducts?.length || 0) < totalProducts);
            setCurrentTotal(totalProducts);
        } finally {
            setIsLoadingMore(false);
        }
    };


    // Helper para imagen (sin cambios)
    const getProductImage = (product) => { /* ... tu función getProductImage ... */ };

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
                    {initialError && <p className="error-message">{initialError}</p>} {/* Muestra error inicial si existe */}
                    <div className="filter-container">
                        <select
                            id="category-filter"
                            value={selectedCategory}
                            // Llama a la nueva función al cambiar
                            onChange={(e) => handleCategoryChange(e.target.value)}
                            disabled={isLoadingMore} // Deshabilita mientras carga
                        >
                            {uniqueCategories.map(cat => (
                                <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
                            ))}
                        </select>
                        {/* Muestra conteo actual vs total */}
                        <span>Mostrando {products.length} de {currentTotal} productos</span>
                    </div>

                    {/* Grilla de Productos */}
                    <div className="product-grid">
                        {products.map((product) => (
                            <Link href={`/productos/${product.id}`} key={product.id} passHref>
                                <div className="product-card" style={{ cursor: 'pointer' }}>
                                    {product.tag && <span className="product-tag">{product.tag}</span>}
                                    <Image src={getProductImage(product)} alt={product.name} width={300} height={280} style={{ objectFit: 'cover' }} />
                                    <h4>{product.name}</h4>
                                    <p className="price">Desde ${product.base_price}</p>
                                </div>
                            </Link>
                        ))}
                    </div>

                    {/* Botón Cargar Más y Estado de Carga */}
                    <div className="pagination-controls" style={{ marginTop: '2rem', textAlign: 'center' }}>
                        {isLoadingMore ? (
                            <p>Cargando...</p>
                        ) : hasMorePages ? (
                            <button onClick={loadMoreProducts} className="btn-primary">
                                Cargar más productos
                            </button>
                        ) : (
                            products.length > 0 && <p>Has llegado al final.</p> // Mensaje al final
                        )}
                    </div>

                </section>
            </main>
            <Footer />
        </>
    );
}

// --- getStaticProps (ACTUALIZADO para paginación inicial) ---
export async function getStaticProps() {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

    try {
        const { data: initialProducts, error, count } = await supabase
            .from('products')
            .select(`
              id, name, base_price, product_type, image_url, category, tag,
              product_variants (variant_image_url),
              bundle_links ( product_variants ( variant_image_url ) )
          `, { count: 'exact' }) // <-- Pide el conteo total
            .order('id', { ascending: false }) // O ordena por 'created_at', etc.
            .range(0, PRODUCTS_PER_PAGE - 1); // <-- Carga solo la primera página

        if (error) throw error;

        // Pasamos los productos iniciales y el conteo total a la página
        return {
            props: {
                initialProducts: initialProducts || [],
                totalProducts: count || 0, // <-- Total de productos
            },
            revalidate: 60
        };

    } catch (error) {
        console.error("Error fetching initial categories products:", error.message);
        return { props: { initialProducts: [], totalProducts: 0, error: "Error al cargar productos." } };
    }
}