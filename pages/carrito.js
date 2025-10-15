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
        
        cartItems.forEach(item => {
            const subtotal = (item.price * item.quantity).toFixed(2);
            // Mensaje mejorado con variantes
            message += `📦 *${item.name.trim()}*\n`;
            if(item.color_name) message += `   Color: ${item.color_name}\n`;
            if(item.size) message += `   Talle: ${item.size}\n`;
            message += `   Cantidad: ${item.quantity}\n`;
            message += `   Subtotal: $${subtotal}\n\n`;
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
                                        <Image src={item.image_url} alt={item.name} width={80} height={80} style={{ objectFit: 'cover', borderRadius: '8px' }}/>
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
                                {/* ... (El resumen del carrito no cambia) ... */}
                            </aside>
                        </div>
                    )}
                </section>
            </main>
            <Footer />
        </>
    );
}