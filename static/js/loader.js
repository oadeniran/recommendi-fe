document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('recommendation-form');
    const resultsGrid = document.getElementById('recommendations-grid');
    const paginationContainer = document.getElementById('pagination-container');
    const categoryButtons = document.querySelectorAll('.category-btn');
    const hiddenCategoryInput = document.getElementById('selected-category');

    let isLoading = false;

    // --- Core Function: Fetch data based on URL ---
    const fetchAndRender = async (append = false) => {
        if (isLoading) return;
        isLoading = true;

        const params = new URLSearchParams(window.location.search);
        const page = parseInt(params.get('page')) || 1;

        if (page === 1 && !append) {
            resultsGrid.innerHTML = ''; // Clear grid for new search
            showSkeletons();
        } else {
            const btn = document.getElementById('load-more-btn');
            if (btn) btn.textContent = 'Loading...';
        }

        try {
            await new Promise(res => setTimeout(res, 500)); // Simulate network delay
            const response = await fetch(`/api/recommendations?${params.toString()}`);
            if (!response.ok) throw new Error('API response failed');
            const data = await response.json();

            if (page === 1 && !append) hideSkeletons();

            data.recommendations.forEach(item => {
                const category = params.get('category') || 'Movie';
                resultsGrid.append(createCard(item, category));
            });
            updatePagination(data.has_next);
        } catch (error) {
            console.error('Fetch error:', error);
            hideSkeletons();
            resultsGrid.innerHTML = `<p class="error-message">Oops! Something went wrong.</p>`;
        } finally {
            isLoading = false;
        }
    };

    // --- Event Handlers ---
    // 1. On Form Submit (Message Search)
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        const params = new URLSearchParams();
        params.set('search_type', 'message');
        params.set('query', formData.get('user_message'));
        params.set('category', formData.get('category'));
        params.set('page', '1');
        
        // Update URL and fetch
        history.pushState({}, '', `?${params.toString()}`);
        fetchAndRender();
    });

    // 2. On Tag Click (Tag Search) - uses event delegation
    resultsGrid.addEventListener('click', (e) => {
        const tagLink = e.target.closest('.tag-link');
        if (tagLink) {
            e.preventDefault();
            const params = new URLSearchParams();
            params.set('search_type', 'tag');
            params.set('query', tagLink.dataset.tagId);
            params.set('category', tagLink.dataset.category);
            params.set('page', '1');

            // Update URL and fetch
            history.pushState({}, '', `?${params.toString()}`);
            fetchAndRender();
        }
    });

    // 3. On "Load More" Click
    paginationContainer.addEventListener('click', (e) => {
        if (e.target.id === 'load-more-btn') {
            const params = new URLSearchParams(window.location.search);
            const currentPage = parseInt(params.get('page')) || 1;
            params.set('page', currentPage + 1);

            // Update URL and fetch (appending results)
            history.pushState({}, '', `?${params.toString()}`);
            fetchAndRender(true); // `true` to append
        }
    });
    
    // 4. On Browser Back/Forward
    window.addEventListener('popstate', () => {
        fetchAndRender();
    });

    // 5. Initial page load check
    if (window.location.search) {
        // If URL has params, populate the form and fetch results
        const params = new URLSearchParams(window.location.search);
        form.querySelector('#user_message').value = params.get('query') || '';
        const category = params.get('category') || 'Movie';
        hiddenCategoryInput.value = category;
        categoryButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.value === category);
        });
        fetchAndRender();
    }

    // --- UI Helper Functions ---
    const showSkeletons = () => {
        const skeletonTemplate = document.getElementById('skeleton-card-template');
        for (let i = 0; i < 4; i++) resultsGrid.append(skeletonTemplate.content.cloneNode(true));
    };

    const hideSkeletons = () => {
        resultsGrid.querySelectorAll('.skeleton-card').forEach(s => s.remove());
    };

    const createCard = (item, category) => {
        const card = document.createElement('div');
        card.className = 'rec-card';
        card.dataset.itemData = JSON.stringify(item);
        
        // Tags need to know their category for the next search
        let tagsHTML = '<div class="rec-card-tags">';
        if (item.tags && item.tags.length > 0) {
            item.tags.slice(0, 3).forEach(tag => {
                tagsHTML += `<a href="#" class="tag-link" data-tag-id="${tag.id}" data-category="${category}">${tag.name}</a>`;
            });
        }
        tagsHTML += '</div>';

        // ... rest of card creation is the same ...
        const titleText = item.title || 'Untitled', date = item.release_date || item.publication_date, titleWithDate = date ? `${titleText} (${date})` : titleText;
        let metaHTML = (category === 'Book' && item.author) ? `<span class="rec-card-genre">by ${item.author}</span>` : (category === 'Movie' && item.genre) ? `<span class="rec-card-genre">${item.genre}</span>` : '';
        card.innerHTML = `<img src="${item.image || 'https://via.placeholder.com/400x225.png?text=No+Image'}" alt="Cover for ${titleText}" class="rec-card-img"><div class="rec-card-content"><h3 class="rec-card-title">${titleWithDate}</h3>${metaHTML}<p class="rec-card-description">${(item.description || '').substring(0, 100)}...</p><p class="rec-card-context"><strong>Why we chose it:</strong> ${(item.context || '').substring(0, 80)}...</p>${tagsHTML}<button class="view-more-btn">View More →</button></div>`;
        card.querySelector('.view-more-btn').addEventListener('click', () => openModal(item, category));
        return card;
    };

    const updatePagination = (hasNext) => {
        paginationContainer.innerHTML = '';
        if (hasNext) {
            const loadMoreBtn = document.createElement('button');
            loadMoreBtn.id = 'load-more-btn';
            loadMoreBtn.className = 'load-more-btn';
            loadMoreBtn.textContent = 'Load More';
            paginationContainer.append(loadMoreBtn);
        }
    };
    
    const modalOverlay = document.getElementById('modal-overlay'), modalBody = document.getElementById('modal-body'), closeModalBtn = document.getElementById('modal-close');

    const openModal = (item, category) => {
        let tagsHTML = '<div class="modal-tags">';
        if (item.tags && item.tags.length > 0) item.tags.forEach(tag => { tagsHTML += `<a href="/tag/${tag.id}" class="tag-link">${tag.name}</a>`; });
        tagsHTML += '</div>';
        
        // **FIXED**: Simplified extra data handling
        const extraDataHTML = `
            <div class="extra-data-container">
                <h3>Extra Data</h3>
                <pre class="extra-data-pre">${item.extra_data || 'No extra data available.'}</pre>
            </div>`;

        let footerMeta = (category === 'Book' && item.author) ? `by ${item.author}` : (category === 'Movie' && item.genre) ? `Genre: ${item.genre}` : '';
        let actionBtnHTML = '';
        if (item.action) {
            const isAchieved = item.action.status;
            const btnText = isAchieved ? item.action.name : `Mark as ${item.action.name}`;
            const btnClass = isAchieved ? 'modal-action-btn achieved' : 'modal-action-btn';
            const btnDisabled = isAchieved ? 'disabled' : '';
            actionBtnHTML = `<button class="${btnClass}" ${btnDisabled}>${btnText}</button>`;
        }
        
        const footerHTML = `<div class="modal-footer"><div class="footer-meta">${footerMeta}</div><div class="footer-actions"><button class="btn-reaction">👍</button><button class="btn-reaction">👎</button>${actionBtnHTML}</div></div>`;

        modalBody.innerHTML = `<img src="${item.image || 'https://via.placeholder.com/400x600.png?text=No+Image'}" alt="Cover for ${item.title}" class="modal-img"><div class="modal-text-content"><h2>${item.title}</h2><h3>Description</h3><p>${item.description || 'No description available.'}</p><h3>Context</h3><p>${item.context || 'No context available.'}</p><h3>Tags</h3>${tagsHTML}${extraDataHTML}${footerHTML}</div>`;
        modalOverlay.classList.add('active');
    };

    closeModalBtn.addEventListener('click', () => modalOverlay.classList.remove('active'));
    modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) modalOverlay.classList.remove('active'); });
});