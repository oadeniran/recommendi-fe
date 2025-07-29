document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Element References ---
    const form = document.getElementById('recommendation-form');
    const messageLabel = form.querySelector('label[for="user_message"]');
    const messageTextarea = document.getElementById('user_message');
    const resultsGrid = document.getElementById('recommendations-grid');
    const paginationContainer = document.getElementById('pagination-container');
    const hiddenCategoryInput = document.getElementById('selected-category');
    const menuToggleBtn = document.getElementById('menu-toggle-btn');
    const sidebarOverlay = document.querySelector('.sidebar-overlay'); 
    // Sidebar elements
    const sidebar = document.querySelector('.sidebar');
    const newSessionBtn = document.getElementById('new-session-btn');
    const backBtn = document.getElementById('sidebar-back-btn');
    const sessionList = document.getElementById('session-history-list');
    const clearHistoryBtn = document.getElementById('clear-history-btn');
    // Modal elements
    const modalOverlay = document.getElementById('modal-overlay');
    const modalBody = document.getElementById('modal-body');
    const closeModalBtn = document.getElementById('modal-close');

    // --- State & Config ---
    let isLoading = false;
    const messageHistory = {};
    const labelMessages = {};
    const placeholderMessages = {};

    // --- SESSION HISTORY MANAGEMENT ---
    const getSessionHistory = () => JSON.parse(localStorage.getItem('recommendi_sessions')) || [];
    
    const saveSessionHistory = (history) => {
        localStorage.setItem('recommendi_sessions', JSON.stringify(history));
    };

    const addToHistory = (session) => {
        let history = getSessionHistory();
        if (!history.some(s => s.full_message === session.full_message)) {
            history.unshift(session);
            if (history.length > 20) history.pop();
            saveSessionHistory(history);
            updateClearButtonState();

            // Future extension: Send this history to the backend if needed
            // This is "fire-and-forget". We send the request but don't wait for it.
            // The UI continues to work instantly.
            fetch('/api/update_session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(session)
            }).catch(error => {
                // Log any network error silently in the console, as it's a background task.
                console.error('Background sync failed:', error);
            });
        }
    };
    
    const renderSessionHistory = () => {
        const history = getSessionHistory();
        sessionList.innerHTML = '';
        const currentPath = window.location.search;
        history.forEach(session => {
            const li = document.createElement('li');
            const a = document.createElement('a');
            a.href = session.url;
            a.textContent = session.clipped_message;
            a.title = session.full_message;
            if (session.url === currentPath) {
                a.classList.add('active');
            }
            a.addEventListener('click', (e) => {
                e.preventDefault();
                window.history.pushState({}, '', session.url);
                // fetchAndRender();
                // renderSessionHistory(); 
                handleStateChange(); // Use the new state change handler
            });
            li.appendChild(a);
            sessionList.appendChild(li);
        });
    };

    const updateSearchContextUI = (context, prefixText = '') => {
    const container = document.getElementById('search-context-display');
    if (context && context.type === 'tag') {
        // Create the prefix with a space only if the text exists
        const prefix = prefixText ? prefixText + ' ' : '';
        
        container.innerHTML = `
            <div class="search-context-wrapper">
                <span>${prefix}Results for tag:</span>
                <span class="tag-pill">${context.name}</span>
            </div>
        `;
    } 
    else if (context && context.type === 'loading') {
        container.innerHTML = `<div class="search-context-wrapper"><span>Loading recommendations...</span></div>`;
    }
    else {
        container.innerHTML = '';
    }
    };

    const updateClearButtonState = () => {
        const history = getSessionHistory();
        clearHistoryBtn.disabled = history.length === 0;
    };

    const handleStateChange = () => {
        const params = new URLSearchParams(window.location.search);
        
        // Update the form to match the URL state
        if (params.get('search_type') === 'message') {
             messageTextarea.value = params.get('query') || '';
        } else {
             messageTextarea.value = '';
        }

        const category = params.get('category') || 'Movie';
        hiddenCategoryInput.value = category;
        
        document.querySelectorAll('.category-buttons-container .category-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.value === category);
        });

        messageLabel.textContent = labelMessages[category] || "What's on your mind?";
        messageTextarea.placeholder = placeholderMessages[category] || "Tell me what you're looking for...";

        // Fetch the data and update the session list's active state
        fetchAndRender();
        renderSessionHistory();
    };
    
    // --- CORE DATA FETCHING ---
    const fetchAndRender = async (append = false) => {
        if (isLoading) return;
        isLoading = true;

        const params = new URLSearchParams(window.location.search);
        if (!params.has('search_type')) {
            isLoading = false;
            return;
        }
        
        const page = parseInt(params.get('page')) || 1;

        if (!append && page > 1) {
            params.set('page', '1');
            // Update the URL in the browser bar without reloading the page
            history.replaceState({}, '', `?${params.toString()}`);
        }

        if (!append) {
            resultsGrid.innerHTML = '';
            paginationContainer.innerHTML = '';
            showSkeletons();
            updateSearchContextUI({ type: 'loading' }); // Show loading state in search context
        } else {
            const btn = document.getElementById('load-more-btn');
            if (btn) {
                btn.textContent = 'Loading...';
                btn.disabled = true;
            }
        }

        try {
            const response = await fetch(`/api/recommendations?${params.toString()}`);
            if (!response.ok) throw new Error('API response failed');
            const data = await response.json();

            updateSearchContextUI(data.search_context); // Update search context UI

            if (!append) hideSkeletons();
            
            if (data.recommendations.length === 0 && !append) {
                const message = data.error_message || "We couldn't find any recommendations. Please try a different search.";
                resultsGrid.innerHTML = `<p class="error-message">${message}</p>`;
                return;
            }
            
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

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        const message = formData.get('user_message');
        if (!message.trim() || isLoading) return;

        //isLoading = true; // Set loading state

        try {
            // 1. NEW: Create the session on the backend first
            const sessionResponse = await fetch('/api/create_session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: message })
            });
            if (!sessionResponse.ok) throw new Error('Failed to create session');
            const sessionData = await sessionResponse.json();
            const sessionId = sessionData.session_id;

            // 2. Build the URL with the new session ID
            const params = new URLSearchParams();
            params.set('search_type', 'message');
            params.set('query', message);
            params.set('category', formData.get('category'));
            params.set('page', '1');
            params.set('session_id', sessionId); // Add the session ID
            
            const newUrl = `?${params.toString()}`;
            history.pushState({}, '', newUrl);

            // 3. Add to localStorage history (including the session ID)
            addToHistory({
                id: Date.now(),
                session_id: sessionId, // Store the ID
                full_message: message,
                clipped_message: message.length > 25 ? message.substring(0, 25) + '...' : message,
                url: newUrl
            });
            
            renderSessionHistory();
            fetchAndRender();

        } catch (error) {
            console.error("Error creating session:", error);
        }
    });

    document.addEventListener('click', (e) => {
        const tagLink = e.target.closest('.tag-link');
        const loadMoreBtn = e.target.closest('#load-more-btn');

        if (tagLink) {
            e.preventDefault();
            closeModal();

            //ensure button is set to the current category
            const currentCategory = hiddenCategoryInput.value;
            if (tagLink.dataset.category !== currentCategory) {
                hiddenCategoryInput.value = tagLink.dataset.category;
                document.querySelectorAll('.category-buttons-container .category-btn').forEach(btn => {
                    btn.classList.toggle('active', btn.dataset.value === tagLink.dataset.category); 
                });
                messageLabel.textContent = labelMessages[tagLink.dataset.category] || "What's on your mind?";
                messageTextarea.placeholder = placeholderMessages[tagLink.dataset.category] || "Tell me what you're looking for...";
            }

            // Ensure the message textarea is cleared when switching to a tag search
            messageTextarea.value = '';

            // Update tag context display to loading state
            updateSearchContextUI({
                type: 'tag',
                name: tagLink.dataset.tagName
            }, 'Loading');

            const params = new URLSearchParams(window.location.search);
            params.set('search_type', 'tag');
            params.set('query', tagLink.dataset.tagId);
            params.set('category', tagLink.dataset.category);
            params.set('tag_name', tagLink.dataset.tagName);
            params.set('page', '1');
            history.pushState({}, '', `?${params.toString()}`);
            fetchAndRender();
            renderSessionHistory();
        }

        if (loadMoreBtn && !isLoading) {
            const params = new URLSearchParams(window.location.search);
            const currentPage = parseInt(params.get('page')) || 1;
            params.set('page', currentPage + 1);
            history.pushState({}, '', `?${params.toString()}`);
            fetchAndRender(true);
        }
    });
    
    window.addEventListener('popstate', () => {
        // Check if our application's history has been cleared
        const sessionHistory = getSessionHistory();
        if (sessionHistory.length === 0) {
            // If it's empty, ignore the old URL and force a clean state.
            resultsGrid.innerHTML = '';
            paginationContainer.innerHTML = '';
            updateSearchContextUI(null); // Clear search context
            form.reset();
            history.replaceState({}, '', '/'); // Clean the URL
            return; // Stop here
        }
        // If history exists, proceed with the normal state change
        handleStateChange();   
    });

    clearHistoryBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to clear all session history? This cannot be undone.')) {
            // 1. Clear the data from localStorage
            localStorage.removeItem('recommendi_sessions');
            
            // 2. Clear the session list from the UI
            renderSessionHistory();

            // 3. Clear the recommendation results from the main view
            resultsGrid.innerHTML = '';
            paginationContainer.innerHTML = '';
            updateSearchContextUI(null); // Clear search context
            updateClearButtonState();

            // 4. Reset the URL to the base path without reloading the page
            history.replaceState({}, '', '/');
        }
    });

    backBtn.addEventListener('click', () => history.back());
    newSessionBtn.addEventListener('click', () => {
        resultsGrid.innerHTML = '';
        paginationContainer.innerHTML = '';
        form.reset();
        // Reset category button and text to default
        setupCategoryButtons(true);
        history.pushState({}, '', '/');
        renderSessionHistory();
    });

    menuToggleBtn.addEventListener('click', () => {
        sidebar.classList.toggle('is-open');
        sidebarOverlay.classList.toggle('is-active');
    });

    sidebarOverlay.addEventListener('click', () => {
        sidebar.classList.remove('is-open');
        sidebarOverlay.classList.remove('is-active');
    });
    
    // --- SETUP & UI HELPERS ---
    const setupCategoryButtons = async (isReset = false) => {
        const container = document.querySelector('.category-buttons-container');
        if(isReset) container.innerHTML = '';

        try {
            const response = await fetch('/api/categories');
            const categories = await response.json();
            categories.forEach((cat, index) => {
                labelMessages[cat.value] = cat.label;
                placeholderMessages[cat.value] = cat.placeholder;

                if(isReset || container.children.length < categories.length) {
                    const button = document.createElement('button');
                    button.type = 'button';
                    button.className = 'category-btn';
                    button.dataset.value = cat.value;
                    button.textContent = cat.name;
                    if (index === 0) {
                        button.classList.add('active');
                        hiddenCategoryInput.value = cat.value;
                        messageLabel.textContent = cat.label;
                        messageTextarea.placeholder = cat.placeholder;
                    }
                    button.addEventListener('click', function() {
                        const newCategoryValue = this.dataset.value;
                        const previousCategoryValue = hiddenCategoryInput.value;
                        if (newCategoryValue === previousCategoryValue) return;
                        messageHistory[previousCategoryValue] = messageTextarea.value;
                        container.querySelectorAll('.category-btn').forEach(btn => btn.classList.remove('active'));
                        this.classList.add('active');
                        hiddenCategoryInput.value = newCategoryValue;
                        messageLabel.textContent = labelMessages[newCategoryValue];
                        messageTextarea.placeholder = placeholderMessages[newCategoryValue];
                        messageTextarea.value = messageHistory[newCategoryValue] || '';
                    });
                    container.appendChild(button);
                }
            });
        } catch (error) {
            console.error('Failed to load categories:', error);
            container.innerHTML = '<p class="error-message">Could not load categories.</p>';
        }
    };

    const showSkeletons = () => { const resultsGrid = document.getElementById('recommendations-grid'); const skeletonTemplate = document.getElementById('skeleton-card-template'); for (let i = 0; i < 2; i++) resultsGrid.append(skeletonTemplate.content.cloneNode(true)); };
    const hideSkeletons = () => { document.querySelectorAll('.skeleton-card').forEach(s => s.remove()); };
    const createCard = (item, category) => { 
        const card = document.createElement('div');
            card.className = 'rec-card';
            card.dataset.itemData = JSON.stringify(item);
            let tagsHTML = '<div class="rec-card-tags">';
            if (item.tags && item.tags.length > 0) item.tags.slice(0, 3).forEach(tag => { tagsHTML += `<a href="#" class="tag-link" data-tag-id="${tag.id}" data-tag-name="${tag.name}" data-category="${category}">${tag.name}</a>`; });
            tagsHTML += '</div>';
            const titleText = item.title || 'Untitled', date = item.release_date || item.publication_date, titleWithDate = date ? `${titleText} (${date})` : titleText;
            let metaHTML = '';
            if (item.author) {
                metaHTML = `<span class="rec-card-genre">by ${item.author}</span>`;
            } else if (item.genre) {
                metaHTML = `<span class="rec-card-genre">${item.genre}</span>`;
            }
            card.innerHTML = `<img src="${item.image.url || 'https://via.placeholder.com/400x225.png?text=No+Image'}" alt="Cover for ${titleText}" class="rec-card-img"><div class="rec-card-content"><h3 class="rec-card-title">${titleWithDate}</h3>${metaHTML}<p class="rec-card-description">${(item.description || '').substring(0, 100)}...</p><p class="rec-card-context"><strong>Why we chose it:</strong> ${(item.context || '').substring(0, 80)}...</p>${tagsHTML}<button class="view-more-btn">View More →</button></div>`;
            card.querySelector('.view-more-btn').addEventListener('click', () => openModal(item, category));
            return card;
        };
    const updatePagination = (hasNext) => {
        const paginationContainer = document.getElementById('pagination-container');
        paginationContainer.innerHTML = '';
        if (hasNext) {
            const loadMoreBtn = document.createElement('button');
            loadMoreBtn.id = 'load-more-btn';
            loadMoreBtn.className = 'load-more-btn';
            loadMoreBtn.textContent = 'Load More';
            paginationContainer.append(loadMoreBtn);
        }
    };
    
    const openModal = (item, category) => { 
        const modalOverlay = document.getElementById('modal-overlay'), modalBody = document.getElementById('modal-body');
        let tagsHTML = '<div class="modal-tags">';
        if (item.tags && item.tags.length > 0) item.tags.forEach(tag => { tagsHTML += `<a href="#" class="tag-link" data-tag-id="${tag.id}" data-tag-name="${tag.name}" data-category="${category}">${tag.name}</a>`; });
        tagsHTML += '</div>';
        let extraDataHTML = '';
        const extraData = item.extra_data_string || 'No extra data available.';
        const clipLength = 200; // Set the character limit

        if (extraData.length > clipLength) {
            // If data is long, create clipped version with a toggle button
            const clippedData = extraData.substring(0, clipLength) + '...';
            extraDataHTML = `
                <div class="extra-data-container">
                    <h3>Extra Data</h3>
                    <pre class="extra-data-pre" id="extra-data-content">${clippedData}</pre>
                    <button class="toggle-extra-data" id="toggle-extra-btn" data-state="clipped">Show More</button>
                </div>`;
        } else {
            // If data is short, display as normal
            extraDataHTML = `
                <div class="extra-data-container">
                    <h3>Extra Data</h3>
                    <pre class="extra-data-pre">${extraData}</pre>
                </div>`;
        }
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
        modalBody.innerHTML = `
            <img src="${item.image.url || 'https://via.placeholder.com/600x338.png?text=No+Image'}" alt="Cover for ${item.title}" class="modal-img-top">
            <div class="modal-text-content">
                <h2>${item.title}</h2>
                <h3>Description</h3>
                <p>${item.description || 'No description available.'}</p>
                <h3>Context</h3>
                <p>${item.context || 'No context available.'}</p>
                <h3>Tags</h3>
                ${tagsHTML}
                ${extraDataHTML}
                ${footerHTML}
            </div>
        `;
        modalOverlay.classList.add('active');

        const toggleBtn = document.getElementById('toggle-extra-btn');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', function() {
                const content = document.getElementById('extra-data-content');
                if (this.dataset.state === 'clipped') {
                    content.textContent = extraData; // Show full text
                    this.textContent = 'Show Less';
                    this.dataset.state = 'expanded';
                } else {
                    content.textContent = extraData.substring(0, clipLength) + '...'; // Show clipped text
                    this.textContent = 'Show More';
                    this.dataset.state = 'clipped';
                }
            });
        }
    };

    const closeModal = () => {
        modalOverlay.classList.remove('active');
    };

    closeModalBtn.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', (e) => { 
        if (e.target === modalOverlay) closeModal(); 
    });

    // --- App Initialization ---
    const initialize = () => {
        // First, create the category buttons so they are ready.
        setupCategoryButtons(); 

        // Then update the clear button state based on existing history.
        updateClearButtonState();

        // Then, handle the initial state from the URL.
        // This single function will render the session history AND fetch results if needed.
        handleStateChange();    
    };

    initialize();
});