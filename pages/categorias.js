// pages/categorias.js
import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import { useState, useEffect } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';

// Constante para paginación
const PRODUCTS_PER_PAGE = 12;

// Cliente Supabase (solo para fetchCategories en el cliente)
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export default function CategoriasPage({ initialProducts, totalProducts, error: initialError }) {
    const [selectedCategory, setSelectedCategory] = useState('todos');
    const [uniqueCategories, setUniqueCategories] = useState(['todos']); // Inicia con 'todos'
    const [products, setProducts] = useState(initialProducts || []);
    const [currentPage, setCurrentPage] = useState(1);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [hasMorePages, setHasMorePages] = useState((initialProducts?.length || 0) < totalProducts);
    const [currentTotal, setCurrentTotal] = useState(totalProducts);
    const [sortBy, setSortBy] = useState('default');

    // Efecto para obtener categorías únicas al montar
    useEffect(() => {
        const fetchCategories = async () => {
            try {
                // Query optimizada para obtener solo categorías distintas y no nulas
                const { data: categoriesData, error } = await supabase
                    .from('products')
                    .select('category')
                    .neq('category', null) // No traer productos sin categoría
                    .neq('category', '');   // No traer productos con categoría vacía

                if (error) throw error;

                // Crear lista única y añadir 'todos' al principio
                const categories = ['todos', ...new Set(categoriesData.map(p => p.category))];
                setUniqueCategories(categories);

            } catch (err) {
                console.error("Error fetching distinct categories:", err.message);
                // Mantener solo 'todos' si falla
                setUniqueCategories(['todos']);
            }
        };
        fetchCategories();
    }, []); // Array vacío, corre solo una vez

    // Función genérica para cargar productos desde la API
    const fetchProductsPage = async (page = 1, category = selectedCategory, sort = sortBy) => {
        setIsLoadingMore(true);
        setHasMorePages(false);

        try {
            const response = await fetch(`/api/products?page=${page}&category=${category}&sort=${sort}`);
            if (!response.ok) {
                const errorData = await response.json(); // Intenta leer el error de la API
                throw new Error(errorData.message || 'Error al cargar productos desde API');
            }
            const data = await response.json();

            setProducts(page === 1 ? data.products : prev => [...prev, ...data.products]);
            setCurrentPage(page);
            setHasMorePages(data.hasNextPage);
            setCurrentTotal(data.totalProducts);

        } catch (error) {
            console.error("Error en fetchProductsPage:", error.message);
            // Mostrar error al usuario sería ideal aquí
            if (page === 1) { // Fallback si falla carga inicial/filtro
                setProducts(initialProducts || []);
                setHasMorePages((initialProducts?.length || 0) < totalProducts);
                setCurrentTotal(totalProducts);
            }
        } finally {
            setIsLoadingMore(false);
        }
    };

    // Cargar más productos
    const loadMoreProducts = () => {
        if (!isLoadingMore && hasMorePages) {
            fetchProductsPage(currentPage + 1, selectedCategory, sortBy);
        }
    };

    // Cambiar categoría
    const handleCategoryChange = (newCategory) => {
        if (isLoadingMore) return; // Evita cambios mientras carga
        setSelectedCategory(newCategory);
        fetchProductsPage(1, newCategory, sortBy);
    };

    // Cambiar ordenación
    const handleSortChange = (newSortBy) => {
        if (isLoadingMore) return; // Evita cambios mientras carga
        setSortBy(newSortBy);
        fetchProductsPage(1, selectedCategory, newSortBy);
    };

    // Helper COMPLETO para obtener imagen
    const getProductImage = (product) => {
        switch (product?.product_type) { // Añade '?' por seguridad
            case 'SIMPLE':
                return product.image_url || '/logo-vidaanimada.png';
            case 'VARIANT':
                // Busca la primera variante que TENGA imagen, si no, usa fallback
                const firstVariantWithImage = product.product_variants?.find(v => v.variant_image_url);
                return firstVariantWithImage?.variant_image_url || '/logo-vidaanimada.png';
            case 'BUNDLE':
                // Busca la imagen de la variante del primer componente, si no, fallback
                return product.bundle_links?.[0]?.product_variants?.variant_image_url || '/logo-vidaanimada.png';
            default:
                return '/logo-vidaanimada.png';
        }
    };

    return (
        <>
            <Head>
                <title>Productos | Vida Animada</title>
                <link rel="icon" href="/logo-vidaanimada.png" />
            </Head>
            <Header />
            <main>
                <section className="page-section">
                    <h1>Explora Nuestros Productos</h1>
                    <p className="subtitle">Utiliza los filtros para encontrar tus productos favoritos.</p>
                    {initialError && <p className="error-message">{initialError}</p>}

                    {/* Contenedor de Filtros */}
                    <div className="filter-controls-container">
                        <div className="filter-container">
                            <label htmlFor="category-filter">Categoría:</label>
                            <select
                                id="category-filter"
                                value={selectedCategory}
                                onChange={(e) => handleCategoryChange(e.target.value)}
                                disabled={isLoadingMore}
                            >
                                {uniqueCategories.map(cat => (
                                    <option key={cat} value={cat}>
                                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="filter-container">
                            <label htmlFor="sort-filter">Ordenar por:</label>
                            <select
                                id="sort-filter"
                                value={sortBy}
                                onChange={(e) => handleSortChange(e.target.value)}
                                disabled={isLoadingMore}
                            >
                                <option value="default">Relevancia</option>
                                <option value="price-asc">Precio: Menor a Mayor</option>
                                <option value="price-desc">Precio: Mayor a Menor</option>
                                <option value="name-asc">Nombre: A-Z</option>
                            </select>
                        </div>
                        <div className="product-count-display">
                            <span>Mostrando {products.length} de {currentTotal}</span>
                        </div>
                    </div>

                    {/* Grilla de Productos */}
                    <div className="product-grid">
                        {/* Verificación extra por si products es null/undefined */}
                        {(products || []).map((product) => (
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

                    {/* Controles de Paginación */}
                    <div className="pagination-controls" style={{ marginTop: '2rem', textAlign: 'center' }}>
                        {isLoadingMore ? (
                            <p>Cargando...</p>
                        ) : hasMorePages ? (
                            <button onClick={loadMoreProducts} className="btn-primary">
                                Cargar más productos
                            </button>
                        ) : (
                            // Muestra mensaje solo si hay productos cargados
                            products.length > 0 && currentTotal > 0 && <p>Has llegado al final.</p>
                        )}
                        {/* Muestra mensaje si no hay productos en absoluto para la categoría/filtro */}
                        {!isLoadingMore && products.length === 0 && currentTotal === 0 && (
                            <p>No hay productos que coincidan con los filtros seleccionados.</p>
                        )}
                    </div>
                </section>
            </main>
            <Footer />
        </>
    );
}

// --- getStaticProps (SIN CAMBIOS) ---
export async function getStaticProps() {
    // Re-inicializa cliente aquí por scope de server-side
    const supabase_server = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    try {
        const { data: initialProducts, error, count } = await supabase_server
            .from('products')
            .select(`id, name, base_price, product_type, image_url, category, tag, product_variants(variant_image_url), bundle_links(product_variants(variant_image_url))`, { count: 'exact' })
            .order('id', { ascending: false })
            .range(0, PRODUCTS_PER_PAGE - 1);
        if (error) throw error;
        return { props: { initialProducts: initialProducts || [], totalProducts: count || 0 }, revalidate: 60 };
    } catch (error) {
        console.error("Error fetching initial categories products:", error.message);
        return { props: { initialProducts: [], totalProducts: 0, error: "Error al cargar productos." } };
    }
}