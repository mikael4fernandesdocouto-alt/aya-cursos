(function () {
  'use strict';

  var doc = document;
  var body = doc.body;

  var $ = function (selector, scope) {
    return (scope || doc).querySelector(selector);
  };
  var $$ = function (selector, scope) {
    return Array.prototype.slice.call((scope || doc).querySelectorAll(selector));
  };

  var motionQuery = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  var prefersReducedMotion = !!(motionQuery && motionQuery.matches);

  /* Ano do rodapé */
  var year = $('#year');
  if (year) year.textContent = String(new Date().getFullYear());

  /* Header ao rolar */
  var header = $('#siteHeader');
  if (header) {
    var onScroll = function () {
      header.classList.toggle('is-scrolled', window.scrollY > 8);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* Menu mobile */
  var menuToggle = $('#menuToggle');
  var nav = $('#primaryNav');

  function setMenu(open) {
    if (!menuToggle || !nav) return;
    menuToggle.setAttribute('aria-expanded', String(open));
    menuToggle.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
    nav.classList.toggle('is-open', open);
    body.classList.toggle('nav-open', open);
  }

  if (menuToggle && nav) {
    menuToggle.addEventListener('click', function () {
      setMenu(menuToggle.getAttribute('aria-expanded') !== 'true');
    });

    $$('a', nav).forEach(function (link) {
      link.addEventListener('click', function () { setMenu(false); });
    });

    doc.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && nav.classList.contains('is-open')) {
        setMenu(false);
        menuToggle.focus();
      }
    });

    window.addEventListener('resize', function () {
      if (window.innerWidth > 900) setMenu(false);
    });
  }

  /* Link ativo na navegação */
  var navLinks = $$('.nav__link');
  var navSections = navLinks
    .map(function (link) {
      var id = link.getAttribute('href');
      return id && id.charAt(0) === '#' ? doc.querySelector(id) : null;
    })
    .filter(Boolean);

  if ('IntersectionObserver' in window && navSections.length) {
    var navObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var id = '#' + entry.target.id;
        navLinks.forEach(function (link) {
          link.classList.toggle('is-current', link.getAttribute('href') === id);
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });

    navSections.forEach(function (section) { navObserver.observe(section); });
  }

  /* Busca e filtros */
  var search = $('#courseSearch');
  var cards = $$('.course');
  var groups = $$('.group');
  var filters = $$('.filter');
  var emptyState = $('#emptyState');
  var countLabel = $('#searchCount');
  var clearSearch = $('#clearSearch');
  var resetSearch = $('#resetSearch');

  var activeFilter = 'all';

  function normalize(text) {
    return String(text || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }

  function cardText(card) {
    var title = $('.course__title', card);
    var desc = $('.course__desc', card);
    return normalize(
      (card.getAttribute('data-search') || '') + ' ' +
      (title ? title.textContent : '') + ' ' +
      (desc ? desc.textContent : '')
    );
  }

  function syncUrl(term) {
    if (!window.history || !window.history.replaceState) return;
    var url = new URL(window.location.href);

    if (term) url.searchParams.set('busca', term);
    else url.searchParams.delete('busca');

    if (activeFilter !== 'all') url.searchParams.set('caminho', activeFilter);
    else url.searchParams.delete('caminho');

    window.history.replaceState(null, '', url.pathname + url.search + url.hash);
  }

  function applyFilters(options) {
    var opts = options || {};
    var term = normalize(search ? search.value.trim() : '');
    var visible = 0;

    cards.forEach(function (card) {
      var categories = (card.getAttribute('data-category') || '').split(/\s+/);
      var matchesTerm = !term || cardText(card).indexOf(term) !== -1;
      var matchesCategory = activeFilter === 'all' || categories.indexOf(activeFilter) !== -1;
      var show = matchesTerm && matchesCategory;

      card.classList.toggle('is-hidden', !show);
      if (show) visible += 1;
    });

    groups.forEach(function (group) {
      var groupCards = $$('.course', group);
      var visibleInGroup = groupCards.filter(function (card) {
        return !card.classList.contains('is-hidden');
      }).length;

      group.classList.toggle('is-hidden', visibleInGroup === 0);

      var groupCount = $('.group__count', group);
      if (groupCount) {
        groupCount.textContent = visibleInGroup + (visibleInGroup === 1 ? ' curso' : ' cursos');
      }
    });

    if (emptyState) emptyState.hidden = visible !== 0;
    if (countLabel) {
      countLabel.textContent = visible + (visible === 1 ? ' experiência' : ' experiências');
    }
    if (clearSearch) clearSearch.hidden = !(search && search.value.trim());

    if (opts.updateUrl !== false) syncUrl(term);
  }

  function setFilter(value) {
    activeFilter = value || 'all';
    filters.forEach(function (button) {
      var selected = button.getAttribute('data-filter') === activeFilter;
      button.classList.toggle('is-active', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
    applyFilters();
  }

  if (search) {
    search.addEventListener('input', function () { applyFilters(); });

    search.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        search.value = '';
        applyFilters();
      }
    });

    doc.addEventListener('keydown', function (event) {
      var tag = (doc.activeElement && doc.activeElement.tagName) || '';
      var typing = /INPUT|TEXTAREA|SELECT/.test(tag) || (doc.activeElement && doc.activeElement.isContentEditable);
      if (event.key === '/' && !typing && !event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault();
        search.focus();
        search.select();
      }
    });

    if (clearSearch) {
      clearSearch.addEventListener('click', function () {
        search.value = '';
        applyFilters();
        search.focus();
      });
    }
  }

  filters.forEach(function (button) {
    button.addEventListener('click', function () {
      setFilter(button.getAttribute('data-filter'));
    });
  });

  if (resetSearch) {
    resetSearch.addEventListener('click', function () {
      if (search) search.value = '';
      setFilter('all');
      if (search) search.focus();
    });
  }

  /* Estado inicial vindo da URL */
  (function restoreState() {
    var params = new URLSearchParams(window.location.search);
    var term = params.get('busca');
    var path = params.get('caminho');

    if (search && term) search.value = term;

    if (path && filters.some(function (button) {
      return button.getAttribute('data-filter') === path;
    })) {
      activeFilter = path;
    }

    filters.forEach(function (button) {
      var selected = button.getAttribute('data-filter') === activeFilter;
      button.classList.toggle('is-active', selected);
      button.setAttribute('aria-pressed', String(selected));
    });

    applyFilters({ updateUrl: false });
  })();

  /* Vídeo da hero */
  var heroVideo = $('#heroVideo');
  var heroMotion = $('#toggleHeroVideo');

  function syncHeroMotion() {
    if (!heroVideo || !heroMotion) return;
    var paused = heroVideo.paused;
    heroMotion.setAttribute('data-state', paused ? 'paused' : 'playing');
    heroMotion.setAttribute('aria-label', paused ? 'Reproduzir vídeo de fundo' : 'Pausar vídeo de fundo');
  }

  function playHeroVideo() {
    if (!heroVideo) return;
    heroVideo.muted = true;
    var attempt = heroVideo.play();
    if (attempt && typeof attempt.catch === 'function') {
      attempt.catch(function () { syncHeroMotion(); });
    }
  }

  if (heroVideo) {
    heroVideo.addEventListener('play', syncHeroMotion);
    heroVideo.addEventListener('pause', syncHeroMotion);

    if (prefersReducedMotion) {
      heroVideo.pause();
    } else {
      playHeroVideo();
    }
    syncHeroMotion();

    if (heroMotion) {
      heroMotion.addEventListener('click', function () {
        if (heroVideo.paused) playHeroVideo();
        else heroVideo.pause();
      });
    }

    doc.addEventListener('visibilitychange', function () {
      if (doc.hidden) heroVideo.pause();
    });
  }

  /* Revelações discretas */
  var reduceMotion = prefersReducedMotion;
  if ('IntersectionObserver' in window && !reduceMotion) {
    var revealTargets = $$(
      '.manifesto__title, .manifesto__body, .catalog__intro, .catalog__tools, .group__head, ' +
      '.course, .team__head, .person, .invite__inner, .contact__copy, .contact__seal'
    );

    revealTargets.forEach(function (element, index) {
      element.classList.add('reveal');
      if (element.classList.contains('course')) {
        element.style.setProperty('--delay', ((index % 2) * 80) + 'ms');
      } else if (element.classList.contains('person')) {
        element.style.setProperty('--delay', ((index % 4) * 70) + 'ms');
      }
    });

    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

    revealTargets.forEach(function (element) { revealObserver.observe(element); });
  }
})();
