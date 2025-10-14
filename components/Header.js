// components/Header.js
import Link from 'next/link';
import Image from 'next/image';
import { useCart } from '../context/CartContext';

export default function Header() {
    const { cartItems } = useCart();
    const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);

    return (
        <header className="main-header">
            <div className="logo">
                <Link href="/">
                    <Image 
                        src="/logo-vidaanimada.png" 
                        alt="Vida Animada Logo"
                        width={150}
                        height={50}
                        style={{ objectFit: 'contain', cursor: 'pointer' }}
                        priority
                    />
                </Link>
            </div>
            <nav className="main-nav">
                <ul>
                    <li><Link href="/">Inicio</Link></li>
                    <li><Link href="/categorias">Categorías</Link></li>
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
