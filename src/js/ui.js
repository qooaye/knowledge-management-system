class UI {
    constructor(storage, search) {
        this.storage = storage;
        this.search = search;
        this.currentEditingId = null;
        this.initializeElements();
        this.bindEvents();
    }

    initializeElements() {
        this.modal = document.getElementById('note-modal');
        this.modalTitle = document.getElementById('modal-title');
        this.noteForm = document.getElementById('note-form');
        this.notesContainer = document.getElementById('notes-container');
        this.searchInput = document.getElementById('search-input');
        this.categoryList = document.getElementById('category-list');
        this.tagList = document.getElementById('tag-list');
        
        this.titleInput = document.getElementById('note-title');
        this.contentInput = document.getElementById('note-content');
        this.categorySelect = document.getElementById('note-category');
        this.tagsInput = document.getElementById('note-tags');
    }

    bindEvents() {
        document.getElementById('add-note-btn').addEventListener('click', () => this.showAddNoteModal());
        document.getElementById('search-submit').addEventListener('click', () => this.performSearch());
        document.getElementById('cancel-btn').addEventListener('click', () => this.hideModal());
        document.querySelector('.close').addEventListener('click', () => this.hideModal());
        
        this.searchInput.addEventListener('input', (e) => this.handleSearchInput(e));
        this.searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.performSearch();
            }
        });
        
        this.noteForm.addEventListener('submit', (e) => this.handleNoteSubmit(e));
        
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.hideModal();
            }
        });
    }

    showAddNoteModal() {
        this.currentEditingId = null;
        this.modalTitle.textContent = 'Add Note';
        this.clearForm();
        this.modal.style.display = 'block';
        this.titleInput.focus();
    }

    showEditNoteModal(noteId) {
        const note = this.storage.getNoteById(noteId);
        if (!note) return;

        this.currentEditingId = noteId;
        this.modalTitle.textContent = 'Edit Note';
        
        this.titleInput.value = note.title;
        this.contentInput.value = note.content;
        this.categorySelect.value = note.category || '';
        this.tagsInput.value = note.tags ? note.tags.join(', ') : '';
        
        this.modal.style.display = 'block';
        this.titleInput.focus();
    }

    hideModal() {
        this.modal.style.display = 'none';
        this.clearForm();
        this.currentEditingId = null;
    }

    clearForm() {
        this.titleInput.value = '';
        this.contentInput.value = '';
        this.categorySelect.value = '';
        this.tagsInput.value = '';
    }

    handleNoteSubmit(e) {
        e.preventDefault();
        
        const title = this.titleInput.value.trim();
        const content = this.contentInput.value.trim();
        const category = this.categorySelect.value;
        const tagsText = this.tagsInput.value.trim();
        const tags = tagsText ? tagsText.split(',').map(tag => tag.trim().toLowerCase()) : [];

        if (!title || !content) {
            alert('Please fill in both title and content');
            return;
        }

        const noteData = { title, content, category, tags };

        if (this.currentEditingId) {
            this.storage.updateNote(this.currentEditingId, noteData);
        } else {
            this.storage.addNote(noteData);
        }

        this.hideModal();
        this.refreshDisplay();
    }

    handleSearchInput(e) {
        const query = e.target.value;
        if (query.length >= 2) {
            this.showSearchSuggestions(query);
        } else {
            this.hideSearchSuggestions();
        }
    }

    showSearchSuggestions(query) {
        const suggestions = this.search.searchSuggestions(query);
        // Implementation for search suggestions dropdown would go here
    }

    hideSearchSuggestions() {
        // Implementation for hiding search suggestions would go here
    }

    performSearch() {
        const query = this.searchInput.value.trim();
        const results = this.search.searchNotes(query);
        this.displayNotes(results, query);
    }

    displayNotes(notes, searchQuery = '') {
        this.notesContainer.innerHTML = '';

        if (notes.length === 0) {
            this.notesContainer.innerHTML = '<div class="no-notes">No notes found</div>';
            return;
        }

        notes.forEach(note => {
            const noteElement = this.createNoteElement(note, searchQuery);
            this.notesContainer.appendChild(noteElement);
        });
    }

    createNoteElement(note, searchQuery = '') {
        const noteDiv = document.createElement('div');
        noteDiv.className = 'note-item';
        noteDiv.dataset.noteId = note.id;

        const title = searchQuery ? this.search.highlightSearchTerms(note.title, searchQuery) : note.title;
        const content = searchQuery ? this.search.highlightSearchTerms(note.content, searchQuery) : note.content;
        const preview = content.length > 200 ? content.substring(0, 200) + '...' : content;

        const tagsHtml = note.tags && note.tags.length > 0 
            ? `<div class="note-tags">${note.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}</div>`
            : '';

        const categoryHtml = note.category 
            ? `<span class="note-category">${note.category}</span>`
            : '';

        noteDiv.innerHTML = `
            <div class="note-header">
                <h3 class="note-title">${title}</h3>
                <div class="note-actions">
                    <button class="btn btn-small edit-btn" data-note-id="${note.id}">Edit</button>
                    <button class="btn btn-small btn-danger delete-btn" data-note-id="${note.id}">Delete</button>
                </div>
            </div>
            <div class="note-meta">
                ${categoryHtml}
                <span class="note-date">Updated: ${new Date(note.updatedAt).toLocaleDateString()}</span>
            </div>
            <div class="note-content">${preview}</div>
            ${tagsHtml}
        `;

        noteDiv.querySelector('.edit-btn').addEventListener('click', () => {
            this.showEditNoteModal(note.id);
        });

        noteDiv.querySelector('.delete-btn').addEventListener('click', () => {
            this.deleteNote(note.id);
        });

        return noteDiv;
    }

    deleteNote(noteId) {
        if (confirm('Are you sure you want to delete this note?')) {
            this.storage.deleteNote(noteId);
            this.refreshDisplay();
        }
    }

    refreshDisplay() {
        this.displayAllNotes();
        this.updateSidebar();
    }

    displayAllNotes() {
        const notes = this.storage.getNotes();
        this.displayNotes(notes);
    }

    updateSidebar() {
        this.updateCategoryList();
        this.updateTagList();
    }

    updateCategoryList() {
        const categories = this.storage.getCategories();
        this.categoryList.innerHTML = '';

        categories.forEach(category => {
            const categoryElement = document.createElement('div');
            categoryElement.className = 'category-item';
            categoryElement.textContent = category;
            categoryElement.addEventListener('click', () => this.filterByCategory(category));
            this.categoryList.appendChild(categoryElement);
        });
    }

    updateTagList() {
        const popularTags = this.search.getPopularTags(10);
        this.tagList.innerHTML = '';

        popularTags.forEach(({ tag, count }) => {
            const tagElement = document.createElement('div');
            tagElement.className = 'tag-item';
            tagElement.innerHTML = `<span class="tag-name">${tag}</span> <span class="tag-count">(${count})</span>`;
            tagElement.addEventListener('click', () => this.filterByTag(tag));
            this.tagList.appendChild(tagElement);
        });
    }

    filterByCategory(category) {
        const results = this.search.searchNotes('', { category });
        this.displayNotes(results);
    }

    filterByTag(tag) {
        const results = this.search.searchNotes('', { tags: [tag] });
        this.displayNotes(results);
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    exportData() {
        const data = this.storage.exportData();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `knowledge-management-export-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
        this.showNotification('Data exported successfully!', 'success');
    }

    importData(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                this.storage.importData(data);
                this.refreshDisplay();
                this.showNotification('Data imported successfully!', 'success');
            } catch (error) {
                this.showNotification('Error importing data: Invalid file format', 'error');
            }
        };
        reader.readAsText(file);
    }
}