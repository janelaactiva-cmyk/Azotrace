'use client';

import { useEffect } from 'react';
import './landing.css';

import Header from './components/Header';
import Hero from './components/Hero';
import About from './components/About';
import Vantagens from './components/Vantagens';
import Features from './components/Features';
import Pricing from './components/Pricing';
import FAQ from './components/FAQ';
import Footer from './components/Footer';
import Chatbot from './components/Chatbot';

export default function LandingPage() {
  useEffect(() => {
    // Smooth scroll
    document.querySelectorAll('a[href^="#"]').forEach((anchor: any) => {
      anchor.addEventListener('click', function (e: any) {
        const targetId = this.getAttribute('href');
        if (targetId && targetId.startsWith('#')) {
          e.preventDefault();
          const targetElement = document.querySelector(targetId);
          if (targetElement) {
            const headerOffset = 80;
            const elementPosition = targetElement.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
            window.scrollTo({
              top: offsetPosition,
              behavior: 'smooth'
            });
          }
        }
      });
    });
  }, []);

  return (
    <>
      <Header />
      <Hero />
      <About />
      <Vantagens />
      <Features />
      <Pricing />
      <FAQ />
      <Footer />
      <Chatbot />
      <a
        href="#home"
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          display: 'none',
          zIndex: 999,
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          background: '#234D87',
          color: 'white',
          border: 'none',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          alignItems: 'center',
          justifyContent: 'center',
          textDecoration: 'none',
          fontSize: '20px'
        }}
      >
        ↑
      </a>
    </>
  );
}
