import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/router';

// Crea el cliente de Supabase fuera del componente
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const router = useRouter();

    const handleLogin = async (e) => {
        e.preventDefault();
        setError(null);
        try {
            const { error } = await supabase.auth.signInWithPassword({
                email: email,
                password: password,
            });

            if (error) throw error;

            // Si el login es exitoso, redirige al panel
            router.push('/admin/dashboard');
        } catch (error) {
            setError(error.message);
        }
    };

    return (
        <div className="admin-login-container">
            <div className="admin-login-box">
                <img src="/logo-vidaanimada.png" alt="Logo" style={{ maxHeight: '60px', marginBottom: '1rem' }} />
                <h2>Panel de Administración</h2>
                <form onSubmit={handleLogin}>
                    <input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                    <input
                        type="password"
                        placeholder="Contraseña"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                    <button type="submit" className="btn-primary">Ingresar</button>
                    {error && <p className="error-message">{error}</p>}
                </form>
            </div>
        </div>
    );
}