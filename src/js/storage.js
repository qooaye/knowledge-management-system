class Storage {
    constructor() {
        this.storageKey = 'kms-notes';
        this.categoriesKey = 'kms-categories';
        this.tagsKey = 'kms-tags';
    }

    getNotes() {
        const notes = localStorage.getItem(this.storageKey);
        return notes ? JSON.parse(notes) : [];
    }

    saveNotes(notes) {
        localStorage.setItem(this.storageKey, JSON.stringify(notes));
    }

    addNote(note) {
        const notes = this.getNotes();
        note.id = this.generateId();
        note.createdAt = new Date().toISOString();
        note.updatedAt = new Date().toISOString();
        notes.push(note);
        this.saveNotes(notes);
        this.updateCategories(note.category);
        this.updateTags(note.tags);
        return note;
    }

    updateNote(id, updatedNote) {
        const notes = this.getNotes();
        const index = notes.findIndex(note => note.id === id);
        if (index !== -1) {
            notes[index] = { ...notes[index], ...updatedNote, updatedAt: new Date().toISOString() };
            this.saveNotes(notes);
            this.updateCategories(updatedNote.category);
            this.updateTags(updatedNote.tags);
            return notes[index];
        }
        return null;
    }

    deleteNote(id) {
        const notes = this.getNotes();
        const filteredNotes = notes.filter(note => note.id !== id);
        this.saveNotes(filteredNotes);
        this.refreshCategoriesAndTags();
    }

    getNoteById(id) {
        const notes = this.getNotes();
        return notes.find(note => note.id === id) || null;
    }

    getCategories() {
        const categories = localStorage.getItem(this.categoriesKey);
        return categories ? JSON.parse(categories) : [];
    }

    getTags() {
        const tags = localStorage.getItem(this.tagsKey);
        return tags ? JSON.parse(tags) : [];
    }

    updateCategories(category) {
        if (!category) return;
        const categories = this.getCategories();
        if (!categories.includes(category)) {
            categories.push(category);
            localStorage.setItem(this.categoriesKey, JSON.stringify(categories));
        }
    }

    updateTags(tags) {
        if (!tags || tags.length === 0) return;
        const existingTags = this.getTags();
        const newTags = tags.filter(tag => !existingTags.includes(tag));
        if (newTags.length > 0) {
            const allTags = [...existingTags, ...newTags];
            localStorage.setItem(this.tagsKey, JSON.stringify(allTags));
        }
    }

    refreshCategoriesAndTags() {
        const notes = this.getNotes();
        const categories = [...new Set(notes.map(note => note.category).filter(Boolean))];
        const tags = [...new Set(notes.flatMap(note => note.tags || []))];
        
        localStorage.setItem(this.categoriesKey, JSON.stringify(categories));
        localStorage.setItem(this.tagsKey, JSON.stringify(tags));
    }

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    exportData() {
        return {
            notes: this.getNotes(),
            categories: this.getCategories(),
            tags: this.getTags(),
            exportedAt: new Date().toISOString()
        };
    }

    importData(data) {
        if (data.notes) {
            this.saveNotes(data.notes);
        }
        if (data.categories) {
            localStorage.setItem(this.categoriesKey, JSON.stringify(data.categories));
        }
        if (data.tags) {
            localStorage.setItem(this.tagsKey, JSON.stringify(data.tags));
        }
    }

    clearAll() {
        localStorage.removeItem(this.storageKey);
        localStorage.removeItem(this.categoriesKey);
        localStorage.removeItem(this.tagsKey);
    }
}