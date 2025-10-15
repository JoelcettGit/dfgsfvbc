// pages/productos/[id].js
import Head from 'next/head';
import Image from 'next/image';
import { createClient } from '@supabase/supabase-js';
import { useState, useEffect, useMemo } from 'react';
import { useCart } from '../../context/CartContext';
import Header from '../../components/Header';
import Footer from '../../components/Footer';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export default function ProductPage({ product }) {
    const { addToCart } = useCart();
    
    // Estados para las selecciones del usuario
    const [selectedColor, setSelectedColor] = useState(null);
    const [selectedSize, setSelectedSize] = useState(null);

    // Derivamos listas únicas de colores y talles disponibles
    const availableColors = useMemo(() => [...new Set(product.product_variants.map(v => v.color_name).filter(Boolean))], [product.product_variants]);
    
    const availableSizes = useMemo(() => {
        // Si hay colores, muestra solo los talles para el color seleccionado
        if (selectedColor) {
            return [...new Set(product.product_variants.filter(v => v.color_name === selectedColor).map(v => v.size).filter(Boolean))];
        }
        // Si no hay colores, muestra todos los talles disponibles
        return [...new Set(product.product_variants.map(v => v.size).filter(Boolean))];
    }, [selectedColor, product.product_variants]);

    // Efecto para setear la selección inicial cuando la página carga
    useEffect(() => {
        if (availableColors.length > 0 && !selectedColor) {
            setSelectedColor(availableColors[0]);
        }
        if (availableSizes.length > 0 && !selectedSize) {
            setSelectedSize(availableSizes[0]);
        }
    }, [availableColors, availableSizes, selectedColor, selectedSize]);
    
    // Cuando se cambia un color, se resetea el talle al primero disponible para ese color
    useEffect(() => {
        if (availableSizes.length > 0) {
            setSelectedSize(availableSizes[0]);
        }
    }, [selectedColor, availableSizes]);


    // Buscamos la variante que coincide con la selección actual
    const currentVariant = useMemo(() => {
        return product.product_variants.find(v => {
            const colorMatch = availableColors.length === 0 || v.color_name === selectedColor;
            const sizeMatch = availableSizes.length === 0 || v.size === selectedSize;
            return colorMatch && sizeMatch;
        });
    }, [selectedColor, selectedSize, product.product_variants, availableColors, availableSizes]);

    const handleAddToCart = () => {
        if (currentVariant && currentVariant.stock > 0) {
            addToCart({
                id: currentVariant.id, name: product.name, price: product.base_price,
                image_url: currentVariant.image_url, color_name: currentVariant.color_name, size: currentVariant.size
            });
            alert(`${product.name} (${currentVariant.color_name || ''} ${currentVariant.size || ''}) fue agregado al carrito!`);
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
                                src={currentVariant?.image_url || '/logo-vidaanimada.png'} 
                                alt={product.name}
                                width={500} height={500}
                                style={{ objectFit: 'cover', borderRadius: '15px' }}
                                key={currentVariant?.id} // Forza a React a recargar la imagen
                            />
                        </div>
                        <div className="product-info-section">
                            <h1>{product.name}</h1>
                            <p className="price">${product.base_price}</p>
                            <p className="description">{product.description}</p>
                            
                            {availableColors.length > 0 && (
                                <div className="variant-selector">
                                    <label>Color: <b>{selectedColor}</b></label>
                                    <div className="color-swatch-list">
                                        {availableColors.map(color => (
                                            <button key={color}
                                                className={`color-swatch ${selectedColor === color ? 'active' : ''}`}
                                                style={{ backgroundColor: product.product_variants.find(v => v.color_name === color)?.color_hex || '#ccc' }}
                                                onClick={() => setSelectedColor(color)}
                                                title={color}
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

export async function getStaticPaths() {
    const { data: products } = await supabase.from('products').select('id');
    const paths = products.map(product => ({ params: { id: product.id.toString() } }));
    return { paths, fallback: 'blocking' };
}

export async function getStaticProps({ params }) {
    const { data: product } = await supabase.from('products').select('*, product_variants (*)').eq('id', params.id).single();
    return { props: { product }, revalidate: 10 };
}