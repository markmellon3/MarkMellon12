/* ========================================
   MarkMellon — Portfolio SPA Logic
   ======================================== */

const firebaseConfig = {
    apiKey: "AIzaSyBNMhxf7RPb4UqOOVQXjZtqVSxJW6jY_z4",
    authDomain: "markmellon.firebaseapp.com",
    databaseURL: "https://markmellon-default-rtdb.firebaseio.com",
    projectId: "markmellon",
    storageBucket: "markmellon.firebasestorage.app",
    messagingSenderId: "693703950522",
    appId: "1:693703950522:web:d6e1b0bd38d3d366998283",
    measurementId: "G-D8K0QB3TZ4"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

const app = document.getElementById('app');
const toast = document.getElementById('toast');

// --- Helper: Escape HTML ---
function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return String(unsafe)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// --- State ---
const state = {
    filteredImages: [],
    displayedCount: 0,
    currentPage: 0,
    activeCategory: "all",
    loading: false,
    noMore: false,
    lightboxIndex: -1,
    lightboxImages: [],
    isZoomed: false,
    categories: new Set(),
    lastKey: null,
    lastDate: null
};

// --- DOM Refs (Global Elements) ---
const dom = {
    lightbox: document.getElementById("lightbox"),
    lightboxImage: document.getElementById("lightboxImage"),
    lightboxImageWrap: document.getElementById("lightboxImageWrap"),
    lightboxTitle: document.getElementById("lightboxTitle"),
    lightboxDesc: document.getElementById("lightboxDesc"),
    lightboxCategory: document.getElementById("lightboxCategory"),
    lightboxCounter: document.getElementById("lightboxCounter"),
    lightboxClose: document.getElementById("lightboxClose"),
    lightboxPrev: document.getElementById("lightboxPrev"),
    lightboxNext: document.getElementById("lightboxNext"),
    lightboxZoom: document.getElementById("lightboxZoom"),
    lightboxShare: document.getElementById("lightboxShare"),
    lightboxDownload: document.getElementById("lightboxDownload"),
    relatedGrid: document.getElementById("relatedGrid"),
    shareModal: document.getElementById("shareModal"),
    shareModalClose: document.getElementById("shareModalClose"),
    shareButtons: document.getElementById("shareButtons"),
    toast: document.getElementById("toast"),
    backToTop: document.getElementById("backToTop"),
    imageSchema: document.getElementById("image-schema"),
    breadcrumbSchema: document.getElementById("breadcrumb-schema")
};

// Dynamic DOM Refs (Gallery specific)
let galleryDom = {};

// --- Infinite Scroll Observer ---
const scrollObserver = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting && galleryDom.galleryGrid) {
        loadImages();
    }
}, { rootMargin: "200px" });

// --- Intersection Observer: Fade-in Items ---
const itemObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            itemObserver.unobserve(entry.target);
        }
    });
}, { rootMargin: "0px 0px 60px 0px", threshold: 0.01 });

// --- Router ---
window.addEventListener('hashchange', renderRoute);
window.addEventListener('load', renderRoute);

function renderRoute() {
    const hash = window.location.hash || '#home';
    const route = hash.split('/')[0]; 
    
    document.getElementById('mobileMenu').classList.remove('open');

    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.toggle('active', link.getAttribute('href') === route);
    });

    window.scrollTo(0, 0);

    switch(route) {
        case '#home': renderHome(); break;
        case '#projects': renderProjects(); break;
        case '#gallery': renderGallery(); break;
        case '#about': renderAbout(); break;
        case '#contact': renderContact(); break;
        default:
            if (hash.startsWith('#project/')) {
                const id = hash.split('/')[1];
                renderProjectDetail(id);
            } else {
                renderHome();
            }
    }
}

// --- Views ---

// 1. Home View
async function renderHome() {
    app.innerHTML = `
        <div class="view">
            <section class="hero-section">
                <div class="hero-text">
                    <h1>Creating Digital Experiences & Premium Visuals.</h1>
                    <p>I am MarkMellon, a digital designer and developer behind SMMMARIA. Explore my portfolio of web projects, marketing assets, and UI designs.</p>
                    <a href="#projects" class="btn-primary">View My Work</a>
                </div>
                <div class="hero-card">
                    <img src="https://ik.imagekit.io/s95tumxuk/IMG_5126.png" alt="MarkMellon Profile">
                </div>
            </section>

            <section class="section-preview">
                <div class="section-header">
                    <h2 class="section-title">Featured Projects</h2>
                    <a href="#projects" class="view-all-link">View All →</a>
                </div>
                <div class="portfolio-grid" id="homeProjectsGrid">
                    <div class="skeleton-card"></div><div class="skeleton-card"></div><div class="skeleton-card"></div>
                </div>
            </section>

            <section class="section-preview">
                <div class="section-header">
                    <h2 class="section-title">Recent Gallery Additions</h2>
                    <a href="#gallery" class="view-all-link">View Gallery →</a>
                </div>
                <div class="gallery-grid" id="homeGalleryGrid">
                    <div class="skeleton-card" style="height:300px"></div>
                    <div class="skeleton-card" style="height:400px"></div>
                    <div class="skeleton-card" style="height:250px"></div>
                </div>
            </section>
        </div>
    `;

    try {
        const snap = await db.ref('projects').limitToLast(3).once('value');
        const projects = [];
        snap.forEach(c => projects.unshift({ id: c.key, ...c.val() }));
        
        const pGrid = document.getElementById('homeProjectsGrid');
        if (projects.length === 0) {
            pGrid.innerHTML = '<p>No projects uploaded yet.</p>';
        } else {
            pGrid.innerHTML = projects.map(p => `
                <div class="project-card" data-id="${p.id}">
                    <div class="project-img-wrap">
                        <img src="${escapeHtml(p.image) || 'placeholder.jpg'}" alt="${escapeHtml(p.title)}">
                    </div>
                    <div class="project-info">
                        <h3 class="project-title">${escapeHtml(p.title)}</h3>
                        <p class="project-desc">${escapeHtml(p.description) || ''}</p>
                        <div class="project-actions">
                            <button class="btn-outline">View Details</button>
                        </div>
                    </div>
                </div>
            `).join('');
            
            pGrid.querySelectorAll('.project-card').forEach(card => {
                card.addEventListener('click', () => {
                    window.location.hash = `#project/${card.dataset.id}`;
                });
            });
        }
    } catch (e) { console.error("Home Projects Error:", e); }

    try {
        const snap = await db.ref('gallery').limitToLast(6).once('value');
        const images = [];
        snap.forEach(c => images.unshift({ id: c.key, ...c.val() }));
        
        const gGrid = document.getElementById('homeGalleryGrid');
        if (images.length === 0) {
            gGrid.innerHTML = '<p>No images uploaded yet.</p>';
        } else {
            gGrid.innerHTML = images.map(img => `
                <div class="gallery-item" data-id="${img.id}">
                    <img src="${escapeHtml(img.imageURL)}" alt="${escapeHtml(img.imageName)}" class="loaded" style="opacity: 1;">
                    <div class="gallery-item__overlay">
                        <span class="gallery-item__name">${escapeHtml(img.imageName)}</span>
                    </div>
                </div>
            `).join('');
            
            gGrid.querySelectorAll('.gallery-item').forEach(item => {
                item.addEventListener('click', () => {
                    const imgData = images.find(i => i.id === item.dataset.id);
                    if (imgData) {
                        state.lightboxImages = images; // Set context for lightbox
                        openLightbox(images.indexOf(imgData));
                    }
                });
            });
        }
    } catch(e) { console.error("Home Gallery Error:", e); }
}

// 2. Projects View
async function renderProjects() {
    app.innerHTML = `
        <div class="view">
            <section class="section-preview" style="padding-top: 60px;">
                <div class="section-header">
                    <h2 class="section-title">All Projects</h2>
                </div>
                <div class="portfolio-grid" id="projectsGrid">
                    <div class="skeleton-card"></div><div class="skeleton-card"></div><div class="skeleton-card"></div>
                </div>
            </section>
        </div>
    `;

    try {
        const snap = await db.ref('projects').once('value');
        const projects = [];
        snap.forEach(c => projects.unshift({ id: c.key, ...c.val() }));
        
        const grid = document.getElementById('projectsGrid');
        if(projects.length === 0) {
            grid.innerHTML = '<p>No projects uploaded yet.</p>';
            return;
        }
        
        grid.innerHTML = projects.map(p => `
            <div class="project-card" data-id="${p.id}">
                <div class="project-img-wrap">
                    <img src="${escapeHtml(p.image) || 'placeholder.jpg'}" alt="${escapeHtml(p.title)}">
                </div>
                <div class="project-info">
                    <h3 class="project-title">${escapeHtml(p.title)}</h3>
                    <p class="project-desc">${escapeHtml(p.description) || ''}</p>
                    <div class="project-actions">
                        <button class="btn-outline">View Details</button>
                    </div>
                </div>
            </div>
        `).join('');
        
        grid.querySelectorAll('.project-card').forEach(card => {
            card.addEventListener('click', () => {
                window.location.hash = `#project/${card.dataset.id}`;
            });
        });

    } catch(e) { console.error("Projects Error:", e); }
}

// 3. Project Detail View
async function renderProjectDetail(id) {
    app.innerHTML = `<div class="view project-detail"><p>Loading project...</p></div>`;
    
    try {
        const snap = await db.ref(`projects/${id}`).once('value');
        const p = snap.val();
        
        if(!p) {
            app.innerHTML = '<div class="view project-detail"><h1>Project not found</h1><a href="#projects" class="btn-primary">Back to Projects</a></div>';
            return;
        }

        app.innerHTML = `
            <div class="view project-detail">
                <a href="#projects" class="view-all-link" style="margin-bottom: 20px; display: inline-block;">← Back to Projects</a>
                <h1>${escapeHtml(p.title)}</h1>
                <div class="project-detail-meta">
                    <span><i class="fas fa-calendar"></i> ${escapeHtml(p.date) || 'N/A'}</span>
                    <span><i class="fas fa-tag"></i> ${escapeHtml(p.category) || 'Web Design'}</span>
                </div>
                <img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.title)}" class="project-detail-img">
                <div class="project-detail-content">
                    <p>${escapeHtml(p.description) || 'No description available.'}</p>
                </div>
                <div class="project-detail-actions">
                    ${p.url ? `<a href="${escapeHtml(p.url)}" target="_blank" class="btn-primary"><i class="fas fa-external-link-alt"></i> Visit Website</a>` : ''}
                </div>
            </div>
        `;
    } catch(e) {
        console.error("Project Detail Error:", e);
    }
}

// 4. Gallery View
async function renderGallery() {
    state.filteredImages = [];
    state.displayedCount = 0;
    state.currentPage = 0;
    state.noMore = false;
    state.lastKey = null;
    state.lastDate = null;
    state.activeCategory = "all";
    state.categories = new Set();

    app.innerHTML = `
        <div class="view">
            <section class="category-bar" id="categories">
                <div class="category-inner" id="categoryBar">
                    <button class="category-pill active" data-category="all">All</button>
                </div>
            </section>
            <section class="gallery-section" id="gallery">
                <div class="gallery-grid" id="galleryGrid"></div>
                <div class="gallery-loader" id="galleryLoader" style="display: flex;">
                    <div class="loader-spinner"></div>
                    <span>Loading images...</span>
                </div>
                <div class="gallery-end" id="galleryEnd" style="display:none;">
                    <span>You've viewed all images</span>
                </div>
                <div class="scroll-sentinel" id="scrollSentinel"></div>
            </section>
        </div>
    `;

    galleryDom = {
        categoryBar: document.getElementById("categoryBar"),
        galleryGrid: document.getElementById("galleryGrid"),
        galleryLoader: document.getElementById("galleryLoader"),
        galleryEnd: document.getElementById("galleryEnd"),
        scrollSentinel: document.getElementById("scrollSentinel")
    };

    galleryDom.categoryBar.addEventListener("click", (e) => {
        const pill = e.target.closest(".category-pill");
        if (pill) filterByCategory(pill.dataset.category);
    });

    scrollObserver.observe(galleryDom.scrollSentinel);
    await loadImages();
}

// --- Gallery Data & Pagination (Fixed) ---
async function fetchImagesFromRTDB(limit, startAtKey, startAtDate) {
    let query = db.ref('gallery').orderByChild('uploadDate').limitToLast(limit);
    if (startAtKey && startAtDate) {
        query = query.endAt(startAtDate, startAtKey);
    }

    const snapshot = await query.once('value');
    const data = snapshot.val();
    if (!data) return [];
    
    let images = Object.keys(data).map(key => ({ id: key, ...data[key] }));
    images.reverse(); 

    if (startAtKey && images.length > 0) {
        const lastItemIndex = images.findIndex(img => img.id === startAtKey);
        if (lastItemIndex !== -1) {
            images.splice(lastItemIndex, 1);
        }
    }
    return images;
}

async function loadImages() {
    if (state.loading || state.noMore) return;
    state.loading = true;
    if (galleryDom.galleryLoader) galleryDom.galleryLoader.style.display = "flex";

    try {
        const startAt = state.lastKey || null;
        const startAtDate = state.lastDate || null;
        const newImages = await fetchImagesFromRTDB(12, startAt, startAtDate);
        
        if (newImages.length > 0) {
            state.lastKey = newImages[newImages.length - 1].id;
            state.lastDate = newImages[newImages.length - 1].uploadDate;
        }

        if (newImages.length === 0) {
            state.noMore = true;
            if (galleryDom.galleryLoader) galleryDom.galleryLoader.style.display = "none";
            if (galleryDom.galleryEnd && state.displayedCount > 0) galleryDom.galleryEnd.style.display = "flex";
            return;
        }

        newImages.forEach(img => {
            if (img.category) state.categories.add(img.category);
        });

        state.filteredImages.push(...newImages);
        state.displayedCount += newImages.length;

        renderGalleryItems(newImages);
        renderCategoryPills();

        if (newImages.length < 12) {
            state.noMore = true;
            if (galleryDom.galleryEnd) galleryDom.galleryEnd.style.display = "flex";
        }
    } catch (e) {
        console.error("Error loading images:", e);
        showToast("Failed to load images");
    } finally {
        state.loading = false;
        if (galleryDom.galleryLoader) galleryDom.galleryLoader.style.display = "none";
    }
}

function renderGalleryItems(images) {
    if (!galleryDom.galleryGrid) return;
    const fragment = document.createDocumentFragment();

    images.forEach((img) => {
        const item = document.createElement("div");
        item.className = "gallery-item";
        item.setAttribute("data-id", img.id);
        
        const seoAlt = `${img.imageName} high quality image`;

        item.innerHTML = `
            <div class="gallery-item__skeleton" style="padding-bottom:${getRandomAspect()}%"></div>
            <div class="gallery-item__image-wrap">
                <img class="gallery-item__image" src="${escapeHtml(img.imageURL)}" alt="${escapeHtml(seoAlt)}" title="${escapeHtml(img.imageName)}" loading="lazy" decoding="async">
            </div>
            <div class="gallery-item__overlay">
                <span class="gallery-item__name">${escapeHtml(img.imageName)}</span>
                <span class="gallery-item__cat">${escapeHtml(img.category || "")}</span>
            </div>
        `;

        item.addEventListener("click", () => {
            state.lightboxImages = state.filteredImages;
            openLightbox(state.filteredImages.indexOf(img));
        });
        fragment.appendChild(item);
    });

    galleryDom.galleryGrid.appendChild(fragment);

    // Observe new items for fade-in
    galleryDom.galleryGrid.querySelectorAll(".gallery-item:not(.visible)").forEach(el => {
        itemObserver.observe(el);
    });
    
    // Observe new images for loaded state
    galleryDom.galleryGrid.querySelectorAll(".gallery-item__image:not(.loaded)").forEach(img => {
        if (img.complete && img.naturalHeight > 0) {
            onImageLoaded(img);
        } else {
            img.addEventListener("load", () => onImageLoaded(img), { once: true });
        }
    });
}

function onImageLoaded(img) {
    img.classList.add("loaded");
    const skeleton = img.closest(".gallery-item").querySelector(".gallery-item__skeleton");
    if (skeleton) skeleton.style.display = "none";
}

function getRandomAspect() {
    const aspects = [65, 75, 80, 100, 110, 120, 135, 150];
    return aspects[Math.floor(Math.random() * aspects.length)];
}

function renderCategoryPills() {
    if (!galleryDom.categoryBar) return;
    const allPill = galleryDom.categoryBar.querySelector('[data-category="all"]');
    galleryDom.categoryBar.innerHTML = "";
    galleryDom.categoryBar.appendChild(allPill);

    const sorted = [...state.categories].sort();
    sorted.forEach(cat => {
        if (!cat || cat === "undefined") return;
        const count = state.filteredImages.filter(img => img.category === cat).length;
        const pill = document.createElement("button");
        pill.className = "category-pill";
        pill.setAttribute("data-category", cat);
        pill.textContent = `${cat.charAt(0).toUpperCase() + cat.slice(1)} (${count})`;
        galleryDom.categoryBar.appendChild(pill);
    });
}

function filterByCategory(category) {
    state.activeCategory = category;
    state.noMore = true; // Categories just filter existing loaded images
    if (galleryDom.galleryGrid) galleryDom.galleryGrid.innerHTML = "";
    if (galleryDom.galleryEnd) galleryDom.galleryEnd.style.display = "none";

    if (galleryDom.categoryBar) {
        galleryDom.categoryBar.querySelectorAll(".category-pill").forEach(p => {
            p.classList.toggle("active", p.dataset.category === category);
        });
    }

    if (category === "all") {
        state.noMore = false;
        state.lastKey = null;
        state.lastDate = null;
        loadImages();
    } else {
        const filtered = state.filteredImages.filter(img => img.category === category);
        renderGalleryItems(filtered);
        if (filtered.length === 0 && galleryDom.galleryEnd) {
            galleryDom.galleryEnd.style.display = "flex";
            galleryDom.galleryEnd.querySelector("span").textContent = "No images in this category";
        }
    }
}

// 5. About View
function renderAbout() {
    app.innerHTML = `
        <div class="view about-container">
            <h1>About MarkMellon</h1>
            <p>Welcome to the official MarkMellon portfolio. Curated by <strong>MarkMellon1</strong>, this platform showcases high-quality digital assets, web development projects, and interface designs associated with <strong>SMMMARIA</strong>, the premium global SMM panel.</p>
            <p>As a digital designer and developer, I build automated SaaS solutions and seamless web experiences. This portfolio serves as a visual repository of my platform's evolution, marketing campaigns, and high-resolution digital media.</p>
            <p>Browse the projects and gallery sections to discover the visual identity behind SMMMARIA and the creative work of MarkMellon.</p>
        </div>
    `;
}

// 6. Contact View
function renderContact() {
    app.innerHTML = `
        <div class="view contact-container">
            <h1 style="font-family: var(--font-display); font-size: 3rem; margin-bottom: 16px;">Get In Touch</h1>
            <p style="color: var(--fg-secondary); margin-bottom: 32px;">Have a project in mind or need a custom SMM solution? Fill out the form below.</p>
            <form class="contact-form" id="contactForm">
                <div class="form-group">
                    <label class="form-label">Name</label>
                    <input type="text" id="name" class="form-input" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Email</label>
                    <input type="email" id="email" class="form-input" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Message</label>
                    <textarea id="message" class="form-textarea" required></textarea>
                </div>
                <button type="submit" class="btn-primary">Send Message</button>
            </form>
        </div>
    `;

    document.getElementById('contactForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('name').value;
        const email = document.getElementById('email').value;
        const message = document.getElementById('message').value;

        try {
            await db.ref('messages').push({ name, email, message, date: new Date().toISOString() });
            showToast('Message sent successfully!');
            e.target.reset();
        } catch (error) {
            console.error(error);
            showToast('Failed to send message.', true);
        }
    });
}

// --- Lightbox Logic ---
function openLightbox(index) {
    if (index < 0 || index >= state.lightboxImages.length) return;
    state.lightboxIndex = index;
    state.isZoomed = false;

    const img = state.lightboxImages[index];
    dom.lightboxImage.src = img.imageURL;
    dom.lightboxImage.alt = `${img.imageName} high quality image`;
    dom.lightboxImage.classList.remove("zoomed");
    dom.lightboxTitle.textContent = img.imageName;
    dom.lightboxDesc.textContent = img.description || "";
    dom.lightboxCategory.textContent = img.category || "";
    dom.lightboxCounter.textContent = `${index + 1} / ${state.lightboxImages.length}`;

    dom.lightboxZoom.querySelector("i").className = "fas fa-search-plus";
    dom.lightboxZoom.querySelector("span").textContent = "Zoom";

    renderRelatedImages(img);

    dom.lightbox.classList.add('open');
    document.body.style.overflow = 'hidden';
}

function closeLightbox() {
    dom.lightbox.classList.remove('open');
    document.body.style.overflow = '';
    state.isZoomed = false;
    dom.lightboxImage.classList.remove("zoomed");
}

function navigateLightbox(dir) {
    const newIndex = state.lightboxIndex + dir;
    if (newIndex < 0 || newIndex >= state.lightboxImages.length) return;

    state.isZoomed = false;
    dom.lightboxImage.classList.remove("zoomed");
    dom.lightboxImage.style.opacity = "0";

    setTimeout(() => {
        state.lightboxIndex = newIndex;
        const img = state.lightboxImages[newIndex];
        dom.lightboxImage.src = img.imageURL;
        dom.lightboxImage.alt = `${img.imageName} high quality image`;
        dom.lightboxTitle.textContent = img.imageName;
        dom.lightboxDesc.textContent = img.description || "";
        dom.lightboxCategory.textContent = img.category || "";
        dom.lightboxCounter.textContent = `${newIndex + 1} / ${state.lightboxImages.length}`;
        renderRelatedImages(img);

        dom.lightboxImage.style.opacity = "1";
    }, 200);
}

function toggleZoom() {
    state.isZoomed = !state.isZoomed;
    dom.lightboxImage.classList.toggle("zoomed", state.isZoomed);
    const icon = dom.lightboxZoom.querySelector("i");
    const label = dom.lightboxZoom.querySelector("span");
    if (state.isZoomed) {
        icon.className = "fas fa-search-minus";
        label.textContent = "Unzoom";
    } else {
        icon.className = "fas fa-search-plus";
        label.textContent = "Zoom";
    }
}

function renderRelatedImages(currentImg) {
    dom.relatedGrid.innerHTML = "";
    const related = state.lightboxImages
        .filter(img => img.id !== currentImg.id && img.category === currentImg.category)
        .slice(0, 8);

    related.forEach(img => {
        const thumb = document.createElement("div");
        thumb.className = "related-thumb";
        thumb.innerHTML = `<img src="${img.imageURL}" alt="${img.imageName}" loading="lazy">`;
        thumb.addEventListener("click", () => {
            const idx = state.lightboxImages.indexOf(img);
            if (idx !== -1) navigateLightbox(idx - state.lightboxIndex);
        });
        dom.relatedGrid.appendChild(thumb);
    });
}

dom.lightboxClose.addEventListener('click', closeLightbox);
dom.lightboxPrev.addEventListener('click', () => navigateLightbox(-1));
dom.lightboxNext.addEventListener('click', () => navigateLightbox(1));
dom.lightboxZoom.addEventListener('click', toggleZoom);
dom.lightboxImage.addEventListener('click', toggleZoom);
dom.lightboxImageWrap.addEventListener('click', (e) => {
    if (e.target === dom.lightboxImageWrap) closeLightbox();
});
dom.lightbox.querySelector('.lightbox-backdrop').addEventListener('click', closeLightbox);

// --- Mobile Menu ---
document.getElementById('mobileMenuBtn').addEventListener('click', () => {
    document.getElementById('mobileMenu').classList.toggle('open');
});

// --- Toast & Back To Top ---
function showToast(msg, isError = false) {
    toast.textContent = msg;
    toast.style.background = isError ? '#dc2626' : '#0A0A0A';
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

dom.backToTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
window.addEventListener('scroll', () => {
    dom.backToTop.classList.toggle('visible', window.scrollY > 400);
});