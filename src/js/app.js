class KnowledgeManagementSystem {
    constructor() {
        this.storage = new Storage();
        this.search = new Search(this.storage);
        this.ui = new UI(this.storage, this.search);
        this.init();
    }

    init() {
        this.ui.refreshDisplay();
        this.initializeKeyboardShortcuts();
        this.loadSampleData();
    }

    initializeKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 'n':
                        e.preventDefault();
                        this.ui.showAddNoteModal();
                        break;
                    case 'f':
                        e.preventDefault();
                        this.ui.searchInput.focus();
                        break;
                    case 's':
                        e.preventDefault();
                        this.ui.performSearch();
                        break;
                    case 'e':
                        e.preventDefault();
                        this.ui.exportData();
                        break;
                }
            }
            
            if (e.key === 'Escape') {
                this.ui.hideModal();
            }
        });
    }

    loadSampleData() {
        const existingNotes = this.storage.getNotes();
        
        if (existingNotes.length === 0) {
            const sampleNotes = [
                {
                    title: "Welcome to Knowledge Management System",
                    content: "This is your personal knowledge management system. You can create, organize, and search through your notes efficiently. Use categories and tags to organize your thoughts and information.",
                    category: "personal",
                    tags: ["welcome", "introduction", "tutorial"]
                },
                {
                    title: "JavaScript Best Practices",
                    content: "1. Use const and let instead of var\n2. Write readable and maintainable code\n3. Use proper error handling\n4. Keep functions small and focused\n5. Use meaningful variable names",
                    category: "study",
                    tags: ["javascript", "programming", "best-practices"]
                },
                {
                    title: "Project Ideas",
                    content: "1. Task Management App\n2. Weather Dashboard\n3. Recipe Organizer\n4. Personal Finance Tracker\n5. Habit Tracker",
                    category: "project",
                    tags: ["ideas", "development", "projects"]
                }
            ];

            sampleNotes.forEach(noteData => {
                this.storage.addNote(noteData);
            });
            
            this.ui.refreshDisplay();
        }
    }

    getStats() {
        const notes = this.storage.getNotes();
        const categories = this.storage.getCategories();
        const tags = this.storage.getTags();
        
        return {
            totalNotes: notes.length,
            totalCategories: categories.length,
            totalTags: tags.length,
            recentNotes: this.search.getRecentNotes(5),
            popularTags: this.search.getPopularTags(5),
            categoryStats: this.search.getCategoryStats()
        };
    }

    backup() {
        const data = this.storage.exportData();
        const backupKey = `kms-backup-${new Date().toISOString()}`;
        localStorage.setItem(backupKey, JSON.stringify(data));
        console.log('Backup created:', backupKey);
    }

    restore(backupKey) {
        const backupData = localStorage.getItem(backupKey);
        if (backupData) {
            const data = JSON.parse(backupData);
            this.storage.importData(data);
            this.ui.refreshDisplay();
            console.log('Data restored from backup:', backupKey);
        }
    }

    clearData() {
        if (confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
            this.storage.clearAll();
            this.ui.refreshDisplay();
            console.log('All data cleared');
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.kms = new KnowledgeManagementSystem();
    
    console.log('Knowledge Management System loaded!');
    console.log('Keyboard shortcuts:');
    console.log('  Ctrl/Cmd + N: Add new note');
    console.log('  Ctrl/Cmd + F: Focus search');
    console.log('  Ctrl/Cmd + S: Perform search');
    console.log('  Ctrl/Cmd + E: Export data');
    console.log('  Esc: Close modal');
});