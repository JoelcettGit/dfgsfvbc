// components/Footer.js
export default function Footer() {
    return (
        <footer className="main-footer">
            <div className="social-icons">
                <a href="https://www.instagram.com/vidaa.nimada/" target="_blank" rel="noopener noreferrer"><i className="fab fa-instagram"></i></a>
                <a href="#"><i className="fab fa-facebook"></i></a>
                <a href="https://wa.me/3804882298?text=Hola!%20Tengo%20una%20consulta" target="_blank" rel="noopener noreferrer"><i className="fab fa-whatsapp"></i></a>
            </div>
            <p style={{ marginTop: '10px' }}>&copy; {new Date().getFullYear()} Vida Animada. Todos los derechos reservados.</p>
        </footer>
    );
}