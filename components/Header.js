// components/Header.js
import Link from 'next/link';
import { useCart } from '../context/CartContext';

export default function Header() {
    const { cartItems } = useCart();
    const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);

    return (
        <header className="main-header">
            <div className="logo">
                <Link href="/">
                    <img src="/logo-vidaanimada.png" alt="Vida Animada Logo" style={{ cursor: 'pointer' }}/>
                </Link>
            </div>
            <nav className="main-nav">
                <ul>
                    <li><Link href="/">Inicio</Link></li>
                    <li><Link href="/categorias">Categorías</Link></li>
                    <li><Link href="/#nosotros">Nosotros</Link></li>
                    <li>
                        <Link href="/carrito" className="cart-icon">
                            🛒
                            {totalItems > 0 && <span className="cart-count">{totalItems}</span>}
                        </Link>
                    </li>
                </ul>
            </nav>
        </header>
    );
}