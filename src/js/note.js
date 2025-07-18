class Note {
    constructor(title, content, category = '', tags = []) {
        this.title = title;
        this.content = content;
        this.category = category;
        this.tags = Array.isArray(tags) ? tags : [];
        this.id = null;
        this.createdAt = null;
        this.updatedAt = null;
    }

    static fromObject(obj) {
        const note = new Note(obj.title, obj.content, obj.category, obj.tags);
        note.id = obj.id;
        note.createdAt = obj.createdAt;
        note.updatedAt = obj.updatedAt;
        return note;
    }

    toObject() {
        return {
            id: this.id,
            title: this.title,
            content: this.content,
            category: this.category,
            tags: this.tags,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }

    hasTag(tag) {
        return this.tags.includes(tag.toLowerCase());
    }

    addTag(tag) {
        const lowerTag = tag.toLowerCase();
        if (!this.hasTag(lowerTag)) {
            this.tags.push(lowerTag);
        }
    }

    removeTag(tag) {
        const lowerTag = tag.toLowerCase();
        this.tags = this.tags.filter(t => t !== lowerTag);
    }

    matchesSearch(searchTerm) {
        const term = searchTerm.toLowerCase();
        return (
            this.title.toLowerCase().includes(term) ||
            this.content.toLowerCase().includes(term) ||
            this.category.toLowerCase().includes(term) ||
            this.tags.some(tag => tag.toLowerCase().includes(term))
        );
    }

    getPreview(maxLength = 100) {
        if (this.content.length <= maxLength) {
            return this.content;
        }
        return this.content.substring(0, maxLength) + '...';
    }

    getWordCount() {
        return this.content.split(/\s+/).filter(word => word.length > 0).length;
    }

    getReadingTime() {
        const wordsPerMinute = 200;
        const wordCount = this.getWordCount();
        const minutes = Math.ceil(wordCount / wordsPerMinute);
        return minutes;
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    }

    getFormattedCreatedAt() {
        return this.formatDate(this.createdAt);
    }

    getFormattedUpdatedAt() {
        return this.formatDate(this.updatedAt);
    }

    isRecentlyUpdated(hoursAgo = 24) {
        const now = new Date();
        const updated = new Date(this.updatedAt);
        const diffHours = (now - updated) / (1000 * 60 * 60);
        return diffHours <= hoursAgo;
    }

    validate() {
        const errors = [];
        
        if (!this.title || this.title.trim().length === 0) {
            errors.push('Title is required');
        }
        
        if (!this.content || this.content.trim().length === 0) {
            errors.push('Content is required');
        }
        
        if (this.title && this.title.length > 200) {
            errors.push('Title must be less than 200 characters');
        }
        
        return errors;
    }

    isValid() {
        return this.validate().length === 0;
    }
}