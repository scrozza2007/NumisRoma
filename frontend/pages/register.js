import React, { useState } from 'react';
import Link from 'next/link';
import Head from 'next/head';
import styles from '../styles/Login.module.css'; // Reusing the same styles

const Register = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Basic validation
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    // Add your registration logic here
    console.log('Registration attempt with:', { email, password });
  };

  return (
    <div className={styles.container}>
      <Head>
        <title>Register - NumisRoma</title>
        <meta name="description" content="Create a NumisRoma account" />
      </Head>

      <header className={styles.header}>
        <div className={styles.logo}>
          <Link href="/">
            <img src="/images/logo.png" alt="NumisRoma" />
          </Link>
        </div>
        <nav className={styles.nav}>
          <ul>
            <li><Link href="/browse">Browse</Link></li>
            <li><Link href="/search">Search</Link></li>
            <li><Link href="/community">Community</Link></li>
            <li><Link href="/resources">Resources</Link></li>
            <li><Link href="/symbols">Symbols</Link></li>
            <li><Link href="/contact">Contact</Link></li>
          </ul>
        </nav>
        <div className={styles.authButtons}>
          <Link href="/login" className={styles.signInButton}>Sign In</Link>
          <Link href="/register" className={styles.registerButton}>Register</Link>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.loginForm}>
          {error && <div className={styles.errorMessage}>{error}</div>}
          
          <form onSubmit={handleSubmit}>
            <div className={styles.formGroup}>
              <h2>Email</h2>
              <input
                type="email"
                placeholder="Value"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            
            <div className={styles.formGroup}>
              <h2>Password</h2>
              <input
                type="password"
                placeholder="Value"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            
            <div className={styles.formGroup}>
              <h2>Confirm Password</h2>
              <input
                type="password"
                placeholder="Value"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            
            <div className={styles.alreadyHaveAccount}>
              <Link href="/login">Already have an account?</Link>
            </div>
            
            <button type="submit" className={styles.registerButton}>
              Register
            </button>
          </form>
        </div>
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerLogo}>
          <Link href="/">
            <img src="/images/logo.png" alt="NumisRoma" />
          </Link>
        </div>
        
        <div className={styles.footerContent}>
          <div className={styles.footerColumn}>
            <h3>Use cases</h3>
            <ul>
              <li><Link href="#">UI design</Link></li>
              <li><Link href="#">UX design</Link></li>
              <li><Link href="#">Wireframing</Link></li>
              <li><Link href="#">Diagramming</Link></li>
              <li><Link href="#">Brainstorming</Link></li>
              <li><Link href="#">Online whiteboard</Link></li>
              <li><Link href="#">Team collaboration</Link></li>
            </ul>
          </div>
          
          <div className={styles.footerColumn}>
            <h3>Explore</h3>
            <ul>
              <li><Link href="#">Design</Link></li>
              <li><Link href="#">Prototyping</Link></li>
              <li><Link href="#">Development features</Link></li>
              <li><Link href="#">Design systems</Link></li>
              <li><Link href="#">Collaboration features</Link></li>
              <li><Link href="#">Design process</Link></li>
              <li><Link href="#">Figma</Link></li>
            </ul>
          </div>
          
          <div className={styles.footerColumn}>
            <h3>Resources</h3>
            <ul>
              <li><Link href="#">Blog</Link></li>
              <li><Link href="#">Best practices</Link></li>
              <li><Link href="#">Colors</Link></li>
              <li><Link href="#">Color wheel</Link></li>
              <li><Link href="#">Support</Link></li>
              <li><Link href="#">Developers</Link></li>
              <li><Link href="#">Resource library</Link></li>
            </ul>
          </div>
        </div>
        
        <div className={styles.socialLinks}>
          <Link href="#" aria-label="Twitter"><img src="/images/twitter-icon.svg" alt="Twitter" /></Link>
          <Link href="#" aria-label="Instagram"><img src="/images/instagram-icon.svg" alt="Instagram" /></Link>
          <Link href="#" aria-label="YouTube"><img src="/images/youtube-icon.svg" alt="YouTube" /></Link>
          <Link href="#" aria-label="LinkedIn"><img src="/images/linkedin-icon.svg" alt="LinkedIn" /></Link>
        </div>
      </footer>
    </div>
  );
};

export default Register;