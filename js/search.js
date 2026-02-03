/**
 * WWDC 字幕搜索引擎
 */
class WWDCSearch {
    constructor(data) {
        this.data = data;
        this.cache = new Map();
    }

    search(query, options = {}) {
        const { language = 'both', year = null, limit = 100 } = options;
        const normalizedQuery = query ? query.trim().toLowerCase() : "";

        // If no query and no year, return empty
        if (normalizedQuery.length === 0 && !year) return [];
        const cacheKey = `${normalizedQuery}_${language}_${year}`;

        if (this.cache.has(cacheKey)) return this.cache.get(cacheKey);

        const results = [];

        for (const video of this.data) {
            if (year && video.year !== year) continue;

            for (const subtitle of video.subtitles) {
                let matched = false;
                let relevanceScore = 0;

                // 1. Text Search Case
                if (normalizedQuery.length > 0) {
                    if (language === 'en' || language === 'both') {
                        const textLower = subtitle.text.toLowerCase();
                        if (textLower.includes(normalizedQuery)) {
                            matched = true;
                            relevanceScore += this.calculateRelevance(textLower, normalizedQuery);
                        }
                    }

                    if (language === 'cn' || language === 'both') {
                        if (subtitle.textCn.toLowerCase().includes(normalizedQuery)) {
                            matched = true;
                            relevanceScore += 10;
                        }
                    }
                }
                // 2. Year-Only Case (Browse the whole year) - return ONE entry per video only
                else if (year && video.year === year) {
                    // For year-only browse, just add the FIRST subtitle as a preview
                    results.push({
                        videoId: video.id,
                        videoTitle: video.title,
                        videoYear: video.year,
                        videoSession: video.session,
                        videoThumbnail: video.thumbnail,
                        videoUrl: video.videoUrl,
                        startTime: subtitle.startTime,
                        endTime: subtitle.endTime,
                        text: subtitle.text,
                        textCn: subtitle.textCn,
                        relevanceScore: 1
                    });
                    break; // Only add ONE entry per video for year browse
                }

                if (matched) {
                    results.push({
                        videoId: video.id,
                        videoTitle: video.title,
                        videoYear: video.year,
                        videoSession: video.session,
                        videoThumbnail: video.thumbnail,
                        videoUrl: video.videoUrl,
                        startTime: subtitle.startTime,
                        endTime: subtitle.endTime,
                        text: subtitle.text,
                        textCn: subtitle.textCn,
                        relevanceScore
                    });
                }
            }
        }

        // --- SORT LOGIC ---
        // Primary: Year (Ascending) - Oldest WWDC first
        // Secondary: Start Time (Ascending) - In-video chronological order
        results.sort((a, b) => {
            if (a.videoYear !== b.videoYear) {
                return a.videoYear - b.videoYear;
            }
            return this.timeToSeconds(a.startTime) - this.timeToSeconds(b.startTime);
        });

        const limitedResults = results.slice(0, limit);
        this.cache.set(cacheKey, limitedResults);
        return limitedResults;
    }

    calculateRelevance(text, query) {
        let score = 10;
        const matches = text.split(query).length - 1;
        score += matches * 5;
        const position = text.indexOf(query);
        if (position !== -1) score += Math.max(0, 10 - position / 10);
        return score;
    }

    highlightText(text, query) {
        if (!query || !text) return text;
        const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return text.replace(new RegExp(`(${escaped})`, 'gi'), '<span class="highlight">$1</span>');
    }

    timeToSeconds(timeStr) {
        const parts = timeStr.split(':').map(Number);
        return parts.length === 3 ? parts[0] * 3600 + parts[1] * 60 + parts[2] : parts[0] * 60 + parts[1];
    }

    getAvailableYears() {
        return [...new Set(this.data.map(v => v.year))].sort((a, b) => a - b);
    }

    getVideoCount() { return this.data.length; }
    getSubtitleCount() { return this.data.reduce((s, v) => s + v.subtitles.length, 0); }
    clearCache() { this.cache.clear(); }
}
