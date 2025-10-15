// pages/productos/[id].js
import Head from 'next/head';
import Image from 'next/image';
import { createClient } from '@supabase/supabase-js';
import { useState, useEffect } from 'react';
import { useCart } from '../../context/CartContext';
import Header from '../../components/Header';
import Footer from '../../components/Footer';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export default function ProductPage({ product }) {
    const { addToCart } = useCart();
    
    // Estados para las selecciones del usuario
    const [selectedColor, setSelectedColor] = useState(null);
    const [selectedSize, setSelectedSize] = useState(null);
    const [currentVariant, setCurrentVariant] = useState(null);

    // Derivamos listas únicas de colores y talles disponibles
    const availableColors = [...new Set(product.product_variants.map(v => v.color_name).filter(Boolean))];
    const availableSizes = selectedColor 
        ? [...new Set(product.product_variants.filter(v => v.color_name === selectedColor).map(v => v.size).filter(Boolean))]
        : [...new Set(product.product_variants.map(v => v.size).filter(Boolean))];

    // Efecto para setear la selección inicial
    useEffect(() => {
        if (availableColors.length > 0) setSelectedColor(availableColors[0]);
        if (availableSizes.length > 0) setSelectedSize(availableSizes[0]);
    }, [product]);

    // Efecto para encontrar la variante actual basada en la selección
    useEffect(() => {
        const variant = product.product_variants.find(v => 
            (!v.color_name || v.color_name === selectedColor) && 
            (!v.size || v.size === selectedSize)
        );
        setCurrentVariant(variant);
    }, [selectedColor, selectedSize, product.product_variants]);

    const handleAddToCart = () => {
        if (currentVariant && currentVariant.stock > 0) {
            // Pasamos la info del producto padre y la variante específica al carrito
            addToCart({
                ...product, // name, base_price, etc.
                ...currentVariant, // id de la variante, color, talle, imagen
                id: currentVariant.id // Sobrescribimos el id para que sea el de la variante
            });
            alert(`${product.name} (${selectedColor}, ${selectedSize}) fue agregado al carrito!`);
        } else {
            alert("Este producto no está disponible en la selección actual.");
        }
    };
    
    if (!product) return <div>Cargando...</div>;

    return (
        <>
            <Head><title>{product.name} - Vida Animada</title></Head>
            <Header />
            <main>
                <section className="page-section">
                    <div className="product-detail-layout">
                        <div className="product-image-section">
                            <Image 
                                src={currentVariant?.image_url || product.product_variants[0]?.image_url || '/placeholder.png'} 
                                alt={product.name}
                                width={500}
                                height={500}
                                style={{ objectFit: 'cover', borderRadius: '15px' }}
                            />
                        </div>
                        <div className="product-info-section">
                            <h1>{product.name}</h1>
                            <p className="price">${product.base_price}</p>
                            <p className="description">{product.description}</p>
                            
                            {availableColors.length > 0 && (
                                <div className="variant-selector">
                                    <label>Color: {selectedColor}</label>
                                    <div className="color-swatch-list">
                                        {availableColors.map(color => (
                                            <button key={color}
                                                className={`color-swatch ${selectedColor === color ? 'active' : ''}`}
                                                style={{ backgroundColor: product.product_variants.find(v => v.color_name === color)?.color_hex || '#ccc' }}
                                                onClick={() => setSelectedColor(color)}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {availableSizes.length > 0 && (
                                <div className="variant-selector">
                                    <label>Talle:</label>
                                    <div className="size-button-list">
                                        {availableSizes.map(size => (
                                            <button key={size}
                                                className={`size-button ${selectedSize === size ? 'active' : ''}`}
                                                onClick={() => setSelectedSize(size)}
                                            >
                                                {size}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                            
                            <div className="stock-info">
                                {currentVariant?.stock > 0 ? `${currentVariant.stock} unidades disponibles` : 'Sin stock'}
                            </div>

                            <button onClick={handleAddToCart} className="btn-primary add-to-cart-btn" disabled={!currentVariant || currentVariant.stock === 0}>
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

// Le dice a Next.js qué páginas de productos debe pre-construir
export async function getStaticPaths() {
    const { data: products } = await supabase.from('products').select('id');
    const paths = products.map(product => ({
        params: { id: product.id.toString() },
    }));
    return { paths, fallback: 'blocking' };
}

// Busca los datos para una página de producto específica
export async function getStaticProps({ params }) {
    const { data: product } = await supabase
        .from('products')
        .select('*, product_variants (*)')
        .eq('id', params.id)
        .single();
    return { props: { product }, revalidate: 10 };
}