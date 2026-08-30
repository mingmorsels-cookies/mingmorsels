// ─────────────────────────────────────────────────────────────────────────────
// ScrollTimeline.js - GSAP ScrollTrigger Timelines for 3D Product Journey
// ─────────────────────────────────────────────────────────────────────────────

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export class ScrollTimelineController {
  constructor(threeController) {
    this.three = threeController;
    this.gridTL = null;
    this.muffinGridTL = null;
    this.heroSpin = null;
  }

  init() {
    try {
      this.three.update3DCoordinates();

      const { COOKIES, MUFFINS, ALL_PRODUCTS, cookieGroups, heroAlmondPos, placeholder3DCoords } = this.three;
      const almond = cookieGroups.almond;
      if (!almond) return;

      // Position hero almond cookie
      if (almond.scale && almond.position && almond.rotation) {
        almond.scale.set(0.95, 0.95, 0.95);
        almond.position.set(heroAlmondPos.x, heroAlmondPos.y, 0.5);
        almond.rotation.set(1.1, 0.4, 0.2);
      }

      // Pre-position other items
      COOKIES.forEach(id => {
        const group = cookieGroups[id];
        if (group && group.position && group.scale && placeholder3DCoords[id] && id !== 'almond') {
          group.position.set(placeholder3DCoords[id].x, placeholder3DCoords[id].y, 0);
          group.scale.set(0.001, 0.001, 0.001);
        }
      });

      MUFFINS.forEach(id => {
        const group = cookieGroups[id];
        if (group && group.position && group.scale && placeholder3DCoords[id]) {
          group.position.set(placeholder3DCoords[id].x, placeholder3DCoords[id].y, 0);
          group.scale.set(0.001, 0.001, 0.001);
        }
      });


      // Stage 1: Dynamic Theme & Background Transition (Consistent Warm Luxury Cream & Gold Ambience)
      ScrollTrigger.create({
        trigger: '#products',
        start: 'top 60%',
        end: 'bottom 40%',
        onUpdate: () => {
          document.body.style.backgroundColor = '#FAF6F0';
          document.documentElement.style.backgroundColor = '#FAF6F0';
          document.documentElement.style.setProperty('--scrollbar-track-bg', '#FAF6F0');

          const headerEl = document.querySelector('.header');
          if (headerEl) {
            headerEl.style.background = 'rgba(250, 246, 240, 0.92)';
            headerEl.style.color = '#3D2000';
          }
          const logoText = document.querySelector('.logo-text');
          if (logoText) {
            logoText.style.color = '#3D2000';
          }
          document.querySelectorAll('.nav-link').forEach(link => {
            link.style.color = '#705840';
          });
        },
        onLeaveBack: () => {
          document.body.style.backgroundColor = '#FAF6F0';
          document.documentElement.style.backgroundColor = '#FAF6F0';
          const headerEl = document.querySelector('.header');
          if (headerEl) {
            headerEl.style.background = 'rgba(250, 246, 240, 0.92)';
            headerEl.style.color = '#3D2000';
          }
          const logoText = document.querySelector('.logo-text');
          if (logoText) {
            logoText.style.color = '#3D2000';
          }
          document.querySelectorAll('.nav-link').forEach(link => {
            link.style.color = '#705840';
          });
        }
      });

      // Stage 2: Card Smooth Entrance Transitions
      gsap.utils.toArray('.product-card').forEach((card) => {
        gsap.fromTo(card,
          { y: 30, opacity: 0.8 },
          {
            y: 0,
            opacity: 1,
            duration: 0.6,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: card,
              start: 'top 88%',
              toggleActions: 'play none none reverse'
            }
          }
        );
      });

      ['#best-sellers', '#why-choose-us', '#customer-reviews-section', '#contact', '#footer'].forEach(selector => {
        const el = document.querySelector(selector);
        if (el) {
          ScrollTrigger.create({
            trigger: selector,
            start: 'top 90%',
            onEnter: () => {
              ALL_PRODUCTS.forEach(id => {
                const group = cookieGroups[id];
                if (group && group.scale) group.scale.set(0.001, 0.001, 0.001);
              });
            },
            onEnterBack: () => {
              ALL_PRODUCTS.forEach(id => {
                const group = cookieGroups[id];
                if (group && group.scale) group.scale.set(0.001, 0.001, 0.001);
              });
            }
          });
        }
      });

      ScrollTrigger.refresh();
    } catch (err) {
      console.error("[ScrollTimeline] GSAP init error:", err);
    }
  }

  getGridTrigger() {
    return this.gridTL?.scrollTrigger || null;
  }

  getMuffinTrigger() {
    return this.muffinGridTL?.scrollTrigger || null;
  }
}
