class Search {
    constructor(storage) {
        this.storage = storage;
    }

    searchNotes(query, filters = {}) {
        const notes = this.storage.getNotes();
        let filteredNotes = notes;

        if (query && query.trim() !== '') {
            filteredNotes = this.performTextSearch(filteredNotes, query.trim());
        }

        if (filters.category) {
            filteredNotes = filteredNotes.filter(note => note.category === filters.category);
        }

        if (filters.tags && filters.tags.length > 0) {
            filteredNotes = filteredNotes.filter(note => 
                filters.tags.some(tag => note.tags.includes(tag))
            );
        }

        if (filters.dateRange) {
            filteredNotes = this.filterByDateRange(filteredNotes, filters.dateRange);
        }

        return this.sortResults(filteredNotes, filters.sortBy);
    }

    performTextSearch(notes, query) {
        const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 0);
        
        return notes.filter(note => {
            const searchableText = [
                note.title,
                note.content,
                note.category,
                ...(note.tags || [])
            ].join(' ').toLowerCase();

            return searchTerms.every(term => {
                if (term.startsWith('"') && term.endsWith('"')) {
                    const phrase = term.slice(1, -1);
                    return searchableText.includes(phrase);
                }
                return searchableText.includes(term);
            });
        });
    }

    filterByDateRange(notes, dateRange) {
        const now = new Date();
        let startDate;

        switch (dateRange) {
            case 'today':
                startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                break;
            case 'week':
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case 'month':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
            case 'year':
                startDate = new Date(now.getFullYear(), 0, 1);
                break;
            default:
                return notes;
        }

        return notes.filter(note => {
            const noteDate = new Date(note.updatedAt || note.createdAt);
            return noteDate >= startDate;
        });
    }

    sortResults(notes, sortBy = 'updated') {
        const sortedNotes = [...notes];

        switch (sortBy) {
            case 'title':
                return sortedNotes.sort((a, b) => a.title.localeCompare(b.title));
            case 'created':
                return sortedNotes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            case 'updated':
            default:
                return sortedNotes.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
        }
    }

    getRecentNotes(limit = 10) {
        const notes = this.storage.getNotes();
        return notes
            .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
            .slice(0, limit);
    }

    getPopularTags(limit = 20) {
        const notes = this.storage.getNotes();
        const tagCounts = {};

        notes.forEach(note => {
            if (note.tags) {
                note.tags.forEach(tag => {
                    tagCounts[tag] = (tagCounts[tag] || 0) + 1;
                });
            }
        });

        return Object.entries(tagCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, limit)
            .map(([tag, count]) => ({ tag, count }));
    }

    getCategoryStats() {
        const notes = this.storage.getNotes();
        const categoryStats = {};

        notes.forEach(note => {
            if (note.category) {
                if (!categoryStats[note.category]) {
                    categoryStats[note.category] = {
                        count: 0,
                        lastUpdated: null
                    };
                }
                categoryStats[note.category].count++;
                
                const noteDate = new Date(note.updatedAt || note.createdAt);
                if (!categoryStats[note.category].lastUpdated || 
                    noteDate > new Date(categoryStats[note.category].lastUpdated)) {
                    categoryStats[note.category].lastUpdated = note.updatedAt || note.createdAt;
                }
            }
        });

        return categoryStats;
    }

    searchSuggestions(query) {
        const notes = this.storage.getNotes();
        const suggestions = new Set();

        if (query.length >= 2) {
            const lowerQuery = query.toLowerCase();
            
            notes.forEach(note => {
                if (note.title.toLowerCase().includes(lowerQuery)) {
                    suggestions.add(note.title);
                }
                
                if (note.tags) {
                    note.tags.forEach(tag => {
                        if (tag.toLowerCase().includes(lowerQuery)) {
                            suggestions.add(tag);
                        }
                    });
                }
                
                if (note.category && note.category.toLowerCase().includes(lowerQuery)) {
                    suggestions.add(note.category);
                }
            });
        }

        return Array.from(suggestions).slice(0, 10);
    }

    highlightSearchTerms(text, query) {
        if (!query || query.trim() === '') {
            return text;
        }

        const terms = query.toLowerCase().split(' ').filter(term => term.length > 0);
        let highlightedText = text;

        terms.forEach(term => {
            const regex = new RegExp(`(${term})`, 'gi');
            highlightedText = highlightedText.replace(regex, '<mark>$1</mark>');
        });

        return highlightedText;
    }
}