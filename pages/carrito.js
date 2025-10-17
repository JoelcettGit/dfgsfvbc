// pages/carrito.js
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { useCart } from '../context/CartContext';
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function CartPage() {
    const { cartItems, removeFromCart, updateQuantity, clearCart } = useCart();

    const calculateTotal = () => {
        return cartItems.reduce((total, item) => total + item.price * item.quantity, 0).toFixed(2);
    };

    const generateWhatsAppMessage = () => {
        let message = "¡Hola Vida Animada! 👋 Me gustaría hacer el siguiente pedido:\n\n";
        
        // 1. Agrupar items por Nombre de Producto
        const groupedItems = cartItems.reduce((acc, item) => {
            // Clave principal: Nombre del producto
            if (!acc[item.name]) {
                acc[item.name] = {
                    items: [],
                    subtotal: 0
                };
            }
            
            // Añadimos el item a su grupo
            acc[item.name].items.push(item);
            acc[item.name].subtotal += item.price * item.quantity;
            
            return acc;
        }, {});

        // 2. Construir el mensaje iterando sobre los grupos
        Object.keys(groupedItems).forEach(productName => {
            const group = groupedItems[productName];
            
            message += `📦 *${productName.trim()}*\n`;

            // Si el primer item del grupo NO tiene color (es producto simple)
            if (!group.items[0].color_name && !group.items[0].size) {
                // Es un producto simple (ej: Lapiceras)
                const item = group.items[0];
                message += `   Cantidad: ${item.quantity}\n`;
            } else {
                // Es un producto variable (agrupamos por color)
                const colors = group.items.reduce((acc, item) => {
                    const color = item.color_name || 'Sin Color';
                    if (!acc[color]) {
                        acc[color] = [];
                    }
                    acc[color].push(` ${item.quantity}u ${item.size || ''}`); // ej: " 3u S", " 2u 48"
                    return acc;
                }, {});

                // Añadimos las líneas de Talle y Cantidad por color
                Object.keys(colors).forEach(colorName => {
                    message += `   Color: ${colorName}\n`;
                    message += `   Talles: ${colors[colorName].join(',')}\n`; // ej: " 3u S, 2u 48"
                });
            }
            
            message += `   Subtotal: $${group.subtotal.toFixed(2)}\n\n`;
        });


        message += `-------------------------\n*TOTAL DEL PEDIDO: $${calculateTotal()}*\n\n¡Espero su respuesta para coordinar el pago y envío! Gracias 😊`;
        return encodeURIComponent(message);
    };

    return (
        <>
            <Head><title>Carrito de Compras - Vida Animada</title></Head>
            <Header />
            <main>
                <section className="page-section">
                    <h1>Tu Carrito de Compras</h1>

                    {cartItems.length === 0 ? (
                        <div className="cart-empty">
                            <p>Tu carrito está vacío.</p>
                            <Link href="/categorias" className="btn-primary">Ver productos</Link>
                        </div>
                    ) : (
                        <div className="cart-container">
                            <div className="cart-items">
                                {cartItems.map(item => (
                                    <div key={item.id} className="cart-item">
                                        <Image src={item.image_url} alt={item.name} width={80} height={80} style={{ objectFit: 'cover', borderRadius: '8px' }} />
                                        <div className="cart-item-details">
                                            <h4>{item.name}</h4>
                                            {/* Mostramos la info de la variante */}
                                            <p className="variant-info">
                                                {item.color_name && <span>{item.color_name}</span>}
                                                {item.size && <span>{item.size}</span>}
                                            </p>
                                            <p className="price">${item.price}</p>
                                        </div>
                                        <div className="cart-item-quantity">
                                            <button onClick={() => updateQuantity(item.id, item.quantity - 1)}>-</button>
                                            <span>{item.quantity}</span>
                                            <button onClick={() => updateQuantity(item.id, item.quantity + 1)}>+</button>
                                        </div>
                                        <div className="cart-item-subtotal">
                                            <p>${(item.price * item.quantity).toFixed(2)}</p>
                                        </div>
                                        <button onClick={() => removeFromCart(item.id)} className="cart-item-remove">×</button>
                                    </div>
                                ))}
                            </div>
                            <aside className="cart-summary">
                                <h2>Resumen del Pedido</h2>
                                <div className="summary-total">
                                    <span>TOTAL</span>
                                    <span>${calculateTotal()}</span>
                                </div>
                                <a
                                    href={`https://wa.me/3804882298?text=${generateWhatsAppMessage()}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn-primary whatsapp-button"
                                >
                                    Finalizar Pedido por WhatsApp
                                </a>
                                <button
                                    onClick={clearCart}
                                    className="btn-secondary clear-cart-button"
                                >
                                    Vaciar Carrito
                                </button>
                            </aside>
                        </div>
                    )}
                </section>
            </main>
            <Footer />
        </>
    );
}