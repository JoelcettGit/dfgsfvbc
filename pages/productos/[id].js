// pages/productos/[id].js
import { createClient } from '@supabase/supabase-js';
import Head from 'next/head';
import Image from 'next/image';
import { useState, useEffect, useMemo } from 'react';
import { useCart } from '../../context/CartContext';
import Header from '../../components/Header';
import Footer from '../../components/Footer';

// --- CONEXIÓN SUPABASE (NO CAMBIA) ---
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

// --- COMPONENTE DE PÁGINA REFACTORIZADO ---
export default function ProductPage({ product }) {
    const { addToCart } = useCart();

    // Renombramos 'selectedSize' a 'selectedVariant' para más claridad
    const [selectedColor, setSelectedColor] = useState(null);
    const [selectedVariant, setSelectedVariant] = useState(null);

    // --- LÓGICA DE VARIANTES REESCRITA ---

    // 1. Derivar colores ÚNICOS desde el array plano de variantes
    const availableColors = useMemo(() => {
        // Si no hay variantes, devolvemos un array vacío
        if (!product.has_variants || !product.product_variants) return [];
        
        const colors = new Map();
        product.product_variants.forEach(variant => {
            // Usamos el 'color_name' como clave única
            if (!colors.has(variant.color_name)) {
                colors.set(variant.color_name, {
                    color_name: variant.color_name,
                    color_hex: variant.color_hex,
                    // Asignamos la imagen de esta variante como la imagen "representativa" del color
                    image_url: variant.variant_image_url || product.image_url // Fallback a la imagen principal
                });
            }
        });
        return Array.from(colors.values()); // [ {color_name, color_hex, image_url}, ... ]
    }, [product.product_variants, product.has_variants, product.image_url]);

    // 2. Derivar talles (variantes) DISPONIBLES para el color seleccionado
    const variantsForSelectedColor = useMemo(() => {
        if (!selectedColor) return [];
        // Filtramos las variantes que coinciden con el nombre del color seleccionado
        return product.product_variants.filter(
            variant => variant.color_name === selectedColor.color_name
        );
    }, [selectedColor, product.product_variants]);

    // --- FIN DE LÓGICA REESCRITA ---

    // 3. Efectos para setear valores por defecto
    useEffect(() => {
        // Setear color por defecto al cargar (solo para productos variables)
        if (product.has_variants && availableColors.length > 0 && !selectedColor) {
            setSelectedColor(availableColors[0]);
        }
    }, [product.has_variants, availableColors, selectedColor]);

    useEffect(() => {
        // Setear talle (variante) por defecto cuando cambia el color
        if (variantsForSelectedColor.length > 0) {
            // UX Mejorada: seleccionar el primero CON stock
            const firstAvailable = variantsForSelectedColor.find(v => v.stock > 0);
            setSelectedVariant(firstAvailable || variantsForSelectedColor[0]);
        } else {
            setSelectedVariant(null);
        }
    }, [variantsForSelectedColor]);

    // --- MANEJADOR DE AGREGAR AL CARRITO (ACTUALIZADO) ---
    const handleAddToCart = () => {
        if (product.has_variants) {
            // Lógica para producto variable
            if (selectedColor && selectedVariant && selectedVariant.stock > 0) {
                addToCart({
                    id: selectedVariant.id, // ID único de la variante
                    name: product.name,
                    price: product.base_price, // Usamos precio base (ajustar si tienes precio por variante)
                    image_url: selectedVariant.variant_image_url || selectedColor.image_url,
                    color_name: selectedColor.color_name,
                    size: selectedVariant.size
                });
                alert(`${product.name} (${selectedColor.color_name} / ${selectedVariant.size}) fue agregado al carrito!`);
            } else {
                alert("Selección no disponible o sin stock.");
            }
        } else {
            // Lógica para producto simple
            if (product.stock > 0) {
                 addToCart({
                    id: product.id, // ID único del producto
                    name: product.name,
                    price: product.base_price,
                    image_url: product.image_url,
                    // No hay variantes, así que no pasamos color/size
                });
                alert(`${product.name} fue agregado al carrito!`);
            } else {
                alert("Producto sin stock.");
            }
        }
    };

    if (!product) return <div>Cargando...</div>;

    // Determinamos qué imagen mostrar (importante para el 'key' de Next/Image)
    const displayImage = product.has_variants ? (selectedColor?.image_url || product.image_url) : product.image_url;
    const displayImageKey = product.has_variants ? selectedColor?.color_name : product.id;

    return (
        <>
            <Head><title>{product.name} - Vida Animada</title></Head>
            <Header />
            <main>
                <section className="page-section">
                    <div className="product-detail-layout">
                        
                        <div className="product-image-section">
                            <Image
                                src={displayImage || '/logo-vidaanimada.png'}
                                alt={product.name}
                                width={500} height={500}
                                style={{ objectFit: 'cover', borderRadius: '15px' }}
                                key={displayImageKey} // Forzamos refresh de la imagen al cambiar de color
                                priority // Cargar esta imagen primero
                            />
                        </div>
                        
                        <div className="product-info-section">
                            <h1>{product.name}</h1>
                            <p className="price">${product.base_price}</p>
                            <p className="description">{product.description}</p>

                            {/* --- RENDERIZADO DE VARIANTES (ACTUALIZADO) --- */}
                            
                            {product.has_variants ? (
                                <>
                                    {/* Selector de Color */}
                                    <div className="variant-selector">
                                        <label>Color: <b>{selectedColor?.color_name}</b></label>
                                        <div className="color-swatch-list">
                                            {availableColors.map(color => (
                                                <button key={color.color_name}
                                                    className={`color-swatch ${selectedColor?.color_name === color.color_name ? 'active' : ''}`}
                                                    style={{ backgroundColor: color.color_hex || '#ccc' }}
                                                    onClick={() => setSelectedColor(color)}
                                                    title={color.color_name}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                
                                    {/* Selector de Talle */}
                                    {variantsForSelectedColor.length > 0 && (
                                        <div className="variant-selector">
                                            <label>Talle:</label>
                                            <div className="size-button-list">
                                                {variantsForSelectedColor.map(variant => (
                                                    <button key={variant.id}
                                                        className={`size-button ${selectedVariant?.id === variant.id ? 'active' : ''} ${variant.stock === 0 ? 'disabled' : ''}`}
                                                        onClick={() => setSelectedVariant(variant)}
                                                        disabled={variant.stock === 0} // Deshabilitar si no hay stock
                                                        title={variant.stock === 0 ? 'Sin stock' : ''}
                                                    >
                                                        {variant.size}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Info de Stock (Variable) */}
                                    <div className="stock-info">
                                        {selectedVariant ? 
                                            (selectedVariant.stock > 0 ? `${selectedVariant.stock} unidades disponibles` : 'Sin stock') : 
                                            'Selecciona un talle'
                                        }
                                    </div>
                                </>
                            ) : (
                                /* Info de Stock (Simple) */
                                <div className="stock-info">
                                    {product.stock > 0 ? `${product.stock} unidades disponibles` : 'Sin stock'}
                                </div>
                            )}

                            {/* Botón de Agregar al Carrito (controla ambos casos) */}
                            <button 
                                onClick={handleAddToCart} 
                                className="btn-primary add-to-cart-btn" 
                                disabled={
                                    (product.has_variants && (!selectedVariant || selectedVariant.stock === 0)) ||
                                    (!product.has_variants && product.stock === 0)
                                }
                            >
                                Agregar al Carrito
                            </button>
                        </div>
                    </div>
                </section>
            </main>
            <Footer />
        </>
    );
}

// --- GENERACIÓN DE PÁGINAS (NO CAMBIA) ---
export async function getStaticPaths() {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    const { data: products, error } = await supabase.from('products').select('id');
    if (error || !products) return { paths: [], fallback: 'blocking' };
    const paths = products.map(product => ({ params: { id: product.id.toString() } }));
    return { paths, fallback: 'blocking' };
}

// --- GETSTATICPROPS (CON CONSULTA CORREGIDA) ---
export async function getStaticProps({ params }) {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    
    // CONSULTA CORREGIDA (Punto 1)
    const { data: product, error } = await supabase
        .from('products')
        .select(`
            *,
            product_variants (*)
        `)
        .eq('id', params.id)
        .single();
    
    if (error) {
        console.error(`Error fetching product with id ${params.id}:`, error.message);
    }
        
    if (!product) {
        return { notFound: true };
    }
    
    // Recomiendo un revalidate más alto, 10 segundos es muy agresivo si no cambia tanto.
    // 60 segundos (1 minuto) o incluso 300 (5 minutos) es más razonable.
    return { props: { product }, revalidate: 60 };
}