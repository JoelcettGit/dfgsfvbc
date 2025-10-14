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
            message += `📦 *${item.name.trim()}*\n`;
            message += `   Cantidad: ${item.quantity}\n`;
            message += `   Precio unitario: $${item.price}\n`;
            message += `   Subtotal: $${subtotal}\n\n`;
        });

        message += `-------------------------\n`;
        message += `*TOTAL DEL PEDIDO: $${calculateTotal()}*\n\n`;
        message += `¡Espero su respuesta para coordinar el pago y envío! Gracias 😊`;

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
                                        <Image src={item.image_url} alt={item.name} width={80} height={80} style={{ objectFit: 'cover' }}/>
                                        <div className="cart-item-details">
                                            <h4>{item.name}</h4>
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
                                    <span>Total</span>
                                    <span>${calculateTotal()}</span>
                                </div>
                                <a 
                                    href={`https://wa.me/3804882298?text=${generateWhatsAppMessage()}`} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="btn-primary whatsapp-button"
                                >
                                    Pedir por WhatsApp
                                </a>
                                <button onClick={clearCart} className="btn-secondary clear-cart-button">Vaciar Carrito</button>
                            </aside>
                        </div>
                    )}
                </section>
            </main>
            <Footer />
        </>
    );
}
