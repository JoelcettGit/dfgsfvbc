// pages/productos/[id].js
import { createClient } from '@supabase/supabase-js';
import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect, useMemo } from 'react';
import { useCart } from '../../context/CartContext';
import Header from '../../components/Header';
import Footer from '../../components/Footer';

// Importar Carousel y sus estilos
import "react-responsive-carousel/lib/styles/carousel.min.css";
import { Carousel } from 'react-responsive-carousel';

// Cliente Supabase
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export default function ProductPage({ product, recommendedProducts }) {
    const { addToCart } = useCart();

    // Estados para tipo 'VARIANT'
    const [selectedColor, setSelectedColor] = useState(null);
    const [selectedVariant, setSelectedVariant] = useState(null);
    // Estado para tipo 'BUNDLE' (guarda { linkId: variantId, ... })
    const [selectedBundleVariants, setSelectedBundleVariants] = useState({});
    const [currentSlide, setCurrentSlide] = useState(0);

    // --- Lógica Derivada ---

    // Colores disponibles (solo para 'VARIANT')
    const availableColors = useMemo(() => {
        if (product.product_type !== 'VARIANT' || !product.product_variants) return [];
        const colors = new Map();
        product.product_variants.forEach(variant => {
            if (!colors.has(variant.color_name)) {
                colors.set(variant.color_name, {
                    color_name: variant.color_name,
                    color_hex: variant.color_hex,
                    image_url: variant.variant_image_url || '/logo-vidaanimada.png'
                });
            }
        });
        return Array.from(colors.values());
    }, [product]);

    // Variantes (talles) disponibles para el color seleccionado (solo para 'VARIANT')
    const variantsForSelectedColor = useMemo(() => {
        if (product.product_type !== 'VARIANT' || !selectedColor) return [];
        return product.product_variants.filter(
            variant => variant.color_name === selectedColor.color_name
        );
    }, [product, selectedColor]);

    // Stock disponible para el BUNDLE basado en las selecciones
    const bundleStock = useMemo(() => {
        if (product.product_type !== 'BUNDLE') return 0;
        let minStock = Infinity;
        let allSelected = true;

        if (!product.bundle_links || product.bundle_links.length === 0) return 0;

        if (Object.keys(selectedBundleVariants).length !== product.bundle_links.length) {
            allSelected = false;
        }

        product.bundle_links.forEach(link => {
            const selectedVariantId = selectedBundleVariants[link.id];
            if (!selectedVariantId) {
                allSelected = false; return;
            }
            const variant = link.product_variants_options?.find(v => v.id === selectedVariantId);
            if (variant && variant.stock < minStock) {
                minStock = variant.stock;
            } else if (!variant) {
                allSelected = false;
            } else if (variant && variant.stock === 0) {
                minStock = 0;
            }
        });

        if (!allSelected || minStock === Infinity || minStock < 0) return 0;
        return minStock;
    }, [product, selectedBundleVariants]);

    // --- Efectos ---
    useEffect(() => {
        // Setear color por defecto (VARIANT)
        if (product.product_type === 'VARIANT' && availableColors.length > 0 && !selectedColor) {
            setSelectedColor(availableColors[0]);
        }
        // Setear variantes por defecto (BUNDLE)
        if (product.product_type === 'BUNDLE' && product.bundle_links) {
            const initialSelections = {};
            let possible = true;
            product.bundle_links.forEach(link => {
                const firstAvailableVariant = link.product_variants_options?.find(v => v.stock > 0);
                if (firstAvailableVariant) {
                    initialSelections[link.id] = firstAvailableVariant.id;
                } else {
                    possible = false;
                }
            });
            if (possible && Object.keys(initialSelections).length === product.bundle_links.length) {
                setSelectedBundleVariants(initialSelections);
            }
        }
        // Limpiar selecciones si el producto cambia
        return () => {
            setSelectedColor(null);
            setSelectedVariant(null);
            setSelectedBundleVariants({});
        };
    }, [product, availableColors]); // Solo depende del producto

    useEffect(() => {
        // Setear talle por defecto cuando cambia el color (VARIANT)
        if (product.product_type === 'VARIANT' && selectedColor && variantsForSelectedColor.length > 0) {
            const firstAvailable = variantsForSelectedColor.find(v => v.stock > 0);
            setSelectedVariant(firstAvailable || variantsForSelectedColor[0]);
        } else if (product.product_type === 'VARIANT') {
            setSelectedVariant(null);
        }
    }, [product.product_type, selectedColor, variantsForSelectedColor]); // Depende del color

    // --- AGREGAR AL CARRITO ---
    const handleAddToCart = () => {
        switch (product.product_type) {
            case 'SIMPLE':
                if (product.stock > 0) {
                    addToCart({
                        id: product.id, name: product.name, price: product.base_price,
                        image_url: product.image_url, type: 'SIMPLE'
                    });
                    alert(`${product.name} agregado!`);
                } else { alert("Sin stock."); }
                break;
            case 'VARIANT':
                if (selectedVariant && selectedVariant.stock > 0) {
                    addToCart({
                        id: selectedVariant.id, name: product.name, price: product.base_price,
                        image_url: selectedVariant.variant_image_url || selectedColor?.image_url || '/logo-vidaanimada.png',
                        color_name: selectedColor?.color_name, size: selectedVariant.size, type: 'VARIANT'
                    });
                    alert(`${product.name} (${selectedColor?.color_name || ''}/${selectedVariant.size || ''}) agregado!`);
                } else { alert("Selección sin stock."); }
                break;
            case 'BUNDLE':
                if (bundleStock > 0 && Object.keys(selectedBundleVariants).length === product.bundle_links.length) {
                    const componentVariantIds = Object.values(selectedBundleVariants);
                    const componentsDetails = product.bundle_links.map(link => {
                        const variantId = selectedBundleVariants[link.id];
                        const variant = link.product_variants_options?.find(v => v.id === variantId);
                        return {
                            componentName: link.component_product?.name || 'Pieza',
                            variantName: `${variant?.color_name || ''} / ${variant?.size || ''}`,
                            image_url: variant?.variant_image_url || link.component_product?.image_url || '/logo-vidaanimada.png'
                        };
                    });
                    addToCart({
                        id: product.id, name: product.name, price: product.base_price,
                        image_url: componentsDetails[0]?.image_url || '/logo-vidaanimada.png',
                        type: 'BUNDLE',
                        componentVariantIds: componentVariantIds,
                        componentsDetails: componentsDetails
                    });
                    alert(`${product.name} agregado!`);
                } else {
                    if (Object.keys(selectedBundleVariants).length !== product.bundle_links.length) {
                        alert("Por favor, selecciona una opción para cada parte del conjunto.");
                    } else {
                        alert("Conjunto no disponible en esta combinación de tallas o sin stock.");
                    }
                }
                break;
            default: alert("Tipo desconocido.");
        }
    };

    // --- Lógica para Imágenes del Slider ---
    const sliderImages = useMemo(() => {
        if (!product) return [{ url: '/logo-vidaanimada.png', alt: 'Cargando...' }];

        switch (product.product_type) {
            case 'SIMPLE':
                return [{ url: product.image_url || '/logo-vidaanimada.png', alt: product.name }];

            case 'VARIANT':
                // Muestra la imagen principal del color seleccionado
                const variantImageUrl = selectedColor?.image_url || product.product_variants?.[0]?.variant_image_url;
                return [{ url: variantImageUrl || '/logo-vidaanimada.png', alt: `${product.name} ${selectedColor?.color_name || ''}` }];

            case 'BUNDLE':
                if (!product.bundle_links || product.bundle_links.length === 0) {
                    return [{ url: '/logo-vidaanimada.png', alt: product.name }];
                }
                // Mapea cada componente a su imagen de variante seleccionada
                return product.bundle_links.map(link => {
                    const selectedVariantId = selectedBundleVariants[link.id];
                    const variant = link.product_variants_options?.find(v => v.id === selectedVariantId);
                    // Prioriza imagen de variante, luego imagen de producto componente, luego fallback
                    const imageUrl = variant?.variant_image_url || link.component_product?.image_url || '/logo-vidaanimada.png';
                    const altText = `${link.component_product?.name || 'Pieza'} ${variant?.size || ''}`;
                    return { url: imageUrl, alt: altText };
                }).filter(img => img.url); // Filtra por si alguna URL falla

            default:
                return [{ url: '/logo-vidaanimada.png', alt: 'Producto' }];
        }
    }, [product, selectedColor, selectedVariant, selectedBundleVariants]); // Depende de las selecciones
    // --- ¡NUEVO! Handler para actualizar el slide actual ---
    const handleSlideChange = (index) => {
        setCurrentSlide(index);
    };
    useEffect(() => {
        setCurrentSlide(0); // Vuelve al primer slide cuando cambian las imágenes base
    }, [product, selectedColor]); // Depende del producto y color (no de los talles del bundle)

    if (!product) return <div>Cargando...</div>;
    // Determinar si el botón de añadir debe estar deshabilitado
    const isAddToCartDisabled =
        (product.product_type === 'SIMPLE' && product.stock <= 0) ||
        (product.product_type === 'VARIANT' && (!selectedVariant || selectedVariant.stock <= 0)) ||
        (product.product_type === 'BUNDLE' && (bundleStock <= 0 || Object.keys(selectedBundleVariants).length !== product.bundle_links?.length));

    // Helper para imagen de recomendados
    const getRecommendedImage = (recProduct) => {
        switch (recProduct.product_type) {
            case 'SIMPLE': return recProduct.image_url || '/logo-vidaanimada.png';
            case 'VARIANT': return recProduct.product_variants?.[0]?.variant_image_url || '/logo-vidaanimada.png';
            case 'BUNDLE': return recProduct.bundle_links?.[0]?.product_variants?.variant_image_url || '/logo-vidaanimada.png';
            default: return '/logo-vidaanimada.png';
        }
    };

    return (
        <>
            <Head><title>{product.name} - Vida Animada</title></Head>
            <Header />
            <main>
                <section className="page-section">
                    <div className="product-detail-layout">
                        {/* --- SECCIÓN DE IMAGEN CON CAROUSEL --- */}
                        <div className="product-image-section">
                            <Carousel
                                showArrows={sliderImages.length > 1}
                                showThumbs={sliderImages.length > 1}
                                showStatus={false}
                                infiniteLoop={sliderImages.length > 1}
                                useKeyboardArrows={true}
                                className="product-carousel"
                                // --- ¡CAMBIOS AQUÍ! ---
                                selectedItem={currentSlide} // Controlamos el item seleccionado
                                onChange={handleSlideChange} // Actualizamos el estado al cambiar
                            // key ya fue eliminada
                            >
                                {sliderImages.map((image, index) => (
                                    <div key={index} style={{ borderRadius: '15px', overflow: 'hidden' }}>
                                        <Image
                                            src={image.url} alt={image.alt}
                                            width={500} height={500}
                                            style={{ objectFit: 'cover', display: 'block' }}
                                            priority={index === 0}
                                        />
                                    </div>
                                ))}
                            </Carousel>
                        </div>

                        {/* --- Sección de Información y Selectores --- */}
                        <div className="product-info-section">
                            <h1>{product.name}</h1>
                            <p className="price">${product.base_price}</p>
                            <p className="description">{product.description}</p>

                            {/* --- RENDERIZADO CONDICIONAL POR TIPO --- */}

                            {/* --- CASO: VARIANT --- */}
                            {product.product_type === 'VARIANT' && (
                                <>
                                    {availableColors.length > 0 && (
                                        <div className="variant-selector">
                                            <label>Color: <b>{selectedColor?.color_name || 'Selecciona'}</b></label>
                                            <div className="color-swatch-list">
                                                {availableColors.map(color => (
                                                    <button key={color.color_name}
                                                        className={`color-swatch ${selectedColor?.color_name === color.color_name ? 'active' : ''}`}
                                                        style={{ backgroundColor: color.color_hex || '#ccc' }}
                                                        onClick={() => setSelectedColor(color)}
                                                        title={color.color_name}
                                                        aria-label={`Seleccionar color ${color.color_name}`}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {variantsForSelectedColor.length > 0 && (
                                        <div className="variant-selector">
                                            <label>Talle:</label>
                                            <div className="size-button-list">
                                                {variantsForSelectedColor.map(variant => (
                                                    <button key={variant.id}
                                                        className={`size-button ${selectedVariant?.id === variant.id ? 'active' : ''} ${variant.stock <= 0 ? 'disabled' : ''}`}
                                                        onClick={() => setSelectedVariant(variant)}
                                                        disabled={variant.stock <= 0}
                                                        title={variant.stock <= 0 ? 'Sin stock' : `Seleccionar talle ${variant.size}`}
                                                        aria-label={`Seleccionar talle ${variant.size}${variant.stock <= 0 ? ' (Sin stock)' : ''}`}
                                                    >
                                                        {variant.size}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    <div className="stock-info">
                                        {selectedVariant ?
                                            (selectedVariant.stock > 0 ? `${selectedVariant.stock} unidades disponibles` : 'Sin stock') :
                                            (availableColors.length > 0 && variantsForSelectedColor.length === 0 ? 'Color no disponible' : 'Selecciona talle')
                                        }
                                    </div>
                                </>
                            )}

                            {/* --- CASO: SIMPLE --- */}
                            {product.product_type === 'SIMPLE' && (
                                <div className="stock-info">
                                    {product.stock > 0 ? `${product.stock} unidades disponibles` : 'Sin stock'}
                                </div>
                            )}

                            {/* --- CASO: BUNDLE --- */}
                            {product.product_type === 'BUNDLE' && (
                                <div className="bundle-selectors">
                                    {(product.bundle_links || []).map(link => (
                                        <div key={link.id} className="variant-selector">
                                            <label>{link.component_product?.name || 'Componente'}:</label>
                                            <div className="size-button-list">
                                                {(link.product_variants_options || [])
                                                    .map(variant_option => (
                                                        <button key={variant_option.id}
                                                            className={`size-button ${selectedBundleVariants[link.id] === variant_option.id ? 'active' : ''} ${variant_option.stock <= 0 ? 'disabled' : ''}`}
                                                            onClick={() => setSelectedBundleVariants(prev => ({
                                                                ...prev,
                                                                [link.id]: variant_option.id
                                                            }))}
                                                            disabled={variant_option.stock <= 0}
                                                            title={variant_option.stock <= 0 ? 'Sin stock' : `Seleccionar ${link.component_product?.name || 'pieza'} talle ${variant_option.size}`}
                                                            aria-label={`Seleccionar ${link.component_product?.name || 'pieza'} talle ${variant_option.size}${variant_option.stock <= 0 ? ' (Sin stock)' : ''}`}
                                                        >
                                                            {variant_option.size}
                                                        </button>
                                                    ))}
                                            </div>
                                        </div>
                                    ))}
                                    <div className="stock-info">
                                        {Object.keys(selectedBundleVariants).length !== product.bundle_links?.length ? 'Selecciona una opción para cada parte' :
                                            (bundleStock > 0 ? `${bundleStock} conjuntos disponibles` : 'Sin stock en esta combinación')}
                                    </div>
                                </div>
                            )}

                            {/* --- Botón AddToCart --- */}
                            <button onClick={handleAddToCart} className="btn-primary add-to-cart-btn" disabled={isAddToCartDisabled}>
                                {isAddToCartDisabled && product.product_type === 'BUNDLE' && Object.keys(selectedBundleVariants).length !== product.bundle_links?.length ? 'Selecciona opciones' :
                                    isAddToCartDisabled ? 'Sin Stock' :
                                        'Agregar al Carrito'}
                            </button>
                        </div>
                    </div>
                </section>

                {/* --- Sección Recomendados --- */}
                {recommendedProducts && recommendedProducts.length > 0 && (
                    <section className="content-section-alt">
                        <h2>También te puede interesar</h2>
                        <div className="product-grid">
                            {recommendedProducts.map((recProduct) => (
                                <Link href={`/productos/${recProduct.id}`} key={recProduct.id} passHref>
                                    <div className="product-card" style={{ cursor: 'pointer' }}>
                                        <Image src={getRecommendedImage(recProduct)} alt={recProduct.name}
                                            width={300} height={280} style={{ objectFit: 'cover' }}
                                        />
                                        <h4>{recProduct.name}</h4>
                                        <p className="price">Desde ${recProduct.base_price}</p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </section>
                )}
            </main>
            <Footer />
        </>
    );
}

// --- getStaticPaths ---
export async function getStaticPaths() {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    const { data: products, error } = await supabase.from('products').select('id');
    if (error || !products) return { paths: [], fallback: 'blocking' };
    const paths = products.map(product => ({ params: { id: product.id.toString() } }));
    return { paths, fallback: 'blocking' };
}

// --- getStaticProps (FINAL) ---
export async function getStaticProps({ params }) {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    const { id } = params;

    // 1. Fetch producto principal
    const { data: product, error: productError } = await supabase
        .from('products')
        .select(`
            *,
            product_variants (*),
            bundle_links (
              id, quantity,
              product_variants!inner ( product_id )
            )
        `)
        .eq('id', id)
        .single();

    if (productError || !product) {
        console.error(`Error fetching product ${id}:`, productError?.message);
        return { notFound: true };
    }

    // 2. Si es BUNDLE, fetch todas las variantes de los componentes
    if (product.product_type === 'BUNDLE' && product.bundle_links?.length > 0) {
        const componentProductIds = [...new Set(product.bundle_links.map(link => link.product_variants.product_id))];

        const { data: componentVariantsData, error: variantsError } = await supabase
            .from('product_variants')
            .select(`
                id, product_id, color_name, color_hex, size, stock, variant_image_url,
                products (id, name, image_url)
            `)
            .in('product_id', componentProductIds);

        if (variantsError) {
            console.error(`Error fetching component variants for bundle ${id}:`, variantsError.message);
            return { notFound: true };
        }

        // "Hidratar" bundle_links
        product.bundle_links = product.bundle_links.map(link => {
            const componentInfo = componentVariantsData.find(v => v.product_id === link.product_variants.product_id)?.products;
            return {
                ...link,
                component_product: componentInfo || { name: 'Componente Desconocido' },
                product_variants_options: componentVariantsData.filter(
                    variant => variant.product_id === link.product_variants.product_id
                ) || []
            };
        }).filter(link => link.product_variants_options.length > 0); // Filtra links si su componente no tiene variantes

        // Si después de filtrar no quedan links válidos, tratamos como si no fuera bundle (o mostramos error)
        if (product.bundle_links.length === 0) {
            console.warn(`Bundle ${id} no tiene componentes válidos con variantes.`);
            // Opcional: cambiar product_type a algo inválido o devolver notFound
            // product.product_type = 'INVALID_BUNDLE'; 
        }
    }

    // 3. Fetch productos recomendados
    const { data: recommendedProducts, error: recommendedError } = await supabase
        .from('products')
        .select(`
            id, name, base_price, product_type, image_url, tag,
            product_variants (variant_image_url),
            bundle_links ( product_variants ( variant_image_url ) )
        `)
        .eq('tag', 'Destacado')
        .neq('id', id)
        .limit(4);

    if (recommendedError) {
        console.error("Error fetching recommended products:", recommendedError.message);
    }

    return {
        props: {
            product: JSON.parse(JSON.stringify(product)),
            recommendedProducts: recommendedProducts || []
        },
        revalidate: 60
    };
}