// pages/productos/[id].js
import Head from 'next/head';
import Image from 'next/image';
import { createClient } from '@supabase/supabase-js';
import { useState, useEffect, useMemo } from 'react';
import { useCart } from '../../context/CartContext';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { useRouter } from 'next/router'; // Importa useRouter

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export default function ProductPage({ product }) {
    const { addToCart } = useCart();
    const router = useRouter(); // Hook para manejar errores de carga

    // Si el producto no se encontró (viene como null desde getStaticProps con fallback)
    if (router.isFallback) {
        return <div>Cargando producto...</div>;
    }
    if (!product) {
        // Puedes mostrar un mensaje más amigable o redirigir
        useEffect(() => {
            router.push('/404'); // Redirige a la página 404 si no hay producto
        }, [router]);
        return null; // No renderiza nada mientras redirige
    }
    
    // Estados para las selecciones del usuario (inicialización segura)
    const [selectedColor, setSelectedColor] = useState(product.product_colors?.[0] || null);
    const [selectedVariant, setSelectedVariant] = useState(null); // Cambiamos de selectedSize a selectedVariant

    // Derivamos listas únicas de colores y talles disponibles
    const availableColors = useMemo(() => product.product_colors || [], [product.product_colors]);
    
    const availableSizes = useMemo(() => {
        // Si no hay color seleccionado O no hay variantes para ese color, devuelve vacío
        if (!selectedColor || !selectedColor.product_variants) return [];
        // Filtra talles únicos para el color seleccionado
        return [...new Set(selectedColor.product_variants.map(v => v.size).filter(Boolean))];
    }, [selectedColor]);

    // Talle seleccionado (estado separado)
    const [selectedSizeName, setSelectedSizeName] = useState(null);

    // Efecto para setear la selección inicial de color
    useEffect(() => {
        if (availableColors.length > 0 && !selectedColor) {
            setSelectedColor(availableColors[0]);
        }
    }, [availableColors, selectedColor]);
    
    // Efecto para setear/resetear talle cuando cambia el color o los talles disponibles
    useEffect(() => {
        if (availableSizes.length > 0) {
            setSelectedSizeName(availableSizes[0]); // Selecciona el primer talle disponible
        } else {
            setSelectedSizeName(null); // No hay talles disponibles
        }
    }, [selectedColor, availableSizes]); // Se ejecuta cuando cambia el color

    // Efecto para encontrar la variante específica basada en color y nombre de talle
    useEffect(() => {
        if (selectedColor && selectedSizeName) {
            const variant = selectedColor.product_variants?.find(v => v.size === selectedSizeName);
            setSelectedVariant(variant || null);
        } else if (selectedColor && availableSizes.length === 0) {
            // Caso producto simple (asociado a un color "Default" sin talles)
            setSelectedVariant(selectedColor.product_variants?.[0] || null);
        }
         else {
            setSelectedVariant(null);
        }
    }, [selectedColor, selectedSizeName, availableSizes]);


    const handleAddToCart = () => {
        // Asegúrate de que selectedVariant exista y tenga stock
        if (selectedVariant && selectedVariant.stock > 0) {
            addToCart({
                id: selectedVariant.id, // ID único de la variante
                name: product.name,
                price: product.base_price,
                image_url: selectedColor.image_url, // Imagen del color
                color_name: selectedColor.color_name,
                size: selectedVariant.size
            });
            alert(`${product.name} (${selectedColor.color_name}${selectedVariant.size ? ' / ' + selectedVariant.size : ''}) agregado al carrito!`);
        } else {
            alert("Selección no disponible o sin stock.");
        }
    };
    
    // Ya no necesitamos la comprobación !product aquí gracias al manejo de fallback

    return (
        <>
            <Head><title>{product.name} - Vida Animada</title></Head>
            <Header />
            <main>
                <section className="page-section">
                    <div className="product-detail-layout">
                        <div className="product-image-section">
                            <Image 
                                src={selectedColor?.image_url || '/logo-vidaanimada.png'} 
                                alt={product.name}
                                width={500} height={500}
                                style={{ objectFit: 'cover', borderRadius: '15px' }}
                                key={selectedColor?.id} // Forza re-renderizado al cambiar color
                                priority // Carga esta imagen importante más rápido
                            />
                        </div>
                        <div className="product-info-section">
                            <h1>{product.name}</h1>
                            <p className="price">${product.base_price}</p>
                            <p className="description">{product.description || "Descripción no disponible."}</p>
                            
                            {/* Selector de Color (solo si hay más de un color o si el único color no es 'Default') */}
                            {availableColors.length > 0 && !(availableColors.length === 1 && availableColors[0].color_name === 'Default') && (
                                <div className="variant-selector">
                                    <label>Color: <b>{selectedColor?.color_name}</b></label>
                                    <div className="color-swatch-list">
                                        {availableColors.map(color => (
                                            <button key={color.id}
                                                className={`color-swatch ${selectedColor?.id === color.id ? 'active' : ''}`}
                                                style={{ backgroundColor: color.color_hex || '#ccc' }}
                                                onClick={() => setSelectedColor(color)}
                                                title={color.color_name}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Selector de Talle (solo si hay talles disponibles para el color actual y no es 'Único') */}
                            {availableSizes.length > 0 && !(availableSizes.length === 1 && availableSizes[0] === 'Único') && (
                                <div className="variant-selector">
                                    <label>Talle:</label>
                                    <div className="size-button-list">
                                        {availableSizes.map(size => (
                                            <button key={size}
                                                className={`size-button ${selectedSizeName === size ? 'active' : ''}`}
                                                // Deshabilita si la variante específica para este talle no tiene stock
                                                disabled={selectedColor.product_variants?.find(v => v.size === size)?.stock === 0}
                                                onClick={() => setSelectedSizeName(size)}
                                            >
                                                {size}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                            
                            <div className="stock-info">
                                {selectedVariant?.stock > 0 ? `${selectedVariant.stock} unidades disponibles` : 'Sin stock'}
                            </div>

                            <button onClick={handleAddToCart} className="btn-primary add-to-cart-btn" disabled={!selectedVariant || selectedVariant.stock === 0}>
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

export async function getStaticPaths() {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    // Aseguramos que solo generamos paths para productos existentes
    const { data: products, error } = await supabase.from('products').select('id');
    if (error || !products) {
        console.error("Error fetching product ids for static paths:", error);
        return { paths: [], fallback: 'blocking' };
    }
    const paths = products.map(product => ({ params: { id: product.id.toString() } }));
    return { paths, fallback: 'blocking' }; // fallback: 'blocking' intentará generar la página si no existe
}

export async function getStaticProps({ params }) {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    
    // --- CONSULTA CORREGIDA Y MÁS ROBUSTA ---
    const { data: product, error } = await supabase
        .from('products')
        .select(`
            *,
            product_colors (
                *,
                product_variants (*)
            )
        `)
        .eq('id', params.id)
        .maybeSingle(); // Usa maybeSingle() para manejar el caso donde el producto no existe (devuelve null en vez de error)
    
    if (error) {
        console.error(`Error fetching product with id ${params.id}:`, error);
        // Si hay error (distinto de producto no encontrado), no encontramos la página
        return { notFound: true };
    }
        
    // Si maybeSingle() devolvió null, significa que el producto no existe
    if (!product) {
        return { notFound: true };
    }
    
    return { props: { product }, revalidate: 10 }; // revalidate cada 10 seg
}