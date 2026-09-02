(() => {
  const LAST_TRACK_KEY = 'cgRadioLastTrack';

  const initRadio = () => {
    const iframe = document.getElementById('cg-radio-frame');
    const toggle = document.querySelector('[data-role="toggle"]');
    const next = document.querySelector('[data-role="next"]');
    const title = document.querySelector('[data-role="track-title"]');
    const source = document.querySelector('[data-role="source"]');

    if (!iframe || !toggle || !next || !title || typeof SC === 'undefined') return;

    // The radio engine must load immediately; lazy loading is reserved for visual content.
    iframe.loading = 'eager';
    iframe.removeAttribute('loading');

    const widget = SC.Widget(iframe);
    let sounds = [];
    let currentIndex = -1;
    let playing = false;
    let ready = false;
    let gestureArmed = false;

    const soundKey = (sound) => {
      if (!sound) return '';
      return String(sound.permalink_url || sound.id || sound.title || '');
    };

    const getLastTrackKey = () => {
      try {
        return localStorage.getItem(LAST_TRACK_KEY) || '';
      } catch (_) {
        return '';
      }
    };

    const rememberTrack = (sound) => {
      const key = soundKey(sound);
      if (!key) return;
      try {
        localStorage.setItem(LAST_TRACK_KEY, key);
      } catch (_) {
        // Storage may be unavailable in private/restricted browser modes.
      }
    };

    const setSoundMeta = (sound) => {
      if (!sound) return;
      const soundTitle = sound.title || 'CHRIS GAVIN RADIO';
      title.textContent = soundTitle.toUpperCase();
      title.title = soundTitle;
      if (source && sound.permalink_url) source.href = sound.permalink_url;
    };

    const updateToggle = () => {
      toggle.textContent = playing ? 'PAUSE' : 'PLAY';
      toggle.setAttribute('aria-label', playing ? 'Pause Chris Gavin Radio' : 'Play Chris Gavin Radio');
    };

    const updateCurrentTrack = () => {
      widget.getCurrentSound((sound) => setSoundMeta(sound));
      widget.getCurrentSoundIndex((index) => {
        if (typeof index === 'number') currentIndex = index;
      });
    };

    // Pick a random track, but never immediately repeat the track heard on the
    // previous visit. Also avoid repeating the currently selected track on NEXT.
    const randomIndex = () => {
      if (!sounds.length) return 0;
      if (sounds.length === 1) return 0;

      const previousVisitKey = getLastTrackKey();
      let candidates = sounds
        .map((sound, index) => ({ sound, index }))
        .filter(({ sound, index }) => index !== currentIndex && soundKey(sound) !== previousVisitKey);

      // Fallback if the list is unusually small or contains duplicate metadata.
      if (!candidates.length) {
        candidates = sounds
          .map((sound, index) => ({ sound, index }))
          .filter(({ index }) => index !== currentIndex);
      }

      const picked = candidates[Math.floor(Math.random() * candidates.length)];
      return picked ? picked.index : 0;
    };

    const selectIndex = (index) => {
      currentIndex = index;
      const sound = sounds[index];
      if (sound) {
        setSoundMeta(sound);
        rememberTrack(sound);
      }
      widget.skip(index);
    };

    const playRandom = (autoplayAttempt = false) => {
      if (!ready || !sounds.length) return;
      const index = randomIndex();
      selectIndex(index);
      window.setTimeout(() => {
        widget.play();
        if (!autoplayAttempt && typeof gtag === 'function') {
          gtag('event', 'radio_next', { item_name: sounds[index]?.title || 'Chris Gavin Radio' });
        }
      }, 90);
    };

    // Safari/iOS blocks audible autoplay. Once SoundCloud is ready, the first
    // user gesture anywhere on the page starts the already-selected track.
    const startOnFirstGesture = () => {
      if (!ready || playing) return;
      widget.play();
    };

    const armFirstGestureStart = () => {
      if (gestureArmed) return;
      gestureArmed = true;
      const opts = { capture: true, passive: true };
      document.addEventListener('pointerdown', startOnFirstGesture, opts);
      document.addEventListener('touchstart', startOnFirstGesture, opts);
      document.addEventListener('keydown', startOnFirstGesture, { capture: true });
    };

    const disarmFirstGestureStart = () => {
      if (!gestureArmed) return;
      gestureArmed = false;
      document.removeEventListener('pointerdown', startOnFirstGesture, true);
      document.removeEventListener('touchstart', startOnFirstGesture, true);
      document.removeEventListener('keydown', startOnFirstGesture, true);
    };

    toggle.addEventListener('click', () => {
      if (!ready) return;
      widget.isPaused((paused) => {
        if (paused) {
          widget.play();
          if (typeof gtag === 'function') gtag('event', 'radio_play', { item_name: title.textContent });
        } else {
          widget.pause();
          if (typeof gtag === 'function') gtag('event', 'radio_pause', { item_name: title.textContent });
        }
      });
    });

    next.addEventListener('click', () => playRandom(false));

    widget.bind(SC.Widget.Events.READY, () => {
      ready = true;
      widget.setVolume(58);
      widget.getSounds((list) => {
        sounds = Array.isArray(list) ? list : [];

        if (!sounds.length) {
          title.textContent = 'CHRIS GAVIN RADIO';
          armFirstGestureStart();
          return;
        }

        // Every fresh arrival/reload gets a track different from the previous visit.
        const index = randomIndex();
        selectIndex(index);

        // Try audible autoplay on browsers that permit it.
        window.setTimeout(() => widget.play(), 120);

        // On Safari/iPhone the first normal interaction anywhere starts playback.
        armFirstGestureStart();
      });
    });

    widget.bind(SC.Widget.Events.PLAY, () => {
      playing = true;
      disarmFirstGestureStart();
      updateToggle();
      updateCurrentTrack();
    });

    widget.bind(SC.Widget.Events.PAUSE, () => {
      playing = false;
      updateToggle();
      armFirstGestureStart();
    });

    widget.bind(SC.Widget.Events.FINISH, () => playRandom(true));

    widget.bind(SC.Widget.Events.ERROR, () => {
      title.textContent = 'RADIO UNAVAILABLE';
      playing = false;
      updateToggle();
    });

    // Safari can restore the homepage from its back/forward cache without a full
    // reload. Treat that as a new arrival too and choose a new track.
    window.addEventListener('pageshow', (event) => {
      if (!event.persisted || !ready || !sounds.length) return;
      const index = randomIndex();
      selectIndex(index);
      playing = false;
      updateToggle();
      window.setTimeout(() => widget.play(), 100);
      armFirstGestureStart();
    });

    window.setTimeout(() => {
      if (!playing) updateToggle();
    }, 1500);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initRadio, { once: true });
  } else {
    initRadio();
  }
})();
