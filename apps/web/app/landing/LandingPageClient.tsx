'use client';

import { useEffect, useState, type ReactNode } from 'react';
import './landing.css';

import Header from './components/Header';
import Hero from './components/Hero';
import About from './components/About';
import Vantagens from './components/Vantagens';
import Features from './components/Features';
import FAQ from './components/FAQ';
import Footer from './components/Footer';


export default function LandingPageClient({ pricing }: { pricing: ReactNode }) {
  const [isDark, setIsDark] = useState(false);

  const toggleTheme = () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    if (newTheme) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('landing_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('landing_theme', 'light');
    }
  };

  useEffect(() => {
    const savedTheme = localStorage.getItem('landing_theme');
    if (savedTheme === 'dark') {
      setIsDark(true);
      document.documentElement.classList.add('dark');
    }

    // Smooth scroll
    document.querySelectorAll('a[href^="#"]').forEach((anchor: any) => {
      anchor.addEventListener('click', function (e: any) {
        const targetId = anchor.getAttribute('href');
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
    <div style={{ backgroundColor: isDark ? '#111827' : '#ffffff', color: isDark ? '#f3f4f6' : '#111827', minHeight: '100vh', transition: 'background-color 0.3s ease, color 0.3s ease' }}>
      {/* Passamos o estado e a função para o Header */}
      <Header isDark={isDark} toggleTheme={toggleTheme} />
      <Hero />
      <About />
      <Vantagens />
      <Features />
      {pricing}
      <FAQ />
      <Footer />

    </div>
  );
}