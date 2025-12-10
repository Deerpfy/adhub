/**
 * DocBook - Search Module
 * Uses FlexSearch for fast fulltext search
 * Apache 2.0 License
 */

class DocBookSearch {
    constructor() {
        // FlexSearch index for pages
        this.index = new FlexSearch.Document({
            document: {
                id: 'id',
                index: ['title', 'content'],
                store: ['title', 'content', 'spaceId', 'slug']
            },
            tokenize: 'forward',
            resolution: 9,
            cache: 100
        });

        this.isInitialized = false;
    }

    /**
     * Initialize search index with all pages
     */
    async init() {
        try {
            const pages = await window.DocBookDB.PageDB.getAll();

            // Clear and rebuild index
            this.index = new FlexSearch.Document({
                document: {
                    id: 'id',
                    index: ['title', 'content'],
                    store: ['title', 'content', 'spaceId', 'slug']
                },
                tokenize: 'forward',
                resolution: 9,
                cache: 100
            });

            // Add all pages to index
            for (const page of pages) {
                this.addPage(page);
            }

            this.isInitialized = true;
            console.log(`[DocBook Search] Indexed ${pages.length} pages`);
        } catch (error) {
            console.error('[DocBook Search] Init error:', error);
        }
    }

    /**
     * Add page to search index
     */
    addPage(page) {
        if (!page || !page.id) return;

        this.index.add({
            id: page.id,
            title: page.title || '',
            content: this.stripMarkdown(page.content || ''),
            spaceId: page.spaceId,
            slug: page.slug
        });
    }

    /**
     * Update page in search index
     */
    updatePage(page) {
        if (!page || !page.id) return;

        // Remove old entry and add new
        this.index.remove(page.id);
        this.addPage(page);
    }

    /**
     * Remove page from search index
     */
    removePage(pageId) {
        if (!pageId) return;
        this.index.remove(pageId);
    }

    /**
     * Search for pages
     */
    async search(query, options = {}) {
        if (!query || query.length < 2) {
            return [];
        }

        const limit = options.limit || 20;

        try {
            // Search in title and content
            const results = this.index.search(query, {
                limit,
                enrich: true
            });

            // Merge results from different fields
            const pageMap = new Map();

            for (const fieldResult of results) {
                for (const item of fieldResult.result) {
                    if (!pageMap.has(item.id)) {
                        pageMap.set(item.id, item.doc);
                    }
                }
            }

            // Get full page data with space info
            const enrichedResults = [];

            for (const [pageId, docData] of pageMap) {
                const page = await window.DocBookDB.PageDB.getWithSpace(pageId);
                if (page) {
                    // Generate excerpt with highlighted match
                    const excerpt = this.generateExcerpt(page.content, query);

                    enrichedResults.push({
                        ...page,
                        excerpt
                    });
                }
            }

            return enrichedResults;
        } catch (error) {
            console.error('[DocBook Search] Search error:', error);

            // Fallback to database search
            return await window.DocBookDB.PageDB.search(query);
        }
    }

    /**
     * Generate excerpt with highlighted match
     */
    generateExcerpt(content, query) {
        if (!content) return '';

        const plainText = this.stripMarkdown(content);
        const queryLower = query.toLowerCase();
        const textLower = plainText.toLowerCase();

        const matchIndex = textLower.indexOf(queryLower);

        if (matchIndex === -1) {
            // No match in content, return start
            return plainText.substring(0, 150) + (plainText.length > 150 ? '...' : '');
        }

        // Extract context around match
        const contextBefore = 60;
        const contextAfter = 60;

        const start = Math.max(0, matchIndex - contextBefore);
        const end = Math.min(plainText.length, matchIndex + query.length + contextAfter);

        let excerpt = '';

        if (start > 0) excerpt += '...';
        excerpt += plainText.substring(start, end);
        if (end < plainText.length) excerpt += '...';

        // Highlight the match using <mark> tags
        const highlightRegex = new RegExp(`(${this.escapeRegex(query)})`, 'gi');
        excerpt = excerpt.replace(highlightRegex, '<mark>$1</mark>');

        return excerpt;
    }

    /**
     * Strip Markdown formatting for plain text search
     */
    stripMarkdown(text) {
        if (!text) return '';

        return text
            // Remove headers
            .replace(/^#{1,6}\s+/gm, '')
            // Remove bold/italic
            .replace(/(\*\*|__)(.*?)\1/g, '$2')
            .replace(/(\*|_)(.*?)\1/g, '$2')
            // Remove strikethrough
            .replace(/~~(.*?)~~/g, '$1')
            // Remove code blocks
            .replace(/```[\s\S]*?```/g, '')
            // Remove inline code
            .replace(/`([^`]+)`/g, '$1')
            // Remove links
            .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
            // Remove images
            .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
            // Remove blockquotes
            .replace(/^>\s+/gm, '')
            // Remove horizontal rules
            .replace(/^[-*_]{3,}\s*$/gm, '')
            // Remove list markers
            .replace(/^[\s]*[-*+]\s+/gm, '')
            .replace(/^[\s]*\d+\.\s+/gm, '')
            // Remove HTML tags
            .replace(/<[^>]+>/g, '')
            // Normalize whitespace
            .replace(/\s+/g, ' ')
            .trim();
    }

    /**
     * Escape special regex characters
     */
    escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    /**
     * Get search suggestions (autocomplete)
     */
    async getSuggestions(query, limit = 5) {
        if (!query || query.length < 2) {
            return [];
        }

        const results = await this.search(query, { limit });
        return results.map(r => r.title);
    }
}

// Export for global access
window.DocBookSearch = new DocBookSearch();

console.log('[DocBook] Search module loaded');
