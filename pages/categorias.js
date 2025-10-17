// pages/categorias.js
import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import { useState, useEffect } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';

const PRODUCTS_PER_PAGE = 12;
// Supabase client initialization (outside component)
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
export default function CategoriasPage({ initialProducts, totalProducts, error: initialError }) {
    const [selectedCategory, setSelectedCategory] = useState('todos');
    const [uniqueCategories, setUniqueCategories] = useState([]);
    const [products, setProducts] = useState(initialProducts || []);
    const [currentPage, setCurrentPage] = useState(1);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [hasMorePages, setHasMorePages] = useState((initialProducts?.length || 0) < totalProducts);
    const [currentTotal, setCurrentTotal] = useState(totalProducts);

    // --- NUEVO ESTADO PARA ORDENACIÓN ---
    const [sortBy, setSortBy] = useState('default');
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

    // --- FUNCIÓN GENÉRICA PARA CARGAR PRODUCTOS (Refactorizada) ---
    const fetchProductsPage = async (page = 1, category = selectedCategory, sort = sortBy) => {
        setIsLoadingMore(true); // Siempre mostrar carga al iniciar fetch
        setHasMorePages(false); // Asumir que no hay más hasta confirmar

        try {
            const response = await fetch(`/api/products?page=${page}&category=${category}&sort=${sort}`);
            if (!response.ok) throw new Error('Error al cargar productos desde API');
            const data = await response.json();

            // Si es la página 1, reemplaza los productos; si no, añade
            setProducts(page === 1 ? data.products : prev => [...prev, ...data.products]);
            setCurrentPage(page);
            setHasMorePages(data.hasNextPage);
            setCurrentTotal(data.totalProducts);

        } catch (error) {
            console.error("Error en fetchProductsPage:", error);
            // Considera mostrar un mensaje de error al usuario
            if (page === 1) { // Si falla la carga inicial/filtro, muestra fallback
                setProducts(initialProducts || []);
                setHasMorePages((initialProducts?.length || 0) < totalProducts);
                setCurrentTotal(totalProducts);
            }
        } finally {
            setIsLoadingMore(false);
        }
    };

    // --- FUNCIÓN PARA CARGAR MÁS ---
    const loadMoreProducts = () => {
        if (!isLoadingMore && hasMorePages) {
            fetchProductsPage(currentPage + 1, selectedCategory, sortBy);
        }
    };

    // --- MANEJADOR CAMBIO DE CATEGORÍA ---
    const handleCategoryChange = (newCategory) => {
        setSelectedCategory(newCategory);
        fetchProductsPage(1, newCategory, sortBy); // Carga página 1 con nueva categoría
    };

    // --- NUEVO MANEJADOR CAMBIO DE ORDENACIÓN ---
    const handleSortChange = (newSortBy) => {
        setSortBy(newSortBy);
        fetchProductsPage(1, selectedCategory, newSortBy); // Carga página 1 con nueva ordenación
    };

    // Helper para imagen (sin cambios)
    const getProductImage = (product) => { /* ... tu función getProductImage ... */ };

    return (
        <>
            {/* ... (Head, Header) ... */}
            <main>
                <section className="page-section">
                    <h1>Explora Nuestros Productos</h1>
                    <p className="subtitle">Utiliza los filtros para encontrar tus productos favoritos.</p>
                    {initialError && <p className="error-message">{initialError}</p>}

                    {/* --- CONTENEDOR DE FILTROS ACTUALIZADO --- */}
                    <div className="filter-controls-container"> {/* Nuevo contenedor para agrupar */}
                        <div className="filter-container">
                            <label htmlFor="category-filter">Categoría:</label>
                            <select
                                id="category-filter"
                                value={selectedCategory}
                                onChange={(e) => handleCategoryChange(e.target.value)}
                                disabled={isLoadingMore}
                            >
                                {uniqueCategories.map(cat => (<option key={cat} value={cat}>{/*...*/}</option>))}
                            </select>
                        </div>
                        {/* --- NUEVO SELECT DE ORDENACIÓN --- */}
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
                        {/* Conteo de productos */}
                        <div className="product-count-display">
                            <span>Mostrando {products.length} de {currentTotal}</span>
                        </div>
                    </div>

                    {/* Grilla de Productos (sin cambios internos) */}
                    <div className="product-grid">
                        {/* ... tu .map(product => ...) ... */}
                    </div>

                    {/* Controles de Paginación (sin cambios internos) */}
                    <div className="pagination-controls" style={{ /*...*/ }}>
                        {/* ... tu lógica isLoadingMore / hasMorePages ... */}
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