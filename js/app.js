/**
 * WWDC 知识库主应用
 */
class WWDCApp {
  constructor() {
    this.searchEngine = new WWDCSearch(wwdcData);
    this.currentQuery = '';
    this.selectedYear = null;
    this.ytPlayer = null;
    this.ytReady = false;
    this.syncInterval = null;
    this.init();
  }

  init() {
    this.bindElements();
    this.bindEvents();
    this.initSearchHistory();
    this.renderYearFilter();
    this.showStats();
    this.initYouTubeAPI();
  }

  bindElements() {
    this.searchInput = document.getElementById('searchInput');
    this.searchBtn = document.getElementById('searchBtn');
    this.resultsSection = document.getElementById('resultsSection');
    this.resultsList = document.getElementById('resultsList');
    this.resultsStats = document.getElementById('resultsStats');

    // 预览模态框元素
    this.previewModal = document.getElementById('previewModal');
    this.previewTitle = document.getElementById('previewTitle');
    this.closePreview = document.getElementById('closePreview');
    this.localVideo = document.getElementById('localVideo');
    this.playingVideoName = document.getElementById('playingVideoName');
    this.playingTimeRange = document.getElementById('playingTimeRange');

    // History elements
    this.searchHistoryContainer = document.getElementById('searchHistory');
    this.yearFilterBtn = document.getElementById('yearFilterBtn');
    this.yearDropdown = document.getElementById('yearDropdown');

    this.toast = document.getElementById('toast');
  }

  bindEvents() {
    this.searchBtn.addEventListener('click', () => this.performSearch());
    this.searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.performSearch();
    });

    this.closePreview.addEventListener('click', () => this.closePreviewModal());
    this.previewModal.addEventListener('click', (e) => {
      if (e.target === this.previewModal) this.closePreviewModal();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.closePreviewModal();
    });

    // Dropdown toggle
    this.yearFilterBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.yearFilterBtn.classList.toggle('active');
      this.yearDropdown.classList.toggle('show');
    });

    document.addEventListener('click', () => {
      this.yearFilterBtn.classList.remove('active');
      this.yearDropdown.classList.remove('show');
    });
  }

  showStats() {
    const videoCount = this.searchEngine.getVideoCount();
    const subtitleCount = this.searchEngine.getSubtitleCount();
    this.resultsStats.innerHTML = `📚 共收录 <span class="count">${videoCount}</span> 个视频，<span class="count">${subtitleCount}</span> 条字幕片段`;
  }

  performSearch() {
    const query = this.searchInput.value.trim();

    // Allow year-only browsing: if no query but a year is selected, that's valid
    if (!query && !this.selectedYear) {
      this.showToast('请输入搜索关键词 ✏️');
      return;
    }

    this.currentQuery = query;
    if (query) {
      this.addToHistory(query);
    }
    const results = this.searchEngine.search(query, { year: this.selectedYear });
    this.renderResults(results);
  }

  renderResults(results) {
    if (results.length === 0) {
      this.resultsList.innerHTML = `
        <div class="empty-state">
          <div class="icon">🔍</div>
          <h3>没有找到相关结果</h3>
          <p>试试其他关键词，如 "SwiftUI"、"navigation"、"animation" 等</p>
        </div>`;
      this.resultsStats.innerHTML = `没有找到 "<span class="count">${this.currentQuery}</span>" 的相关结果`;
      return;
    }

    const queryText = this.currentQuery ? `关于 "${this.currentQuery}" 的` : "全集";
    const yearText = this.selectedYear ? `WWDC ${this.selectedYear} ` : "";
    this.resultsStats.innerHTML = `找到 <span class="count">${results.length}</span> 条 ${yearText}${queryText}结果`;

    this.resultsList.innerHTML = results.map(result => this.createResultCard(result)).join('');
    this.bindCardEvents();
  }

  createResultCard(result) {
    const highlightedText = this.searchEngine.highlightText(result.text, this.currentQuery);
    const highlightedTextCn = result.textCn ? this.searchEngine.highlightText(result.textCn, this.currentQuery) : '';

    return `
      <div class="result-card" data-video-year="${result.videoYear}" data-video-title="${result.videoTitle}" data-start="${result.startTime}" data-end="${result.endTime}">
        <div class="card-poster" style="background-image: url('${result.videoThumbnail}')">
          <div class="play-overlay">▶</div>
        </div>
        <div class="card-main">
            <div class="card-header">
                <h3 class="card-title">${result.videoTitle}</h3>
                <div class="card-meta">
                    <span class="meta-pill year-pill">${result.videoYear}</span>
                    <span class="meta-pill time-pill">⏱️ ${result.startTime}</span>
                    <span class="meta-pill session-pill">📺 #${result.videoSession}</span>
                </div>
            </div>
            <div class="card-subtitle">
                <div class="subtitle-en">${highlightedText}</div>
                ${highlightedTextCn ? `<div class="subtitle-cn">${highlightedTextCn}</div>` : ''}
            </div>
            <div class="card-actions">
          <button class="action-btn primary play-btn" data-url="${result.videoUrl}" data-time="${result.startTime}" data-title="${result.videoTitle}" data-id="${result.id}">
             预览片段
          </button>
          <button class="action-btn translate-btn" data-text="${result.text.replace(/"/g, '&quot;')}">
             翻译
          </button>
          <button class="action-btn copy-btn" data-text="${result.text.replace(/"/g, '&quot;')}">
             复制
          </button>
        </div>
        </div>
      </div>`;
  }

  bindCardEvents() {
    // Preview buttons
    this.resultsList.querySelectorAll('.play-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const { url, time, title, id } = btn.dataset;
        const card = btn.closest('.result-card');
        const year = card.dataset.videoYear;
        const videoId = this.extractYouTubeId(url);
        this.openVideoPreview(year, title, time, '...', videoId, url);
      });
    });

    // Translate buttons
    this.resultsList.querySelectorAll('.translate-btn').forEach(btn => {
      btn.onclick = (e) => this.translateSubtitle(e, btn);
    });

    // Copy buttons
    this.resultsList.querySelectorAll('.copy-btn').forEach(btn => {
      btn.onclick = () => this.copyToClipboard(btn.dataset.text);
    });
  }

  extractYouTubeId(url) {
    if (!url) return null;
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]{11})/);
    return match ? match[1] : null;
  }

  initYouTubeAPI() {
    window.onYouTubeIframeAPIReady = () => {
      this.ytReady = true;
    };
  }

  openVideoPreview(year, title, startTime, endTime, ytId, videoUrl) {
    this.previewModal.classList.add('active');
    document.body.style.overflow = 'hidden';

    this.previewTitle.textContent = `${title} - 预览`;
    this.playingVideoName.textContent = `${year} Keynote`;
    this.playingTimeRange.textContent = `${startTime} - ${endTime}`;

    const seconds = this.searchEngine.timeToSeconds(startTime);

    if (ytId) {
      this.localVideo.style.display = 'none';
      document.getElementById('youtubePlayer').style.display = 'block';
      this.playYouTubeVideo(ytId, seconds);
    } else {
      document.getElementById('youtubePlayer').style.display = 'none';
      this.localVideo.style.display = 'block';
      this.playLocalVideo(year, seconds);
    }

    // 设置字幕同步
    const videoData = wwdcData.find(v => v.year === parseInt(year));
    if (videoData) {
      this.setupSubtitleSync(videoData.id);
    }
  }

  playYouTubeVideo(videoId, startSeconds) {
    if (!this.ytReady) {
      this.showToast('正在加载播放器，请稍候...');
      return;
    }

    if (this.ytPlayer) {
      this.ytPlayer.loadVideoById({
        videoId: videoId,
        startSeconds: startSeconds
      });
    } else {
      this.ytPlayer = new YT.Player('youtubePlayer', {
        height: '100%',
        width: '100%',
        videoId: videoId,
        playerVars: {
          'autoplay': 1,
          'controls': 1,
          'rel': 0,
          'modestbranding': 1,
          'enablejsapi': 1,
          'origin': window.location.origin,
          'start': Math.floor(startSeconds)
        },
        events: {
          'onReady': (event) => {
            event.target.playVideo();
          }
        }
      });
    }
  }

  playLocalVideo(year, seconds) {
    this.localVideo.src = `videos/${year}.mp4`;
    this.localVideo.currentTime = seconds;
    this.localVideo.play().catch(err => {
      console.error('本地播放失败:', err);
      this.showToast(`提示: 无法播放本地 videos/${year}.mp4`);
    });
  }

  setupSubtitleSync(videoId) {
    // 移除旧的字幕层
    const container = document.querySelector('.video-preview-box');
    let overlay = container.querySelector('.video-subtitle-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'video-subtitle-overlay';
      container.appendChild(overlay);
    }

    // 获取当前视频的所有字幕
    const videoData = wwdcData.find(v => v.id === videoId);
    if (!videoData || !videoData.subtitles) return;

    const subtitles = videoData.subtitles;

    if (this.syncInterval) clearInterval(this.syncInterval);

    this.syncInterval = setInterval(() => {
      let currentTime = 0;
      if (this.ytPlayer && this.ytPlayer.getCurrentTime) {
        currentTime = this.ytPlayer.getCurrentTime();
      } else if (!this.localVideo.paused) {
        currentTime = this.localVideo.currentTime;
      } else {
        return;
      }

      // 查找当前时间的字幕
      const currentSub = subtitles.find(sub => {
        const start = this.searchEngine.timeToSeconds(sub.startTime);
        const end = this.searchEngine.timeToSeconds(sub.endTime);
        return currentTime >= start && currentTime <= end;
      });

      if (currentSub) {
        let html = `<div class="sub-en">${currentSub.text}</div>`;
        if (currentSub.textCn) {
          html += `<div class="sub-cn">${currentSub.textCn}</div>`;
        }
        overlay.innerHTML = html;
        overlay.style.display = 'block';
      } else {
        overlay.style.display = 'none';
      }
    }, 200);
  }

  closePreviewModal() {
    if (this.ytPlayer && this.ytPlayer.pauseVideo) {
      this.ytPlayer.pauseVideo();
    }
    this.localVideo.pause();
    this.previewModal.classList.remove('active');
    document.body.style.overflow = '';
    if (this.syncInterval) clearInterval(this.syncInterval);
  }

  copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
      this.showToast('字幕已复制到剪贴板 ✅');
    }).catch(() => {
      this.showToast('复制失败，请手动复制 ❌');
    });
  }

  async translateSubtitle(event, btn) {
    const text = btn.dataset.text;
    const card = btn.closest('.result-card');
    const cnContainer = card.querySelector('.subtitle-cn');

    // Check if it's already translated
    if (cnContainer.textContent.trim() && !cnContainer.textContent.includes('正在翻译')) {
      return;
    }

    try {
      btn.disabled = true;
      btn.textContent = '⏳ 翻译中...';
      cnContainer.innerHTML = '<span class="loading-dots">正在智能翻译中</span>';

      // Use a free Google Translate API (unofficial endpoint)
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=zh-CN&dt=t&q=${encodeURIComponent(text)}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data && data[0]) {
        const translatedText = data[0].map(item => item[0]).join('');
        cnContainer.textContent = translatedText;
        cnContainer.style.color = '#e74c3c'; // Highlight translated text
        cnContainer.style.fontWeight = '500';
      }
    } catch (error) {
      console.error('Translation error:', error);
      this.showToast('翻译失败，请稍后重试 ❌');
      cnContainer.textContent = '翻译失败，请重试';
    } finally {
      btn.disabled = false;
      btn.textContent = '🏮 翻译字幕';
    }
  }

  showToast(message) {
    this.toast.textContent = message;
    this.toast.classList.add('show');
    setTimeout(() => this.toast.classList.remove('show'), 3000);
  }

  // --- Search History Logic ---

  initSearchHistory() {
    this.history = JSON.parse(localStorage.getItem('wwdc_search_history')) || [];
    this.renderHistory();
  }

  addToHistory(query) {
    // Remove if exists (to move to top)
    this.history = this.history.filter(item => item !== query);
    // Add to front
    this.history.unshift(query);
    // Keep max 10
    if (this.history.length > 10) this.history.pop();

    this.saveHistory();
    this.renderHistory();
  }

  removeFromHistory(e, query) {
    e.stopPropagation();
    this.history = this.history.filter(item => item !== query);
    this.saveHistory();
    this.renderHistory();
  }

  clearHistory() {
    if (confirm('确定要清空所有搜索记录吗？')) {
      this.history = [];
      this.saveHistory();
      this.renderHistory();
    }
  }

  saveHistory() {
    localStorage.setItem('wwdc_search_history', JSON.stringify(this.history));
  }

  renderHistory() {
    if (this.history.length === 0) {
      this.searchHistoryContainer.innerHTML = '<div class="history-empty">试着搜点什么... (例如 "Swift" 或 "Widgets")</div>';
      return;
    }

    const tagsHtml = this.history.map(query => `
      <div class="history-tag" onclick="window.app.useHistorySearch('${query.replace(/'/g, "\\'")}')">
        ${query}
        <span class="remove-btn" onclick="window.app.removeFromHistory(event, '${query.replace(/'/g, "\\'")}')">×</span>
      </div>
    `).join('');

    this.searchHistoryContainer.innerHTML = `
      <div class="history-label">最近搜索:</div>
      ${tagsHtml}
      <button class="clear-history-btn" onclick="window.app.clearHistory()">清空</button>
    `;
  }

  useHistorySearch(query) {
    this.searchInput.value = query;
    this.performSearch();
  }

  // --- Year Filter Logic ---

  renderYearFilter() {
    const years = this.searchEngine.getAvailableYears();

    let html = `
      <div class="year-item ${this.selectedYear === null ? 'active' : ''}" 
           data-year="all" onclick="window.app.filterByYear(null)">
        全部年份
      </div>
    `;

    html += years.map(year => {
      return `
        <div class="year-item ${this.selectedYear === year ? 'active' : ''}" 
             data-year="${year}" 
             onclick="window.app.filterByYear(${year})">
          ${year}
        </div>
      `;
    }).join('');

    this.yearDropdown.innerHTML = html;

    // Update button text
    const btnText = this.yearFilterBtn.querySelector('span');
    btnText.textContent = this.selectedYear === null ? '全部年份' : `${this.selectedYear}`;
  }

  filterByYear(year) {
    this.selectedYear = year;
    this.renderYearFilter();

    // Auto close
    this.yearFilterBtn.classList.remove('active');
    this.yearDropdown.classList.remove('show');

    // If there is an active search OR a year is selected, re-run it
    if (this.searchInput.value.trim() || this.selectedYear) {
      this.performSearch();
    } else {
      this.clearResults();
    }
  }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
  window.app = new WWDCApp();
});
