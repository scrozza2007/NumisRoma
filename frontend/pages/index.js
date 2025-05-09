import React from 'react';
import Link from 'next/link';
import Head from 'next/head';
import styles from '../styles/Home.module.css';

const Home = () => {
  return (
    <div className={styles.container}>
      <Head>
        <title>NumisRoma - Online Roman Imperial Coinage Catalog</title>
        <meta name="description" content="Explore the comprehensive catalog of Roman Imperial coins" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <header className={styles.header}>
        <div className={styles.logo}>
          <img src="/images/logo.png" alt="NumisRoma Logo" />
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
        <div className={styles.heroContent}>
          <h1>NumisRoma</h1>
          <p>Online Roman Imperial Coinage Catalog</p>
          <Link href="/catalog" className={styles.browseButton}>
            Browse Catalog
          </Link>
        </div>
        
        <div className={styles.heroImage}>
          <img src="/images/colosseum-bg.jpg" alt="Roman Colosseum" />
        </div>
      </main>

      <section className={styles.quotesSection}>
        <h2 className={styles.sectionHeading}>Heading</h2>
        <p className={styles.subheading}>Subheading</p>
        
        <div className={styles.quotesGrid}>
          {[1, 2, 3, 4, 5, 6].map((item) => (
            <div key={item} className={styles.quoteCard}>
              <h3>"Quote"</h3>
              <div className={styles.quoteAuthor}>
                <img src="/images/profile-placeholder.png" alt="Profile" />
                <div>
                  <p>Title</p>
                  <p>Description</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <div className={styles.footerColumn}>
            <h3>Use cases</h3>
            <ul>
              <li>UI design</li>
              <li>UX design</li>
              <li>Wireframing</li>
              <li>Diagramming</li>
              <li>Brainstorming</li>
              <li>Online whiteboard</li>
              <li>Team collaboration</li>
            </ul>
          </div>
          <div className={styles.footerColumn}>
            <h3>Explore</h3>
            <ul>
              <li>Design</li>
              <li>Prototyping</li>
              <li>Development features</li>
              <li>Design systems</li>
              <li>Enterprise</li>
              <li>Design process</li>
              <li>Figma</li>
            </ul>
          </div>
          <div className={styles.footerColumn}>
            <h3>Resources</h3>
            <ul>
              <li>Blog</li>
              <li>Best practices</li>
              <li>Guides</li>
              <li>Color wheel</li>
              <li>Community</li>
              <li>Developers</li>
              <li>Resource library</li>
            </ul>
          </div>
        </div>
        <div className={styles.socialLinks}>
          <a href="#" aria-label="Twitter"><img src="/images/twitter-icon.svg" alt="Twitter" /></a>
          <a href="#" aria-label="Instagram"><img src="/images/instagram-icon.svg" alt="Instagram" /></a>
          <a href="#" aria-label="YouTube"><img src="/images/youtube-icon.svg" alt="YouTube" /></a>
          <a href="#" aria-label="LinkedIn"><img src="/images/linkedin-icon.svg" alt="LinkedIn" /></a>
        </div>
      </footer>
    </div>
  );
};

export default Home;
